-- ============================================================================
-- DRAFT ONLY — DO NOT RUN ON PRODUCTION
-- Path: scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql
-- Purpose: Outline for report_instance-scoped reply wallet migration (PR1.7)
-- Related: docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md
--
-- Constraints from user: do not apply to DB; do not place under supabase/migrations
-- until ADR + staging validation. Review with DBA before any execution.
--
-- report_instance_id canonical: dtr_report_snapshots.id (uuid)
-- Entry Report product_id (code): match lib/oneTimeCheckout.ts exactly:
--     DTR_CORE_STATIC_V1
-- ============================================================================

-- BEGIN;  -- Uncomment only after splitting phases; CREATE INDEX CONCURRENTLY cannot run inside a txn.

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 0 — Discover existing constraint names (run in target env READ-ONLY first)
-- ───────────────────────────────────────────────────────────────────────────

-- List UNIQUE constraints on reply_ticket_wallets (confirm name before DROP in Phase F)
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'reply_ticket_wallets'
--   AND con.contype IN ('u');

-- Typical default name for UNIQUE on user_id column (verify!):
-- reply_ticket_wallets_user_id_key


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE A — Add nullable columns (no NOT NULL yet)
-- ───────────────────────────────────────────────────────────────────────────

-- ALTER TABLE public.reply_ticket_wallets
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid,
--   ADD COLUMN IF NOT EXISTS migration_status text
--     CHECK (migration_status IS NULL OR migration_status IN ('pending', 'filled', 'manual_review', 'quarantine'));

-- ALTER TABLE public.reply_wallet_ledgers
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid;

-- ALTER TABLE public.reply_sessions
--   ADD COLUMN IF NOT EXISTS report_instance_id uuid;

-- Optional future: FK to snapshots (enable after data clean; may use NOT VALID first)
-- ALTER TABLE public.reply_ticket_wallets
--   ADD CONSTRAINT reply_ticket_wallets_report_instance_fkey
--   FOREIGN KEY (report_instance_id) REFERENCES public.dtr_report_snapshots (id)
--   NOT VALID;


-- ───────────────────────────────────────────────────────────────────────────
-- PRE-MIGRATION QA (read-only)
-- ───────────────────────────────────────────────────────────────────────────

-- SELECT COUNT(*) AS wallet_rows FROM public.reply_ticket_wallets;
-- SELECT COUNT(*) AS snapshot_er
--   FROM public.dtr_report_snapshots
--   WHERE product_id = 'DTR_CORE_STATIC_V1';
-- Wallets with no matching snapshot (should be listed; do not auto-assign blindly)
-- SELECT w.user_id
--   FROM public.reply_ticket_wallets w
--   LEFT JOIN public.dtr_report_snapshots s
--     ON s.user_id = w.user_id AND s.product_id = 'DTR_CORE_STATIC_V1'
--   WHERE s.id IS NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE B — Backfill wallet.report_instance_id from dtr_report_snapshots.id
-- ───────────────────────────────────────────────────────────────────────────

-- Single-snapshot-per-(user,product) assumption (current UNIQUE on dtr_report_snapshots):
-- UPDATE public.reply_ticket_wallets AS w
-- SET report_instance_id = s.id,
--     migration_status = 'filled'
-- FROM public.dtr_report_snapshots AS s
-- WHERE s.user_id = w.user_id
--   AND s.product_id = 'DTR_CORE_STATIC_V1'
--   AND w.report_instance_id IS NULL;

-- Mark rows with no snapshot match for manual handling (no destructive guess)
-- UPDATE public.reply_ticket_wallets
-- SET migration_status = 'manual_review'
-- WHERE report_instance_id IS NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE C — Propagate to reply_wallet_ledgers from parent wallet
-- ───────────────────────────────────────────────────────────────────────────

-- UPDATE public.reply_wallet_ledgers AS l
-- SET report_instance_id = w.report_instance_id
-- FROM public.reply_ticket_wallets AS w
-- WHERE l.wallet_id = w.id
--   AND l.report_instance_id IS NULL
--   AND w.report_instance_id IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE D — Backfill reply_sessions (one snapshot per user/product today)
-- ───────────────────────────────────────────────────────────────────────────

-- UPDATE public.reply_sessions AS rs
-- SET report_instance_id = s.id
-- FROM public.dtr_report_snapshots AS s
-- WHERE s.user_id = rs.user_id
--   AND s.product_id = 'DTR_CORE_STATIC_V1'
--   AND rs.report_instance_id IS NULL;

-- Sessions with no snapshot: leave NULL + flag for app/ops (do not invent)


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE E — Verification (must pass before NOT NULL + UNIQUE swap)
-- ───────────────────────────────────────────────────────────────────────────

-- NULL wallets that are not explicitly in manual_review (should be 0 or accepted count)
-- SELECT COUNT(*) FROM reply_ticket_wallets
--   WHERE report_instance_id IS NULL AND COALESCE(migration_status, '') <> 'manual_review';

-- Duplicate (user_id, report_instance_id) would break new UNIQUE — must be 0
-- SELECT user_id, report_instance_id, COUNT(*)
--   FROM reply_ticket_wallets
--   WHERE report_instance_id IS NOT NULL
--   GROUP BY 1, 2
--   HAVING COUNT(*) > 1;


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE F — Replace UNIQUE(user_id) with UNIQUE(user_id, report_instance_id)
--           Run only after NULLs resolved for rows that must participate.
-- ───────────────────────────────────────────────────────────────────────────

-- Option 1: DROP old unique (name from STEP 0!)
-- ALTER TABLE public.reply_ticket_wallets
--   DROP CONSTRAINT reply_ticket_wallets_user_id_key;

-- Add new composite unique
-- ALTER TABLE public.reply_ticket_wallets
--   ADD CONSTRAINT reply_ticket_wallets_user_id_report_instance_unique
--   UNIQUE (user_id, report_instance_id);

-- Note: If any row still has report_instance_id IS NULL, Postgres allows multiple
-- (user_id, NULL) — so NOT NULL enforcement must come first for "real" wallets
-- OR exclude NULL rows from this table via archive (separate design).


-- ───────────────────────────────────────────────────────────────────────────
-- PHASE G — NOT NULL (wallet first, then ledger/session as policy allows)
-- ───────────────────────────────────────────────────────────────────────────

-- ALTER TABLE public.reply_ticket_wallets
--   ALTER COLUMN report_instance_id SET NOT NULL;

-- Optional: ledger/session NOT NULL only after backfill + app compatibility


-- COMMIT;

-- ============================================================================
-- RPC / application follow-up (separate migrations / PRs — not this draft file):
-- - m55_reply_generate_commit: FOR UPDATE wallet scoped by (user_id, report_instance_id)
-- - walletGrants: grant* functions take report_instance_id
-- ============================================================================

-- ============================================================================
-- POST-MIGRATION sanity (read-only)
-- ============================================================================
-- SELECT COUNT(*) FROM reply_ticket_wallets WHERE report_instance_id IS NULL;
-- Verify ledger matches wallet for new writes after app deploy (spot check)


-- ============================================================================
-- ROLLBACK sketch (manual — depends on phase reached)
-- ============================================================================
-- IF only Phase A applied: ALTER TABLE ... DROP COLUMN report_instance_id;
-- IF UNIQUE swapped: restore reply_ticket_wallets_user_id_key from backup DDL
-- Always prefer point-in-time restore for botched mid-migration state
