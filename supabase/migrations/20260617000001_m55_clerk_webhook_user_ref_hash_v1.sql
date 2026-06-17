-- M55 Account Deletion — user_ref_hash correlation lane (2026-06-17)
-- Forward-only Preview migration. No raw Clerk ID storage and no historical backfill.

ALTER TABLE public.clerk_webhook_events
  ADD COLUMN IF NOT EXISTS user_ref_hash text NULL;

ALTER TABLE public.clerk_webhook_events
  DROP CONSTRAINT IF EXISTS clerk_webhook_events_user_ref_hash_check;

ALTER TABLE public.clerk_webhook_events
  ADD CONSTRAINT clerk_webhook_events_user_ref_hash_check
  CHECK (
    user_ref_hash IS NULL
    OR user_ref_hash ~ '^[0-9a-f]{16}$'
  );

CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_user_ref_hash
  ON public.clerk_webhook_events (user_ref_hash)
  WHERE user_ref_hash IS NOT NULL;

ALTER TABLE public.clerk_webhook_events
  DROP CONSTRAINT IF EXISTS clerk_webhook_events_error_code_check;

ALTER TABLE public.clerk_webhook_events
  ADD CONSTRAINT clerk_webhook_events_error_code_check
  CHECK (
    error_code IS NULL
    OR error_code IN (
      'INVALID_PROCESSING_STATE',
      'CLEANUP_FAILED',
      'VERIFICATION_FAILED',
      'CORRELATION_MISMATCH'
    )
  );

