-- M55 R8 settlement + payout execution schema PROPOSAL (CANONICAL — UNAPPLIED).
-- Do NOT place under supabase/migrations. Human GO required before any DB apply.
-- JS authority: lib/m55/creatorSettlement/* and lib/m55/creatorProvider/providerFreshness.ts
-- Supersedes: docs/planning/M55_R8_B_SETTLEMENT_STATE_SCHEMA_PROPOSAL_2026-10-30.sql (pointer only)

create table if not exists public.m55_r8_payout_batches_v1 (
  batch_id uuid primary key,
  creator_economic_identity_id uuid not null,
  cutoff_at timestamptz not null,
  idempotency_key text not null,
  locked_at timestamptz not null,
  instruction_id uuid not null,
  applicable_legal_due_at timestamptz null,
  constraint m55_r8_payout_batches_v1_idempotency_key_unique unique (idempotency_key)
);

create table if not exists public.m55_r8_payout_instructions_v1 (
  instruction_id uuid primary key,
  batch_id uuid not null references public.m55_r8_payout_batches_v1 (batch_id),
  creator_economic_identity_id uuid not null,
  mode text not null check (mode in ('STANDARD_THRESHOLD', 'TAIL_FORCED', 'LEGAL_DEADLINE')),
  payout_due_at timestamptz not null,
  settlement_payable_jpy bigint not null check (settlement_payable_jpy >= 0),
  payout_processing_fee_jpy bigint not null check (payout_processing_fee_jpy >= 0),
  payout_fee_policy_version text not null,
  withholding_jpy bigint not null check (withholding_jpy >= 0),
  net_payout_jpy bigint not null check (net_payout_jpy >= 0),
  parent_instruction_id uuid null references public.m55_r8_payout_instructions_v1 (instruction_id),
  locked_at timestamptz not null,
  payout_due_reliable boolean not null default false,
  constraint m55_r8_payout_instructions_v1_net_nonnegative check (
    net_payout_jpy = settlement_payable_jpy - payout_processing_fee_jpy - withholding_jpy
  )
);

create table if not exists public.m55_r8_payout_batch_lines_v1 (
  commission_event_id uuid primary key,
  instruction_id uuid not null references public.m55_r8_payout_instructions_v1 (instruction_id),
  allocated_gross_commission_jpy bigint not null check (allocated_gross_commission_jpy >= 0)
);

create table if not exists public.m55_r8_payout_fee_charges_v1 (
  fee_charge_id uuid primary key,
  instruction_id uuid not null references public.m55_r8_payout_instructions_v1 (instruction_id),
  fee_jpy bigint not null check (fee_jpy >= 0),
  fee_policy_version text not null,
  idempotency_key text not null,
  constraint m55_r8_payout_fee_charges_v1_idempotency_key_unique unique (idempotency_key),
  constraint m55_r8_payout_fee_charges_v1_instruction_unique unique (instruction_id)
);

create table if not exists public.m55_r8_payout_attempts_v1 (
  attempt_id uuid primary key,
  instruction_id uuid not null references public.m55_r8_payout_instructions_v1 (instruction_id),
  attempt_number int not null check (attempt_number >= 1),
  status text not null check (status in ('QUEUED', 'PROCESSING', 'POSTED', 'FAILED', 'RETURNED')),
  idempotency_key text not null,
  parent_attempt_id uuid null references public.m55_r8_payout_attempts_v1 (attempt_id),
  constraint m55_r8_payout_attempts_v1_idempotency_key_unique unique (idempotency_key),
  constraint m55_r8_payout_attempts_v1_instruction_attempt_unique unique (instruction_id, attempt_number)
);

create table if not exists public.m55_r8_provider_settlement_events_v1 (
  provider_event_id uuid primary key,
  creator_economic_identity_id uuid not null,
  stripe_event_id text not null,
  event_type text not null,
  idempotency_key text not null,
  normalized_at timestamptz not null,
  payload_redacted jsonb not null default '{}'::jsonb,
  constraint m55_r8_provider_settlement_events_v1_idempotency_key_unique unique (idempotency_key),
  constraint m55_r8_provider_settlement_events_v1_stripe_event_unique unique (stripe_event_id)
);

revoke all on public.m55_r8_payout_batches_v1 from public, anon, authenticated;
revoke all on public.m55_r8_payout_instructions_v1 from public, anon, authenticated;
revoke all on public.m55_r8_payout_batch_lines_v1 from public, anon, authenticated;
revoke all on public.m55_r8_payout_fee_charges_v1 from public, anon, authenticated;
revoke all on public.m55_r8_payout_attempts_v1 from public, anon, authenticated;
revoke all on public.m55_r8_provider_settlement_events_v1 from public, anon, authenticated;

grant all on public.m55_r8_payout_batches_v1 to service_role;
grant all on public.m55_r8_payout_instructions_v1 to service_role;
grant all on public.m55_r8_payout_batch_lines_v1 to service_role;
grant all on public.m55_r8_payout_fee_charges_v1 to service_role;
grant all on public.m55_r8_payout_attempts_v1 to service_role;
grant all on public.m55_r8_provider_settlement_events_v1 to service_role;

-- Platform liquidity coverage is the only authority for 100% cash coverage (not caller-supplied integers).
-- Economic identity (reservation serialization) is economic_canon_key — not funding_source_id, source_label, or digest alone.
-- verified_evidence_digest proves snapshot authenticity; it is not the economic same-funds key.

create or replace function public.m55_r8_compute_funding_economic_canon_key_v1(
  p_proof_kind text,
  p_liquidity_scope_ref text,
  p_balance_currency_code text,
  p_balance_segment text
) returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_proof_kind = 'STRIPE_BALANCE_SNAPSHOT'
      and p_liquidity_scope_ref is not null
      and p_balance_currency_code ~ '^[A-Z]{3}$'
      and p_balance_segment in ('AVAILABLE', 'PENDING') then
      'STRIPE:' || btrim(p_liquidity_scope_ref) || ':' || p_balance_currency_code || ':' || p_balance_segment
    when p_proof_kind = 'BANK_BALANCE_SNAPSHOT'
      and p_liquidity_scope_ref is not null
      and p_balance_currency_code ~ '^[A-Z]{3}$'
      and p_balance_segment in ('AVAILABLE', 'PENDING') then
      'BANK:' || btrim(p_liquidity_scope_ref) || ':' || p_balance_currency_code || ':' || p_balance_segment
    else null
  end;
$$;

create table if not exists public.m55_r8_platform_liquidity_funding_sources_v1 (
  funding_source_id uuid primary key,
  proof_kind text not null check (proof_kind in ('BANK_BALANCE_SNAPSHOT', 'STRIPE_BALANCE_SNAPSHOT')),
  verified_evidence_digest text not null check (verified_evidence_digest ~ '^[0-9a-f]{64}$'),
  stripe_platform_scope_ref text not null check (char_length(stripe_platform_scope_ref) between 8 and 64),
  balance_currency_code char(3) not null default 'JPY' check (balance_currency_code ~ '^[A-Z]{3}$'),
  balance_segment text not null default 'AVAILABLE' check (balance_segment in ('AVAILABLE', 'PENDING')),
  economic_canon_key text not null check (char_length(economic_canon_key) between 16 and 128),
  created_at timestamptz not null default now(),
  check (
    economic_canon_key = public.m55_r8_compute_funding_economic_canon_key_v1(
      proof_kind,
      stripe_platform_scope_ref,
      balance_currency_code,
      balance_segment
    )
  )
);

create index if not exists m55_r8_platform_liquidity_funding_sources_v1_economic_canon_key_idx
  on public.m55_r8_platform_liquidity_funding_sources_v1 (economic_canon_key);

create table if not exists public.m55_r8_platform_liquidity_coverage_v1 (
  coverage_snapshot_id uuid primary key,
  funding_source_id uuid not null references public.m55_r8_platform_liquidity_funding_sources_v1 (funding_source_id),
  observed_at timestamptz not null,
  available_jpy bigint not null check (available_jpy >= 0),
  coverage_ratio_bps integer not null check (coverage_ratio_bps >= 10000 and coverage_ratio_bps <= 20000),
  source_label text not null check (char_length(source_label) between 1 and 64),
  proof_kind text not null check (proof_kind in ('BANK_BALANCE_SNAPSHOT', 'STRIPE_BALANCE_SNAPSHOT'))
);

alter table public.m55_r8_payout_batches_v1 enable row level security;
alter table public.m55_r8_payout_instructions_v1 enable row level security;
alter table public.m55_r8_payout_batch_lines_v1 enable row level security;
alter table public.m55_r8_payout_fee_charges_v1 enable row level security;
alter table public.m55_r8_payout_attempts_v1 enable row level security;
alter table public.m55_r8_provider_settlement_events_v1 enable row level security;
alter table public.m55_r8_platform_liquidity_coverage_v1 enable row level security;

revoke all on public.m55_r8_platform_liquidity_funding_sources_v1 from public, anon, authenticated;
grant select, insert on public.m55_r8_platform_liquidity_funding_sources_v1 to service_role;
alter table public.m55_r8_platform_liquidity_funding_sources_v1 enable row level security;
create policy m55_r8_platform_liquidity_funding_sources_v1_service_role_only
  on public.m55_r8_platform_liquidity_funding_sources_v1
  for all to service_role using (true) with check (true);

revoke all on public.m55_r8_platform_liquidity_coverage_v1 from public, anon, authenticated;
grant select, insert on public.m55_r8_platform_liquidity_coverage_v1 to service_role;

create policy m55_r8_payout_batches_v1_service_role_only on public.m55_r8_payout_batches_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_payout_instructions_v1_service_role_only on public.m55_r8_payout_instructions_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_payout_batch_lines_v1_service_role_only on public.m55_r8_payout_batch_lines_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_payout_fee_charges_v1_service_role_only on public.m55_r8_payout_fee_charges_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_payout_attempts_v1_service_role_only on public.m55_r8_payout_attempts_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_provider_settlement_events_v1_service_role_only on public.m55_r8_provider_settlement_events_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_platform_liquidity_coverage_v1_service_role_only on public.m55_r8_platform_liquidity_coverage_v1
  for all to service_role using (true) with check (true);

-- Lock RPC (service_role only): derives eligible lines from R6 ledger, validates coverage snapshot, writes batch atomically.

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
language sql
immutable
set search_path = ''
as $fn$
  with jst as (
    select (p_cutoff at time zone 'Asia/Tokyo') as local_ts
  ),
  parts as (
    select
      extract(year from local_ts)::int as y,
      extract(month from local_ts)::int as m
    from jst
  ),
  next_month as (
    select
      case when m = 12 then y + 1 else y end as y,
      case when m = 12 then 1 else m + 1 end as m
    from parts
  )
  select make_timestamptz(y, m, 15, 0, 0, 0, 'Asia/Tokyo')
  from next_month;
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

create or replace function public.m55_r8_lock_payout_batch_v1(
  p_creator_economic_identity_id uuid,
  p_cutoff_at timestamptz,
  p_batch_idempotency_key text,
  p_fee_idempotency_key text,
  p_withholding_jpy bigint,
  p_coverage_snapshot_id uuid,
  p_applicable_legal_due_at timestamptz,
  p_as_of timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_existing_batch_id uuid;
  v_existing_creator uuid;
  v_existing_cutoff timestamptz;
  v_existing_fee_key text;
  v_fee_instruction_id uuid;
  v_fee_batch_id uuid;
  v_available bigint;
  v_ratio int;
  v_observed timestamptz;
  v_proof_kind text;
  v_source_label text;
  v_funding_source_id uuid;
  v_economic_canon_key text;
  v_evidence_digest text;
  v_fs_proof_kind text;
  v_existing_legal_due timestamptz;
  v_reserved bigint;
  v_effective bigint;
  v_settlement_payable bigint := 0;
  v_oldest timestamptz;
  v_mode text;
  v_fee bigint;
  v_net bigint;
  v_due timestamptz;
  v_due_reliable boolean := false;
  v_batch_id uuid;
  v_instruction_id uuid;
  v_fee_charge_id uuid;
  v_tail_due timestamptz;
  v_tail_forced boolean := false;
  v_candidate timestamptz;
  v_result jsonb;
  v_line record;
  v_payable_already_allocated boolean := false;
begin
  if to_regclass('public.m55_r8_payout_batches_v1') is null
     or to_regclass('public.m55_r6_commission_ledger_events') is null
     or to_regclass('public.m55_r8_platform_liquidity_reservations_v1') is null
     or to_regclass('public.m55_r8_platform_liquidity_funding_sources_v1') is null then
    return jsonb_build_object('ok', false, 'reason', 'SETTLEMENT_STORAGE_UNAVAILABLE');
  end if;

  if p_batch_idempotency_key is null or char_length(p_batch_idempotency_key) < 8
     or p_fee_idempotency_key is null or char_length(p_fee_idempotency_key) < 8 then
    return jsonb_build_object('ok', false, 'reason', 'SETTLEMENT_STORAGE_UNAVAILABLE');
  end if;

  if p_withholding_jpy is null or p_withholding_jpy < 0 or p_withholding_jpy > 1000000000 then
    return jsonb_build_object('ok', false, 'reason', 'NEGATIVE_NET_PAYOUT');
  end if;

  if p_cutoff_at > p_as_of or p_as_of > (clock_timestamp() + interval '1 minute') then
    return jsonb_build_object('ok', false, 'reason', 'SETTLEMENT_STORAGE_UNAVAILABLE');
  end if;

  perform pg_advisory_xact_lock(hashtext('m55_r8_batch:' || p_batch_idempotency_key));

  select b.batch_id
  into v_existing_batch_id
  from public.m55_r8_payout_batches_v1 as b
  where b.idempotency_key = p_batch_idempotency_key
  for update;

  if v_existing_batch_id is not null then
    select
      b.creator_economic_identity_id,
      b.cutoff_at,
      f.idempotency_key,
      b.applicable_legal_due_at
    into v_existing_creator, v_existing_cutoff, v_existing_fee_key, v_existing_legal_due
    from public.m55_r8_payout_batches_v1 as b
    join public.m55_r8_payout_instructions_v1 as i on i.instruction_id = b.instruction_id
    join public.m55_r8_payout_fee_charges_v1 as f on f.instruction_id = b.instruction_id
    where b.batch_id = v_existing_batch_id;

    if v_existing_creator is distinct from p_creator_economic_identity_id
       or v_existing_cutoff is distinct from p_cutoff_at
       or v_existing_fee_key is distinct from p_fee_idempotency_key
       or v_existing_legal_due is distinct from p_applicable_legal_due_at then
      return jsonb_build_object('ok', false, 'reason', 'DUPLICATE_IDEMPOTENCY_CONFLICT');
    end if;

    return public.m55_r8_build_lock_result_json_v1(v_existing_batch_id);
  end if;

  select f.instruction_id
  into v_fee_instruction_id
  from public.m55_r8_payout_fee_charges_v1 as f
  where f.idempotency_key = p_fee_idempotency_key;

  if v_fee_instruction_id is not null then
    select i.batch_id into v_fee_batch_id
    from public.m55_r8_payout_instructions_v1 as i
    where i.instruction_id = v_fee_instruction_id;
    if v_fee_batch_id is not null then
      return jsonb_build_object('ok', false, 'reason', 'DUPLICATE_IDEMPOTENCY_CONFLICT');
    end if;
  end if;

  select
    c.available_jpy,
    c.coverage_ratio_bps,
    c.observed_at,
    c.proof_kind,
    c.source_label,
    c.funding_source_id,
    fs.verified_evidence_digest,
    fs.proof_kind,
    fs.economic_canon_key
  into
    v_available,
    v_ratio,
    v_observed,
    v_proof_kind,
    v_source_label,
    v_funding_source_id,
    v_evidence_digest,
    v_fs_proof_kind,
    v_economic_canon_key
  from public.m55_r8_platform_liquidity_coverage_v1 as c
  join public.m55_r8_platform_liquidity_funding_sources_v1 as fs
    on fs.funding_source_id = c.funding_source_id
  where c.coverage_snapshot_id = p_coverage_snapshot_id;

  if v_funding_source_id is null
     or v_evidence_digest is null
     or v_fs_proof_kind is null
     or v_economic_canon_key is null then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  if v_fs_proof_kind is distinct from v_proof_kind then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  perform pg_advisory_xact_lock(hashtext('m55_r8_economic:' || v_economic_canon_key));

  select c.available_jpy, c.coverage_ratio_bps, c.observed_at, c.proof_kind, c.source_label
  into v_available, v_ratio, v_observed, v_proof_kind, v_source_label
  from public.m55_r8_platform_liquidity_coverage_v1 as c
  where c.coverage_snapshot_id = p_coverage_snapshot_id
    and c.funding_source_id = v_funding_source_id
  for update;

  if v_available is null or v_ratio is null or v_ratio < 10000 then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  if v_proof_kind is null or v_proof_kind not in ('BANK_BALANCE_SNAPSHOT', 'STRIPE_BALANCE_SNAPSHOT') then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  if v_source_label is null or char_length(btrim(v_source_label)) < 8 then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  if v_observed is null
     or v_observed > p_as_of
     or v_observed < (p_as_of - interval '24 hours') then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  select coalesce(sum(r.reserved_net_jpy), 0)
  into v_reserved
  from public.m55_r8_platform_liquidity_reservations_v1 as r
  join public.m55_r8_platform_liquidity_coverage_v1 as c
    on c.coverage_snapshot_id = r.coverage_snapshot_id
  join public.m55_r8_platform_liquidity_funding_sources_v1 as fs
    on fs.funding_source_id = c.funding_source_id
  where r.released_at is null
    and fs.economic_canon_key = v_economic_canon_key;

  if v_reserved > v_available then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  v_effective := v_available - v_reserved;
  if v_effective < 0 then
    v_effective := 0;
  end if;

  create temporary table tmp_r8_eligible (
    commission_event_id uuid primary key,
    payable_at timestamptz not null,
    gross_jpy bigint not null
  ) on commit drop;

  -- Cutoff eligibility: PAYABLE as-of p_cutoff_at. Lock amount: latest PAYABLE entitlement as-of p_as_of (post-cutoff adjustments apply).
  insert into tmp_r8_eligible (commission_event_id, payable_at, gross_jpy)
  with ordered as (
    select
      e.commission_event_id,
      e.origin_commission_event_id,
      e.event_family,
      e.lifecycle_state_after_event,
      e.entitlement_after_event_jpy,
      e.recorded_at,
      e.ledger_event_seq,
      case
        when e.event_family = 'COMMISSION_ACCRUED' then e.commission_event_id
        else e.origin_commission_event_id
      end as origin_key
    from public.m55_r6_commission_ledger_events as e
    where e.creator_economic_identity_id = p_creator_economic_identity_id
  ),
  first_payable as (
    select
      case
        when e.event_family = 'COMMISSION_ACCRUED' then e.commission_event_id
        else e.origin_commission_event_id
      end as origin_key,
      min(e.recorded_at) as first_payable_at
    from public.m55_r6_commission_ledger_events as e
    where e.creator_economic_identity_id = p_creator_economic_identity_id
      and e.lifecycle_state_after_event = 'COMMISSION_PAYABLE'
    group by 1
  ),
  state_at_cutoff as (
    select distinct on (o.origin_key)
      o.origin_key,
      o.lifecycle_state_after_event
    from ordered as o
    where o.origin_key is not null
      and o.recorded_at <= p_cutoff_at
    order by o.origin_key, o.ledger_event_seq desc
  ),
  state_at_lock as (
    select distinct on (o.origin_key)
      o.origin_key as commission_event_id,
      o.lifecycle_state_after_event,
      o.entitlement_after_event_jpy as gross_jpy
    from ordered as o
    where o.origin_key is not null
      and o.recorded_at <= p_as_of
    order by o.origin_key, o.ledger_event_seq desc
  )
  select sal.commission_event_id, fp.first_payable_at as payable_at, sal.gross_jpy
  from state_at_cutoff as sac
  join state_at_lock as sal on sal.commission_event_id = sac.origin_key
  join first_payable as fp on fp.origin_key = sac.origin_key
  where sac.lifecycle_state_after_event = 'COMMISSION_PAYABLE'
    and sal.lifecycle_state_after_event = 'COMMISSION_PAYABLE'
    and sal.gross_jpy > 0
    and sal.gross_jpy <= 1000000000
    and fp.first_payable_at <= p_cutoff_at
    and not exists (
      select 1
      from public.m55_r8_payout_batch_lines_v1 as bl
      where bl.commission_event_id = sal.commission_event_id
    );

  select coalesce(sum(t.gross_jpy), 0), min(t.payable_at)
  into v_settlement_payable, v_oldest
  from tmp_r8_eligible as t;

  if v_settlement_payable is null or v_settlement_payable <= 0 then
    select exists (
      with ordered as (
        select
          e.commission_event_id,
          e.origin_commission_event_id,
          e.event_family,
          e.lifecycle_state_after_event,
          e.recorded_at,
          e.ledger_event_seq,
          case
            when e.event_family = 'COMMISSION_ACCRUED' then e.commission_event_id
            else e.origin_commission_event_id
          end as origin_key
        from public.m55_r6_commission_ledger_events as e
        where e.creator_economic_identity_id = p_creator_economic_identity_id
      ),
      state_at_cutoff as (
        select distinct on (o.origin_key)
          o.origin_key,
          o.lifecycle_state_after_event
        from ordered as o
        where o.origin_key is not null
          and o.recorded_at <= p_cutoff_at
        order by o.origin_key, o.ledger_event_seq desc
      )
      select 1
      from state_at_cutoff as sac
      where sac.lifecycle_state_after_event = 'COMMISSION_PAYABLE'
        and exists (
          select 1
          from public.m55_r8_payout_batch_lines_v1 as bl
          where bl.commission_event_id = sac.origin_key
        )
    )
    into v_payable_already_allocated;

    if v_payable_already_allocated then
      return jsonb_build_object('ok', false, 'reason', 'COMMISSION_ALREADY_ALLOCATED');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'NO_ELIGIBLE_COMMISSIONS');
  end if;

  if v_oldest is not null then
    v_tail_due := v_oldest + make_interval(days => 180);
    v_tail_forced := p_as_of >= v_tail_due;
  end if;

  if p_applicable_legal_due_at is not null and p_as_of >= p_applicable_legal_due_at then
    v_mode := 'LEGAL_DEADLINE';
  elsif v_settlement_payable >= 20000 then
    v_mode := 'STANDARD_THRESHOLD';
  elsif v_tail_forced then
    v_mode := 'TAIL_FORCED';
  else
    return jsonb_build_object('ok', false, 'reason', 'SETTLEMENT_MODE_UNRESOLVED');
  end if;

  v_candidate := null;
  if v_mode = 'STANDARD_THRESHOLD' then
    v_candidate := public.m55_r8_standard_payout_due_utc_v1(p_cutoff_at);
  elsif v_mode in ('TAIL_FORCED', 'LEGAL_DEADLINE') then
    if v_oldest is null then
      return jsonb_build_object('ok', false, 'reason', 'PAYOUT_DUE_UNRESOLVED');
    end if;
    v_candidate := v_oldest + make_interval(days => 180);
  end if;

  if p_applicable_legal_due_at is not null then
    if v_candidate is null or p_applicable_legal_due_at < v_candidate then
      v_candidate := p_applicable_legal_due_at;
    end if;
  end if;

  if v_candidate is null then
    return jsonb_build_object('ok', false, 'reason', 'PAYOUT_DUE_UNRESOLVED');
  end if;

  v_due := public.m55_r8_adjust_next_japanese_bank_business_day_v1(v_candidate);
  if v_due is null then
    return jsonb_build_object('ok', false, 'reason', 'PAYOUT_DUE_UNRESOLVED');
  end if;
  v_due_reliable := true;

  if v_mode in ('TAIL_FORCED', 'LEGAL_DEADLINE') then
    v_fee := public.m55_r8_compute_tail_payout_fee_jpy_v1(v_settlement_payable);
  else
    v_fee := public.m55_r8_compute_standard_payout_fee_jpy_v1(v_settlement_payable);
  end if;

  if v_fee is null then
    return jsonb_build_object('ok', false, 'reason', 'NEGATIVE_NET_PAYOUT');
  end if;

  v_net := v_settlement_payable - v_fee - p_withholding_jpy;
  if v_net < 0 then
    return jsonb_build_object('ok', false, 'reason', 'NEGATIVE_NET_PAYOUT');
  end if;

  select coalesce(sum(r.reserved_net_jpy), 0)
  into v_reserved
  from public.m55_r8_platform_liquidity_reservations_v1 as r
  join public.m55_r8_platform_liquidity_coverage_v1 as c
    on c.coverage_snapshot_id = r.coverage_snapshot_id
  join public.m55_r8_platform_liquidity_funding_sources_v1 as fs
    on fs.funding_source_id = c.funding_source_id
  where r.released_at is null
    and fs.economic_canon_key = v_economic_canon_key;

  if v_reserved > v_available then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  v_effective := v_available - v_reserved;
  if v_effective < 0 then
    v_effective := 0;
  end if;

  if v_effective < v_net then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  v_batch_id := gen_random_uuid();
  v_instruction_id := gen_random_uuid();
  v_fee_charge_id := gen_random_uuid();

  begin
    insert into public.m55_r8_payout_batches_v1 (
      batch_id,
      creator_economic_identity_id,
      cutoff_at,
      idempotency_key,
      locked_at,
      instruction_id,
      applicable_legal_due_at
    ) values (
      v_batch_id,
      p_creator_economic_identity_id,
      p_cutoff_at,
      p_batch_idempotency_key,
      p_as_of,
      v_instruction_id,
      p_applicable_legal_due_at
    );

    insert into public.m55_r8_payout_instructions_v1 (
      instruction_id,
      batch_id,
      creator_economic_identity_id,
      mode,
      payout_due_at,
      settlement_payable_jpy,
      payout_processing_fee_jpy,
      payout_fee_policy_version,
      withholding_jpy,
      net_payout_jpy,
      parent_instruction_id,
      locked_at,
      payout_due_reliable
    ) values (
      v_instruction_id,
      v_batch_id,
      p_creator_economic_identity_id,
      v_mode,
      v_due,
      v_settlement_payable,
      v_fee,
      'r8_b_payout_fee_v1',
      p_withholding_jpy,
      v_net,
      null,
      p_as_of,
      v_due_reliable
    );

    insert into public.m55_r8_payout_fee_charges_v1 (
      fee_charge_id,
      instruction_id,
      fee_jpy,
      fee_policy_version,
      idempotency_key
    ) values (
      v_fee_charge_id,
      v_instruction_id,
      v_fee,
      'r8_b_payout_fee_v1',
      p_fee_idempotency_key
    );

    for v_line in select * from tmp_r8_eligible loop
      insert into public.m55_r8_payout_batch_lines_v1 (
        commission_event_id,
        instruction_id,
        allocated_gross_commission_jpy
      ) values (
        v_line.commission_event_id,
        v_instruction_id,
        v_line.gross_jpy
      );
    end loop;

    insert into public.m55_r8_platform_liquidity_reservations_v1 (
      reservation_id,
      batch_id,
      coverage_snapshot_id,
      reserved_net_jpy,
      created_at,
      released_at
    ) values (
      gen_random_uuid(),
      v_batch_id,
      p_coverage_snapshot_id,
      v_net,
      p_as_of,
      null
    );
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'reason', 'COMMISSION_ALREADY_ALLOCATED');
  end;

  v_result := public.m55_r8_build_lock_result_json_v1(v_batch_id);
  v_result := jsonb_set(v_result, '{created}', 'true'::jsonb, true);
  return v_result;
end;
$fn$;

revoke all on function public.m55_r8_lock_payout_batch_v1(
  uuid, timestamptz, text, text, bigint, uuid, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.m55_r8_lock_payout_batch_v1(
  uuid, timestamptz, text, text, bigint, uuid, timestamptz, timestamptz
) to service_role;

-- Transaction invariants (apply via RPC in future R8 tranche):
-- 1) lock batch + instruction + fee charge + batch lines atomically
-- 2) commission_event_id allocation at-most-once
-- 3) no payout attempt before batch lock and 100% cash coverage proof
-- 4) no Stripe transfer columns until explicit R8 execution GO
