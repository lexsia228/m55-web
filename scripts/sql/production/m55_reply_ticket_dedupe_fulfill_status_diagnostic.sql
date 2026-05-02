-- =============================================================================
-- M55 追加相談返書 — dedupe / fulfill status diagnostic (SELECT ONLY)
--
-- Companion SSOT: docs/ssot/M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_PACKET_v1.md
-- Parent gate: docs/ssot/M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_GATE_v1.md
--
-- HARD RULES:
--   SELECT (+ WITH wrapping SELECT) ONLY — no DML/DDL/SET/DO/TRUNCATE.
--   Do NOT project raw user_id, full Stripe ids, Checkout URLs, secrets,
--   report body, birthdays.
--   Do NOT project report_instance_id UUID in the final row — use booleans only.
--
-- RUN ORDER (mandatory):
--   1) Execute SECTION 1 — table preflight only (never fails on missing rel).
--   2) If ANY *_exists is false, STOP — fix migration/env before SECTION 2.
--   3) Execute SECTION 2 — bind params in `params` CTE LOCAL COPY ONLY (NULL here).
--
-- Requires PostgreSQL to_regclass (built-in).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1 — table preflight (safe even when tables are absent from catalog)
-- -----------------------------------------------------------------------------

SELECT
  (to_regclass('public.stripe_events') IS NOT NULL) AS public_stripe_events_exists,
  (to_regclass('public.stripe_processed_events') IS NOT NULL) AS public_stripe_processed_events_exists,
  (to_regclass('public.reply_ticket_wallets') IS NOT NULL) AS public_reply_ticket_wallets_exists,
  (to_regclass('public.reply_wallet_ledgers') IS NOT NULL) AS public_reply_wallet_ledgers_exists,
  (to_regclass('public.reply_sessions') IS NOT NULL) AS public_reply_sessions_exists,
  (to_regclass('public.dtr_report_snapshots') IS NOT NULL) AS public_dtr_report_snapshots_exists;

-- -----------------------------------------------------------------------------
-- SECTION 2 — diagnostic row (run ONLY when SECTION 1 shows all *_exists true)
--
-- LOCAL ONLY — replace NULLs in params (never commit literals):
--   target_stripe_event_id — exact Stripe Event id string for dedupe row lookup.
--   target_report_instance_id — UUID for wallet/ledger/processed_events scope.
--   pre_purchased_count / pre_available_count — optional baselines for delta hint;
--       leave NULL if unknown → wallet_counts_changed stays unknown.
-- -----------------------------------------------------------------------------

WITH params AS (
  SELECT
    CAST(NULL AS text) AS target_stripe_event_id,
    CAST(NULL AS uuid) AS target_report_instance_id,
    CAST(NULL AS integer) AS pre_purchased_count,
    CAST(NULL AS integer) AS pre_available_count
),

generic_ev AS (
  SELECT
    (SELECT COUNT(*)::bigint FROM public.stripe_events) AS generic_stripe_events_total_count,
    (
      EXISTS (
        SELECT 1
        FROM public.stripe_events AS e
        CROSS JOIN params AS p
        WHERE p.target_stripe_event_id IS NOT NULL
          AND length(btrim(p.target_stripe_event_id)) > 0
          AND btrim(e.event_id) = btrim(p.target_stripe_event_id)
      )
    ) AS generic_stripe_events_has_target_event_bool,
    (
      SELECT COALESCE(bool_and(lower(btrim(e.event_type)) = 'checkout.session.completed'), false)
      FROM public.stripe_events AS e
      CROSS JOIN params AS p
      WHERE p.target_stripe_event_id IS NOT NULL
        AND length(btrim(p.target_stripe_event_id)) > 0
        AND btrim(e.event_id) = btrim(p.target_stripe_event_id)
    ) AS generic_stripe_events_target_event_type_checkout_completed_bool
  FROM params AS p
),

