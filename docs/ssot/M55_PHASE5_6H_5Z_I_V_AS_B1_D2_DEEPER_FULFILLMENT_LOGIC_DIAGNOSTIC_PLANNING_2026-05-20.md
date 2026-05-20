# Phase 5-6H-5Z-I-V-AS-B1-D2 — Deeper read-only fulfillment logic diagnostic planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B1-D2** |
| **Title** | **Deeper fulfillment logic diagnostic planning** |
| **Classification** | **Category 1 / deeper fulfillment logic diagnostic planning / docs-only / no-mutation** |
| **Verdict** | **`DEEPER_FULFILLMENT_LOGIC_DIAGNOSTIC_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-B1-D2-DEEPER-FULFILLMENT-LOGIC-DIAGNOSTIC-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Production DB target label** | **`m55-soul-core`** |

**Agent performed repo read-only logic review only.** No SQL execution. No Production mutation.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B1-D-R** | **`FAILED_FULFILLMENT_DIAGNOSTIC_RESULT_GREEN_DEEPER_READONLY_DIAGNOSTIC_REQUIRED_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-B1-D-R-FAILED-FULFILLMENT-COUNTS-ONLY-DIAGNOSTIC-RESULT-001`** | **`71d61f4`** |
| **AS-B1-D** | **`FAILED_FULFILLMENT_DIAGNOSTIC_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-B1-D-FAILED-FULFILLMENT-DIAGNOSTIC-PLAN-001`** | **`79136ef`** |
| **AS-B1-R** | **`MANUAL_FAILED_FULFILLMENTS_POLLING_RESULT_GREEN_HISTORICAL_FAILURES_DIAGNOSTIC_REQUIRED_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-B1-R-MANUAL-FAILED-FULFILLMENTS-POLLING-RESULT-001`** | **`ea6d4f4`** |

### Baseline（AS-B1-D-R — unchanged）

| Metric | Value |
|--------|--------|
| **Historical SEV** | **SEV-2** |
| **Active bleeding** | **no**（`failed_fulfillments_24h = 0`） |
| **`failed_fulfillments_total`** | **7** |
| **`internal_processing_failed`** | **6** |
| **`missing_client_reference_id`** | **1** |
| **Latest failure day** | **2026-05-03** |
| **`one_time_fulfillments_total`** | **10** |
| **`DTR_CORE_STATIC_V1 entitlements_total`** | **10** |
| **Current paid-not-unlocked** | **not confirmed** |
| **Support open** | **no** |
| **Manual mutation** | **no** |

**Deeper read-only diagnostic required** for **`internal_processing_failed` (6)** — this gate supplies the planning map; execution is **`AS-B1-D2-R`**.

---

## C. Diagnostic hypotheses

Each hypothesis is **read-only / counts-only testable** unless noted. None authorize repair in AS-B1-D2.

### H1. Stripe session retrieval failure (`retrieve_failed`)

| Source | `lib/m55/dtrCoreCheckoutFulfillment.ts` — `getStripe()` or `stripe.checkout.sessions.retrieve` throws |
|--------|----------------------------------------------------------------------------------------------------------|
| **Webhook mapping** | `handleCheckoutCompletedOneTime` → `internal_processing_failed` with `raw_metadata.reason = retrieve_failed` |
| **HTTP** | **500**（Stripe retry-eligible） |
| **Likelihood vs 6 rows** | **Medium** — transient API / env misconfig at webhook time |
| **D2-R test** | Safe sub-reason count on `internal_processing_failed` rows（§E.1） |

### H2. Supabase `db_error` during entitlement / right / fulfillment write

| Source | `one_time_fulfillments.insert`（non-23505）；`entitlements.upsert`；`entitlement_rights.upsert`；outer `catch` |
|--------|----------------------------------------------------------------------------------------------------------------|
| **Webhook mapping** | `internal_processing_failed` with `reason = db_error` |
| **User impact** | **Possible** paid session where Stripe shows paid but DB rows incomplete |
| **Likelihood** | **High** for historical cluster — matches bulk of **`internal_processing_failed`** |
| **D2-R test** | Sub-reason `db_error` count；day-aligned `one_time_fulfillments` vs `failed_fulfillments`（§E.2–E.3） |

### H3. `dtr_report_snapshots` creation failure

| Source | `upsertDtrReportSnapshotAtFulfillment` in `lib/m55/dtrDraftDb.ts` |
|--------|---------------------------------------------------------------------|
| **Critical repo fact** | Snapshot failure is **non-fatal** — `fulfillDtrCoreFromCheckoutSessionId` still returns **`{ ok: true }`** after logging skip |
| **Implication** | **Unlikely** to be the **direct** cause of `failed_fulfillments.internal_processing_failed` rows |
| **Still diagnose** | Day-bucket snapshot counts may explain **unlock UX gaps** on success path without failed row |
| **Related migrations** | `20260420000000` / `20260421000000` / `20260422000000` — PostgREST / schema cache（PGRST205 hints in code） |
| **D2-R test** | `dtr_report_snapshots` day counts vs fulfillment days（§E.5） |

### H4. Missing or malformed `client_reference_id`

| Source | `handleCheckoutCompleted` when `session.client_reference_id` is null → `missing_client_reference_id` |
|--------|------------------------------------------------------------------------------------------------------|
| **Current data** | **1** row — Human: **historical only** |
| **Lane** | Recorded **before** one-time fulfillment delegate；HTTP **200**（no Stripe retry pressure） |
| **D2-R test** | Re-confirm count **≤ 1** and no 24h rows |

### H5. Duplicate / idempotency / `one_time_fulfillments` conflict

| Source | `one_time_fulfillments.checkout_session_id` PRIMARY KEY；insert `23505` continues to upserts |
|--------|----------------------------------------------------------------------------------------------|
| **stripe_events** | Inserted **after** handler returns **200** only — **500 path leaves event unmarked** → Stripe retries same `event.id` |
| **failed_fulfillments** | **No unique** on `checkout_session_id` — retries may add **additional** failure rows with **same session**, different `event_id` |
| **Likelihood** | **Medium** — inflates historical failure count without 7 distinct paid users |
| **D2-R test** | Count `failed_fulfillments` vs distinct `checkout_session_id`（aggregate only — no ID export） |

### H6. Schema / cache mismatch from historical migration period

| Source | Failure days **2026-03-14**, **2026-03-15**, **2026-04-17**, **2026-05-03** overlap DTR snapshot migration window |
|--------|------------------------------------------------------------------------------------------------------------------------|
| **Symptoms in code** | `db_error`；log hints for PGRST205 / schema cache on snapshot path |
| **Likelihood** | **Medium–high** for March cluster |
| **D2-R test** | Day-bucket alignment table（§E.6）；yes/no: any failure after **2026-05-03** on re-poll |

### H7. Test/live or environment mismatch

| Source | Human: **unclear**；reply lane logs `livemode` diagnostically；DTR one-time lane does not persist mode on `failed_fulfillments` |
|--------|--------------------------------------------------------------------------------------------------------------------------------|
| **Likelihood** | **Low–medium** for `internal_processing_failed` if `client_reference_id` was present |
| **D2-R test** | Yes/no from safe Vercel log category only（no keys in SSOT） |

### H8. Webhook timing / retry sequence issue

| Source | `internal_processing_failed` → HTTP **500**；Stripe retries；`fulfillDtrCore` may succeed on later attempt while earlier attempt logged failure |
|--------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Reconciles** | **10** fulfillments vs **6** internal failures — not all failures imply permanent unpaid-unlock |
| **D2-R test** | Compare failed day buckets vs `one_time_fulfillments` day buckets（§E.3） |

### H9. Historical code version before current fixes

| Source | Snapshot non-fatal behavior + metadata-first profile in current `dtrDraftDb.ts` may post-date March failures |
|--------|----------------------------------------------------------------------------------------------------------------|
| **Latest failure** | **2026-05-03** — one row **after** major migration tranche |
| **D2-R test** | Confirm **2026-05-03** failure sub-reason category；yes/no: deploy/fix gate after that date |

### Hypothesis priority for D2-R Human pass

| Priority | Hypothesis | Rationale |
|----------|------------|-----------|
| **P1** | **H2** `db_error` | Dominant mapped reason for `internal_processing_failed` |
| **P2** | **H5 + H8** idempotency / retry | Explains count inflation vs true user impact |
| **P3** | **H6** schema/migration era | Aligns with March–April day buckets |
| **P4** | **H1** `retrieve_failed` | Quick sub-reason split |
| **P5** | **H3** snapshot | Secondary UX — not primary failed row driver |

---

## D. Repo logic map

### D.1 Ingress: `checkout.session.completed`

```
Stripe POST → signature verify
  → stripe_events dedupe (select by event_id)
  → if duplicate: 200 early (reply diagnostic logs only)
  → route: invoice.paid | checkout.session.completed | charge.refunded
  → on 200: insert stripe_events (event_id, event_type)
  → on 500 (ONE_TIME_KEY_EVENTS): stripe_events NOT inserted → Stripe retry
