const express = require("express");
const { getDb } = require("../db");
const {
  getMergedItemCategories,
  getCategoryDisplayConfig,
  getConfiguredItemCategories
} = require("../services/categoryCatalog");

const router = express.Router();

router.get("/catalog/item-categories", async (req, res) => {
  try {
    const db = getDb();
    const categories = await getMergedItemCategories(db);
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/catalog/category-display", async (req, res) => {
  try {
    const driverId = req.query.driverId ? String(req.query.driverId) : undefined;
    const db = getDb();
    const rows = await getCategoryDisplayConfig(db, driverId);
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/catalog/category-display", async (req, res) => {
  try {
    const driverId = req.body.driverId ? String(req.body.driverId) : undefined;
    const rows = req.body.rows;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "rows array is required" });
    }
    const normalizedRows = [...rows]
      .map((row, index) => ({
        categoryId: row.categoryId,
        isEnabled: Boolean(row.isEnabled),
        sequence: Number(row.sequence) || index + 1
      }))
      .sort((a, b) => a.sequence - b.sequence);

    const db = getDb();
    const json = JSON.stringify(normalizedRows);

    if (driverId) {
      const user = await db.get(`SELECT id FROM users WHERE id = ?`, [driverId]);
      if (!user) {
        return res.status(400).json({ error: "driver user not found" });
      }
      const existing = await db.get(
        `SELECT id FROM category_display_settings WHERE scope = 'driver' AND driver_user_id = ?`,
        [driverId]
      );
      if (existing) {
        await db.run(`UPDATE category_display_settings SET entries_json = ? WHERE id = ?`, [
          json,
          existing.id
        ]);
      } else {
        await db.run(
          `INSERT INTO category_display_settings (scope, driver_user_id, entries_json) VALUES ('driver', ?, ?)`,
          [driverId, json]
        );
      }
    } else {
      const existing = await db.get(`SELECT id FROM category_display_settings WHERE scope = 'default'`);
      if (existing) {
        await db.run(`UPDATE category_display_settings SET entries_json = ? WHERE id = ?`, [
          json,
          existing.id
        ]);
      } else {
        await db.run(
          `INSERT INTO category_display_settings (scope, driver_user_id, entries_json) VALUES ('default', NULL, ?)`,
          [json]
        );
      }
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/catalog/configured-categories", async (req, res) => {
  try {
    const driverId = req.query.driverId ? String(req.query.driverId) : undefined;
    const db = getDb();
    const categories = await getConfiguredItemCategories(db, driverId);
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