processed_ev AS (
  SELECT
    (SELECT COUNT(*)::bigint FROM public.stripe_processed_events) AS stripe_processed_events_total_count,
    (
      EXISTS (
        SELECT 1
        FROM public.stripe_processed_events AS pe
        CROSS JOIN params AS p
        WHERE p.target_stripe_event_id IS NOT NULL
          AND length(btrim(p.target_stripe_event_id)) > 0
          AND btrim(pe.stripe_event_id) = btrim(p.target_stripe_event_id)
      )
    ) AS processed_events_has_target_event_bool,
    (
      EXISTS (
        SELECT 1
        FROM public.stripe_processed_events AS pe
        CROSS JOIN params AS p
        WHERE p.target_report_instance_id IS NOT NULL
          AND pe.report_instance_id = p.target_report_instance_id
      )
    ) AS processed_events_has_target_report_bool,
    (
      SELECT COUNT(*)::bigint
      FROM public.stripe_processed_events AS pe
      WHERE lower(btrim(COALESCE(pe.product_key, ''))) = 'additional_reply_ticket'
    ) AS processed_events_additional_reply_ticket_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.stripe_processed_events AS pe
      WHERE lower(btrim(COALESCE(pe.status, ''))) = 'processed'
    ) AS processed_events_status_processed_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.stripe_processed_events AS pe
      WHERE lower(btrim(COALESCE(pe.status, ''))) = 'duplicate_noop'
    ) AS processed_events_status_duplicate_noop_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.stripe_processed_events AS pe
      WHERE lower(btrim(COALESCE(pe.status, ''))) IN (
          'rejected_not_owner',
          'rejected_wallet_inactive',
          'rejected_invalid_product'
        )
    ) AS processed_events_status_rejected_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.stripe_processed_events AS pe
      WHERE lower(btrim(COALESCE(pe.status, ''))) = 'skipped_cap'
    ) AS processed_events_status_skipped_count
  FROM params AS p
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

