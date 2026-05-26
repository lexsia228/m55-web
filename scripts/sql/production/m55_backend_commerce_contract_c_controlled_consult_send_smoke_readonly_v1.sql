-- BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE — read-only pre/post aggregate metrics
-- Target: m55-soul-core PRODUCTION
-- Gate: planning artifact · run §5 before smoke · re-run §5 after smoke + §6 idempotency invariant
-- Forbidden: INSERT/UPDATE/DELETE/ALTER · SELECT * · row dumps · raw IDs
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_CONTROLLED_CONSULT_SEND_SMOKE_PLANNING_2026-05-23.md

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. S-5 guard (must PASS before smoke) ═══
SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_null_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active' AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

-- STOP if any above > 0

-- ═══ 2. Spendable scoped wallet inventory (aggregate · no user filter) ═══
SELECT COUNT(*)::bigint AS scoped_wallets_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL
  AND status = 'active'
  AND available_count > 0;

SELECT SUM(available_count)::bigint AS scoped_active_available_sum
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL
  AND status = 'active';

-- Human pre-check: test account must have available_count >= 1 (via GET /api/room/core UI only)

-- ═══ 3. Contract-C smoke baselines (POSTFLIGHT-R §5) ═══
SELECT COUNT(*)::bigint AS ledger_reply_consume_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'reply_consume';

SELECT COUNT(*)::bigint AS ledger_reply_consume_with_consult_commit_id
FROM public.reply_wallet_ledgers
WHERE event_type = 'reply_consume'
  AND consult_commit_id IS NOT NULL;

SELECT COUNT(*)::bigint AS consult_send_commits_total
FROM public.consult_send_commits;

SELECT COUNT(*)::bigint AS consult_send_commits_succeeded
FROM public.consult_send_commits
WHERE status = 'succeeded';

SELECT COUNT(*)::bigint AS consult_send_commits_pending
FROM public.consult_send_commits
WHERE status = 'pending';

SELECT COUNT(*)::bigint AS consult_send_commits_failed
FROM public.consult_send_commits
WHERE status = 'failed';

-- POSTFLIGHT-R anchor (2026-05-23): ledger_reply_consume_total=4 · consult_commit_id ledger=0 · commits=0

-- ═══ 4. Post-smoke expected deltas (after exactly one successful send) ═══
-- ledger_reply_consume_total                    +1
-- ledger_reply_consume_with_consult_commit_id   +1
-- consult_send_commits_total                    +1
-- consult_send_commits_succeeded                +1
-- scoped_active_available_sum                   -1 (global sum; valid when single test user consumes)
-- After idempotency replay: all §3 counts UNCHANGED

-- ═══ 5. Idempotency invariant (post-retry · read-only) ═══
-- Re-run §3 · counts must match post-first-send snapshot exactly

-- ═══ 6. Safety-block control (optional · separate step) ═══
-- If safety-block send attempted: §3 counts must match pre-smoke snapshot (no delta)

-- STOP post-smoke if:
--   consult_send_commits_succeeded did not increase by exactly 1
--   ledger_reply_consume_with_consult_commit_id did not increase by exactly 1
--   ledger_reply_consume_total did not increase by exactly 1
--   idempotency replay changed any §3 count
--   S-5 metrics in §1 regressed
