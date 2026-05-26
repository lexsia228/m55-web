-- M55 FRESH-INCLUDED-REPLY-CONSUME-SQL-R — Production read-only post-consume attestation
-- Target: m55-soul-core PRODUCTION
-- Cohort: launch-cohort-primary (M55-core-Development namespace)
-- Gate: FRESH-INCLUDED-REPLY-CONSUME-SQL-R · after exactly one included reply send
-- Forbidden: INSERT/UPDATE/DELETE/ALTER · SELECT * · raw user_id / email / Stripe output
-- Operator: set params.operator_user_hash_hex16 locally ONLY (16-char sha256 prefix via hashUserIdForLedgerLog)
-- SSOT: docs/ssot/M55_FRESH_INCLUDED_REPLY_CONSUME_SQL_R_2026-05-24.md

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. S-5 guard (global · must be 0) ═══
SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_null_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active' AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

SELECT COUNT(*)::bigint AS users_with_both_null_and_scoped_wallet
FROM (
  SELECT w.user_id
  FROM public.reply_ticket_wallets AS w
  GROUP BY w.user_id
  HAVING COUNT(*) FILTER (WHERE w.report_instance_id IS NULL) > 0
     AND COUNT(*) FILTER (WHERE w.report_instance_id IS NOT NULL) > 0
) AS dual;

-- STOP if any S-5 metric > 0

-- ═══ 2. Cohort anchor (operator hash · LOCAL param only) ═══
WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
  -- LOCAL ONLY: 16-hex prefix from hashUserIdForLedgerLog(clerk_user_id) for launch-cohort-primary
),
cohort_users AS (
  SELECT DISTINCT btrim(s.user_id) AS user_id
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN params AS p
  WHERE p.operator_user_hash_hex16 IS NOT NULL
    AND s.product_id = 'DTR_CORE_STATIC_V1'
    AND substring(
      encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) = btrim(lower(p.operator_user_hash_hex16))
)
SELECT
  (p.operator_user_hash_hex16 IS NOT NULL) AS operator_hash_bound_bool,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (SELECT COUNT(*)::bigint FROM cohort_users)
    END
  ) AS cohort_user_count,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.dtr_report_snapshots AS s
        INNER JOIN cohort_users AS c ON c.user_id = btrim(s.user_id)
        WHERE s.product_id = 'DTR_CORE_STATIC_V1'
          AND s.user_hidden_at IS NULL
      )
    END
  ) AS cohort_visible_snapshot_count
FROM params AS p;

-- Expected post-fulfillment + post-consume: cohort_user_count = 1 · cohort_visible_snapshot_count = 1

-- ═══ 3. Cohort wallet post-consume (aggregates only) ═══
WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
),
cohort_users AS (
  SELECT DISTINCT btrim(s.user_id) AS user_id
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN params AS p
  WHERE p.operator_user_hash_hex16 IS NOT NULL
    AND s.product_id = 'DTR_CORE_STATIC_V1'
    AND substring(
      encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) = btrim(lower(p.operator_user_hash_hex16))
)
SELECT
  COUNT(*)::bigint AS cohort_scoped_active_wallet_count,
  COALESCE(MAX(w.available_count), 0)::bigint AS cohort_scoped_available_count_max,
  COALESCE(SUM(w.available_count), 0)::bigint AS cohort_scoped_available_count_sum,
  COALESCE(MAX(w.consumed_count), 0)::bigint AS cohort_scoped_consumed_count_max,
  COALESCE(SUM(w.consumed_count), 0)::bigint AS cohort_scoped_consumed_count_sum,
  COUNT(*) FILTER (WHERE w.report_instance_id IS NOT NULL)::bigint AS cohort_scoped_wallet_rows_total
FROM public.reply_ticket_wallets AS w
INNER JOIN cohort_users AS c ON c.user_id = btrim(w.user_id)
CROSS JOIN params AS p
WHERE p.operator_user_hash_hex16 IS NOT NULL
  AND w.status = 'active';

-- Expected post-consume (one included send):
--   cohort_scoped_active_wallet_count >= 1
--   cohort_scoped_available_count_max = 0
--   cohort_scoped_available_count_sum = 0
--   cohort_scoped_consumed_count_max >= 1
--   cohort_scoped_wallet_rows_total >= 1 (typically 1 scoped row)

