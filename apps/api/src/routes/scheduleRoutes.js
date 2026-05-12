const express = require("express");
const { getDb } = require("../db");

const router = express.Router();

router.get("/schedule", async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT id, driver_id, service_date, customer_ids_json FROM driver_customer_schedule ORDER BY service_date DESC, driver_id ASC`
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        driverId: r.driver_id,
        serviceDate: r.service_date,
        customerIds: JSON.parse(r.customer_ids_json || "[]")
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/schedule", async (req, res) => {
  try {
    const driverId = (req.body.driverId || "").trim();
    const serviceDate = (req.body.serviceDate || "").trim();
    const customerIds = Array.isArray(req.body.customerIds) ? req.body.customerIds.map(String) : [];
    if (!driverId || !serviceDate) {
      return res.status(400).json({ error: "driverId and serviceDate are required" });
    }
    const db = getDb();
    const user = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'driver'`, [driverId]);
    if (!user) {
      return res.status(400).json({ error: "driver user not found" });
    }
    const json = JSON.stringify(customerIds);
    try {
      const result = await db.run(
        `INSERT INTO driver_customer_schedule (driver_id, service_date, customer_ids_json) VALUES (?, ?, ?)`,
        [driverId, serviceDate, json]
      );
      res.status(201).json({
        id: result.lastID,
        driverId,
        serviceDate,
        customerIds
      });
    } catch (e) {
      if (String(e.message).includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Schedule already exists for this driver and date." });
      }
      throw e;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/schedule/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const prev = await db.get(`SELECT * FROM driver_customer_schedule WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "Schedule row not found" });
    }
    const driverId = req.body.driverId != null ? String(req.body.driverId).trim() : prev.driver_id;
    const serviceDate = req.body.serviceDate != null ? String(req.body.serviceDate).trim() : prev.service_date;
    const customerIds =
      req.body.customerIds != null
        ? Array.isArray(req.body.customerIds)
          ? req.body.customerIds.map(String)
          : JSON.parse(prev.customer_ids_json || "[]")
        : JSON.parse(prev.customer_ids_json || "[]");

    const user = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'driver'`, [driverId]);
    if (!user) {
      return res.status(400).json({ error: "driver user not found" });
    }

    await db.run(
      `UPDATE driver_customer_schedule SET driver_id = ?, service_date = ?, customer_ids_json = ? WHERE id = ?`,
      [driverId, serviceDate, JSON.stringify(customerIds), id]
    );
    res.json({
      id: Number(id),
      driverId,
      serviceDate,
      customerIds
    });
  } catch (e) {
    if (String(e.message).includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Schedule already exists for this driver and date." });
    }
    res.status(500).json({ error: e.message });
  }
});

router.delete("/schedule/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.run(`DELETE FROM driver_customer_schedule WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/field/scheduled-customers", async (req, res) => {
  try {
    const driverId = (req.query.driverId || "").trim();
    const serviceDate = (req.query.serviceDate || "").trim();
    if (!driverId || !serviceDate) {
      return res.status(400).json({ error: "driverId and serviceDate are required" });
    }
    const db = getDb();
    const row = await db.get(
      `SELECT customer_ids_json FROM driver_customer_schedule WHERE driver_id = ? AND service_date = ?`,
      [driverId, serviceDate]
    );
    const ids = row ? JSON.parse(row.customer_ids_json || "[]") : [];
    if (!ids.length) {
      return res.json([]);
    }
    const ph = ids.map(() => "?").join(",");
    const customers = await db.all(
      `SELECT id, name, is_active FROM customers WHERE id IN (${ph}) ORDER BY name ASC`,
      ids
    );
    const active = customers.filter((c) => c.is_active === 1);
    res.json(active.map((c) => ({ id: c.id, name: c.name, isActive: true })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
