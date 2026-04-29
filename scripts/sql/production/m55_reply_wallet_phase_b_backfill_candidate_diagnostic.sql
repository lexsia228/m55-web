-- ============================================================================
-- M55 — PHASE B — BACKFILL CANDIDATE DIAGNOSTIC — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql
--
-- Executable: SELECT statements only.
-- Forbidden: UPDATE, INSERT, DELETE, ALTER, DROP, CREATE, SET, NOTIFY.
--
-- Outputs: counts, hashes (md5 of user_id text / snapshot id text), classifications.
-- Never returns raw user_id, email, payloads, envelope_json contents, checkout_session_id body.
--
-- SSOT: docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_PACKET_v1.md
-- Design: docs/ssot/M55_REPLY_WALLET_PHASE_B_BACKFILL_DESIGN_REVIEW_v1.md
--
-- BEFORE RUNNING: Confirm target DB in Dashboard. Do not paste secrets into tickets.
--
-- EXECUTION MODEL (recommended)
-- ----------------------------------------------------------------------------
-- Run **one SECTION at a time** in Supabase SQL Editor (or paste only the block
-- you need). The file contains **multiple statements**; the UI often shows only
-- the **last** result set when the whole file is executed at once.
-- Run order for aggregates: SECTION 2 → SECTION 4 → SECTION 6 (each is self-contained).
-- Full-file execution is allowed but **not recommended** for reading all outputs.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Helpers: core snapshot definition (immutable product key)
-- -----------------------------------------------------------------------------
-- DTR_CORE_PRODUCT_KEY = 'DTR_CORE_STATIC_V1'


-- =========================================================================
-- SECTION 1 — WALLET PER-ROW DIAGNOSTIC (≤8 rows typical; hashed keys only)
-- =========================================================================

