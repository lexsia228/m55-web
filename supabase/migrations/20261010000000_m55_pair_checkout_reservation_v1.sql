-- Pair P5 UX-B: checkout reservation / at-most-one first Stripe create (additive).
-- Depends on: 20260713000000_compatibility_purchase_delivery_v1.sql, 20261009000000_m55_pair_owned_state_identity_v1.sql
-- APPLY: Human-gated separately. NOT_EXECUTION_READY (sixth CHECK deparse unverified on real PG,
--   disposable-PG P2–P7 proof, remote Supabase runner txn/history UNKNOWN, provider H2, runtime H4).
-- PATCH-4: txn sentinel + lock_timeout + table locks before guard; RPC collision guard. Requires
--   external single-transaction executor (see Downloads runner contract); no BEGIN/COMMIT here.
-- Production F1 (2026-10-10): observed CHECK names compatibility_purchase_contexts_status_check and
--   compatibility_purchase_contexts_check; owner/product/snapshot CHECKs intentionally unchanged below.
-- PATCH-2 (2026-10-11): five CHECK strings from frozen Preview BLOCK 2 / Production F1 (pre-20261009).
-- PATCH-3 (2026-10-11): require SIX CHECKs after 20261009 predecessor; Preview five-check snapshot remains valid pre-predecessor.
-- Sixth CHECK deparsed string below is PROVISIONAL_UNVERIFIED_UNTIL_DISPOSABLE_PG (source in 20261009 migration only).
-- Forward-only pre-expansion guard; not idempotent repair. Five CHECKs => predecessor not applied => STOP.
-- PATCH-4 (2026-10-11): 5s lock_timeout; lock contexts then links; txn sentinel tripwire (not remote proof).

SET LOCAL m55.pair_h1_patch4.single_transaction = '1';

SET LOCAL lock_timeout = '5s';

LOCK TABLE public.compatibility_purchase_contexts IN ACCESS EXCLUSIVE MODE;

LOCK TABLE public.compatibility_owned_report_identity_links IN ACCESS EXCLUSIVE MODE;

DO $m55_patch4_preapply_guard$
DECLARE
  v_rel oid;
  v_links_rel oid;
  v_relkind "char";
  v_check_count integer;
  v_bad_name text;
  v_identity_check_def text;
  v_rpc_proname text;
