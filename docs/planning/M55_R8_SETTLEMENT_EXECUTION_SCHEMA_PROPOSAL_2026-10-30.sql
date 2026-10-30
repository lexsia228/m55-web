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

-- Transaction invariants (apply via RPC in future R8 tranche):
-- 1) lock batch + instruction + fee charge + batch lines atomically
-- 2) commission_event_id allocation at-most-once
-- 3) no payout attempt before batch lock and 100% cash coverage proof
-- 4) no Stripe transfer columns until explicit R8 execution GO