CREATE OR REPLACE FUNCTION public.m55_account_deletion_process_v1(
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
  v_svix_id text;
  v_clerk_user_id text;
  v_deletion_subject_id text;
  v_ledger_status text;
  v_ledger_attempt_count integer;
  v_existing_user_ref_hash text;
  v_error_code text;
  v_claim_continue boolean := false;
  target_consult_thread_ids uuid[];
  target_reply_session_ids uuid[];
  target_reply_wallet_ids uuid[];
  target_consult_commit_ids uuid[];
  target_checkout_session_ids text[];
  target_failed_fulfillment_ids uuid[];
  target_entitlements_count integer;
  target_otf_count integer;
  v_otf_before jsonb;
  v_otf_after jsonb;
  v_count integer;
BEGIN
  v_svix_id := btrim(p_svix_id);
  v_clerk_user_id := btrim(p_clerk_user_id);

  -- ── input validation (before lock, before ledger) ─────────────────────────
  IF p_svix_id IS NULL
    OR v_svix_id = ''
    OR length(v_svix_id) > 128
    OR p_svix_id IS DISTINCT FROM v_svix_id
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'failed',
      'error_code', 'INVALID_INPUT',
      'svix_id', v_svix_id
    );
  END IF;

  IF p_event_type IS DISTINCT FROM 'user.deleted' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'failed',
      'error_code', 'INVALID_EVENT_TYPE',
      'svix_id', v_svix_id
    );
  END IF;

  IF p_clerk_user_id IS NULL
    OR v_clerk_user_id = ''
    OR length(v_clerk_user_id) > 128
    OR p_clerk_user_id IS DISTINCT FROM v_clerk_user_id
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'failed',
      'error_code', 'INVALID_INPUT',
      'svix_id', v_svix_id
    );
  END IF;

  IF p_user_ref_hash IS NULL
    OR p_user_ref_hash !~ '^[0-9a-f]{16}$'
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'failed',
      'error_code', 'INVALID_INPUT',
      'svix_id', v_svix_id
    );
  END IF;

  -- ── advisory lock ─────────────────────────────────────────────────────────
  PERFORM pg_advisory_xact_lock(
    hashtextextended('m55_acct_del:' || v_clerk_user_id, 0)
  );

  -- ── ledger claim ──────────────────────────────────────────────────────────
  BEGIN
    v_deletion_subject_id :=
      'm55-del:' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.clerk_webhook_events (
      svix_id,
      event_type,
      deletion_subject_id,
      status,
      attempt_count,
      error_code,
      completed_at,
      user_ref_hash
    )
    VALUES (
      v_svix_id,
      p_event_type,
      v_deletion_subject_id,
      'processing',
      1,
      NULL,
      NULL,
      p_user_ref_hash
    )
    ON CONFLICT (svix_id) DO NOTHING;

    IF FOUND THEN
      v_claim_continue := true;
    ELSE
      SELECT
        cwe.status,
        cwe.attempt_count,
        cwe.deletion_subject_id,
        cwe.user_ref_hash
      INTO
        v_ledger_status,
        v_ledger_attempt_count,
        v_deletion_subject_id,
        v_existing_user_ref_hash
      FROM public.clerk_webhook_events AS cwe
      WHERE cwe.svix_id = v_svix_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'ok', false,
          'status', 'failed',
          'error_code', 'LEDGER_CLAIM_FAILED',
          'svix_id', v_svix_id
        );
      END IF;

      -- Correlation state machine for existing rows.  Mismatch is checked before any
      -- status shortcut for correlated rows; succeeded legacy NULL rows remain transport-only.
      IF v_existing_user_ref_hash IS NOT NULL
        AND v_existing_user_ref_hash IS DISTINCT FROM p_user_ref_hash
      THEN
        IF v_ledger_status IS DISTINCT FROM 'succeeded' THEN
          UPDATE public.clerk_webhook_events AS cwe
          SET
            status = 'failed',
            error_code = 'CORRELATION_MISMATCH',
            updated_at = now(),
            completed_at = NULL
          WHERE cwe.svix_id = v_svix_id;
        END IF;

        RETURN jsonb_build_object(
          'ok', false,
          'status', 'failed',
          'error_code', 'CORRELATION_MISMATCH',
          'svix_id', v_svix_id
        );
      END IF;

      IF v_existing_user_ref_hash IS NULL THEN
        IF v_ledger_status = 'succeeded' THEN
          RETURN jsonb_build_object(
            'ok', true,
            'status', 'succeeded',
            'classification', 'LEGACY_SUCCEEDED_UNCORRELATED',
            'svix_id', v_svix_id
          );
        END IF;

        UPDATE public.clerk_webhook_events AS cwe
        SET
          status = 'failed',
          error_code = 'CORRELATION_MISMATCH',
          updated_at = now(),
          completed_at = NULL
        WHERE cwe.svix_id = v_svix_id;

        RETURN jsonb_build_object(
          'ok', false,
          'status', 'failed',
          'error_code', 'CORRELATION_MISMATCH',
          'svix_id', v_svix_id
        );
      END IF;

      IF v_ledger_status = 'succeeded' THEN
        RETURN jsonb_build_object(
          'ok', true,
          'status', 'succeeded',
          'svix_id', v_svix_id
        );
      ELSIF v_ledger_status = 'processing' THEN
        UPDATE public.clerk_webhook_events AS cwe
        SET
          error_code = 'INVALID_PROCESSING_STATE',
          updated_at = now()
        WHERE cwe.svix_id = v_svix_id;

        RETURN jsonb_build_object(
          'ok', false,
          'status', 'failed',
          'error_code', 'INVALID_PROCESSING_STATE',
          'svix_id', v_svix_id
        );
      ELSIF v_ledger_status = 'pending' THEN
        UPDATE public.clerk_webhook_events AS cwe
        SET
          error_code = 'INVALID_PROCESSING_STATE',
          updated_at = now()
        WHERE cwe.svix_id = v_svix_id;

        RETURN jsonb_build_object(
          'ok', false,
          'status', 'failed',
          'error_code', 'INVALID_PROCESSING_STATE',
          'svix_id', v_svix_id
        );
      ELSIF v_ledger_status = 'failed' THEN
        UPDATE public.clerk_webhook_events AS cwe
        SET
          attempt_count = cwe.attempt_count + 1,
          status = 'processing',
          error_code = NULL,
          updated_at = now(),
          completed_at = NULL
        WHERE cwe.svix_id = v_svix_id
        RETURNING cwe.deletion_subject_id INTO v_deletion_subject_id;

        v_claim_continue := true;
      ELSE
        RETURN jsonb_build_object(
          'ok', false,
          'status', 'failed',
          'error_code', 'LEDGER_CLAIM_FAILED',
          'svix_id', v_svix_id
        );
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 'failed',
        'error_code', 'LEDGER_CLAIM_FAILED',
        'svix_id', v_svix_id
      );
  END;

  IF NOT v_claim_continue OR v_deletion_subject_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'failed',
      'error_code', 'LEDGER_CLAIM_FAILED',
      'svix_id', v_svix_id
    );
  END IF;

  -- ── cleanup block (subtransaction) ────────────────────────────────────────
  BEGIN
    -- capture (typed empty arrays; no NULL arrays)
    SELECT COALESCE(array_agg(ct.id), ARRAY[]::uuid[])
    INTO target_consult_thread_ids
    FROM public.consult_threads AS ct
    WHERE ct.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(rs.id), ARRAY[]::uuid[])
    INTO target_reply_session_ids
    FROM public.reply_sessions AS rs
    WHERE rs.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(rtw.id), ARRAY[]::uuid[])
    INTO target_reply_wallet_ids
    FROM public.reply_ticket_wallets AS rtw
    WHERE rtw.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(csc.id), ARRAY[]::uuid[])
    INTO target_consult_commit_ids
    FROM public.consult_send_commits AS csc
    WHERE csc.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(otf.checkout_session_id), ARRAY[]::text[])
    INTO target_checkout_session_ids
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(ff.id), ARRAY[]::uuid[])
    INTO target_failed_fulfillment_ids
    FROM public.failed_fulfillments AS ff
    WHERE ff.checkout_session_id = ANY(target_checkout_session_ids)
       OR ff.user_ref_hash = p_user_ref_hash;

    SELECT COUNT(*)::integer
    INTO target_entitlements_count
    FROM public.entitlements AS e
    WHERE e.user_id = v_clerk_user_id;

    SELECT COUNT(*)::integer
    INTO target_otf_count
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'checkout_session_id', otf.checkout_session_id,
          'payment_intent_id', otf.payment_intent_id,
          'event_id', otf.event_id,
          'product_id', otf.product_id,
          'fulfilled_at', otf.fulfilled_at
        )
        ORDER BY otf.checkout_session_id
      ),
      '[]'::jsonb
    )
    INTO v_otf_before
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;

    -- direct DELETE (fixed order)
    DELETE FROM public.consult_send_commits AS csc
    WHERE csc.user_id = v_clerk_user_id;

    DELETE FROM public.reply_wallet_ledgers AS rwl
    WHERE rwl.user_id = v_clerk_user_id
       OR rwl.wallet_id = ANY(target_reply_wallet_ids)
       OR rwl.reply_session_id = ANY(target_reply_session_ids)
       OR rwl.consult_commit_id = ANY(target_consult_commit_ids);

    DELETE FROM public.reply_documents AS rd
    WHERE rd.user_id = v_clerk_user_id
       OR rd.reply_session_id = ANY(target_reply_session_ids);

    DELETE FROM public.reply_sessions AS rs
    WHERE rs.user_id = v_clerk_user_id;

    DELETE FROM public.reply_ticket_wallets AS rtw
    WHERE rtw.user_id = v_clerk_user_id;

    DELETE FROM public.consult_threads AS ct
    WHERE ct.user_id = v_clerk_user_id;

    DELETE FROM public.dtr_guest_drafts AS dgd
    WHERE dgd.user_id = v_clerk_user_id;

    DELETE FROM public.dtr_report_snapshots AS drs
    WHERE drs.user_id = v_clerk_user_id;

    DELETE FROM public.entitlement_rights AS er
    WHERE er.user_id = v_clerk_user_id;

    -- pseudonymize
    UPDATE public.entitlements AS e
    SET user_id = v_deletion_subject_id
    WHERE e.user_id = v_clerk_user_id;

    UPDATE public.one_time_fulfillments AS otf
    SET user_id = v_deletion_subject_id
    WHERE otf.user_id = v_clerk_user_id;

    -- failed_fulfillments scrub (captured IDs only)
    UPDATE public.failed_fulfillments AS ff
    SET
      raw_metadata = NULL,
      user_ref_hash = NULL
    WHERE ff.id = ANY(target_failed_fulfillment_ids);

    -- targeted verification
    SELECT COUNT(*)::integer INTO v_count
    FROM public.consult_send_commits AS csc
    WHERE csc.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_wallet_ledgers AS rwl
    WHERE rwl.user_id = v_clerk_user_id
       OR rwl.wallet_id = ANY(target_reply_wallet_ids)
       OR rwl.reply_session_id = ANY(target_reply_session_ids)
       OR rwl.consult_commit_id = ANY(target_consult_commit_ids);
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_documents AS rd
    WHERE rd.user_id = v_clerk_user_id
       OR rd.reply_session_id = ANY(target_reply_session_ids);
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_sessions AS rs
    WHERE rs.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_ticket_wallets AS rtw
    WHERE rtw.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.consult_threads AS ct
    WHERE ct.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.consult_messages AS cm
    WHERE cm.thread_id = ANY(target_consult_thread_ids);
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.dtr_guest_drafts AS dgd
    WHERE dgd.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.dtr_report_snapshots AS drs
    WHERE drs.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.entitlement_rights AS er
    WHERE er.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.entitlements AS e
    WHERE e.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.entitlements AS e
    WHERE e.user_id = v_deletion_subject_id;
    IF v_count IS DISTINCT FROM target_entitlements_count THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_deletion_subject_id
      AND otf.checkout_session_id = ANY(target_checkout_session_ids);
    IF v_count IS DISTINCT FROM target_otf_count THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'checkout_session_id', otf.checkout_session_id,
          'payment_intent_id', otf.payment_intent_id,
          'event_id', otf.event_id,
          'product_id', otf.product_id,
          'fulfilled_at', otf.fulfilled_at
        )
        ORDER BY otf.checkout_session_id
      ),
      '[]'::jsonb
    )
    INTO v_otf_after
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_deletion_subject_id
      AND otf.checkout_session_id = ANY(target_checkout_session_ids);

    IF v_otf_before IS DISTINCT FROM v_otf_after THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.failed_fulfillments AS ff
    WHERE ff.id = ANY(target_failed_fulfillment_ids)
      AND (ff.raw_metadata IS NOT NULL OR ff.user_ref_hash IS NOT NULL);
    IF v_count > 0 THEN
      v_error_code := 'VERIFICATION_FAILED';
      RAISE EXCEPTION 'verification_failed';
    END IF;

    UPDATE public.clerk_webhook_events AS cwe
    SET
      status = 'succeeded',
      error_code = NULL,
      updated_at = now(),
      completed_at = now()
    WHERE cwe.svix_id = v_svix_id;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'svix_id', v_svix_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_error_code := COALESCE(v_error_code, 'CLEANUP_FAILED');

      UPDATE public.clerk_webhook_events AS cwe
      SET
        status = 'failed',
        error_code = v_error_code,
        updated_at = now(),
        completed_at = NULL
      WHERE cwe.svix_id = v_svix_id;

      RETURN jsonb_build_object(
        'ok', false,
        'status', 'failed',
        'error_code', v_error_code,
        'svix_id', v_svix_id
      );
  END;
END;
$$;

DO $$
BEGIN
  EXECUTE format(
    'ALTER FUNCTION public.m55_account_deletion_process_v1(text, text, text, text) OWNER TO %I',
    current_user
  );
END $$;

REVOKE ALL ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  FROM PUBLIC;

REVOKE ALL ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  FROM anon;

REVOKE ALL ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  FROM authenticated;

GRANT EXECUTE ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.m55_account_deletion_process_v1 IS
  'Account deletion cleanup RPC v1. Pseudonymizes entitlements/OTF; retains stripe_events/stripe_processed_events.';


COMMENT ON COLUMN public.clerk_webhook_events.user_ref_hash IS
  'Truncated one-way correlation token for account deletion smoke checks. No raw Clerk ID storage.';
