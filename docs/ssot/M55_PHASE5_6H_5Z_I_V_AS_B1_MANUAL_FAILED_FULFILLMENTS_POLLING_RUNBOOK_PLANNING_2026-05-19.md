# Phase 5-6H-5Z-I-V-AS-B1 — Manual failed_fulfillments polling runbook planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B1** |
| **Title** | **Manual failed_fulfillments polling runbook planning** |
| **Classification** | **Category 1 / manual operations runbook planning / docs-only / no-mutation** |
| **Verdict** | **`MANUAL_FAILED_FULFILLMENTS_POLLING_RUNBOOK_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-B1-MANUAL-FAILED-FULFILLMENTS-POLLING-RUNBOOK-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**AS-B1 defines the runbook only.** No polling executed, no Production DB connection, no SQL execution in this gate.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B** | **`MINIMAL_ERROR_NOTIFICATION_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-B-MINIMAL-ERROR-NOTIFICATION-PLAN-001`** | **`ff61f7f`** |
| **AS-D** | **`RELEASE_READINESS_CHECKLIST_CONSOLIDATION_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-D-RELEASE-READINESS-CHECKLIST-CONSOLIDATION-001`** | **`89d35b4`** |

| AS-D recommendation | **`5Z-I-V-AS-B1`** as default next gate（operational priority） |

---

## C. Why this gate exists

| Driver | Detail |
|--------|--------|
| **No automated notification yet** | **AS-B2–B5** not implemented |
| **Immediate guardrail** | Manual **`failed_fulfillments`** polling is **Release Day Must-Have**（**AS-A**） |
| **High-risk mode** | Payment succeeded but entitlement / report not unlocked |
| **Paid traffic** | Polling required before expansion unless automation ships first |
| **AS-B1 scope** | Runbook + templates + Human result form — **not execution** |

---

## D. Polling cadence

| Situation | Cadence |
|-----------|---------|
| **Release Day / paid test day** | Check **before** test, **immediately after** test, **end of day** |
| **Normal low-traffic** | **Daily** |
| **After any Stripe / webhook / payment test** | Within **15 minutes** and again within **24h** |
| **After user support report** | **Immediate** |
| **Paid traffic expands** | Increase cadence **or** implement **AS-B2/B3** automated notification |

### Target confirmation（Human before each poll）

| Check | Required |
|-------|----------|
| **Dashboard project** | **`m55-soul-core`** — **not** **`m55-soul-shadow`** |
| **Environment label** | **Production** |
| **Query type** | **Counts-only** — no row export to chat/SSOT |

---

## E. Counts-only SQL templates（future Human execution — **not run in AS-B1**）

**Schema reference（repo migration `20260308000000_one_time_checkout_fulfillment.sql`）:**

| Column | Present |
|--------|---------|
| **`failure_reason`** | **yes** |
| **`created_at`** | **yes** |
| **`event_id` / `checkout_session_id`** | exist — **do not paste values into SSOT** |

### Query 1 — Total count

```sql
SELECT count(*)::bigint AS failed_fulfillments_total
FROM public.failed_fulfillments;
```

### Query 2 — Last 24 hours

```sql
SELECT count(*)::bigint AS failed_fulfillments_24h
FROM public.failed_fulfillments
WHERE created_at >= now() - interval '24 hours';
```

### Query 3 — Failure reason summary（counts only）

```sql
SELECT failure_reason AS safe_failure_category,
       count(*)::bigint AS c
FROM public.failed_fulfillments
GROUP BY failure_reason
ORDER BY c DESC;
```

### Query 4 — Optional: 7-day trend（counts only）

```sql
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
       count(*)::bigint AS c
FROM public.failed_fulfillments
WHERE created_at >= now() - interval '7 days'
GROUP BY 1
ORDER BY 1 DESC;
```

### If schema differs

| Outcome | Action |
|---------|--------|
| **table_missing** | Record in **AS-B1-R**；do not create table |
| **column_missing** | Use available columns only；record **column_missing** |
| **unclear** | **BLOCKED** in **AS-B1-R** |

**Never:** `SELECT *`；never paste **`event_id`**, **`checkout_session_id`**, or **`raw_metadata`** into SSOT.

---

## F. Human polling result template（for **`5Z-I-V-AS-B1-R`**）

```
5Z-I-V-AS-B1-R Manual failed_fulfillments polling result

Raw ID / email / session / Stripe ID / secret:
- shared: no

Target:
- environment safe label: m55-soul-core / Production
- Production used: yes / no
- query type: counts-only

Counts:
- failed_fulfillments_total:
- failed_fulfillments_24h:
- safe failure category summary:
  none / counts-only summary (e.g. product_mismatch: 2; payment_status_not_paid: 1)

User-facing incident detected:
- yes / no / unclear

