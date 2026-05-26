-- BACKEND-COMMERCE-CONTRACT-B2 — Null-scope wallet compatibility / backfill read-only preflight
-- Target safe label: m55-soul-core PRODUCTION
-- Gate: BACKEND-COMMERCE-CONTRACT-B2-R Human attestation (read-only · counts only · no mutation)
-- Result SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B2_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md
-- Forbidden: INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/GRANT/NOTIFY · SELECT * · row samples with raw IDs
-- Run: section-by-section in Supabase SQL Editor · confirm current_database() first
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B2_NULL_SCOPE_WALLET_COMPATIBILITY_BACKFILL_PLANNING_2026-05-23.md
-- Prior: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B_HUMAN_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md
-- Related (legacy wallet phase): scripts/sql/production/m55_reply_wallet_phase_b1_wallet_preflight.sql

-- DTR_CORE_PRODUCT_KEY = 'DTR_CORE_STATIC_V1'

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dtr_report_snapshots'
    AND column_name = 'user_hidden_at'
) AS dtr_user_hidden_at_column_exists;

-- ═══ 1. B-HUMAN-R baseline reconciliation (null-scope cohort) ═══
SELECT COUNT(*)::bigint AS wallets_total
FROM public.reply_ticket_wallets;

SELECT COUNT(*)::bigint AS wallets_null_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS wallets_with_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL;

SELECT COUNT(*)::bigint AS wallets_null_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_initial_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND initial_included_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_purchased_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND purchased_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_consumed_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND consumed_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

-- ═══ 2. Null-scope shape classification (included-only legacy signal) ═══
SELECT COUNT(*)::bigint AS wallets_null_included_only_purchased_zero
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL
  AND purchased_count = 0
  AND initial_included_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_included_only_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL
  AND purchased_count = 0
  AND initial_included_count > 0
  AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_included_only_consumed_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL
  AND purchased_count = 0
  AND initial_included_count > 0
  AND consumed_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_fully_depleted
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL
  AND available_count = 0;

-- ═══ 3. Visible DTR snapshot relation for null-scope wallets (aggregate buckets) ═══
WITH null_w AS (
  SELECT w.user_id
  FROM public.reply_ticket_wallets AS w
  WHERE w.report_instance_id IS NULL
),
snap_counts AS (
  SELECT
    nw.user_id,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = nw.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_core_snapshot_count_all,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = nw.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND (
          NOT EXISTS (
            SELECT 1 FROM information_schema.columns AS c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'dtr_report_snapshots'
              AND c.column_name = 'user_hidden_at'
          )
          OR s.user_hidden_at IS NULL
        )
    ) AS dtr_core_visible_snapshot_count
  FROM null_w AS nw
)
SELECT
  COUNT(*) FILTER (WHERE dtr_core_snapshot_count_all = 0)::bigint AS null_wallets_owner_dtr_all_zero,
  COUNT(*) FILTER (WHERE dtr_core_snapshot_count_all = 1)::bigint AS null_wallets_owner_dtr_all_one,
  COUNT(*) FILTER (WHERE dtr_core_snapshot_count_all > 1)::bigint AS null_wallets_owner_dtr_all_gt_one,
  COUNT(*) FILTER (WHERE dtr_core_visible_snapshot_count = 0)::bigint AS null_wallets_owner_visible_zero,
  COUNT(*) FILTER (WHERE dtr_core_visible_snapshot_count = 1)::bigint AS null_wallets_owner_visible_one,
  COUNT(*) FILTER (WHERE dtr_core_visible_snapshot_count > 1)::bigint AS null_wallets_owner_visible_gt_one
FROM snap_counts;

-- ═══ 4. Dual-row / scoped conflict (same user owns null-scope AND scoped wallet) ═══
SELECT COUNT(DISTINCT n.user_id)::bigint AS users_with_null_scope_wallet
FROM public.reply_ticket_wallets AS n
WHERE n.report_instance_id IS NULL;

SELECT COUNT(DISTINCT s.user_id)::bigint AS users_with_scoped_wallet
FROM public.reply_ticket_wallets AS s
WHERE s.report_instance_id IS NOT NULL;

SELECT COUNT(*)::bigint AS users_with_both_null_and_scoped_wallet
FROM (
  SELECT n.user_id
  FROM public.reply_ticket_wallets AS n
  WHERE n.report_instance_id IS NULL
  INTERSECT
  SELECT s.user_id
  FROM public.reply_ticket_wallets AS s
  WHERE s.report_instance_id IS NOT NULL
) AS dual_users;

