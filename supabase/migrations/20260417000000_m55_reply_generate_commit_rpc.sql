-- M55: atomic reply generate commit (consume + document + ledger + session) via RPC
-- SSOT: docs/ssot/M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1.md

CREATE OR REPLACE FUNCTION m55_reply_generate_commit(
  p_user_id text,
  p_reply_session_id uuid,
  p_payload_json jsonb,
  p_theme text,
  p_generator_version text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_avail_before int;
  v_avail_after int;
  v_wstatus text;
  v_sess_user text;
  v_sess_status text;
  v_sess_theme text;
  v_doc_id uuid;
BEGIN
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'user_id required'
    );
  END IF;

  IF p_reply_session_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'reply_session_id required'
    );
  END IF;

  IF p_theme IS NULL OR length(trim(p_theme)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'theme required'
    );
  END IF;

  IF p_payload_json IS NULL OR jsonb_typeof(p_payload_json) <> 'object' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'payload_json must be object'
    );
  END IF;

  IF (p_payload_json->>'theme') IS DISTINCT FROM p_theme THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'PAYLOAD_THEME_MISMATCH',
      'message', 'payload_json.theme must match p_theme'
    );
  END IF;

  SELECT user_id, status, theme
  INTO v_sess_user, v_sess_status, v_sess_theme
  FROM reply_sessions
  WHERE id = p_reply_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'SESSION_NOT_FOUND',
      'message', 'Session not found'
    );
  END IF;

  IF v_sess_user IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'SESSION_USER_MISMATCH',
      'message', 'Session user mismatch'
    );
  END IF;

  IF v_sess_theme IS DISTINCT FROM p_theme THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THEME_MISMATCH',
      'message', 'theme does not match session'
    );
  END IF;

  SELECT id INTO v_doc_id
  FROM reply_documents
  WHERE reply_session_id = p_reply_session_id;

  IF FOUND THEN
    SELECT id, available_count, status
    INTO v_wallet_id, v_avail_before, v_wstatus
    FROM reply_ticket_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'mode', 'replay',
        'reply_document_id', v_doc_id,
        'wallet_before', 0,
        'wallet_after', 0,
        'consumption_applied', false
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'mode', 'replay',
      'reply_document_id', v_doc_id,
      'wallet_before', v_avail_before,
      'wallet_after', v_avail_before,
      'consumption_applied', false
    );
  END IF;

  SELECT id, available_count, status
  INTO v_wallet_id, v_avail_before, v_wstatus
  FROM reply_ticket_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN',
      'message', 'Wallet not found'
    );
  END IF;

  IF v_wstatus <> 'active' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN',
      'message', 'Wallet not active'
    );
  END IF;

  IF v_avail_before <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN',
      'message', 'No available replies'
    );
  END IF;

  IF v_sess_status NOT IN ('accepted', 'generating', 'failed') THEN
    IF v_sess_status = 'cancelled' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'FORBIDDEN',
        'message', 'Session cancelled'
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'SESSION_NOT_CONSUMABLE',
      'message', 'Session status does not allow consume'
    );
  END IF;

  v_avail_after := v_avail_before - 1;

  INSERT INTO reply_documents (
    reply_session_id,
    user_id,
    theme,
    payload_json,
    version,
    generator_version
  )
  VALUES (
    p_reply_session_id,
    p_user_id,
    p_theme,
    p_payload_json,
    '1.1',
    p_generator_version
  )
  ON CONFLICT (reply_session_id) DO NOTHING
  RETURNING id INTO v_doc_id;

  IF v_doc_id IS NULL THEN
    SELECT id INTO v_doc_id
    FROM reply_documents
    WHERE reply_session_id = p_reply_session_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'INTERNAL_RACE',
        'message', 'Document insert race failed'
      );
    END IF;

    SELECT available_count    INTO v_avail_before
    FROM reply_ticket_wallets
    WHERE id = v_wallet_id;

    RETURN jsonb_build_object(
      'ok', true,
      'mode', 'replay',
      'reply_document_id', v_doc_id,
      'wallet_before', v_avail_before,
      'wallet_after', v_avail_before,
      'consumption_applied', false
    );
  END IF;

  UPDATE reply_ticket_wallets
  SET
    consumed_count = consumed_count + 1,
    available_count = available_count - 1,
    updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO reply_wallet_ledgers (
    user_id,
    wallet_id,
    reply_session_id,
    delta,
    balance_after,
    event_type,
    source_of_grant
  )
  VALUES (
    p_user_id,
    v_wallet_id,
    p_reply_session_id,
    -1,
    v_avail_after,
    'reply_consume',
    NULL
  );

  UPDATE reply_sessions
  SET
    status = 'succeeded',
    updated_at = now()
  WHERE id = p_reply_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'consumed',
    'reply_document_id', v_doc_id,
    'wallet_before', v_avail_before,
    'wallet_after', v_avail_after,
    'consumption_applied', true
  );
END;
$$;

REVOKE ALL ON FUNCTION m55_reply_generate_commit(text, uuid, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION m55_reply_generate_commit(text, uuid, jsonb, text, text) TO service_role;

COMMENT ON FUNCTION m55_reply_generate_commit IS
  'Atomically persists reply document, decrements wallet, records reply_consume ledger, completes session; replay when document already exists (no double consume).';

-- Playwright / local smoke: deterministic wallet for x-m55-test-user-id header user
INSERT INTO reply_ticket_wallets (
  user_id,
  initial_included_count,
  purchased_count,
  consumed_count,
  available_count,
  status
)
VALUES (
  'smoke_user_reply_generate',
  100,
  0,
  0,
  100,
  'active'
)
ON CONFLICT (user_id) DO NOTHING;