```

| Step | File / symbol | Table / artifact |
|------|---------------|------------------|
| Dedupe read | `app/api/stripe/webhook/route.ts` POST | `stripe_events` |
| Checkout router | `handleCheckoutCompleted` | — |
| Missing user binding | `!client_reference_id` | `failed_fulfillments` **`missing_client_reference_id`** → **200** |
| Subscription branch | `session.subscription` set | `entitlements` upsert |
| Reply ticket branch | metadata `product_key` = additional_reply_ticket | `lib/m55/reply/replyTicketWebhookLane.ts`（separate lane） |
| Product guard | `ALLOWED_ONE_TIME_PRODUCTS` | `failed_fulfillments` **`product_mismatch`** → **200** |
| DTR one-time | `handleCheckoutCompletedOneTime` | see D.2 |

### D.2 DTR core one-time fulfillment delegate

| Step | `fulfillDtrCoreFromCheckoutSessionId` | On failure → webhook |
|------|--------------------------------------|----------------------|
| Stripe retrieve session | `retrieve_failed` | `internal_processing_failed` **500** |
| `user_mismatch` / `not_payment` / `product_not_allowed` | mapped | `fulfill_*` **200** |
| `payment_not_paid` | — | `payment_status_not_paid` **200** |
| Insert `one_time_fulfillments` | `db_error` if not 23505 | `internal_processing_failed` **500** |
| Upsert `entitlements` | `db_error` | **500** |
| Upsert `entitlement_rights` (`m55_p:core_origin`) | `db_error` | **500** |
| `grantInitialIncludedReplyIfNeeded` | **throws** → caught as `db_error` | **500** |
| `upsertDtrReportSnapshotAtFulfillment` | **non-fatal** log only | fulfillment may still **ok** |
| Link `reply_ticket_wallets.report_instance_id` | log only on error | non-fatal |

**Tables touched on success path:** `one_time_fulfillments` → `entitlements` → `entitlement_rights` → `reply_ticket_wallets` / `reply_wallet_ledgers` → `dtr_report_snapshots`（best-effort）

### D.3 `failed_fulfillments` insert path

| Function | `insertFailedFulfillment` |
|----------|----------------------------|
| Columns | `event_id`, `checkout_session_id`, `failure_reason`, `raw_metadata` |
| **Forbidden in SSOT** | Paste of `raw_metadata`, session IDs, user IDs |
| Safe planning use | Aggregate `raw_metadata->>'reason'` for **`internal_processing_failed`** only（§E.1） |

### D.4 Refund / revoke lane（out of current 7）

| Event | `charge.refunded` → revoke `entitlements` + delete `entitlement_rights` |
|-------|------------------------------------------------------------------------|
| Failure | `revoke_failed` → `failed_fulfillments` |

### D.5 Repair runner guard（not authorized）

| Path | `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` |
|------|-----------------------------------------------------------------------|
| Gate requirement | Explicit SSOT GO（5Z-I-P class）；`M55_REPAIR_DRY_RUN` / confirm phrase |
| **AS-B1-D2** | **Does not authorize** execution |

### D.6 Schema reference

| Migration | Role |
|-----------|------|
| `20260308000000_one_time_checkout_fulfillment.sql` | `one_time_fulfillments`, `failed_fulfillments` |
| `20260420000000_dtr_drafts_and_report_snapshots.sql` | `dtr_guest_drafts`, `dtr_report_snapshots` |
| `20260421000000_dtr_postgrest_schema_reload.sql` | PostgREST reload |
| `20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql` | column fixes |

---

## E. Future Human read-only diagnostic plan（AS-B1-D2-R）

**Target:** **`m55-soul-core`** only.** **No `SELECT *`.** **No raw row paste.** **No IDs in SSOT.**

### E.1 Sub-reason split（`internal_processing_failed` only）

```sql
SELECT COALESCE(raw_metadata->>'reason', 'unknown_sub_reason') AS safe_sub_reason,
       count(*)::bigint AS c