BEGIN
  IF current_setting('m55.pair_h1_patch4.single_transaction', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'PRECONDITION_TXN_SENTINEL: requires single-transaction executor with prior SET LOCAL';
  END IF;

  v_rel := to_regclass('public.compatibility_purchase_contexts');
  IF v_rel IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: missing relation public.compatibility_purchase_contexts';
  END IF;

  SELECT c.relkind
  INTO v_relkind
  FROM pg_class AS c
  WHERE c.oid = v_rel;

  IF v_relkind IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: compatibility_purchase_contexts is not an ordinary table';
  END IF;

  v_links_rel := to_regclass('public.compatibility_owned_report_identity_links');
  IF v_links_rel IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: missing relation public.compatibility_owned_report_identity_links';
  END IF;

  IF (
    SELECT c.relkind
    FROM pg_class AS c
    WHERE c.oid = v_links_rel
  ) IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: compatibility_owned_report_identity_links is not an ordinary table';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute AS a
    JOIN pg_type AS t ON t.oid = a.atttypid
    WHERE a.attrelid = v_rel
      AND a.attname = 'pair_identity_id'
      AND NOT a.attisdropped
      AND t.typname = 'uuid'
      AND NOT a.attnotnull
      AND a.attgenerated = ''
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: pair_identity_id column missing or invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute AS a
    JOIN pg_type AS t ON t.oid = a.atttypid
    WHERE a.attrelid = v_rel
      AND a.attname = 'paid_context_id'
      AND NOT a.attnotnull
      AND NOT a.attisdropped
      AND t.typname = 'uuid'
      AND a.attgenerated = ''
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: paid_context_id column missing or invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_attribute AS a
    WHERE a.attrelid = v_rel
      AND NOT a.attisdropped
      AND a.attname IN (
        'checkout_origin_frozen',
        'stripe_create_first_attempt_at',
        'stripe_create_lease_token',
        'stripe_create_lease_until'
      )
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: reservation column already present';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class AS i
    JOIN pg_namespace AS n ON n.oid = i.relnamespace
    WHERE n.nspname = 'public'
      AND i.relname = 'compatibility_purchase_contexts_pending_tuple_uidx'
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: compatibility_purchase_contexts_pending_tuple_uidx already exists in public';
  END IF;

  SELECT count(*)::integer
  INTO v_check_count
  FROM pg_constraint AS c
  WHERE c.conrelid = v_rel
    AND c.contype = 'c';

  IF v_check_count <> 6 THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: expected exactly 6 CHECK constraints, found %', v_check_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.contype = 'c'
      AND NOT c.convalidated
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: unvalidated CHECK constraint present';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.contype = 'c'
      AND c.conname NOT IN (
        'compatibility_purchase_contexts_check',
        'compatibility_purchase_contexts_identity_pair_check',
        'compatibility_purchase_contexts_owner_user_id_check',
        'compatibility_purchase_contexts_product_key_check',
        'compatibility_purchase_contexts_snapshot_version_check',
        'compatibility_purchase_contexts_status_check'
      )
  ) THEN
    SELECT c.conname
    INTO v_bad_name
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.contype = 'c'
      AND c.conname NOT IN (
        'compatibility_purchase_contexts_check',
        'compatibility_purchase_contexts_identity_pair_check',
        'compatibility_purchase_contexts_owner_user_id_check',
        'compatibility_purchase_contexts_product_key_check',
        'compatibility_purchase_contexts_snapshot_version_check',
        'compatibility_purchase_contexts_status_check'
      )
    LIMIT 1;
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: unexpected CHECK name %', v_bad_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.conname = 'compatibility_purchase_contexts_check'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) = 'CHECK ((((status = ''pending''::text) AND (fulfilled_at IS NULL)) OR ((status = ''fulfilled''::text) AND (fulfilled_at IS NOT NULL))))'
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: definition mismatch compatibility_purchase_contexts_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.conname = 'compatibility_purchase_contexts_owner_user_id_check'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) = 'CHECK ((length(btrim(owner_user_id)) > 0))'
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: definition mismatch compatibility_purchase_contexts_owner_user_id_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.conname = 'compatibility_purchase_contexts_product_key_check'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) = 'CHECK ((product_key = ''compatibility_report_full_v1''::text))'
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: definition mismatch compatibility_purchase_contexts_product_key_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.conname = 'compatibility_purchase_contexts_snapshot_version_check'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) = 'CHECK ((snapshot_version = ''paid_compatibility_report_v1''::text))'
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: definition mismatch compatibility_purchase_contexts_snapshot_version_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.conname = 'compatibility_purchase_contexts_status_check'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) = 'CHECK ((status = ANY (ARRAY[''pending''::text, ''fulfilled''::text])))'
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: definition mismatch compatibility_purchase_contexts_status_check';
  END IF;

  v_identity_check_def := 'CHECK ((((pair_identity_id IS NULL) AND (paid_context_id IS NULL)) OR ((pair_identity_id IS NOT NULL) AND (paid_context_id IS NOT NULL))))';

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = v_rel
      AND c.conname = 'compatibility_purchase_contexts_identity_pair_check'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) = v_identity_check_def
  ) THEN
    RAISE EXCEPTION 'PRECONDITION_CHECK_CONTRACT_DRIFT: definition mismatch compatibility_purchase_contexts_identity_pair_check';
  END IF;

  SELECT p.proname
  INTO v_rpc_proname
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'm55_reserve_compatibility_checkout_v1',
      'm55_classify_pending_checkout_context_v1',
      'm55_acquire_compatibility_checkout_create_slot_v1',
      'm55_cas_attach_compatibility_checkout_session_v1',
      'm55_cas_release_compatibility_checkout_expired_v1'
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'PRECONDITION_RPC_COLLISION: existing public function %', v_rpc_proname;
  END IF;
END
$m55_patch4_preapply_guard$;

ALTER TABLE public.compatibility_purchase_contexts
  ADD COLUMN checkout_origin_frozen text NULL,
  ADD COLUMN stripe_create_first_attempt_at timestamptz NULL,
  ADD COLUMN stripe_create_lease_token uuid NULL,
  ADD COLUMN stripe_create_lease_until timestamptz NULL;

-- Extend only the two status-domain CHECKs (F1 names). Legacy pending/fulfilled pairing preserved.
ALTER TABLE public.compatibility_purchase_contexts
  DROP CONSTRAINT compatibility_purchase_contexts_status_check;

ALTER TABLE public.compatibility_purchase_contexts
  ADD CONSTRAINT compatibility_purchase_contexts_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'fulfilled'::text,
        'expired'::text
      ]
    )
  );

ALTER TABLE public.compatibility_purchase_contexts
  DROP CONSTRAINT compatibility_purchase_contexts_check;

