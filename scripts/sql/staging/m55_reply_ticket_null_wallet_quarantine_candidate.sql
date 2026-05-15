-- ============================================================================
-- STAGING / CANDIDATE ONLY — DO NOT RUN WITHOUT FINAL GATE
-- ============================================================================
-- Path: scripts/sql/staging/m55_reply_ticket_null_wallet_quarantine_candidate.sql
--
-- Scope: quarantine orphan NULL-report reply_ticket_wallets (status → closed)
-- Reason: prepare report_instance-scoped wallet migration (see SSOT preflight)
--
-- Related SSOT:
--   docs/ssot/M55_REPLY_TICKET_WALLET_REPORT_SCOPE_PREFLIGHT_RESULT_v1.md
--   docs/ssot/M55_REPLY_TICKET_NULL_WALLET_POLICY_v1.md
--
-- Safety:
--   - No DELETE.
--   - No raw identifiers in result sets (aggregates / counts only).
--   - Section B is COMMENTED — no mutation until explicit approval.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION A — SELECT-only preflight (safe to run)
-- ----------------------------------------------------------------------------

-- A1: Active wallets with NULL report_instance_id (verify against policy SSOT).
SELECT COUNT(*)::bigint AS active_null_report_wallet_count
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NULL
  AND w.status = 'active';

-- A2: NULL-report wallets by status (no per-row identifiers).
SELECT w.status, COUNT(*)::bigint AS row_count
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NULL
GROUP BY w.status
ORDER BY w.status;

-- A3: Active NULL-scope wallets whose user_id has no rows in dtr_report_snapshots
--     (no snapshot corpus to pair with; aligns with “no matching snapshot” preflight narrative).
SELECT COUNT(*)::bigint AS active_null_wallets_user_has_no_snapshot_rows
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NULL
  AND w.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE btrim(s.user_id) = btrim(w.user_id)
  );

-- A4: Non-null scopes — duplicate (user_id, report_instance_id) groups (expect 0).
SELECT COUNT(*)::bigint AS duplicate_non_null_scope_group_count
FROM (
  SELECT 1
  FROM public.reply_ticket_wallets
  WHERE report_instance_id IS NOT NULL
  GROUP BY btrim(user_id), report_instance_id
  HAVING COUNT(*) > 1
) AS d;

-- ----------------------------------------------------------------------------
-- SECTION B — COMMENTED transaction candidate (DO NOT RUN until approved)
--
-- Preconditions (human):
--   [ ] Section A counts align with policy SSOT (e.g. active null scope = expected batch).
--   [ ] Backup / change window per org policy.
--   [ ] No DELETE; quarantine is status = 'closed' only.
-- ----------------------------------------------------------------------------

/*
BEGIN;

WITH quarantine AS (
  UPDATE public.reply_ticket_wallets AS w
  SET
    status = 'closed',
    updated_at = now()
  WHERE w.report_instance_id IS NULL
    AND w.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.dtr_report_snapshots AS s
      WHERE btrim(s.user_id) = btrim(w.user_id)
    )
  RETURNING 1
)
SELECT COUNT(*)::bigint AS quarantined_row_count FROM quarantine;

COMMIT;
*/

-- ----------------------------------------------------------------------------
-- SECTION C — Post-check SELECT-only (run after Section B in a future approved window)
-- ----------------------------------------------------------------------------

-- C1: Remaining active wallets with NULL report_instance_id (expect 0 after quarantine).
SELECT COUNT(*)::bigint AS active_null_report_wallet_remaining
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NULL
  AND w.status = 'active';

-- C2: Wallets with non-null report_instance_id.
SELECT COUNT(*)::bigint AS non_null_report_wallet_count
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL;

-- C3: Duplicate non-null (user_id, report_instance_id) pairs (expect 0).
SELECT COUNT(*)::bigint AS duplicate_non_null_scope_group_count
FROM (
  SELECT 1
  FROM public.reply_ticket_wallets
  WHERE report_instance_id IS NOT NULL
  GROUP BY btrim(user_id), report_instance_id
  HAVING COUNT(*) > 1
) AS d;

-- ----------------------------------------------------------------------------
-- SECTION D — Next migration gate (documentation only)
-- ----------------------------------------------------------------------------
-- After orphan NULL-report wallets are quarantined (closed) per approved policy:
--   1. Proceed to report-scope unique migration candidate:
--        scripts/sql/staging/m55_reply_ticket_wallets_report_scope_unique_migration_candidate.sql
--   2. Do NOT SET report_instance_id NOT NULL until NULL rows are resolved or excluded by policy.
--   3. Do NOT DROP UNIQUE(user_id) until report-scope uniqueness is confirmed safe on target DB.
--   4. Deploy RPC replacement in DB after DDL alignment:
--        scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql
-- ----------------------------------------------------------------------------

-- END OF FILE
