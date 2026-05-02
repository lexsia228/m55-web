-- ============================================================================
-- STAGING CANDIDATE — reply_ticket_wallets: report-scoped uniqueness (M55 SSOT)
--
-- DO NOT RUN IN PRODUCTION OR SHARED STAGING WITHOUT OPS REVIEW AND PREFLIGHT.
-- DO NOT APPLY AUTOMATICALLY. No manual production row edits are included here.
--
-- Problem addressed:
--   Legacy invariant was effectively one wallet row per user_id (UNIQUE on user_id).
--   Additional reply tickets MUST be scoped per target report_instance_id so tickets
--   purchased for report A are not consumed against report B.
--
-- Companion RPC update (apply after or with same release window):
--   scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql
--
-- Forbidden in unattended execution: uncommented DDL below without human preflight PASS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION A — READ-ONLY PREFLIGHT (safe to run; returns counts only, no row payloads)
-- ----------------------------------------------------------------------------

-- A1: Groups where more than one wallet row shares the same non-null scope key.
--     Expected before migration: 0 rows from inner query → duplicate_scope_group_count = 0.
SELECT COUNT(*)::bigint AS duplicate_scope_group_count
FROM (
  SELECT 1
  FROM public.reply_ticket_wallets
  WHERE report_instance_id IS NOT NULL
  GROUP BY btrim(user_id), report_instance_id
  HAVING COUNT(*) > 1
) AS scoped_duplicates;

-- A2: Wallet rows still missing report scope (must be remediated before NOT NULL / clean UNIQUE).
SELECT COUNT(*)::bigint AS wallet_rows_with_null_report_instance
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

-- A3: Existing UNIQUE constraints on reply_ticket_wallets (record conname before DROP).
SELECT c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS constraint_def
FROM pg_constraint AS c
JOIN pg_class AS t ON c.conrelid = t.oid
JOIN pg_namespace AS n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'reply_ticket_wallets'
  AND c.contype = 'u'
ORDER BY c.conname;

-- ----------------------------------------------------------------------------
-- SECTION B — DESTRUCTIVE DDL (FULLY COMMENTED — DO NOT RUN UNTIL APPROVED)
--
-- Preconditions (human sign-off):
--   [ ] A1 duplicate_scope_group_count = 0
--   [ ] A2 strategy chosen: backfill NULL report_instance_id from an approved source,
--       or leave NULL and defer NOT NULL + defer tight UNIQUE until a later gate.
--   [ ] Backup / maintenance window per org policy.
--   [ ] Constraint name for legacy user-only UNIQUE verified from A3 (often
--       reply_ticket_wallets_user_id_key — VERIFY on target DB; names vary).
--
-- Transaction note: DROP CONSTRAINT + CREATE INDEX can run in one transaction.
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block — not used here.
--
-- Order is mandatory:
--   1) Drop legacy UNIQUE(user_id) — otherwise only one row per user can exist.
--   2) Add UNIQUE(user_id, report_instance_id) for report-scoped wallets.
--   3) Optionally SET NOT NULL on report_instance_id ONLY when A2 = 0.
--
-- DO NOT drop the user_id UNIQUE until A1 passes and ops accepts the blast radius.
-- ----------------------------------------------------------------------------

/*
BEGIN;

-- B1 — Remove global one-wallet-per-user rule (frees multiple wallet rows per user).
-- ALTER TABLE public.reply_ticket_wallets
--   DROP CONSTRAINT reply_ticket_wallets_user_id_key;

-- B2 — Enforce at most one wallet per (user, report) pair.
-- CREATE UNIQUE INDEX IF NOT EXISTS reply_ticket_wallets_user_id_report_instance_uidx
--   ON public.reply_ticket_wallets (user_id, report_instance_id);

-- B3 — ONLY if preflight A2 wallet_rows_with_null_report_instance = 0:
-- ALTER TABLE public.reply_ticket_wallets
--   ALTER COLUMN report_instance_id SET NOT NULL;

COMMIT;
*/

-- ----------------------------------------------------------------------------
-- SECTION C — OPTIONAL PARTIAL UNIQUE (if NULL rows must coexist temporarily)
--
-- If legacy NULL report_instance_id rows must remain for a transition window,
-- prefer a partial unique index on non-null scopes ONLY — combined with app/RPC
-- rules that never rely on NULL-scoped wallets for fulfillment.
--
-- DO NOT RUN alongside B2 full-table UNIQUE without dropping one or the other.
--
-- CREATE UNIQUE INDEX IF NOT EXISTS reply_ticket_wallets_user_report_uidx_nonnull
--   ON public.reply_ticket_wallets (user_id, report_instance_id)
--   WHERE report_instance_id IS NOT NULL;
--
-- If using SECTION C partial index, SKIP B2 composite on full table; reconcile in ops review.
-- ----------------------------------------------------------------------------

-- END OF FILE
