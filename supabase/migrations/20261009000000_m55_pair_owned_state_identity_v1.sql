-- Pair P5 UX-B: opaque owned-state identity links (additive; apply is Human-gated).

ALTER TABLE public.compatibility_purchase_contexts
  ADD COLUMN IF NOT EXISTS pair_identity_id uuid NULL,
  ADD COLUMN IF NOT EXISTS paid_context_id uuid NULL;

ALTER TABLE public.compatibility_purchase_contexts
  DROP CONSTRAINT IF EXISTS compatibility_purchase_contexts_identity_pair_check;

ALTER TABLE public.compatibility_purchase_contexts
  ADD CONSTRAINT compatibility_purchase_contexts_identity_pair_check
  CHECK (
    (pair_identity_id IS NULL AND paid_context_id IS NULL)
    OR
    (pair_identity_id IS NOT NULL AND paid_context_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.m55_compatibility_snapshot_columns_immutable_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
    OR NEW.product_key IS DISTINCT FROM OLD.product_key
    OR NEW.snapshot_version IS DISTINCT FROM OLD.snapshot_version
    OR NEW.pending_snapshot IS DISTINCT FROM OLD.pending_snapshot
    OR NEW.pair_identity_id IS DISTINCT FROM OLD.pair_identity_id
    OR NEW.paid_context_id IS DISTINCT FROM OLD.paid_context_id
  THEN
    RAISE EXCEPTION 'compatibility purchase snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.compatibility_owned_reports
  DROP CONSTRAINT IF EXISTS compatibility_owned_reports_id_owner_unique;

ALTER TABLE public.compatibility_owned_reports
  ADD CONSTRAINT compatibility_owned_reports_id_owner_unique
  UNIQUE (id, owner_user_id);

CREATE TABLE IF NOT EXISTS public.compatibility_owned_report_identity_links (
  report_id uuid PRIMARY KEY,
  owner_user_id text NOT NULL CHECK (length(btrim(owner_user_id)) > 0),
  pair_identity_id uuid NOT NULL,
  paid_context_id uuid NULL,
  identity_version text NOT NULL
    CHECK (identity_version = 'pair_owned_state_identity_v1'),
  source text NOT NULL
    CHECK (source IN ('purchase_context_v1', 'legacy_user_bound_v1')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compatibility_owned_report_identity_links_report_owner_fk
    FOREIGN KEY (report_id, owner_user_id)
    REFERENCES public.compatibility_owned_reports(id, owner_user_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS compatibility_owned_report_identity_exact_ctx_idx
  ON public.compatibility_owned_report_identity_links(owner_user_id, pair_identity_id, paid_context_id)
  WHERE paid_context_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.m55_compatibility_owned_report_identity_immutable_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'compatibility owned report identity link is immutable';
END;
$$;

DROP TRIGGER IF EXISTS compatibility_owned_report_identity_immutable
  ON public.compatibility_owned_report_identity_links;

CREATE TRIGGER compatibility_owned_report_identity_immutable
BEFORE UPDATE ON public.compatibility_owned_report_identity_links
FOR EACH ROW
EXECUTE FUNCTION public.m55_compatibility_owned_report_identity_immutable_v1();

ALTER TABLE public.compatibility_owned_report_identity_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.compatibility_owned_report_identity_links
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.compatibility_owned_report_identity_links TO service_role;

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
  v_report_id uuid;
BEGIN
  IF p_purchase_context_id IS NULL
    OR p_checkout_session_id IS NULL
    OR btrim(p_checkout_session_id) = ''
    OR p_checkout_session_id IS DISTINCT FROM btrim(p_checkout_session_id)
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
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

  IF v_context.pair_identity_id IS NOT NULL AND v_context.paid_context_id IS NOT NULL THEN
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
    RETURN jsonb_build_object('ok', false, 'reason', 'context_update_failed');
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  TO service_role;

COMMENT ON TABLE public.compatibility_owned_report_identity_links IS
  'Owner-bound opaque Pair continuity identity for exact owned-state matching; service_role only.';
