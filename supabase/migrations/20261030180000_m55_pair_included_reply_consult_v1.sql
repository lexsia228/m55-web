-- M55 Pair Premium: one included additional reading per owned compatibility report.
-- Forward-only successor. Does not modify frozen 082/090/100/131 files.

CREATE TABLE public.compatibility_consult_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL CHECK (length(btrim(owner_user_id)) > 0),
  owned_report_id uuid NOT NULL,
  credits_total integer NOT NULL DEFAULT 1 CHECK (credits_total = 1),
  credits_remaining integer NOT NULL DEFAULT 1 CHECK (credits_remaining >= 0 AND credits_remaining <= 1),
  state text NOT NULL DEFAULT 'writable'
    CHECK (state IN ('writable', 'read_only')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compatibility_consult_threads_report_owner_fk
    FOREIGN KEY (owned_report_id, owner_user_id)
    REFERENCES public.compatibility_owned_reports (id, owner_user_id)
    ON DELETE CASCADE,
  CONSTRAINT compatibility_consult_threads_owner_report_uidx
    UNIQUE (owner_user_id, owned_report_id),
  CONSTRAINT compatibility_consult_threads_credits_state_check
    CHECK (
      (credits_remaining > 0 AND state = 'writable')
      OR (credits_remaining = 0 AND state = 'read_only')
    )
);

CREATE INDEX compatibility_consult_threads_report_idx
  ON public.compatibility_consult_threads (owned_report_id);

