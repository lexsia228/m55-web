-- ============================================================================
-- PHASE 0 ONLY — READ-ONLY PREFLIGHT (STAGING / DEV — NOT PRODUCTION)
-- Path: scripts/sql/staging/m55_reply_wallet_report_instance_phase0_only.sql
--
-- Paste-safe bundle: executable statements are SELECT only (no DDL/DML).
-- Phase A〜H は含まない。貼り付け誤実行のリスク低減用。
--
-- Full packet (Phase A〜H DDL/DML はコメント): see
--   m55_reply_wallet_report_instance_scope_staging_packet.sql
-- SSOT: docs/ssot/M55_REPLY_WALLET_STAGING_RUNBOOK_HARDENING_REVIEW_v1.md
--       docs/ssot/M55_REPLY_WALLET_PHASE0_PREFLIGHT_EXECUTION_PREP_v1.md
--
-- Do NOT paste secrets. Record project ref via Dashboard human check (see PREP §C).
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ STOP — READ BEFORE ANY EXECUTION                                         ║
-- ║                                                                          ║
-- ║ STOP if ANY wallet has no DTR_CORE_STATIC_V1 snapshot (Phase 0 shows    ║
-- ║      orphaned users).                                                    ║
-- ║ STOP if duplicate snapshot rows exist per (user_id, product_id).         ║
-- ║ STOP if project ref / Dashboard host matches PRODUCTION or UNKNOWN.       ║
-- ║ STOP if connection is not confirmed staging/dev by a human reviewer.      ║
-- ║ STOP if backup / PITR path is not confirmed (required before any DDL;     ║
-- ║      optional for read-only Phase 0 per team policy).                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝


-- ############################################################################
-- ## PHASE 0_READ_ONLY_PREFLIGHT + hardening (sync with staging packet)     ##
-- ############################################################################

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

SELECT con.conname AS unique_constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_def
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype IN ('u')
ORDER BY con.conname;

SELECT w.user_id AS wallet_user_without_snapshot
FROM public.reply_ticket_wallets w
LEFT JOIN public.dtr_report_snapshots s
  ON s.user_id = w.user_id
 AND s.product_id = 'DTR_CORE_STATIC_V1'
WHERE s.id IS NULL;

SELECT user_id, product_id, COUNT(*) AS cnt
FROM public.dtr_report_snapshots
GROUP BY 1, 2
HAVING COUNT(*) > 1;

SELECT user_id, COUNT(*) AS cnt
FROM public.dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1'
GROUP BY user_id
HAVING COUNT(*) > 1;

SELECT l.id AS orphan_ledger_id, l.wallet_id
FROM public.reply_wallet_ledgers l
LEFT JOIN public.reply_ticket_wallets w ON w.id = l.wallet_id
WHERE w.id IS NULL;

SELECT d.id AS orphan_document_id, d.reply_session_id
FROM public.reply_documents d
LEFT JOIN public.reply_sessions s ON s.id = d.reply_session_id
WHERE s.id IS NULL;

SELECT COUNT(*) AS reply_sessions_users_without_entry_snapshot
FROM public.reply_sessions rs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots s
  WHERE s.user_id = rs.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
);


-- PHASE 0 (hardening)
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

SELECT l.id AS ledger_reply_consume_missing_session_id
FROM public.reply_wallet_ledgers l
WHERE l.event_type = 'reply_consume'
  AND l.reply_session_id IS NULL;

SELECT l.id AS ledger_grant_weak_tracking_id
FROM public.reply_wallet_ledgers l
WHERE l.event_type IN ('included_grant', 'purchase_grant')
  AND l.source_of_grant IS NULL;

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

SELECT w.id AS wallet_no_ledger_but_nonzero_balances_id, w.user_id,
       w.available_count, w.initial_included_count, w.purchased_count, w.consumed_count
FROM public.reply_ticket_wallets w
WHERE NOT EXISTS (SELECT 1 FROM public.reply_wallet_ledgers l WHERE l.wallet_id = w.id)
  AND (
    w.initial_included_count <> 0 OR w.purchased_count <> 0 OR w.consumed_count <> 0
    OR w.available_count <> 0
  );

SELECT id FROM public.dtr_report_snapshots
WHERE user_id IS NULL OR btrim(user_id) = ''
   OR product_id IS NULL OR btrim(product_id) = '';

SELECT s.user_id AS snapshot_user_without_wallet, s.id AS snapshot_id
FROM public.dtr_report_snapshots s
WHERE s.product_id = 'DTR_CORE_STATIC_V1'
  AND NOT EXISTS (
    SELECT 1 FROM public.reply_ticket_wallets w WHERE w.user_id = s.user_id
  );

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

SELECT o.checkout_session_id, o.user_id
FROM public.one_time_fulfillments o
LEFT JOIN public.dtr_report_snapshots s ON s.checkout_session_id = o.checkout_session_id
WHERE o.product_id = 'DTR_CORE_STATIC_V1'
  AND s.id IS NULL;

SELECT d.id AS document_id, d.reply_session_id,
       d.user_id AS document_user_id, s.user_id AS session_user_id
FROM public.reply_documents d
JOIN public.reply_sessions s ON s.id = d.reply_session_id
WHERE d.user_id IS DISTINCT FROM s.user_id;

SELECT COUNT(*) AS succeeded_sessions_without_document
FROM public.reply_sessions rs
WHERE rs.status = 'succeeded'
  AND NOT EXISTS (
    SELECT 1 FROM public.reply_documents d WHERE d.reply_session_id = rs.id
  );


-- ############################################################################
-- ## Record results in ticket. Do NOT run Phase A+ from packet without GO.   ##
-- ############################################################################
-- END OF PHASE 0 ONLY FILE
