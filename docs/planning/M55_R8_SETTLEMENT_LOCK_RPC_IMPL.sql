-- Fragment: appended into M55_R8_SETTLEMENT_EXECUTION_SCHEMA_PROPOSAL_2026-10-30.sql (canonical proposal).

create table if not exists public.m55_r8_platform_liquidity_reservations_v1 (
  reservation_id uuid primary key,
  batch_id uuid not null references public.m55_r8_payout_batches_v1 (batch_id),
  coverage_snapshot_id uuid not null references public.m55_r8_platform_liquidity_coverage_v1 (coverage_snapshot_id),
  reserved_net_jpy bigint not null check (reserved_net_jpy > 0),
  created_at timestamptz not null,
  released_at timestamptz null,
  constraint m55_r8_platform_liquidity_reservations_v1_batch_unique unique (batch_id)
);

create table if not exists public.m55_r8_japanese_bank_calendar_days_v1 (
  jst_year integer not null,
  jst_month integer not null check (jst_month between 1 and 12),
  jst_day integer not null check (jst_day between 1 and 31),
  classification text not null check (classification in ('BUSINESS', 'NON_BUSINESS')),
  primary key (jst_year, jst_month, jst_day)
);

alter table public.m55_r8_platform_liquidity_coverage_v1
  add column if not exists proof_kind text;

update public.m55_r8_platform_liquidity_coverage_v1
set proof_kind = 'STRIPE_BALANCE_SNAPSHOT'
where proof_kind is null;

alter table public.m55_r8_platform_liquidity_coverage_v1
  alter column proof_kind set not null;

alter table public.m55_r8_platform_liquidity_coverage_v1
  drop constraint if exists m55_r8_platform_liquidity_coverage_v1_proof_kind_chk;

alter table public.m55_r8_platform_liquidity_coverage_v1
  add constraint m55_r8_platform_liquidity_coverage_v1_proof_kind_chk check (
    proof_kind in ('BANK_BALANCE_SNAPSHOT', 'STRIPE_BALANCE_SNAPSHOT')
  );

revoke all on public.m55_r8_platform_liquidity_reservations_v1 from public, anon, authenticated;
revoke all on public.m55_r8_japanese_bank_calendar_days_v1 from public, anon, authenticated;
grant select, insert, update on public.m55_r8_platform_liquidity_reservations_v1 to service_role;
grant select on public.m55_r8_japanese_bank_calendar_days_v1 to service_role;

alter table public.m55_r8_platform_liquidity_reservations_v1 enable row level security;
alter table public.m55_r8_japanese_bank_calendar_days_v1 enable row level security;

create policy m55_r8_platform_liquidity_reservations_v1_service_role_only
  on public.m55_r8_platform_liquidity_reservations_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_japanese_bank_calendar_days_v1_service_role_only
  on public.m55_r8_japanese_bank_calendar_days_v1
  for all to service_role using (true) with check (true);

create or replace function public.m55_r8_compute_standard_payout_fee_jpy_v1(p_settlement_payable bigint)
returns bigint
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_excess bigint;
  v_increment_tens bigint;
begin
  if p_settlement_payable is null or p_settlement_payable < 0 or p_settlement_payable > 1000000000 then
    return null;
  end if;
  v_excess := greatest(p_settlement_payable - 20000, 0);
  v_increment_tens := ((v_excess * 55 + 99999) / 100000);
  return 770 + 10 * v_increment_tens;
end;
$fn$;

create or replace function public.m55_r8_compute_tail_payout_fee_jpy_v1(p_settlement_payable bigint)
returns bigint
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_standard bigint;
  v_cap bigint;
begin
  v_standard := public.m55_r8_compute_standard_payout_fee_jpy_v1(p_settlement_payable);
  if v_standard is null then
    return null;
  end if;
  v_cap := p_settlement_payable / 4;
  return least(v_standard, v_cap);
end;
$fn$;

create or replace function public.m55_r8_jst_ymd_v1(p_ts timestamptz, out y int, out m int, out d int)
language sql
immutable
set search_path = ''
as $fn$
  select
    extract(year from (p_ts at time zone 'Asia/Tokyo'))::int,
    extract(month from (p_ts at time zone 'Asia/Tokyo'))::int,
    extract(day from (p_ts at time zone 'Asia/Tokyo'))::int;
$fn$;

create or replace function public.m55_r8_classify_jst_bank_day_v1(p_ts timestamptz)
returns text
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_y int;
  v_m int;
  v_d int;
  v_class text;
