-- Audit log for cancelled purchase orders (header row deleted; lines cascade away)

CREATE TABLE IF NOT EXISTS purchase_order_cancellations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL,
  po_number TEXT NOT NULL,
  customer_name TEXT,
  cancel_reason_code TEXT NOT NULL,
  cancel_reason_detail TEXT,
  cancelled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_cancellations_po_id ON purchase_order_cancellations(purchase_order_id);
