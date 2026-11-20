-- M55 R7 — creator-owned compliance case history (security definer; no table ACL relaxation).

create or replace function public.m55_r7_list_owned_compliance_cases_v1(
  p_creator_economic_identity_id uuid,
  p_opened_from timestamptz,
  p_opened_to timestamptz,
  p_cursor_opened_at timestamptz default null,
  p_cursor_case_id uuid default null,
  p_limit int default 50
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_limit int;
  v_rows jsonb;
  v_has_more boolean;
begin
  if p_creator_economic_identity_id is null
     or p_opened_from is null
     or p_opened_to is null
     or p_opened_from > p_opened_to then
    raise exception 'INVALID_INPUT';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 50);

  if p_cursor_opened_at is not null and p_cursor_case_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  with fetched as (
    select
      c.case_id,
      c.case_kind,
      c.status,
      c.opened_at,
      c.resolved_at,
      c.decision,
      c.decision_reason
    from public.m55_r5_compliance_cases as c
    where c.creator_economic_identity_id = p_creator_economic_identity_id
      and c.opened_at >= p_opened_from
      and c.opened_at <= p_opened_to
      and (
        p_cursor_opened_at is null
        or c.opened_at < p_cursor_opened_at
        or (c.opened_at = p_cursor_opened_at and c.case_id < p_cursor_case_id)
      )
    order by c.opened_at desc, c.case_id desc
    limit v_limit + 1
  ),
  numbered as (
    select
      f.*,
      row_number() over (order by f.opened_at desc, f.case_id desc) as rn
    from fetched as f
  )
  select
    coalesce(
      (
        select jsonb_agg(to_jsonb(n) - 'rn')
        from numbered as n
        where n.rn <= v_limit
      ),
      '[]'::jsonb
    ),
  exists (select 1 from numbered as n where n.rn > v_limit)
  into v_rows, v_has_more;

  return jsonb_build_object('rows', v_rows, 'has_more', v_has_more);
end
$fn$;

revoke all on function public.m55_r7_list_owned_compliance_cases_v1(
  uuid, timestamptz, timestamptz, timestamptz, uuid, int
) from public, anon, authenticated;

grant execute on function public.m55_r7_list_owned_compliance_cases_v1(
  uuid, timestamptz, timestamptz, timestamptz, uuid, int
) to service_role;