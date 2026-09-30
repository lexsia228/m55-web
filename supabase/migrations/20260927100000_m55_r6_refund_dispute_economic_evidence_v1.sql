-- M55 R6-P0-A2 refund/dispute economic evidence v1. Local migration only; no Preview / Production apply.

create table public.m55_r6_refund_economic_evidence (
  refund_economic_evidence_id uuid primary key default gen_random_uuid(),
  purchase_money_evidence_id uuid not null
    references public.m55_r6_purchase_money_evidence(purchase_money_evidence_id)
    on delete restrict,
  stripe_event_id text not null unique,
  stripe_event_type text not null check (
    stripe_event_type in ('refund.created', 'refund.updated')
  ),
  stripe_event_created_at_ms bigint not null check (
    stripe_event_created_at_ms >= 0
    and stripe_event_created_at_ms <= 9007199254740991
  ),
  provider_refund_id text not null check (char_length(provider_refund_id) > 0),
  provider_refund_created_at_ms bigint not null check (
    provider_refund_created_at_ms >= 0
    and provider_refund_created_at_ms <= 9007199254740991
  ),
  payment_intent_id text not null check (char_length(payment_intent_id) > 0),
  amount_jpy bigint not null check (amount_jpy >= 1 and amount_jpy <= 99999999),
  currency text not null check (currency = 'jpy'),
  refund_status text not null check (
    char_length(refund_status) > 0
    and char_length(refund_status) <= 128
  ),
  source_capture_version text not null check (
    source_capture_version = 'r6_refund_economic_evidence_v1'
  ),
  recorded_at timestamptz not null default now()
);

create table public.m55_r6_dispute_economic_evidence (
  dispute_economic_evidence_id uuid primary key default gen_random_uuid(),
  purchase_money_evidence_id uuid not null
    references public.m55_r6_purchase_money_evidence(purchase_money_evidence_id)
    on delete restrict,
  stripe_event_id text not null unique,
  stripe_event_type text not null check (
    stripe_event_type in (
      'charge.dispute.created',
      'charge.dispute.updated',
      'charge.dispute.closed',
      'charge.dispute.funds_withdrawn',
      'charge.dispute.funds_reinstated'
    )
  ),
  stripe_event_created_at_ms bigint not null check (
    stripe_event_created_at_ms >= 0
    and stripe_event_created_at_ms <= 9007199254740991
  ),
  provider_dispute_id text not null check (char_length(provider_dispute_id) > 0),
  provider_dispute_created_at_ms bigint not null check (
    provider_dispute_created_at_ms >= 0
    and provider_dispute_created_at_ms <= 9007199254740991
  ),
  payment_intent_id text not null check (char_length(payment_intent_id) > 0),
  amount_jpy bigint not null check (amount_jpy >= 1 and amount_jpy <= 99999999),
  currency text not null check (currency = 'jpy'),
  dispute_status text not null check (
    char_length(dispute_status) > 0
    and char_length(dispute_status) <= 128
  ),
  source_capture_version text not null check (
    source_capture_version = 'r6_dispute_economic_evidence_v1'
  ),
  recorded_at timestamptz not null default now()
);

create function public.m55_r6_economic_event_evidence_append_only_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'ECONOMIC_EVENT_EVIDENCE_APPEND_ONLY';
end
$fn$;

create function public.m55_r6_economic_event_evidence_no_truncate_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'ECONOMIC_EVENT_EVIDENCE_NO_TRUNCATE';
end
$fn$;

create trigger m55_r6_refund_economic_evidence_append_only
  before update or delete on public.m55_r6_refund_economic_evidence
  for each row execute function public.m55_r6_economic_event_evidence_append_only_trg();

create trigger m55_r6_refund_economic_evidence_no_truncate
  before truncate on public.m55_r6_refund_economic_evidence
  for each statement execute function public.m55_r6_economic_event_evidence_no_truncate_trg();

create trigger m55_r6_dispute_economic_evidence_append_only
  before update or delete on public.m55_r6_dispute_economic_evidence
  for each row execute function public.m55_r6_economic_event_evidence_append_only_trg();