SEV classification:
- none / SEV-1 / SEV-2 / SEV-3 / SEV-4

Manual mutation performed:
- no

Next action:
- no action / open diagnostic gate / open repair planning gate / support response planning
```

---

## G. Severity classification

| SEV | Definition | Target response | Action |
|-----|------------|-----------------|--------|
| **SEV-1** | Payment succeeded but DTR entitlement / report **not unlocked** | **< 4h**（business hours） | **Stop** — open repair diagnostic / planning gate |
| **SEV-2** | Webhook / fulfillment failed；**no user report yet** | **< 24h** | Inspect safe logs；open diagnostic gate |
| **SEV-3** | Reply / consult generation failed after ticket use | **< 48h** | Open reply/consult diagnostic gate |
| **SEV-4** | Non-payment UI / log-only | **best effort** | Record；triage later |

### Mapping hints（`failure_reason` values from webhook — safe labels only）

| `failure_reason`（examples） | Typical SEV |
|------------------------------|-------------|
| **`payment_status_not_paid`** | **SEV-2** |
| **`product_mismatch`** | **SEV-2** |
| **`missing_client_reference_id`** | **SEV-2** |
| **Fulfillment internal failure**（log + row） | **SEV-1** if user paid and locked |

---

## H. Manual recovery boundary

| Rule | Policy |
|------|--------|
| **Polling detects only** | Does **not** authorize repair |
| **No manual entitlement grant** | |
| **No wallet / snapshot mutation** | |
| **No webhook replay** | |
| **No refund** | |
| **No DB write** | |
| **Repair** | Separate dedicated gate + explicit Human GO（e.g. repair script gates） |

---

## I. Escalation gates

| # | Gate | Purpose |
|---|------|---------|
| **1** | **`5Z-I-V-AS-B1-R`** | Human **counts-only** result recording |
| **2** | **`5Z-I-V-AS-B1-D`** | Failed fulfillment **diagnostic planning** |
| **3** | **`5Z-I-V-AS-B1-REPAIR`** | Manual repair **planning** if needed |
| **4** | **`5Z-I-V-AS-B2`** | Automated notification **channel selection** |
| **5** | **`5Z-I-V-AS-B3`** | Notification **implementation planning** |

---

## J. Acceptance criteria for future AS-B1-R

### GREEN

| Criterion |
|-----------|
| **Counts-only** result provided |
| **No** raw IDs / secrets in SSOT |
| **No** manual mutation performed |
| **SEV** classified |
| **Next action** determined |
| **Target** confirmed **`m55-soul-core`** |

### BLOCKED

| Criterion |
|-----------|
| Target **unclear** |
| Query cannot run safely |
| Schema **unclear** |
| Counts **unavailable** |

### RED

| Criterion |
|-----------|
| **SEV-1** or severe support-impacting issue **detected** |

---

## K. Current decision

| Statement | Value |
|-----------|--------|
| **Manual polling runbook planning** | **GREEN** |
| **Polling executed in AS-B1** | **no** |
| **Next operational step** | **`5Z-I-V-AS-B1-R`** when Human runs counts-only polling |
| **Automated notification** | **Later**（**AS-B2+**） |
| **AX-PROD** | **blocked** |
| **AL** | **unauthorized** |
| **Auth compliance** | **RED** under **AS** exception |

---

## L. No-mutation statement

- **No** Production DB connection in AS-B1
- **No** Production SQL execution
- **No** Production DB write
- **No** backup execution
- **No** code change
- **No** env / secrets change
- **No** notification integration
- **No** webhook creation
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
| **AI prompt safety** | **AS-C1** later |
| **Automated notification** | **AS-B2/B3** later |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Stripe / webhook / payment** | **separate** |
| **Full normal dev flow** | **NOT released** |

---

## N. Next phase

| Priority | Gate |
|----------|------|
| **Recommended** | **`5Z-I-V-AS-B1-R`** — when Human runs counts-only polling |
| **Alternative** | **`5Z-I-V-AS-C1`** — AI prompt safety implementation planning |

**Default:** If **paid test** or **paid traffic** is imminent → **AS-B1-R** next. Otherwise **AS-C1** planning is acceptable.

---

## Repo touchpoints（read-only — failure sources）

| Path | Role |
|------|------|
| `app/api/stripe/webhook/route.ts` | **`insertFailedFulfillment()`**；reasons；500 on hard failures |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | DTR fulfillment；snapshot skip logs |
| `lib/m55/reply/replyTicketWebhookLane.ts` | Reply lane fulfillment outcomes |
| `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` | Repair guard on `failed_fulfillments_for_session` |
| `supabase/migrations/20260308000000_one_time_checkout_fulfillment.sql` | Table DDL |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-B1-MANUAL-FAILED-FULFILLMENTS-POLLING-RUNBOOK-PLAN-001`** | **本条** |
