-- M55 R6-P0-A1 purchase money evidence v1. Local migration only; no Preview / Production apply.

create table public.m55_r6_purchase_money_evidence (
  purchase_money_evidence_id uuid primary key default gen_random_uuid(),
  canonical_payment_evidence_id uuid not null unique
    references public.m55_r5_attribution_canonical_payment_evidence(evidence_id)
    on delete restrict,
  gross_customer_paid_jpy bigint not null check (
    gross_customer_paid_jpy >= 1
    and gross_customer_paid_jpy <= 99999999
  ),
  currency text not null check (currency = 'jpy'),
  authoritative_tax_amount_present boolean not null,
  authoritative_purchase_tax_amount_jpy bigint null check (
    (
      authoritative_tax_amount_present = true
      and authoritative_purchase_tax_amount_jpy is not null
      and authoritative_purchase_tax_amount_jpy >= 0
    )
    or (
      authoritative_tax_amount_present = false
      and authoritative_purchase_tax_amount_jpy is null
    )
  ),
  discount_amount_jpy bigint not null check (
    discount_amount_jpy >= 0
    and discount_amount_jpy <= 99999999
  ),
  discount_state text not null check (
    (
      discount_state = 'NONE'
      and discount_amount_jpy = 0
    )
    or (
      discount_state = 'PRESENT'
      and discount_amount_jpy > 0
    )
  ),
  source_capture_version text not null check (source_capture_version = 'r6_purchase_money_v1'),
  recorded_at timestamptz not null default now(),
  constraint m55_r6_purchase_money_tax_le_gross_chk check (
    authoritative_tax_amount_present = false
    or authoritative_purchase_tax_amount_jpy <= gross_customer_paid_jpy
  )
);

create function public.m55_r6_purchase_money_evidence_append_only_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'PURCHASE_MONEY_EVIDENCE_APPEND_ONLY';
end
$fn$;

create trigger m55_r6_purchase_money_evidence_append_only
  before update or delete on public.m55_r6_purchase_money_evidence
  for each row execute function public.m55_r6_purchase_money_evidence_append_only_trg();

create function public.m55_r6_purchase_money_evidence_no_truncate_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'PURCHASE_MONEY_EVIDENCE_NO_TRUNCATE';
end
$fn$;

create trigger m55_r6_purchase_money_evidence_no_truncate
  before truncate on public.m55_r6_purchase_money_evidence
  for each statement execute function public.m55_r6_purchase_money_evidence_no_truncate_trg();

alter table public.m55_r6_purchase_money_evidence enable row level security;

revoke all on public.m55_r6_purchase_money_evidence from public, anon, authenticated, service_role;
grant select, insert on public.m55_r6_purchase_money_evidence to service_role;

