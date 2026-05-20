# Phase 5-6H-5Z-I-V-AS-B1-D3 — Historical artifact consistency / repair eligibility diagnostic planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B1-D3** |
| **Title** | **Historical artifact consistency / repair eligibility diagnostic planning** |
| **Classification** | **Category 1 / historical artifact consistency and repair eligibility diagnostic planning / docs-only / no-mutation** |
| **Verdict** | **`HISTORICAL_ARTIFACT_CONSISTENCY_REPAIR_ELIGIBILITY_DIAGNOSTIC_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-B1-D3-HISTORICAL-ARTIFACT-CONSISTENCY-REPAIR-ELIGIBILITY-DIAGNOSTIC-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Production DB target label** | **`m55-soul-core`** |

**Agent performed repo read-only logic review only.** No SQL execution. No Production mutation.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B1-D2-R** | **`DEEPER_FULFILLMENT_LOGIC_DIAGNOSTIC_RESULT_GREEN_HISTORICAL_ARTIFACT_CONSISTENCY_DIAGNOSTIC_REQUIRED_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-B1-D2-R-DEEPER-FULFILLMENT-LOGIC-COUNTS-ONLY-DIAGNOSTIC-RESULT-001`** | **`f602178`** |
| **AS-B1-D2** | **`DEEPER_FULFILLMENT_LOGIC_DIAGNOSTIC_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-B1-D2-DEEPER-FULFILLMENT-LOGIC-DIAGNOSTIC-PLAN-001`** | **`2db5265`** |

### Prior decisions（unchanged）

| Item | Value |
|------|--------|
| **Human repair planning request** | **Rejected** in **AS-B1-D2-R** — repair not authorized |
| **Recorded next gate** | **`5Z-I-V-AS-B1-D3`**（this gate） |
| **Active bleeding** | **no**（`failed_fulfillments_24h = 0`） |
| **Active user impact** | **not confirmed** |

### Known aggregate baseline（D2-R）

| Artifact | Total |
|----------|-------|
| **`failed_fulfillments`** | **7**（**6** `internal_processing_failed` + **1** `missing_client_reference_id`） |
| **`one_time_fulfillments`** | **10** |
| **`entitlements` (DTR_CORE_STATIC_V1)** | **10** |
| **`dtr_report_snapshots`** | **6** |
| **`reply_ticket_wallets`** | **10** |
| **`reply_wallet_ledgers`** | **unclear** |

---

## C. Why this gate exists

| Observation | Implication |
|-------------|-------------|
| **`failed_fulfillments` are historical** | Latest failure day **2026-05-03**；**24h = 0** — not an active payment-unlock bleed |
| **Active current user impact not confirmed** | No paid-not-unlocked；no support open |
| **Fulfillments / entitlements = 10 / 10** | Payment-backed unlock SSOT rows exist for the fulfilled cohort |
| **Snapshots = 6** | **4 fewer** than fulfillments — aggregate gap only |
| **Wallets = 10** | Reply lane artifacts align with fulfillment count |
| **Repair eligibility cannot be inferred from totals alone** | A paid owner may be **`owned`** without a snapshot row per repo（§D repo map） |
| **Need read-only plan** | Determine whether any **user-visible** artifact gap exists **before** repair is even considered |

**Core question for D3-R:** Of the **4** snapshot deficit vs **10** fulfillments, how many represent **current** owners who cannot open **`/dtr/core`** saved report (or lack included reply wallet), vs historical/test/migration noise?

---

## D. Artifact consistency questions（future Human — counts-only / yes-no）

Answer with **aggregates or yes/no only**. **No raw IDs.** **No row output.** **No `SELECT *`.**

| # | Question | Purpose |
|---|----------|---------|
| **Q1** | Are **all** current paid owners able to open DTR saved report at **`/dtr/core`**?（yes/no — if no, **count only**, not IDs） | User-visible report gap |
| **Q2** | How many **active DTR entitlements** lack a matching **`dtr_report_snapshots`** row?（integer count only） | Snapshot gap scope |
| **Q3** | How many **entitlement / fulfillment owners** lack **`reply_ticket_wallets`**?（integer count only） | Wallet gap |
| **Q4** | Are **`reply_wallet_ledgers`** consistent with wallet grants?（yes/no + aggregate counts only） | Ledger integrity |
| **Q5** | Do **`failed_fulfillments`** rows overlap sessions that also appear in **`one_time_fulfillments`**?（count of overlapping sessions only — no session IDs in SSOT） | Retry-recovered vs permanent failure |
| **Q6** | Are the **4** missing snapshots **current user-visible gaps** or **historical/test/migration** artifacts?（yes/no + count split if Human can bucket safely） | Repair necessity |
| **Q7** | Are failed rows from **test / live / stale environment** eras?（live/test aggregate counts only if available） | Noise vs production |
| **Q8** | Is any **support-visible issue** currently open?（yes/no — no PII） | Corroboration |

### Repo map — user-visible paths（read-only）

| Path | Behavior relevant to Q1–Q6 |
|------|----------------------------|
| **`lib/m55/dtrOwnershipGate.ts`** | **`owned`** without snapshot if **`entitlement_rights` + payment backing**（`entitlements` active or `one_time_fulfillments`） |
| **`lib/m55/dtrShelfAccess.ts`** | **`owned_snapshot_not_ready`** → CTA **`/dtr/processing?recovery=owned`**（not purchase） |
| **`app/dtr/core/page.tsx`** | **`owned` + no snapshot** → redirect recovery processing；**not** LP locked |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts`** | Snapshot upsert **non-fatal** on fulfillment — explains snapshot deficit with successful entitlements |
| **`lib/m55/dtrDraftDb.ts`** | `getDtrReportSnapshot` — canonical saved report body |
| **`lib/m55/reply/walletGrants.ts`** | Included reply grant on fulfillment |
| **`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`** | Offline repair runner — **out of scope** until eligibility proven |

