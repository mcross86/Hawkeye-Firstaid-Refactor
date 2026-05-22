const express = require("express");
const { getDb } = require("../db");

const router = express.Router();

const CANCEL_REASON_CODES = {
  wrong_customer: "Wrong Customer",
  created_in_error: "Created in Error",
  customer_cancelled: "Customer Cancelled",
  other: "Other"
};

function normalizeCancelReasonCode(value) {
  const raw = String(value || "").trim();
  if (CANCEL_REASON_CODES[raw]) {
    return raw;
  }
  const byLabel = Object.entries(CANCEL_REASON_CODES).find(([, label]) => label === raw);
  return byLabel ? byLabel[0] : null;
}

async function getLocationName(db, locationId) {
  if (!locationId) {
    return null;
  }
  const row = await db.get(`SELECT name FROM site_locations WHERE id = ?`, [locationId]);
  return row ? row.name : null;
}

async function validateSiteForPurchaseOrder(db, customerId, siteId, locationId) {
  if (!siteId) {
    return { ok: true };
  }
  const site = await db.get(`SELECT id, customer_id FROM sites WHERE id = ?`, [siteId]);
  if (!site) {
    return { ok: false, error: "Site not found" };
  }
  if (customerId && site.customer_id !== customerId) {
    return { ok: false, error: "Site does not belong to this customer" };
  }
  if (locationId) {
    const loc = await db.get(`SELECT id, site_id FROM site_locations WHERE id = ?`, [locationId]);
    if (!loc) {
      return { ok: false, error: "Location not found" };
    }
    if (loc.site_id !== siteId) {
      return { ok: false, error: "Location does not belong to this site" };
    }
  }
  return { ok: true };
}

function mapPurchaseOrderWithItems(row, items) {
  return {
    id: row.id,
    customerName: row.customer_name,
    siteName: row.site_name,
    serviceDate: row.service_date,
    driverName: row.driver_name,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    customerId: row.customer_id,
    siteId: row.site_id,
    siteLocationId: row.site_location_id,
    items: items.map((item) => ({
      sku: item.sku,
      itemDescription: item.item_description,
      quantity: item.quantity,
      isAddOn: item.is_add_on === 1
    }))
  };
}

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "hawkeye-api" });
});