FROM public.failed_fulfillments
WHERE failure_reason = 'internal_processing_failed'
GROUP BY 1
ORDER BY 2 DESC;
```

**Expected safe labels:** `db_error`, `retrieve_failed`, `unknown_sub_reason` — **do not** export `detail` text to chat/SSOT.

### E.2 Failed vs session cardinality（retry inflation check)

```sql
SELECT count(*)::bigint AS failed_internal_rows,
       count(DISTINCT checkout_session_id)::bigint AS distinct_checkout_sessions
FROM public.failed_fulfillments
WHERE failure_reason = 'internal_processing_failed';
```

### E.3 Day-bucket alignment（failed vs fulfilled vs entitlements）

```sql
-- failed (all reasons)
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
       failure_reason,
       count(*)::bigint AS c
FROM public.failed_fulfillments
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- one_time_fulfillments
SELECT date_trunc('day', fulfilled_at AT TIME ZONE 'UTC')::date AS day_utc,
       count(*)::bigint AS c
FROM public.one_time_fulfillments
GROUP BY 1
ORDER BY 1 DESC;

-- entitlements DTR core (adjust product filter to safe label used in ops notes)
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
       count(*)::bigint AS c
FROM public.entitlements
WHERE product_id = 'DTR_CORE_STATIC_V1'
GROUP BY 1
ORDER BY 1 DESC;
```

### E.4 Re-poll safety（AS-B1)

```sql
SELECT count(*)::bigint AS failed_total,
       count(*) FILTER (WHERE created_at > now() - interval '24 hours')::bigint AS failed_24h
