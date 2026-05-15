-- ============================================================================
-- M55 — PHASE A NULLABLE — PRODUCTION PREFLIGHT / POSTFLIGHT (SELECT ONLY)
-- Path: scripts/sql/production/m55_reply_wallet_phase_a_nullable_production_preflight_postflight.sql
--
-- Executable statements: SELECT only.
-- Forbidden in this file: UPDATE, INSERT, DELETE, ALTER, DROP, CREATE, SET, NOTIFY.
-- No DDL comments that could be mistaken for execution steps.
--
-- Before run: confirm target in Supabase Dashboard (production project review only).
-- Do not paste secrets, service role keys, or DB URLs into tickets or chat.
--
-- Raw user_id / payload / email / checkout_session_id are NOT selected.
-- Use counts and aggregates only.
--
-- SSOT: docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_PREFLIGHT_PACKET_v1.md
-- Related: docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_READINESS_REVIEW_v1.md
-- Orphan / smoke: docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md
--                 docs/ssot/M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1.md
--
-- Preflight: run Part A before any approved nullable column-add (executable DDL is not in this file).
-- Postflight: run Part B after that change (separate approval). Compare to Part A baselines.
--
-- ============================================================================


-- ############################################################################
-- ## PART A — PREFLIGHT (read-only; run before nullable column ADD)              ##
-- ############################################################################

-- -----------------------------------------------------------------------------
-- A0 — Identity (operational; record result in ticket)
-- -----------------------------------------------------------------------------
SELECT current_database() AS current_database_name;


-- -----------------------------------------------------------------------------
-- A1 — Required tables exist (expect 4 rows including dtr_report_snapshots)
-- -----------------------------------------------------------------------------
SELECT t.table_name
FROM information_schema.tables AS t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'reply_ticket_wallets',
    'reply_wallet_ledgers',
    'reply_sessions',
    'dtr_report_snapshots'
  )
ORDER BY t.table_name;


-- -----------------------------------------------------------------------------
-- A2 — Row counts (baseline_*; record all three)
-- -----------------------------------------------------------------------------
SELECT 'reply_ticket_wallets'::text AS table_name,
  (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets) AS row_count
UNION ALL
SELECT 'reply_wallet_ledgers',
  (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers)
UNION ALL
SELECT 'reply_sessions',
  (SELECT COUNT(*)::bigint FROM public.reply_sessions);


-- -----------------------------------------------------------------------------
-- A3 — report_instance_id column already present? (expect 0 rows before first apply)
-- -----------------------------------------------------------------------------
SELECT c.table_name,
       c.column_name,
       c.data_type,
       c.is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'reply_ticket_wallets',
    'reply_wallet_ledgers',
    'reply_sessions'
  )
  AND c.column_name = 'report_instance_id'
ORDER BY c.table_name;


-- -----------------------------------------------------------------------------
-- A4 — Non-NULL report_instance_id counts (run ONLY after A3 shows all three columns).
--       Before the three nullable columns exist: SKIP this block entirely (logical baseline: zero).
--       When A3 returns 3 rows: uncomment ONE of the variants below without editing other blocks.
--
-- Variant (uncomment when needed):
-- -----------------------------------------------------------------------------
-- SELECT
--   (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets
--    WHERE report_instance_id IS NOT NULL) AS wallet_report_instance_non_null,
--   (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers
--    WHERE report_instance_id IS NOT NULL) AS ledger_report_instance_non_null,
--   (SELECT COUNT(*)::bigint FROM public.reply_sessions
--    WHERE report_instance_id IS NOT NULL) AS session_report_instance_non_null;


-- -----------------------------------------------------------------------------
-- A5 — UNIQUE on reply_ticket_wallets (user-scoped uniqueness; record definitions)
-- -----------------------------------------------------------------------------
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint AS con
JOIN pg_class AS rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype IN ('u')
ORDER BY con.conname;


-- -----------------------------------------------------------------------------
-- A6 — PRIMARY KEY(id) on reply_ticket_wallets (expect one row)
-- -----------------------------------------------------------------------------
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint AS con
JOIN pg_class AS rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype = 'p'
ORDER BY con.conname;


-- -----------------------------------------------------------------------------
-- A7 — Wallets lacking DTR_CORE_STATIC_V1 snapshot (orphan wallets cohort)
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS wallet_user_without_entry_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- -----------------------------------------------------------------------------
-- A8 — Smoke-pattern orphan wallets (no raw identifiers; COUNT only).
--       Pattern aligns with docs/ssot/M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1.md
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS smoke_pattern_wallet_without_core_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE w.user_id LIKE 'smoke_user_%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- -----------------------------------------------------------------------------
-- A9 — Cohort with core snapshot present (summaries only; no per-user rows)
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS wallet_with_dtr_core_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);

SELECT COUNT(*)::bigint AS wallet_non_smoke_with_dtr_core_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE w.user_id NOT LIKE 'smoke_user_%'
  AND EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- -----------------------------------------------------------------------------
