-- =============================================================================
-- M55 — Reply-ticket RPC v2 upgrade — Human precheck (SELECT ONLY)
-- Target: Production m55-soul-core
-- Migration: supabase/migrations/20260813000000_m55_reply_ticket_fulfillment_rpc_v2_upgrade.sql
--
-- FORBIDDEN: INSERT / UPDATE / DELETE / DDL / NOTIFY / SET
-- LOCAL ONLY: bind incident params in `params` CTE — never commit literals.
-- =============================================================================

-- SECTION 1 — database identity
SELECT current_database()::text AS current_database_name;

-- SECTION 2 — required relations
SELECT
  (to_regclass('public.stripe_events') IS NOT NULL) AS stripe_events_exists,
  (to_regclass('public.stripe_processed_events') IS NOT NULL) AS stripe_processed_events_exists,
  (to_regclass('public.reply_ticket_wallets') IS NOT NULL) AS reply_ticket_wallets_exists,
  (to_regclass('public.reply_wallet_ledgers') IS NOT NULL) AS reply_wallet_ledgers_exists,
  (to_regclass('public.dtr_report_snapshots') IS NOT NULL) AS dtr_report_snapshots_exists;

-- SECTION 3 — RPC predecessor identity + upgrade support probe
SELECT EXISTS (
  SELECT 1 FROM pg_proc AS p
  JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
) AS rpc_exists;

SELECT
  pg_get_function_identity_arguments(p.oid)::text AS rpc_identity_arguments,
  pg_get_function_result(p.oid)::text AS rpc_result_type,
  (position('dtr_core_light_to_full_upgrade_v1' IN pg_get_functiondef(p.oid)) > 0) AS upgrade_sku_supported_in_rpc_body,
  (position('additional_reply_ticket' IN pg_get_functiondef(p.oid)) > 0) AS legacy_sku_present_in_rpc_body,
  (position('v_full_max_purchased CONSTANT int := 4' IN pg_get_functiondef(p.oid)) > 0) AS cap_four_purchased_constant_present,
  (position('v_total_cap CONSTANT int := 5' IN pg_get_functiondef(p.oid)) > 0) AS cap_five_total_constant_present
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event';

-- SECTION 4 — service_role execute grant
SELECT EXISTS (
  SELECT 1
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
  JOIN information_schema.routine_privileges AS rp
    ON rp.specific_schema = n.nspname
   AND rp.routine_name = p.proname
  WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
    AND rp.grantee = 'service_role'
    AND rp.privilege_type = 'EXECUTE'
) AS service_role_execute_granted;

-- SECTION 5 — incident recovery readiness (bind params locally only)
WITH params AS (
  SELECT
    CAST(NULL AS text) AS target_stripe_event_id,
    CAST(NULL AS uuid) AS target_report_instance_id,
    CAST(NULL AS text) AS target_checkout_session_id,
    CAST(NULL AS text) AS expected_user_ref_hash
),
generic_ev AS (
  SELECT EXISTS (
    SELECT 1
    FROM public.stripe_events AS e
    CROSS JOIN params AS p
    WHERE p.target_stripe_event_id IS NOT NULL
      AND btrim(e.event_id) = btrim(p.target_stripe_event_id)
  ) AS stripe_events_has_target_event
),
processed_ev AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM public.stripe_processed_events AS pe
      CROSS JOIN params AS p
      WHERE p.target_stripe_event_id IS NOT NULL
        AND btrim(pe.stripe_event_id) = btrim(p.target_stripe_event_id)
    ) AS processed_events_has_target_event,
    EXISTS (
      SELECT 1
      FROM public.reply_wallet_ledgers AS l
      CROSS JOIN params AS p
      WHERE p.target_stripe_event_id IS NOT NULL
        AND btrim(l.stripe_event_id) = btrim(p.target_stripe_event_id)
        AND lower(btrim(COALESCE(l.product_key, ''))) = 'dtr_core_light_to_full_upgrade_v1'
    ) AS upgrade_ledger_grant_exists_for_event
),
target_wallet AS (
  SELECT
    w.initial_included_count,
    w.purchased_count,
    w.consumed_count,
    w.available_count,
    (w.initial_included_count + w.purchased_count) AS total_capability
  FROM params AS p
  INNER JOIN public.reply_ticket_wallets AS w
    ON p.target_report_instance_id IS NOT NULL
   AND w.report_instance_id = p.target_report_instance_id
  ORDER BY w.updated_at DESC NULLS LAST
  LIMIT 1
),
flags AS (
  SELECT
  (
    SELECT current_database()::text = 'postgres'
    OR current_database()::text ILIKE '%soul%'
  ) AS target_project_identity_operator_confirmed,
  (
    SELECT NOT COALESCE(upgrade_sku_supported_in_rpc_body, false)
    FROM (
      SELECT position('dtr_core_light_to_full_upgrade_v1' IN pg_get_functiondef(p.oid)) > 0 AS upgrade_sku_supported_in_rpc_body
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
      LIMIT 1
    ) AS rpc_probe
  ) AS upgrade_sku_currently_unsupported,
  (SELECT stripe_events_has_target_event FROM generic_ev) AS stripe_events_has_target_event,
  (SELECT processed_events_has_target_event FROM processed_ev) AS processed_events_has_target_event,
  (SELECT upgrade_ledger_grant_exists_for_event FROM processed_ev) AS upgrade_ledger_grant_exists_for_event,
  (SELECT total_capability FROM target_wallet) AS wallet_total_capability,
  (SELECT purchased_count FROM target_wallet) AS wallet_purchased_count,
  (SELECT available_count FROM target_wallet) AS wallet_available_count
)
SELECT
  target_project_identity_operator_confirmed,
  upgrade_sku_currently_unsupported,
  stripe_events_has_target_event,
  processed_events_has_target_event,
  upgrade_ledger_grant_exists_for_event,
  wallet_total_capability,
  wallet_purchased_count,
  wallet_available_count,
  (
    target_project_identity_operator_confirmed
    AND upgrade_sku_currently_unsupported
    AND COALESCE(upgrade_ledger_grant_exists_for_event, false) = false
    AND COALESCE(wallet_total_capability, -1) = 1
    AND COALESCE(wallet_purchased_count, -1) = 0
  ) AS incident_wallet_still_pre_upgrade_bool,
  CASE
    WHEN NOT target_project_identity_operator_confirmed THEN 'STOP_CONFIRM_PRODUCTION_PROJECT_IDENTITY'
    WHEN NOT upgrade_sku_currently_unsupported THEN 'ALREADY_APPLIED'
    WHEN COALESCE(upgrade_ledger_grant_exists_for_event, false) THEN 'STOP_UPGRADE_GRANT_ALREADY_EXISTS'
    WHEN wallet_total_capability IS NULL THEN 'STOP_WALLET_NOT_FOUND_FOR_INCIDENT_REPORT'
    WHEN wallet_total_capability <> 1 THEN 'STOP_WALLET_NOT_PRE_UPGRADE_STATE'
    ELSE 'SAFE_TO_APPLY_RPC_V2'
  END AS precheck_classification
FROM flags;
