-- Default kit types for site locations (idempotent on id).

INSERT OR IGNORE INTO kit_types (id, name, is_active, sort_order) VALUES
  ('kit-fak-small', 'First Aid Kit Small', 1, 1),
  ('kit-fak-medium', 'First Aid Kit Medium', 1, 2),
  ('kit-fak-large', 'First Aid Kit Large', 1, 3),
  ('kit-fac-small', 'First Aid Cabinet Small', 1, 4),
  ('kit-fac-large', 'First Aid Cabinet Large', 1, 5);
