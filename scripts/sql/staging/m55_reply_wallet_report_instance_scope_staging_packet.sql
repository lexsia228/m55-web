-- ============================================================================
-- M55 — STAGING / DEV ONLY — EXECUTION PACKET (NOT PRODUCTION)
-- Path: scripts/sql/staging/m55_reply_wallet_report_instance_scope_staging_packet.sql
--
-- PRODUCTION EXECUTION IS FORBIDDEN until GO criteria in:
--   docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md
--
-- Rules for this file:
-- - Do NOT copy into supabase/migrations as a production migration.
-- - Do NOT paste service_role keys, JWT secrets, or Webhook secrets here or in tickets.
-- - Record the following in your run ticket BEFORE running anything (comments only):
--
--   target_database_name:     ________________________________
--   supabase_project_ref:     ________________________________
--   executed_at_utc:          ________________________________
--   git_commit_hash:          ________________________________
--   confirmed_not_production: YES / NO (must be YES)
--   backup_or_pitr_confirmed: YES / NO (must be YES before DDL)
--
-- Canonical report_instance_id: dtr_report_snapshots.id (uuid)
-- Entry Report product_id (must match lib/oneTimeCheckout.ts):
--   DTR_CORE_STATIC_V1
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ STOP — READ BEFORE ANY EXECUTION                                         ║
-- ║                                                                          ║
-- ║ STOP if ANY wallet has no DTR_CORE_STATIC_V1 snapshot (Phase 0 shows    ║
-- ║      orphaned users) — resolve data or use a clean staging DB first.     ║
-- ║ STOP if duplicate snapshot rows exist per (user_id, product_id).         ║
-- ║ STOP if UNIQUE constraint name differs from your recorded name —         ║
-- ║      reconcile manually before Phase F.                                   ║
-- ║ STOP immediately if this connection looks like PRODUCTION (wrong        ║
-- ║      project ref, hostname, or env label).                                ║
-- ║ STOP if backup / PITR restore path is not confirmed for this project.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝


-- ############################################################################
-- ## PHASE 0_READ_ONLY_PREFLIGHT                                            ##
-- ## Safe: SELECT only. Run statement-by-statement and record results.        ##
-- ############################################################################

-- current_database() — record in ticket
SELECT current_database() AS phase0_current_database;

SELECT COUNT(*) AS reply_ticket_wallets_count
FROM public.reply_ticket_wallets;

SELECT COUNT(*) AS reply_wallet_ledgers_count
FROM public.reply_wallet_ledgers;

SELECT COUNT(*) AS reply_sessions_count
FROM public.reply_sessions;

SELECT COUNT(*) AS dtr_report_snapshots_all
FROM public.dtr_report_snapshots;

SELECT COUNT(*) AS dtr_report_snapshots_entry_report
FROM public.dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1';

-- UNIQUE constraints on reply_ticket_wallets — record exact conname for Phase F
SELECT con.conname AS unique_constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_def
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype IN ('u')
ORDER BY con.conname;

-- Wallet exists but no matching Entry Report snapshot — MUST be 0 rows to proceed (per packet STOP)
SELECT w.user_id AS wallet_user_without_snapshot
FROM public.reply_ticket_wallets w
LEFT JOIN public.dtr_report_snapshots s
  ON s.user_id = w.user_id
 AND s.product_id = 'DTR_CORE_STATIC_V1'
WHERE s.id IS NULL;

-- Multiple snapshot rows per (user_id, product_id) — MUST be 0 rows to proceed
SELECT user_id, product_id, COUNT(*) AS cnt
FROM public.dtr_report_snapshots
GROUP BY 1, 2
HAVING COUNT(*) > 1;

SELECT user_id, COUNT(*) AS cnt
FROM public.dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Ledger orphan: ledger row with missing wallet (should be empty if FK intact)
SELECT l.id AS orphan_ledger_id, l.wallet_id
FROM public.reply_wallet_ledgers l
LEFT JOIN public.reply_ticket_wallets w ON w.id = l.wallet_id
WHERE w.id IS NULL;

-- Session orphan: document without session (should be empty if FK intact)
SELECT d.id AS orphan_document_id, d.reply_session_id
FROM public.reply_documents d
LEFT JOIN public.reply_sessions s ON s.id = d.reply_session_id
WHERE s.id IS NULL;

-- Sessions whose user has no Entry Report snapshot (informative; may be non-zero in partial staging)
SELECT COUNT(*) AS reply_sessions_users_without_entry_snapshot
FROM public.reply_sessions rs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots s
  WHERE s.user_id = rs.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- ############################################################################