WITH ws AS (
  SELECT
    w.id AS wallet_id,
    md5(coalesce(w.user_id, '')::text) AS hashed_user_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%')
      AS is_smoke_pattern,
    w.report_instance_id,
    (
      SELECT count(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_core_snapshot_count,
    (
      SELECT md5((s.id)::text)
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
      ORDER BY s.created_at ASC, s.id ASC
      LIMIT 1
    ) AS hashed_report_instance_key_candidate_order1
  FROM public.reply_ticket_wallets AS w
),
ws_class AS (
  SELECT
    ws.*,
    CASE
      WHEN ws.report_instance_id IS NOT NULL THEN 'wallet_already_set_manual_review'
      WHEN ws.dtr_core_snapshot_count = 0 THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count > 1 THEN 'wallet_multiple_snapshot_manual_review'
      WHEN ws.is_smoke_pattern THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count = 1 THEN 'wallet_safe_candidate'
      ELSE 'wallet_multiple_snapshot_manual_review'
    END AS candidate_status
  FROM ws
)
SELECT
  ws_class.wallet_id,
  ws_class.hashed_user_id,
  ws_class.is_smoke_pattern,
  (ws_class.report_instance_id IS NULL) AS report_instance_id_is_null_expected,
  ws_class.dtr_core_snapshot_count,
  ws_class.hashed_report_instance_key_candidate_order1,
  ws_class.candidate_status
FROM ws_class AS ws_class
ORDER BY ws_class.wallet_id;


-- ----------------------------------------------------------------------------
-- SECTION 2 — WALLET AGGREGATE COUNTS
-- ----------------------------------------------------------------------------
WITH ws AS (
  SELECT
    w.id AS wallet_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
    w.report_instance_id,
    (
      SELECT count(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_core_snapshot_count
  FROM public.reply_ticket_wallets AS w
),
ws_class AS (
  SELECT
    ws.*,
    CASE
      WHEN ws.report_instance_id IS NOT NULL THEN 'wallet_already_set_manual_review'
      WHEN ws.dtr_core_snapshot_count = 0 THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count > 1 THEN 'wallet_multiple_snapshot_manual_review'
      WHEN ws.is_smoke_pattern THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count = 1 THEN 'wallet_safe_candidate'
      ELSE 'wallet_multiple_snapshot_manual_review'
    END AS candidate_status
  FROM ws
)
SELECT
  count(*) FILTER (WHERE candidate_status = 'wallet_safe_candidate')::bigint AS wallet_safe_candidate_count,
  count(*) FILTER (WHERE candidate_status IN (
    'wallet_no_snapshot_quarantine',
    'wallet_multiple_snapshot_manual_review',
    'wallet_already_set_manual_review'
  ))::bigint AS wallet_quarantine_or_review_count,
  count(*) FILTER (WHERE is_smoke_pattern)::bigint AS wallet_smoke_pattern_row_count,
  count(*) FILTER (WHERE dtr_core_snapshot_count = 0)::bigint AS wallet_snapshot_zero_count,
  count(*) FILTER (WHERE dtr_core_snapshot_count = 1)::bigint AS wallet_snapshot_exactly_one_count,
  count(*) FILTER (WHERE dtr_core_snapshot_count > 1)::bigint AS wallet_snapshot_multi_count
FROM ws_class;


-- =========================================================================
-- SECTION 3 — LEDGER PER-ROW DIAGNOSTIC
-- =========================================================================

WITH ws AS (
  SELECT
    w.id AS wallet_id,
    md5(coalesce(w.user_id, '')::text) AS wallet_hashed_user_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS wallet_is_smoke_pattern,
    w.report_instance_id AS wallet_report_instance_id,
    (
      SELECT count(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_core_snapshot_count
  FROM public.reply_ticket_wallets AS w
),
ws_class AS (
  SELECT
    ws.wallet_id,
    ws.wallet_hashed_user_id,
    ws.wallet_is_smoke_pattern,
    ws.wallet_report_instance_id,
    ws.dtr_core_snapshot_count,
    CASE
      WHEN ws.wallet_report_instance_id IS NOT NULL THEN 'wallet_already_set_manual_review'
      WHEN ws.dtr_core_snapshot_count = 0 THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count > 1 THEN 'wallet_multiple_snapshot_manual_review'
      WHEN ws.wallet_is_smoke_pattern THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count = 1 THEN 'wallet_safe_candidate'
      ELSE 'wallet_multiple_snapshot_manual_review'
    END AS wallet_candidate_status
  FROM ws AS ws
)
SELECT
  l.id AS ledger_id,
  wc.wallet_candidate_status AS parent_wallet_candidate_status_for_ledger_diag,
  l.wallet_id AS parent_wallet_pk,
  (l.report_instance_id IS NULL) AS ledger_report_instance_id_is_null_expected,
  EXISTS (
    SELECT 1 FROM public.reply_ticket_wallets AS pw WHERE pw.id = l.wallet_id
  ) AS parent_wallet_row_exists,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.reply_ticket_wallets AS pw2 WHERE pw2.id = l.wallet_id
    )
    THEN 'ledger_orphan_manual_review'
    WHEN l.report_instance_id IS NOT NULL
    THEN 'ledger_already_set_manual_review'
    WHEN wc.wallet_candidate_status = 'wallet_safe_candidate'
    THEN 'ledger_inherit_from_safe_wallet_candidate'
    ELSE 'ledger_parent_quarantine'
  END AS candidate_status
FROM public.reply_wallet_ledgers AS l
LEFT JOIN ws_class AS wc ON wc.wallet_id = l.wallet_id
ORDER BY l.id;


-- ----------------------------------------------------------------------------
-- SECTION 4 — LEDGER AGGREGATE COUNTS
-- ----------------------------------------------------------------------------
WITH ws AS (
  SELECT
    w.id AS wallet_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS wallet_is_smoke_pattern,
    w.report_instance_id AS wallet_report_instance_id,
    (
      SELECT count(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_core_snapshot_count
  FROM public.reply_ticket_wallets AS w
),
ws_class AS (
  SELECT
    ws.wallet_id,
    CASE
      WHEN ws.wallet_report_instance_id IS NOT NULL THEN 'wallet_already_set_manual_review'
      WHEN ws.dtr_core_snapshot_count = 0 THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count > 1 THEN 'wallet_multiple_snapshot_manual_review'
      WHEN ws.wallet_is_smoke_pattern THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count = 1 THEN 'wallet_safe_candidate'
      ELSE 'wallet_multiple_snapshot_manual_review'
    END AS wallet_candidate_status
  FROM ws AS ws
),
ledger_derived AS (
  SELECT
    l.id AS ledger_id,
    l.wallet_id,
    l.report_instance_id,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM public.reply_ticket_wallets AS w4 WHERE w4.id = l.wallet_id
      )
      THEN 'ledger_orphan_manual_review'
      WHEN l.report_instance_id IS NOT NULL
      THEN 'ledger_already_set_manual_review'
      WHEN wc.wallet_candidate_status = 'wallet_safe_candidate'
      THEN 'ledger_inherit_from_safe_wallet_candidate'
      ELSE 'ledger_parent_quarantine'
    END AS ledger_status
  FROM public.reply_wallet_ledgers AS l
  LEFT JOIN ws_class AS wc ON wc.wallet_id = l.wallet_id
)
SELECT
  count(*) FILTER (WHERE ledger_status = 'ledger_inherit_from_safe_wallet_candidate')::bigint
    AS ledger_safe_inherit_candidate_count,
  count(*) FILTER (WHERE ledger_status = 'ledger_parent_quarantine')::bigint
    AS ledger_parent_quarantine_count,
  count(*) FILTER (WHERE ledger_status = 'ledger_orphan_manual_review')::bigint
    AS ledger_orphan_manual_review_count,
  count(*) FILTER (WHERE ledger_status = 'ledger_already_set_manual_review')::bigint
    AS ledger_already_set_manual_review_count;


-- =========================================================================
-- SECTION 5 — SESSION PER-ROW DIAGNOSTIC
-- =========================================================================

WITH usr_core AS (
  SELECT
    rs.id AS reply_session_pk,
    md5(coalesce(rs.user_id, '')::text) AS hashed_user_id,
    (rs.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR rs.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
    rs.theme,
    (rs.core_profile_ref IS NOT NULL AND btrim(coalesce(rs.core_profile_ref::text, '')) <> '')
      AS has_core_profile_ref_nonempty,
    (rs.report_instance_id IS NULL) AS session_report_instance_id_is_null_expected,
    (
      SELECT count(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = rs.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS user_dtr_core_snapshot_count
  FROM public.reply_sessions AS rs
)
SELECT
  u.reply_session_pk,
  u.hashed_user_id,
  u.is_smoke_pattern,
  u.theme,
  u.has_core_profile_ref_nonempty,
  (u.user_dtr_core_snapshot_count > 0) AS user_has_core_snapshot_nonempty,
  u.session_report_instance_id_is_null_expected,
  u.user_dtr_core_snapshot_count,
  CASE
    WHEN u.session_report_instance_id_is_null_expected = false
    THEN 'session_already_set_manual_review'
    WHEN u.is_smoke_pattern
    THEN 'session_smoke_quarantine'
    WHEN u.user_dtr_core_snapshot_count >= 1
    THEN 'session_candidate_needs_stronger_proof'
    ELSE 'session_no_snapshot_quarantine'
  END AS candidate_status
FROM usr_core AS u
ORDER BY u.reply_session_pk;


-- ----------------------------------------------------------------------------
-- SECTION 5a — SESSION supplementary: core_profile_ref distribution only
-- (optional; SELECT-only — run separately if needed; same guardrails as header)
-- ----------------------------------------------------------------------------
SELECT
  (core_profile_ref IS NULL) AS core_profile_ref_is_null_session_count_dim,
  count(*)::bigint AS session_row_count_bucket
FROM public.reply_sessions AS rs
GROUP BY (core_profile_ref IS NULL)
ORDER BY core_profile_ref_is_null_session_count_dim;


-- SECTION 5a (cont.) — core_profile_ref text bucket counts
SELECT
  case
    when core_profile_ref IS NULL then '(null)'
    when btrim(core_profile_ref::text) = '' then '(empty_trim)'
    else '(non_empty_present)'
  end AS core_profile_ref_bucket_category,
  count(*)::bigint AS session_row_count
FROM public.reply_sessions AS rs
GROUP BY 1
ORDER BY 1;


-- SECTION 5a (cont.) — theme bucket counts only
SELECT
  coalesce(theme, '(theme_null)') AS theme_bucket_literal,
  count(*)::bigint AS session_row_count
FROM public.reply_sessions AS rs
GROUP BY 1
ORDER BY count(*) DESC, theme_bucket_literal;


-- ----------------------------------------------------------------------------
-- SECTION 5b — SESSION supplementary: user_has_core_snapshot / smoke buckets
-- (optional; SELECT-only — run separately if needed)
-- ----------------------------------------------------------------------------
WITH su AS (
  SELECT
    rs.id,
    rs.user_id,
    (rs.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR rs.user_id LIKE 'smoke_user%') AS smoke_u,
    (
      EXISTS (
        SELECT 1 FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = rs.user_id
          AND s.product_id = 'DTR_CORE_STATIC_V1'
      )
    ) AS user_has_core
  FROM public.reply_sessions AS rs
)
SELECT
  count(*) FILTER (WHERE user_has_core)::bigint AS session_rows_whose_user_has_core_snapshot_gt0,
  count(*) FILTER (WHERE NOT user_has_core)::bigint AS session_rows_whose_user_has_no_core_snapshot,
  count(*) FILTER (WHERE smoke_u)::bigint AS session_rows_smoke_pattern_user_bucket;



-- =========================================================================
-- SECTION 6 — GLOBAL AGGREGATE SUMMARY (single row; cross-section)
-- =========================================================================

WITH ws AS (
  SELECT
    w.id AS wallet_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS wallet_is_smoke_pattern,
    w.report_instance_id,
    (
      SELECT count(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_core_snapshot_count
  FROM public.reply_ticket_wallets AS w
),
ws_class AS (
  SELECT
    ws.wallet_id,
    CASE
      WHEN ws.report_instance_id IS NOT NULL THEN 'wallet_already_set_manual_review'
      WHEN ws.dtr_core_snapshot_count = 0 THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count > 1 THEN 'wallet_multiple_snapshot_manual_review'
      WHEN ws.wallet_is_smoke_pattern THEN 'wallet_no_snapshot_quarantine'
      WHEN ws.dtr_core_snapshot_count = 1 THEN 'wallet_safe_candidate'
      ELSE 'wallet_multiple_snapshot_manual_review'
    END AS wallet_candidate_status
  FROM ws AS ws
),
ledger_derived AS (
  SELECT
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM public.reply_ticket_wallets AS pw2 WHERE pw2.id = l.wallet_id
      )
      THEN 'ledger_orphan_manual_review'
      WHEN l.report_instance_id IS NOT NULL
      THEN 'ledger_already_set_manual_review'
      WHEN wc.wallet_candidate_status = 'wallet_safe_candidate'
      THEN 'ledger_inherit_from_safe_wallet_candidate'
      ELSE 'ledger_parent_quarantine'
    END AS ledger_status
  FROM public.reply_wallet_ledgers AS l
  LEFT JOIN ws_class AS wc ON wc.wallet_id = l.wallet_id
),
session_derived AS (
  SELECT
    CASE
      WHEN rs.report_instance_id IS NOT NULL
      THEN 'session_already_set_manual_review'
      WHEN (rs.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR rs.user_id LIKE 'smoke_user%')
      THEN 'session_smoke_quarantine'
      WHEN EXISTS (
        SELECT 1 FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = rs.user_id
          AND s.product_id = 'DTR_CORE_STATIC_V1'
      )
      THEN 'session_candidate_needs_stronger_proof'
      ELSE 'session_no_snapshot_quarantine'
    END AS session_status
  FROM public.reply_sessions AS rs
),
nonnull_cnt AS (
  SELECT
    (
      (SELECT count(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)
      + (SELECT count(*)::bigint FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL)
      + (SELECT count(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)
    )::bigint AS any_existing_report_instance_id_count
)
SELECT
  (SELECT count(*)::bigint FROM ws_class WHERE wallet_candidate_status = 'wallet_safe_candidate')
    AS wallet_safe_candidate_count,
  (SELECT count(*)::bigint FROM ws_class WHERE wallet_candidate_status <> 'wallet_safe_candidate')
    AS wallet_quarantine_or_review_count,
  (SELECT count(*) FILTER (WHERE ledger_status = 'ledger_inherit_from_safe_wallet_candidate')::bigint
   FROM ledger_derived) AS ledger_safe_candidate_count,
  (SELECT count(*) FILTER (WHERE ledger_status = 'ledger_parent_quarantine')::bigint
   FROM ledger_derived) AS ledger_quarantine_count,
  (SELECT count(*) FILTER (WHERE ledger_status = 'ledger_orphan_manual_review')::bigint
   FROM ledger_derived) AS ledger_orphan_manual_review_count,
  (SELECT count(*) FILTER (WHERE ledger_status = 'ledger_already_set_manual_review')::bigint
   FROM ledger_derived) AS ledger_already_set_manual_review_count,
  (SELECT count(*) FILTER (WHERE session_status = 'session_candidate_needs_stronger_proof')::bigint
   FROM session_derived) AS session_candidate_needs_stronger_proof_count,
  (SELECT count(*) FILTER (WHERE session_status IN (
    'session_no_snapshot_quarantine',
    'session_smoke_quarantine'
  ))::bigint FROM session_derived) AS session_quarantine_count,
  (SELECT count(*) FILTER (WHERE session_status = 'session_already_set_manual_review')::bigint
   FROM session_derived) AS session_already_set_manual_review_count,
  (SELECT any_existing_report_instance_id_count FROM nonnull_cnt)
    AS any_existing_report_instance_id_count;


-- END OF FILE — Recommended aggregate-only runs: SECTION 2, SECTION 4, SECTION 6 (each paste separately in SQL Editor).