ALTER TABLE public.compatibility_purchase_contexts
  ADD CONSTRAINT compatibility_purchase_contexts_check
  CHECK (
    (
      (status = 'pending'::text)
      AND (fulfilled_at IS NULL)
    )
    OR (
      (status = 'fulfilled'::text)
      AND (fulfilled_at IS NOT NULL)
    )
    OR (
      (status = 'expired'::text)
      AND (fulfilled_at IS NULL)
    )
  );

CREATE UNIQUE INDEX compatibility_purchase_contexts_pending_tuple_uidx
  ON public.compatibility_purchase_contexts (owner_user_id, pair_identity_id, paid_context_id)
  WHERE status = 'pending'
    AND pair_identity_id IS NOT NULL
    AND paid_context_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.m55_reserve_compatibility_checkout_v1(
  p_context_id uuid,
  p_owner_user_id text,
  p_pair_identity_id uuid,
  p_paid_context_id uuid,
  p_pending_snapshot jsonb,
  p_checkout_origin_frozen text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner text;
  v_row public.compatibility_purchase_contexts%ROWTYPE;
  v_report_id uuid;
BEGIN
  v_owner := btrim(p_owner_user_id);
  IF p_context_id IS NULL
    OR v_owner = ''
    OR length(v_owner) > 128
    OR p_pair_identity_id IS NULL
    OR p_paid_context_id IS NULL
    OR p_pending_snapshot IS NULL
    OR p_checkout_origin_frozen IS NULL
    OR btrim(p_checkout_origin_frozen) = ''
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'm55_compat_ck:' || v_owner || ':' || p_pair_identity_id::text || ':' || p_paid_context_id::text,
      0
    )
  );

  SELECT report_id
  INTO v_report_id
  FROM public.compatibility_owned_report_identity_links
  WHERE owner_user_id = v_owner
    AND pair_identity_id = p_pair_identity_id
    AND paid_context_id = p_paid_context_id
  LIMIT 2;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'state', 'already_owned',
      'report_id', v_report_id
    );
  END IF;

  BEGIN
    INSERT INTO public.compatibility_purchase_contexts (
      id,
      owner_user_id,
      product_key,
      snapshot_version,
      pending_snapshot,
      status,
      pair_identity_id,
      paid_context_id,
      checkout_origin_frozen
    )
    VALUES (
      p_context_id,
      v_owner,
      'compatibility_report_full_v1',
      'paid_compatibility_report_v1',
      p_pending_snapshot,
      'pending',
      p_pair_identity_id,
      p_paid_context_id,
      btrim(p_checkout_origin_frozen)
    );
  EXCEPTION
    WHEN unique_violation THEN
      SELECT *
      INTO v_row
      FROM public.compatibility_purchase_contexts
      WHERE owner_user_id = v_owner
        AND pair_identity_id = p_pair_identity_id
        AND paid_context_id = p_paid_context_id
        AND status = 'pending'
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'reservation_conflict');
      END IF;

      RETURN public.m55_classify_pending_checkout_context_v1(v_row);
  END;

  SELECT *
  INTO v_row
  FROM public.compatibility_purchase_contexts
  WHERE id = p_context_id
    AND owner_user_id = v_owner
  FOR UPDATE;

  RETURN public.m55_classify_pending_checkout_context_v1(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.m55_classify_pending_checkout_context_v1(
  p_row public.compatibility_purchase_contexts
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_row.status = 'expired'::text THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'context_expired');
  END IF;

  IF p_row.stripe_checkout_session_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'state', 'checkout_in_progress',
      'context_id', p_row.id
    );
  END IF;

  IF p_row.stripe_create_first_attempt_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'state', 'checkout_unknown',
      'context_id', p_row.id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'state', 'reserved',
    'context_id', p_row.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.m55_acquire_compatibility_checkout_create_slot_v1(
  p_context_id uuid,
  p_owner_user_id text,
  p_lease_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner text;
  v_row public.compatibility_purchase_contexts%ROWTYPE;
BEGIN
  v_owner := btrim(p_owner_user_id);
  IF p_context_id IS NULL
    OR v_owner = ''
    OR p_lease_token IS NULL
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  SELECT *
  INTO v_row
  FROM public.compatibility_purchase_contexts
  WHERE id = p_context_id
    AND owner_user_id = v_owner
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'context_not_found');
  END IF;

  IF v_row.stripe_create_first_attempt_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_attempted');
  END IF;

  IF v_row.stripe_checkout_session_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_attached');
  END IF;

  IF v_row.stripe_create_lease_until IS NOT NULL
    AND v_row.stripe_create_lease_until > now()
    AND v_row.stripe_create_lease_token IS DISTINCT FROM p_lease_token
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'lease_held');
  END IF;

  UPDATE public.compatibility_purchase_contexts
  SET
    stripe_create_lease_token = p_lease_token,
    stripe_create_lease_until = now() + interval '5 minutes',
    stripe_create_first_attempt_at = now(),
    updated_at = now()
  WHERE id = p_context_id
    AND owner_user_id = v_owner
    AND status = 'pending'
    AND stripe_create_first_attempt_at IS NULL
    AND stripe_checkout_session_id IS NULL
    AND (
      stripe_create_lease_until IS NULL
      OR stripe_create_lease_until <= now()
      OR stripe_create_lease_token = p_lease_token
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_unavailable');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.m55_cas_attach_compatibility_checkout_session_v1(
  p_context_id uuid,
  p_owner_user_id text,
  p_checkout_session_id text,
  p_session_expires_at timestamptz,
  p_lease_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner text;
BEGIN
  v_owner := btrim(p_owner_user_id);
  IF p_context_id IS NULL
    OR v_owner = ''
    OR p_checkout_session_id IS NULL
    OR btrim(p_checkout_session_id) = ''
    OR p_lease_token IS NULL
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  UPDATE public.compatibility_purchase_contexts
  SET
    stripe_checkout_session_id = btrim(p_checkout_session_id),
    stripe_session_expires_at = p_session_expires_at,
    stripe_create_lease_token = NULL,
    stripe_create_lease_until = NULL,
    updated_at = now()
  WHERE id = p_context_id
    AND owner_user_id = v_owner
    AND status = 'pending'
    AND stripe_checkout_session_id IS NULL
    AND stripe_create_lease_token = p_lease_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'attach_failed');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- FUTURE-GATED release primitive (service_role only). Does NOT call Stripe.