-- ## STOP — DO NOT PROCEED TO DDL UNTIL:                                    ##
-- ##   - Phase 0 queries above have been recorded                            ##
-- ##   - wallet_user_without_snapshot returns 0 rows                       ##
-- ##   - duplicate snapshot groups return 0 rows                             ##
-- ##   - backup / PITR confirmed                                             ##
-- ##   - environment confirmed NOT production                                ##
-- ############################################################################


-- ############################################################################
-- ## PHASE A_nullable_columns                                                ##
-- ## DDL — COMMENTED. Uncomment ONLY after STOP gate above.                 ##
-- ############################################################################

-- >>> UNCOMMENT FROM HERE FOR PHASE A -----------------------------------------
-- ALTER TABLE public.reply_ticket_wallets
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid,
--   ADD COLUMN IF NOT EXISTS migration_status text
--     CHECK (migration_status IS NULL OR migration_status IN (
--       'pending', 'filled', 'manual_review', 'quarantine'
--     ));
--
-- ALTER TABLE public.reply_wallet_ledgers
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid;
--
-- ALTER TABLE public.reply_sessions
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid;
-- ------------------------------------------------------------------------ <<<


-- ############################################################################
-- ## PHASE B_backfill_wallets                                                ##
-- ## DML — COMMENTED. Requires Phase A columns.                             ##
-- ############################################################################

-- >>> UNCOMMENT FROM HERE FOR PHASE B -----------------------------------------
-- UPDATE public.reply_ticket_wallets AS w
-- SET report_instance_id = s.id,
--     migration_status = 'filled'
-- FROM public.dtr_report_snapshots AS s
-- WHERE s.user_id = w.user_id
--   AND s.product_id = 'DTR_CORE_STATIC_V1'
--   AND w.report_instance_id IS NULL;
--
-- UPDATE public.reply_ticket_wallets
-- SET migration_status = 'manual_review'
-- WHERE report_instance_id IS NULL;
--
-- -- Backfill row counts
-- SELECT COUNT(*) AS wallets_with_report_instance
-- FROM public.reply_ticket_wallets
-- WHERE report_instance_id IS NOT NULL;
--
-- SELECT COUNT(*) AS wallets_null_report_instance
-- FROM public.reply_ticket_wallets
-- WHERE report_instance_id IS NULL;
-- ------------------------------------------------------------------------ <<<


-- ############################################################################
-- ## PHASE C_backfill_ledgers                                                ##
-- ############################################################################

-- >>> UNCOMMENT FROM HERE FOR PHASE C -----------------------------------------
-- UPDATE public.reply_wallet_ledgers AS l
-- SET report_instance_id = w.report_instance_id
-- FROM public.reply_ticket_wallets AS w
-- WHERE l.wallet_id = w.id
--   AND l.report_instance_id IS NULL
--   AND w.report_instance_id IS NOT NULL;
--
-- -- Mismatch detection: ledger vs wallet (should return 0 rows)
-- SELECT l.id, l.wallet_id, l.report_instance_id AS ledger_ri, w.report_instance_id AS wallet_ri
-- FROM public.reply_wallet_ledgers l
-- JOIN public.reply_ticket_wallets w ON w.id = l.wallet_id
-- WHERE w.report_instance_id IS NOT NULL
--   AND l.report_instance_id IS DISTINCT FROM w.report_instance_id;
-- ------------------------------------------------------------------------ <<<


-- ############################################################################
-- ## PHASE D_backfill_sessions                                               ##
-- ############################################################################

-- >>> UNCOMMENT FROM HERE FOR PHASE D -----------------------------------------
-- UPDATE public.reply_sessions AS rs
-- SET report_instance_id = s.id
-- FROM public.dtr_report_snapshots AS s
-- WHERE s.user_id = rs.user_id
--   AND s.product_id = 'DTR_CORE_STATIC_V1'
--   AND rs.report_instance_id IS NULL;
--
-- SELECT COUNT(*) AS sessions_null_report_instance
-- FROM public.reply_sessions
-- WHERE report_instance_id IS NULL;
-- ------------------------------------------------------------------------ <<<


-- ############################################################################
-- ## PHASE E_validation                                                      ##
-- ## Read-only — uncomment SELECT blocks to run checks.                     ##
-- ############################################################################

