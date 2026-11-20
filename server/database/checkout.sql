CREATE TABLE IF NOT EXISTS checkout_requests (
 user_id INTEGER NOT NULL REFERENCES users(id),
 idempotency_key TEXT NOT NULL,
 fingerprint_version INTEGER NOT NULL DEFAULT 1 CHECK(fingerprint_version=1),
 request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
 state TEXT NOT NULL DEFAULT 'ready' CHECK(state IN ('ready','committed')),
 purchase_id INTEGER UNIQUE REFERENCES purchases(id) ON DELETE RESTRICT,
 response_status INTEGER,
 response_json TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,idempotency_key),
 CHECK((state='ready' AND purchase_id IS NULL AND response_status IS NULL AND response_json IS NULL) OR (state='committed' AND purchase_id IS NOT NULL AND response_status=200 AND response_json IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS checkout_effects (
 purchase_id INTEGER PRIMARY KEY REFERENCES purchases(id) ON DELETE RESTRICT,
 save_method TEXT NOT NULL CHECK(save_method IN ('pending','running','succeeded','failed','unknown','not_required')),
 shipment TEXT NOT NULL DEFAULT 'pending' CHECK(shipment IN ('pending','running','succeeded','failed','unknown','not_required')),
 invoice_files TEXT NOT NULL DEFAULT 'pending' CHECK(invoice_files IN ('pending','running','succeeded','failed','unknown','not_required')),
 shipping_email TEXT NOT NULL DEFAULT 'pending' CHECK(shipping_email IN ('pending','running','succeeded','failed','unknown','not_required')),
 invoice_email TEXT NOT NULL DEFAULT 'pending' CHECK(invoice_email IN ('pending','running','succeeded','failed','unknown','not_required')),
 metadata_json TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