**Planning implication:** Aggregate **snapshots 6 < fulfillments 10** does **not** automatically mean **4 users are locked**. D3-R must count **entitlement owners without snapshot** and correlate with **recovery UX** / support signals — not assume 1:1 with failed rows.

---

## E. Future counts-only query plan（Human execution — **not in AS-B1-D3**）

**Target:** **`m55-soul-core`** only.** **No `SELECT *`.** **No row paste to chat/SSOT.**

### E.1 Artifact totals（re-poll baseline）

```sql
SELECT
  (SELECT count(*)::bigint FROM public.failed_fulfillments) AS failed_total,
  (SELECT count(*)::bigint FROM public.failed_fulfillments
     WHERE created_at > now() - interval '24 hours') AS failed_24h,
  (SELECT count(*)::bigint FROM public.one_time_fulfillments) AS fulfillments_total,
  (SELECT count(*)::bigint FROM public.entitlements
     WHERE product_id = 'DTR_CORE_STATIC_V1' AND status = 'active') AS entitlements_active_total,
  (SELECT count(*)::bigint FROM public.dtr_report_snapshots
     WHERE product_id = 'DTR_CORE_STATIC_V1') AS snapshots_total,
  (SELECT count(*)::bigint FROM public.reply_ticket_wallets) AS wallets_total;
```

### E.2 Entitlement owners without snapshot（aggregate only）

```sql
SELECT count(*)::bigint AS entitlements_without_snapshot
FROM public.entitlements e
WHERE e.product_id = 'DTR_CORE_STATIC_V1'
  AND e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.dtr_report_snapshots s
    WHERE s.user_id = e.user_id AND s.product_id = e.product_id
  );
```

**SSOT rule:** Record **integer count only** — never export `user_id` list.

### E.3 Fulfillment owners without snapshot（cross-check)

