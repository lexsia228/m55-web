# Phase 5-6H-5Z-I-V-AS-B1-D — Failed fulfillment diagnostic planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B1-D** |
| **Title** | **Failed fulfillment diagnostic planning** |
| **Classification** | **Category 1 / failed fulfillment diagnostic planning / docs-only / no-mutation** |
| **Verdict** | **`FAILED_FULFILLMENT_DIAGNOSTIC_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-B1-D-FAILED-FULFILLMENT-DIAGNOSTIC-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**AS-B1-D plans read-only diagnostics only.** No repair, replay, DB write, or Stripe operations in this gate.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B1-R** | **`MANUAL_FAILED_FULFILLMENTS_POLLING_RESULT_GREEN_HISTORICAL_FAILURES_DIAGNOSTIC_REQUIRED_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-B1-R-MANUAL-FAILED-FULFILLMENTS-POLLING-RESULT-001`** | **`ea6d4f4`** |
| **AS-B1** | **`MANUAL_FAILED_FULFILLMENTS_POLLING_RUNBOOK_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-B1-MANUAL-FAILED-FULFILLMENTS-POLLING-RUNBOOK-PLAN-001`** | **`2036266`** |

### Counts-only baseline（AS-B1-R — unchanged）

| Metric | Value |
|--------|--------|
| **Target** | **`m55-soul-core`** / Production |
| **`failed_fulfillments_total`** | **7** |
| **`failed_fulfillments_24h`** | **0** |
| **`internal_processing_failed`** | **6** |
| **`missing_client_reference_id`** | **1** |
| **Active bleeding** | **no** |
| **Manual mutation** | **no** |

---

## C. Failure category interpretation（repo + polling alignment）

### `missing_client_reference_id`（1 row）

| Source | `app/api/stripe/webhook/route.ts` — `handleCheckoutCompleted` when `session.client_reference_id` is null |
|--------|--------------------------------------------------------------------------------------------------------|
| **Meaning** | Checkout completed webhook received **without** Clerk/user binding on session |
| **Typical causes** | Test checkout；misconfigured Checkout Session creation；abandoned/manual Stripe dashboard session |
| **User unlock impact** | **Likely no entitlement path** — failure recorded；Stripe may still show paid depending on timing |
| **SEV** | **Historical SEV-2** — configuration / binding gap |
| **Repair class** | **Not in AS-B1-D** — requires **AS-B1-REPAIR** + explicit GO if user impact confirmed |

### `internal_processing_failed`（6 rows）

| Source | `handleCheckoutCompletedOneTime` catch-all when `fulfillDtrCoreFromCheckoutSessionId` fails outside mapped `fulfill_*` / `payment_status_not_paid` branches |
|--------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Meaning** | DTR core one-time fulfillment pipeline threw or returned **unmapped** failure；`raw_metadata` may contain `reason` / `detail` keys（**do not export to SSOT**） |
| **Upstream reasons**（`lib/m55/dtrCoreCheckoutFulfillment.ts`） | `retrieve_failed`；`db_error`；snapshot/profile issues；entitlement/fulfillment row conflicts |
| **Webhook behavior** | Returns **HTTP 500** to Stripe for this path（retry-eligible）— may correlate with duplicate rows historically |
| **User unlock impact** | **Possible historical** “paid but not unlocked” if payment was paid and fulfillment never completed |
| **SEV** | **Historical SEV-2** at population level；**not active SEV-1** while **24h = 0** |

### Categories **not** present in current counts（reference）

| `failure_reason` | When recorded |
|------------------|---------------|
| `payment_status_not_paid` | Session not paid |
| `product_mismatch` | Wrong product id |
| `fulfill_user_mismatch` / `fulfill_not_payment` / `fulfill_product_not_allowed` | Mapped fulfill failures |
| `stripe_events_insert_failed` | Event dedupe insert failed |
| `revoke_failed` | Refund revoke path |

**Implication:** Current backlog is **not** dominated by unpaid or product mismatch — focus on **processing** and **client_reference_id** binding.

---

## D. Historical SEV-2 / no active bleeding decision

| Decision | Rationale |
|----------|-----------|
| **Historical SEV-2** | Seven rows；fulfillment/webhook lane；no user reports required for SEV-1 escalation in AS-B1-R |
| **Not active SEV-1** | **`failed_fulfillments_24h = 0`** — no current payment-unlock bleed indicator |
| **Not SEV-3** | Table is not reply/consult generation |
| **Diagnostic posture** | **Plan and read-only investigate** — **no emergency repair** until new 24h failures or confirmed active user impact |

---

## E. Read-only diagnostic questions（Human / safe ops）

Answer with **counts-only or yes/no** — never paste `event_id`, `checkout_session_id`, `user_id`, or `raw_metadata` into SSOT.

| # | Question | Purpose |
|---|----------|---------|
| **Q1** | Did any of the **7** failures occur in the **last 7 / 30 days**?（date bucket counts only） | Recency vs ancient noise |
| **Q2** | For **`internal_processing_failed`**, do safe Vercel logs show **`db_error`**, **`retrieve_failed`**, or **snapshot** keywords?（category only） | Sub-classify without row export |
| **Q3** | Is there **any** matching row in **`one_time_fulfillments`** for the same era?（count only: fulfilled vs failed ratio） | Paid-but-not-recorded vs never attempted |
| **Q4** | Is there **any** matching **`entitlements`** grant for DTR core product in same era?（count only） | Unlock gap confirmation |
| **Q5** | Was **`missing_client_reference_id`** from **test mode** or **live mode**?（live/test count only if available） | Test noise vs production misconfig |
| **Q6** | Any **support tickets** referencing “paid but locked”?（yes/no — no PII in SSOT） | User-facing incident corroboration |
| **Q7** | After latest deploy/config change, has **24h count stayed 0** on re-poll? | Confirms no active bleeding |

---

## F. Future counts-only / read-only query plan（Human execution — **not in AS-B1-D**）

**Target:** **`m55-soul-core`** only. **No `SELECT *`.** No row paste to chat/SSOT.

### F.1 Recency buckets（failed_fulfillments）

```sql
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
       failure_reason,
       count(*)::bigint AS c
