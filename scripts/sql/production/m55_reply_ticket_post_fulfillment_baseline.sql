-- =============================================================================
-- M55 追加相談返書 — post-fulfillment DB baseline (SELECT ONLY)
--
-- Purpose: after test payment + webhook fulfillment, read-only verification
--   against documented PRE baseline (SSOT v1). Companion:
--   docs/ssot/M55_REPLY_TICKET_DB_POST_FULFILLMENT_BASELINE_PACKET_v1.md
--
-- HARD RULES:
--   - SELECT (+ WITH wrapping SELECT) ONLY — no INSERT/UPDATE/DELETE/DDL/SET/TRUNCATE.
--   - Do NOT project raw Clerk user_id, report/envelope bodies, birthdays,
--     Stripe secrets, webhook secrets, DB URLs, price ids, Checkout URLs,
--     full Stripe event/session/payment-intent ids (tail4 suffix hints only).
--
-- Stripe IDs on latest ledger row:
--   - Emit *_present_bool plus *_tail4 (last 4 chars) when length >= 4 — NOT full values.
--
-- Expected PRE constants below MUST match the locked pre baseline SSOT run:
--   docs/ssot/M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md
-- If your PRE differed, substitute ONLY in a local workspace copy — never commit literals.
--
-- Parameters (committed repo uses NULL — local substitution only):
--   - params.target_report_instance_id — same UUID as pre baseline run.
--   - params.operator_expected_owner_hash_hex16 — optional hex16 owner hash check.
--
-- Requires PostgreSQL digest(..., 'sha256') (common: pgcrypto).
--
-- Run policy: separate approval; post SELECT after payment completion + webhook path.
-- =============================================================================

WITH params AS (
  SELECT
    CAST(NULL AS uuid) AS target_report_instance_id,
    CAST(NULL AS text) AS operator_expected_owner_hash_hex16
  -- LOCAL ONLY: replace NULL uuid / hash per pre baseline packet.
),

-- Locked PRE snapshot (M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1).
expected_pre_from_ssot AS (
  SELECT
    0::bigint AS pre_stripe_processed_events_total_count,
    10::bigint AS pre_reply_wallet_ledgers_total_count,
    1::bigint AS pre_target_wallet_ledger_row_count,
    0::integer AS pre_purchased_count,
    1::integer AS pre_available_count,
    0::integer AS pre_consumed_count
),

global_counts AS (
  SELECT
    (SELECT COUNT(*)::bigint FROM public.stripe_processed_events) AS stripe_processed_events_total_count,
    (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets) AS reply_ticket_wallets_total_count,
    (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers) AS reply_wallet_ledgers_total_count,
    (SELECT COUNT(*)::bigint FROM public.reply_sessions) AS reply_sessions_total_count
),

target_snapshot AS (
  SELECT
    s.id AS report_instance_id,
    substring(
      encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) AS owner_user_hash_hex16
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN params AS p
  WHERE p.target_report_instance_id IS NOT NULL
    AND s.id = p.target_report_instance_id
),

target_wallet AS (
  SELECT
    w.id AS wallet_id,
    lower(btrim(w.status)) AS wallet_status_norm,
    w.initial_included_count,
    w.purchased_count,
    w.available_count,
    w.consumed_count,
    (
      (w.initial_included_count + w.purchased_count >= 5)
      OR (w.purchased_count >= 4)
    ) AS cap_reached_bool
  FROM params AS p
  INNER JOIN public.dtr_report_snapshots AS s
    ON p.target_report_instance_id IS NOT NULL
    AND s.id = p.target_report_instance_id
  INNER JOIN public.reply_ticket_wallets AS w
    ON btrim(w.user_id) = btrim(s.user_id)
  ORDER BY w.updated_at DESC NULLS LAST, w.id DESC NULLS LAST
  LIMIT 1
),

