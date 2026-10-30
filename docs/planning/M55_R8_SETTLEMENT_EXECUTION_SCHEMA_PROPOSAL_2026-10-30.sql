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

create table if not exists public.m55_r8_platform_liquidity_coverage_v1 (
  coverage_snapshot_id uuid primary key,
  observed_at timestamptz not null,
  available_jpy bigint not null check (available_jpy >= 0),
  coverage_ratio_bps integer not null check (coverage_ratio_bps >= 10000 and coverage_ratio_bps <= 20000),
  source_label text not null check (char_length(source_label) between 1 and 64)
);

alter table public.m55_r8_payout_batches_v1 enable row level security;
alter table public.m55_r8_payout_instructions_v1 enable row level security;
alter table public.m55_r8_payout_batch_lines_v1 enable row level security;
alter table public.m55_r8_payout_fee_charges_v1 enable row level security;
alter table public.m55_r8_payout_attempts_v1 enable row level security;
alter table public.m55_r8_provider_settlement_events_v1 enable row level security;
alter table public.m55_r8_platform_liquidity_coverage_v1 enable row level security;

revoke all on public.m55_r8_platform_liquidity_coverage_v1 from public, anon, authenticated;
grant select, insert on public.m55_r8_platform_liquidity_coverage_v1 to service_role;

create policy m55_r8_payout_batches_v1_service_role_only on public.m55_r8_payout_batches_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_payout_instructions_v1_service_role_only on public.m55_r8_payout_instructions_v1
  for all to service_role using (true) with check (true);

create policy m55_r8_payout_batch_lines_v1_service_role_only on public.m55_r8_payout_batch_lines_v1
  for all to service_role using (true) with check (true);

-- Lock RPC (service_role only): derives eligible lines from R6 ledger, validates coverage snapshot, writes batch atomically.
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
  v_available bigint;
  v_ratio int;
begin
  if to_regclass('public.m55_r8_payout_batches_v1') is null then
    return jsonb_build_object('ok', false, 'reason', 'SETTLEMENT_STORAGE_UNAVAILABLE');
  end if;

  select c.available_jpy, c.coverage_ratio_bps
  into v_available, v_ratio
  from public.m55_r8_platform_liquidity_coverage_v1 as c
  where c.coverage_snapshot_id = p_coverage_snapshot_id;

  if v_available is null or v_ratio < 10000 then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_CASH_COVERAGE');
  end if;

  -- Full allocation + instruction insert implemented when Human GO applies this proposal.
  return jsonb_build_object('ok', false, 'reason', 'SETTLEMENT_STORAGE_UNAVAILABLE');
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
