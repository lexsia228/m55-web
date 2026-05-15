-- ============================================================================
-- M55 — PHASE B1 — WALLET-ONLY BACKFILL PREFLIGHT — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_wallet_phase_b1_wallet_preflight.sql
--
-- Executable: SELECT statements only (read-only diagnostics before any UPDATE).
-- Forbidden: UPDATE, INSERT, DELETE, ALTER, DROP, CREATE, SET, NOTIFY.
--
-- Never returns: raw user_id, checkout_session_id, snapshot JSON body, payloads,
--   envelope_json, raw report_instance_id UUID, plaintext snapshot PK.
-- Snapshot surrogate: md5(s.id::text) only ("hashed_snapshot_id_candidate").
--
-- Scope: reply_ticket_wallets + dtr_report_snapshots (DTR_CORE_STATIC_V1 only).
-- Does not SELECT ledger/session rows except baseline counts in SECTION 5.
--
-- SSOT: docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PREFLIGHT_PACKET_v1.md
-- Design: docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_BACKFILL_DESIGN_REVIEW_v1.md
--
-- BEFORE RUNNING: Confirm target DB in Dashboard. Do not paste secrets into tickets.
--
-- EXECUTION: Run SECTION by SECTION in Supabase SQL Editor (whole file shows last row only).
-- ============================================================================

-- DTR_CORE_PRODUCT_KEY = 'DTR_CORE_STATIC_V1'


-- =============================================================================
-- SECTION 1 — AGGREGATE (single result row expected for production snapshot)
-- =============================================================================
WITH ws AS (
  SELECT
    w.id AS wallet_id,
    w.user_id AS wallet_user_secret,
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
),
safe_snap AS (
  SELECT
    wc.wallet_id,
    wc.wallet_user_secret,
    (
      SELECT md5((s.id)::text)
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = wc.wallet_user_secret
        AND s.product_id = 'DTR_CORE_STATIC_V1'
      ORDER BY s.created_at ASC, s.id ASC
      LIMIT 1
    ) AS hashed_snapshot_id_candidate
  FROM ws_class AS wc
  WHERE wc.candidate_status = 'wallet_safe_candidate'
)
SELECT
  count(*)::bigint AS total_wallet_count,
  count(*) FILTER (WHERE report_instance_id IS NOT NULL)::bigint
    AS wallet_report_instance_non_null_count,
  count(*) FILTER (WHERE candidate_status = 'wallet_safe_candidate')::bigint
    AS wallet_safe_candidate_count,
  count(*) FILTER (WHERE candidate_status IN (
    'wallet_no_snapshot_quarantine',
    'wallet_multiple_snapshot_manual_review',
    'wallet_already_set_manual_review'
  ))::bigint AS wallet_quarantine_or_review_count,
  count(*) FILTER (WHERE is_smoke_pattern OR dtr_core_snapshot_count = 0)::bigint
    AS smoke_orphan_wallet_count,
  count(*) FILTER (WHERE dtr_core_snapshot_count > 1)::bigint
    AS wallet_multiple_snapshot_count,
  (
    SELECT count(DISTINCT ss.hashed_snapshot_id_candidate)::bigint
    FROM safe_snap AS ss
    WHERE ss.hashed_snapshot_id_candidate IS NOT NULL
  ) AS wallet_safe_candidate_snapshot_id_distinct_count,
  count(*) FILTER (WHERE candidate_status = 'wallet_safe_candidate' AND report_instance_id IS NOT NULL)::bigint
    AS safe_candidate_existing_report_instance_count
FROM ws_class;


