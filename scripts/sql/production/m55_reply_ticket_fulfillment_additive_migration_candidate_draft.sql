-- ============================================================================
-- DO NOT RUN — DRAFT ONLY — NOT A MIGRATION
--
-- This file is NOT for `supabase/migrations` and MUST NOT be applied to
-- production, shadow, staging, or CI without a separate signed apply gate.
--
-- Contains: commented candidate DDL for human review only.
-- Forbidden in this draft: CHECK changes, NOT NULL, FK, strict UNIQUE,
--   payload bodies, secrets, raw user_id.
--
-- Apply path (when authorized): shadow/staging first → production preflight
--   → production apply gate. See SSOT:
--   docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_CANDIDATE_DRAFT_v1.md
--
-- SSOT preflight result:
--   docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PREFLIGHT_RESULT_v1.md
-- ============================================================================
--
-- This file intentionally has NO executable statements. If pasted into a SQL
-- client, it performs no DDL/DML when comments are preserved.
-- ============================================================================


/*
================================================================================
CANDIDATE DRAFT A — New idempotency row store (name: public.stripe_processed_events)
        Thin table; no raw Stripe payload / envelope body.
        UNIQUE on stripe_event_id is REQUIRED before webhook production — but
        this draft does NOT add UNIQUE / NOT NULL / FK (separate gate).

-- Example shape (all constraints deferred to later gates except what you
--   explicitly add elsewhere). Table name is a candidate; finalize in review.

CREATE TABLE public.stripe_processed_events (
  id                   uuid DEFAULT gen_random_uuid(),
  stripe_event_id      text,
  checkout_session_id  text,
  payment_intent_id    text,
  product_key          text,
  report_instance_id   uuid,
  user_ref_hash        text,
  status               text,
  processed_at         timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- FUTURE GATE (webhook production): enforce idempotency effectively, e.g.:
--   CREATE UNIQUE INDEX … ON public.stripe_processed_events (stripe_event_id)
--   WHERE stripe_event_id IS NOT NULL;
--   and/or NOT NULL on id, stripe_event_id as policy allows.
--   Document partial index vs full UNIQUE in migration packet.

================================================================================
*/


/*
================================================================================
CANDIDATE DRAFT B — Reply wallet ledgers: nullable Stripe reference columns only
        Pick ONE checkout column name and ONE payment-intent column name
        application-wide (compare in SSOT §4). Do not add payload_json in v1.

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_event_id text;

-- Option B1 (explicit Stripe-prefixed naming):
ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Option B2 (shorter names — choose B1 OR B2, not both):
-- ALTER TABLE public.reply_wallet_ledgers
--   ADD COLUMN IF NOT EXISTS checkout_session_id text;
-- ALTER TABLE public.reply_wallet_ledgers
--   ADD COLUMN IF NOT EXISTS payment_intent_id text;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS product_key text;

-- Optional: updated_at on ledger is out of scope unless ADR says otherwise.
-- No CHECK changes in this candidate draft.

================================================================================
*/


/*
================================================================================
CANDIDATE DRAFT C — CHECK constraints on reply_wallet_ledgers
        NOT CHANGED in first candidate. Keep existing purchase_grant /
        PURCHASE (or NULL policy) per preflight. Defer:
          event_type: purchase_additional_reply_ticket
          source_of_grant: stripe_checkout
        to a follow-up migration draft after data + review.

-- (intentionally empty — no DDL)

================================================================================
*/


-- END OF DRAFT FILE (no executable SQL)
