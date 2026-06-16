# M55 Production Purchase Smoke — Wave1 Human Runbook

**Status:** execution-ready planning artifact (no credentials)  
**Branch authority:** `feat/m55-paid-lp-canonical-wave1`  
**Commit placeholder:** `APPROVED_COMMIT_SHA`  
**Harness:** `scripts/production/m55_production_purchase_smoke_wave1.ts`  
**Postcheck SQL:** `scripts/sql/production/m55_production_purchase_smoke_wave1_postcheck.sql`

## Purpose

Execute four mandatory Production purchase scenarios before public release:

1. Light purchase (`dtr_core_light_v1`, ¥1,000)
2. Light→FULL conversion (`dtr_core_light_to_full_upgrade_v1`, ¥600 differential)
3. Duplicate FULL rejection (no second charge / no state delta)
4. Fresh FULL purchase on a separate subject (`dtr_core_full_v1`, ¥1,480)

Controlled account deletion is **excluded** from this wave and remains a separate later gate.

## Prerequisites

- Human approval for Production money-moving actions (separate from this document)
- Current deployed commit equals approved commit SHA
- Production identity confirmed: Vercel project `m55-webv2`, Production environment, live Stripe mode
- Two dedicated test subjects (no real customers):
  - **Subject A:** Light → conversion → duplicate rejection
  - **Subject B:** fresh FULL only
- Env/price binding verified locally without sharing values:
  - Human compares Production env keys to expected names only
  - Return to harness/logs: `EXACT_MATCH` or `MISMATCH` (never paste values)
- Supabase DNS / account-deletion lane may remain blocked independently

## STOP rules (non-negotiable)

- STOP at first failed predicate
- No retry after ambiguous payment, HTTP, or DB evidence
- No webhook Replay
- No fifth deletion webhook
- No broad Production DB queries
- No manual SQL mutation
- No manual entitlement/wallet/snapshot cleanup
- No Production account deletion in this wave
- No secret, card, email, or raw ID sharing in chat/logs/evidence

## W0 — Authority confirmation

**Machine step:**

```bash
node --experimental-strip-types scripts/production/m55_production_purchase_smoke_wave1.ts --dry-run-local
```

**Human steps:**

1. Confirm branch/commit match approved release candidate
2. Confirm Production project/environment identity
3. Confirm live Stripe mode intent
4. Verify env binding via dashboard only; record `EXACT_MATCH` or `MISMATCH` per key name (no values)

**Safe evidence to record:** `W0_AUTHORITY_GREEN`

## W1 — Test subjects confirmed

**Human steps:**

1. Create or designate Subject A label (outside logs: your internal label only)
2. Create or designate Subject B label (must differ from A)
3. Confirm neither subject is a real customer

**Safe evidence:** `W1_SUBJECTS_CONFIRMED`

## W2 — Light purchase (Subject A)

**Human browser steps:**

1. Sign in as Subject A
2. Complete profile prerequisites if checkout returns profile gate
3. Start Light checkout (`dtr_core_light_v1`) via approved UI entry
4. Complete exactly **one** live test payment (¥1,000 policy)
5. Wait for success/processing path (no second payment attempt)

**Safe evidence:** opaque label only, e.g. `LIGHT_CHECKOUT_REF_<label>`

## W3 — Light postcheck (Subject A)

**Machine step:**

```bash
# Set subject locally in psql session only — never commit the id
# SET m55.purchase_smoke.user_id = '<Subject A Clerk user id>';
psql "$APPROVED_READONLY_DB_URL" -v ON_ERROR_STOP=1 -f scripts/sql/production/m55_production_purchase_smoke_wave1_postcheck.sql
```

**Expected:** `scenario_classification=LIGHT_GREEN`, `overall_predicate=true`, failed_flags empty

## W4 — Light→FULL conversion (Subject A)

**Human browser steps:**

1. Remain signed in as Subject A (Light state must exist)
2. Start upgrade checkout via `/api/reply-tickets/checkout` UI path
3. Product: `dtr_core_light_to_full_upgrade_v1`
4. Complete exactly **one** ¥600 payment
5. Do not attempt legacy ¥500 add-on lane

**Safe evidence:** `UPGRADE_CHECKOUT_REF_<label>`

## W5 — Conversion postcheck (Subject A)

Re-run postcheck SQL for Subject A.

**Expected:** wallet `purchased_count=4`, total capability 5, `CONVERSION_GREEN` or consistent flags

## W6 — Duplicate FULL rejection (Subject A)

**Human browser steps:**

1. Attempt duplicate FULL or upgrade checkout again on Subject A
2. Expect pre-checkout rejection:
   - `409 already_purchased` on DTR checkout **or**
   - `422 cap_reached` on reply-tickets checkout
3. Confirm **no new Stripe Checkout Session** and **no new charge**

**Application evidence required:** HTTP status + rejection code only (no payload)

**Optional fulfillment defense check:** if a duplicate event exists, status must be `duplicate_noop`, `already_full_equivalent`, or `skipped_cap` with zero state delta

## W7 — Fresh FULL purchase (Subject B)

**Human browser steps:**

1. Sign in as Subject B (must be clean: no prior wave1 purchase)
2. Start FULL checkout (`dtr_core_full_v1`)
3. Complete exactly **one** ¥1,480 payment

**Safe evidence:** `FULL_CHECKOUT_REF_<label>`

## W8 — FULL postcheck (Subject B)

Re-run postcheck SQL for Subject B.

**Expected:** `FRESH_FULL_GREEN`, `purchased_count=4`, `available_count=5`

## W9 — Idempotency and exactness closure

**Human steps:**

1. Confirm no duplicate fulfillment rows for a single checkout session
2. Confirm stripe event dedupe prevented double-grant
3. Confirm no extra wallet/ledger/snapshot rows beyond contract

**Safe evidence:** `IDEMPOTENCY_GREEN`

## W10 — Refund / cleanup decision (optional, separate)

- **No automatic refund** in this wave
- Refund requires separate Human-approved Stripe action **after** evidence closure
- **Refund revocation semantics:** `UNKNOWN_FAIL_CLOSED` — do not assume entitlement revocation unless separately proven by authoritative SSOT/code review gate
- Never manually delete DB rows
- Retain safe transaction/ticket references only

## W11 — Purchase wave complete / deletion separate

- Mark purchase wave complete only if W0–W9 are GREEN
- Hand off to **Production controlled deletion smoke** under a separate Human-approved gate
- Do not combine deletion with purchase wave

## Refund policy boundary

| Action | Allowed in purchase wave? |
|---|---|
| Live purchase | Yes (Human, once per scenario) |
| Automatic refund | No |
| Manual DB cleanup | No |
| Controlled deletion | No (separate gate) |
| Webhook Replay | No |

## Final handoff

Next gate after commit/push of harness artifacts:

`CATEGORY-1-M55-PRODUCTION-PURCHASE-SMOKE-HARNESS-COMMIT-AND-PUSH-PLANNING`

Production execution gate requires separate Human approval with authority object (commit SHA, subject labels, expiry, approval phrase hash).
