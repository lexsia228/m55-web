-- =============================================================================
-- M55 Stage B — ownership / wallet validation DATA SELECTION (SELECT ONLY)
--
-- Purpose: read-only aggregates + minimal report_instance_id samples to plan
--   authenticated Checkout API validation. Does NOT authorize running API smoke.
--
-- HARD RULES (do not relax):
--   - SELECT (+ WITH wrapping SELECT) ONLY — no INSERT/UPDATE/DELETE/DDL/SET/TRUNCATE.
--   - Do NOT output raw Clerk user_id, report/envelope payloads, birthdays, URLs.
--   - Optional operator scope uses ONLY hex16 derived from hashUserIdForLedgerLog;
--     never paste raw Clerk id into repo or chats.
--
-- Operator scope (nullable):
--   In `params.operator_user_hash_hex16` below — in a LOCAL-ONLY workspace copy —
--   replace CAST(NULL ...) with a 16-hex-character literal from the app helper
--   hashUserIdForLedgerLog(<clerk_user_id>). Keep committed repo copies at NULL.
--
-- Requires PostgreSQL SHA256 digest (common: pgcrypto / extensions digest).
--   If digest(convert_to(..),'sha256') is unavailable on your sandbox, omit
--   operator-hash columns or migrate tool — do NOT extend this file with CREATE.
--
-- Run / commit policy: Prefer running ONLY in tooling that forbids accidental
--   commits of substituted literals (CI should reject non-NULL operator slot).
-- =============================================================================

WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
  -- LOCAL ONLY: REPLACE above with e.g. '0123abcdefabcd01' ::text (exactly hex16).
),

scoped_snapshots AS (
  SELECT s.id AS report_instance_id
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN params AS p
  WHERE p.operator_user_hash_hex16 IS NOT NULL
    AND substring(
      encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) = btrim(lower(p.operator_user_hash_hex16))
),

snapshot_wallet_missing AS (
  SELECT DISTINCT s.id AS report_instance_id
  FROM public.dtr_report_snapshots AS s
  WHERE NOT EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS w
      WHERE btrim(w.user_id) = btrim(s.user_id)
    )
),

summary_core AS (
  SELECT
    (p.operator_user_hash_hex16 IS NOT NULL) AS operator_hash_bound_bool,

    (
      CASE
        WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
        ELSE (SELECT COUNT(*)::bigint FROM scoped_snapshots)
      END
    ) AS owned_report_candidates_count,

    (SELECT COUNT(*)::bigint FROM snapshot_wallet_missing AS m) AS wallet_missing_candidates_count,

    (
      SELECT COUNT(*)::bigint
      FROM public.reply_ticket_wallets AS w
      WHERE lower(btrim(w.status)) <> 'active'
    ) AS wallet_inactive_candidates_count,

    (
      SELECT COUNT(*)::bigint
      FROM public.reply_ticket_wallets AS w
      WHERE (
          (w.initial_included_count + w.purchased_count >= 5)
          OR (w.purchased_count >= 4)
        )
    ) AS cap_reached_candidates_count,

    (
      CASE
        WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
        ELSE (
            SELECT COUNT(*)::bigint
            FROM scoped_snapshots AS ss
            INNER JOIN snapshot_wallet_missing AS wm
              ON wm.report_instance_id = ss.report_instance_id
          )
        END
    ) AS scoped_operator_wallet_missing_match_count,

    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
          SELECT COUNT(DISTINCT w.id)::bigint
          FROM scoped_snapshots AS ss
          INNER JOIN public.dtr_report_snapshots AS sx ON sx.id = ss.report_instance_id
          INNER JOIN public.reply_ticket_wallets AS w ON btrim(w.user_id) = btrim(sx.user_id)
          WHERE lower(btrim(w.status)) <> 'active'
        )
    END AS scoped_operator_inactive_wallet_with_owned_snapshot_hint_count,

    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
          SELECT COUNT(DISTINCT w.id)::bigint
          FROM scoped_snapshots AS ss
          INNER JOIN public.dtr_report_snapshots AS sx ON sx.id = ss.report_instance_id
          INNER JOIN public.reply_ticket_wallets AS w ON btrim(w.user_id) = btrim(sx.user_id)
          WHERE (
              (w.initial_included_count + w.purchased_count >= 5)
              OR (w.purchased_count >= 4)
            )
        )
    END AS scoped_operator_cap_wallet_with_owned_snapshot_hint_count

  FROM params AS p
),

