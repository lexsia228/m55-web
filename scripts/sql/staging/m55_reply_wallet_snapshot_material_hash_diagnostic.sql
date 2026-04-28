-- ============================================================================
-- DIAGNOSTIC — snapshot restore material (hash-only; missing-fulfillment cohort)
-- Path: scripts/sql/staging/m55_reply_wallet_snapshot_material_hash_diagnostic.sql
--
-- Purpose: For users with wallet + active DTR stripe_checkout entitlement + session id
--          but NO dtr_report_snapshots row for DTR_CORE_STATIC_V1, detect whether DB
--          still holds material (guest drafts, reply payload keys, snapshots for other
--          products, consult/reply counts) usable for SAFE future restoration —
--          WITHOUT creating snapshots/fulfillment/rights/stripe calls.
--
-- READ-ONLY: SELECT only — no DDL/DML. Do not EXECUTE INSERT/UPDATE/DELETE/ALTER/DROP/
-- CREATE/SET/session variable writes.
--
-- Privacy / output contract:
-- - Never outputs raw user_id, email, plaintext stripe_session_id or checkout ids,
--   UUID row ids, nickname text, birth_date values, payload_json/minified JSON bodies.
-- - Correlation ids: hashed_user_id = md5('m55_wallet_diag_v1' || user_id);
--   hashed_entitlement_session_ref = md5('m55_lineage_cs_v1' || stripe_session_id).
-- - Booleans/counts/key-existence (? 'key') only.
--
-- Related SSOT:
--   docs/ssot/M55_REPLY_WALLET_MISSING_FULFILLMENT_REMEDIATION_POLICY_v1.md
--   scripts/sql/staging/m55_reply_wallet_orphan_fulfillment_lineage_hash_diagnostic.sql
--
-- PHASE: Phase0 STOP — Phase A / migrations / Stripe product UI / webhooks = NO-GO.
-- Run only under org policy; not executed by repo CI.
-- ============================================================================


-- =============================================================================
-- PART 0 — Column discovery (run first in target DB; adjust PART 1 if names differ)
-- =============================================================================
-- Lists public columns whose names may hold birth/nickname/envelope/profile/draft/
-- payload/extra_json for manual cross-check. READ-ONLY.
--
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND (
    c.column_name ILIKE '%birth%'
    OR c.column_name ILIKE '%nick%'
    OR c.column_name ILIKE '%envelope%'
    OR c.column_name ILIKE '%profile%'
    OR c.column_name ILIKE '%draft%'
    OR c.column_name = 'payload_json'
    OR c.column_name = 'extra_json'
  )
ORDER BY c.table_name, c.ordinal_position;


-- =============================================================================
-- PART 1 — Per-user hash diagnostic (comment PART 0 above or run in separate session
--          if your client cannot batch multiple result sets)
-- =============================================================================

