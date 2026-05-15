-- ============================================================================
-- M55 — PHASE A — NULLABLE COLUMNS ONLY — STAGING / DEV ONLY
-- Path: scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql
--
-- PRODUCTION EXECUTION IS FORBIDDEN.
-- Do NOT copy into supabase/migrations as a production migration.
--
-- Scope: ADD COLUMN IF NOT EXISTS (nullable uuid) on three tables only.
--        No backfill, no NOT NULL, no FK, no UNIQUE change, no UPDATE/INSERT/DELETE.
--
-- Orphan / quarantine: docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md
-- Review: docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1.md
--
-- Record BEFORE running anything (comments only — no secrets):
--
--   target_database_name:     ________________________________
--   supabase_project_ref:     ________________________________
--   git_branch:               ________________________________
--   git_commit_hash:          ________________________________
--   backup_or_pitr_confirmed: YES / NO   (must be YES before uncommenting APPLY)
--   confirmed_not_production: YES / NO  (must be YES)
--   reviewed_by:              ________________________________
--   execution_date_utc:       ________________________________
--
-- ============================================================================


-- ############################################################################
-- ## PART 1 — PREFLIGHT (read-only SELECT only)                              ##
-- ## Run all statements and record results. Do not proceed if unexpected.   ##
-- ############################################################################

-- 1.1 — Target tables exist (expect 3 rows)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'reply_ticket_wallets',
    'reply_wallet_ledgers',
    'reply_sessions'
  )
ORDER BY table_name;

-- 1.2 — Columns report_instance_id already present? (expect 0 rows before apply)
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

-- 1.3 — Row counts (record as baseline baseline_*)
SELECT 'reply_ticket_wallets'::text AS table_name,
  (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets) AS row_count
UNION ALL
SELECT 'reply_wallet_ledgers',
  (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers)
UNION ALL
SELECT 'reply_sessions',
  (SELECT COUNT(*)::bigint FROM public.reply_sessions');

-- 1.4 — Orphan wallet count: wallet exists but NO DTR_CORE_STATIC_V1 snapshot
--       (production SSOT: 3 — must not change meaning after APPLY except all NULL)
SELECT COUNT(*)::bigint AS wallet_user_without_entry_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);

-- 1.5 — UNIQUE on reply_ticket_wallets.user_id — record constraint name(s)
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint AS con
JOIN pg_class AS rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype IN ('u')
ORDER BY con.conname;

-- 1.6 — Any non-NULL report_instance_id must not exist before first apply
--       (expect 0 / column missing — if column missing, query below may error; skip 1.6a then)
-- 1.6a — Only if columns already exist from a partial run:
-- SELECT COUNT(*) AS non_null_wallet FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL;
-- SELECT COUNT(*) AS non_null_ledger FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL;
-- SELECT COUNT(*) AS non_null_session FROM public.reply_sessions WHERE report_instance_id IS NOT NULL;


-- ############################################################################
-- ## PART 2 — APPLY (Phase A nullable only)                                 ##
-- ## STAGING/DEV ONLY. Uncomment ONLY after PREFLIGHT + backup + approval.  ##
-- ## Forbidden in this block: UPDATE, INSERT, DELETE, backfill, NOT NULL, FK, ##
-- ##            DROP (except commented rollback file), CREATE UNIQUE.      ##
-- ############################################################################

-- >>> UNCOMMENT FROM HERE TO APPLY PHASE A (ONE TRANSACTION OPTIONAL) ---------
--
-- BEGIN;
--
-- ALTER TABLE public.reply_ticket_wallets
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid;
--
-- ALTER TABLE public.reply_wallet_ledgers
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid;
--
-- ALTER TABLE public.reply_sessions
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid;
--
-- COMMIT;
--
-- ------------------------------------------------------------------------- <<<


-- ############################################################################
-- ## PART 3 — POSTFLIGHT (read-only; run after APPLY)                        ##
-- ############################################################################

-- 3.1 — Columns exist (expect 3 rows, is_nullable = YES)
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

-- 3.2 — Row counts unchanged vs PART 1.3 (must match)
SELECT 'reply_ticket_wallets'::text AS table_name,
  (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets) AS row_count
UNION ALL
SELECT 'reply_wallet_ledgers',
  (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers)
UNION ALL
SELECT 'reply_sessions',
  (SELECT COUNT(*)::bigint FROM public.reply_sessions');

-- 3.3 — All report_instance_id must stay NULL (no backfill in Phase A)
--       Expect 0 for each when column exists.
SELECT
  (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)
    AS wallet_nonnull_report_instance_id,
  (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL)
    AS ledger_nonnull_report_instance_id,
  (SELECT COUNT(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)
    AS session_nonnull_report_instance_id;

-- 3.4 — Orphan cohort count unchanged; no orphan wallet may have non-NULL report_instance_id
SELECT COUNT(*)::bigint AS wallet_user_without_entry_snapshot_count
FROM public.reply_ticket_wallets AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);

SELECT COUNT(*)::bigint AS orphan_wallets_with_nonnull_report_instance_id
FROM public.reply_ticket_wallets AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
)
  AND w.report_instance_id IS NOT NULL;

-- 3.5 — user_id UNIQUE unchanged (same query as 1.5; compare to preflight snapshot)
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint AS con
JOIN pg_class AS rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype IN ('u')
ORDER BY con.conname;


-- ############################################################################
-- ## PART 4 — ROLLBACK (reference only — DO NOT run without DBA approval)    ##
-- ## Keep COMMENTED. Drops columns added by PART 2.                           ##
-- ############################################################################

-- >>> UNCOMMENT ONLY IF rolling back Phase A column adds (staging/dev) ----------
--
-- BEGIN;
--
-- ALTER TABLE public.reply_ticket_wallets
--   DROP COLUMN IF EXISTS report_instance_id;
--
-- ALTER TABLE public.reply_wallet_ledgers
--   DROP COLUMN IF EXISTS report_instance_id;
--
-- ALTER TABLE public.reply_sessions
--   DROP COLUMN IF EXISTS report_instance_id;
--
-- COMMIT;
--
-- ------------------------------------------------------------------------- <<<

-- migration_status: NOT included in this packet (optional future Phase A follow-up;
--   see M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1.md). Avoid CHECK in same change set.

-- END OF FILE
