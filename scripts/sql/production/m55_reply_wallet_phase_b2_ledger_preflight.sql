-- ============================================================================
-- M55 — PHASE B2 — LEDGER INHERIT PREFLIGHT — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_wallet_phase_b2_ledger_preflight.sql
--
-- Executable: SELECT statements only (read-before B2 ledger UPDATE).
-- Forbidden: UPDATE, INSERT, DELETE, ALTER, DROP, CREATE, SET, NOTIFY.
--
-- Never returns raw user_id, checkout_session_id, snapshot/envelope/profile body,
--   or plaintext ledger_id / wallet_id / report_instance_id UUIDs.
-- IDs and report_instance keys appear as md5(id::text) only when needed.
--
-- Post-B1 semantics: ledger "inherit candidate" rows are those whose parent wallet
--   has reply_ticket_wallets.report_instance_id NOT NULL (B1-fill) AND ledger.report_instance_id IS NULL,
--   excluding orphan ledger rows without a parent wallet row.
-- This differs from verbatim use of diagnostic label wallet_safe_candidate AFTER B1
-- (filled wallets move to wallet_already_set_review in Phase B diagnostic), so B2
-- predicates key off parent.report_instance_id, not obsolete safe_candidate label.
--
-- SSOT: docs/ssot/M55_REPLY_WALLET_PHASE_B2_LEDGER_PREFLIGHT_PACKET_v1.md
-- Design: docs/ssot/M55_REPLY_WALLET_PHASE_B2_LEDGER_INHERIT_DESIGN_REVIEW_v1.md
--
-- BEFORE RUNNING: Confirm target DB. Do not paste secrets into tickets.
-- Run SECTION by SECTION — Supabase Editor often shows last result set only.
-- ============================================================================