-- ═══ 4. Cohort ledger (included_grant + reply_consume) ═══
WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
),
cohort_users AS (
  SELECT DISTINCT btrim(s.user_id) AS user_id
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN params AS p
  WHERE p.operator_user_hash_hex16 IS NOT NULL
    AND s.product_id = 'DTR_CORE_STATIC_V1'
    AND substring(
      encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) = btrim(lower(p.operator_user_hash_hex16))
)
SELECT
  COUNT(*) FILTER (WHERE l.event_type = 'included_grant')::bigint AS cohort_included_grant_ledger_count,
  COUNT(*) FILTER (WHERE l.event_type = 'reply_consume')::bigint AS cohort_reply_consume_ledger_count,
  COUNT(*) FILTER (
    WHERE l.event_type = 'reply_consume' AND l.consult_commit_id IS NOT NULL
  )::bigint AS cohort_reply_consume_with_consult_commit_id_count,
  COUNT(*) FILTER (WHERE l.event_type = 'purchase_grant')::bigint AS cohort_purchase_grant_ledger_count
FROM public.reply_wallet_ledgers AS l
INNER JOIN cohort_users AS c ON c.user_id = btrim(l.user_id)
CROSS JOIN params AS p
WHERE p.operator_user_hash_hex16 IS NOT NULL;

-- Expected:
--   cohort_included_grant_ledger_count >= 1
--   cohort_reply_consume_ledger_count = 1  (exactly one consume — STOP if > 1)
--   cohort_reply_consume_with_consult_commit_id_count = 1 if consult RPC path used
--   cohort_purchase_grant_ledger_count = 0  (no ¥500 additional purchase)

-- ═══ 5. Cohort consult_send_commits (if table exists) ═══
WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
),
cohort_users AS (
  SELECT DISTINCT btrim(s.user_id) AS user_id
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN params AS p
  WHERE p.operator_user_hash_hex16 IS NOT NULL
    AND s.product_id = 'DTR_CORE_STATIC_V1'
    AND substring(
      encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) = btrim(lower(p.operator_user_hash_hex16))
)
SELECT
  COUNT(*)::bigint AS cohort_consult_send_commits_total,
  COUNT(*) FILTER (WHERE csc.status = 'succeeded')::bigint AS cohort_consult_send_commits_succeeded,
  COUNT(*) FILTER (WHERE csc.status = 'pending')::bigint AS cohort_consult_send_commits_pending,
  COUNT(*) FILTER (WHERE csc.status = 'failed')::bigint AS cohort_consult_send_commits_failed
FROM public.consult_send_commits AS csc
INNER JOIN cohort_users AS cu ON cu.user_id = btrim(csc.user_id)
CROSS JOIN params AS p
WHERE p.operator_user_hash_hex16 IS NOT NULL;

-- Expected:
--   cohort_consult_send_commits_succeeded = 1
--   cohort_consult_send_commits_failed = 0
--   cohort_consult_send_commits_total = 1 (STOP if > 1 without idempotency proof)

-- ═══ 6. Global consult/ledger baselines (delta context only · not cohort proof) ═══
SELECT COUNT(*)::bigint AS ledger_reply_consume_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'reply_consume';

SELECT COUNT(*)::bigint AS consult_send_commits_succeeded_total
FROM public.consult_send_commits
WHERE status = 'succeeded';

-- Record counts only in SSOT · compare to pre-consume anchor if known

-- ═══ 7. PASS / STOP rubric (Human classification) ═══
-- GREEN when ALL:
--   operator_hash_bound_bool = true
--   cohort_visible_snapshot_count = 1
--   cohort_scoped_available_count_max = 0
--   cohort_scoped_consumed_count_max >= 1
--   cohort_included_grant_ledger_count >= 1
--   cohort_reply_consume_ledger_count = 1
--   cohort_consult_send_commits_succeeded = 1 (if table populated)
--   cohort_consult_send_commits_failed = 0
--   cohort_purchase_grant_ledger_count = 0
--   all S-5 §1 metrics = 0
-- BLOCK if cohort_reply_consume_ledger_count > 1 (duplicate consume)
-- BLOCK if wallets_cap_violation_rows > 0 or users_with_both_null_and_scoped_wallet > 0
