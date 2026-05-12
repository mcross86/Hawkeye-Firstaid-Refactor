const express = require("express");
const { getDb } = require("../db");

const router = express.Router();

function nextUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    userIdNumber: row.user_id_number != null ? String(row.user_id_number) : "",
    role: row.role,
    isActive: row.is_active === 1
  };
}

router.get("/users", async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT id, name, email, user_id_number, role, is_active FROM users ORDER BY name ASC`
    );
    res.json(rows.map(mapUser));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const userIdNumber = String(req.body.userIdNumber || "").trim();
    const role = req.body.role;
    const isActive = req.body.isActive !== false;

    if (!name || !userIdNumber) {
      return res.status(400).json({ error: "name and userIdNumber are required" });
    }
    if (!["admin", "driver", "clerk"].includes(role)) {
      return res.status(400).json({ error: "role must be admin, driver, or clerk" });
    }

    const db = getDb();
    const conflict = await db.get(`SELECT id FROM users WHERE lower(trim(user_id_number)) = lower(?)`, [
      userIdNumber
    ]);
    if (conflict) {
      return res.status(400).json({ error: "User ID # is already assigned to another user." });
    }

    const id = nextUserId();
    await db.run(
      `INSERT INTO users (id, name, email, user_id_number, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, email, userIdNumber, role, isActive ? 1 : 0]
    );
    const row = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
    res.status(201).json(mapUser(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const prev = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!prev) {
      return res.status(404).json({ error: "User not found" });
    }

    const name = req.body.name != null ? String(req.body.name).trim() : prev.name;
    const email =
      req.body.email != null ? String(req.body.email).trim().toLowerCase() : prev.email || "";
    const userIdNumber =
      req.body.userIdNumber != null ? String(req.body.userIdNumber).trim() : prev.user_id_number;
    const role = req.body.role != null ? req.body.role : prev.role;
    const isActive =
      req.body.isActive !== undefined ? Boolean(req.body.isActive) : prev.is_active === 1;

    if (!name || !userIdNumber) {
      return res.status(400).json({ error: "name and userIdNumber are required" });
    }
    if (!["admin", "driver", "clerk"].includes(role)) {
      return res.status(400).json({ error: "role must be admin, driver, or clerk" });
    }

    const conflict = await db.get(
      `SELECT id FROM users WHERE lower(trim(user_id_number)) = lower(?) AND id != ?`,
      [userIdNumber, id]
    );
    if (conflict) {
      return res.status(400).json({ error: "User ID # is already assigned to another user." });
    }

    await db.run(
      `UPDATE users SET name = ?, email = ?, user_id_number = ?, role = ?, is_active = ? WHERE id = ?`,
      [name, email, userIdNumber, role, isActive ? 1 : 0, id]
    );
    const row = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
    res.json(mapUser(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.run(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
