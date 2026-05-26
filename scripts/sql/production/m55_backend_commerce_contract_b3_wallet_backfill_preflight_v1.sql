-- BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL — Pre-apply read-only preflight (counts only)
-- Target: m55-soul-core PRODUCTION
-- Gate: B3-WALLET-BACKFILL-PLANNING / B3-WALLET-BACKFILL-D-EXEC (preflight only until Human GO)
-- Forbidden: INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/GRANT/NOTIFY · SELECT * · raw IDs in tickets
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_EXEC_PLANNING_2026-05-23.md
-- Planning: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_PLANNING_2026-05-23.md
-- STOP if strict_backfill_eligible_count <> 1

-- DTR_CORE_PRODUCT_KEY = 'DTR_CORE_STATIC_V1'

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dtr_report_snapshots'
    AND column_name = 'user_hidden_at'
) AS dtr_user_hidden_at_column_exists;

-- ═══ 1. B2-R anchor reconciliation ═══
SELECT COUNT(*)::bigint AS wallets_null_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS bucket_safe_backfill_candidate
FROM (
  WITH null_w AS (
    SELECT
      w.id,
      w.user_id,
      w.status,
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
        SELECT 1 FROM public.reply_ticket_wallets AS s
        WHERE s.user_id = w.user_id
          AND s.report_instance_id IS NOT NULL
          AND s.status = 'active'
      ) AS user_has_active_scoped_wallet
    FROM public.reply_ticket_wallets AS w
    WHERE w.report_instance_id IS NULL
  )
  SELECT 1
  FROM null_w AS nw
  WHERE NOT nw.is_smoke_pattern
    AND NOT nw.user_has_active_scoped_wallet
    AND nw.visible_dtr_core_snapshot_count = 1
    AND nw.purchased_count = 0
    AND nw.status = 'active'
) AS safe;

-- ═══ 2. Strict backfill eligible (must be 1 before UPDATE) ═══
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

-- ═══ 3. Conflict / cap guards ═══
SELECT COUNT(*)::bigint AS bucket_dual_wallet_scoped_conflict
FROM (
  WITH null_w AS (
    SELECT
      w.user_id,
      EXISTS (
        SELECT 1 FROM public.reply_ticket_wallets AS s
        WHERE s.user_id = w.user_id
          AND s.report_instance_id IS NOT NULL
          AND s.status = 'active'
      ) AS user_has_active_scoped_wallet
    FROM public.reply_ticket_wallets AS w
    WHERE w.report_instance_id IS NULL
  )
  SELECT 1 FROM null_w WHERE user_has_active_scoped_wallet
) AS x;

SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

SELECT COUNT(*)::bigint AS wallets_null_purchased_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND purchased_count > 0;

-- ═══ 4. Overlap guard (backfill cohort vs quarantine cohort) ═══
SELECT COUNT(*)::bigint AS eligible_and_smoke_overlap_count
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NULL
  AND (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%')
  AND w.status = 'active'
  AND w.purchased_count = 0
  AND w.initial_included_count > 0
  AND (
    SELECT COUNT(*)::bigint
    FROM public.dtr_report_snapshots AS s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
      AND s.user_hidden_at IS NULL
  ) = 1;

-- Expected: 0 (eligible row must not be smoke)

-- GO if: strict_backfill_eligible_count = 1 AND wallets_cap_violation_rows = 0
--        AND bucket_dual_wallet_scoped_conflict = 0 AND wallets_null_purchased_gt_0 = 0
