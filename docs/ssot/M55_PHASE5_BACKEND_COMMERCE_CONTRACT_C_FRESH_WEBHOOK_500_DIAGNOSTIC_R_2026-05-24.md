# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-WEBHOOK-500-DIAGNOSTIC-R — Webhook 500 read-only diagnostic（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-WEBHOOK-500-DIAGNOSTIC-R** |
| **Title** | **`checkout.session.completed` webhook 500 — fulfillment missing diagnostic** |
| **Classification** | **Category 2 / read-only diagnostic / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_WEBHOOK_500_DIAGNOSTIC_R_BLOCKED_FULFILLMENT_MISSING_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-FRESH-WEBHOOK-500-DIAGNOSTIC-R-001`** |
| **Date** | **2026-05-24** |
| **Production deploy** | **`2ef7ae8`** |
| **Cohort namespace** | **`M55-core-Development`** · **`launch-cohort-primary`** |
| **Prior gate** | **`FRESH-CHECKOUT-D-EXEC`** payment window executed · **`AUTH-NAMESPACE-FRESH-CHECKOUT-CANARY-FREEZE-R GREEN`** |
| **Mutation in this gate** | **no** |

**Diagnostic BLOCKED.** Payment observed · webhook **500** · cohort DB counts **all 0**. Root cause: **uncaught `ENV_MISSING:SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`** on webhook route **before** fulfillment handler. **Natural Stripe retry will fail again** until Vercel Production Supabase admin env is corrected.

---

## B. Observed facts（Human + SQL + logs）

| Fact | Status |
|------|--------|
| **`checkout.session.completed`** | **observed yes** |
| **Webhook endpoint** | **`https://m55-webv2.vercel.app/api/stripe/webhook`** |
| **Stripe delivery response** | **500 ERR** |
| **Automatic retry** | **observed scheduled / in progress**（Stripe UI） |
| **Post-attempt cohort SQL** | **all 0**（visible snapshot · OTF · entitlements · rights · scoped wallet · included_grant） |
| **Second payment** | **prohibited** |

---

## C. Planning Q&A

### Q1. What exact Vercel webhook error occurred?

**Vercel Production log（read-only · redacted summary）:**

| Field | Value |
|-------|--------|
| **Route** | **`POST /api/stripe/webhook`** |
| **HTTP** | **500** |
| **Error class** | **`Error: ENV_MISSING:SUPABASE_…`**（truncated in Vercel UI） |
| **Source match** | **`lib/supabaseAdmin.ts`** throws **`ENV_MISSING:SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`** when **`NEXT_PUBLIC_SUPABASE_URL`** or **`SUPABASE_SERVICE_ROLE_KEY`** is absent |
| **Occurrences** | **≥ 2** delivery attempts in window（~**01:01:51** · ~**01:02:06** UTC on log timeline） |

**Not observed in webhook logs:** `Invalid signature` · `Processing failed` · `[webhook] lane=one_time` · `fulfillDtrCore` · profile metadata errors.

### Q2. Did Stripe signature verification pass?

**Yes — inferred with high confidence.**

| Reason | Detail |
|--------|--------|
| **Code path** | Signature failure returns **400** `{ error: 'Invalid signature' }` **before** `getSupabaseAdmin()` |
| **Observed** | **500** with **`ENV_MISSING:SUPABASE_…`** |
| **Conclusion** | **`stripe.webhooks.constructEvent`** succeeded · **`STRIPE_WEBHOOK_SECRET`** present on Production |

### Q3. Did route reach `checkout.session.completed` handler?

**No — failed earlier.**

| Stage | Reached |
|-------|---------|
| Raw body read | **yes** |
| Signature header present | **yes** |
| Signature verify | **yes** |
| **`getSupabaseAdmin()`** @ `route.ts:70` | **throws → uncaught 500** |
| **`stripe_events` dedupe query** | **no** |
| **`handleCheckoutCompleted`** | **no** |

### Q4. Did DTR fulfillment call start?

**No.**

**`fulfillDtrCoreFromCheckoutSessionId`** is only invoked from **`handleCheckoutCompletedOneTime`** · never reached.

### Q5. Failure classification — profile / product / user / DB / snapshot / env?

| Layer | Failed? |
|-------|---------|
| Profile metadata | **no** — handler not reached |
| **productId** | **no** |
| **client_reference_id / user** | **no** |
| **Database write** | **no** — no Supabase client |
| **Snapshot generation** | **no** |
| **Env / secret** | **yes — PRIMARY** · **Supabase admin env missing on webhook lambda** |

**Secondary masking:** **`GET /api/me/entitlements`** catches `getSupabaseAdmin()` failure and returns silent **free tier 200** · can hide pre-payment DB unavailability.

**Processing page:** **`/dtr/processing`** checks `getSupabaseAdmin()` and shows connection fallback if env missing · does **not** substitute for webhook fulfillment.

### Q6. Is failure deterministic — will automatic retry fail again?

