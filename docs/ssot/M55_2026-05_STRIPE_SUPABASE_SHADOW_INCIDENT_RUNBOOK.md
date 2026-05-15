# M55 2026-05 Stripe / Vercel / Supabase Shadow Incident Runbook

Status: APPROVED SSOT  
Date: 2026-05-11  
Scope: DTR base report ¥1,000 Preview webhook fulfillment  
Branch: work/home-cluster  
Environment: Vercel Preview  
DB: Supabase Shadow/Test = m55-soul-shadow / jonlynrbfveaprncyrmv  
Stripe mode: Sandbox  
Webhook endpoint: M55-Vercel-Preview-HomeCluster  
Product lane: DTR base report ¥1,000 / DTR_CORE_STATIC_V1  
Non-target: Production/main, additional reply ticket ¥500, legal/support, UI redesign, copy changes, new Stripe endpoint, whsec rotation, Vercel env changes, new payment

---

## 0. Purpose

This runbook exists to prevent a repeat of the 2026-05 Stripe / Vercel / Supabase Shadow incident.

The failure was not a single code bug. It was a layered environment, webhook, DB schema, PostgREST, and AI-operation-control incident.

The core lesson:

Shadow DB is not safe merely because it exists. Shadow is saonly when project URL, service key, active status, schema, columns, types, UNIQUE/PK constraints, PostgREST visibility, and current code contract are aligned.

---

## 1. Final GREEN checkpoint

The incident is considered recovered only at this checkpoint:

- Stripe Sandbox `checkout.session.completed` delivery to Preview webhook returns HTTP 200.
- Response body: `{ "received": true }`.
- Event lane: `one_time`.
- Product: `DTR_CORE_STATIC_V1`.
- Vercel Preview host: `m55-webv2-git-work-home-cluster-m55-official.vercel.app`.
- Supabase target: `jonlynrbfveaprncyrmv.supabase.co`.
- Shadow DB contract verification:
  - `all_checks_pass = true`
  - `otf_fulfilled_at_ok = true`
  - `otf_required_columns_ok = true`
  - `otf_checkout_session_unique_ok = true`
  - `ff_insert_columns_ok = true`
  - `ff_raw_metadata_jsonb_ok = true`

Next application-level checks:

1. `/dtr/processing` completes.
2. Paid report opens.
3. `entitlements` contains the DTR right.
4. `one_time_fulfillments` contains the fulfillment row.
5. `reply_ticket_wallets` contains the included ticket.
6. Consultation reply room displays the expected remaining count.

---

## 2. Confirmed root causes

Observed causes and blockers:

1. Stripe endpoint / whsec confusion risk.
2. Vercel Preview env missing or invalid values.
3. Supabase URL existed but was not a valid HTTP/HTTPS Supabase Project URL.
4. Supabase Shadow project was paused.
5. Vercel Preview initially targeted a different Supabase project than the restored Shadow.
6. Shadow DB was missing required fulfillment tables.
7. Some table names existed but columns, types, and UNIQUE/PK constraints did not match current M55 code.
8. PostgREST schema cache required reload after DDL.
9. Stripe resend occurred before DB schema contract was complete.
10. AI prompts and human actions did not always carry a strict work anchor, causing scope drift risk.

---

## 3. Mandatory M55 Release / Payment Gate Standard

All future payment, webhook, release, DB, and Preview tasks must follow this order.

### Gate 0: Work anchor

Every task must start with:

```text
作業アンカー：
Branch:
Environment:
DB:
Stripe mode:
Webhook endpoint:
Product lane:
Non-target:
Last GREEN:
Current blocker:
Next one action:
cat > scripts/sql/staging/m55_shadow_one_time_fulfillment_contract_repair_v1.sql <<'EOF'
-- ============================================================
-- M55 Shadow-only one-time fulfillment contract repair
-- Target: m55-soul-shadow / jonlynrbfveaprncyrmv
-- Date: 2026-05-11
--
-- Purpose:
-- Align Shadow DB with current M55 one-time DTR fulfillment code contract.
--
-- DO NOT RUN AGAINST PRODUCTION.
-- DO NOT RUN AGAINST main/Production DB.
-- This SQL is evidence/runbook material for Preview/Shadow recovery.
-- ============================================================

BEGIN;

-- one_time_fulfillments: current code inserts and orders by fulfilled_at.
ALTER TABLE public.one_time_fulfillments
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;

UPDATE public.one_time_fulfillments
SET fulfilled_at = COALESCE(fulfilled_at, created_at, now())
WHERE fulfilled_at IS NULL;

ALTER TABLE public.one_time_fulfillments
  ALTER COLUMN fulfilled_at SET DEFAULT now(),
  ALTER COLUMN fulfilled_at SET NOT NULL;

-- Align required not-null contract.
ALTER TABLE public.one_time_fulfillments
  ALTER COLUMN event_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL;

-- failed_fulfillments: current webhook failure logger writes these columns.
ALTER TABLE public.failed_fulfillments
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS raw_metadata jsonb;

ALTER TABLE public.failed_fulfillments
  ALTER COLUMN checkout_session_id SET NOT NULL,
  ALTER COLUMN event_id SET NOT NULL,
  ALTER COLUMN failure_reason SET NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verification query. Expected: all true.
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='one_time_fulfillments'
      AND column_name='fulfilled_at'
      AND data_type='timestamp with time zone'
  ) AS otf_fulfilled_at_ok,

  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='one_time_fulfillments'
      AND column_name IN ('checkout_session_id','payment_intent_id','event_id','user_id','product_id','fulfilled_at')
    HAVING COUNT(*) = 6
  ) AS otf_required_columns_ok,

  EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname='public'
      AND r.relname='one_time_fulfillments'
      AND c.contype IN ('p','u')
      AND pg_get_constraintdef(c.oid) ILIKE '%checkout_session_id%'
  ) AS otf_checkout_session_unique_ok,

  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='failed_fulfillments'
      AND column_name IN ('event_id','checkout_session_id','failure_reason','raw_metadata')
    HAVING COUNT(*) = 4
  ) AS ff_insert_columns_ok,

  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='failed_fulfillments'
      AND column_name='raw_metadata'
      AND data_type='jsonb'
  ) AS ff_raw_metadata_jsonb_ok;