create trigger m55_r6_dispute_economic_evidence_no_truncate
  before truncate on public.m55_r6_dispute_economic_evidence
  for each statement execute function public.m55_r6_economic_event_evidence_no_truncate_trg();

alter table public.m55_r6_refund_economic_evidence enable row level security;
alter table public.m55_r6_dispute_economic_evidence enable row level security;

revoke all on public.m55_r6_refund_economic_evidence from public, anon, authenticated, service_role;
grant select, insert on public.m55_r6_refund_economic_evidence to service_role;

revoke all on public.m55_r6_dispute_economic_evidence from public, anon, authenticated, service_role;
grant select, insert on public.m55_r6_dispute_economic_evidence to service_role;

create function public.m55_r6_record_refund_economic_evidence_v1(
  p_stripe_event_id text,
  p_stripe_event_type text,
  p_stripe_event_created_at_ms bigint,
  p_provider_refund_id text,
  p_provider_refund_created_at_ms bigint,
  p_payment_intent_id text,
  p_amount_jpy bigint,
  p_currency text,
  p_refund_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_purchase_money_evidence_id uuid;
  v_purchase_currency text;
  v_row public.m55_r6_refund_economic_evidence%rowtype;
begin
  if p_stripe_event_id is null
     or char_length(p_stripe_event_id) = 0
     or p_stripe_event_type is null
     or p_stripe_event_type not in ('refund.created', 'refund.updated')
     or p_stripe_event_created_at_ms is null
     or p_stripe_event_created_at_ms < 0
     or p_stripe_event_created_at_ms > 9007199254740991
     or p_provider_refund_id is null
     or char_length(p_provider_refund_id) = 0
     or p_provider_refund_created_at_ms is null
     or p_provider_refund_created_at_ms < 0
     or p_provider_refund_created_at_ms > 9007199254740991
     or p_payment_intent_id is null
     or char_length(p_payment_intent_id) = 0
     or p_amount_jpy is null
     or p_amount_jpy < 1
     or p_amount_jpy > 99999999
     or p_currency is distinct from 'jpy'
     or p_refund_status is null
     or char_length(p_refund_status) = 0
     or char_length(p_refund_status) > 128 then
    raise exception 'INVALID_INPUT';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('m55_r6_commission:' || p_payment_intent_id, 0)
  );

  select pme.purchase_money_evidence_id, pme.currency
    into v_purchase_money_evidence_id, v_purchase_currency
  from public.m55_r6_purchase_money_evidence pme
  inner join public.m55_r5_attribution_canonical_payment_evidence r5
    on r5.evidence_id = pme.canonical_payment_evidence_id
  where r5.payment_intent_id = p_payment_intent_id
  limit 1;

  if not found then
    raise exception 'PURCHASE_MONEY_EVIDENCE_NOT_FOUND';
  end if;

  if v_purchase_currency is distinct from p_currency then
    raise exception 'INVALID_INPUT';
  end if;

  select *
    into v_row
  from public.m55_r6_refund_economic_evidence
  where stripe_event_id = p_stripe_event_id;

  if found then
    if v_row.purchase_money_evidence_id is not distinct from v_purchase_money_evidence_id
       and v_row.stripe_event_type is not distinct from p_stripe_event_type
       and v_row.stripe_event_created_at_ms is not distinct from p_stripe_event_created_at_ms
       and v_row.provider_refund_id is not distinct from p_provider_refund_id
       and v_row.provider_refund_created_at_ms is not distinct from p_provider_refund_created_at_ms
       and v_row.payment_intent_id is not distinct from p_payment_intent_id
       and v_row.amount_jpy is not distinct from p_amount_jpy
       and v_row.currency is not distinct from p_currency
       and v_row.refund_status is not distinct from p_refund_status
       and v_row.source_capture_version = 'r6_refund_economic_evidence_v1' then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'refund_economic_evidence_id', v_row.refund_economic_evidence_id
      );
    end if;
    raise exception 'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT';
  end if;

  insert into public.m55_r6_refund_economic_evidence (
    purchase_money_evidence_id,
    stripe_event_id,
    stripe_event_type,
    stripe_event_created_at_ms,
    provider_refund_id,
    provider_refund_created_at_ms,
    payment_intent_id,
    amount_jpy,
    currency,
    refund_status,
    source_capture_version
  ) values (
    v_purchase_money_evidence_id,
    p_stripe_event_id,
    p_stripe_event_type,
    p_stripe_event_created_at_ms,
    p_provider_refund_id,
    p_provider_refund_created_at_ms,
    p_payment_intent_id,
    p_amount_jpy,
    p_currency,
    p_refund_status,
    'r6_refund_economic_evidence_v1'
  )
  returning refund_economic_evidence_id into v_row.refund_economic_evidence_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'RECORDED',
    'refund_economic_evidence_id', v_row.refund_economic_evidence_id
  );