```sql
SELECT count(*)::bigint AS fulfillments_without_snapshot
FROM public.one_time_fulfillments o
WHERE o.product_id = 'DTR_CORE_STATIC_V1'
  AND NOT EXISTS (
    SELECT 1 FROM public.dtr_report_snapshots s
    WHERE s.user_id = o.user_id AND s.product_id = o.product_id
  );
```

### E.4 Distinct owner counts by artifact（no IDs）

```sql
SELECT count(DISTINCT user_id)::bigint AS distinct_entitlement_owners
FROM public.entitlements
WHERE product_id = 'DTR_CORE_STATIC_V1' AND status = 'active';

SELECT count(DISTINCT user_id)::bigint AS distinct_snapshot_owners
FROM public.dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT count(DISTINCT user_id)::bigint AS distinct_fulfillment_owners
FROM public.one_time_fulfillments
WHERE product_id = 'DTR_CORE_STATIC_V1';
```

### E.5 Failed vs recovered overlap（session cardinality only)

```sql
SELECT count(*)::bigint AS failed_internal_rows,
       count(DISTINCT f.checkout_session_id)::bigint AS failed_distinct_sessions,
       count(DISTINCT o.checkout_session_id)::bigint AS overlap_sessions
FROM public.failed_fulfillments f
LEFT JOIN public.one_time_fulfillments o
  ON o.checkout_session_id = f.checkout_session_id
WHERE f.failure_reason = 'internal_processing_failed';
```

Use **`overlap_sessions`** as proxy for retry-recovered paths — **do not** paste session IDs.

### E.6 Wallet / ledger consistency（aggregates）

```sql
SELECT count(*)::bigint AS wallets_total,
       count(*) FILTER (WHERE initial_included_count > 0)::bigint AS wallets_with_included
FROM public.reply_ticket_wallets;

SELECT count(*)::bigint AS ledger_included_grants
FROM public.reply_wallet_ledgers
WHERE event_type = 'included_grant';

SELECT count(*)::bigint AS entitlement_owners_without_wallet
FROM public.entitlements e
WHERE e.product_id = 'DTR_CORE_STATIC_V1' AND e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.reply_ticket_wallets w WHERE w.user_id = e.user_id
  );
```

### E.7 Rights row coverage（aggregate）

```sql
SELECT count(*)::bigint AS entitlements_without_core_right
FROM public.entitlements e
WHERE e.product_id = 'DTR_CORE_STATIC_V1' AND e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.entitlement_rights r
    WHERE r.user_id = e.user_id AND r.right_key = 'm55_p:core_origin'
  );
```

### E.8 Safe UI verification label（optional Human）

If Human runs **non-DB** checks: count users in **`owned_snapshot_not_ready`** state via support-safe internal tooling — record **count or yes/no only** with label **`DTR_owned_recovery_processing`** — **no user IDs in SSOT**.

---

## F. Repair eligibility decision model

| Tier | Criteria | AS-B1-D3 posture |
|------|----------|------------------|
| **Not eligible** | Historical-only failures；**24h = 0**；no paid-not-unlocked；no support open；aggregate mismatch **not** tied to user-visible gap；snapshot gap owners still **`owned`** via rights + payment backing | **Default today** — matches D2-R |
| **Candidate** | **Active entitlement** exists but **no snapshot**；owner may hit **`/dtr/processing?recovery=owned`** — needs D3-R counts（§E.2–E.3） | **Investigate in D3-R** — planning only now |
| **Eligible** | **Current paid owner** cannot open saved DTR at **`/dtr/core`** **and** recovery path fails **or** included reply wallet missing **with confirmed evidence** | **Requires D3-R + Human explicit GO** → **AS-B1-REPAIR** planning |
| **Emergency** | **`failed_fulfillments_24h > 0`** **or** paid user **blocked after successful payment**（not merely recovery polling） | **Stop D3 planning-only** — incident / repair planning gate |

### Decision flow（D3-R target）

