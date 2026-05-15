-- =============================================================================
-- DO NOT RUN WITHOUT EXPLICIT TEAM APPROVAL AND PRODUCTION MAINTENANCE WINDOW.
--
-- Path: scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql
--
-- Phase 5-2 — REVIEW-ONLY consolidated candidate for Production (additional reply
--   ticket ¥500 webhook lane). This file is NOT authorized for execution by its
--   presence in the repo alone.
--
-- NO Production execution in Phase 5-2. NO test data. NO Shadow user backfill.
-- NO DROP / TRUNCATE / DELETE. Prefer additive DDL + CREATE OR REPLACE only.
--
-- Composed from:
--   scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql
--   scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql
--
-- REVIEW_REQUIRED before any run:
--   - Run read-only preflight (m55_phase5_production_promotion_readiness_preflight_v1.sql).
--   - Confirm reply_ticket_wallets.report_instance_id exists and wallet rows are
--     report-scoped (Phase 2 app contract); this file does NOT add wallet columns.
--   - If stripe_processed_events already has rows, verify NO duplicate stripe_event_id
--     before CREATE UNIQUE INDEX — otherwise index creation FAILS (non-destructive stop).
--   - Confirm PostgREST / Supabase policy for NOTIFY vs Dashboard schema reload.
--
-- Suggested order when GO is granted (manual transaction optional — DBA policy):
--   1) additive DDL below (STEP A/B)
--   2) optional NON-UNIQUE ledger lookup index (STEP B2 — Phase 5-6E; not idempotency)
--   3) idempotency unique index on stripe_processed_events (STEP C)
--   4) RPC CREATE OR REPLACE
--   5) REVOKE / GRANT
--   6) NOTIFY pgrst
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP A — stripe_processed_events (additive)
-- Source: m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql
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
-- STEP B — reply_wallet_ledgers: Stripe/reference columns + report_instance_id
-- Source: additive candidate + RPC INSERT contract
-- -----------------------------------------------------------------------------
ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS report_instance_id uuid;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_event_id text;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS product_key text;

-- -----------------------------------------------------------------------------
-- STEP B2 — reply_wallet_ledgers: NON-UNIQUE lookup index on stripe_event_id
-- Phase 5-6E (2026-05-13): audit / replay investigation efficiency ONLY.
-- NOT primary idempotency — duplicate protection remains STEP C on
--   stripe_processed_events (partial UNIQUE on stripe_event_id).
-- Add-only, idempotent DDL — no row updates.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS m55_idx_reply_wallet_ledgers_stripe_event_id_lookup
  ON public.reply_wallet_ledgers (stripe_event_id);