-- A10 — FK / lineage orphan aggregates (counts only; PHASE0-lite compatible)
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS ledger_rows_missing_wallet_parent_count
FROM public.reply_wallet_ledgers AS l
LEFT JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
WHERE w.id IS NULL;

SELECT COUNT(*)::bigint AS document_rows_missing_session_parent_count
FROM public.reply_documents AS d
LEFT JOIN public.reply_sessions AS s ON s.id = d.reply_session_id
WHERE s.id IS NULL;

SELECT COUNT(*)::bigint AS sessions_without_dtr_core_snapshot_count
FROM public.reply_sessions AS rs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = rs.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- -----------------------------------------------------------------------------
-- A11 — One-row baseline summary (duplicate of above for ticket paste; optional)
--       Run separately from A10 if clients prefer stacked metrics instead.
-- -----------------------------------------------------------------------------
SELECT
  current_database()::text AS current_database_name_dup,
  (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets) AS baseline_reply_ticket_wallets,
  (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers) AS baseline_reply_wallet_ledgers,
  (SELECT COUNT(*)::bigint FROM public.reply_sessions) AS baseline_reply_sessions,
  (
    SELECT COUNT(*)::bigint
    FROM public.reply_ticket_wallets AS w
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    )
  ) AS baseline_wallet_user_without_snapshot,
  (
    SELECT COUNT(*)::bigint
    FROM public.reply_ticket_wallets AS w
    WHERE w.user_id LIKE 'smoke_user_%'
      AND NOT EXISTS (
        SELECT 1
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = w.user_id
          AND s.product_id = 'DTR_CORE_STATIC_V1'
      )
  ) AS baseline_smoke_pattern_orphan_wallet_count;


-- ============================================================================
-- PART A END — Save all result sets before any separate approved schema-change step.
-- ============================================================================


-- ############################################################################
-- ## PART B — POSTFLIGHT (read-only; run after approved nullable column-add only) ##
-- ## Expectation: baseline row counts and orphan aggregates match PART A where  ##
-- ## applicable; new columns exist and stay NULL-only for Phase A semantics. ##
-- ############################################################################


-- -----------------------------------------------------------------------------
-- B1 — Columns exist on all three tables (expect 3 rows); nullable = YES
-- -----------------------------------------------------------------------------
SELECT c.table_name,
       c.column_name,
       c.data_type,
       c.is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'reply_ticket_wallets',
    'reply_wallet_ledgers',
    'reply_sessions'
  )
  AND c.column_name = 'report_instance_id'
ORDER BY c.table_name;


-- -----------------------------------------------------------------------------
-- B2 — Row counts must match baseline from A2
-- -----------------------------------------------------------------------------
SELECT 'reply_ticket_wallets'::text AS table_name,
  (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets) AS row_count
UNION ALL
SELECT 'reply_wallet_ledgers',
  (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers)
UNION ALL
SELECT 'reply_sessions',
  (SELECT COUNT(*)::bigint FROM public.reply_sessions);


-- -----------------------------------------------------------------------------
-- B3 — All report_instance_id must remain NULL for Phase A (no backfill)
-- -----------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)
    AS wallet_report_instance_non_null,
  (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL)
    AS ledger_report_instance_non_null,
  (SELECT COUNT(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)
    AS session_report_instance_non_null;


-- -----------------------------------------------------------------------------
-- B4 — Orphan wallet cohort unchanged; orphan must not suddenly gain non-NULL IDs
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS wallet_user_without_entry_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);

SELECT COUNT(*)::bigint AS orphan_wallets_report_instance_should_be_null_still_nonnull_blocked
FROM public.reply_ticket_wallets AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
)
  AND w.report_instance_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- B5 — UNIQUE(user_id) unchanged (compare to PART A constraint text)
-- -----------------------------------------------------------------------------
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint AS con
JOIN pg_class AS rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype IN ('u')
ORDER BY con.conname;


-- -----------------------------------------------------------------------------
-- B6 — Lineage orphans unchanged vs A10 (counts should match baseline)
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS ledger_rows_missing_wallet_parent_count
FROM public.reply_wallet_ledgers AS l
LEFT JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
WHERE w.id IS NULL;

SELECT COUNT(*)::bigint AS document_rows_missing_session_parent_count
FROM public.reply_documents AS d
LEFT JOIN public.reply_sessions AS s ON s.id = d.reply_session_id
WHERE s.id IS NULL;

SELECT COUNT(*)::bigint AS sessions_without_dtr_core_snapshot_count
FROM public.reply_sessions AS rs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = rs.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- -----------------------------------------------------------------------------
-- B7 — Smoke-pattern orphan cohort (should match baseline)
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS smoke_pattern_wallet_without_core_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE w.user_id LIKE 'smoke_user_%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- -----------------------------------------------------------------------------
-- B8 — Cohort snapshots present (sanity unchanged vs expectation)
-- -----------------------------------------------------------------------------
SELECT COUNT(*)::bigint AS wallet_with_dtr_core_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- ============================================================================
-- PART B END
-- ============================================================================

-- END OF FILE