FROM public.failed_fulfillments;
```

### E.5 Snapshot / wallet day counts（UX gap — not failure driver)

```sql
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
       count(*)::bigint AS c
FROM public.dtr_report_snapshots
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;

SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
       count(*)::bigint AS c
FROM public.reply_wallet_ledgers
WHERE event_type = 'included_grant'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;
```

### E.6 Migration-era yes/no questions（Human — no PII）

| # | Question | Answer format |
|---|----------|---------------|
| **Q1** | Does **H2** `db_error` sub-reason account for **majority** of 6 `internal_processing_failed` rows? | yes/no + counts |
| **Q2** | Is `distinct_checkout_sessions` **< 6**?（retry inflation） | yes/no + two integers |
| **Q3** | Do failed day buckets **overlap** fulfilled day buckets on same UTC days? | yes/no |
| **Q4** | Any `failed_fulfillments` row with `created_at` **after 2026-05-03**? | yes/no + count |
| **Q5** | `dtr_report_snapshots` total **≥** `one_time_fulfillments`? | yes/no + counts |
| **Q6** | Safe Vercel logs show **PGRST205** / **schema cache** on failure dates? | category yes/no only |
| **Q7** | Current paid-not-unlocked still **not** confirmed? | yes/no |
| **Q8** | Support ticket still **closed**? | yes/no |

### E.7 Product/lane label（if metadata key exists — aggregate only)

```sql
SELECT COALESCE(raw_metadata->>'productId', 'no_product_key') AS safe_product_label,
       count(*)::bigint AS c
