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


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE 0 (hardening) — wallet / ledger / snapshot / entitlement / fulfillment
-- See: docs/ssot/M55_REPLY_WALLET_STAGING_RUNBOOK_HARDENING_REVIEW_v1.md
-- ───────────────────────────────────────────────────────────────────────────

-- B — Wallet: invariant & bounds (usually 0 rows if DB CHECKs always held)
SELECT id, user_id,
  initial_included_count, purchased_count, consumed_count, available_count
FROM public.reply_ticket_wallets
WHERE available_count <> initial_included_count + purchased_count - consumed_count
   OR available_count < 0
   OR consumed_count < 0
   OR purchased_count < 0
   OR initial_included_count < 0
   OR consumed_count > initial_included_count + purchased_count;

SELECT id, user_id FROM public.reply_ticket_wallets
WHERE status NOT IN ('active', 'suspended', 'closed');

SELECT id, user_id FROM public.reply_ticket_wallets
WHERE created_at IS NULL OR updated_at IS NULL;

-- C — Ledger: consume without session (double-check vs CHECK constraint)
SELECT l.id AS ledger_reply_consume_missing_session_id
FROM public.reply_wallet_ledgers l
WHERE l.event_type = 'reply_consume'
  AND l.reply_session_id IS NULL;

-- C — Ledger: grants with NULL source_of_grant (weak audit trail)
SELECT l.id AS ledger_grant_weak_tracking_id
FROM public.reply_wallet_ledgers l
WHERE l.event_type IN ('included_grant', 'purchase_grant')
  AND l.source_of_grant IS NULL;

-- C — Ledger: last row balance_after vs wallet.available_count (may flag imports; investigate non-zero)
SELECT w.id AS wallet_id, w.user_id,
       w.available_count AS wallet_available,
       lr.balance_after AS last_ledger_balance_after
FROM public.reply_ticket_wallets w
JOIN (
  SELECT DISTINCT ON (wallet_id)
    wallet_id, balance_after
  FROM public.reply_wallet_ledgers
  ORDER BY wallet_id, created_at DESC, id DESC
) lr ON lr.wallet_id = w.id
WHERE lr.balance_after IS DISTINCT FROM w.available_count;

-- C — Wallet rows with ledger activity implied but zero ledger rows
SELECT w.id AS wallet_no_ledger_but_nonzero_balances_id, w.user_id,
       w.available_count, w.initial_included_count, w.purchased_count, w.consumed_count
FROM public.reply_ticket_wallets w
WHERE NOT EXISTS (SELECT 1 FROM public.reply_wallet_ledgers l WHERE l.wallet_id = w.id)
  AND (
    w.initial_included_count <> 0 OR w.purchased_count <> 0 OR w.consumed_count <> 0
    OR w.available_count <> 0
  );

-- D — Snapshot: invalid nulls (schema normally prevents)
SELECT id FROM public.dtr_report_snapshots
WHERE user_id IS NULL OR btrim(user_id) = ''
   OR product_id IS NULL OR btrim(product_id) = '';

-- D — Snapshot without wallet row (informational; may occur before wallet grant flows)
SELECT s.user_id AS snapshot_user_without_wallet, s.id AS snapshot_id
FROM public.dtr_report_snapshots s
WHERE s.product_id = 'DTR_CORE_STATIC_V1'
  AND NOT EXISTS (
    SELECT 1 FROM public.reply_ticket_wallets w WHERE w.user_id = s.user_id
  );

-- D — entitlement_rights (DTR_CORE_RIGHT_KEY) vs Entry Report snapshot
-- right_key SSOT: lib/m55/dtrCoreCheckoutFulfillment.ts DTR_CORE_RIGHT_KEY = 'm55_p:core_origin'
SELECT er.user_id AS entitlement_core_origin_without_snapshot
FROM public.entitlement_rights er
LEFT JOIN public.dtr_report_snapshots s
  ON s.user_id = er.user_id AND s.product_id = 'DTR_CORE_STATIC_V1'
WHERE er.right_key = 'm55_p:core_origin'
  AND s.id IS NULL;

SELECT s.user_id, s.id AS snapshot_without_core_origin_right
FROM public.dtr_report_snapshots s
LEFT JOIN public.entitlement_rights er
  ON er.user_id = s.user_id AND er.right_key = 'm55_p:core_origin'
WHERE s.product_id = 'DTR_CORE_STATIC_V1'
  AND er.id IS NULL;

-- D — one_time_fulfillments vs snapshot by checkout_session_id (DTR Core lane)
SELECT o.checkout_session_id, o.user_id
FROM public.one_time_fulfillments o
LEFT JOIN public.dtr_report_snapshots s ON s.checkout_session_id = o.checkout_session_id
WHERE o.product_id = 'DTR_CORE_STATIC_V1'
  AND s.id IS NULL;

-- E — document vs session user_id
SELECT d.id AS document_id, d.reply_session_id,
       d.user_id AS document_user_id, s.user_id AS session_user_id
FROM public.reply_documents d
JOIN public.reply_sessions s ON s.id = d.reply_session_id
WHERE d.user_id IS DISTINCT FROM s.user_id;

-- E — succeeded sessions with no document (may be brief windows or policy; investigate if non-zero)
SELECT COUNT(*) AS succeeded_sessions_without_document
FROM public.reply_sessions rs
WHERE rs.status = 'succeeded'
  AND NOT EXISTS (
    SELECT 1 FROM public.reply_documents d WHERE d.reply_session_id = rs.id
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