baseline AS (
  SELECT
    (SELECT COUNT(*)::bigint FROM public.stripe_processed_events) AS processed_events_total_count,
    (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets) AS reply_ticket_wallets_total_count,
    (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers) AS reply_wallet_ledgers_total_count,
    (SELECT COUNT(*)::bigint FROM public.reply_sessions) AS reply_sessions_total_count
)

SELECT
  b.processed_events_total_count,
  b.reply_ticket_wallets_total_count,
  b.reply_wallet_ledgers_total_count,
  b.reply_sessions_total_count,

  s.operator_hash_bound_bool,
  s.owned_report_candidates_count,
  s.wallet_missing_candidates_count,
  s.wallet_inactive_candidates_count,
  s.cap_reached_candidates_count,
  s.scoped_operator_wallet_missing_match_count,
  s.scoped_operator_inactive_wallet_with_owned_snapshot_hint_count,
  s.scoped_operator_cap_wallet_with_owned_snapshot_hint_count,

  (
    CASE
      WHEN s.wallet_missing_candidates_count = 0 THEN 1
      ELSE 0
    END
    +
    CASE
      WHEN s.wallet_inactive_candidates_count = 0 THEN 1
      ELSE 0
    END
    +
    CASE
      WHEN s.cap_reached_candidates_count = 0 THEN 1
      ELSE 0
    END
  )::integer AS blocking_gap_count,

  (
    COALESCE(s.wallet_missing_candidates_count, 0) > 0
    OR COALESCE(s.wallet_inactive_candidates_count, 0) > 0
    OR COALESCE(s.cap_reached_candidates_count, 0) > 0
    OR (
      s.operator_hash_bound_bool
      AND COALESCE(s.owned_report_candidates_count, 0) > 0
    )
  ) AS safe_to_run_ownership_wallet_validation

FROM baseline AS b
CROSS JOIN summary_core AS s;

-- ---------------------------------------------------------------------------
-- Optional follow-up SAME SESSION: UUID lists (≤3 rows each).
-- Uncomment ONLY locally; emits report_instance_id ONLY.
--
-- Wallet-missing snapshots (globally eligible):
--
-- SELECT wsm.report_instance_id
-- FROM (
--     SELECT DISTINCT s.id AS report_instance_id
--     FROM public.dtr_report_snapshots AS s
--     WHERE NOT EXISTS (
--         SELECT 1 FROM public.reply_ticket_wallets AS w
--         WHERE btrim(w.user_id) = btrim(s.user_id)))
-- AS wsm
-- LIMIT 3;
--
-- Inactive wallet correlated snapshot (globally arbitrary example):
--
-- SELECT s.id AS report_instance_id
-- FROM public.reply_ticket_wallets AS w
-- JOIN public.dtr_report_snapshots AS s ON btrim(s.user_id) = btrim(w.user_id)
-- WHERE lower(btrim(w.status)) <> 'active'
-- ORDER BY w.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
-- LIMIT 3;
--
-- Cap snapshot example:
--
-- SELECT s.id AS report_instance_id
-- FROM public.reply_ticket_wallets AS w
-- JOIN public.dtr_report_snapshots AS s ON btrim(s.user_id) = btrim(w.user_id)
-- WHERE ((w.initial_included_count + w.purchased_count >= 5) OR (w.purchased_count >= 4))
-- ORDER BY w.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
-- LIMIT 3;
-- ---------------------------------------------------------------------------