-- =============================================================================
-- SECTION 2 — CANDIDATE DETAIL — hash-only classification (prefer all wallets)
--          Optional: uncomment WHERE ws_class.candidate_status = 'wallet_safe_candidate'
--          to minimize rows (5 only). Default shows all wallets for exclusion audit.
-- =============================================================================
WITH ws AS (
  SELECT
    w.id AS wallet_id,
    md5(coalesce(w.user_id, '')::text) AS hashed_user_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
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
    ) AS hashed_snapshot_id_candidate
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
  md5(wallet_id::text) AS hashed_wallet_id,
  hashed_user_id,
  hashed_snapshot_id_candidate,
  dtr_core_snapshot_count AS snapshot_count,
  is_smoke_pattern,
  (report_instance_id IS NULL) AS wallet_report_instance_is_null,
  candidate_status
FROM ws_class
-- WHERE candidate_status = 'wallet_safe_candidate'
ORDER BY hashed_wallet_id;


-- =============================================================================
-- SECTION 3 — EXCLUSION BUCKET COUNTS (verify non-B1 cohort stays out-of-scope)
-- =============================================================================
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
  count(*) FILTER (WHERE candidate_status = 'wallet_no_snapshot_quarantine')::bigint AS bucket_no_snapshot_quarantine,
  count(*) FILTER (WHERE candidate_status = 'wallet_multiple_snapshot_manual_review')::bigint AS bucket_multiple_snapshot_manual_review,
  count(*) FILTER (WHERE candidate_status = 'wallet_already_set_manual_review')::bigint AS bucket_already_set_manual_review,
  count(*) FILTER (WHERE candidate_status = 'wallet_safe_candidate')::bigint AS bucket_wallet_safe_candidate
FROM ws_class;


-- =============================================================================
-- SECTION 4 — SOURCE VALIDATION (schema + UNIQUE cohort; no blob columns)
-- =============================================================================

-- §4a — dtr_report_snapshots.id datatype (expect uuid family)
SELECT
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.udt_name::text AS udt_name
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'dtr_report_snapshots'
  AND c.column_name IN ('id', 'user_id', 'product_id')
ORDER BY c.column_name;


-- §4b — Violations of UNIQUE (user_id, product_id) for core product (expect 0 duplicates)
SELECT
  count(*)::bigint AS duplicate_user_product_snapshot_cluster_count
FROM (
  SELECT user_id
  FROM public.dtr_report_snapshots
  WHERE product_id = 'DTR_CORE_STATIC_V1'
  GROUP BY user_id
  HAVING count(*) > 1
) AS dup;


-- §4c — Classification coherence (expect both metrics 0 before B1 UPDATE)
WITH ws AS (
  SELECT
    w.report_instance_id,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
    (
      SELECT count(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id AND s.product_id = 'DTR_CORE_STATIC_V1'
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
  count(*) FILTER (WHERE candidate_status = 'wallet_safe_candidate' AND dtr_core_snapshot_count <> 1)::bigint
    AS coherence_safe_but_snapshot_count_not_one,
  count(*) FILTER (
    WHERE candidate_status <> 'wallet_safe_candidate'
      AND dtr_core_snapshot_count = 1
      AND NOT is_smoke_pattern
      AND report_instance_id IS NULL
  )::bigint
    AS coherence_should_be_safe_but_not_classified
FROM ws_class;


-- =============================================================================
-- SECTION 5 — BASELINE non-null report_instance_id (ledger / session + tri-table sum)
--             B1 does not UPDATE these — expect all zeros pre-execution.
-- =============================================================================
SELECT
  (SELECT count(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)::bigint
    AS wallet_report_instance_non_null_count_baseline,
  (SELECT count(*)::bigint FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL)::bigint
    AS ledger_report_instance_non_null_count,
  (SELECT count(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)::bigint
    AS session_report_instance_non_null_count,
  (
    (SELECT count(*)::bigint FROM public.reply_ticket_wallets WHERE report_instance_id IS NOT NULL)
    + (SELECT count(*)::bigint FROM public.reply_wallet_ledgers WHERE report_instance_id IS NOT NULL)
    + (SELECT count(*)::bigint FROM public.reply_sessions WHERE report_instance_id IS NOT NULL)
  )::bigint AS tri_table_report_instance_non_null_sum;


-- END OF FILE