FROM public.failed_fulfillments
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

### F.2 Fulfillment success vs failure ratio（aggregate）

```sql
SELECT
  (SELECT count(*)::bigint FROM public.failed_fulfillments) AS failed_total,
  (SELECT count(*)::bigint FROM public.one_time_fulfillments) AS fulfilled_total;
```

### F.3 Entitlement grant rough check（product-scoped count only — adjust product_id label in notes, not raw export）

```sql
SELECT count(*)::bigint AS dtr_core_entitlement_rows
FROM public.entitlements
WHERE product_id LIKE 'm55_p:core%';
```

### F.4 Re-poll cadence（AS-B1）

| Trigger | Action |
|---------|--------|
| **Daily** | Query 1–2 from **AS-B1** |
| **After payment test** | Within 15m + 24h |
| **`failed_fulfillments_24h > 0`** | **Stop** diagnostic — escalate per **AS-B1 §G** |

---

## G. Stop conditions

| Condition | Action |
|-----------|--------|
| **`failed_fulfillments_24h > 0`** | **Stop planning-only** — open **AS-B1-REPAIR** planning or incident gate；treat as potential **SEV-1** |
| **Confirmed active user paid-not-unlocked** | **Stop** — no repair in Category 1 without **AS-B1-REPAIR** + Human GO |
| **Human needs row-level IDs** | **Stop** — use secure offline channel；never SSOT |
| **Repair script execution requested** | **Stop** — **`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`** requires **5Z-I-P**-class gate + confirm phrase |

---

## H. Impact scope（planning）

| Surface | Historical impact | Active impact |
|---------|-------------------|---------------|
| **DTR core unlock** | **Possible** for subset of **`internal_processing_failed`** if payment was paid | **None indicated**（24h = 0） |
| **Reply ticket lane** | **Unlikely** — separate webhook branch | — |
| **Subscription lane** | **Unlikely** — not in failure_reason mix | — |
| **Stripe retries** | **Possible** for 500 responses on `internal_processing_failed` | Monitor on next test |

---

## I. Repo touchpoints（read-only — diagnostic map）

| Path | Role |
|------|------|
| `app/api/stripe/webhook/route.ts` | Inserts `failed_fulfillments`；`missing_client_reference_id`；`internal_processing_failed` |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | `fulfillDtrCoreFromCheckoutSessionId` failure reasons |
| `lib/m55/stripe/replyTicketWebhookLane.ts` | Separate lane — not implicated in current 7 |
| `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` | **Repair runner — out of scope** |
| `supabase/migrations/20260308000000_one_time_checkout_fulfillment.sql` | Table schema |

---

## J. No repair / no replay / no mutation statement

- **No** Production DB write
- **No** webhook replay / Stripe event resend
- **No** checkout retry / live payment / refund
- **No** entitlement / snapshot / wallet mutation
- **No** repair runner execution
- **No** raw user_id / email / session / Stripe ID / secret in SSOT
- **No** deploy / redeploy / env change
- **No** Clerk / auth change
- **No** AX-PROD / AL / full normal dev flow release

---

## K. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed**（current path） |
| **AC-P6 unpaid** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **Automated notification** | **AS-B2/B3** |
| **AI safety deploy** | **AS-C6** |
| **Full normal dev flow** | **NOT released** |

---

## L. Next phase

| Recommended | **`5Z-I-V-AS-B1-D-R`** — Read-only diagnostic **result** recording |
|-------------|---------------------------------------------------------------------|
| **When** | Human runs **§F** counts-only queries + answers **§E** yes/no |
| **Verdict target** | GREEN if recency/support questions resolved without active bleed |

| Alternative | **`AS-B1-REPAIR`** — only if Human confirms user impact + explicit GO |

| If 24h failures appear | **Re-poll AS-B1-R** first — then repair planning |

| Parallel | **AS-C5-A** / **AS-C6** if Human prioritizes AI safety over fulfillment diagnostics |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-B1-D-FAILED-FULFILLMENT-DIAGNOSTIC-PLAN-001`** | **本条** |
