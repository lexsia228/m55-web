-- M55 Premium monthly DTR grant idempotency (2026-03-06)
-- Business semantic (frozen): Premium monthly DTR grant = one grant per covered billing month.
-- NOT one arbitrary grant per every paid invoice.
-- Canonical settlement key: invoice.id (business-level dedupe)
-- Used only by invoice.paid webhook handler

CREATE TABLE IF NOT EXISTS invoice_dtr_grants (
  invoice_id text PRIMARY KEY,
  user_id text NOT NULL,
  granted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_dtr_grants_user ON invoice_dtr_grants(user_id);
