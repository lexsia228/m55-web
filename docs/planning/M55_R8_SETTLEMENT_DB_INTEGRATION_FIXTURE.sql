-- LOCAL INTEGRATION FIXTURE ONLY — not for Production/Preview apply.
-- Minimal R6 ledger stub + seed rows for m55_r8_lock_payout_batch_v1 tests.

create table if not exists public.m55_r6_commission_ledger_events (
  commission_event_id uuid primary key,
  ledger_event_seq bigserial not null unique,
  origin_commission_event_id uuid null,
  event_family text not null,
  lifecycle_state_after_event text not null,
  entitlement_after_event_jpy bigint not null check (entitlement_after_event_jpy >= 0),
  recorded_at timestamptz not null,
  creator_economic_identity_id uuid not null
);

grant select, insert on public.m55_r6_commission_ledger_events to service_role;
