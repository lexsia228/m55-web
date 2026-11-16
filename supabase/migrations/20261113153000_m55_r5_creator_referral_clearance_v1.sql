-- Forward-only: boolean clearance probe for Creator referral touch without service_role table SELECT.
-- Predicate mirrors lib/m55/creatorDashboard/creatorContext.ts isCreatorReferralCapabilityPermittedV1
-- and m55_r7_creator_referral_issue_or_get_v1 compliance gate (OPEN/HOLD blocking decisions only).

create or replace function public.m55_r5_creator_referral_clearance_v1(
  p_creator_economic_identity_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_creator_economic_identity_id is null then
    return false;
  end if;

  if to_regclass('public.m55_r5_compliance_cases') is null then
    raise exception 'PORTAL_UNAVAILABLE';
  end if;

  return not exists (
    select 1
    from public.m55_r5_compliance_cases as c
    where c.creator_economic_identity_id = p_creator_economic_identity_id
      and c.status in ('OPEN', 'HOLD')
      and (
        c.decision is null
        or c.decision in (
          'KEEP_HOLD',
          'REQUEST_CORRECTION',
          'PAUSE_CREATOR',
          'TERMINATE_PARTNERSHIP'
        )
      )
  );
end;
$$;

alter function public.m55_r5_creator_referral_clearance_v1(uuid) owner to postgres;

revoke all on function public.m55_r5_creator_referral_clearance_v1(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.m55_r5_creator_referral_clearance_v1(uuid) to service_role;
