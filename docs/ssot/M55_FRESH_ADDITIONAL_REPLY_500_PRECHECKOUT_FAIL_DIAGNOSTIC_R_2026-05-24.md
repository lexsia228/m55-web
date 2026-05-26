# Phase FRESH-ADDITIONAL-REPLY-500-PRECHECKOUT-FAIL-DIAGNOSTIC-R（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **FRESH-ADDITIONAL-REPLY-500-PRECHECKOUT-FAIL-DIAGNOSTIC-R** |
| **Title** | **¥500 additional reply checkout session creation failure — read-only diagnostic** |
| **Classification** | **Category 2 / read-only diagnostic / no mutation** |
| **Verdict** | **`FRESH_ADDITIONAL_REPLY_500_PRECHECKOUT_FAIL_DIAGNOSTIC_R_BLOCKED_STRIPE_PRICE_MODE_MISMATCH_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-FRESH-ADDITIONAL-REPLY-500-PRECHECKOUT-FAIL-DIAGNOSTIC-R-001`** |
| **Date** | **2026-05-24** |
| **Cohort** | **`launch-cohort-primary`** · **`M55-core-Development`** |
| **Production app** | **`23eb8a1`** |
| **Agent Vercel Runtime Logs** | **not executed** — Human log paste required |

---

## B. UI failure summary（Human attestation）

| Check | Result |
|-------|--------|
| **`/dtr/core` opens** | **PASS** |
| **Consult room visible** | **PASS** |
| **Usage** | **残り 0件** · **合計5件まで** |
| **¥500 CTA visible** | **PASS** — **追加相談返書 1件 500円** |
| **Error shown** | **決済の準備に失敗しました。時間をおいてもう一度お試しください。** |
| **Stripe Checkout opened** | **not observed** |
| **Payment executed** | **not observed** |
| **CTA retry** | **prohibited** |

**UI error mapping (code):** `ConsultRoom.tsx` shows this string for **`error.code === 'stripe_error'`** (default) and also **`invalid_request` / `invalid_product`**. Distinct messages exist for **`forbidden_not_owner`**, **`wallet_not_found`**, **`cap_reached`**, **`wallet_not_active`**.

---

## C. Planning Q&A

### Q1. Which route creates ¥500 checkout?

**`POST /api/reply-tickets/checkout`** — `app/api/reply-tickets/checkout/route.ts`  
Client: `components/dtr/ConsultRoom.tsx` → `handlePurchase` → `fetch('/api/reply-tickets/checkout', { productKey: 'additional_reply_ticket', reportInstanceId })`.

**Not** `POST /api/purchase/checkout` (DTR ¥1,000 lane).

### Q2. Did request reach the route?

**Inferred yes** when signed-in (JSON error path, not network catch string **通信に失敗**).  
**Agent unauthenticated curl** returned **HTML 404** (Clerk/middleware — not cohort proof).  
**Confirm via Vercel log:** `POST /api/reply-tickets/checkout` with **4xx/5xx** at click time.

### Q3. Exact Vercel runtime error?

**Unknown in this gate.** Search log for:

```text
[reply-tickets/checkout] failed
```

**`stage` values (code contract):**

| stage | Typical HTTP | UI message class |
|-------|--------------|------------------|
| **`price_env_missing`** | **503** | generic 決済準備失敗 |
| **`stripe_client_create_failed`** | **503** | generic |
| **`stripe_session_create_failed`** | **502** | generic |
| **`session_url_missing`** | **502** | generic |
| wallet validate DB error → **`stripe_error`** | **502** | generic |

### Q4. `STRIPE_PRICE_REPLY_TICKET` in Production?

