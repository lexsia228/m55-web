-- ============================================================================
-- STAGING / SHADOW CANDIDATE — DO NOT RUN IN PRODUCTION WITHOUT FINAL GATE
-- DO NOT APPLY TO staging/production until: static audit, RPC spec sign-off,
-- preflight on target DB, and apply gate satisfied.
--
-- Path: scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql
--
-- Scope: CREATE OR REPLACE FUNCTION public.m55_reply_ticket_fulfill_checkout_event
-- Forbidden in this draft: DROP, ALTER TABLE existing objects, FK/CHECK/UNIQUE/NOT NULL
-- additions, secrets, payload bodies, edits to other functions (incl.
-- public.m55_reply_generate_commit).
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_FUNCTION_SPEC_v1.md
-- Companion: docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_MIGRATION_CANDIDATE_DRAFT_v1.md
--
-- NOTE: Ledger INSERT references public.reply_wallet_ledgers.report_instance_id.
-- If your DB does not have that column yet, add it in a PRIOR additive migration —
-- validate with preflight BEFORE applying this RPC.
-- ============================================================================

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
  -- ── 1–4: argument guards (no processed_events persistence) ───────────────
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

  -- ── 5–6: idempotency row (partial UNIQUE on stripe_event_id) ─────────────-
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
      -- Replay / concurrent insert on stripe_processed_events: surface existing grant if ledger row exists.
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

  -- ── Ownership ─────────────────────────────────────────────────────────────
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

  -- ── Wallet row FOR UPDATE ──────────────────────────────────────────────────
  SELECT *
  INTO r_wallet
  FROM public.reply_ticket_wallets w
  WHERE w.user_id = btrim(p_wallet_scope_user_id)
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
      'reason', 'wallet_not_found'
    );
  END IF;

  -- ── Wallet active ─────────────────────────────────────────────────────────
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

  -- ── Cap ───────────────────────────────────────────────────────────────────
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

  -- ── Success path: wallet + ledger + processed (single transaction) ───────-
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

-- ----------------------------------------------------------------------------
-- REVOKE / EXECUTE policy (implement in finalized migration PR; left commented)
--
-- REVOKE ALL ON FUNCTION public.m55_reply_ticket_fulfill_checkout_event(
--   text, text, text, text, uuid, text, text, integer
-- ) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.m55_reply_ticket_fulfill_checkout_event(
--   text, text, text, text, uuid, text, text, integer
-- ) TO service_role;
-- ----------------------------------------------------------------------------


-- END OF FILE