```
24h failures > 0? ──yes──► Emergency (not Category 1 repair)
        │
        no
        ▼
paid-not-unlocked confirmed? ──yes──► Eligible path (Human GO)
        │
        no
        ▼
entitlements_without_snapshot = 0? ──yes──► Not eligible (aggregate gap explained)
        │
        no
        ▼
any support open? ──yes──► Stop / triage
        │
        no
        ▼
overlap_sessions high vs failed rows? ──► Candidate: retry-recovered historical noise
        │
        else
        ▼
Candidate → D3-R documents counts → Human decides repair planning gate
```

**AS-B1-D3 does not assign a tier outcome** — only defines the model for **D3-R**.

---

## G. Stop conditions

| Condition | Action |
|-----------|--------|
| **Raw IDs needed in SSOT** | **Stop** — secure offline channel |
| **`SELECT *` or row export required** | **Stop** — widen scope forbidden |
| **Repair / write / replay requested** | **Stop** — Category 2 + Human GO |
| **Current paid-not-unlocked confirmed** | **Stop** Category 1 — escalate eligibility / repair planning |
| **`failed_fulfillments_24h > 0`** | **Stop** — SEV-1 path |
| **Support report opens** | **Stop** — triage |
| **Environment target unclear** | **Stop** — confirm **`m55-soul-core`** label only |

---

## H. No repair decision

| Action | AS-B1-D3 authorization |
|--------|-------------------------|
| **Repair execution** | **no** |
| **Repair runner** | **no** |
| **Webhook replay / Stripe resend** | **no** |
| **DB write / entitlement / wallet / snapshot mutation** | **no** |
| **Live payment / checkout retry / refund** | **no** |
| **AS-B1-REPAIR** | **closed** unless **D3-R** proves user-visible impact **and** Human gives **explicit GO** |

---

## I. Next phase

| Recommended | **`5Z-I-V-AS-B1-D3-R`** — Human historical artifact consistency counts-only **result** recording |
|-------------|--------------------------------------------------------------------------------------------------|
| **Scope** | Execute **§E** + answer **§D Q1–Q8**；assign repair eligibility **tier**（aggregate-based） |
| **Verdict target** | GREEN if tier resolved without active bleed |

| Alternative | **`AS-B1-REPAIR`** — only if **D3-R** → **Eligible** + Human GO + user-impact documented |

| If **24h > 0** | **AS-B1-R** re-poll first |

| Parallel | **AS-C5-A** / **AS-C6** if Human deprioritizes fulfillment chain |

---

## J. No-mutation statement

- **No** Production DB write
- **No** repair execution / repair runner
- **No** webhook replay / Stripe event resend
- **No** checkout retry / live payment / refund
- **No** entitlement / snapshot / wallet mutation
- **No** raw `user_id` / email / session / Stripe ID / secret in SSOT
- **No** `SELECT *` / raw rows / `raw_metadata` paste
- **No** deploy / redeploy / env change
- **No** Clerk / auth change
- **No** AX-PROD / AL / AL-PRE / full normal dev flow release

---

## Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed**（current production path — ownership gate allows owned without snapshot） |
| **AC-P6 unpaid** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** exception |
| **AX-PROD** | **BLOCKED** |
| **Automated notification** | **AS-B2/B3** |
| **Full normal dev flow** | **NOT released** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-B1-D3-HISTORICAL-ARTIFACT-CONSISTENCY-REPAIR-ELIGIBILITY-DIAGNOSTIC-PLAN-001`** | **本条** |

---

## Repo files reviewed（read-only）

| Path | Role |
|------|------|
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | Fulfillment + non-fatal snapshot |
| `lib/m55/dtrDraftDb.ts` | Snapshot read/upsert |
| `lib/m55/dtrOwnershipGate.ts` | Owned without snapshot path |
| `lib/m55/dtrShelfAccess.ts` | `owned_snapshot_not_ready` UX |
| `lib/m55/reply/walletGrants.ts` | Wallet / ledger grants |
| `app/dtr/core/page.tsx` | Saved report open gate |
| `app/dtr/processing/page.tsx` | Recovery processing path |
| `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts` | Repair runner — blocked |
