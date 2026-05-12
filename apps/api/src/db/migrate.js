const fs = require("fs");
const path = require("path");

async function ensureMigrationsTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getAppliedVersions(db) {
  const rows = await db.all(`SELECT version FROM schema_migrations ORDER BY version ASC`);
  return new Set(rows.map((r) => r.version));
}

async function applyMigration(db, version, sql) {
  await db.exec("BEGIN");
  try {
    await db.exec(sql);
    await db.run(`INSERT INTO schema_migrations (version) VALUES (?)`, [version]);
    await db.exec("COMMIT");
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}

async function runMigrations(db, migrationsDir) {
  await ensureMigrationsTable(db);
  const applied = await getAppliedVersions(db);
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = Number(file.split("_")[0]);
    if (!Number.isFinite(version)) {
      continue;
    }
    if (applied.has(version)) {
      continue;
    }
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");
    await applyMigration(db, version, sql);
  }
}

module.exports = { runMigrations };
