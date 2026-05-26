-- BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R — Production read-only postflight (counts/metadata only)
-- Target safe label: m55-soul-core PRODUCTION
-- Gate: BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R
-- Forbidden: INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/GRANT/NOTIFY · SELECT * · row samples with raw IDs
-- Run: section-by-section in Supabase SQL Editor · confirm current_database() first
-- Prior: m55_backend_commerce_contract_c_readonly_preflight_v1.sql (C-HUMAN-R / pre-apply)
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_POSTFLIGHT_R_2026-05-23.md

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. Contract-C object existence (post-apply expected) ═══
SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_consult_reply_commit'
) AS rpc_consult_reply_commit_exists;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'consult_send_commits'
) AS consult_send_commits_table_exists;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'reply_wallet_ledgers'
    AND column_name = 'consult_commit_id'
) AS reply_wallet_ledgers_consult_commit_id_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'reply_wallet_ledgers'
    AND c.conname = 'reply_wallet_ledgers_reply_consume_ref_check'
) AS reply_wallet_ledgers_reply_consume_ref_check_exists;

-- Expected post-apply: all true

-- ═══ 2. S-5 non-regression (same as preflight §1) ═══
SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_null_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active' AND available_count > 0;

SELECT COUNT(*)::bigint AS quarantine_apply_candidate_count
FROM (
  WITH null_w AS (
    SELECT
      w.status,
      w.purchased_count,
      (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
      (
        SELECT COUNT(*)::bigint
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = w.user_id
          AND s.product_id = 'DTR_CORE_STATIC_V1'
          AND s.user_hidden_at IS NULL
      ) AS visible_dtr_core_snapshot_count
    FROM public.reply_ticket_wallets AS w
    WHERE w.report_instance_id IS NULL
  )
  SELECT 1
  FROM null_w AS nw
  WHERE nw.status = 'active'
    AND nw.purchased_count = 0
    AND (nw.is_smoke_pattern OR nw.visible_dtr_core_snapshot_count = 0)
) AS candidates;

-- Expected: all 0

-- ═══ 3. Cap / dual-wallet (preflight §2–§3 subset) ═══
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

-- Expected: 0

-- ═══ 4. Existing RPC preservation ═══
SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_reply_generate_commit'
) AS rpc_reply_generate_commit_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
) AS rpc_fulfill_checkout_exists;

-- Expected: both true

-- ═══ 5. Ledger / idempotency baselines (post-C) ═══
SELECT COUNT(*)::bigint AS ledger_reply_consume_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'reply_consume';

SELECT COUNT(*)::bigint AS ledger_reply_consume_with_consult_commit_id
FROM public.reply_wallet_ledgers
WHERE event_type = 'reply_consume'
  AND consult_commit_id IS NOT NULL;

SELECT COUNT(*)::bigint AS consult_send_commits_total
FROM public.consult_send_commits;

SELECT COUNT(*)::bigint AS consult_send_commits_succeeded
FROM public.consult_send_commits
WHERE status = 'succeeded';

-- Baseline at deploy close (no send smoke): consult_send_commits_total often 0
-- ledger_reply_consume_total >= C-HUMAN-R pre-apply (4) · delta 0 until first post-C send

-- STOP if: rpc_consult_reply_commit_exists = false
-- STOP if: consult_send_commits_table_exists = false
-- STOP if: reply_wallet_ledgers_consult_commit_id_exists = false
-- STOP if: reply_wallet_ledgers_reply_consume_ref_check_exists = false
-- STOP if: wallets_null_status_active > 0 OR wallets_null_active_available_gt_0 > 0
-- STOP if: quarantine_apply_candidate_count > 0 OR wallets_cap_violation_rows > 0
-- STOP if: users_with_both_null_and_scoped_wallet > 0
-- STOP if: rpc_reply_generate_commit_exists = false OR rpc_fulfill_checkout_exists = false