-- -----------------------------------------------------------------------------
-- STEP C — Idempotency: unique index on stripe_event_id (non-empty values only)
-- REVIEW_REQUIRED: partial unique allows multiple NULL stripe_event_id rows.
-- RPC always inserts trimmed non-empty stripe_event_id for reply lane.
-- If an older duplicate cohort exists, fix data BEFORE running this statement.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS m55_uidx_stripe_processed_events_stripe_event_id
  ON public.stripe_processed_events (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL
    AND length(btrim(stripe_event_id)) > 0;

-- -----------------------------------------------------------------------------
-- STEP D — RPC: public.m55_reply_ticket_fulfill_checkout_event
-- Source of body: scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql
-- (verbatim function definition; SECURITY DEFINER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.m55_reply_ticket_fulfill_checkout_event (
  p_stripe_event_id text,
  p_checkout_session_id text,
  p_payment_intent_id text DEFAULT NULL,
  p_product_key text DEFAULT NULL::text,
  p_report_instance_id uuid DEFAULT NULL::uuid,
  p_wallet_scope_user_id text DEFAULT NULL::text,
  p_user_ref_hash text DEFAULT NULL,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sku CONSTANT text := 'additional_reply_ticket';
  v_own boolean;

  r_wallet reply_ticket_wallets%ROWTYPE;
  v_ledger_id uuid;

  v_new_purchased int;
  v_new_avail int;

  v_dup_wallet_id uuid;
  v_dup_ledger_id uuid;
BEGIN
  IF p_stripe_event_id IS NULL OR length(btrim(p_stripe_event_id)) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'missing_stripe_event_id'
    );
  END IF;

  IF p_checkout_session_id IS NULL OR length(btrim(p_checkout_session_id)) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'missing_checkout_session_id'
    );
  END IF;

  IF p_quantity IS DISTINCT FROM 1 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'quantity_must_be_one'
    );
  END IF;

  IF p_product_key IS NULL OR length(btrim(p_product_key)) = 0
     OR lower(btrim(p_product_key)) <> lower(v_sku) THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'product_key_mismatch'
    );
  END IF;

  IF p_report_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'missing_report_instance_id'
    );
  END IF;

  IF p_wallet_scope_user_id IS NULL OR length(btrim(p_wallet_scope_user_id)) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'missing_wallet_scope_user_id'
    );
  END IF;

  BEGIN
    INSERT INTO public.stripe_processed_events (
      stripe_event_id,
      checkout_session_id,
      payment_intent_id,
      product_key,
      report_instance_id,
      user_ref_hash,
      status,
      processed_at,
      updated_at
    )
    VALUES (
      btrim(p_stripe_event_id),
      btrim(p_checkout_session_id),
      NULLIF(btrim(COALESCE(p_payment_intent_id, '')), ''),
      v_sku,
      p_report_instance_id,
      CASE
        WHEN p_user_ref_hash IS NULL THEN NULL
        WHEN length(btrim(p_user_ref_hash)) = 0 THEN NULL
        ELSE btrim(p_user_ref_hash)
      END,
      'received',
      NULL,
      now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      SELECT l.wallet_id, l.id
      INTO v_dup_wallet_id, v_dup_ledger_id
      FROM public.reply_wallet_ledgers l
      WHERE l.stripe_event_id = btrim(p_stripe_event_id)
      ORDER BY l.id DESC
      LIMIT 1;

      IF v_dup_wallet_id IS NOT NULL AND v_dup_ledger_id IS NOT NULL THEN
        RETURN jsonb_build_object(
          'status', 'duplicate_noop',
          'wallet_id', v_dup_wallet_id,
          'ledger_id', v_dup_ledger_id,
          'available_count', NULL,
          'purchased_count', NULL,
          'reason', NULL
        );
      END IF;

      RETURN jsonb_build_object(
        'status', 'duplicate_noop',
        'wallet_id', NULL,
        'ledger_id', NULL,
        'available_count', NULL,
        'purchased_count', NULL,
        'reason', 'duplicate_without_ledger_grant'
      );
  END;

  SELECT EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots s
    WHERE s.id = p_report_instance_id
      AND s.user_id = btrim(p_wallet_scope_user_id)
  )
  INTO v_own;

  IF NOT COALESCE(v_own, FALSE) THEN
    UPDATE public.stripe_processed_events e
    SET status = 'rejected_not_owner',
        updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'rejected_not_owner',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'snapshot_ownership_failed'
    );
  END IF;

  SELECT *
  INTO r_wallet
  FROM public.reply_ticket_wallets w
  WHERE w.user_id = btrim(p_wallet_scope_user_id)
    AND w.report_instance_id = p_report_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.stripe_processed_events e
    SET status = 'rejected_not_owner',
        updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'rejected_not_owner',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'wallet_not_found_for_report'
    );
  END IF;

  IF r_wallet.status IS DISTINCT FROM 'active' THEN
    UPDATE public.stripe_processed_events e
    SET status = 'rejected_wallet_inactive',
        updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'rejected_wallet_inactive',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'wallet_not_active'
    );
  END IF;

  IF (r_wallet.initial_included_count + r_wallet.purchased_count >= 5)
     OR (r_wallet.purchased_count >= 4) THEN

    UPDATE public.stripe_processed_events e
    SET status = 'skipped_cap',
        updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'skipped_cap',
      'wallet_id', NULL,
      'ledger_id', NULL,
      'available_count', NULL,
      'purchased_count', NULL,
      'reason', 'cap_reached'
    );
  END IF;

  v_new_purchased := r_wallet.purchased_count + 1;
  v_new_avail := r_wallet.available_count + 1;

  UPDATE public.reply_ticket_wallets w
  SET
    purchased_count = v_new_purchased,
    available_count = v_new_avail,
    updated_at = now()
  WHERE w.id = r_wallet.id;

  INSERT INTO public.reply_wallet_ledgers (
    user_id,
    wallet_id,
    reply_session_id,
    report_instance_id,
    delta,
    balance_after,
    event_type,
    source_of_grant,
    stripe_event_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    product_key
  )
  VALUES (
    btrim(p_wallet_scope_user_id),
    r_wallet.id,
    NULL,
    p_report_instance_id,
    1,
    v_new_avail,
    'purchase_grant',
    'PURCHASE',
    btrim(p_stripe_event_id),
    btrim(p_checkout_session_id),
    NULLIF(btrim(COALESCE(p_payment_intent_id, '')), ''),
    v_sku
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.stripe_processed_events e
  SET
    status = 'processed',
    processed_at = now(),
    updated_at = now()
  WHERE e.stripe_event_id = btrim(p_stripe_event_id);

  RETURN jsonb_build_object(
    'status', 'processed',
    'wallet_id', r_wallet.id,
    'ledger_id', v_ledger_id,
    'available_count', v_new_avail,
    'purchased_count', v_new_purchased,
    'reason', NULL
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP E — service_role EXECUTE (and lock down PUBLIC if policy requires)
-- REVIEW_REQUIRED: align with org-wide SECURITY DEFINER policy (some projects
--   omit REVOKE FROM PUBLIC — confirm with DBA before run).
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.m55_reply_ticket_fulfill_checkout_event(
  text, text, text, text, uuid, text, text, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.m55_reply_ticket_fulfill_checkout_event(
  text, text, text, text, uuid, text, text, integer
) TO service_role;

-- -----------------------------------------------------------------------------
-- STEP F — PostgREST schema cache reload (Supabase)
-- Same pattern as supabase/migrations/20260421000000_dtr_postgrest_schema_reload.sql
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- END OF FILE (candidate — review only)