FROM public.failed_fulfillments
GROUP BY 1
ORDER BY 2 DESC;
```

**Note:** Reply-ticket lane failures use different handlers — current **7** are DTR one-time / binding class per AS-B1-R.

---

## F. Stop conditions

| Condition | Action |
|-----------|--------|
| **`failed_fulfillments_24h > 0`** | **Stop** — escalate **SEV-1** triage；**AS-B1-REPAIR** planning |
| **Current paid-not-unlocked user confirmed** | **Stop** Category 1 — dedicated repair gate + Human GO |
| **Support report opens** | **Stop** — support-safe channel |
| **Raw IDs required in SSOT** | **Stop** — offline secure channel |
| **Repair / webhook replay / DB write requested** | **Stop** — Category 2 + explicit GO |
| **Diagnostic cannot remain counts-only** | **Stop** — do not widen to row export |

---

## G. Decision boundary

| Action | AS-B1-D2 authorization |
|--------|-------------------------|
| **Active repair** | **no** |
| **Webhook replay / Stripe resend** | **no** |
| **Refund / checkout retry / live payment** | **no** |
| **Entitlement / wallet / snapshot mutation** | **no** |
| **Repair runner execution** | **no** |
| **AS-B1-REPAIR** | **not authorized** by this gate |

| Posture | **Diagnostic planning only** — historical **`internal_processing_failed` (6)** needs **AS-B1-D2-R** evidence before any repair planning |

---

## H. Next phase

| Recommended | **`5Z-I-V-AS-B1-D2-R`** — Human deeper counts-only diagnostic **result** recording |
|-------------|-------------------------------------------------------------------------------------|
| **Scope** | Execute **§E** queries + answer **§E.6** yes/no |
| **Verdict target** | GREEN if sub-reasons classified without active bleed |

| Alternative | **`AS-B1-REPAIR`** — only if **paid-not-unlocked confirmed** + explicit Human GO + user-impact documented |

| If **24h > 0** | **AS-B1-R** re-poll first |

| Parallel | **AS-C5-A** / **AS-C6** if Human deprioritizes fulfillment chain |

---

## I. No-mutation statement

- **No** Production DB write
- **No** repair execution / repair runner
- **No** webhook replay / Stripe event resend
- **No** checkout retry / live payment / refund
- **No** entitlement / snapshot / wallet mutation
- **No** raw `user_id` / email / session / Stripe ID / secret in SSOT
- **No** deploy / redeploy / env change
- **No** Clerk / auth change
- **No** AX-PROD / AL / AL-PRE / full normal dev flow release

---

## Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed**（current production path） |
| **AC-P6 unpaid** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** exception |
| **AX-PROD** | **BLOCKED** |
| **Automated notification** | **AS-B2/B3** |
| **Full normal dev flow** | **NOT released** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-B1-D2-DEEPER-FULFILLMENT-LOGIC-DIAGNOSTIC-PLAN-001`** | **本条** |

---

## Repo files reviewed（read-only）

| Path | Role |
|------|------|
| `app/api/stripe/webhook/route.ts` | Webhook ingress, dedupe, failed_fulfillments, one-time lane |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | DTR fulfillment pipeline |
| `lib/m55/dtrDraftDb.ts` | `dtr_report_snapshots` upsert（non-fatal on failure） |
| `lib/m55/reply/walletGrants.ts` | `reply_ticket_wallets` / `reply_wallet_ledgers` grant |
| `lib/m55/reply/replyTicketWebhookLane.ts` | Reply ticket lane（separate from current 7） |
| `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` | Repair runner — blocked |
| `supabase/migrations/20260308000000_one_time_checkout_fulfillment.sql` | Core tables |
| `supabase/migrations/20260420000000_dtr_drafts_and_report_snapshots.sql` | Snapshot schema |
| `supabase/migrations/20260421000000_dtr_postgrest_schema_reload.sql` | PostgREST reload |
| `supabase/migrations/20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql` | Column fixes |