-- Trust boundary: a separate Human-gated provider adapter MUST Session.retrieve the exact
-- stripe_checkout_session_id and supply status='expired' and payment_status='unpaid' only after
-- positive provider proof. Clock/lease expiry, cancel URL, list miss, HTTP 500, and client booleans
-- are invalid inputs. No release when session id is not yet attached (checkout_unknown path).
CREATE OR REPLACE FUNCTION public.m55_cas_release_compatibility_checkout_expired_v1(
  p_context_id uuid,
  p_owner_user_id text,
  p_checkout_session_id text,
  p_stripe_session_status text,
  p_stripe_payment_status text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner text;
  v_session_id text;
BEGIN
  v_owner := btrim(p_owner_user_id);
  v_session_id := btrim(p_checkout_session_id);

  IF p_context_id IS NULL
    OR v_owner = ''
    OR length(v_owner) > 128
    OR v_session_id = ''
    OR p_checkout_session_id IS DISTINCT FROM v_session_id
    OR p_stripe_session_status IS DISTINCT FROM 'expired'
    OR p_stripe_payment_status IS DISTINCT FROM 'unpaid'
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_release_evidence');
  END IF;

  UPDATE public.compatibility_purchase_contexts
  SET
    status = 'expired',
    updated_at = now()
  WHERE id = p_context_id
    AND owner_user_id = v_owner
    AND status = 'pending'
    AND stripe_checkout_session_id = v_session_id
    AND fulfilled_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'release_cas_failed');
  END IF;

  RETURN jsonb_build_object('ok', true, 'state', 'expired');
END;
$$;

REVOKE ALL ON FUNCTION public.m55_reserve_compatibility_checkout_v1(uuid, text, uuid, uuid, jsonb, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_classify_pending_checkout_context_v1(public.compatibility_purchase_contexts)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_acquire_compatibility_checkout_create_slot_v1(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_cas_attach_compatibility_checkout_session_v1(uuid, text, text, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_cas_release_compatibility_checkout_expired_v1(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.m55_reserve_compatibility_checkout_v1(uuid, text, uuid, uuid, jsonb, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_classify_pending_checkout_context_v1(public.compatibility_purchase_contexts)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_acquire_compatibility_checkout_create_slot_v1(uuid, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_cas_attach_compatibility_checkout_session_v1(uuid, text, text, timestamptz, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_cas_release_compatibility_checkout_expired_v1(uuid, text, text, text, text)
  TO service_role;

COMMENT ON INDEX public.compatibility_purchase_contexts_pending_tuple_uidx IS
  'At most one pending compatibility checkout per owner/pair/paid tuple.';