SELECT COUNT(*)::bigint AS null_wallets_on_dual_wallet_users
FROM public.reply_ticket_wallets AS n
WHERE n.report_instance_id IS NULL
  AND n.user_id IN (
    SELECT n2.user_id
    FROM public.reply_ticket_wallets AS n2
    WHERE n2.report_instance_id IS NULL
    INTERSECT
    SELECT s.user_id
    FROM public.reply_ticket_wallets AS s
    WHERE s.report_instance_id IS NOT NULL
  );

-- ═══ 5. B2 candidate classification (counts only · null-scope wallets) ═══
WITH null_w AS (
  SELECT
    w.id AS wallet_id,
    w.user_id,
    w.status,
    w.available_count,
    w.purchased_count,
    w.initial_included_count,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND (
          NOT EXISTS (
            SELECT 1 FROM information_schema.columns AS c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'dtr_report_snapshots'
              AND c.column_name = 'user_hidden_at'
          )
          OR s.user_hidden_at IS NULL
        )
    ) AS visible_dtr_core_snapshot_count,
    EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS s
      WHERE s.user_id = w.user_id
        AND s.report_instance_id IS NOT NULL
        AND s.status = 'active'
    ) AS user_has_active_scoped_wallet
  FROM public.reply_ticket_wallets AS w
  WHERE w.report_instance_id IS NULL
),
classified AS (
  SELECT
    nw.*,
    CASE
      WHEN nw.is_smoke_pattern THEN 'smoke_quarantine'
      WHEN nw.user_has_active_scoped_wallet THEN 'dual_wallet_scoped_conflict'
      WHEN nw.visible_dtr_core_snapshot_count = 0 THEN 'no_visible_snapshot_quarantine'
      WHEN nw.visible_dtr_core_snapshot_count > 1 THEN 'multiple_visible_snapshot_manual'
      WHEN nw.visible_dtr_core_snapshot_count = 1
           AND nw.purchased_count = 0
           AND nw.status = 'active' THEN 'safe_backfill_candidate'
      WHEN nw.visible_dtr_core_snapshot_count = 1 THEN 'visible_one_but_ineligible_shape'
      ELSE 'unclassified_manual'
    END AS b2_class
  FROM null_w AS nw
)
SELECT
  COUNT(*) FILTER (WHERE b2_class = 'safe_backfill_candidate')::bigint AS bucket_safe_backfill_candidate,
  COUNT(*) FILTER (WHERE b2_class = 'dual_wallet_scoped_conflict')::bigint AS bucket_dual_wallet_scoped_conflict,
  COUNT(*) FILTER (WHERE b2_class = 'no_visible_snapshot_quarantine')::bigint AS bucket_no_visible_snapshot_quarantine,
  COUNT(*) FILTER (WHERE b2_class = 'multiple_visible_snapshot_manual')::bigint AS bucket_multiple_visible_snapshot_manual,
  COUNT(*) FILTER (WHERE b2_class = 'smoke_quarantine')::bigint AS bucket_smoke_quarantine,
  COUNT(*) FILTER (WHERE b2_class = 'visible_one_but_ineligible_shape')::bigint AS bucket_visible_one_but_ineligible_shape,
  COUNT(*) FILTER (WHERE b2_class = 'unclassified_manual')::bigint AS bucket_unclassified_manual
FROM classified;

-- ═══ 6. Strict backfill eligibility (automated UPDATE candidate · planning metric only) ═══
WITH null_w AS (
  SELECT
    w.id AS wallet_id,
    w.user_id,
    w.status,
    w.available_count,
    w.purchased_count,
    w.initial_included_count,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND (
          NOT EXISTS (
            SELECT 1 FROM information_schema.columns AS c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'dtr_report_snapshots'
              AND c.column_name = 'user_hidden_at'
          )
          OR s.user_hidden_at IS NULL
        )
    ) AS visible_dtr_core_snapshot_count
  FROM public.reply_ticket_wallets AS w
  WHERE w.report_instance_id IS NULL
),
eligible AS (
  SELECT nw.*
  FROM null_w AS nw
  WHERE NOT nw.is_smoke_pattern
    AND nw.status = 'active'
    AND nw.purchased_count = 0
    AND nw.initial_included_count > 0
    AND nw.visible_dtr_core_snapshot_count = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS s
      WHERE s.user_id = nw.user_id
        AND s.report_instance_id IS NOT NULL
        AND s.status = 'active'
    )
)
SELECT COUNT(*)::bigint AS strict_backfill_eligible_count FROM eligible;