create function public.m55_r6_record_purchase_money_evidence_v1(
  p_stripe_canonical_event_id text,
  p_payment_intent_id text,
  p_gross_customer_paid_jpy bigint,
  p_currency text,
  p_authoritative_tax_amount_present boolean,
  p_authoritative_purchase_tax_amount_jpy bigint,
  p_discount_amount_jpy bigint,
  p_discount_state text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_evidence_id uuid;
  v_money public.m55_r6_purchase_money_evidence%rowtype;
begin
  if p_stripe_canonical_event_id is null
     or char_length(p_stripe_canonical_event_id) = 0
     or p_payment_intent_id is null
     or char_length(p_payment_intent_id) = 0
     or p_gross_customer_paid_jpy is null
     or p_gross_customer_paid_jpy < 1
     or p_gross_customer_paid_jpy > 99999999
     or p_currency is distinct from 'jpy'
     or p_authoritative_tax_amount_present is null
     or p_discount_amount_jpy is null
     or p_discount_amount_jpy < 0
     or p_discount_amount_jpy > 99999999
     or p_discount_state is null then
    raise exception 'INVALID_INPUT';
  end if;

  if p_authoritative_tax_amount_present then
    if p_authoritative_purchase_tax_amount_jpy is null
       or p_authoritative_purchase_tax_amount_jpy < 0
       or p_authoritative_purchase_tax_amount_jpy > p_gross_customer_paid_jpy then
      raise exception 'INVALID_INPUT';
    end if;
  elsif p_authoritative_purchase_tax_amount_jpy is not null then
    raise exception 'INVALID_INPUT';
  end if;

  if (p_discount_state = 'NONE' and p_discount_amount_jpy <> 0)
     or (p_discount_state = 'PRESENT' and p_discount_amount_jpy <= 0)
     or p_discount_state not in ('NONE', 'PRESENT') then
    raise exception 'INVALID_INPUT';
  end if;

  select evidence_id
    into v_evidence_id
  from public.m55_r5_attribution_canonical_payment_evidence
  where stripe_canonical_event_id = p_stripe_canonical_event_id
    and payment_intent_id = p_payment_intent_id;

  if not found then
    raise exception 'EVIDENCE_NOT_FOUND';
  end if;

  select *
    into v_money
  from public.m55_r6_purchase_money_evidence
  where canonical_payment_evidence_id = v_evidence_id;

  if found then
    if v_money.gross_customer_paid_jpy is not distinct from p_gross_customer_paid_jpy
       and v_money.currency is not distinct from p_currency
       and v_money.authoritative_tax_amount_present is not distinct from p_authoritative_tax_amount_present
       and v_money.authoritative_purchase_tax_amount_jpy is not distinct from p_authoritative_purchase_tax_amount_jpy
       and v_money.discount_amount_jpy is not distinct from p_discount_amount_jpy
       and v_money.discount_state is not distinct from p_discount_state
       and v_money.source_capture_version = 'r6_purchase_money_v1' then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'purchase_money_evidence_id', v_money.purchase_money_evidence_id
      );
    end if;
    raise exception 'MONEY_PAYLOAD_CONFLICT';
  end if;

  insert into public.m55_r6_purchase_money_evidence (
    canonical_payment_evidence_id,
    gross_customer_paid_jpy,
    currency,
    authoritative_tax_amount_present,
    authoritative_purchase_tax_amount_jpy,
    discount_amount_jpy,
    discount_state,
    source_capture_version
  ) values (
    v_evidence_id,
    p_gross_customer_paid_jpy,
    p_currency,
    p_authoritative_tax_amount_present,
    p_authoritative_purchase_tax_amount_jpy,
    p_discount_amount_jpy,
    p_discount_state,
    'r6_purchase_money_v1'
  )
  returning purchase_money_evidence_id into v_money.purchase_money_evidence_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'RECORDED',
    'purchase_money_evidence_id', v_money.purchase_money_evidence_id
  );
exception
  when unique_violation then
    select *
      into v_money
    from public.m55_r6_purchase_money_evidence
    where canonical_payment_evidence_id = v_evidence_id;
    if not found then
      raise;
    end if;
    if v_money.gross_customer_paid_jpy is not distinct from p_gross_customer_paid_jpy
       and v_money.currency is not distinct from p_currency
       and v_money.authoritative_tax_amount_present is not distinct from p_authoritative_tax_amount_present
       and v_money.authoritative_purchase_tax_amount_jpy is not distinct from p_authoritative_purchase_tax_amount_jpy
       and v_money.discount_amount_jpy is not distinct from p_discount_amount_jpy
       and v_money.discount_state is not distinct from p_discount_state
       and v_money.source_capture_version = 'r6_purchase_money_v1' then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'purchase_money_evidence_id', v_money.purchase_money_evidence_id
      );
    end if;
    raise exception 'MONEY_PAYLOAD_CONFLICT';
end
$fn$;

revoke all on function public.m55_r6_record_purchase_money_evidence_v1(
  text, text, bigint, text, boolean, bigint, bigint, text
) from public, anon, authenticated;

grant execute on function public.m55_r6_record_purchase_money_evidence_v1(
  text, text, bigint, text, boolean, bigint, bigint, text
) to service_role;
