-- M55 — Reply-ticket fulfillment RPC v2 (Light→Full upgrade lane)
-- Promotes: scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_v2_pricing_architecture_candidate.sql
-- Replaces Production RPC that only accepted additional_reply_ticket.
-- Rollback: re-apply predecessor from m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql
--           (Human-only; not automated here).

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
  v_legacy_sku CONSTANT text := 'additional_reply_ticket';
  v_upgrade_sku CONSTANT text := 'dtr_core_light_to_full_upgrade_v1';
  v_product_key text;
  v_is_legacy boolean;
  v_is_upgrade boolean;
  v_own boolean;

  r_wallet reply_ticket_wallets%ROWTYPE;
  v_ledger_id uuid;

  v_new_purchased int;
  v_new_avail int;
  v_purchased_delta int;
  v_ledger_delta int;
  v_full_max_purchased CONSTANT int := 4;
  v_total_cap CONSTANT int := 5;

  v_dup_wallet_id uuid;
  v_dup_ledger_id uuid;
BEGIN
  IF p_stripe_event_id IS NULL OR length(btrim(p_stripe_event_id)) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'missing_stripe_event_id'
    );
  END IF;

  IF p_checkout_session_id IS NULL OR length(btrim(p_checkout_session_id)) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'missing_checkout_session_id'
    );
  END IF;

  IF p_quantity IS DISTINCT FROM 1 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'quantity_must_be_one'
    );
  END IF;

  v_product_key := lower(btrim(COALESCE(p_product_key, '')));
  v_is_legacy := (v_product_key = lower(v_legacy_sku));
  v_is_upgrade := (v_product_key = lower(v_upgrade_sku));

  IF NOT (v_is_legacy OR v_is_upgrade) THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'product_key_mismatch'
    );
  END IF;

  IF p_report_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'missing_report_instance_id'
    );
  END IF;

  IF p_wallet_scope_user_id IS NULL OR length(btrim(p_wallet_scope_user_id)) = 0 THEN
    RETURN jsonb_build_object(
      'status', 'rejected_invalid_product',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
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
      btrim(p_product_key),
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
    SET status = 'rejected_not_owner', updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'rejected_not_owner',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
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
    SET status = 'rejected_not_owner', updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'rejected_not_owner',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'wallet_not_found_for_report'
    );
  END IF;

  IF r_wallet.status IS DISTINCT FROM 'active' THEN
    UPDATE public.stripe_processed_events e
    SET status = 'rejected_wallet_inactive', updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'rejected_wallet_inactive',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'wallet_not_active'
    );
  END IF;

  IF (r_wallet.initial_included_count + r_wallet.purchased_count >= v_total_cap)
     OR (r_wallet.purchased_count >= v_full_max_purchased) THEN
    UPDATE public.stripe_processed_events e
    SET status = 'skipped_cap', updated_at = now()
    WHERE e.stripe_event_id = btrim(p_stripe_event_id);

    RETURN jsonb_build_object(
      'status', 'skipped_cap',
      'wallet_id', NULL, 'ledger_id', NULL,
      'available_count', NULL, 'purchased_count', NULL,
      'reason', 'cap_reached'
    );
  END IF;

  IF v_is_legacy THEN
    v_new_purchased := r_wallet.purchased_count + 1;
    v_new_avail := r_wallet.available_count + 1;
    v_ledger_delta := 1;

    UPDATE public.reply_ticket_wallets w
    SET
      purchased_count = v_new_purchased,
      available_count = v_new_avail,
      updated_at = now()
    WHERE w.id = r_wallet.id;

    INSERT INTO public.reply_wallet_ledgers (
      user_id, wallet_id, reply_session_id, report_instance_id,
      delta, balance_after, event_type, source_of_grant,
      stripe_event_id, stripe_checkout_session_id, stripe_payment_intent_id, product_key
    )
    VALUES (
      btrim(p_wallet_scope_user_id),
      r_wallet.id,
      NULL,
      p_report_instance_id,
      v_ledger_delta,
      v_new_avail,
      'purchase_grant',
      'PURCHASE',
      btrim(p_stripe_event_id),
      btrim(p_checkout_session_id),
      NULLIF(btrim(COALESCE(p_payment_intent_id, '')), ''),
      btrim(p_product_key)
    )
    RETURNING id INTO v_ledger_id;

  ELSIF v_is_upgrade THEN
    v_purchased_delta := GREATEST(0, v_full_max_purchased - r_wallet.purchased_count);

    IF v_purchased_delta = 0 THEN
      UPDATE public.stripe_processed_events e
      SET status = 'skipped_cap', updated_at = now()
      WHERE e.stripe_event_id = btrim(p_stripe_event_id);

      RETURN jsonb_build_object(
        'status', 'skipped_cap',
        'wallet_id', NULL, 'ledger_id', NULL,
        'available_count', NULL, 'purchased_count', NULL,
        'reason', 'upgrade_no_delta'
      );
    END IF;

    v_new_purchased := r_wallet.purchased_count + v_purchased_delta;
    v_new_avail := LEAST(
      v_total_cap,
      r_wallet.initial_included_count + v_new_purchased - r_wallet.consumed_count
    );
    v_ledger_delta := GREATEST(0, v_new_avail - r_wallet.available_count);

    UPDATE public.reply_ticket_wallets w
    SET
      purchased_count = v_new_purchased,
      available_count = v_new_avail,
      updated_at = now()
    WHERE w.id = r_wallet.id;

    INSERT INTO public.reply_wallet_ledgers (
      user_id, wallet_id, reply_session_id, report_instance_id,
      delta, balance_after, event_type, source_of_grant,
      stripe_event_id, stripe_checkout_session_id, stripe_payment_intent_id, product_key
    )
    VALUES (
      btrim(p_wallet_scope_user_id),
      r_wallet.id,
      NULL,
      p_report_instance_id,
      v_ledger_delta,
      v_new_avail,
      'purchase_grant',
      'PURCHASE',
      btrim(p_stripe_event_id),
      btrim(p_checkout_session_id),
      NULLIF(btrim(COALESCE(p_payment_intent_id, '')), ''),
      btrim(p_product_key)
    )
    RETURNING id INTO v_ledger_id;
  END IF;

  UPDATE public.stripe_processed_events e
  SET status = 'processed', processed_at = now(), updated_at = now()
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

REVOKE ALL ON FUNCTION public.m55_reply_ticket_fulfill_checkout_event(
  text, text, text, text, uuid, text, text, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.m55_reply_ticket_fulfill_checkout_event(
  text, text, text, text, uuid, text, text, integer
) TO service_role;

NOTIFY pgrst, 'reload schema';
