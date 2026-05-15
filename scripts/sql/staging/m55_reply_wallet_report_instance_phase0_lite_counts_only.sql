-- ============================================================================
-- PHASE 0 LITE — COUNTS / METRICS ONLY (READ-ONLY)
-- Path: scripts/sql/staging/m55_reply_wallet_report_instance_phase0_lite_counts_only.sql
--
-- Purpose: First-run safe bundle when staging/prod split is unclear on the UI.
-- - Executable statements: SELECT only.
-- - No user_id, email, checkout_session_id, or per-row raw identifiers in the
--   result set (aggregates and DB object names only).
--
-- Still: confirm project in Supabase Dashboard before running (operational policy).
-- Do not paste secrets into tickets.
--
-- Related: m55_reply_wallet_report_instance_phase0_only.sql (full diagnostics)
-- SSOT: docs/ssot/M55_REPLY_WALLET_PHASE0_PRE_EXECUTION_CHECKLIST_v1.md
-- ============================================================================


SELECT 'current_database'::text AS metric, current_database()::text AS value
UNION ALL
SELECT 'reply_ticket_wallets_count', COUNT(*)::text FROM public.reply_ticket_wallets
UNION ALL
SELECT 'reply_wallet_ledgers_count', COUNT(*)::text FROM public.reply_wallet_ledgers
UNION ALL
SELECT 'reply_sessions_count', COUNT(*)::text FROM public.reply_sessions
UNION ALL
SELECT 'reply_documents_count', COUNT(*)::text FROM public.reply_documents
UNION ALL
SELECT 'dtr_report_snapshots_count', COUNT(*)::text FROM public.dtr_report_snapshots
UNION ALL
SELECT 'dtr_core_static_v1_snapshot_count', COUNT(*)::text
FROM public.dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1'
UNION ALL
SELECT 'reply_ticket_wallets_unique_constraint_names',
  COALESCE(
    (
      SELECT string_agg(con.conname::text, ', ' ORDER BY con.conname)
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'reply_ticket_wallets'
        AND con.contype IN ('u')
    ),
    ''
  )::text
UNION ALL
SELECT 'wallet_user_without_snapshot_count', COUNT(*)::text
FROM public.reply_ticket_wallets w
LEFT JOIN public.dtr_report_snapshots s
  ON s.user_id = w.user_id
 AND s.product_id = 'DTR_CORE_STATIC_V1'
WHERE s.id IS NULL
UNION ALL
SELECT 'snapshot_duplicate_user_product_count', COUNT(*)::text
FROM (
  SELECT 1
  FROM public.dtr_report_snapshots
  GROUP BY user_id, product_id
  HAVING COUNT(*) > 1
) dup
UNION ALL
SELECT 'dtr_core_snapshot_duplicate_user_count', COUNT(*)::text
FROM (
  SELECT 1
  FROM public.dtr_report_snapshots
  WHERE product_id = 'DTR_CORE_STATIC_V1'
  GROUP BY user_id
  HAVING COUNT(*) > 1
) dup
UNION ALL
SELECT 'ledger_orphan_count', COUNT(*)::text
FROM public.reply_wallet_ledgers l
LEFT JOIN public.reply_ticket_wallets w ON w.id = l.wallet_id
WHERE w.id IS NULL
UNION ALL
SELECT 'document_orphan_count', COUNT(*)::text
FROM public.reply_documents d
LEFT JOIN public.reply_sessions s ON s.id = d.reply_session_id
WHERE s.id IS NULL
UNION ALL
SELECT 'wallet_balance_formula_broken_count', COUNT(*)::text
FROM public.reply_ticket_wallets
WHERE available_count
  <> initial_included_count + purchased_count - consumed_count
UNION ALL
SELECT 'wallet_negative_count', COUNT(*)::text
FROM public.reply_ticket_wallets
WHERE available_count < 0
   OR consumed_count < 0
   OR purchased_count < 0
   OR initial_included_count < 0
UNION ALL
SELECT 'wallet_consumed_exceeds_granted_count', COUNT(*)::text
FROM public.reply_ticket_wallets
WHERE consumed_count > initial_included_count + purchased_count
UNION ALL
SELECT 'wallet_status_unexpected_count', COUNT(*)::text
FROM public.reply_ticket_wallets
WHERE status NOT IN ('active', 'suspended', 'closed')
UNION ALL
SELECT 'reply_consume_without_session_count', COUNT(*)::text
FROM public.reply_wallet_ledgers l
WHERE l.event_type = 'reply_consume'
  AND l.reply_session_id IS NULL
UNION ALL
SELECT 'grant_missing_source_count', COUNT(*)::text
FROM public.reply_wallet_ledgers l
WHERE l.event_type IN ('included_grant', 'purchase_grant')
  AND l.source_of_grant IS NULL
UNION ALL
SELECT 'latest_ledger_balance_mismatch_count', COUNT(*)::text
FROM public.reply_ticket_wallets w
JOIN (
  SELECT DISTINCT ON (wallet_id)
    wallet_id, balance_after
  FROM public.reply_wallet_ledgers
  ORDER BY wallet_id, created_at DESC, id DESC
) lr ON lr.wallet_id = w.id
WHERE lr.balance_after IS DISTINCT FROM w.available_count
UNION ALL
SELECT 'snapshot_without_wallet_count', COUNT(*)::text
FROM public.dtr_report_snapshots s
WHERE s.product_id = 'DTR_CORE_STATIC_V1'
  AND NOT EXISTS (
    SELECT 1 FROM public.reply_ticket_wallets w WHERE w.user_id = s.user_id
  )
UNION ALL
SELECT 'rights_without_snapshot_count', COUNT(*)::text
FROM public.entitlement_rights er
LEFT JOIN public.dtr_report_snapshots s
  ON s.user_id = er.user_id AND s.product_id = 'DTR_CORE_STATIC_V1'
WHERE er.right_key = 'm55_p:core_origin'
  AND s.id IS NULL
UNION ALL
SELECT 'snapshot_without_rights_count', COUNT(*)::text
FROM public.dtr_report_snapshots s
LEFT JOIN public.entitlement_rights er
  ON er.user_id = s.user_id AND er.right_key = 'm55_p:core_origin'
WHERE s.product_id = 'DTR_CORE_STATIC_V1'
  AND er.id IS NULL
UNION ALL
SELECT 'sessions_without_entry_snapshot_count', COUNT(*)::text
FROM public.reply_sessions rs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots s
  WHERE s.user_id = rs.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
)
UNION ALL
SELECT 'succeeded_session_without_document_count', COUNT(*)::text
FROM public.reply_sessions rs
WHERE rs.status = 'succeeded'
  AND NOT EXISTS (
    SELECT 1 FROM public.reply_documents d WHERE d.reply_session_id = rs.id
  );
