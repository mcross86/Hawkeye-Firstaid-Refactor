-- Per-customer: allow driver orders without a route schedule row for that day.
ALTER TABLE customers ADD COLUMN order_any_time INTEGER NOT NULL DEFAULT 1;
