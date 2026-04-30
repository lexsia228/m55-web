-- ============================================================================
-- SHADOW / STAGING ONLY — DO NOT RUN IN PRODUCTION
-- NOT FOR supabase/migrations
--
-- Executable additive DDL candidate for shadow/staging verification only.
-- Does not belong in supabase/migrations until a separate production gate.
--
-- Scope: CREATE TABLE + ADD COLUMN (nullable). No UPDATE of existing rows.
-- Forbidden here: CHECK changes, NOT NULL, FK, strict UNIQUE, payload columns,
--   secrets, raw user_id.
--
-- Idempotency: stripe_event_id UNIQUE is REQUIRED before webhook production —
--   NOT included in this file. Add in a later gate (partial UNIQUE, etc.).
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_CANDIDATE_v1.md
-- Gate: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_STAGING_GATE_v1.md
--
-- Apply only after separate approval; run preflight queries first. No execution
-- is implied by committing this file.
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
-- Optional non-unique indexes (NOT applied here — compare in SSOT §4)
-- Example for shadow-only exploration (commented; duplicates allowed without UNIQUE):
--
-- CREATE INDEX IF NOT EXISTS idx_stripe_processed_events_stripe_event_id_nonunique
--   ON public.stripe_processed_events (stripe_event_id);
--
-- CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_stripe_event_id_nonunique
--   ON public.reply_wallet_ledgers (stripe_event_id);
-- -----------------------------------------------------------------------------


-- END OF FILE
