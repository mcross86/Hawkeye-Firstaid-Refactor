/**
 * Seeds demo master data when core tables are empty (first boot / fresh SQLite file).
 */

const seedCustomers = [
  { id: "cust-001", name: "Acme Manufacturing", is_active: 1 },
  { id: "cust-002", name: "Beacon Distribution", is_active: 1 },
  { id: "cust-003", name: "Cedar Medical", is_active: 1 }
];

const seedSites = [
  {
    id: "site-001",
    customer_id: "cust-001",
    name: "North Dock",
    address: "1200 North Industrial Rd",
    city: "",
    state: "",
    zip: "",
    poc_name: "",
    poc_title: "",
    poc_phone: "",
    entry_notes:
      "Gate code 1842. Shipping office is the second door past the guard shack.",
    hours_of_operation: "",
    preferred_service_time_of_day: "",
    service_frequency: "",
    is_active: 1,
    scheduled_services_json: "[]"
  },
  {
    id: "site-002",
    customer_id: "cust-001",
    name: "South Warehouse",
    address: "900 South Industrial Rd",
    city: "",
    state: "",
    zip: "",
    poc_name: "",
    poc_title: "",
    poc_phone: "",
    entry_notes: "",
    hours_of_operation: "",
    preferred_service_time_of_day: "",
    service_frequency: "",
    is_active: 1,
    scheduled_services_json: "[]"
  },
  {
    id: "site-003",
    customer_id: "cust-002",
    name: "Main Warehouse",
    address: "77 Beacon Way",
    city: "",
    state: "",
    zip: "",
    poc_name: "",
    poc_title: "",
    poc_phone: "",
    entry_notes: "",
    hours_of_operation: "",
    preferred_service_time_of_day: "",
    service_frequency: "",
    is_active: 1,
    scheduled_services_json: "[]"
  },
  {
    id: "site-004",
    customer_id: "cust-003",
    name: "Campus East",
    address: "15 Cedar Campus East",
    city: "",
    state: "",
    zip: "",
    poc_name: "",
    poc_title: "",
    poc_phone: "",
    entry_notes: "",
    hours_of_operation: "",
    preferred_service_time_of_day: "",
    service_frequency: "",
    is_active: 1,
    scheduled_services_json: "[]"
  }
];

const seedSiteLocations = [
  {
    id: "sloc-001",
    site_id: "site-001",
    customer_id: "cust-001",
    name: "Receiving dock",
    is_active: 1,
    kit_type_id: "kit-fak-medium"
  },
  {
    id: "sloc-002",
    site_id: "site-002",
    customer_id: "cust-001",
    name: "Main floor",
    is_active: 1,
    kit_type_id: "kit-fak-medium"
  },
  {
    id: "sloc-003",
    site_id: "site-003",
    customer_id: "cust-002",
    name: "Stockroom",
    is_active: 1,
    kit_type_id: "kit-fak-medium"
  },
  {
    id: "sloc-004",
    site_id: "site-004",
    customer_id: "cust-003",
    name: "Building A — First aid closet",
    is_active: 1,
    kit_type_id: "kit-fak-large"
  }
];

const seedKitTypes = [
  { id: "kit-fak-small", name: "First Aid Kit Small", is_active: 1, sort_order: 1 },
  { id: "kit-fak-medium", name: "First Aid Kit Medium", is_active: 1, sort_order: 2 },
  { id: "kit-fak-large", name: "First Aid Kit Large", is_active: 1, sort_order: 3 },
  { id: "kit-fac-small", name: "First Aid Cabinet Small", is_active: 1, sort_order: 4 },
  { id: "kit-fac-large", name: "First Aid Cabinet Large", is_active: 1, sort_order: 5 }
];

