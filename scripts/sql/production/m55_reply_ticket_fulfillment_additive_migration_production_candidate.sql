-- ============================================================================
-- DO NOT RUN WITHOUT FINAL APPROVAL
--
-- Production-specific additive DDL candidate for m55-soul-core (PRODUCTION).
-- This file is NOT authorized for execution by its presence in the repo alone.
-- Do NOT paste into production until: production apply gate sign-off, preflight
-- re-run, and a maintenance window are satisfied.
--
-- NOT FOR supabase/migrations (yet) — do not copy into supabase/migrations until
-- a separate migration packaging / promotion gate.
--
-- Scope: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS (nullable text).
-- Forbidden: UPDATE, INSERT, DELETE, DROP, SET, CHECK changes, NOT NULL, FK,
--   strict UNIQUE, payload_json / raw payload bodies, secrets.
--
-- Do NOT run scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql
--   on production — use this production candidate file only after review parity.
--
-- Idempotency: stripe_event_id UNIQUE (or equivalent) is REQUIRED before webhook
--   production — NOT in this file; separate gate after policy sign-off.
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_CANDIDATE_v1.md
-- Gate: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1.md
--
-- Preflight: scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql
-- ============================================================================


-- -----------------------------------------------------------------------------
-- A — public.stripe_processed_events (thin idempotency row store; no payload body)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_processed_events (
  id uuid DEFAULT gen_random_uuid(),
  stripe_event_id text,
  checkout_session_id text,
  payment_intent_id text,
  product_key text,
  report_instance_id uuid,
  user_ref_hash text,
  status text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- B — public.reply_wallet_ledgers: nullable Stripe reference columns only
-- -----------------------------------------------------------------------------
ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_event_id text;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS product_key text;


-- -----------------------------------------------------------------------------
-- Optional non-unique indexes (NOT applied here — see PRODUCTION_CANDIDATE SSOT)
--   Partial / UNIQUE indexes for stripe_event_id belong in a later production gate.
--
-- CREATE INDEX IF NOT EXISTS idx_stripe_processed_events_stripe_event_id_nonunique
--   ON public.stripe_processed_events (stripe_event_id);
--
-- CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_stripe_event_id_nonunique
--   ON public.reply_wallet_ledgers (stripe_event_id);
-- -----------------------------------------------------------------------------


-- END OF FILE
