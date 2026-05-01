-- =============================================================================
-- M55 追加相談返書 — pre-fulfillment DB baseline (SELECT ONLY)
--
-- Purpose: read-only baseline rows for test payment / webhook fulfillment gates.
--   Companion SSOT: docs/ssot/M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_PACKET_v1.md
--   Parent gate: docs/ssot/M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1.md
--
-- HARD RULES:
--   - SELECT (+ WITH wrapping SELECT) ONLY — no INSERT/UPDATE/DELETE/DDL/SET/TRUNCATE.
--   - Do NOT project raw Clerk user_id, report/envelope bodies, birthdays,
--     Stripe secrets, webhook secrets, DB URLs, price ids, Checkout URLs, session ids.
--   - Ledger / processed_events: boolean only for whether Stripe reference columns
--     are populated — never emit stripe_event_id / stripe_checkout_session_id values.
--
-- Parameters (committed repo uses NULL — substitute ONLY in a local workspace copy):
--   - params.target_report_instance_id — UUID of owned snapshot for Checkout flow.
--   - params.operator_expected_owner_hash_hex16 — optional first 16 hex chars of
--       SHA256(UTF-8 bytes of trimmed snapshot owner Clerk id), from app helper
--       hashUserIdForLedgerLog — enables ownership_matches_expected_bool without raw id.
--
-- Requires PostgreSQL digest(..., 'sha256') (common: pgcrypto). If unavailable,
--   omit hash-dependent columns in a fork — do NOT add CREATE EXTENSION here.
--
-- Run policy: execution is separate approval; do not commit non-NULL parameter literals.
-- =============================================================================

WITH params AS (
  SELECT
    CAST(NULL AS uuid) AS target_report_instance_id,
    CAST(NULL AS text) AS operator_expected_owner_hash_hex16
  -- LOCAL ONLY: e.g. replace NULL uuid with 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
  --             replace operator hash NULL with '0123abcdefabcd01'::text (exactly hex16).
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
      SELECT
        COALESCE(l.stripe_event_id, '') <> ''
        OR COALESCE(l.stripe_checkout_session_id, '') <> ''
        OR COALESCE(l.stripe_payment_intent_id, '') <> ''
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS ledger_latest_has_stripe_reference_bool
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
    EXISTS (
        SELECT 1
        FROM target_wallet AS tw
        WHERE tw.wallet_status_norm = 'active'
      ) AS target_wallet_active_bool,
    EXISTS (
        SELECT 1
        FROM target_wallet AS tw
        WHERE tw.wallet_status_norm = 'active'
          AND NOT tw.cap_reached_bool
      ) AS target_cap_available_bool,
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

blocking AS (
  SELECT
    CASE
      WHEN NOT tf.target_parameter_bound_bool THEN NULL::integer
      ELSE (
          CASE WHEN NOT tf.target_report_exists_bool THEN 1 ELSE 0 END
          + CASE WHEN tf.target_report_exists_bool AND NOT tf.target_wallet_exists_bool THEN 1 ELSE 0 END
          + CASE WHEN tf.target_wallet_exists_bool AND NOT tf.target_wallet_active_bool THEN 1 ELSE 0 END
          + CASE WHEN tf.target_wallet_exists_bool AND tf.target_wallet_active_bool AND NOT tf.target_cap_available_bool THEN 1 ELSE 0 END
          + CASE
              WHEN tf.ownership_matches_expected_operator_hash_bool IS FALSE THEN 1
              ELSE 0
            END
        )
    END AS blocking_gap_count
  FROM target_flags AS tf
)

SELECT
  gc.stripe_processed_events_total_count,
  gc.reply_ticket_wallets_total_count,
  gc.reply_wallet_ledgers_total_count,
  gc.reply_sessions_total_count,

  tf.bound_target_report_instance_id,
  tf.target_parameter_bound_bool,
  tf.target_report_exists_bool,
  ts.owner_user_hash_hex16,
  tf.ownership_matches_expected_operator_hash_bool,

  tw.wallet_id,
  tw.wallet_status_norm AS wallet_status,
  tw.initial_included_count,
  tw.purchased_count,
  tw.available_count,
  tw.consumed_count,
  tw.cap_reached_bool AS target_wallet_cap_reached_bool,

  wls.ledger_row_count AS target_wallet_ledger_row_count,
  wls.ledger_latest_delta,
  wls.ledger_latest_event_type,
  wls.ledger_latest_source_of_grant,
  wls.ledger_latest_product_key,
  wls.ledger_latest_balance_after,
  wls.ledger_latest_has_stripe_reference_bool,

  pes.processed_events_for_target_report_instance_count,
  pes.processed_events_additional_reply_ticket_product_count,
  pes.processed_events_status_processed_count,
  pes.processed_events_status_received_count,
  pes.processed_events_status_rejected_not_owner_count,
  pes.processed_events_status_rejected_wallet_inactive_count,
  pes.processed_events_status_skipped_cap_count,
  pes.processed_events_stripe_event_id_surplus_duplicate_rows,

  (
    tf.target_parameter_bound_bool
    AND tf.target_report_exists_bool
    AND tf.target_wallet_exists_bool
    AND tf.target_wallet_active_bool
    AND tf.target_cap_available_bool
    AND (
      tf.ownership_matches_expected_operator_hash_bool IS DISTINCT FROM false
    )
  ) AS baseline_ready_bool,

  tf.target_report_exists_bool AS summary_target_report_exists,
  tf.target_wallet_exists_bool AS summary_target_wallet_exists,
  tf.target_wallet_active_bool AS summary_target_wallet_active,
  tf.target_cap_available_bool AS summary_target_cap_available,

  (
    gc.stripe_processed_events_total_count IS NOT NULL
    AND gc.reply_ticket_wallets_total_count IS NOT NULL
    AND gc.reply_wallet_ledgers_total_count IS NOT NULL
    AND gc.reply_sessions_total_count IS NOT NULL
  ) AS summary_global_counts_ready_bool,

  false AS summary_secret_exposed_bool,
  false AS summary_raw_user_id_returned_bool,

  b.blocking_gap_count AS summary_blocking_gap_count

FROM global_counts AS gc
CROSS JOIN params AS p
CROSS JOIN processed_events_stats AS pes
CROSS JOIN target_flags AS tf
CROSS JOIN blocking AS b
LEFT JOIN target_snapshot AS ts ON true
LEFT JOIN target_wallet AS tw ON true
LEFT JOIN wallet_ledger_stats AS wls ON wls.wallet_id = tw.wallet_id;