CREATE TABLE public.compatibility_consult_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL
    REFERENCES public.compatibility_consult_threads (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX compatibility_consult_messages_thread_created_idx
  ON public.compatibility_consult_messages (thread_id, created_at ASC);

CREATE TABLE public.compatibility_consult_send_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL CHECK (length(btrim(user_id)) > 0),
  owned_report_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 128),
  payload_fingerprint text NOT NULL,
  thread_id uuid NOT NULL
    REFERENCES public.compatibility_consult_threads (id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  attempt_token uuid,
  reserved_until timestamptz,
  user_message_id uuid REFERENCES public.compatibility_consult_messages (id) ON DELETE SET NULL,
  assistant_message_id uuid REFERENCES public.compatibility_consult_messages (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compatibility_consult_send_commits_idempotency_uidx
    UNIQUE (user_id, owned_report_id, idempotency_key)
);

CREATE INDEX compatibility_consult_send_commits_user_report_created_idx
  ON public.compatibility_consult_send_commits (user_id, owned_report_id, created_at DESC);

CREATE INDEX compatibility_consult_send_commits_report_pending_idx
  ON public.compatibility_consult_send_commits (user_id, owned_report_id)
  WHERE status = 'pending';

ALTER TABLE public.compatibility_consult_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_consult_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_consult_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_consult_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_consult_send_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_consult_send_commits FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.compatibility_consult_threads FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.compatibility_consult_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.compatibility_consult_send_commits FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.compatibility_consult_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.compatibility_consult_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.compatibility_consult_send_commits TO service_role;

CREATE OR REPLACE FUNCTION public.m55_ensure_compatibility_included_reply_thread_v1(
  p_owned_report_id uuid,
  p_owner_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner text;
  v_report_owner text;
BEGIN
  IF p_owned_report_id IS NULL OR p_owner_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  v_owner := btrim(p_owner_user_id);
  IF v_owner = '' OR p_owner_user_id IS DISTINCT FROM v_owner THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  SELECT owner_user_id
  INTO v_report_owner
  FROM public.compatibility_owned_reports
  WHERE id = p_owned_report_id;

  IF NOT FOUND OR v_report_owner IS DISTINCT FROM v_owner THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'report_not_owned');
  END IF;

  INSERT INTO public.compatibility_consult_threads (
    owner_user_id,
    owned_report_id,
    credits_total,
    credits_remaining,
    state
  )
  VALUES (v_owner, p_owned_report_id, 1, 1, 'writable')
  ON CONFLICT (owner_user_id, owned_report_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.m55_backfill_compatibility_included_reply_threads_v1()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  INSERT INTO public.compatibility_consult_threads (
    owner_user_id,
    owned_report_id,
    credits_total,
    credits_remaining,
    state
  )
  SELECT
    r.owner_user_id,
    r.id,
    1,
    1,
    'writable'
  FROM public.compatibility_owned_reports AS r
  ON CONFLICT (owner_user_id, owned_report_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'threads_inserted', v_inserted);
END;
$$;

CREATE OR REPLACE FUNCTION public.m55_compatibility_consult_send_release_v1(
  p_user_id text,
  p_owned_report_id uuid,
  p_idempotency_key text,
  p_attempt_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF p_user_id IS NULL OR length(btrim(p_user_id)) = 0
    OR p_owned_report_id IS NULL
    OR p_idempotency_key IS NULL
    OR length(btrim(p_idempotency_key)) < 8
    OR p_attempt_token IS NULL
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_INPUT',
      'message', 'invalid release input'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('m55_pair_consult:' || p_owned_report_id::text, 0)
  );

  UPDATE public.compatibility_consult_send_commits
  SET status = 'failed', updated_at = now()
  WHERE user_id = p_user_id
    AND owned_report_id = p_owned_report_id
    AND idempotency_key = p_idempotency_key
    AND status = 'pending'
    AND attempt_token = p_attempt_token;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'RELEASE_NOT_APPLIED',
      'message', 'no matching pending reservation to release'
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.m55_compatibility_consult_send_reserve_v1(
  p_user_id text,
  p_owned_report_id uuid,
  p_thread_id uuid,
  p_idempotency_key text,
  p_user_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fingerprint text;
  v_commit_id uuid;
  v_commit_status text;
  v_commit_fingerprint text;
  v_commit_asst_msg_id uuid;
  v_assistant_content text;
  v_attempt_token uuid;
  v_new_reserved_until timestamptz;
  v_stored_reserved_until timestamptz;
  v_thread_owner text;
  v_thread_report uuid;
  v_credits_remaining int;
  v_credits_total int;
  v_thread_state text;
  v_report_owner text;
  v_active_other_pending boolean;
BEGIN
  IF p_user_id IS NULL OR length(btrim(p_user_id)) = 0
    OR p_owned_report_id IS NULL
    OR p_thread_id IS NULL
    OR p_idempotency_key IS NULL
    OR length(btrim(p_idempotency_key)) < 8
    OR p_user_message IS NULL OR length(btrim(p_user_message)) = 0
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_INPUT',
      'message', 'invalid reserve input'
    );
  END IF;

  v_fingerprint := md5(
    btrim(p_user_id)
    || ':' || p_owned_report_id::text
    || ':' || btrim(p_idempotency_key)
    || ':' || btrim(p_user_message)
  );

  v_new_reserved_until := now() + interval '15 minutes';

  PERFORM pg_advisory_xact_lock(
    hashtextextended('m55_pair_consult:' || p_owned_report_id::text, 0)
  );

  UPDATE public.compatibility_consult_send_commits
  SET status = 'failed', updated_at = now()
  WHERE user_id = p_user_id
    AND owned_report_id = p_owned_report_id
    AND status = 'pending'
    AND (reserved_until IS NULL OR reserved_until < now());

  SELECT owner_user_id
  INTO v_report_owner
  FROM public.compatibility_owned_reports
  WHERE id = p_owned_report_id
  FOR UPDATE;

  IF NOT FOUND OR v_report_owner IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'REPORT_NOT_OWNED',
      'message', 'compatibility report not owned'
    );
  END IF;

  SELECT id, status, payload_fingerprint, assistant_message_id, attempt_token, reserved_until
  INTO v_commit_id, v_commit_status, v_commit_fingerprint, v_commit_asst_msg_id, v_attempt_token, v_stored_reserved_until
  FROM public.compatibility_consult_send_commits
  WHERE user_id = p_user_id
    AND owned_report_id = p_owned_report_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_commit_status = 'succeeded' THEN
      IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error_code', 'IDEMPOTENCY_CONFLICT',
          'message', 'idempotency key reused with different request payload'
        );
      END IF;

      SELECT content INTO v_assistant_content
      FROM public.compatibility_consult_messages
      WHERE id = v_commit_asst_msg_id;

      IF v_assistant_content IS NULL OR length(btrim(v_assistant_content)) = 0 THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error_code', 'REPLAY_CONTENT_MISSING',
          'message', 'stored assistant content missing for replay'
        );
      END IF;

      SELECT credits_total, credits_remaining, state
      INTO v_credits_total, v_credits_remaining, v_thread_state
      FROM public.compatibility_consult_threads
      WHERE id = p_thread_id;

      RETURN jsonb_build_object(
        'ok', true,
        'mode', 'replay',
        'consumption_applied', false,
        'thread_state', COALESCE(v_thread_state, 'read_only'),
        'thread_credits_remaining', COALESCE(v_credits_remaining, 0),
        'thread_credits_total', COALESCE(v_credits_total, 1),
        'assistant_content', v_assistant_content
      );
    END IF;

    IF v_commit_status = 'pending' THEN
      IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error_code', 'IDEMPOTENCY_CONFLICT',
          'message', 'idempotency key reused with different request payload'
        );
      END IF;

      IF v_stored_reserved_until IS NULL OR v_stored_reserved_until < now() THEN
        UPDATE public.compatibility_consult_send_commits
        SET status = 'failed', updated_at = now()
        WHERE id = v_commit_id
          AND status = 'pending';
      ELSE
        RETURN jsonb_build_object(
          'ok', false,
          'error_code', 'COMMIT_IN_PROGRESS',
          'message', 'commit already in progress for this idempotency key'
        );
      END IF;
    END IF;

    IF v_commit_status = 'failed' THEN
      IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error_code', 'IDEMPOTENCY_CONFLICT',
          'message', 'idempotency key reused with different request payload'
        );
      END IF;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.compatibility_consult_send_commits
    WHERE user_id = p_user_id
      AND owned_report_id = p_owned_report_id
      AND status = 'pending'
      AND idempotency_key IS DISTINCT FROM p_idempotency_key
  )
  INTO v_active_other_pending;

  IF v_active_other_pending THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'ACTIVE_SEND_IN_PROGRESS',
      'message', 'another send is already reserved for this report'
    );
  END IF;

  SELECT owner_user_id, owned_report_id, credits_remaining, credits_total, state
  INTO v_thread_owner, v_thread_report, v_credits_remaining, v_credits_total, v_thread_state
  FROM public.compatibility_consult_threads
  WHERE id = p_thread_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_NOT_FOUND',
      'message', 'compatibility consult thread not found'
    );
  END IF;

  IF v_thread_owner IS DISTINCT FROM p_user_id OR v_thread_report IS DISTINCT FROM p_owned_report_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_SCOPE_MISMATCH',
      'message', 'thread scope mismatch'
    );
  END IF;

  IF v_credits_remaining <= 0 OR v_thread_state <> 'writable' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'NO_CREDITS',
      'message', 'no included reply credits remaining'
    );
  END IF;

  v_attempt_token := gen_random_uuid();
  v_new_reserved_until := now() + interval '15 minutes';

  IF v_commit_id IS NULL THEN
    INSERT INTO public.compatibility_consult_send_commits (
      user_id,
      owned_report_id,
      idempotency_key,
      payload_fingerprint,
      thread_id,
      status,
      attempt_token,
      reserved_until
    )
    VALUES (
      p_user_id,
      p_owned_report_id,
      p_idempotency_key,
      v_fingerprint,
      p_thread_id,
      'pending',
      v_attempt_token,
      v_new_reserved_until
    )
    RETURNING id INTO v_commit_id;
  ELSE
    UPDATE public.compatibility_consult_send_commits
    SET
      status = 'pending',
      payload_fingerprint = v_fingerprint,
      thread_id = p_thread_id,
      attempt_token = v_attempt_token,
      reserved_until = v_new_reserved_until,
      updated_at = now()
    WHERE id = v_commit_id
      AND status = 'failed';
  END IF;

  IF v_new_reserved_until IS NULL OR v_new_reserved_until <= now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INTERNAL',
      'message', 'reservation lease invariant violated'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'reserved',
    'attempt_token', v_attempt_token::text,
    'reserved_until', v_new_reserved_until,
    'thread_state', v_thread_state,
    'thread_credits_remaining', v_credits_remaining,
    'thread_credits_total', v_credits_total
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'COMMIT_CONFLICT',
      'message', 'parallel reserve conflict'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.m55_compatibility_consult_reply_commit(
  p_user_id text,
  p_owned_report_id uuid,
  p_thread_id uuid,
  p_idempotency_key text,
  p_user_message text,
  p_assistant_message text,
  p_attempt_token uuid,
  p_message_created_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fingerprint text;
  v_commit_id uuid;
  v_commit_status text;
  v_commit_fingerprint text;
  v_commit_user_msg_id uuid;
  v_commit_asst_msg_id uuid;
  v_commit_attempt_token uuid;
  v_commit_reserved_until timestamptz;
  v_assistant_content text;
  v_thread_owner text;
  v_thread_report uuid;
  v_credits_remaining int;
  v_credits_total int;
  v_thread_state text;
  v_user_msg_id uuid;
  v_asst_msg_id uuid;
  v_report_owner text;
BEGIN
  IF p_user_id IS NULL OR length(btrim(p_user_id)) = 0
    OR p_owned_report_id IS NULL
    OR p_thread_id IS NULL
    OR p_idempotency_key IS NULL
    OR length(btrim(p_idempotency_key)) < 8
    OR p_user_message IS NULL OR length(btrim(p_user_message)) = 0
    OR p_assistant_message IS NULL OR length(btrim(p_assistant_message)) = 0
  THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_INPUT',
      'message', 'invalid commit input'
    );
  END IF;

  v_fingerprint := md5(
    btrim(p_user_id)
    || ':' || p_owned_report_id::text
    || ':' || btrim(p_idempotency_key)
    || ':' || btrim(p_user_message)
  );

  PERFORM pg_advisory_xact_lock(
    hashtextextended('m55_pair_consult:' || p_owned_report_id::text, 0)
  );

  UPDATE public.compatibility_consult_send_commits
  SET status = 'failed', updated_at = now()
  WHERE user_id = p_user_id
    AND owned_report_id = p_owned_report_id
    AND status = 'pending'
    AND (reserved_until IS NULL OR reserved_until < now());

  SELECT owner_user_id
  INTO v_report_owner
  FROM public.compatibility_owned_reports
  WHERE id = p_owned_report_id
  FOR UPDATE;

  IF NOT FOUND OR v_report_owner IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'REPORT_NOT_OWNED',
      'message', 'compatibility report not owned'
    );
  END IF;

  SELECT
    id,
    status,
    payload_fingerprint,
    user_message_id,
    assistant_message_id,
    attempt_token,
    reserved_until
  INTO
    v_commit_id,
    v_commit_status,
    v_commit_fingerprint,
    v_commit_user_msg_id,
    v_commit_asst_msg_id,
    v_commit_attempt_token,
    v_commit_reserved_until
  FROM public.compatibility_consult_send_commits
  WHERE user_id = p_user_id
    AND owned_report_id = p_owned_report_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'RESERVATION_REQUIRED',
      'message', 'send reservation required before commit'
    );
  END IF;

  IF v_commit_status = 'succeeded' THEN
    IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'IDEMPOTENCY_CONFLICT',
        'message', 'idempotency key reused with different request payload'
      );
    END IF;

    SELECT content INTO v_assistant_content
    FROM public.compatibility_consult_messages
    WHERE id = v_commit_asst_msg_id;

    IF v_assistant_content IS NULL OR length(btrim(v_assistant_content)) = 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'REPLAY_CONTENT_MISSING',
        'message', 'stored assistant content missing for replay'
      );
    END IF;

    SELECT credits_total, credits_remaining, state
    INTO v_credits_total, v_credits_remaining, v_thread_state
    FROM public.compatibility_consult_threads
    WHERE id = p_thread_id;

    RETURN jsonb_build_object(
      'ok', true,
      'mode', 'replay',
      'consumption_applied', false,
      'thread_state', COALESCE(v_thread_state, 'read_only'),
      'thread_credits_remaining', COALESCE(v_credits_remaining, 0),
      'thread_credits_total', COALESCE(v_credits_total, 1),
      'assistant_content', v_assistant_content
    );
  END IF;

  IF v_commit_status <> 'pending' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'RESERVATION_REQUIRED',
      'message', 'active send reservation required before commit'
    );
  END IF;

  IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'IDEMPOTENCY_CONFLICT',
      'message', 'idempotency key reused with different request payload'
    );
  END IF;

  IF p_attempt_token IS NULL OR v_commit_attempt_token IS DISTINCT FROM p_attempt_token THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'ATTEMPT_TOKEN_MISMATCH',
      'message', 'reservation attempt token mismatch'
    );
  END IF;

  IF v_commit_reserved_until IS NULL OR v_commit_reserved_until < now() THEN
    UPDATE public.compatibility_consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id
      AND status = 'pending';

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'RESERVATION_EXPIRED',
      'message', 'send reservation expired'
    );
  END IF;

  SELECT owner_user_id, owned_report_id, credits_remaining, credits_total, state
  INTO v_thread_owner, v_thread_report, v_credits_remaining, v_credits_total, v_thread_state
  FROM public.compatibility_consult_threads
  WHERE id = p_thread_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.compatibility_consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id
      AND status = 'pending';

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_NOT_FOUND',
      'message', 'compatibility consult thread not found'
    );
  END IF;

  IF v_thread_owner IS DISTINCT FROM p_user_id OR v_thread_report IS DISTINCT FROM p_owned_report_id THEN
    UPDATE public.compatibility_consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id
      AND status = 'pending';

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_SCOPE_MISMATCH',
      'message', 'thread scope mismatch'
    );
  END IF;

  IF v_credits_remaining <= 0 OR v_thread_state <> 'writable' THEN
    UPDATE public.compatibility_consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id
      AND status = 'pending';

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'NO_CREDITS',
      'message', 'no included reply credits remaining'
    );
  END IF;

  INSERT INTO public.compatibility_consult_messages (thread_id, role, content, created_at)
  VALUES (p_thread_id, 'user', p_user_message, p_message_created_at)
  RETURNING id INTO v_user_msg_id;

  INSERT INTO public.compatibility_consult_messages (thread_id, role, content, created_at)
  VALUES (p_thread_id, 'assistant', p_assistant_message, p_message_created_at)
  RETURNING id INTO v_asst_msg_id;

  UPDATE public.compatibility_consult_threads
  SET
    credits_remaining = 0,
    state = 'read_only',
    updated_at = now()
  WHERE id = p_thread_id;

  UPDATE public.compatibility_consult_send_commits
  SET
    status = 'succeeded',
    user_message_id = v_user_msg_id,
    assistant_message_id = v_asst_msg_id,
    updated_at = now()
  WHERE id = v_commit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'commit',
    'consumption_applied', true,
    'thread_state', 'read_only',
    'thread_credits_remaining', 0,
    'thread_credits_total', v_credits_total,
    'assistant_content', p_assistant_message
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'COMMIT_CONFLICT',
      'message', 'parallel commit conflict'
    );
