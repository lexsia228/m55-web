-- =============================================================================
-- M55 — Reply-ticket RPC v2 upgrade — Human postcheck (SELECT ONLY)
-- Run ONLY after applying:
--   supabase/migrations/20260813000000_m55_reply_ticket_fulfillment_rpc_v2_upgrade.sql
-- =============================================================================

SELECT current_database()::text AS current_database_name;

SELECT
  pg_get_function_identity_arguments(p.oid)::text AS rpc_identity_arguments,
  pg_get_function_result(p.oid)::text AS rpc_result_type,
  (position('dtr_core_light_to_full_upgrade_v1' IN pg_get_functiondef(p.oid)) > 0) AS upgrade_sku_supported,
  (position('additional_reply_ticket' IN pg_get_functiondef(p.oid)) > 0) AS legacy_sku_supported,
  (position('v_is_upgrade' IN pg_get_functiondef(p.oid)) > 0) AS upgrade_branch_present,
  (position('v_purchased_delta := GREATEST(0, v_full_max_purchased - r_wallet.purchased_count)' IN pg_get_functiondef(p.oid)) > 0) AS upgrade_delta_math_present,
  (position('v_full_max_purchased CONSTANT int := 4' IN pg_get_functiondef(p.oid)) > 0) AS purchased_cap_four,
  (position('v_total_cap CONSTANT int := 5' IN pg_get_functiondef(p.oid)) > 0) AS total_cap_five,
  (position('product_key_mismatch' IN pg_get_functiondef(p.oid)) > 0) AS rejects_wrong_product
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event';

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

SELECT
  (
    SELECT position('dtr_core_light_to_full_upgrade_v1' IN pg_get_functiondef(p.oid)) > 0
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
    WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
    LIMIT 1
  ) AS postcheck_upgrade_supported,
  (
    SELECT position('additional_reply_ticket' IN pg_get_functiondef(p.oid)) > 0
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
    WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
    LIMIT 1
  ) AS postcheck_legacy_supported,
  (
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
    )
  ) AS postcheck_service_role_execute,
  CASE
    WHEN (
      SELECT position('dtr_core_light_to_full_upgrade_v1' IN pg_get_functiondef(p.oid)) > 0
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
      LIMIT 1
    ) = false THEN 'STOP_UPGRADE_SKU_NOT_IN_RPC'
    WHEN (
      SELECT position('additional_reply_ticket' IN pg_get_functiondef(p.oid)) > 0
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
      LIMIT 1
    ) = false THEN 'STOP_LEGACY_SKU_REMOVED'
  WHEN (
      SELECT NOT EXISTS (
        SELECT 1
        FROM pg_proc AS p
        JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
        JOIN information_schema.routine_privileges AS rp
          ON rp.specific_schema = n.nspname
         AND rp.routine_name = p.proname
        WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
          AND rp.grantee = 'service_role'
          AND rp.privilege_type = 'EXECUTE'
      )
    ) THEN 'STOP_SERVICE_ROLE_EXECUTE_MISSING'
    ELSE 'POSTCHECK_GREEN'
  END AS postcheck_classification;