const seedUsers = [
  {
    id: "user-001",
    name: "Pat Admin",
    email: "pat.admin@hawkeye.example",
    role: "admin",
    user_id_number: "9001",
    is_active: 1
  },
  {
    id: "user-002",
    name: "Chris Clerk",
    email: "chris.clerk@hawkeye.example",
    role: "clerk",
    user_id_number: "2001",
    is_active: 1
  },
  {
    id: "user-003",
    name: "Matt Ross",
    email: "matt.ross@hawkeye.example",
    role: "driver",
    user_id_number: "1234",
    is_active: 1
  },
  {
    id: "user-ana-morgan",
    name: "Morgan Lee",
    email: "morgan.lee@hawkeye.example",
    role: "driver",
    user_id_number: "3101",
    is_active: 1
  },
  {
    id: "user-ana-jordan",
    name: "Jordan Park",
    email: "jordan.park@hawkeye.example",
    role: "driver",
    user_id_number: "3102",
    is_active: 1
  },
  {
    id: "user-ana-avery",
    name: "Avery Chen",
    email: "avery.chen@hawkeye.example",
    role: "driver",
    user_id_number: "3103",
    is_active: 1
  }
];

const seedItemCategories = [
  { id: "cat-bandages", name: "Bandages & Dressings", sort_order: 1 },
  { id: "cat-burn", name: "Burn Care", sort_order: 2 },
  { id: "cat-antiseptic", name: "Antiseptics & Wound Cleaning", sort_order: 3 },
  { id: "cat-ppe", name: "PPE & Protection", sort_order: 4 },
  { id: "cat-meds", name: "OTC Relief", sort_order: 5 }
];

const seedItems = [
  {
    id: "itm-001",
    sku: "BND-1001",
    name: "Adhesive Bandages - Assorted (100 ct)",
    category_id: "cat-bandages",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 12.5
  },
  {
    id: "itm-002",
    sku: "BND-1002",
    name: "Sterile Gauze Pads 4x4 (25 ct)",
    category_id: "cat-bandages",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 9.25
  },
  {
    id: "itm-003",
    sku: "BND-1003",
    name: "Elastic Bandage 3in",
    category_id: "cat-bandages",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 6.75
  },
  {
    id: "itm-004",
    sku: "BRN-2001",
    name: "Burn Gel Packets (10 ct)",
    category_id: "cat-burn",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 8.0
  },
  {
    id: "itm-005",
    sku: "BRN-2002",
    name: "Burn Dressing 4x4",
    category_id: "cat-burn",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 11.5
  },
  {
    id: "itm-006",
    sku: "BRN-2003",
    name: "Hydrogel Burn Pad",
    category_id: "cat-burn",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 14.0
  },
  {
    id: "itm-007",
    sku: "ANT-3001",
    name: "Antiseptic Wipes (50 ct)",
    category_id: "cat-antiseptic",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 7.25
  },
  {
    id: "itm-008",
    sku: "ANT-3002",
    name: "Hydrogen Peroxide 16oz",
    category_id: "cat-antiseptic",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 4.5
  },
  {
    id: "itm-009",
    sku: "ANT-3003",
    name: "Alcohol Prep Pads (200 ct)",
    category_id: "cat-antiseptic",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 10.0
  },
  {
    id: "itm-010",
    sku: "PPE-4001",
    name: "Nitrile Gloves - Medium (100 ct)",
    category_id: "cat-ppe",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 18.99
  },
  {
    id: "itm-011",
    sku: "PPE-4002",
    name: "CPR Face Shield",
    category_id: "cat-ppe",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 15.5
  },
  {
    id: "itm-012",
    sku: "PPE-4003",
    name: "Safety Goggles",
    category_id: "cat-ppe",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 22.0
  },
  {
    id: "itm-013",
    sku: "MED-5001",
    name: "Ibuprofen 200mg (50 ct)",
    category_id: "cat-meds",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 9.99
  },
  {
    id: "itm-014",
    sku: "MED-5002",
    name: "Acetaminophen 500mg (50 ct)",
    category_id: "cat-meds",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 9.99
  },
  {
    id: "itm-015",
    sku: "MED-5003",
    name: "Aspirin 325mg (50 ct)",
    category_id: "cat-meds",
    is_active: 1,
    uom: "EA",
    notes: "",
    list_price_usd: 8.5
  }
];

