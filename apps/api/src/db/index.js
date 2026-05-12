const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const { runMigrations } = require("./migrate");
const { seedIfEmpty } = require("./seed");

let db;

function resolveDbPath() {
  if (process.env.HAWKEYE_SQLITE_PATH?.trim()) {
    return path.resolve(process.env.HAWKEYE_SQLITE_PATH.trim());
  }
  return path.resolve(__dirname, "../../../../database/local/hawkeye-driver-flow.db");
}

async function initDb() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  await db.exec("PRAGMA foreign_keys = ON");

  const migrationsDir = path.join(__dirname, "../../migrations");
  await runMigrations(db, migrationsDir);

  await seedIfEmpty(db);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

module.exports = { initDb, getDb, resolveDbPath };