begin
  select y, m, d into v_y, v_m, v_d from public.m55_r8_jst_ymd_v1(p_ts);
  select c.classification
  into v_class
  from public.m55_r8_japanese_bank_calendar_days_v1 as c
  where c.jst_year = v_y and c.jst_month = v_m and c.jst_day = v_d;
  if v_class is null then
    return 'UNKNOWN';
  end if;
  return v_class;
end;
$fn$;

create or replace function public.m55_r8_adjust_next_japanese_bank_business_day_v1(p_scheduled timestamptz)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_cursor timestamptz := p_scheduled;
  v_i int;
  v_class text;
begin
  for v_i in 0..369 loop
    v_class := public.m55_r8_classify_jst_bank_day_v1(v_cursor);
    if v_class = 'UNKNOWN' then
      return null;
    end if;
    if v_class = 'BUSINESS' then
      return v_cursor;
    end if;
    v_cursor := v_cursor + interval '1 day';
  end loop;
  return null;
end;
$fn$;

create or replace function public.m55_r8_standard_payout_due_utc_v1(p_cutoff timestamptz)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_jst timestamptz;
  v_y int;
  v_m int;
begin
  v_jst := p_cutoff at time zone 'Asia/Tokyo';
  v_y := extract(year from v_jst)::int;
  v_m := extract(month from v_jst)::int + 1;
  if v_m > 12 then
    v_m := 1;
    v_y := v_y + 1;
  end if;
  return make_timestamptz(v_y, v_m, 15, 0, 0, 0, 'Asia/Tokyo');
end;
$fn$;

create or replace function public.m55_r8_build_lock_result_json_v1(p_batch_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_batch public.m55_r8_payout_batches_v1%rowtype;
  v_inst public.m55_r8_payout_instructions_v1%rowtype;
  v_fee public.m55_r8_payout_fee_charges_v1%rowtype;
  v_lines jsonb;
begin
  select * into v_batch from public.m55_r8_payout_batches_v1 b where b.batch_id = p_batch_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'SETTLEMENT_STORAGE_UNAVAILABLE');
  end if;
  select * into v_inst from public.m55_r8_payout_instructions_v1 i where i.instruction_id = v_batch.instruction_id;
  select * into v_fee from public.m55_r8_payout_fee_charges_v1 f where f.instruction_id = v_batch.instruction_id;
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'commissionEventId', l.commission_event_id,
        'instructionId', l.instruction_id,
        'allocatedGrossCommissionJpy', l.allocated_gross_commission_jpy
      )
      order by l.commission_event_id
    ),
    '[]'::jsonb
  )
  into v_lines
  from public.m55_r8_payout_batch_lines_v1 l
  where l.instruction_id = v_batch.instruction_id;

  return jsonb_build_object(
    'ok', true,
    'created', false,
    'bundle', jsonb_build_object(
      'batch', jsonb_build_object(
        'batchId', v_batch.batch_id,
        'creatorEconomicIdentityId', v_batch.creator_economic_identity_id,
        'cutoffInstantUtc', to_jsonb(v_batch.cutoff_at),
        'idempotencyKey', v_batch.idempotency_key,
        'lockedAtUtc', to_jsonb(v_batch.locked_at),
        'instructionId', v_batch.instruction_id
      ),
      'instruction', jsonb_build_object(
        'instructionId', v_inst.instruction_id,
        'creatorEconomicIdentityId', v_inst.creator_economic_identity_id,
        'batchId', v_inst.batch_id,
        'idempotencyKey', v_batch.idempotency_key,
        'mode', v_inst.mode,
        'cutoffInstantUtc', to_jsonb(v_batch.cutoff_at),
        'payoutDueAtUtc', to_jsonb(v_inst.payout_due_at),
        'settlementPayableJpy', v_inst.settlement_payable_jpy,
        'payoutProcessingFeeJpy', v_inst.payout_processing_fee_jpy,
        'payoutFeePolicyVersion', v_inst.payout_fee_policy_version,
        'withholdingJpy', v_inst.withholding_jpy,
        'netPayoutJpy', v_inst.net_payout_jpy,
        'lockedAtUtc', to_jsonb(v_inst.locked_at),
        'parentInstructionId', v_inst.parent_instruction_id,
        'payoutDueReliable', v_inst.payout_due_reliable
      ),
      'feeCharge', jsonb_build_object(
        'feeChargeId', v_fee.fee_charge_id,
        'instructionId', v_fee.instruction_id,
        'feeJpy', v_fee.fee_jpy,
        'feePolicyVersion', v_fee.fee_policy_version,
        'idempotencyKey', v_fee.idempotency_key
      ),
      'batchLines', v_lines
    )
  );
end;
$fn$;