-- >>> UNCOMMENT FOR PHASE E ---------------------------------------------------
-- SELECT COUNT(*) AS wallet_null_not_manual_review
-- FROM public.reply_ticket_wallets
-- WHERE report_instance_id IS NULL
--   AND COALESCE(migration_status, '') <> 'manual_review';
--
-- SELECT COUNT(*) AS ledger_null_report_instance
-- FROM public.reply_wallet_ledgers
-- WHERE report_instance_id IS NULL;
--
-- SELECT COUNT(*) AS session_null_report_instance
-- FROM public.reply_sessions
-- WHERE report_instance_id IS NULL;
--
-- SELECT user_id, report_instance_id, COUNT(*) AS cnt
-- FROM public.reply_ticket_wallets
-- WHERE report_instance_id IS NOT NULL
-- GROUP BY 1, 2
-- HAVING COUNT(*) > 1;
--
-- SELECT l.id, l.wallet_id, l.report_instance_id, w.report_instance_id AS w_ri
-- FROM public.reply_wallet_ledgers l
-- JOIN public.reply_ticket_wallets w ON w.id = l.wallet_id
-- WHERE w.report_instance_id IS NOT NULL
--   AND l.report_instance_id IS DISTINCT FROM w.report_instance_id;
--
-- -- Session vs document: user_id should match
-- SELECT d.id AS document_id, d.user_id AS doc_user, s.user_id AS session_user
-- FROM public.reply_documents d
-- JOIN public.reply_sessions s ON s.id = d.reply_session_id
-- WHERE d.user_id IS DISTINCT FROM s.user_id;
-- ------------------------------------------------------------------------ <<<


-- ############################################################################
-- ## PHASE F_unique_constraint_trial — STAGING/DEV ONLY                      ##
-- ## Dropping UNIQUE(user_id) breaks single-row RPC/app assumptions.          ##
-- ## Do NOT use on production until RPC + walletGrants + /api/reply/generate  ##
-- ## are deployed. Replace <UNIQUE_USER_ID_FROM_PHASE_0> with actual name.   ##
-- ############################################################################

-- >>> UNCOMMENT ONLY AFTER PHASE E SUCCESS — STAGING --------------------------------
-- -- Example (VERIFY name from Phase 0 first — often reply_ticket_wallets_user_id_key):
-- ALTER TABLE public.reply_ticket_wallets
--   DROP CONSTRAINT <UNIQUE_USER_ID_FROM_PHASE_0>;
--
-- ALTER TABLE public.reply_ticket_wallets
--   ADD CONSTRAINT reply_ticket_wallets_user_id_report_instance_unique
--   UNIQUE (user_id, report_instance_id);
--
-- -- On failure: restore previous UNIQUE before re-attempting (requires no duplicate user_id)
-- -- ROLLBACK sketch (manual):
-- -- ALTER TABLE public.reply_ticket_wallets
-- --   DROP CONSTRAINT reply_ticket_wallets_user_id_report_instance_unique;
-- -- ALTER TABLE public.reply_ticket_wallets
-- --   ADD CONSTRAINT <UNIQUE_USER_ID_FROM_PHASE_0> UNIQUE (user_id);
-- ------------------------------------------------------------------------ <<<


-- ############################################################################
-- ## PHASE G_not_null_fk_trial — STAGING/DEV ONLY                            ##
-- ## NOT NULL / FK before app+RPC follow-up can break inserts.              ##
-- ## Forbidden for production until coordinated release.                     ##
-- ############################################################################

-- >>> UNCOMMENT ONLY FOR CONTROLLED STAGING TESTS --------------------------------
-- ALTER TABLE public.reply_ticket_wallets
--   ALTER COLUMN report_instance_id SET NOT NULL;
--
-- -- Optional FK (NOT VALID first in some designs):
-- -- ALTER TABLE public.reply_ticket_wallets
-- --   ADD CONSTRAINT reply_ticket_wallets_report_instance_fkey
-- --   FOREIGN KEY (report_instance_id) REFERENCES public.dtr_report_snapshots (id)
-- --   NOT VALID;
-- ------------------------------------------------------------------------ <<<


-- ############################################################################
-- ## PHASE H_rollback — reference only (execute only with DBA approval)      ##
-- ############################################################################

-- If only Phase A applied (nullable columns):
-- ALTER TABLE public.reply_ticket_wallets
--   DROP COLUMN IF EXISTS migration_status,
--   DROP COLUMN IF EXISTS report_instance_id;
-- ALTER TABLE public.reply_wallet_ledgers
--   DROP COLUMN IF EXISTS report_instance_id;
-- ALTER TABLE public.reply_sessions
--   DROP COLUMN IF EXISTS report_instance_id;

-- If Phase F applied: restore UNIQUE(user_id) using exact name from Phase 0;
--   only safe if no duplicate user_id values exist.

-- If mid-migration corruption: prefer project PITR / snapshot restore.

-- END OF PACKET