const defaultCategoryDisplay = [
  { categoryId: "cat-bandages", isEnabled: true, sequence: 1 },
  { categoryId: "cat-burn", isEnabled: true, sequence: 2 },
  { categoryId: "cat-antiseptic", isEnabled: true, sequence: 3 },
  { categoryId: "cat-ppe", isEnabled: true, sequence: 4 },
  { categoryId: "cat-meds", isEnabled: true, sequence: 5 }
];

const driverCategoryDisplayUser003 = [
  { categoryId: "cat-bandages", isEnabled: true, sequence: 1 },
  { categoryId: "cat-antiseptic", isEnabled: true, sequence: 2 },
  { categoryId: "cat-burn", isEnabled: true, sequence: 3 },
  { categoryId: "cat-ppe", isEnabled: true, sequence: 4 },
  { categoryId: "cat-meds", isEnabled: true, sequence: 5 }
];

async function seedIfEmpty(db) {
  const { count } = await db.get("SELECT COUNT(*) AS count FROM customers");
  if (count > 0) {
    return;
  }

  for (const c of seedCustomers) {
    await db.run(`INSERT INTO customers (id, name, is_active) VALUES (?, ?, ?)`, [
      c.id,
      c.name,
      c.is_active
    ]);
  }

  for (const s of seedSites) {
    await db.run(
      `INSERT INTO sites (
        id, customer_id, name, address, city, state, zip,
        poc_name, poc_title, poc_phone, entry_notes,
        hours_of_operation, preferred_service_time_of_day, service_frequency,
        is_active, scheduled_services_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.customer_id,
        s.name,
        s.address,
        s.city,
        s.state,
        s.zip,
        s.poc_name,
        s.poc_title,
        s.poc_phone,
        s.entry_notes,
        s.hours_of_operation,
        s.preferred_service_time_of_day,
        s.service_frequency,
        s.is_active,
        s.scheduled_services_json
      ]
    );
  }

  for (const kt of seedKitTypes) {
    await db.run(
      `INSERT OR IGNORE INTO kit_types (id, name, is_active, sort_order) VALUES (?, ?, ?, ?)`,
      [kt.id, kt.name, kt.is_active, kt.sort_order]
    );
  }

  for (const l of seedSiteLocations) {
    await db.run(
      `INSERT INTO site_locations (id, site_id, customer_id, name, is_active, kit_type_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [l.id, l.site_id, l.customer_id, l.name, l.is_active, l.kit_type_id || null]
    );
  }

  for (const u of seedUsers) {
    await db.run(
      `INSERT INTO users (id, name, email, user_id_number, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, u.user_id_number, u.role, u.is_active]
    );
  }

  for (const cat of seedItemCategories) {
    await db.run(`INSERT INTO item_categories (id, name, sort_order) VALUES (?, ?, ?)`, [
      cat.id,
      cat.name,
      cat.sort_order
    ]);
  }

  for (const it of seedItems) {
    await db.run(
      `INSERT INTO items (id, sku, name, category_id, is_active, uom, notes, list_price_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        it.id,
        it.sku,
        it.name,
        it.category_id,
        it.is_active,
        it.uom,
        it.notes,
        it.list_price_usd
      ]
    );
  }

  await db.run(`INSERT INTO category_display_settings (scope, driver_user_id, entries_json) VALUES ('default', NULL, ?)`, [
    JSON.stringify(defaultCategoryDisplay)
  ]);

  await db.run(
    `INSERT INTO category_display_settings (scope, driver_user_id, entries_json) VALUES ('driver', ?, ?)`,
    ["user-003", JSON.stringify(driverCategoryDisplayUser003)]
  );

  const today = new Date().toISOString().split("T")[0];
  await db.run(`INSERT INTO driver_customer_schedule (driver_id, service_date, customer_ids_json) VALUES (?, ?, ?)`, [
    "user-003",
    today,
    JSON.stringify(["cust-001", "cust-002"])
  ]);
}

module.exports = { seedIfEmpty };
