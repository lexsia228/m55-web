-- =============================================================================
-- READ-ONLY — Phase 5-4 Production ghost / test-marker sanity check
-- Path: scripts/sql/production/m55_phase5_4_production_ghost_data_readonly_check_v1.sql
--
-- Run ONLY after explicit GO, against Production (or approved target), by DBA.
-- SELECT only — no DML/DDL/GRANT/REVOKE/NOTIFY.
-- No secrets. No full user_id values in output (counts and booleans only).
--
-- SECTION 1: safe on typical Production schema (pre or post reply-lane migration).
-- SECTION 2: references stripe_processed_events and reply_wallet_ledgers.product_key;
--   run ONLY after Phase 5-2 migration candidate has created those objects/columns.
--   If run early, PostgreSQL will error — treat as STOP signal to run Section 1 only.
--
-- Interpretation: non-zero evt_test / cs_test counts in Production may warrant ops
--   review (not automatic DELETE).
-- =============================================================================

-- SECTION 1 — Core aggregates (no stripe_processed_events dependency)

-- dtr_report_snapshots: distribution by product_id (counts only)
SELECT s.product_id, COUNT(*)::bigint AS snapshot_row_count
FROM public.dtr_report_snapshots AS s
GROUP BY s.product_id
ORDER BY s.product_id;

-- reply_ticket_wallets: rows missing report_instance_id (report-scope contract)
SELECT COUNT(*)::bigint AS reply_ticket_wallets_report_instance_id_null_count
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NULL;

-- Stripe webhook idempotency table: test-mode event id prefix heuristic (if table exists)
SELECT COUNT(*)::bigint AS stripe_events_evt_test_prefix_count
FROM public.stripe_events AS e
WHERE e.event_id LIKE 'evt\_test%' ESCAPE '\';

-- One-time fulfillments: Stripe test Checkout session id prefix heuristic
SELECT COUNT(*)::bigint AS one_time_fulfillments_cs_test_prefix_count
FROM public.one_time_fulfillments AS o
WHERE o.checkout_session_id LIKE 'cs\_test%' ESCAPE '\';

-- failed_fulfillments: backlog size (aggregate only)
SELECT COUNT(*)::bigint AS failed_fulfillments_total_count
FROM public.failed_fulfillments;

-- =============================================================================
-- SECTION 2 — Post reply-lane DDL (stripe_processed_events + ledger.product_key)
-- Execute this block ONLY after migration candidate applied; otherwise expect ERROR.
-- =============================================================================

SELECT COUNT(*)::bigint AS stripe_processed_events_total_count
FROM public.stripe_processed_events;

SELECT COUNT(*)::bigint AS stripe_processed_events_cs_test_prefix_count
FROM public.stripe_processed_events AS spe
WHERE spe.checkout_session_id IS NOT NULL
  AND spe.checkout_session_id LIKE 'cs\_test%' ESCAPE '\';

SELECT COUNT(*)::bigint AS stripe_processed_events_evt_test_prefix_count
FROM public.stripe_processed_events AS spe
WHERE spe.stripe_event_id IS NOT NULL
  AND spe.stripe_event_id LIKE 'evt\_test%' ESCAPE '\';

SELECT COUNT(*)::bigint AS reply_wallet_ledgers_additional_reply_ticket_product_key_count
FROM public.reply_wallet_ledgers AS l
WHERE l.product_key = 'additional_reply_ticket';

-- END OF FILE