-- =============================================================================
-- SECTION 1 — AGGREGATE (single row — cross-table counts + ledger classification buckets)
-- =============================================================================
WITH ledger_lane AS (
  SELECT
    l.id AS ledger_id,
    l.report_instance_id AS ledger_ri,
    pw.id AS pw_id,
    pw.report_instance_id AS parent_wallet_ri,
    CASE
      WHEN pw.id IS NULL THEN 'ledger_orphan_manual_review'
      WHEN l.report_instance_id IS NOT NULL THEN 'ledger_already_set_manual_review'
      WHEN pw.report_instance_id IS NOT NULL THEN 'ledger_safe_inherit_candidate'
      ELSE 'ledger_parent_quarantine'
    END AS candidate_status
  FROM public.reply_wallet_ledgers AS l
  LEFT JOIN public.reply_ticket_wallets AS pw ON pw.id = l.wallet_id
)
SELECT
  count(*)::bigint AS total_ledger_count,
  count(*) FILTER (WHERE ledger_ri IS NOT NULL)::bigint AS ledger_report_instance_non_null_count,
  (SELECT count(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)
    AS wallet_report_instance_non_null_count,
  (SELECT count(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)
    AS session_report_instance_non_null_count,
  count(*) FILTER (WHERE candidate_status = 'ledger_safe_inherit_candidate')::bigint
    AS ledger_safe_inherit_candidate_count,
  count(*) FILTER (WHERE candidate_status = 'ledger_parent_quarantine')::bigint
    AS ledger_parent_quarantine_count,
  count(*) FILTER (WHERE candidate_status = 'ledger_orphan_manual_review')::bigint
    AS ledger_orphan_count,
  count(*) FILTER (WHERE candidate_status = 'ledger_already_set_manual_review')::bigint
    AS ledger_already_set_count
FROM ledger_lane;


-- =============================================================================
-- SECTION 2 — CANDIDATE DETAIL — hash-only ledger rows (default: all ledger rows)
-- Optional: constrain to inherit lane only — see trailing WHERE comment.
-- =============================================================================
WITH ledger_lane AS (
  SELECT
    l.id AS ledger_id,
    md5(l.id::text) AS hashed_ledger_id,
    md5(l.wallet_id::text) AS hashed_wallet_id,
    l.report_instance_id AS ledger_ri,
    pw.report_instance_id AS parent_wallet_ri,
    CASE
      WHEN pw.id IS NULL THEN 'ledger_orphan_manual_review'
      WHEN l.report_instance_id IS NOT NULL THEN 'ledger_already_set_manual_review'
      WHEN pw.report_instance_id IS NOT NULL THEN 'ledger_safe_inherit_candidate'
      ELSE 'ledger_parent_quarantine'
    END AS candidate_status
  FROM public.reply_wallet_ledgers AS l
  LEFT JOIN public.reply_ticket_wallets AS pw ON pw.id = l.wallet_id
)
SELECT
  ll.hashed_ledger_id,
  ll.hashed_wallet_id,
  CASE
    WHEN ll.parent_wallet_ri IS NOT NULL THEN md5(ll.parent_wallet_ri::text)
    ELSE NULL::text
  END AS hashed_parent_report_instance_key,
  (ll.parent_wallet_ri IS NOT NULL) AS parent_wallet_report_instance_is_non_null,
  (ll.ledger_ri IS NULL) AS ledger_report_instance_is_null,
  ll.candidate_status
FROM ledger_lane AS ll
-- WHERE candidate_status = 'ledger_safe_inherit_candidate'
ORDER BY hashed_ledger_id;


-- =============================================================================
-- SECTION 3 — EXCLUSION / BUCKET COUNTS（ledger_status re-aggregate）
-- =============================================================================
WITH ledger_lane AS (
  SELECT
    l.id AS ledger_id,
    l.report_instance_id AS ledger_ri,
    pw.id AS pw_id,
    pw.report_instance_id AS parent_wallet_ri,
    CASE
      WHEN pw.id IS NULL THEN 'ledger_orphan_manual_review'
      WHEN l.report_instance_id IS NOT NULL THEN 'ledger_already_set_manual_review'
      WHEN pw.report_instance_id IS NOT NULL THEN 'ledger_safe_inherit_candidate'
      ELSE 'ledger_parent_quarantine'
    END AS bucket
  FROM public.reply_wallet_ledgers AS l
  LEFT JOIN public.reply_ticket_wallets AS pw ON pw.id = l.wallet_id
)
SELECT
  count(*) FILTER (WHERE bucket = 'ledger_safe_inherit_candidate')::bigint AS bucket_inherit_candidate,
  count(*) FILTER (WHERE bucket = 'ledger_parent_quarantine')::bigint AS bucket_parent_quarantine,
  count(*) FILTER (WHERE bucket = 'ledger_orphan_manual_review')::bigint AS bucket_orphan,
  count(*) FILTER (WHERE bucket = 'ledger_already_set_manual_review')::bigint AS bucket_already_set
FROM ledger_lane;


-- =============================================================================
-- SECTION 4 — SOURCE VALIDATION（no snapshots from ledger; FK + coherence）
-- =============================================================================

-- §4a — Ledgers referencing missing wallets (must match orphan cohort)
SELECT count(*)::bigint AS ledger_missing_parent_wallet_pk_count
FROM public.reply_wallet_ledgers AS l
WHERE NOT EXISTS (SELECT 1 FROM public.reply_ticket_wallets AS w WHERE w.id = l.wallet_id);


-- §4b — Inherit cohort must have parent report_instance NON-NULL logically
WITH ledger_lane AS (
  SELECT
    l.id AS ledger_id,
    pw.report_instance_id AS parent_wallet_ri,
    CASE
      WHEN pw.id IS NULL THEN 'ledger_orphan_manual_review'
      WHEN l.report_instance_id IS NOT NULL THEN 'ledger_already_set_manual_review'
      WHEN pw.report_instance_id IS NOT NULL THEN 'ledger_safe_inherit_candidate'
      ELSE 'ledger_parent_quarantine'
    END AS candidate_status
  FROM public.reply_wallet_ledgers AS l
  LEFT JOIN public.reply_ticket_wallets AS pw ON pw.id = l.wallet_id
)
SELECT count(*)::bigint AS coherence_inherit_but_parent_wallet_ri_null
FROM ledger_lane
WHERE candidate_status = 'ledger_safe_inherit_candidate'
  AND parent_wallet_ri IS NULL;


-- §4c — Tri-table baseline (B2 does not mutate wallet/session herein)
SELECT
  (SELECT count(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)
    AS wallet_report_instance_non_null_baseline,
  (SELECT count(*)::bigint FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL)
    AS ledger_report_instance_non_null_baseline,
  (SELECT count(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)
    AS session_report_instance_non_null_baseline,
  (
    (SELECT count(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)
    + (SELECT count(*)::bigint FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL)
    + (SELECT count(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)
  )::bigint AS tri_table_report_instance_non_null_sum;


-- END OF FILE
