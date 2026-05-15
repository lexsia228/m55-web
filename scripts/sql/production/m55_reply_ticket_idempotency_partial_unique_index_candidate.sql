-- ============================================================================
-- M55 — REPLY TICKET — IDEMPOTENCY — PARTIAL UNIQUE INDEX — PRODUCTION DDL CANDIDATE
-- Path: scripts/sql/production/m55_reply_ticket_idempotency_partial_unique_index_candidate.sql
--
-- ⚠ DO NOT RUN THIS FILE WITHOUT FINAL APPROVAL AND PRODUCTION APPLY GATE ⚠
--
-- - Production-oriented candidate only. Executable statement: CREATE UNIQUE INDEX (one).
-- - No NOT NULL / FK / CHECK in this file. No payload_json or secrets.
-- - Do NOT place this file under supabase/migrations until an approved migration path exists.
-- - No Webhook / Checkout / Dashboard / catalog UI changes are implied here.
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_CANDIDATE_v1.md
-- Design upstream: docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1.md
-- Preflight observation: docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_RESULT_v1.md
--
-- ========================================================================


CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_processed_events_stripe_event_id_unique_not_null
ON public.stripe_processed_events (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;


-- END OF FILE
