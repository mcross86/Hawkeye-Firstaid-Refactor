-- Hawkeye service operations — initial schema (SQLite)

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  site_name TEXT,
  service_date TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  customer_id TEXT,
  site_id TEXT,
  site_location_id TEXT
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER NOT NULL,
  is_add_on INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  poc_name TEXT,
  poc_title TEXT,
  poc_phone TEXT,
  entry_notes TEXT,
  hours_of_operation TEXT,
  preferred_service_time_of_day TEXT,
  service_frequency TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  scheduled_services_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_locations (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_service_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  site_location_id TEXT,
  purchase_order_id INTEGER,
  po_number TEXT,
  serviced_by TEXT NOT NULL,
  service_date TEXT NOT NULL,
  location_name TEXT NOT NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (site_location_id) REFERENCES site_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  user_id_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'clerk')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id_number_ci ON users (lower(trim(user_id_number)));

CREATE TABLE IF NOT EXISTS item_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  uom TEXT NOT NULL DEFAULT 'EA',
  notes TEXT NOT NULL DEFAULT '',
  list_price_usd REAL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku_ci ON items (lower(trim(sku)));

CREATE TABLE IF NOT EXISTS category_display_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL CHECK (scope IN ('default', 'driver')),
  driver_user_id TEXT,
  entries_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (driver_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_display_default
  ON category_display_settings (scope) WHERE scope = 'default';

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_display_driver
  ON category_display_settings (driver_user_id) WHERE scope = 'driver';

CREATE TABLE IF NOT EXISTS driver_customer_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id TEXT NOT NULL,
  service_date TEXT NOT NULL,
  customer_ids_json TEXT NOT NULL,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (driver_id, service_date)
);

CREATE INDEX IF NOT EXISTS idx_sites_customer ON sites(customer_id);
CREATE INDEX IF NOT EXISTS idx_site_locations_site ON site_locations(site_id);
CREATE INDEX IF NOT EXISTS idx_service_history_site ON site_service_history(site_id);
CREATE INDEX IF NOT EXISTS idx_service_history_po ON site_service_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