SELECT COUNT(*)::bigint AS strict_backfill_eligible_available_gt_0
FROM (
  SELECT nw.*
  FROM public.reply_ticket_wallets AS nw
  WHERE nw.report_instance_id IS NULL
    AND NOT (nw.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR nw.user_id LIKE 'smoke_user%')
    AND nw.status = 'active'
    AND nw.purchased_count = 0
    AND nw.initial_included_count > 0
    AND (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = nw.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND (
          NOT EXISTS (
            SELECT 1 FROM information_schema.columns AS c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'dtr_report_snapshots'
              AND c.column_name = 'user_hidden_at'
          )
          OR s.user_hidden_at IS NULL
        )
    ) = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS s
      WHERE s.user_id = nw.user_id
        AND s.report_instance_id IS NOT NULL
        AND s.status = 'active'
    )
) AS e
WHERE e.available_count > 0;

-- ═══ 7. Ambiguity / unmatched / hold cohort totals ═══
WITH null_w AS (
  SELECT
    w.user_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND (
          NOT EXISTS (
            SELECT 1 FROM information_schema.columns AS c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'dtr_report_snapshots'
              AND c.column_name = 'user_hidden_at'
          )
          OR s.user_hidden_at IS NULL
        )
    ) AS visible_dtr_core_snapshot_count,
    EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS s
      WHERE s.user_id = w.user_id
        AND s.report_instance_id IS NOT NULL
        AND s.status = 'active'
    ) AS user_has_active_scoped_wallet
  FROM public.reply_ticket_wallets AS w
  WHERE w.report_instance_id IS NULL
)
SELECT
  COUNT(*)::bigint AS ambiguous_or_hold_total,
  COUNT(*) FILTER (WHERE is_smoke_pattern)::bigint AS ambiguous_smoke,
  COUNT(*) FILTER (WHERE user_has_active_scoped_wallet)::bigint AS ambiguous_dual_wallet,
  COUNT(*) FILTER (WHERE NOT is_smoke_pattern AND NOT user_has_active_scoped_wallet AND visible_dtr_core_snapshot_count = 0)::bigint AS ambiguous_no_visible_snapshot,
  COUNT(*) FILTER (WHERE NOT is_smoke_pattern AND NOT user_has_active_scoped_wallet AND visible_dtr_core_snapshot_count > 1)::bigint AS ambiguous_multiple_visible
FROM null_w;

-- ═══ 8. Ledger alignment for null-scope wallets (aggregate) ═══
SELECT COUNT(*)::bigint AS ledger_rows_for_null_scope_wallets
FROM public.reply_wallet_ledgers AS l
JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
WHERE w.report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS ledger_included_grant_null_scope_wallet
FROM public.reply_wallet_ledgers AS l
JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
WHERE w.report_instance_id IS NULL
  AND l.event_type = 'included_grant';

SELECT COUNT(*)::bigint AS ledger_null_scope_wallet_report_instance_id_null
FROM public.reply_wallet_ledgers AS l
JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
WHERE w.report_instance_id IS NULL
  AND l.report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS ledger_null_scope_wallet_report_instance_id_set
FROM public.reply_wallet_ledgers AS l
JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
WHERE w.report_instance_id IS NULL
  AND l.report_instance_id IS NOT NULL;

-- ═══ 9. Wallet UNIQUE constraint inventory (schema readiness for multi-row per user) ═══
SELECT COUNT(*)::bigint AS reply_ticket_wallets_unique_constraint_count
FROM pg_constraint AS c
JOIN pg_class AS t ON c.conrelid = t.oid
JOIN pg_namespace AS n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'reply_ticket_wallets'
  AND c.contype = 'u';

SELECT COUNT(*)::bigint AS reply_ticket_wallets_user_id_only_unique_count
FROM pg_constraint AS c
JOIN pg_class AS t ON c.conrelid = t.oid
JOIN pg_namespace AS n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'reply_ticket_wallets'
  AND c.contype = 'u'
  AND pg_get_constraintdef(c.oid) ILIKE '%UNIQUE%'
  AND pg_get_constraintdef(c.oid) ILIKE '%user_id%'
  AND pg_get_constraintdef(c.oid) NOT ILIKE '%report_instance_id%';

-- ═══ 10. B2 STOP flags (planning · paste counts only) ═══
-- STOP if wallets_null_report_instance_id_total <> 5 (baseline drift vs B-HUMAN-R)
-- STOP if strict_backfill_eligible_count + ambiguous_or_hold_total <> wallets_null_report_instance_id_total
-- STOP if wallets_null_purchased_gt_0 > 0 (¥500 purchase on null-scope — manual review)
-- STOP if bucket_dual_wallet_scoped_conflict > 0 AND strict_backfill_eligible_available_gt_0 > 0 (mixed remediation)

SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

-- END
