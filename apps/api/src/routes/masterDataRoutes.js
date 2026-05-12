const express = require("express");
const { getDb } = require("../db");

const router = express.Router();

function nextCustomerId() {
  return `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextSiteId() {
  return `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextSiteLocationId() {
  return `sloc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextKitTypeId() {
  return `kittype-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1
  };
}

function mapHistoryRow(row) {
  return {
    id: row.id,
    siteId: row.site_id,
    siteLocationId: row.site_location_id,
    purchaseOrderId: row.purchase_order_id,
    poNumber: row.po_number,
    servicedBy: row.serviced_by,
    serviceDate: row.service_date,
    locationName: row.location_name,
    notes: row.notes,
    source: row.source
  };
}

function mapSiteRow(siteRow, historyRows = []) {
  let scheduled = [];
  try {
    scheduled = JSON.parse(siteRow.scheduled_services_json || "[]");
    if (!Array.isArray(scheduled)) scheduled = [];
  } catch {
    scheduled = [];
  }

  const manualHistory = historyRows
    .filter((h) => h.purchase_order_id == null)
    .sort((a, b) => String(b.service_date).localeCompare(String(a.service_date)))
    .map((h) => ({
      date: h.service_date,
      summary: h.notes || ""
    }));

  const serviceHistoryLog = [...historyRows].sort((a, b) => {
    const da = String(a.service_date);
    const db = String(b.service_date);
    if (da !== db) return db.localeCompare(da);
    return (b.id || 0) - (a.id || 0);
  });

  return {
    id: siteRow.id,
    customerId: siteRow.customer_id,
    name: siteRow.name,
    address: siteRow.address || "",
    city: siteRow.city || "",
    state: siteRow.state || "",
    zip: siteRow.zip || "",
    pocName: siteRow.poc_name || "",
    pocTitle: siteRow.poc_title || "",
    pocPhone: siteRow.poc_phone || "",
    entryNotes: siteRow.entry_notes || "",
    hoursOfOperation: siteRow.hours_of_operation || "",
    preferredServiceTimeOfDay: siteRow.preferred_service_time_of_day || "",
    serviceFrequency: siteRow.service_frequency || "",
    isActive: siteRow.is_active === 1,
    scheduledServices: scheduled,
    serviceHistory: manualHistory,
    serviceHistoryLog: serviceHistoryLog.map(mapHistoryRow)
  };
}

function mapLocationRow(row) {
  return {
    id: row.id,
    siteId: row.site_id,
    customerId: row.customer_id,
    name: row.name,
    isActive: row.is_active === 1,
    kitTypeId: row.kit_type_id || null,
    kitTypeName: row.kit_type_name || null
  };
}

function mapKitTypeRow(row) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order ?? 0
  };
}

async function fetchHistoriesForSites(db, siteIds) {
  if (!siteIds.length) return {};
  const ph = siteIds.map(() => "?").join(",");
  const rows = await db.all(
    `SELECT * FROM site_service_history WHERE site_id IN (${ph}) ORDER BY service_date DESC, id DESC`,
    siteIds
  );
  const bySite = {};
  for (const r of rows) {
    if (!bySite[r.site_id]) bySite[r.site_id] = [];
    bySite[r.site_id].push(r);
  }
  return bySite;
}

