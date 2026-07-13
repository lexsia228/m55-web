-- M55 compatibility one-time purchase and owned report delivery v1.
-- Artifact only: apply is a separate Human-controlled gate.

CREATE TABLE public.compatibility_purchase_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL CHECK (length(btrim(owner_user_id)) > 0),
  product_key text NOT NULL
    CHECK (product_key = 'compatibility_report_full_v1'),
  snapshot_version text NOT NULL
    CHECK (snapshot_version = 'paid_compatibility_report_v1'),
  pending_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fulfilled')),
  stripe_checkout_session_id text NULL UNIQUE,
  stripe_payment_intent_id text NULL,
  stripe_session_expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz NULL,
  UNIQUE (id, owner_user_id),
  CHECK (
    (status = 'pending' AND fulfilled_at IS NULL)
    OR
    (status = 'fulfilled' AND fulfilled_at IS NOT NULL)
  )
);

CREATE INDEX compatibility_purchase_contexts_owner_created_idx
  ON public.compatibility_purchase_contexts(owner_user_id, created_at DESC);
CREATE INDEX compatibility_purchase_contexts_pending_idx
  ON public.compatibility_purchase_contexts(created_at)
  WHERE status = 'pending';

CREATE TABLE public.compatibility_owned_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL CHECK (length(btrim(owner_user_id)) > 0),
  purchase_context_id uuid NOT NULL UNIQUE,
  product_key text NOT NULL
    CHECK (product_key = 'compatibility_report_full_v1'),
  snapshot_version text NOT NULL
    CHECK (snapshot_version = 'paid_compatibility_report_v1'),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compatibility_owned_reports_context_owner_fk
    FOREIGN KEY (purchase_context_id, owner_user_id)
    REFERENCES public.compatibility_purchase_contexts(id, owner_user_id)
    ON DELETE CASCADE
);

CREATE INDEX compatibility_owned_reports_owner_created_idx
  ON public.compatibility_owned_reports(owner_user_id, created_at DESC);

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
  THEN
    RAISE EXCEPTION 'compatibility purchase snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER compatibility_purchase_context_snapshot_immutable
BEFORE UPDATE ON public.compatibility_purchase_contexts
FOR EACH ROW
EXECUTE FUNCTION public.m55_compatibility_snapshot_columns_immutable_v1();

CREATE OR REPLACE FUNCTION public.m55_compatibility_owned_report_immutable_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'owned compatibility report is immutable';
END;
$$;

CREATE TRIGGER compatibility_owned_report_immutable
BEFORE UPDATE ON public.compatibility_owned_reports
FOR EACH ROW
EXECUTE FUNCTION public.m55_compatibility_owned_report_immutable_v1();

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

CREATE OR REPLACE FUNCTION public.m55_compatibility_account_delete_v1(
  p_clerk_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id text;
  v_count integer;
BEGIN
  v_user_id := btrim(p_clerk_user_id);
  IF p_clerk_user_id IS NULL
    OR v_user_id = ''
    OR length(v_user_id) > 128
    OR p_clerk_user_id IS DISTINCT FROM v_user_id
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('m55_compat_acct_del:' || v_user_id, 0)
  );

  DELETE FROM public.compatibility_purchase_contexts
  WHERE owner_user_id = v_user_id;

  SELECT COUNT(*)::integer
  INTO v_count
  FROM public.compatibility_purchase_contexts
  WHERE owner_user_id = v_user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'compatibility purchase context deletion failed';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_count
  FROM public.compatibility_owned_reports
  WHERE owner_user_id = v_user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'compatibility owned report deletion failed';
  END IF;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cleanup_failed');
END;
$$;

ALTER FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  RENAME TO m55_account_deletion_process_base_v1;

CREATE FUNCTION public.m55_account_deletion_process_v1(
  p_svix_id text,
  p_event_type text,
  p_clerk_user_id text,
  p_user_ref_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base_result jsonb;
  v_compatibility_result jsonb;
BEGIN
  v_base_result := public.m55_account_deletion_process_base_v1(
    p_svix_id,
    p_event_type,
    p_clerk_user_id,
    p_user_ref_hash
  );

  IF COALESCE((v_base_result ->> 'ok')::boolean, false) IS NOT TRUE
    OR v_base_result ->> 'status' IS DISTINCT FROM 'succeeded'
  THEN
    RETURN v_base_result;
  END IF;

  v_compatibility_result :=
    public.m55_compatibility_account_delete_v1(p_clerk_user_id);
  IF COALESCE((v_compatibility_result ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'compatibility account cleanup failed';
  END IF;

  RETURN v_base_result;
END;
$$;

ALTER TABLE public.compatibility_purchase_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_owned_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.compatibility_purchase_contexts
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.compatibility_owned_reports
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.compatibility_purchase_contexts TO service_role;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.compatibility_owned_reports TO service_role;

REVOKE ALL ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_compatibility_account_delete_v1(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.m55_account_deletion_process_base_v1(text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  TO service_role;

COMMENT ON TABLE public.compatibility_purchase_contexts IS
  'Owner-bound pending immutable compatibility report snapshot for one Stripe Checkout.';
COMMENT ON TABLE public.compatibility_owned_reports IS
  'Owner-only immutable six-chapter compatibility report delivered after paid webhook validation.';
