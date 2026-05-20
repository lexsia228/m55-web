# Phase 5-6H-5Z-I-V-AS-B — Minimal error notification planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B** |
| **Title** | **Minimal error notification planning** |
| **Classification** | **Category 1 / minimal error notification planning / docs-only / no-mutation** |
| **Verdict** | **`MINIMAL_ERROR_NOTIFICATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-B-MINIMAL-ERROR-NOTIFICATION-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**AS-B defines the plan only.** No notification integration, no code, no env, no DB writes in this gate.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-A** | **`RELEASE_READINESS_IMMEDIATE_GUARDRAIL_TRIAGE_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-A-RELEASE-READINESS-IMMEDIATE-GUARDRAIL-TRIAGE-PLAN-001`** | **`1ec3cee`** |
| **AS** | **`TEMPORARY_AUTH_COMPLIANCE_EXCEPTION_GOVERNANCE_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-…-001`** | **`bdfad74`** |

| AS-A classification | Value |
|---------------------|--------|
| **Minimal error notification** | **Pre-Paid Traffic Must-Have** |
| **Manual `failed_fulfillments` polling** | **Release Day Must-Have** |

---

## C. Why this gate exists

| Driver | Detail |
|--------|--------|
| **Historical signal** | **`failed_fulfillments`** has **non-zero** Production aggregate count in **AP-S-R**（**7** total — counts-only, no rows in SSOT） |
| **High-risk mode** | Payment succeeded but **entitlement / report / wallet** not unlocked |
| **Cannot wait** | Full dashboard / automated DLQ can follow later；**early detection** cannot be ignored before paid traffic expands |
| **AS-B scope** | Plan channels, triggers, manual runbook, future implementation gates — **no build** |

---

## D. Failure sources to monitor

| # | Source | Current evidence / path | Severity | Immediate detection | Future notify trigger | Manual owner | Before paid traffic? |
|---|--------|-------------------------|----------|---------------------|----------------------|--------------|------------------------|
| **1** | **Stripe webhook / DTR fulfillment** | `app/api/stripe/webhook/route.ts` → `fulfillDtrCoreFromCheckoutSessionId` | **SEV-1** | Vercel logs `[webhook]`；**500** to Stripe on hard failures | `failed_fulfillments` insert + log pattern | **Human / M55 owner** | **yes** |
| **2** | **`failed_fulfillments` rows** | `insertFailedFulfillment()` — reasons: `missing_client_reference_id`, `product_mismatch`, `payment_status_not_paid`, fulfillment failures | **SEV-1–2** | **Manual SQL count**（§F） | New row count **> 0** since last check | **Human** | **yes** |
| **3** | **`checkout.session.completed` skip / mismatch** | Webhook returns **200** with `failed_fulfillments` for some paths；DTR lane delegates reply ticket | **SEV-2** | Log + table | Same as #2 | **Human** | **yes** |
| **4** | **DTR snapshot creation failure** | `lib/m55/dtrCoreCheckoutFulfillment.ts` — `[fulfillDtrCore] dtr_report_snapshots skipped`（may not insert `failed_fulfillments`） | **SEV-1** | Vercel logs only today | Add **safe-category** alert in **AS-B4** | **Human** | **yes**（gap: log-only today） |
| **5** | **Reply wallet grant / ledger** | `replyTicketWebhookLane.ts` — `fulfillment_outcome: 'failed'` | **SEV-2** | Logs + wallet probe | Lane label + failure category | **Human** | **yes** |
| **6** | **Reply ticket checkout API** | `app/api/reply-tickets/checkout/route.ts` — `console.error` | **SEV-2** | Vercel logs | Route label + error category | **Human** | **pre-traffic** |
| **7** | **Consult / room send** | `app/api/room/core/send/route.ts` — AI **503**；high-risk block | **SEV-3** | User-visible error；logs | Optional lower priority | **Human** | **post-launch OK** |
| **8** | **Room core load** | `app/api/room/core/route.ts` — ownership / load errors | **SEV-3–4** | Logs | Defer | **Human** | **defer** |
| **9** | **Repair script guard** | `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` — stops if `failed_fulfillments_for_session > 0` | **SEV-2** | Script output | N/A（repair is gated） | **Human** | **repair gate only** |

**Gap noted:** Not all fulfillment failures land in **`failed_fulfillments`**（e.g. snapshot skip is **log-only**）. **AS-B4** implementation should consider **dual trigger**: table insert **or** structured log hook — **Category 2** only.

---

## E. Notification channel options

| Channel | Cost | Speed | Setup complexity | Env/secrets later? | Device visibility | Recommendation |
|---------|------|-------|------------------|-------------------|-------------------|----------------|
| **Manual Supabase polling** | **Free** | Slow（human cadence） | **Low** | **no** | Dashboard | **✅ Immediate interim（Release Day）** |
| **Vercel log review** | **Free** | Medium | **Low** | **no** | Browser | **✅ Supplement** |
| **Supabase logs / manual** | **Free** | Medium | **Low** | **no** | Dashboard | **✅ Supplement** |
| **Email** | Low–med | Fast | Medium | **yes**（SMTP/API） | Inbox | **✅ First automated（Human choice later）** |
| **Slack incoming webhook** | Low | Fast | Medium | **yes** | Mobile/desktop | **Optional** |
| **Discord webhook** | Low | Fast | Medium | **yes** | Mobile/desktop | **Optional** |
| **LINE Notify** | Low | Fast | Medium | **yes** | Mobile | **Optional（JP ops）** |
| **Full ops dashboard** | High | Fast | **High** | **yes** | — | **❌ Defer（AS-A）** |

**AS-B recommendation:**

1. **Immediate:** **Manual `failed_fulfillments` polling runbook**（§F）  
2. **First automation:** **simplest channel Human selects** in **AS-B2**（email or Slack/Discord/LINE）  
3. **Avoid** building a full dashboard in v1  

---

## F. Manual polling runbook（Release Day — no code）

### Cadence

| When | Action |
|------|--------|
| **Daily**（minimum） | Run counts-only queries on **`m55-soul-core`** |
| **After any paid-traffic test** | Same day check |
| **On user report** | Immediate check + Stripe Dashboard payment list（no raw IDs in SSOT notes） |

### Counts-only SQL（Human executes — **not** in AS-B session）

```sql
-- Backlog size
SELECT count(*)::bigint AS failed_fulfillments_total FROM public.failed_fulfillments;

