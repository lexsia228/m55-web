-- M55 Contract-C: consult send atomic commit (idempotency + wallet + ledger + messages)
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_MIGRATION_PLANNING_2026-05-23.md
-- Apply: Production C-D-EXEC-DB only (Human GO required)

-- ── Step 1: consult_send_commits ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.consult_send_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL CHECK (length(btrim(user_id)) > 0),
  report_instance_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 128),
  payload_fingerprint text NOT NULL,
  consult_thread_id uuid NOT NULL REFERENCES public.consult_threads (id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  user_message_id uuid REFERENCES public.consult_messages (id) ON DELETE SET NULL,
  assistant_message_id uuid REFERENCES public.consult_messages (id) ON DELETE SET NULL,
  wallet_id uuid REFERENCES public.reply_ticket_wallets (id) ON DELETE SET NULL,
  wallet_before integer,
  wallet_after integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_instance_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_consult_send_commits_user_report_created
  ON public.consult_send_commits (user_id, report_instance_id, created_at DESC);

-- ── Step 2: ledger consult_commit_id ─────────────────────────────────────────

ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS consult_commit_id uuid
  REFERENCES public.consult_send_commits (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_consult_commit
  ON public.reply_wallet_ledgers (consult_commit_id)
  WHERE consult_commit_id IS NOT NULL;

-- ── Step 3: relax reply_consume CHECK (reply_session_id OR consult_commit_id) ─

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'reply_wallet_ledgers'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%reply_consume%'
      AND pg_get_constraintdef(con.oid) ILIKE '%reply_session_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.reply_wallet_ledgers DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.reply_wallet_ledgers
  ADD CONSTRAINT reply_wallet_ledgers_reply_consume_ref_check
  CHECK (
    (
      event_type = 'reply_consume'
      AND delta < 0
      AND (
        reply_session_id IS NOT NULL
        OR consult_commit_id IS NOT NULL
      )
    )
    OR (
      event_type IN ('included_grant', 'purchase_grant')
      AND delta > 0
    )
    OR (
      event_type IN ('recovery_adjust', 'admin_adjust')
    )
  );

-- ── Step 4: m55_consult_reply_commit RPC ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.m55_consult_reply_commit(
  p_user_id text,
  p_report_instance_id uuid,
  p_consult_thread_id uuid,
  p_idempotency_key text,
  p_user_message text,
  p_assistant_message text,
  p_message_created_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fingerprint text;
  v_commit_id uuid;
  v_commit_status text;
  v_commit_fingerprint text;
  v_commit_user_msg_id uuid;
  v_commit_asst_msg_id uuid;
  v_thread_user text;
  v_wallet_id uuid;
  v_wallet_status text;
  v_wallet_report_instance_id uuid;
  v_avail_before int;
  v_avail_after int;
  v_consumed_before int;
  v_initial int;
  v_purchased int;
  v_user_msg_id uuid;
  v_asst_msg_id uuid;
  v_thread_credits_total int;
  v_thread_credits_remaining int;
  v_thread_state text;
  v_assistant_content text;
  v_cap constant int := 5;
BEGIN
  IF p_user_id IS NULL OR length(btrim(p_user_id)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'user_id required'
    );
  END IF;

  IF p_report_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'report_instance_id required'
    );
  END IF;

  IF p_consult_thread_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'consult_thread_id required'
    );
  END IF;

  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(btrim(p_idempotency_key)) > 128 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'idempotency_key length must be 8-128'
    );
  END IF;

  IF p_user_message IS NULL OR length(btrim(p_user_message)) < 10 OR length(p_user_message) > 500 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'user_message length must be 10-500'
    );
  END IF;

  IF p_assistant_message IS NULL OR length(btrim(p_assistant_message)) < 1 OR length(p_assistant_message) > 1000 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'assistant_message length must be 1-1000'
    );
  END IF;

  v_fingerprint := md5(concat_ws('|', p_user_message, p_assistant_message));

  SELECT id, status, payload_fingerprint, user_message_id, assistant_message_id, wallet_after
  INTO v_commit_id, v_commit_status, v_commit_fingerprint, v_commit_user_msg_id, v_commit_asst_msg_id, v_avail_after
  FROM consult_send_commits
  WHERE user_id = p_user_id
    AND report_instance_id = p_report_instance_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_commit_status = 'succeeded' THEN
      IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error_code', 'IDEMPOTENCY_CONFLICT',
          'message', 'idempotency key reused with different payload'
        );
      END IF;

      IF v_commit_asst_msg_id IS NOT NULL THEN
        SELECT content INTO v_assistant_content
        FROM consult_messages
        WHERE id = v_commit_asst_msg_id;
      END IF;

      SELECT credits_total, credits_remaining, state
      INTO v_thread_credits_total, v_thread_credits_remaining, v_thread_state
      FROM consult_threads
      WHERE id = p_consult_thread_id;

      RETURN jsonb_build_object(
        'ok', true,
        'mode', 'replay',
        'consumption_applied', false,
        'wallet_before', COALESCE(v_avail_after, 0),
        'wallet_after', COALESCE(v_avail_after, 0),
        'thread_state', COALESCE(v_thread_state, 'read_only'),
        'thread_credits_remaining', COALESCE(v_thread_credits_remaining, 0),
        'thread_credits_total', COALESCE(v_thread_credits_total, 0),
        'assistant_content', COALESCE(v_assistant_content, p_assistant_message)
      );
    END IF;

    IF v_commit_status = 'pending' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'COMMIT_IN_PROGRESS',
        'message', 'commit already in progress for this idempotency key'
      );
    END IF;
  ELSE
    INSERT INTO consult_send_commits (
      user_id,
      report_instance_id,
      idempotency_key,
      payload_fingerprint,
      consult_thread_id,
      status
    )
    VALUES (
      p_user_id,
      p_report_instance_id,
      p_idempotency_key,
      v_fingerprint,
      p_consult_thread_id,
      'pending'
    )
    RETURNING id INTO v_commit_id;
  END IF;

  SELECT user_id
  INTO v_thread_user
  FROM consult_threads
  WHERE id = p_consult_thread_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_NOT_FOUND',
      'message', 'consult thread not found'
    );
  END IF;

  IF v_thread_user IS DISTINCT FROM p_user_id THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_USER_MISMATCH',
      'message', 'consult thread user mismatch'
    );
  END IF;

  SELECT
    id,
    status,
    report_instance_id,
    available_count,
    consumed_count,
    initial_included_count,
    purchased_count
  INTO
    v_wallet_id,
    v_wallet_status,
    v_wallet_report_instance_id,
    v_avail_before,
    v_consumed_before,
    v_initial,
    v_purchased
  FROM reply_ticket_wallets
  WHERE user_id = p_user_id
    AND report_instance_id = p_report_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'WALLET_NOT_FOUND',
      'message', 'scoped wallet not found'
    );
  END IF;

  IF v_wallet_report_instance_id IS NULL THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN_NULL_SCOPE',
      'message', 'null-scope wallet forbidden'
    );
  END IF;

  IF v_wallet_status <> 'active' THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'WALLET_NOT_ACTIVE',
      'message', 'wallet not active'
    );
  END IF;

  IF v_avail_before <= 0 THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'WALLET_NO_BALANCE',
      'message', 'no available balance'
    );
  END IF;

  v_avail_after := v_avail_before - 1;

  INSERT INTO consult_messages (thread_id, role, content, created_at)
  VALUES (p_consult_thread_id, 'user', p_user_message, p_message_created_at)
  RETURNING id INTO v_user_msg_id;

  INSERT INTO consult_messages (thread_id, role, content, created_at)
  VALUES (p_consult_thread_id, 'assistant', p_assistant_message, p_message_created_at)
  RETURNING id INTO v_asst_msg_id;

  UPDATE reply_ticket_wallets
  SET
    available_count = v_avail_after,
    consumed_count = v_consumed_before + 1,
    updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO reply_wallet_ledgers (
    user_id,
    wallet_id,
    reply_session_id,
    consult_commit_id,
    delta,
    balance_after,
    event_type,
    source_of_grant
  )
  VALUES (
    p_user_id,
    v_wallet_id,
    NULL,
    v_commit_id,
    -1,
    v_avail_after,
    'reply_consume',
    NULL
  );

  v_thread_credits_remaining := GREATEST(0, v_avail_after);
  v_thread_state := CASE WHEN v_thread_credits_remaining <= 0 THEN 'read_only' ELSE 'writable' END;
  v_thread_credits_total := LEAST(
    v_cap,
    GREATEST(
      (SELECT credits_total FROM consult_threads WHERE id = p_consult_thread_id),
      COALESCE(v_initial, 0) + COALESCE(v_purchased, 0)
    )
  );

  UPDATE consult_threads
  SET
    credits_remaining = v_thread_credits_remaining,
    credits_total = v_thread_credits_total,
    state = v_thread_state,
    updated_at = now()
  WHERE id = p_consult_thread_id;

  UPDATE consult_send_commits
  SET
    status = 'succeeded',
    user_message_id = v_user_msg_id,
    assistant_message_id = v_asst_msg_id,
    wallet_id = v_wallet_id,
    wallet_before = v_avail_before,
    wallet_after = v_avail_after,
    updated_at = now()
  WHERE id = v_commit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'consumed',
    'consumption_applied', true,
    'wallet_before', v_avail_before,
    'wallet_after', v_avail_after,
    'thread_state', v_thread_state,
    'thread_credits_remaining', v_thread_credits_remaining,
    'thread_credits_total', v_thread_credits_total,
    'assistant_content', p_assistant_message
  );
EXCEPTION
  WHEN OTHERS THEN
    IF v_commit_id IS NOT NULL THEN
      UPDATE consult_send_commits
      SET status = 'failed', updated_at = now()
      WHERE id = v_commit_id AND status = 'pending';
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.m55_consult_reply_commit(
  text, uuid, uuid, text, text, text, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.m55_consult_reply_commit(
  text, uuid, uuid, text, text, text, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.m55_consult_reply_commit IS
  'Atomically commits consult send: idempotency, messages, scoped wallet decrement, reply_consume ledger with consult_commit_id, thread display sync.';
