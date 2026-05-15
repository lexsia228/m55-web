-- ============================================================================
-- M55 — PHASE B1 — WALLET report_instance_id UPDATE — SINGLE CANDIDATE STATEMENT
-- Path: scripts/sql/production/m55_reply_wallet_phase_b1_wallet_update_candidate.sql
--
-- STATUS: **Execution candidate — NOT EXECUTED**. Run only after separate approval,
--   replay of preflight, and EXECUTION GATE SSOT sign-off (production window).
--
-- Contains exactly **one** UPDATE statement targeting **public.reply_ticket_wallets only**.
-- Does NOT touch reply_wallet_ledgers or reply_sessions.
--
-- Forbidden in this file: INSERT, DELETE, ALTER, DROP, CREATE, SET, NOTIFY.
-- (No SELECT statements — verification is preflight / postflight scripts elsewhere.)
--
-- Value semantics: populate reply_ticket_wallets.report_instance_id FROM
--   dtr_report_snapshots.id where product_id = 'DTR_CORE_STATIC_V1' and per-user snapshot
--   count under that product is exactly 1, row not smoke-pattern, wallet.report_instance_id
--   currently NULL.
--
-- SSOT: docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_EXECUTION_GATE_v1.md
-- Evidence: docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PREFLIGHT_RESULT_v1.md
--
-- Do not paste secrets, service role URLs, or raw PII into tickets.
-- ============================================================================


UPDATE public.reply_ticket_wallets AS w
SET report_instance_id = s.id
FROM public.dtr_report_snapshots AS s
WHERE s.user_id = w.user_id
  AND s.product_id = 'DTR_CORE_STATIC_V1'
  AND w.report_instance_id IS NULL
  AND NOT (
    w.user_id LIKE 'smoke\_user\_%' ESCAPE '\'
    OR w.user_id LIKE 'smoke_user%'
  )
  AND (
    SELECT count(*)::int
    FROM public.dtr_report_snapshots AS sx
    WHERE sx.user_id = w.user_id
      AND sx.product_id = 'DTR_CORE_STATIC_V1'
  ) = 1
RETURNING md5(w.id::text) AS hashed_wallet_pk;


-- ============================================================================
-- ROLLBACK CANDIDATE — COMMENT ONLY — DO NOT RUN without separate approval
-- ----------------------------------------------------------------------------
-- Intent: revert B1-fill by NULLing report_instance_id only for wallet rows whose
--   current value equals the immutable DTR_CORE_STATIC_V1 snapshot id for same user_id,
--   with exactly one snapshot and non-smoke pattern (mirror of forward cohort).
--
-- Executes a second UPDATE — still DML — must use own change ticket + rollback SSOT.
-- ============================================================================

/*
UPDATE public.reply_ticket_wallets AS w
SET report_instance_id = NULL
WHERE w.report_instance_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.id = w.report_instance_id
      AND s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
  )
  AND (
    SELECT count(*)::int
    FROM public.dtr_report_snapshots AS sx
    WHERE sx.user_id = w.user_id
      AND sx.product_id = 'DTR_CORE_STATIC_V1'
  ) = 1
  AND NOT (
    w.user_id LIKE 'smoke\_user\_%' ESCAPE '\'
    OR w.user_id LIKE 'smoke_user%'
  );
*/

-- END OF FILE
