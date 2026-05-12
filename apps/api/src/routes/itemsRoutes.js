const express = require("express");
const { getDb } = require("../db");
const { parseCsvLine, validateCsvHeader, importItemsFromRows } = require("../services/itemCsv");

const router = express.Router();

function nextItemId() {
  return `itm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapItem(row) {
  const price = row.list_price_usd;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    categoryId: row.category_id,
    isActive: row.is_active === 1,
    uom: row.uom != null && String(row.uom).trim() ? String(row.uom).trim() : "EA",
    notes: row.notes != null ? String(row.notes) : "",
    listPriceUsd: price != null && Number.isFinite(Number(price)) ? Number(price) : null
  };
}

router.get("/items", async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT id, sku, name, category_id, is_active, uom, notes, list_price_usd FROM items ORDER BY sku ASC`
    );
    res.json(rows.map(mapItem));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/items", async (req, res) => {
  try {
    const sku = (req.body.sku || "").trim();
    const name = (req.body.name || "").trim();
    const categoryId = (req.body.categoryId || "").trim();
    if (!sku || !name || !categoryId) {
      return res.status(400).json({ error: "sku, name, and categoryId are required" });
    }
    const db = getDb();
    const dup = await db.get(`SELECT id FROM items WHERE lower(trim(sku)) = lower(?)`, [sku]);
    if (dup) {
      return res.status(400).json({ error: `SKU already exists: ${sku}` });
    }
    const id = nextItemId();
    const uom = (req.body.uom || "EA").trim() || "EA";
    const notes = (req.body.notes || "").trim();
    const isActive = req.body.isActive !== false ? 1 : 0;
    const listPrice =
      req.body.listPriceUsd != null && req.body.listPriceUsd !== ""
        ? Number(req.body.listPriceUsd)
        : null;
    const listSql =
      listPrice != null && Number.isFinite(listPrice) ? listPrice : null;

    await db.run(
      `INSERT INTO items (id, sku, name, category_id, is_active, uom, notes, list_price_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sku, name, categoryId, isActive, uom, notes, listSql]
    );
    const row = await db.get(`SELECT * FROM items WHERE id = ?`, [id]);
    res.status(201).json(mapItem(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const prev = await db.get(`SELECT * FROM items WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Item not found" });
    }
    const sku = req.body.sku != null ? String(req.body.sku).trim() : prev.sku;
    const name = req.body.name != null ? String(req.body.name).trim() : prev.name;
    const categoryId = req.body.categoryId != null ? String(req.body.categoryId).trim() : prev.category_id;
    if (!sku || !name || !categoryId) {
      return res.status(400).json({ error: "sku, name, and categoryId are required" });
    }
    const conflict = await db.get(
      `SELECT id FROM items WHERE lower(trim(sku)) = lower(?) AND id != ?`,
      [sku, id]
    );
    if (conflict) {
      return res.status(400).json({ error: `SKU already in use: ${sku}` });
    }
    const uom = req.body.uom != null ? String(req.body.uom).trim() || "EA" : prev.uom || "EA";
    const notes = req.body.notes != null ? String(req.body.notes).trim() : prev.notes || "";
    const isActive = req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : prev.is_active;
    let listSql = prev.list_price_usd;
    if (req.body.listPriceUsd !== undefined) {
      const lp = req.body.listPriceUsd;
      if (lp === null || lp === "") {
        listSql = null;
      } else {
        const n = Number(lp);
        listSql = Number.isFinite(n) ? n : null;
      }
    }

    await db.run(
      `UPDATE items SET sku = ?, name = ?, category_id = ?, is_active = ?, uom = ?, notes = ?, list_price_usd = ?
       WHERE id = ?`,
      [sku, name, categoryId, isActive, uom, notes, listSql, id]
    );
    const row = await db.get(`SELECT * FROM items WHERE id = ?`, [id]);
    res.json(mapItem(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.run(`DELETE FROM items WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/items/import-csv", async (req, res) => {
  try {
    const text = req.body.csvText != null ? String(req.body.csvText) : "";
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
    const headerCheck = validateCsvHeader(lines);
    if (!headerCheck.ok) {
      return res.status(400).json({ created: 0, updated: 0, errors: headerCheck.errors });
    }

    const db = getDb();
    const existing = await db.all(`SELECT * FROM items`);
    const store = existing.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      categoryId: row.category_id,
      isActive: row.is_active === 1,
      uom: row.uom || "EA",
      notes: row.notes || "",
      listPriceUsd:
        row.list_price_usd != null && Number.isFinite(Number(row.list_price_usd))
          ? Number(row.list_price_usd)
          : null
    }));

    const dataRows = lines.slice(1).map(parseCsvLine);
    const padded = dataRows.map((cells) => {
      const next = [...cells];
      while (next.length < 7) {
        next.push("");
      }
      return next.slice(0, 7);
    });

    const result = importItemsFromRows(padded, store, nextItemId);
    if (result.errors.length) {
      return res.status(400).json({
        error: result.errors[0] || "Import validation failed",
        ...result
      });
    }

    await db.exec("BEGIN");
    try {
      for (const it of store) {
        const listSql =
          it.listPriceUsd != null && Number.isFinite(Number(it.listPriceUsd))
            ? Number(it.listPriceUsd)
            : null;
        const exists = await db.get(`SELECT id FROM items WHERE id = ?`, [it.id]);
        if (exists) {
          await db.run(
            `UPDATE items SET sku = ?, name = ?, category_id = ?, is_active = ?, uom = ?, notes = ?, list_price_usd = ?
             WHERE id = ?`,
            [
              it.sku,
              it.name,
              it.categoryId,
              it.isActive ? 1 : 0,
              it.uom || "EA",
              it.notes || "",
              listSql,
              it.id
            ]
          );
        } else {
          await db.run(
            `INSERT INTO items (id, sku, name, category_id, is_active, uom, notes, list_price_usd)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              it.id,
              it.sku,
              it.name,
              it.categoryId,
              it.isActive ? 1 : 0,
              it.uom || "EA",
              it.notes || "",
              listSql
            ]
          );
        }
      }
      await db.exec("COMMIT");
    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }

    res.json({ created: result.created, updated: result.updated, errors: [] });
  } catch (e) {
    res.status(500).json({ error: e.message, created: 0, updated: 0, errors: [e.message] });
  }
});

module.exports = router;