wallet_ledger_stats AS (
  SELECT
    tw.wallet_id,
    (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers AS l WHERE l.wallet_id = tw.wallet_id) AS ledger_row_count,
    (
      SELECT l.delta
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_delta,
    (
      SELECT l.event_type
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_event_type,
    (
      SELECT l.source_of_grant
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_source_of_grant,
    (
      SELECT l.product_key
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_product_key,
    (
      SELECT l.balance_after
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_balance_after,
    (
      SELECT COALESCE(btrim(l.stripe_event_id), '') <> ''
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_stripe_event_id_present_bool,
    (
      SELECT COALESCE(btrim(l.stripe_checkout_session_id), '') <> ''
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_stripe_checkout_session_id_present_bool,
    (
      SELECT COALESCE(btrim(l.stripe_payment_intent_id), '') <> ''
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_stripe_payment_intent_id_present_bool,
    (
      SELECT CASE
          WHEN length(btrim(COALESCE(l.stripe_event_id, ''))) >= 4
          THEN right(btrim(l.stripe_event_id), 4)
          ELSE NULL::text
        END
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_stripe_event_id_tail4,
    (
      SELECT CASE
          WHEN length(btrim(COALESCE(l.stripe_checkout_session_id, ''))) >= 4
          THEN right(btrim(l.stripe_checkout_session_id), 4)
          ELSE NULL::text
        END
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_stripe_checkout_session_id_tail4,
    (
      SELECT CASE
          WHEN length(btrim(COALESCE(l.stripe_payment_intent_id, ''))) >= 4
          THEN right(btrim(l.stripe_payment_intent_id), 4)
          ELSE NULL::text
        END
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_stripe_payment_intent_id_tail4
  FROM target_wallet AS tw
),

processed_events_stats AS (
  SELECT
    COUNT(*) FILTER (
      WHERE p.target_report_instance_id IS NOT NULL
        AND e.report_instance_id = p.target_report_instance_id
    )::bigint AS processed_events_for_target_report_instance_count,
    COUNT(*) FILTER (
      WHERE lower(btrim(COALESCE(e.product_key, ''))) = 'additional_reply_ticket'
    )::bigint AS processed_events_additional_reply_ticket_product_count,
    COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'processed')::bigint AS processed_events_status_processed_count,
    COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'received')::bigint AS processed_events_status_received_count,
    COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'rejected_not_owner')::bigint AS processed_events_status_rejected_not_owner_count,
    COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'rejected_wallet_inactive')::bigint AS processed_events_status_rejected_wallet_inactive_count,
    COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'skipped_cap')::bigint AS processed_events_status_skipped_cap_count,
    (
      COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'rejected_not_owner')
      + COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'rejected_wallet_inactive')
      + COUNT(*) FILTER (WHERE lower(btrim(COALESCE(e.status, ''))) = 'skipped_cap')
    )::bigint AS processed_events_status_rejected_or_skipped_total_count,
    (
      (
        SELECT COUNT(*)::bigint
        FROM public.stripe_processed_events AS x
        WHERE x.stripe_event_id IS NOT NULL
          AND length(btrim(x.stripe_event_id)) > 0
      )
      -
      (
        SELECT COUNT(DISTINCT btrim(x.stripe_event_id))::bigint
        FROM public.stripe_processed_events AS x
        WHERE x.stripe_event_id IS NOT NULL
          AND length(btrim(x.stripe_event_id)) > 0
      )
    ) AS processed_events_stripe_event_id_surplus_duplicate_rows
  FROM public.stripe_processed_events AS e
  CROSS JOIN params AS p
),

target_flags AS (
  SELECT
    p.target_report_instance_id AS bound_target_report_instance_id,
    (p.target_report_instance_id IS NOT NULL) AS target_parameter_bound_bool,
    EXISTS (SELECT 1 FROM target_snapshot) AS target_report_exists_bool,
    EXISTS (SELECT 1 FROM target_wallet) AS target_wallet_exists_bool,
    CASE
      WHEN p.operator_expected_owner_hash_hex16 IS NULL THEN NULL::boolean
      WHEN NOT EXISTS (SELECT 1 FROM target_snapshot) THEN false
      ELSE EXISTS (
          SELECT 1
          FROM target_snapshot AS ts
          WHERE lower(btrim(ts.owner_user_hash_hex16))
            = lower(btrim(p.operator_expected_owner_hash_hex16))
        )
    END AS ownership_matches_expected_operator_hash_bool
  FROM params AS p
),

checks AS (
  SELECT
    tf.bound_target_report_instance_id,
    tf.target_parameter_bound_bool,
    tf.target_report_exists_bool,
    tf.target_wallet_exists_bool,
    tf.ownership_matches_expected_operator_hash_bool,
    gc.stripe_processed_events_total_count,
    gc.reply_wallet_ledgers_total_count,
    eps.pre_stripe_processed_events_total_count,
    eps.pre_reply_wallet_ledgers_total_count,
    eps.pre_target_wallet_ledger_row_count,
    eps.pre_purchased_count,
    eps.pre_available_count,
    eps.pre_consumed_count,
    tw.purchased_count AS wallet_purchased_count,
    tw.available_count AS wallet_available_count,
    tw.consumed_count AS wallet_consumed_count,
    wls.ledger_row_count,
    wls.ledger_latest_delta,
    wls.ledger_latest_event_type,
    wls.ledger_latest_source_of_grant,
    wls.ledger_latest_product_key,
    wls.ledger_latest_balance_after,
    wls.ledger_latest_stripe_event_id_present_bool,
    wls.ledger_latest_stripe_checkout_session_id_present_bool,
    wls.ledger_latest_stripe_payment_intent_id_present_bool,
    pes.processed_events_for_target_report_instance_count,
    pes.processed_events_additional_reply_ticket_product_count,
    pes.processed_events_status_processed_count,
    pes.processed_events_status_received_count,
    pes.processed_events_status_rejected_or_skipped_total_count,
    pes.processed_events_stripe_event_id_surplus_duplicate_rows,

    (
      tw.wallet_id IS NOT NULL
      AND gc.stripe_processed_events_total_count = eps.pre_stripe_processed_events_total_count + 1
    ) AS expected_global_processed_events_delta_met_bool,

    (
      tw.wallet_id IS NOT NULL
      AND gc.reply_wallet_ledgers_total_count = eps.pre_reply_wallet_ledgers_total_count + 1
    ) AS expected_global_ledger_delta_met_bool,

    (
      tw.wallet_id IS NOT NULL
      AND COALESCE(wls.ledger_row_count, 0::bigint) = eps.pre_target_wallet_ledger_row_count + 1
    ) AS expected_target_wallet_ledger_delta_met_bool,

    (
      tw.wallet_id IS NOT NULL
      AND tw.purchased_count = eps.pre_purchased_count + 1
      AND tw.available_count = eps.pre_available_count + 1
      AND tw.consumed_count = eps.pre_consumed_count
    ) AS expected_target_wallet_counts_met_bool,

    (
      tw.wallet_id IS NOT NULL
      AND COALESCE(wls.ledger_latest_delta, 0) = 1
      AND COALESCE(wls.ledger_latest_event_type, '') = 'purchase_grant'
      AND COALESCE(wls.ledger_latest_source_of_grant, '') = 'PURCHASE'
      AND lower(btrim(COALESCE(wls.ledger_latest_product_key, ''))) = 'additional_reply_ticket'
      AND COALESCE(wls.ledger_latest_balance_after, -1) = 2
    ) AS expected_latest_ledger_met_bool,

    (
      tw.wallet_id IS NOT NULL
      AND COALESCE(wls.ledger_latest_stripe_event_id_present_bool, false)
      AND COALESCE(wls.ledger_latest_stripe_checkout_session_id_present_bool, false)
    ) AS expected_stripe_reference_present_bool,

    (
      tw.wallet_id IS NOT NULL
      AND pes.processed_events_for_target_report_instance_count = 1
    ) AS expected_target_processed_events_count_met_bool,

    (
      tw.wallet_id IS NOT NULL
      AND pes.processed_events_additional_reply_ticket_product_count = 1
    ) AS expected_additional_reply_ticket_processed_events_met_bool,

    (
      pes.processed_events_stripe_event_id_surplus_duplicate_rows = 0
    ) AS expected_no_stripe_event_id_duplicate_surplus_bool,

    (
      tw.wallet_id IS NOT NULL
      AND pes.processed_events_status_processed_count >= 1
      AND pes.processed_events_status_rejected_or_skipped_total_count = 0
    ) AS expected_processed_events_terminal_clean_bool,

    (
      CASE WHEN NOT tf.target_parameter_bound_bool THEN NULL::integer
      ELSE (
        CASE WHEN NOT tf.target_report_exists_bool THEN 1 ELSE 0 END
        + CASE WHEN tf.target_report_exists_bool AND NOT tf.target_wallet_exists_bool THEN 1 ELSE 0 END
        + CASE
            WHEN tf.ownership_matches_expected_operator_hash_bool IS FALSE THEN 1
            ELSE 0
          END
        + CASE WHEN tw.wallet_id IS NULL THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (
            gc.stripe_processed_events_total_count = eps.pre_stripe_processed_events_total_count + 1
          ) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (
            gc.reply_wallet_ledgers_total_count = eps.pre_reply_wallet_ledgers_total_count + 1
          ) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (
            COALESCE(wls.ledger_row_count, 0::bigint) = eps.pre_target_wallet_ledger_row_count + 1
          ) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (
            tw.purchased_count = eps.pre_purchased_count + 1
            AND tw.available_count = eps.pre_available_count + 1
            AND tw.consumed_count = eps.pre_consumed_count
          ) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (
            COALESCE(wls.ledger_latest_delta, 0) = 1
            AND COALESCE(wls.ledger_latest_event_type, '') = 'purchase_grant'
            AND COALESCE(wls.ledger_latest_source_of_grant, '') = 'PURCHASE'
            AND lower(btrim(COALESCE(wls.ledger_latest_product_key, ''))) = 'additional_reply_ticket'
            AND COALESCE(wls.ledger_latest_balance_after, -1) = 2
          ) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (
            COALESCE(wls.ledger_latest_stripe_event_id_present_bool, false)
            AND COALESCE(wls.ledger_latest_stripe_checkout_session_id_present_bool, false)
          ) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (pes.processed_events_for_target_report_instance_count = 1) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (pes.processed_events_additional_reply_ticket_product_count = 1) THEN 1 ELSE 0 END
        + CASE WHEN NOT (pes.processed_events_stripe_event_id_surplus_duplicate_rows = 0) THEN 1 ELSE 0 END
        + CASE WHEN tw.wallet_id IS NOT NULL AND NOT (
            pes.processed_events_status_processed_count >= 1
            AND pes.processed_events_status_rejected_or_skipped_total_count = 0
          ) THEN 1 ELSE 0 END
      )
      END
    ) AS summary_blocking_gap_count
  FROM global_counts AS gc
  CROSS JOIN params AS p
  CROSS JOIN expected_pre_from_ssot AS eps
  CROSS JOIN processed_events_stats AS pes
  CROSS JOIN target_flags AS tf
  LEFT JOIN target_wallet AS tw ON true
  LEFT JOIN wallet_ledger_stats AS wls ON wls.wallet_id = tw.wallet_id
)

SELECT
  gc.stripe_processed_events_total_count,
  gc.reply_ticket_wallets_total_count,
  gc.reply_wallet_ledgers_total_count,
  gc.reply_sessions_total_count,

  ck.bound_target_report_instance_id,
  ck.target_parameter_bound_bool,
  ck.target_report_exists_bool,
  ts.owner_user_hash_hex16,
  ck.ownership_matches_expected_operator_hash_bool,

  tw.wallet_id,
  tw.wallet_status_norm AS wallet_status,
  tw.initial_included_count,
  tw.purchased_count,
  tw.available_count,
  tw.consumed_count,
  tw.cap_reached_bool AS target_wallet_cap_reached_bool,

  eps.pre_stripe_processed_events_total_count,
  eps.pre_reply_wallet_ledgers_total_count,
  eps.pre_target_wallet_ledger_row_count,
  eps.pre_purchased_count,
  eps.pre_available_count,
  eps.pre_consumed_count,

  wls.ledger_row_count AS target_wallet_ledger_row_count,
  wls.ledger_latest_delta,
  wls.ledger_latest_event_type,
  wls.ledger_latest_source_of_grant,
  wls.ledger_latest_product_key,
  wls.ledger_latest_balance_after,
  wls.ledger_latest_stripe_event_id_present_bool,
  wls.ledger_latest_stripe_checkout_session_id_present_bool,
  wls.ledger_latest_stripe_payment_intent_id_present_bool,
  wls.ledger_latest_stripe_event_id_tail4,
  wls.ledger_latest_stripe_checkout_session_id_tail4,
  wls.ledger_latest_stripe_payment_intent_id_tail4,

  pes.processed_events_for_target_report_instance_count,
  pes.processed_events_additional_reply_ticket_product_count,
  pes.processed_events_status_processed_count,
  pes.processed_events_status_received_count,
  pes.processed_events_status_rejected_not_owner_count,
  pes.processed_events_status_rejected_wallet_inactive_count,
  pes.processed_events_status_skipped_cap_count,
  pes.processed_events_status_rejected_or_skipped_total_count,
  pes.processed_events_stripe_event_id_surplus_duplicate_rows,

  ck.expected_global_processed_events_delta_met_bool,
  ck.expected_global_ledger_delta_met_bool,
  ck.expected_target_wallet_ledger_delta_met_bool,
  ck.expected_target_wallet_counts_met_bool,
  ck.expected_latest_ledger_met_bool,
  ck.expected_stripe_reference_present_bool,
  ck.expected_target_processed_events_count_met_bool,
  ck.expected_additional_reply_ticket_processed_events_met_bool,
  ck.expected_no_stripe_event_id_duplicate_surplus_bool,
  ck.expected_processed_events_terminal_clean_bool,

  (
    ck.target_parameter_bound_bool
    AND ck.target_report_exists_bool
    AND ck.target_wallet_exists_bool
    AND ck.summary_blocking_gap_count IS NOT NULL
    AND ck.summary_blocking_gap_count = 0
    AND (
      ck.ownership_matches_expected_operator_hash_bool IS DISTINCT FROM false
    )
  ) AS post_fulfillment_ready_bool,

  false AS summary_secret_exposed_bool,
  false AS summary_raw_user_id_returned_bool,

  ck.summary_blocking_gap_count

FROM global_counts AS gc
CROSS JOIN params AS p
CROSS JOIN expected_pre_from_ssot AS eps
CROSS JOIN processed_events_stats AS pes
CROSS JOIN checks AS ck
LEFT JOIN target_snapshot AS ts ON true
LEFT JOIN target_wallet AS tw ON true
LEFT JOIN wallet_ledger_stats AS wls ON wls.wallet_id = tw.wallet_id;