router.post("/driver/purchase-orders", async (req, res) => {
  const db = getDb();
  try {
    const {
      customerName,
      siteName,
      serviceDate,
      driverName,
      notes,
      items = [],
      customerId,
      siteId,
      locationId,
      locationName
    } = req.body;

    if (!customerName || !serviceDate || !driverName) {
      return res.status(400).json({
        error: "customerName, serviceDate, and driverName are required"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "At least one purchase order item is required"
      });
    }

    const v = await validateSiteForPurchaseOrder(db, customerId, siteId, locationId);
    if (!v.ok) {
      return res.status(400).json({ error: v.error });
    }

    await db.exec("BEGIN TRANSACTION");

    const purchaseOrderResult = await db.run(
      `INSERT INTO purchase_orders
       (customer_name, site_name, service_date, driver_name, notes, customer_id, site_id, site_location_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerName,
        siteName || null,
        serviceDate,
        driverName,
        notes || null,
        customerId || null,
        siteId || null,
        locationId || null
      ]
    );

    const purchaseOrderId = purchaseOrderResult.lastID;
    const poNumber = `PO-${purchaseOrderId}`;

    for (const item of items) {
      if (!item.sku || !item.quantity) {
        await db.exec("ROLLBACK");
        return res.status(400).json({
          error: "Each item requires sku and quantity"
        });
      }

      await db.run(
        `INSERT INTO purchase_order_items
         (purchase_order_id, sku, item_description, quantity, is_add_on)
         VALUES (?, ?, ?, ?, ?)`,
        [
          purchaseOrderId,
          item.sku,
          item.itemDescription || null,
          Number(item.quantity),
          item.isAddOn ? 1 : 0
        ]
      );
    }

    if (siteId) {
      let locDisplay =
        (locationName && String(locationName).trim()) || (await getLocationName(db, locationId)) || "—";
      const summaryNote = `Purchase order ${poNumber}`;
      await db.run(
        `INSERT INTO site_service_history (
          site_id, site_location_id, purchase_order_id, po_number, serviced_by,
          service_date, location_name, notes, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'purchase_order')`,
        [
          siteId,
          locationId || null,
          purchaseOrderId,
          poNumber,
          driverName,
          serviceDate,
          locDisplay,
          summaryNote
        ]
      );
    }

    await db.exec("COMMIT");

    return res.status(201).json({
      id: purchaseOrderId,
      poNumber,
      status: "submitted"
    });
  } catch (error) {
    try {
      await db.exec("ROLLBACK");
    } catch (rollbackError) {
      // Ignore rollback failures when transaction was never opened.
    }
    return res.status(500).json({ error: error.message });
  }
});

router.get("/clerk/purchase-orders", async (req, res) => {
  const db = getDb();
  const purchaseOrders = await db.all(
    `SELECT id, customer_name, site_name, service_date, driver_name, notes, status, created_at,
            customer_id, site_id, site_location_id
     FROM purchase_orders
     ORDER BY id DESC`
  );

  const withItems = await Promise.all(
    purchaseOrders.map(async (purchaseOrder) => {
      const items = await db.all(
        `SELECT sku, item_description, quantity, is_add_on
         FROM purchase_order_items
         WHERE purchase_order_id = ?
         ORDER BY id ASC`,
        [purchaseOrder.id]
      );

      return mapPurchaseOrderWithItems(purchaseOrder, items);
    })
  );

  res.json(withItems);
});

router.patch("/clerk/purchase-orders/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid purchase order id" });
  }

  try {
    const prev = await db.get(`SELECT * FROM purchase_orders WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    if (String(prev.status || "").toLowerCase() === "invoiced") {
      return res.status(409).json({ error: "Purchase order is invoiced and can no longer be edited." });
    }

    const nextStatusRaw = req.body.status != null ? String(req.body.status).trim() : prev.status;
    const nextStatus = nextStatusRaw ? nextStatusRaw.toLowerCase() : "submitted";
    if (!["submitted", "invoiced"].includes(nextStatus)) {
      return res.status(400).json({ error: "status must be submitted or invoiced" });
    }

    const nextNotes = req.body.notes != null ? String(req.body.notes) : prev.notes;
    const nextItems = req.body.items;
    if (!Array.isArray(nextItems) || nextItems.length === 0) {
      return res.status(400).json({ error: "At least one purchase order item is required" });
    }

    await db.exec("BEGIN TRANSACTION");
    try {
      await db.run(`UPDATE purchase_orders SET notes = ?, status = ? WHERE id = ?`, [
        nextNotes || null,
        nextStatus,
        id
      ]);

      await db.run(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`, [id]);

      for (const item of nextItems) {
        const sku = item.sku != null ? String(item.sku).trim() : "";
        const qty = Number(item.quantity);
        if (!sku || !Number.isFinite(qty) || qty <= 0) {
          throw new Error("Each item requires sku and a quantity > 0");
        }
        await db.run(
          `INSERT INTO purchase_order_items
           (purchase_order_id, sku, item_description, quantity, is_add_on)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            sku,
            item.itemDescription != null ? String(item.itemDescription) : null,
            qty,
            item.isAddOn ? 1 : 0
          ]
        );
      }

      await db.exec("COMMIT");
    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }

    const updated = await db.get(
      `SELECT id, customer_name, site_name, service_date, driver_name, notes, status, created_at,
              customer_id, site_id, site_location_id
       FROM purchase_orders WHERE id = ?`,
      [id]
    );
    const items = await db.all(
      `SELECT sku, item_description, quantity, is_add_on
       FROM purchase_order_items
       WHERE purchase_order_id = ?
       ORDER BY id ASC`,
      [id]
    );
    res.json(mapPurchaseOrderWithItems(updated, items));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/clerk/purchase-orders/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid purchase order id" });
  }

  const cancelReasonCode = normalizeCancelReasonCode(req.body?.cancelReasonCode);
  if (!cancelReasonCode) {
    return res.status(400).json({
      error: `cancelReasonCode is required (${Object.values(CANCEL_REASON_CODES).join(", ")})`
    });
  }

  const cancelReasonDetail =
    req.body?.cancelReasonDetail != null ? String(req.body.cancelReasonDetail).trim() : "";
  if (cancelReasonCode === "other" && !cancelReasonDetail) {
    return res.status(400).json({ error: "cancelReasonDetail is required when reason is Other" });
  }

  try {
    const prev = await db.get(`SELECT * FROM purchase_orders WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    if (String(prev.status || "").toLowerCase() === "invoiced") {
      return res.status(409).json({ error: "Invoiced purchase orders cannot be cancelled." });
    }

    const poNumber = `PO-${id}`;

    await db.exec("BEGIN TRANSACTION");
    try {
      await db.run(
        `INSERT INTO purchase_order_cancellations (
          purchase_order_id, po_number, customer_name, cancel_reason_code, cancel_reason_detail
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          poNumber,
          prev.customer_name || null,
          cancelReasonCode,
          cancelReasonDetail || null
        ]
      );

      await db.run(`DELETE FROM site_service_history WHERE purchase_order_id = ?`, [id]);
      await db.run(`DELETE FROM purchase_orders WHERE id = ?`, [id]);

      await db.exec("COMMIT");
    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }

    res.json({
      ok: true,
      id,
      poNumber,
      cancelReasonCode,
      cancelReasonLabel: CANCEL_REASON_CODES[cancelReasonCode]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