**Yes — until env fix + redeploy.**

| Condition | Retry outcome |
|-----------|---------------|
| **`SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` still missing** | **500 again** · cohort counts stay **0** |
| **Env corrected on Vercel Production** | Natural retry **may succeed** · or **`/dtr/processing` reload**（idempotent fulfill path）· **not authorized in this gate** |

### Q7. What fix is needed before replay / repair?

| Priority | Fix | Gate type |
|----------|-----|-----------|
| **P0** | Vercel Production: ensure **`NEXT_PUBLIC_SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** set · **redeploy** | **env correction gate**（separate Human GO） |
| **P0** | Post-env smoke: webhook path can instantiate admin client（read-only probe or test event in staging — **not Production replay without GO**） | verification |
| **P1** | After env GREEN: **allow Stripe natural retry** OR **`/dtr/processing` idempotent fulfill** OR **controlled repair runner** | **separate gate** · **no second payment** |
| **Not required for root cause** | Profile metadata code change · productId change · manual grant | — |

**Prohibited in recovery:** second **`PurchaseButton`** click · ad-hoc webhook replay · manual fulfillment without gate.

---

## D. Stripe delivery summary（safe labels only）

| Field | Value |
|-------|--------|
| **Event type label** | **`checkout.session.completed`** |
| **Endpoint label** | **`m55-webv2.vercel.app/api/stripe/webhook`** |
| **Delivery result label** | **`http_500`** |
| **Retry policy label** | **`stripe_automatic_retry_observed`** |
| **Payment outcome label** | **`paid_observed_by_human`**（checkout completed on Stripe side） |
| **Fulfillment outcome label** | **`not_applied`** |

---

## E. Vercel error summary（safe · redacted）

```text
route: POST /api/stripe/webhook
status: 500
error_family: ENV_MISSING
missing_env_hint: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
failed_before: stripe_events_dedupe
failed_before: handleCheckoutCompleted
failed_before: fulfillDtrCoreFromCheckoutSessionId
signature_verification: inferred_pass
```

---

## F. Failed stage classification

```text
STAGE: WEBHOOK_PRE_HANDLER_ENV
SUBSTAGE: getSupabaseAdmin_init
BLOCKER: SUPABASE_ADMIN_ENV_MISSING_ON_VERCEL_PRODUCTION
FULFILLMENT_STARTED: false
DB_WRITES: none
COHORT_COUNTS: all_zero_confirmed
```

---

## G. Natural retry expectation

| Scenario | Expected |
|----------|----------|
| **Before env fix** | **FAIL again** · **500** · counts **0** |
| **After env fix + redeploy** | Natural retry **likely PASS** · fulfillment chain can run |
| **Without env fix** | **Do not** attempt second payment |

---

## H. Recommended fix path

| Step | Gate / action |
|------|----------------|
| **1** | **`VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-PLANNING`** → Human GO → set missing vars · redeploy |
| **2** | **`FRESH-WEBHOOK-500-ENV-FIX-VERIFY-R`** — confirm webhook no longer 500 on probe / natural retry observation |
| **3** | **`FRESH-FULFILLMENT-R`** — post-fix cohort SQL counts（hash-bound · no raw ids） |
| **4** | **`FRESH-DTR-UNLOCK-R`** — app unlock attestation |
| **5** | If natural retry + processing both insufficient · **`FRESH-CHECKOUT-FULFILLMENT-REPAIR-PLANNING`**（repair runner · **no second payment** · **no blind replay**） |

---

## I. No-mutation confirmation

| Action | Status |
|--------|--------|
| second checkout / payment | **no** |
| webhook replay | **no** |
| manual fulfillment / repair runner | **no** |
| DB write / SQL mutation | **no** |
| env / Clerk / Stripe mutation | **no** |
| VERIFY-C | **no** |
| raw Stripe/session/user/email/hash in SSOT | **no** |
| SELECT * | **no** |

---

## J. Recommended next gate

| Priority | Gate |
|----------|------|
| **1** | **`VERCEL-SUPABASE-ADMIN-ENV-CORRECTION-PLANNING`**（or Contract-C env sub-gate） |
| **2** | **`FRESH-WEBHOOK-500-ENV-FIX-VERIFY-R`** |
| **3** | **`FRESH-FULFILLMENT-R`** → **`FRESH-DTR-UNLOCK-R`** |

**`FRESH-CHECKOUT-D-EXEC` window:** **STOPPED** at fulfillment · **no retry payment**.

---

## K. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260524-FRESH-WEBHOOK-500-DIAGNOSTIC-R-001`** | **本条** |
| **`M55-EVID-20260523-AUTH-NAMESPACE-FRESH-CHECKOUT-CANARY-FREEZE-R-001`** | Cohort namespace |
| **`M55-EVID-20260523-FRESH-CHECKOUT-D-EXEC-PLANNING-REFRESH-001`** | Execution packet |

---

## L. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-24 | Webhook 500 diagnostic BLOCKED · Supabase admin env missing |