WITH cohort AS (
  SELECT DISTINCT ON (w.user_id)
    w.user_id,
    e.stripe_session_id AS entitlement_cs_raw,
    e.created_at AS entitlement_created_at
  FROM public.reply_ticket_wallets AS w
  INNER JOIN public.entitlements AS e
    ON e.user_id = w.user_id
   AND e.product_id = 'DTR_CORE_STATIC_V1'
   AND e.status = 'active'
   AND COALESCE(e.grant_type::text, '') = 'one_time'
   AND COALESCE(e.source::text, '') = 'stripe_checkout'
   AND e.stripe_session_id IS NOT NULL
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
  )
  ORDER BY w.user_id, e.created_at DESC
),
scoped AS (
  SELECT
    c.user_id,
    c.entitlement_cs_raw,
    md5('m55_wallet_diag_v1'::text || c.user_id)::text AS hashed_user_id,
    md5('m55_lineage_cs_v1'::text || c.entitlement_cs_raw)::text AS hashed_entitlement_session_ref,
    /* dtr_report_snapshots — any product (cohort excludes DTR core row only) */
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = c.user_id
    ) AS any_snapshot_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = c.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_core_snapshot_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_sessions AS rs
      WHERE rs.user_id = c.user_id
    ) AS reply_session_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_documents AS rd
      WHERE rd.user_id = c.user_id
    ) AS reply_document_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.consult_threads AS ct
      WHERE ct.user_id = c.user_id
    ) AS consult_thread_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.consult_messages AS cm
      INNER JOIN public.consult_threads AS ct
        ON ct.id = cm.thread_id
      WHERE ct.user_id = c.user_id
    ) AS consult_message_count,
    /* dtr_guest_drafts — linked to user */
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_guest_drafts AS g
      WHERE g.user_id = c.user_id
    ) AS guest_draft_row_count,
    (
      SELECT BOOL_OR(g.birth_date IS NOT NULL)
      FROM public.dtr_guest_drafts AS g
      WHERE g.user_id = c.user_id
    ) AS guest_has_birth_date_col_nonnull,
    (
      SELECT BOOL_OR(btrim(COALESCE(g.nickname, '')) <> '')
      FROM public.dtr_guest_drafts AS g
      WHERE g.user_id = c.user_id
    ) AS guest_has_nickname_nonempty,
    (
      EXISTS (
        SELECT 1
        FROM public.dtr_guest_drafts AS g
        WHERE g.user_id = c.user_id
          AND g.birth_date IS NOT NULL
          AND btrim(COALESCE(g.nickname, '')) <> ''
      )
    ) AS guest_has_usable_linked_row_for_restore,
    /* reply_documents.payload_json — top-level keys only (no values) */
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.reply_documents AS rd
        WHERE rd.user_id = c.user_id
          AND (
            rd.payload_json ? 'nickname'
            OR rd.payload_json ? 'birthDate'
            OR rd.payload_json ? 'birth_date'
            OR rd.payload_json ? 'sealedInputs'
            OR rd.payload_json ? 'profile'
            OR rd.payload_json ? 'profile_snapshot'
          )
      )
    ) AS has_reply_payload_key_candidate,
    /* any snapshot row: column presence (other product_id possible) */
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = c.user_id
          AND s.profile_snapshot IS NOT NULL
          AND s.profile_snapshot <> 'null'::jsonb
      )
    ) AS snap_has_profile_snapshot_col,
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = c.user_id
          AND s.draft_snapshot IS NOT NULL
      )
    ) AS snap_has_draft_snapshot_col,
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = c.user_id
          AND s.envelope_json IS NOT NULL
      )
    ) AS snap_has_envelope_json_col,
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.dtr_guest_drafts AS g
        WHERE g.user_id = c.user_id
          AND g.extra_json IS NOT NULL
          AND g.extra_json <> '{}'::jsonb
      )
    ) AS guest_has_extra_json_nonempty,
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.dtr_guest_drafts AS g
        WHERE g.user_id = c.user_id
          AND (
            g.extra_json ? 'profile'
            OR g.extra_json ? 'profile_snapshot'
            OR g.extra_json ? 'envelope'
            OR g.extra_json ? 'draft'
          )
      )
    ) AS guest_extra_json_key_candidate
  FROM cohort AS c
)
SELECT
  scoped.hashed_user_id,
  scoped.hashed_entitlement_session_ref,
  (scoped.any_snapshot_count > 0) AS has_any_snapshot,
  (scoped.dtr_core_snapshot_count > 0) AS has_dtr_core_snapshot,
  (scoped.reply_session_count > 0) AS has_reply_session,
  (scoped.reply_document_count > 0) AS has_reply_document,
  (scoped.consult_thread_count > 0) AS has_consult_thread,
  (scoped.consult_message_count > 0) AS has_consult_message,
  scoped.reply_session_count,
  scoped.reply_document_count,
  scoped.consult_message_count,
  scoped.has_reply_payload_key_candidate AS has_payload_json_keys_candidate,
  (
    scoped.guest_has_birth_date_col_nonnull
    OR EXISTS (
      SELECT 1
      FROM public.reply_documents AS rd
      WHERE rd.user_id = scoped.user_id
        AND (
            rd.payload_json ? 'birthDate'
            OR rd.payload_json ? 'birth_date'
            OR (
              rd.payload_json ? 'sealedInputs'
              AND jsonb_typeof(rd.payload_json->'sealedInputs') = 'object'
              AND (rd.payload_json->'sealedInputs') ? 'birthDate'
            )
          )
    )
  ) AS has_birth_date_candidate,
  (
    scoped.guest_has_nickname_nonempty
    OR EXISTS (
      SELECT 1
      FROM public.reply_documents AS rd
      WHERE rd.user_id = scoped.user_id
        AND (
            rd.payload_json ? 'nickname'
            OR (
              rd.payload_json ? 'sealedInputs'
              AND jsonb_typeof(rd.payload_json->'sealedInputs') = 'object'
              AND (rd.payload_json->'sealedInputs') ? 'nickname'
            )
          )
    )
  ) AS has_nickname_candidate,
  (
    scoped.snap_has_profile_snapshot_col
    OR scoped.guest_extra_json_key_candidate
  ) AS has_profile_snapshot_candidate,
  (
    scoped.snap_has_draft_snapshot_col
    OR (
      scoped.guest_has_extra_json_nonempty
      AND EXISTS (
        SELECT 1
        FROM public.dtr_guest_drafts AS g
        WHERE g.user_id = scoped.user_id
          AND (g.extra_json ? 'draft' OR g.extra_json ? 'draft_snapshot')
      )
    )
  ) AS has_draft_snapshot_candidate,
  scoped.snap_has_envelope_json_col AS has_envelope_json_candidate,
  CASE
    WHEN scoped.guest_has_usable_linked_row_for_restore
      OR scoped.has_reply_payload_key_candidate
      OR scoped.snap_has_profile_snapshot_col
      OR scoped.snap_has_draft_snapshot_col
      OR scoped.snap_has_envelope_json_col
      THEN 'restore_material_probably_available'
    WHEN scoped.guest_draft_row_count > 0
      AND NOT scoped.guest_has_usable_linked_row_for_restore
      THEN 'needs_manual_review'
    WHEN (
      scoped.reply_session_count > 0
      OR scoped.reply_document_count > 0
      OR scoped.consult_message_count > 0
      OR scoped.consult_thread_count > 0
    )
      THEN 'only_reply_history_available'
    WHEN (
      scoped.any_snapshot_count = 0
      AND scoped.reply_session_count = 0
      AND scoped.reply_document_count = 0
      AND scoped.consult_message_count = 0
      AND scoped.consult_thread_count = 0
      AND scoped.guest_draft_row_count = 0
    )
      THEN 'no_snapshot_material_found'
    ELSE 'needs_manual_review'
  END AS likely_restore_material_status
FROM scoped;

-- -----------------------------------------------------------------------------
-- Notes
-- -----------------------------------------------------------------------------
-- 1. If PART 1 fails with undefined_table / undefined_column, run PART 0 and align
--    with actual staging schema (e.g. consult_* tables optional in some envs).
-- 2. sealedInputs key checks use jsonb ? and -> only; still no scalar payload output.
-- 3. hashed_* digests are for log correlation only; not secrets.
-- 4. Cohort definition matches missing DTR core snapshot + stripe_checkout session id;
--    same family as orphan fulfillment lineage diagnostic.
