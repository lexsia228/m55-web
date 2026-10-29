-- M55 R8-A → R7 referral interlock SQL PROPOSAL (NOT a migration — do not place under supabase/migrations/).
-- Authoritative JS mirror: lib/m55/creatorProvider/providerPayoutReadinessPredicate.ts
--   evaluateCreatorProviderPayoutReadinessV1
-- Apply only after Human GO on coordinated R7/R8 gate. Does not modify applied R7 migration artifacts in Production.

create or replace function public.m55_r8_provider_referral_readiness_met_v1(
  p_creator_economic_identity_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_stripe_account_id text;
  v_link_state text;
  v_snapshot jsonb;
  v_transfers text;
  v_req_count int;
begin
  if p_creator_economic_identity_id is null then
    return false;
  end if;

  if to_regclass('public.m55_r8_stripe_connected_accounts_v1') is null
     or to_regclass('public.m55_r8_creator_tax_profiles_v1') is null then
    return false;
  end if;

  select a.stripe_account_id, a.link_state, a.last_provider_snapshot
  into v_stripe_account_id, v_link_state, v_snapshot
  from public.m55_r8_stripe_connected_accounts_v1 as a
  where a.creator_economic_identity_id = p_creator_economic_identity_id;

  if v_stripe_account_id is null or btrim(v_stripe_account_id) = '' then
    return false;
  end if;

  if v_link_state is distinct from 'PAYOUTS_CAPABILITY_ACTIVE' then
    return false;
  end if;

  if v_snapshot is null or jsonb_typeof(v_snapshot) <> 'object' then
    return false;
  end if;

  v_transfers := v_snapshot #>> '{transfersCapability}';
  v_req_count := coalesce((v_snapshot #>> '{requirementsCurrentlyDueCount}')::int, -1);

  if coalesce(v_snapshot #>> '{detailsSubmitted}', 'false') <> 'true'
     or coalesce(v_snapshot #>> '{payoutsEnabled}', 'false') <> 'true'
     or v_transfers <> 'active'
     or v_req_count < 0
     or v_req_count > 0 then
    return false;
  end if;

  if not exists (
    select 1
    from public.m55_r8_creator_tax_profiles_v1 as t
    where t.creator_economic_identity_id = p_creator_economic_identity_id
      and t.schema_version = '2026-10-29-v1'
      and t.tax_residency = 'JAPAN_RESIDENT'
      and t.v1_japan_resident_attested is true
      and t.v1_age_18_plus_attested is true
      and t.withholding_classification = 'ORDINARY_JP_AFFILIATE_V1_ZERO'
      and t.payee_type = 'INDIVIDUAL'
  ) then
    return false;
  end if;

  return true;
end;
$fn$;

-- (Remainder: issue/rotate RPC wrappers identical to prior proposal — see git history 4887ee91 planning draft.)