ledger_stats AS (
  SELECT
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
    ) AS target_wallet_ledger_row_count,
    (
      EXISTS (
        SELECT 1
        FROM public.reply_wallet_ledgers AS l
        WHERE l.wallet_id = tw.wallet_id
          AND lower(btrim(COALESCE(l.event_type, ''))) = 'purchase_grant'
          AND COALESCE(l.source_of_grant, '') = 'PURCHASE'
          AND lower(btrim(COALESCE(l.product_key, ''))) = 'additional_reply_ticket'
      )
    ) AS ledger_purchase_grant_exists_bool,
    (
      SELECT l.event_type
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS latest_ledger_event_type,
    (
      SELECT l.source_of_grant
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS latest_ledger_source_of_grant,
    (
      SELECT l.product_key
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS latest_ledger_product_key,
    (
      SELECT l.balance_after
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS latest_ledger_balance_after,
    (
      SELECT
        COALESCE(l.stripe_event_id, '') <> ''
        OR COALESCE(l.stripe_checkout_session_id, '') <> ''
        OR COALESCE(l.stripe_payment_intent_id, '') <> ''
      FROM public.reply_wallet_ledgers AS l
      WHERE l.wallet_id = tw.wallet_id
      ORDER BY l.created_at DESC NULLS LAST, l.id DESC NULLS LAST
      LIMIT 1
    ) AS stripe_reference_present_bool
  FROM target_wallet AS tw
),

wallet_counts AS (
  SELECT
    CASE
      WHEN NOT EXISTS (
          SELECT 1 FROM params AS px WHERE px.pre_purchased_count IS NOT NULL AND px.pre_available_count IS NOT NULL
        )
      THEN NULL::boolean
      WHEN NOT EXISTS (SELECT 1 FROM target_wallet) THEN NULL::boolean
      ELSE (
          EXISTS (
              SELECT 1
              FROM target_wallet AS tw
              CROSS JOIN params AS px
              WHERE px.pre_purchased_count IS NOT NULL
                AND px.pre_available_count IS NOT NULL
                AND (
                  tw.purchased_count IS DISTINCT FROM px.pre_purchased_count
                  OR tw.available_count IS DISTINCT FROM px.pre_available_count
                )
            )
        )
    END AS wallet_counts_changed_bool
  FROM params AS p
),

flags AS (
  SELECT
    pb.target_report_bound_bool,
    pb.target_report_exists_bool,
    pb.target_wallet_exists_bool,
    wc.wallet_counts_changed_bool,
    CASE
      WHEN ge.generic_stripe_events_has_target_event_bool
        AND NOT pe.processed_events_has_target_event_bool
      THEN true
      ELSE false
    END AS suspected_global_dedupe_before_reply_lane_bool,
    CASE
      WHEN pe.processed_events_has_target_event_bool
        AND wc.wallet_counts_changed_bool IS FALSE
      THEN true
      ELSE false
    END AS suspected_reply_lane_status_noop_or_rejected_bool,
    CASE
      WHEN wc.wallet_counts_changed_bool IS TRUE
        AND COALESCE(ls.ledger_purchase_grant_exists_bool, false)
      THEN true
      ELSE false
    END AS suspected_fulfillment_processed_bool
  FROM params AS p
  CROSS JOIN generic_ev AS ge
  CROSS JOIN processed_ev AS pe
  CROSS JOIN wallet_counts AS wc
  CROSS JOIN LATERAL (
      SELECT
        (SELECT q.target_report_instance_id IS NOT NULL FROM params AS q) AS target_report_bound_bool,
        EXISTS (
            SELECT 1
            FROM public.dtr_report_snapshots AS s
            CROSS JOIN params AS q
            WHERE q.target_report_instance_id IS NOT NULL
              AND s.id = q.target_report_instance_id
          ) AS target_report_exists_bool,
        EXISTS (SELECT 1 FROM target_wallet) AS target_wallet_exists_bool
    ) AS pb
  LEFT JOIN ledger_stats AS ls ON true
),

blocking AS (
  SELECT
    (
      CASE WHEN NOT fl.target_report_bound_bool THEN 1 ELSE 0 END
      + CASE WHEN NOT fl.target_report_exists_bool THEN 1 ELSE 0 END
      + CASE WHEN NOT fl.target_wallet_exists_bool THEN 1 ELSE 0 END
    )::integer AS summary_blocking_gap_count
  FROM flags AS fl
)

SELECT
  ge.generic_stripe_events_total_count,
  ge.generic_stripe_events_has_target_event_bool AS generic_stripe_events_has_target_event,
  ge.generic_stripe_events_target_event_type_checkout_completed_bool,

  pe.stripe_processed_events_total_count,
  pe.processed_events_has_target_event_bool AS processed_events_has_target_event,
  pe.processed_events_has_target_report_bool AS processed_events_has_target_report,
  pe.processed_events_additional_reply_ticket_count,
  pe.processed_events_status_processed_count,
  pe.processed_events_status_duplicate_noop_count,
  pe.processed_events_status_rejected_count,
  pe.processed_events_status_skipped_count,

  fl.target_report_bound_bool,
  fl.target_report_exists_bool,
  fl.target_wallet_exists_bool,
  tw.wallet_status_norm AS target_wallet_status,
  tw.initial_included_count,
  tw.purchased_count,
  tw.available_count,
  tw.consumed_count,
  tw.cap_reached_bool,

  COALESCE(ls.target_wallet_ledger_row_count, 0::bigint) AS target_wallet_ledger_row_count,
  COALESCE(ls.ledger_purchase_grant_exists_bool, false) AS ledger_purchase_grant_exists,
  ls.latest_ledger_event_type,
  ls.latest_ledger_source_of_grant,
  ls.latest_ledger_product_key,
  ls.latest_ledger_balance_after,
  COALESCE(ls.stripe_reference_present_bool, false) AS stripe_reference_present_bool,

  fl.wallet_counts_changed_bool,

  fl.suspected_global_dedupe_before_reply_lane_bool AS suspected_global_dedupe_before_reply_lane,
  fl.suspected_reply_lane_status_noop_or_rejected_bool AS suspected_reply_lane_status_noop_or_rejected,
  fl.suspected_fulfillment_processed_bool AS suspected_fulfillment_processed,

  (
    fl.target_report_bound_bool
    AND fl.target_report_exists_bool
    AND EXISTS (
        SELECT 1 FROM params AS px WHERE px.target_stripe_event_id IS NOT NULL AND length(btrim(px.target_stripe_event_id)) > 0
      )
  ) AS diagnostic_ready_bool,

  ge.generic_stripe_events_has_target_event_bool AS summary_generic_stripe_events_has_target_event,
  pe.processed_events_has_target_event_bool AS summary_processed_events_has_target_event,
  pe.processed_events_has_target_report_bool AS summary_processed_events_has_target_report,
  fl.wallet_counts_changed_bool AS summary_wallet_counts_changed,
  COALESCE(ls.ledger_purchase_grant_exists_bool, false) AS summary_ledger_purchase_grant_exists,
  fl.suspected_global_dedupe_before_reply_lane_bool AS summary_suspected_global_dedupe_before_reply_lane,
  fl.suspected_reply_lane_status_noop_or_rejected_bool AS summary_suspected_reply_lane_status_noop_or_rejected,
  fl.suspected_fulfillment_processed_bool AS summary_suspected_fulfillment_processed,

  false AS summary_secret_exposed_bool,
  false AS summary_raw_user_id_returned_bool,

  blk.summary_blocking_gap_count

FROM params AS p
CROSS JOIN generic_ev AS ge
CROSS JOIN processed_ev AS pe
CROSS JOIN flags AS fl
CROSS JOIN blocking AS blk
LEFT JOIN target_wallet AS tw ON true
LEFT JOIN ledger_stats AS ls ON true;
