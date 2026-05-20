#!/usr/bin/env node
/**
 * Import a paper "Customer Data Card" from JSON into SQLite (customer, site, locations,
 * manual service history, scheduled services).
 *
 * Usage (from repo root):
 *   node apps/scripts/importCustomerCard.js [path/to/card.json]
 *   npm run import:customer-card -- path/to/card.json
 *
 * From apps/api:
 *   node ../scripts/importCustomerCard.js [path/to/card.json]
 *
 * Default path: ../../database/card-imports/cruz-cafe.json (repo root)
 *
 * Safe to re-run: upserts customer/site/locations; replaces only manual service history
 * rows for the site (never deletes PO-linked history).
 */

const fs = require("fs");
const path = require("path");

const apiRoot = path.join(__dirname, "..", "api");
process.chdir(apiRoot);

const { initDb, getDb } = require(path.join(apiRoot, "src", "db"));

function resolveJsonPath() {
  const arg = process.argv[2];
  if (arg) {
    return path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  }
  return path.resolve(apiRoot, "..", "..", "database", "card-imports", "cruz-cafe.json");
}

async function upsertCustomer(db, { id, name, isActive }) {
  await db.run(
    `INSERT INTO customers (id, name, is_active) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, is_active = excluded.is_active`,
    [id, name.trim(), isActive !== false ? 1 : 0]
  );
}

async function upsertSite(db, customerId, site) {
  const scheduled = JSON.stringify(Array.isArray(site.scheduledServices) ? site.scheduledServices : []);
  await db.run(
    `INSERT INTO sites (
      id, customer_id, name, address, city, state, zip,
      poc_name, poc_title, poc_phone, entry_notes,
      hours_of_operation, preferred_service_time_of_day, service_frequency,
      is_active, scheduled_services_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      customer_id = excluded.customer_id,
      name = excluded.name,
      address = excluded.address,
      city = excluded.city,
      state = excluded.state,
      zip = excluded.zip,
      poc_name = excluded.poc_name,
      poc_title = excluded.poc_title,
      poc_phone = excluded.poc_phone,
      entry_notes = excluded.entry_notes,
      hours_of_operation = excluded.hours_of_operation,
      preferred_service_time_of_day = excluded.preferred_service_time_of_day,
      service_frequency = excluded.service_frequency,
      is_active = excluded.is_active,
      scheduled_services_json = excluded.scheduled_services_json`,
    [
      site.id,
      customerId,
      (site.name || "").trim(),
      (site.address || "").trim(),
      (site.city || "").trim(),
      (site.state || "").trim(),
      (site.zip || "").trim(),
      (site.pocName || "").trim(),
      (site.pocTitle || "").trim(),
      (site.pocPhone || "").trim(),
      (site.entryNotes || "").trim(),
      (site.hoursOfOperation || "").trim(),
      (site.preferredServiceTimeOfDay || "").trim(),
      (site.serviceFrequency || "").trim(),
      site.isActive === false ? 0 : 1,
      scheduled
    ]
  );
}

async function upsertLocation(db, { id, siteId, customerId, name, isActive, kitTypeId }) {
  const kt =
    kitTypeId != null && String(kitTypeId).trim() ? String(kitTypeId).trim() : null;
  await db.run(
    `INSERT INTO site_locations (id, site_id, customer_id, name, is_active, kit_type_id)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       site_id = excluded.site_id,
       customer_id = excluded.customer_id,
       name = excluded.name,
       is_active = excluded.is_active,
       kit_type_id = COALESCE(excluded.kit_type_id, site_locations.kit_type_id)`,
    [id, siteId, customerId, name.trim(), isActive === false ? 0 : 1, kt]
  );
}

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
        "Legacy card import",
        date || new Date().toISOString().split("T")[0],
        "—",
        summary || null
      ]
    );
  }
}

async function main() {
  const jsonPath = resolveJsonPath();
  if (!fs.existsSync(jsonPath)) {
    console.error("File not found:", jsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);

  const customer = data.customer;
  const site = {
    ...data.site,
    scheduledServices:
      data.scheduledServices ?? data.site?.scheduledServices ?? []
  };
  const locations = Array.isArray(data.locations) ? data.locations : [];
  const serviceHistory = data.serviceHistory;

  if (!customer?.id || !customer?.name) {
    throw new Error("customer.id and customer.name are required");
  }
  if (!site?.id || !site?.name) {
    throw new Error("site.id and site.name are required");
  }

  await initDb();
  const db = getDb();

  await db.exec("BEGIN");
  try {
    await upsertCustomer(db, customer);
    await upsertSite(db, customer.id, site);
    for (const loc of locations) {
      const kitTypeId = loc.kitTypeId ?? loc.kit_type_id ?? null;
      await upsertLocation(db, {
        id: loc.id,
        siteId: site.id,
        customerId: customer.id,
        name: loc.name || "Location",
        isActive: loc.isActive,
        kitTypeId
      });
    }
    await replaceManualServiceHistory(db, site.id, serviceHistory);
    await db.exec("COMMIT");
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }

  console.log("Imported customer card:", customer.name);
  console.log("  Customer ID:", customer.id);
  console.log("  Site ID:", site.id);
  console.log(
    "  Locations:",
    locations.length,
    "| Manual history rows:",
    Array.isArray(serviceHistory) ? serviceHistory.length : 0
  );
  console.log(
    "  Database:",
    process.env.HAWKEYE_SQLITE_PATH || "database/local/hawkeye-driver-flow.db (default under repo)"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
