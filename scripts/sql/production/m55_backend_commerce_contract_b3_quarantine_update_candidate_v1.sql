-- BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE — UPDATE candidate (NOT EXECUTED in planning gate)
-- Target: m55-soul-core PRODUCTION
-- Run ONLY after:
--   1) m55_backend_commerce_contract_b3_quarantine_readonly_preflight_v1.sql PASS
--   2) BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC Human GO: BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE go
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_EXEC_PLANNING_2026-05-23.md
--
-- Mutates: reply_ticket_wallets.status = 'closed' ONLY (+ updated_at)
-- Does NOT mutate: balances, report_instance_id, ledger, DELETE
-- Expected rowcount: quarantine_apply_candidate_count from preflight

-- ============================================================================
-- FORWARD UPDATE — close classified null-scope active wallets
-- ============================================================================

UPDATE public.reply_ticket_wallets AS w
SET
  status = 'closed',
  updated_at = now()
WHERE w.report_instance_id IS NULL
  AND w.status = 'active'
  AND w.purchased_count = 0
  AND (
    w.user_id LIKE 'smoke\_user\_%' ESCAPE '\'
    OR w.user_id LIKE 'smoke_user%'
    OR (
      SELECT COUNT(*)::int
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND s.user_hidden_at IS NULL
    ) = 0
  )
  AND NOT (
    NOT (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%')
    AND (
      SELECT COUNT(*)::int
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND s.user_hidden_at IS NULL
    ) = 1
    AND w.initial_included_count > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS s2
      WHERE s2.user_id = w.user_id
        AND s2.report_instance_id IS NOT NULL
        AND s2.status = 'active'
    )
  )
RETURNING md5(w.id::text) AS hashed_wallet_pk;

-- ============================================================================
-- ROLLBACK CANDIDATE — COMMENT ONLY — separate Human GO required
-- ============================================================================
/*
UPDATE public.reply_ticket_wallets AS w
SET
  status = 'active',
  updated_at = now()
WHERE w.report_instance_id IS NULL
  AND w.status = 'closed'
  AND w.purchased_count = 0
  AND (
    w.user_id LIKE 'smoke\_user\_%' ESCAPE '\'
    OR w.user_id LIKE 'smoke_user%'
    OR (
      SELECT COUNT(*)::int
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND s.user_hidden_at IS NULL
    ) = 0
  );
*/