-- Recent window (last 24h) — adjust interval as needed
SELECT count(*)::bigint AS failed_fulfillments_last_24h
FROM public.failed_fulfillments
WHERE created_at >= now() - interval '24 hours';

-- Safe category breakdown (no raw checkout ids in SSOT paste)
SELECT failure_reason, count(*)::bigint AS c
FROM public.failed_fulfillments
GROUP BY failure_reason
ORDER BY c DESC;
```

**Do not paste into SSOT:** raw **`user_id`**, email, **`checkout_session_id`**, **`event_id`**, payment intent, customer id, Stripe event id.

### Escalation

| Observation | Action |
|-------------|--------|
| **count increased** | Open **repair / investigation gate**（existing repair scripts require separate Human GO） |
| **user reports paid-but-locked** | Cross-check **`failed_fulfillments`** + Stripe Dashboard + DTR owned unlock SSOT |
| **Do not** | Manually mutate entitlements / wallets / snapshots without **gated repair plan** |

### Stripe cross-check（manual）

- Stripe Dashboard → Payments / Checkout — confirm **paid** events exist when users report issues  
- **Do not** record full session IDs in SSOT  

---

## G. Future minimal automated notification design（planning only）

### Trigger sources（priority order）

| Priority | Trigger |
|----------|---------|
| **1** | **`failed_fulfillments` INSERT**（webhook path already writes rows） |
| **2** | Structured **server error** catch on fulfillment routes（snapshot skip gap） |
| **3** | Threshold: **count last 1h > 0**（scheduled poll job — Category 2） |

### Payload rules（redacted）

| Include | Exclude |
|---------|---------|
| **timestamp**（UTC safe label） | raw **user_id** |
| **safe route label**（e.g. `webhook/one_time`） | email |
| **safe error category**（e.g. `product_mismatch`） | **checkout_session_id** |
| **product lane**（e.g. `DTR_CORE_STATIC_V1`） | payment intent |
| **environment safe label**（`production`） | customer id |
| **incident count** / **reason histogram** | Stripe **event_id** |
| | secrets / webhook payloads |

**Env/secrets:** Only in **AS-B3 / AS-B4**（Category 2 implementation）— **not AS-B**.

---

## H. Severity and response policy

| Severity | Definition | Response target | Manual action | Stop condition |
|----------|------------|-----------------|---------------|----------------|
| **SEV-1** | Payment succeeded but entitlement / report not unlocked | **< 4h**（business hours） | Poll **`failed_fulfillments`**；Vercel logs；open repair gate | User unlocked or repair recorded |
| **SEV-2** | Webhook / fulfillment failed；no user report yet | **< 24h** | Review reason breakdown；Stripe retry if applicable | Backlog stable / root cause documented |
| **SEV-3** | Reply / consult generation failed after ticket use | **< 48h** | Logs；wallet ledger probe | User compensated per policy gate |
| **SEV-4** | Non-payment UI / log-only | **best effort** | Log review | Track in backlog |

---

## I. Implementation gate split（not executed in AS-B）

| Gate | Purpose |
|------|---------|
| **`5Z-I-V-AS-B1`** | Manual polling runbook **execution** planning + Human attestation template |
| **`5Z-I-V-AS-B2`** | Automated notification **channel selection**（Human choice） |
| **`5Z-I-V-AS-B3`** | Notification **implementation planning**（redacted payload schema） |
| **`5Z-I-V-AS-B4`** | Notification **implementation execution**（Category 2 GO） |
| **`5Z-I-V-AS-B5`** | Notification **smoke test**（synthetic failure — non-production preferred） |

---

## J. Acceptance criteria for future implementation

Future **AS-B4 / AS-B5** must prove:

| # | Criterion |
|---|-----------|
| 1 | Test failure produces **one** notification |
| 2 | Payload contains **no** raw IDs / secrets |
| 3 | **No** duplicate spam loop / infinite retry |
| 4 | **No** checkout / payment side effects from notifier |
| 5 | DB writes limited to **intended logging** only |
| 6 | Manual investigation path documented |
| 7 | **Disable / rollback** switch exists（env flag or route off） |

---

## K. Current decision

| Statement | Value |
|-----------|--------|
| **Minimal error notification planning** | **GREEN** |
| **Immediate no-code guardrail** | **Manual `failed_fulfillments` polling**（§F） |
| **First automation** | After **AS-B2** channel choice |
| **AX-PROD** | **blocked** |
| **AL** | **unauthorized** |
| **Auth compliance** | **RED** under **AS** exception |

---

## L. No-mutation statement

- **No** Production DB connection in AS-B session
- **No** Production apply / write
- **No** SQL execution in AS-B session
- **No** backup execution
- **No** code change
- **No** env / secrets change
- **No** notification integration / webhook creation
- **No** table / mapping row creation
- **No** resolver implementation
- **No** raw key / secret / fragment recorded
- **No** full **user_id** / email / session recorded
- **No** Stripe IDs recorded
- **No** Clerk / Vercel / redeploy
- **No** auth / user migration
- **No** checkout / payment
- **No** **AL / AL-PRE**
- **No** full normal dev flow release

---

## M. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **AI prompt safety** | **`5Z-I-V-AS-C`** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Stripe / webhook / payment** | **separate** |
| **Full normal dev flow** | **NOT released** |

---

## N. Next phase

| Priority | Gate | When |
|----------|------|------|
| **Recommended default** | **`5Z-I-V-AS-C`** | Launch-facing AI safety copy / prompt risk |
| **Alternative** | **`5Z-I-V-AS-B1`** | Paid traffic / payment retry **imminent** — operational lane first |

**Human priority rule:** If **paid traffic is imminent** → **AS-B1** first. Else → **AS-C** first.

---

## Files reviewed（read-only）

| Path |
|------|
| `app/api/stripe/webhook/route.ts` |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` |
| `lib/m55/reply/replyTicketWebhookLane.ts` |
| `app/api/reply-tickets/checkout/route.ts` |
| `app/api/room/core/send/route.ts` |
| `app/api/room/core/route.ts` |
| `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` |
| `scripts/sql/production/m55_phase5_4_production_ghost_data_readonly_check_v1.sql` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_A_*.md` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AP_S_R_*.md` |
| `docs/CHECKPOINT_ROOT_20260315_v2.md`（`failed_fulfillments` queue role） |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-B-MINIMAL-ERROR-NOTIFICATION-PLAN-001`** | **本条** |
