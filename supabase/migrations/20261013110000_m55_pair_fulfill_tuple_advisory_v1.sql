-- Pair P5 UX-B H1: F12 atomic fulfill + F13 tuple advisory serialization (fulfill path only).
-- Forward-only successor to frozen 20261009 + 20261010. Does not modify reserve RPCs.

CREATE OR REPLACE FUNCTION public.m55_fulfill_compatibility_report_v1(
  p_purchase_context_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_context public.compatibility_purchase_contexts%ROWTYPE;
  v_probe_id uuid;
  v_probe_owner text;
  v_probe_pair uuid;
  v_probe_paid uuid;
  v_owner text;
  v_report_id uuid;
  v_link_report_id uuid;
  v_is_pair boolean;
BEGIN
  IF p_purchase_context_id IS NULL
    OR p_checkout_session_id IS NULL
    OR btrim(p_checkout_session_id) = ''
    OR p_checkout_session_id IS DISTINCT FROM btrim(p_checkout_session_id)
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  SELECT
    id,
    owner_user_id,
    pair_identity_id,
    paid_context_id
  INTO
    v_probe_id,
    v_probe_owner,
    v_probe_pair,
    v_probe_paid
  FROM public.compatibility_purchase_contexts
  WHERE id = p_purchase_context_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'context_not_found');
  END IF;

  IF (v_probe_pair IS NULL) <> (v_probe_paid IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'malformed_identity_tuple');
  END IF;

  v_is_pair := v_probe_pair IS NOT NULL;
  v_owner := btrim(v_probe_owner);

  IF v_probe_owner IS DISTINCT FROM v_owner OR v_owner = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'noncanonical_owner');
  END IF;

  IF v_is_pair THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(
        'm55_compat_ck:' || v_owner || ':' || v_probe_pair::text || ':' || v_probe_paid::text,
        0
      )
    );
  END IF;

  SELECT *
  INTO v_context
  FROM public.compatibility_purchase_contexts
  WHERE id = p_purchase_context_id
    AND product_key = 'compatibility_report_full_v1'
    AND snapshot_version = 'paid_compatibility_report_v1'
    AND stripe_checkout_session_id = p_checkout_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'context_not_found');
  END IF;

  IF v_is_pair THEN
    IF v_context.owner_user_id IS DISTINCT FROM v_probe_owner
      OR v_context.pair_identity_id IS DISTINCT FROM v_probe_pair
      OR v_context.paid_context_id IS DISTINCT FROM v_probe_paid THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'tuple_mismatch_after_lock');
    END IF;
  ELSE
    IF v_context.pair_identity_id IS NOT NULL OR v_context.paid_context_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'malformed_identity_tuple');
    END IF;
  END IF;

  SELECT id
  INTO v_report_id
  FROM public.compatibility_owned_reports
  WHERE purchase_context_id = v_context.id;

  IF v_context.status = 'fulfilled' THEN
    IF v_report_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_fulfilled_state');
    END IF;
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  IF v_context.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'context_not_pending');
  END IF;

  IF v_is_pair THEN
    SELECT report_id
    INTO v_link_report_id
    FROM public.compatibility_owned_report_identity_links
    WHERE owner_user_id = v_owner
      AND pair_identity_id = v_context.pair_identity_id
      AND paid_context_id = v_context.paid_context_id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'identity_already_owned');
    END IF;
  END IF;

  INSERT INTO public.compatibility_owned_reports (
    owner_user_id,
    purchase_context_id,
    product_key,
    snapshot_version,
    snapshot
  )
  VALUES (
    v_context.owner_user_id,
    v_context.id,
    v_context.product_key,
    v_context.snapshot_version,
    v_context.pending_snapshot
  )
  ON CONFLICT (purchase_context_id) DO NOTHING
  RETURNING id INTO v_report_id;

  IF v_report_id IS NULL THEN
    SELECT id
    INTO v_report_id
    FROM public.compatibility_owned_reports
    WHERE purchase_context_id = v_context.id
      AND owner_user_id = v_context.owner_user_id;
  END IF;

  IF v_report_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'report_insert_failed');
  END IF;

  IF v_is_pair THEN
    INSERT INTO public.compatibility_owned_report_identity_links (
      report_id,
      owner_user_id,
      pair_identity_id,
      paid_context_id,
      identity_version,
      source
    )
    VALUES (
      v_report_id,
      v_context.owner_user_id,
      v_context.pair_identity_id,
      v_context.paid_context_id,
      'pair_owned_state_identity_v1',
      'purchase_context_v1'
    )
    ON CONFLICT (report_id) DO NOTHING;
  END IF;

  UPDATE public.compatibility_purchase_contexts
  SET
    status = 'fulfilled',
    stripe_payment_intent_id = NULLIF(btrim(p_payment_intent_id), ''),
    fulfilled_at = now(),
    updated_at = now()
  WHERE id = v_context.id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'm55_fulfill_cas_failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  TO service_role;