exception
  when unique_violation then
    select *
      into v_row
    from public.m55_r6_refund_economic_evidence
    where stripe_event_id = p_stripe_event_id;
    if not found then
      raise;
    end if;
    if v_row.purchase_money_evidence_id is not distinct from v_purchase_money_evidence_id
       and v_row.stripe_event_type is not distinct from p_stripe_event_type
       and v_row.stripe_event_created_at_ms is not distinct from p_stripe_event_created_at_ms
       and v_row.provider_refund_id is not distinct from p_provider_refund_id
       and v_row.provider_refund_created_at_ms is not distinct from p_provider_refund_created_at_ms
       and v_row.payment_intent_id is not distinct from p_payment_intent_id
       and v_row.amount_jpy is not distinct from p_amount_jpy
       and v_row.currency is not distinct from p_currency
       and v_row.refund_status is not distinct from p_refund_status
       and v_row.source_capture_version = 'r6_refund_economic_evidence_v1' then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'refund_economic_evidence_id', v_row.refund_economic_evidence_id
      );
    end if;
    raise exception 'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT';
end
$fn$;

create function public.m55_r6_record_dispute_economic_evidence_v1(
  p_stripe_event_id text,
  p_stripe_event_type text,
  p_stripe_event_created_at_ms bigint,
  p_provider_dispute_id text,
  p_provider_dispute_created_at_ms bigint,
  p_payment_intent_id text,
  p_amount_jpy bigint,
  p_currency text,
  p_dispute_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_purchase_money_evidence_id uuid;
  v_purchase_currency text;
  v_row public.m55_r6_dispute_economic_evidence%rowtype;
begin
  if p_stripe_event_id is null
     or char_length(p_stripe_event_id) = 0
     or p_stripe_event_type is null
     or p_stripe_event_type not in (
       'charge.dispute.created',
       'charge.dispute.updated',
       'charge.dispute.closed',
       'charge.dispute.funds_withdrawn',
       'charge.dispute.funds_reinstated'
     )
     or p_stripe_event_created_at_ms is null
     or p_stripe_event_created_at_ms < 0
     or p_stripe_event_created_at_ms > 9007199254740991
     or p_provider_dispute_id is null
     or char_length(p_provider_dispute_id) = 0
     or p_provider_dispute_created_at_ms is null
     or p_provider_dispute_created_at_ms < 0
     or p_provider_dispute_created_at_ms > 9007199254740991
     or p_payment_intent_id is null
     or char_length(p_payment_intent_id) = 0
     or p_amount_jpy is null
     or p_amount_jpy < 1
     or p_amount_jpy > 99999999
     or p_currency is distinct from 'jpy'
     or p_dispute_status is null
     or char_length(p_dispute_status) = 0
     or char_length(p_dispute_status) > 128 then
    raise exception 'INVALID_INPUT';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('m55_r6_commission:' || p_payment_intent_id, 0)
  );

  select pme.purchase_money_evidence_id, pme.currency
    into v_purchase_money_evidence_id, v_purchase_currency
  from public.m55_r6_purchase_money_evidence pme
  inner join public.m55_r5_attribution_canonical_payment_evidence r5
    on r5.evidence_id = pme.canonical_payment_evidence_id
  where r5.payment_intent_id = p_payment_intent_id
  limit 1;

  if not found then
    raise exception 'PURCHASE_MONEY_EVIDENCE_NOT_FOUND';
  end if;

  if v_purchase_currency is distinct from p_currency then
    raise exception 'INVALID_INPUT';
  end if;

  select *
    into v_row
  from public.m55_r6_dispute_economic_evidence
  where stripe_event_id = p_stripe_event_id;

  if found then
    if v_row.purchase_money_evidence_id is not distinct from v_purchase_money_evidence_id
       and v_row.stripe_event_type is not distinct from p_stripe_event_type
       and v_row.stripe_event_created_at_ms is not distinct from p_stripe_event_created_at_ms
       and v_row.provider_dispute_id is not distinct from p_provider_dispute_id
       and v_row.provider_dispute_created_at_ms is not distinct from p_provider_dispute_created_at_ms
       and v_row.payment_intent_id is not distinct from p_payment_intent_id
       and v_row.amount_jpy is not distinct from p_amount_jpy
       and v_row.currency is not distinct from p_currency
       and v_row.dispute_status is not distinct from p_dispute_status
       and v_row.source_capture_version = 'r6_dispute_economic_evidence_v1' then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'dispute_economic_evidence_id', v_row.dispute_economic_evidence_id
      );
    end if;
    raise exception 'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT';
  end if;

  insert into public.m55_r6_dispute_economic_evidence (
    purchase_money_evidence_id,
    stripe_event_id,
    stripe_event_type,
    stripe_event_created_at_ms,
    provider_dispute_id,
    provider_dispute_created_at_ms,
    payment_intent_id,
    amount_jpy,
    currency,
    dispute_status,
    source_capture_version
  ) values (
    v_purchase_money_evidence_id,
    p_stripe_event_id,
    p_stripe_event_type,
    p_stripe_event_created_at_ms,
    p_provider_dispute_id,
    p_provider_dispute_created_at_ms,
    p_payment_intent_id,
    p_amount_jpy,
    p_currency,
    p_dispute_status,
    'r6_dispute_economic_evidence_v1'
  )
  returning dispute_economic_evidence_id into v_row.dispute_economic_evidence_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'RECORDED',
    'dispute_economic_evidence_id', v_row.dispute_economic_evidence_id
  );