END;
$$;

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
  v_ensure jsonb;
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
    v_ensure := public.m55_ensure_compatibility_included_reply_thread_v1(v_report_id, v_owner);
    IF COALESCE((v_ensure ->> 'ok')::boolean, false) IS NOT TRUE THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'included_reply_grant_failed');
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

  v_ensure := public.m55_ensure_compatibility_included_reply_thread_v1(v_report_id, v_owner);
  IF COALESCE((v_ensure ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'm55_pair_included_reply_grant_failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.m55_ensure_compatibility_included_reply_thread_v1(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_backfill_compatibility_included_reply_threads_v1()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_compatibility_consult_send_release_v1(
  text, uuid, text, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_compatibility_consult_send_reserve_v1(
  text, uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_compatibility_consult_reply_commit(
  text, uuid, uuid, text, text, text, uuid, timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.m55_ensure_compatibility_included_reply_thread_v1(uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_backfill_compatibility_included_reply_threads_v1()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_compatibility_consult_send_release_v1(
  text, uuid, text, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_compatibility_consult_send_reserve_v1(
  text, uuid, uuid, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_compatibility_consult_reply_commit(
  text, uuid, uuid, text, text, text, uuid, timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.m55_fulfill_compatibility_report_v1(uuid, text, text)
  TO service_role;

COMMENT ON TABLE public.compatibility_consult_threads IS
  'One included additional reading credit per owned Pair report; isolated from Self Premium ticket wallets.';
COMMENT ON FUNCTION public.m55_backfill_compatibility_included_reply_threads_v1 IS
  'Idempotent grant for pre-feature owned reports. Human-controlled apply only; not invoked from app runtime.';