**Code uses `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** (not `STRIPE_PRICE_REPLY_TICKET`).  
**Vercel Production env list (names only):** key **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** **present** (encrypted).  
**Runtime truthy / live price id validity:** **not verified** in this gate.

### Q5. Stripe secret in Production?

**Vercel env list:** **`STRIPE_SECRET_KEY`** **present** on Production.  
**Indirect:** Fresh **¥1,000 DTR checkout succeeded** → secret likely functional.  
**¥500 path** still may fail on **price id** alone.

### Q6. `report_instance_id` available?

**Yes on UI path:** `GET /api/room/core` returns **`report_instance_id`** from **`resolveEntryReportOwnership`**; CTA requires non-null id.  
Checkout body sends **`reportInstanceId`**; server validates ownership via **`dtr_report_snapshots`**.

### Q7. Route prerequisites?

| Gate step | Rule |
|-----------|------|
| Auth | Clerk **`userId`** required |
| Body | **`product_key === additional_reply_ticket`** |
| Ownership | **`verifyUserOwnsReportInstance`** |
| Wallet | **scoped row** `(user_id, report_instance_id)` **active** |
| Cap | **`purchased_count < 4`** · **total < 5** |
| **`available_count`** | **Not required > 0** for checkout — UI shows ¥500 CTA when **`available_count === 0`** (post-consume) |

### Q8. Failure cause classification (pending log)

| Hypothesis | Likelihood | Why |
|------------|------------|-----|
| **`stripe_session_create_failed`** (invalid/inactive/test price on live) | **high** | Env key exists; DTR price works; generic UI error |
| **`price_env_missing`** (empty env at runtime) | **medium** | Would be 503 `stripe_error` |
| **`wallet_not_found` / forbidden** | **lower** | Would show **different** JP message unless code collapsed |
| **Clerk namespace** | **lower** | User reached authenticated room + send |
| **Supabase admin missing** | **lower** | Post env-fix; room/core + consume worked |

### Q9. Stripe Checkout session created?

**No evidence** — Checkout UI **not observed** · no success redirect.

### Q10. Payment made?

**No** — per Human attestation · **no retry**.

---

## D. Route / log summary（Agent）

| Item | Finding |
|------|---------|
| **Deploy SHA** | **`23eb8a1`** includes `app/api/reply-tickets/checkout/route.ts` |
| **Production `/api/diagnostics/env`** | Supabase + Clerk **present** (len probe) · **no Stripe price keys exposed** |
| **Vercel env names** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** + **`STRIPE_SECRET_KEY`** listed on Production |
| **Runtime logs** | **not pulled** |

---

## E. Failed stage classification

**`STRIPE_PRICE_MODE_MISMATCH_TEST_PRICE_ON_LIVE_SECRET`**

**Confirmed (Human Vercel log):** **`stripe_session_create_failed`** · **502** · **`resource_missing`** · **`stripePricePresent=true`** · **`stripeSecretPresent=true`** — **test-mode Price id** with **live Production secret**.

**Superseded:** ~~`CHECKOUT_SESSION_CREATE_STAGE_UNKNOWN_PENDING_HUMAN_VERCEL_LOG`~~

---

## F. Required fix path（no mutation in this gate）

| Step | Gate |
|------|------|
| 1 | **Human:** Vercel Runtime Logs — filter **`reply-tickets/checkout`** · paste **redacted** line with **`stage`** + **HTTP status** only |
| 2 | If **`price_env_missing`** → **`STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-EXEC`** (live **`price_...`** id · separate GO) |
| 3 | If **`stripe_session_create_failed`** → verify **live mode** price id matches Stripe Dashboard **M55WEB** live |
| 4 | If **`wallet_not_found`** → scoped wallet readonly SQL (cohort hash) before any repair |
| 5 | **Do not** click ¥500 again until **consume SQL GREEN** + **precheckout diagnostic GREEN** |

---

## G. Included reply consume SQL dependency

| Gate | Status |
|------|--------|
| **`FRESH-INCLUDED-REPLY-CONSUME-SQL-R`** | **`WAITING_HUMAN_SQL_ATTESTATION`** (unless closed separately) |
| **¥500 payment** | **HOLD** until consume SQL **GREEN** + precheckout fix verified |

---

## H. Hard prohibitions confirmation

CTA retry · second payment · webhook replay · manual grant · repair · DB write · env/Stripe change · Production DELETE — **all no in this gate**.

---

## I. Recommended next gate

| Order | Gate |
|-------|------|
| 1 | **`STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-PLANNING`** — **GREEN** → see `M55_STRIPE_ADDITIONAL_REPLY_PRICE_ENV_CORRECTION_PLANNING_2026-05-24.md` |
| 2 | **`STRIPE-ADDITIONAL-REPLY-PRICE-ENV-CORRECTION-EXEC`** — Human GO |
| 3 | **`FRESH-INCLUDED-REPLY-CONSUME-SQL-R` close** (parallel) |
| 4 | **`FRESH-ADDITIONAL-REPLY-500-PRECHECKOUT-R`** after EXEC + redeploy — **still no payment without fresh GO** |