exception
  when unique_violation then
    select *
      into v_row
    from public.m55_r6_dispute_economic_evidence
    where stripe_event_id = p_stripe_event_id;
    if not found then
      raise;
    end if;
    if v_row.purchase_money_evidence_id is not distinct from v_purchase_money_evidence_id
       and v_row.stripe_event_type is not distinct from p_stripe_event_type
       and v_row.stripe_event_created_at_ms is not distinct from p_stripe_event_created_at_ms
       and v_row.provider_dispute_id is not distinct from p_provider_dispute_id
       and v_row.provider_dispute_created_at_ms is not distinct from p_provider_dispute_created_at_ms
       and v_row.payment_intent_id is not distinct from p_payment_intent_id
       and v_row.amount_jpy is not distinct from p_amount_jpy
       and v_row.currency is not distinct from p_currency
       and v_row.dispute_status is not distinct from p_dispute_status
       and v_row.source_capture_version = 'r6_dispute_economic_evidence_v1' then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'dispute_economic_evidence_id', v_row.dispute_economic_evidence_id
      );
    end if;
    raise exception 'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT';
end
$fn$;

revoke all on function public.m55_r6_record_refund_economic_evidence_v1(
  text, text, bigint, text, bigint, text, bigint, text, text
) from public, anon, authenticated;

grant execute on function public.m55_r6_record_refund_economic_evidence_v1(
  text, text, bigint, text, bigint, text, bigint, text, text
) to service_role;

revoke all on function public.m55_r6_record_dispute_economic_evidence_v1(
  text, text, bigint, text, bigint, text, bigint, text, text
) from public, anon, authenticated;

grant execute on function public.m55_r6_record_dispute_economic_evidence_v1(
  text, text, bigint, text, bigint, text, bigint, text, text
) to service_role;