router.get("/master/customers", async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(`SELECT id, name, is_active FROM customers ORDER BY name ASC`);
    res.json(rows.map(mapCustomer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/master/customers", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const isActive = req.body.isActive !== false;
    const id = nextCustomerId();
    const db = getDb();
    await db.run(`INSERT INTO customers (id, name, is_active) VALUES (?, ?, ?)`, [
      id,
      name,
      isActive ? 1 : 0
    ]);
    const row = await db.get(`SELECT id, name, is_active FROM customers WHERE id = ?`, [id]);
    res.status(201).json(mapCustomer(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/master/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const prev = await db.get(`SELECT * FROM customers WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const name = req.body.name != null ? String(req.body.name).trim() : prev.name;
    const isActive =
      req.body.isActive !== undefined ? Boolean(req.body.isActive) : prev.is_active === 1;
    await db.run(`UPDATE customers SET name = ?, is_active = ? WHERE id = ?`, [
      name,
      isActive ? 1 : 0,
      id
    ]);
    const row = await db.get(`SELECT id, name, is_active FROM customers WHERE id = ?`, [id]);
    res.json(mapCustomer(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/master/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.run(`DELETE FROM customers WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/master/customers/:customerId/sites", async (req, res) => {
  try {
    const { customerId } = req.params;
    const activeOnly = req.query.activeOnly === "1" || req.query.activeOnly === "true";
    const db = getDb();
    let sql = `SELECT * FROM sites WHERE customer_id = ?`;
    const params = [customerId];
    if (activeOnly) {
      sql += ` AND is_active = 1`;
    }
    sql += ` ORDER BY name ASC`;
    const siteRows = await db.all(sql, params);
    const siteIds = siteRows.map((s) => s.id);
    const histBySite = await fetchHistoriesForSites(db, siteIds);
    res.json(siteRows.map((row) => mapSiteRow(row, histBySite[row.id] || [])));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/master/sites", async (req, res) => {
  try {
    const customerId = (req.body.customerId || "").trim();
    const name = (req.body.name || "").trim();
    if (!customerId || !name) {
      return res.status(400).json({ error: "customerId and name are required" });
    }
    const db = getDb();
    const cust = await db.get(`SELECT id FROM customers WHERE id = ?`, [customerId]);
    if (!cust) {
      return res.status(400).json({ error: "Customer not found" });
    }

    const id = nextSiteId();
    const scheduled = JSON.stringify(Array.isArray(req.body.scheduledServices) ? req.body.scheduledServices : []);

    await db.run(
      `INSERT INTO sites (
        id, customer_id, name, address, city, state, zip,
        poc_name, poc_title, poc_phone, entry_notes,
        hours_of_operation, preferred_service_time_of_day, service_frequency,
        is_active, scheduled_services_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        customerId,
        name,
        (req.body.address || "").trim(),
        (req.body.city || "").trim(),
        (req.body.state || "").trim(),
        (req.body.zip || "").trim(),
        (req.body.pocName || "").trim(),
        (req.body.pocTitle || "").trim(),
        (req.body.pocPhone || "").trim(),
        (req.body.entryNotes || "").trim(),
        (req.body.hoursOfOperation || "").trim(),
        (req.body.preferredServiceTimeOfDay || "").trim(),
        (req.body.serviceFrequency || "").trim(),
        req.body.isActive === false ? 0 : 1,
        scheduled
      ]
    );

    const row = await db.get(`SELECT * FROM sites WHERE id = ?`, [id]);
    await replaceManualServiceHistory(db, id, req.body.serviceHistory);
    const hist = await db.all(`SELECT * FROM site_service_history WHERE site_id = ?`, [id]);
    res.status(201).json(mapSiteRow(row, hist));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function replaceManualServiceHistory(db, siteId, serviceHistory) {
  await db.run(`DELETE FROM site_service_history WHERE site_id = ? AND purchase_order_id IS NULL`, [
    siteId
  ]);
  if (!Array.isArray(serviceHistory)) return;
  for (const row of serviceHistory) {
    const date = (row.date || "").trim();
    const summary = (row.summary || "").trim();
    if (!date && !summary) continue;
    await db.run(
      `INSERT INTO site_service_history (
        site_id, site_location_id, purchase_order_id, po_number, serviced_by,
        service_date, location_name, notes, source
      ) VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, 'manual')`,
      [
        siteId,
        "Office / admin",
        date || new Date().toISOString().split("T")[0],
        "—",
        summary || null
      ]
    );
  }
}

router.patch("/master/sites/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const prev = await db.get(`SELECT * FROM sites WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Site not found" });
    }

    const customerId = (req.body.customerId || prev.customer_id).trim();
    const cust = await db.get(`SELECT id FROM customers WHERE id = ?`, [customerId]);
    if (!cust) {
      return res.status(400).json({ error: "Customer not found" });
    }

    const name = req.body.name != null ? String(req.body.name).trim() : prev.name;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    let previousScheduled = [];
    try {
      previousScheduled = JSON.parse(prev.scheduled_services_json || "[]");
    } catch {
      previousScheduled = [];
    }
    if (!Array.isArray(previousScheduled)) {
      previousScheduled = [];
    }
    const scheduled = JSON.stringify(
      Array.isArray(req.body.scheduledServices) ? req.body.scheduledServices : previousScheduled
    );

    await db.run(
      `UPDATE sites SET
        customer_id = ?, name = ?, address = ?, city = ?, state = ?, zip = ?,
        poc_name = ?, poc_title = ?, poc_phone = ?, entry_notes = ?,
        hours_of_operation = ?, preferred_service_time_of_day = ?, service_frequency = ?,
        is_active = ?, scheduled_services_json = ?
      WHERE id = ?`,
      [
        customerId,
        name,
        (req.body.address != null ? req.body.address : prev.address || "").trim(),
        (req.body.city != null ? req.body.city : prev.city || "").trim(),
        (req.body.state != null ? req.body.state : prev.state || "").trim(),
        (req.body.zip != null ? req.body.zip : prev.zip || "").trim(),
        (req.body.pocName != null ? req.body.pocName : prev.poc_name || "").trim(),
        (req.body.pocTitle != null ? req.body.pocTitle : prev.poc_title || "").trim(),
        (req.body.pocPhone != null ? req.body.pocPhone : prev.poc_phone || "").trim(),
        (req.body.entryNotes != null ? req.body.entryNotes : prev.entry_notes || "").trim(),
        (req.body.hoursOfOperation != null ? req.body.hoursOfOperation : prev.hours_of_operation || "").trim(),
        (req.body.preferredServiceTimeOfDay != null
          ? req.body.preferredServiceTimeOfDay
          : prev.preferred_service_time_of_day || ""
        ).trim(),
        (req.body.serviceFrequency != null ? req.body.serviceFrequency : prev.service_frequency || "").trim(),
        req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : prev.is_active,
        scheduled,
        id
      ]
    );

    if (req.body.serviceHistory !== undefined) {
      await replaceManualServiceHistory(db, id, req.body.serviceHistory);
    }

    const row = await db.get(`SELECT * FROM sites WHERE id = ?`, [id]);
    const hist = await db.all(`SELECT * FROM site_service_history WHERE site_id = ?`, [id]);
    res.json(mapSiteRow(row, hist));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/master/sites/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.run(`DELETE FROM sites WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/master/sites/:siteId/locations", async (req, res) => {
  try {
    const { siteId } = req.params;
    const activeOnly = req.query.activeOnly === "1" || req.query.activeOnly === "true";
    const db = getDb();
    let sql = `SELECT l.*, kt.name AS kit_type_name
               FROM site_locations l
               LEFT JOIN kit_types kt ON kt.id = l.kit_type_id
               WHERE l.site_id = ?`;
    const params = [siteId];
    if (activeOnly) {
      sql += ` AND l.is_active = 1`;
    }
    sql += ` ORDER BY l.name ASC`;
    const rows = await db.all(sql, params);
    res.json(rows.map(mapLocationRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/master/site-locations", async (req, res) => {
  try {
    const siteId = (req.body.siteId || "").trim();
    const customerId = (req.body.customerId || "").trim();
    const name = (req.body.name || "").trim();
    const kitTypeId =
      req.body.kitTypeId != null && String(req.body.kitTypeId).trim()
        ? String(req.body.kitTypeId).trim()
        : null;
    if (!siteId || !customerId || !name) {
      return res.status(400).json({ error: "siteId, customerId, and name are required" });
    }
    const db = getDb();
    if (kitTypeId) {
      const kt = await db.get(`SELECT id FROM kit_types WHERE id = ?`, [kitTypeId]);
      if (!kt) {
        return res.status(400).json({ error: "Kit type not found" });
      }
    }
    const id = nextSiteLocationId();
    await db.run(
      `INSERT INTO site_locations (id, site_id, customer_id, name, is_active, kit_type_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, siteId, customerId, name, req.body.isActive === false ? 0 : 1, kitTypeId]
    );
    const row = await db.get(
      `SELECT l.*, kt.name AS kit_type_name
       FROM site_locations l
       LEFT JOIN kit_types kt ON kt.id = l.kit_type_id
       WHERE l.id = ?`,
      [id]
    );
    res.status(201).json(mapLocationRow(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/master/site-locations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const prev = await db.get(`SELECT * FROM site_locations WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Location not found" });
    }
    const siteId = (req.body.siteId || prev.site_id).trim();
    const customerId = (req.body.customerId || prev.customer_id).trim();
    const name = req.body.name != null ? String(req.body.name).trim() : prev.name;
    const kitTypeId =
      req.body.kitTypeId !== undefined
        ? (req.body.kitTypeId != null && String(req.body.kitTypeId).trim()
          ? String(req.body.kitTypeId).trim()
          : null)
        : prev.kit_type_id || null;
    if (kitTypeId) {
      const kt = await db.get(`SELECT id FROM kit_types WHERE id = ?`, [kitTypeId]);
      if (!kt) {
        return res.status(400).json({ error: "Kit type not found" });
      }
    }
    await db.run(`UPDATE site_locations SET site_id = ?, customer_id = ?, name = ?, is_active = ?, kit_type_id = ? WHERE id = ?`, [
      siteId,
      customerId,
      name,
      req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : prev.is_active,
      kitTypeId,
      id
    ]);
    const row = await db.get(
      `SELECT l.*, kt.name AS kit_type_name
       FROM site_locations l
       LEFT JOIN kit_types kt ON kt.id = l.kit_type_id
       WHERE l.id = ?`,
      [id]
    );
    res.json(mapLocationRow(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/master/kit-types", async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT id, name, is_active, sort_order FROM kit_types ORDER BY sort_order ASC, name ASC`
    );
    res.json(rows.map(mapKitTypeRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/master/kit-types", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const isActive = req.body.isActive !== false;
    const sortOrder = req.body.sortOrder != null ? Number(req.body.sortOrder) : 0;
    const id = nextKitTypeId();
    const db = getDb();
    const conflict = await db.get(`SELECT id FROM kit_types WHERE lower(trim(name)) = lower(?)`, [name]);
    if (conflict) {
      return res.status(400).json({ error: "Kit type name already exists." });
    }
    await db.run(`INSERT INTO kit_types (id, name, is_active, sort_order) VALUES (?, ?, ?, ?)`, [
      id,
      name,
      isActive ? 1 : 0,
      Number.isFinite(sortOrder) ? sortOrder : 0
    ]);
    const row = await db.get(`SELECT id, name, is_active, sort_order FROM kit_types WHERE id = ?`, [id]);
    res.status(201).json(mapKitTypeRow(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/master/kit-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const prev = await db.get(`SELECT * FROM kit_types WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Kit type not found" });
    }
    const name = req.body.name != null ? String(req.body.name).trim() : prev.name;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : prev.is_active === 1;
    const sortOrder = req.body.sortOrder != null ? Number(req.body.sortOrder) : prev.sort_order ?? 0;
    const conflict = await db.get(
      `SELECT id FROM kit_types WHERE lower(trim(name)) = lower(?) AND id != ?`,
      [name, id]
    );
    if (conflict) {
      return res.status(400).json({ error: "Kit type name already exists." });
    }
    await db.run(`UPDATE kit_types SET name = ?, is_active = ?, sort_order = ? WHERE id = ?`, [
      name,
      isActive ? 1 : 0,
      Number.isFinite(sortOrder) ? sortOrder : 0,
      id
    ]);
    const row = await db.get(`SELECT id, name, is_active, sort_order FROM kit_types WHERE id = ?`, [id]);
    res.json(mapKitTypeRow(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/master/kit-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const inUse = await db.get(`SELECT 1 AS ok FROM site_locations WHERE kit_type_id = ? LIMIT 1`, [id]);
    if (inUse) {
      return res.status(409).json({ error: "Kit type is in use by one or more locations." });
    }
    await db.run(`DELETE FROM kit_types WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/master/site-locations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.run(`DELETE FROM site_locations WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/master/sites/:siteId/service-history", async (req, res) => {
  try {
    const { siteId } = req.params;
    const db = getDb();
    const rows = await db.all(
      `SELECT * FROM site_service_history WHERE site_id = ? ORDER BY service_date DESC, id DESC`,
      [siteId]
    );
    res.json(rows.map(mapHistoryRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
