-- BACKEND-COMMERCE-CONTRACT-C — Production read-only preflight (counts/metadata only)
-- Target safe label: m55-soul-core PRODUCTION
-- Gate: BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING / future C-HUMAN-R
-- Forbidden: INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/GRANT/NOTIFY · SELECT * · row samples with raw IDs
-- Run: section-by-section in Supabase SQL Editor · confirm current_database() first
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_HUMAN_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md
-- Prior: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_READONLY_PREFLIGHT_PLANNING_2026-05-23.md
-- Prior: m55_backend_commerce_contract_b_readonly_preflight_v1.sql · B3 S-5 combined POSTFLIGHT-R

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. S-5 spendability anchor (B3 combined POSTFLIGHT-R) ═══
SELECT COUNT(*)::bigint AS wallets_null_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_null_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active' AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_status_closed
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'closed';

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

-- Expected after B3: null_active=0 · null_available=0 · quarantine_candidate=0 · null_closed=4

-- ═══ 2. Scoped wallet inventory (consume authority target) ═══
SELECT COUNT(*)::bigint AS wallets_with_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL;

SELECT COUNT(*)::bigint AS wallets_scoped_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_scoped_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL AND status = 'active' AND available_count > 0;

SELECT COUNT(*)::bigint AS users_with_both_null_and_scoped_wallet
FROM (
  SELECT w.user_id
  FROM public.reply_ticket_wallets AS w
  GROUP BY w.user_id
  HAVING COUNT(*) FILTER (WHERE w.report_instance_id IS NULL) > 0
     AND COUNT(*) FILTER (WHERE w.report_instance_id IS NOT NULL) > 0
) AS dual;

-- ═══ 3. Cap=5 wallet invariant + cap=3 thread drift ═══
SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

SELECT COUNT(*)::bigint AS consult_threads_credits_total_gt_3
FROM public.consult_threads
WHERE credits_total > 3;

SELECT COUNT(*)::bigint AS consult_threads_credits_remaining_gt_5
FROM public.consult_threads
WHERE credits_remaining > 5;

-- ═══ 4. Ledger consume coverage (planning signal) ═══
SELECT COUNT(*)::bigint AS ledger_reply_consume_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'reply_consume';

SELECT COUNT(*)::bigint AS wallets_scoped_consumed_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL AND consumed_count > 0;

-- Planning signal only: consumed wallets without any reply_consume ledger rows for wallet
-- (aggregate mismatch probe — not row-level output)
SELECT COUNT(*)::bigint AS scoped_wallets_consumed_without_reply_consume_ledger
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NOT NULL
  AND w.consumed_count > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.reply_wallet_ledgers AS l
    WHERE l.wallet_id = w.id
      AND l.event_type = 'reply_consume'
  );

-- ═══ 5. RPC catalog (current vs target) ═══
SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_reply_generate_commit'
) AS rpc_reply_generate_commit_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_consult_reply_commit'
) AS rpc_consult_reply_commit_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
) AS rpc_fulfill_checkout_exists;

-- ═══ 6. Idempotency readiness (consult send has none today) ═══
SELECT COUNT(*)::bigint AS reply_sessions_idempotency_unique_count
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'reply_sessions'
  AND c.contype = 'u';

-- STOP if: wallets_null_status_active > 0 OR wallets_null_active_available_gt_0 > 0
-- STOP if: quarantine_apply_candidate_count > 0 OR wallets_cap_violation_rows > 0
-- STOP if: users_with_both_null_and_scoped_wallet > 0
-- Planning note: rpc_consult_reply_commit_exists=false expected until Contract-C migration
