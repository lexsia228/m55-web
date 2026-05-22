# Phase 5-6H-5Z-I-V-CORE-DTR-VERIFY-A — New unpaid user paid DTR snapshot verification planning gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-VERIFY-A** |
| **Title** | **New unpaid user paid DTR snapshot verification planning** |
| **Classification** | **Category 1 / verification planning / docs-only / no-mutation** |
| **Verdict** | **`NEW_UNPAID_USER_PAID_DTR_SNAPSHOT_VERIFICATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-VERIFY-A-NEW-UNPAID-USER-PAID-DTR-SNAPSHOT-VERIFICATION-PLAN-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **CORE-DTR-A** policy；**CORE-DTR-B** UI plan；**TL-FIX-C** snapshot shelf；**AS-B6-DISABLE-R** notify flag unset without redeploy |

**Execution:** **none** — plan only.** **No** checkout / payment / webhook / DB write / deploy.

---

## B. Verification intent

| Question | Answer |
|----------|--------|
| **What are we proving?** | For a **new unpaid** logged-in user with **`birthDate = 1983-02-28`**, free **`/core`** shows the golden-vector type surface **before** purchase; after **exactly one** live purchase, paid **`/dtr/core`** reflects the **same purchase-time `profile_snapshot`** (immutable), not a live profile overwrite. |
| **What are we not proving in VERIFY-A?** | Payment success, webhook delivery, DB row creation — deferred to **VERIFY-B〜E**. |
| **Account label** | **`human-test-19830228-new-user`**（Human-only notebook label；**not** stored in SSOT as ID/email） |

---

## C. Target environment decision

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **Production canonical (`m55-webv2.vercel.app`)** | **SELECTED for VERIFY-C payment + post-payment** | **`5Z-D`〜`5Z-F`** established **live** webhook → **`/api/stripe/webhook`** on this host；**`STRIPE_WEBHOOK_SECRET`** bound to **Production** env；fulfillment writes **Production `m55-soul-core`**. |
| **Branch preview (`m55-webv2-git-work-home-cluster-…`)** | **OPTIONAL for VERIFY-A pre-purchase UI only** | **TL-FIX-C** @ **`5c9248f`** available on preview；**no** default Stripe webhook to preview → **must not** run checkout on preview unless Human provisions **separate** Preview endpoint + secrets（**out of default plan**）. |
| **Localhost** | **REJECTED for payment path** | Webhook delivery to local not in scope. |

### C1. Deployment SHA gate（before VERIFY-C）

| Check | Human action |
|-------|----------------|
| **Production deployment includes TL-FIX-C + fulfillment path** | Vercel Production **commit SHA** vs **`5c9248f`**（or later GREEN merge）— **record SHA prefix only**（e.g. `5c9248f`） |
| **If Production lags branch** | Either **promote/deploy** via separate deploy gate **or** limit pre-purchase to preview but **still pay on Production** only after deploy catch-up |

**Pre-purchase (VERIFY-A Human step):** May use **Production** if SHA OK; else **preview** for free `/core` only — document host safe label in VERIFY-B result.

---

## D. Stripe mode decision

| Mode | Use |
|------|-----|
| **Live** | **SELECTED** — product is **¥1,000 JPY** Production SKU **`DTR_CORE_STATIC_V1`** on canonical host. |
| **Test** | **REJECTED** for default plan — would not exercise Production webhook + Production DB fulfillment chain under test. |

| Constraint | Rule |
|------------|------|
| **Charges** | **Exactly one** checkout completion in **VERIFY-C** |
| **Refunds** | **Separate gate** if rollback needed |
| **Replay** | **Forbidden** in VERIFY chain unless dedicated replay gate with GO |

---

## E. Webhook readiness checklist

**Target:** **Production endpoint only**（default plan）.

| # | Check | Pass criterion | Fail action |
|---|-------|----------------|-------------|
| **W1** | Stripe Dashboard → Webhook endpoints | **Active** endpoint URL host = **`m55-webv2.vercel.app`** | Do not start VERIFY-C |
| **W2** | Subscribed events | Includes **`checkout.session.completed`** | Fix Stripe config in separate gate |
| **W3** | Vercel Production env | **`STRIPE_WEBHOOK_SECRET`** present（length only in notes；**no whsec in SSOT**） | **5Z-E-class** env gate |
| **W4** | Runtime secret activation | **Redeploy** after whsec change if Vercel shows pending | **5Z-F-class** redeploy gate |
| **W5** | Preview webhook | **Not required** if W1–W4 pass on Production | N/A |
| **W6** | Delivery test | **Not in VERIFY-A** — optional Human observes first event in Stripe Dashboard **after VERIFY-C**（status code only） |
| **W7** | Restricted CLI replay | **Not used** in this verification chain（historical **5Z-I-A** permission block） |

**Code path (read-only reference):** `app/api/stripe/webhook/route.ts` — **`checkout.session.completed`** → **`fulfillDtrCoreFromCheckoutSessionId`** → **`dtr_report_snapshots.profile_snapshot`** immutable upsert.

---

## F. Notification safety decision

| State | Source |
|-------|--------|
| **Vercel UI** | **`M55_OPS_NOTIFY_ENABLED=false`** set (**AS-B6-DISABLE-R** 2026-05-21） |
| **Runtime** | **Unconfirmed** — **redeploy not performed** after re-set |
| **Prior** | **AS-B6-DISABLE-D** (2026-05-20) once activated **`false`** on SHA **`5051cbe`** — may still apply if no later redeploy overwrote |

### F1. Decision matrix

| Path | Recommendation |
|------|----------------|
| **Strict（推奨）** | Run **`AS-B6-DISABLE-D`**（redeploy-only）**before VERIFY-C** → record **`AS-B1-MONITOR-R*`** style “runtime notify off” attestation |
| **Proceed without redeploy** | **Allowed with documented risk:** fulfillment failure paths may still invoke **`notifyM55OpsFireAndForget`** if runtime env ≠ UI flag |

**VERIFY-A records:** If Human skips **DISABLE-D**, VERIFY-B/C SSOT must include **`NOTIFICATION_RUNTIME_UNCONFIRMED_RISK_ACCEPTED`** checkbox.

**No Slack send in any VERIFY gate.**

---

## G. Read-only preflight template（VERIFY-B）

**Target DB safe label:** **`m55-soul-core`**（Production）.  
**Rules:** **`SELECT *` forbidden**；**raw row / raw_metadata forbidden**；**no user_id / email / session / Stripe ID in SSOT**.

### G1. Human poll block（copy-paste template）

```text
CORE-DTR-VERIFY-B preflight (counts-only)
Date:
Environment safe label: m55-soul-core
Production: yes
SELECT * used: no
Raw row / raw_metadata pasted: no
Raw user_id / email / session / Stripe ID / secret: no

A. Failed fulfillment
- failed_fulfillments_total:
- failed_fulfillments_24h:
- failure category counts (labels only):
  - internal_processing_failed:
  - missing_client_reference_id:
  - other/unknown:

B. Artifact totals (global counts — not filtered to test user)
- entitlements_dtr_total:        # COUNT(*) WHERE product_id = 'DTR_CORE_STATIC_V1' OR equivalent Human convention
- dtr_report_snapshots_dtr_total:
- one_time_fulfillments_total:
- reply_ticket_wallets_total:
- reply_wallet_ledgers_total:

C. Bleed check
- failed_fulfillments_24h > 0: yes/no
- active user paid-but-not-unlocked report: yes/no  # Human judgment, no ID in SSOT

D. Baseline delta slots (fill post VERIFY-C / VERIFY-D — counts only)
- entitlements_dtr_total_after:
- dtr_report_snapshots_dtr_total_after:
- failed_fulfillments_24h_after:
```

### G2. Redacted SQL patterns（placeholders only）

```sql
-- failed_fulfillments_total
SELECT COUNT(*) FROM failed_fulfillments;

-- failed_fulfillments_24h
SELECT COUNT(*) FROM failed_fulfillments
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- failure categories (aggregate)
SELECT failure_category, COUNT(*) FROM failed_fulfillments
GROUP BY failure_category;

-- entitlements_dtr_total
SELECT COUNT(*) FROM entitlements
WHERE product_id = 'DTR_CORE_STATIC_V1';

-- dtr_report_snapshots_dtr_total
SELECT COUNT(*) FROM dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1';

-- one_time_fulfillments_total
SELECT COUNT(*) FROM one_time_fulfillments;

-- reply_ticket_wallets_total
SELECT COUNT(*) FROM reply_ticket_wallets;

-- reply_wallet_ledgers_total
SELECT COUNT(*) FROM reply_wallet_ledgers;
```

**Stop preflight if:** `failed_fulfillments_24h > 0` **or** Human confirms active bleed → **do not open VERIFY-C** until ops gate.

---

## H. Human UI pre-purchase checklist（VERIFY-A execution — no checkout）

**Host:** Production **or** branch preview（§C）.  
**Account:** new Clerk user — label **`human-test-19830228-new-user`** locally only.

| Step | Action | Record |
|------|--------|--------|
| **H1** | Create / sign in **new unpaid** user | pass/fail |
| **H2** | **My Page** → set **`birthDate = 1983-02-28`** + any nickname | pass/fail |
| **H3** | Open **`/core`** (not `/home` intake if `/my` profile suffices) | pass/fail |
| **H4** | Hero / type band — confirm **free surface strings** (see §I Tier B) | pass/fail |
| **H5** | **`/dtr`** — confirm **unowned** shelf（no false “owned”） | pass/fail |
| **H6** | **Do not** press checkout / payment | mandatory |
| **H7** | Screenshot | **redacted only** — no email, no Clerk ID, no Stripe |

**Optional automation cross-check:** `e2e/core-founder-anchor-hero.spec.ts` — **ANALYST** + **静観分析** for 1983-02-28（CI reference only；not substitute for Human signed-in `/my` path）.

---

## I. Exact pass/fail criteria

### I1. Tier A — Snapshot / policy consistency（primary — post-payment VERIFY-D）

| ID | Criterion | Pass | Fail |
|----|-----------|------|------|
| **AC-SNP-01** | After purchase, **`/dtr/core`** loads for test user | **200** reader, not perpetual prep | Stuck prep / auth loop |
| **AC-SNP-02** | **`profile_snapshot.birthDate`** = **`1983-02-28`**（Human: UI meta or counts-only confirm **without** pasting row JSON） | match | mismatch / missing snapshot |
| **AC-SNP-03** | Edit My Page birthDate **after** purchase → **`/core`** changes；**`/dtr/core`** body **unchanged** | CORE-DTR-A behavior | paid body tracks live profile |
| **AC-SNP-04** | Global **`dtr_report_snapshots_dtr_total`** increases by **1** after VERIFY-C | +1 | 0 / >1 without explanation |
| **AC-SNP-05** | **`failed_fulfillments_24h`** unchanged after VERIFY-C | 0 | >0 new failure |
| **AC-SNP-06** | No DELETE of snapshot / entitlement / fulfillment in any repair | no mutation | any delete |

### I2. Tier B — Free `/core` pre-purchase UI strings（VERIFY-A / pre-checkout）

| String | Location (approx.) | Pass |
|--------|-------------------|------|
| **分析類型** | `CoreHeroSection` class label | visible |
| **ANALYST** | Hero EN type | visible |
| **特質性** | Hero trait label | visible |
| **静観分析** | Hero trait name（from 観測特性：静観分析） | visible |

**Reference:** `e2e/core-founder-anchor-hero.spec.ts`；golden vector **`00_PRIMARY_ACTIVE_LAW/M55_GOLDEN_VECTOR_AUDIT_1983_02_28_SSOT_v1.md`**.

### I3. Tier C — Paid `/dtr/core` post-purchase UI（literal vs semantic）

**Important:** Paid reader uses **`TEN_STEM_DISPLAY`**（TL-FIX-C）— hero shows **`資質 / {publicTitle}`**, not necessarily the literal **分析類型 / ANALYST** strings.

| ID | Criterion | Pass | Fail / defer |
|----|-----------|------|----------------|
| **AC-PAY-01** | Stem lane for **1983-02-28** = **癸** index → **`publicTitle` = アナリスト** | visible on paid hero | wrong stem / wrong image |
| **AC-PAY-02** | **Semantic equivalence** to free ANALYST lane | Human confirms アナリスト = same stem as free ANALYST hero | different stem index |
| **AC-PAY-03** | Literal **ANALYST** on paid hero | **OPTIONAL / TL-F7** — not required for VERIFY GREEN if AC-PAY-01–02 pass | — |
| **AC-PAY-04** | Literal **特質性** + **静観分析** on paid hero | **OPTIONAL** — paid layout may use **`displayOneLine`** / body copy instead | fail only if product requires literal parity |
| **AC-PAY-05** | Product chrome | **本質の読み解き** / **保存版** semantics（TL-FIX-C labels） | **Entry Report** as primary owned title |

**Human expectation reconciliation:**

| User-listed expectation | Planned interpretation |
|-------------------------|------------------------|
| 分析類型 / ANALYST | **Free:** literal.** **Paid:** **アナリスト** + **資質 /** acceptable if same stem (**AC-PAY-01–02**) |
| 特質性 / 静観分析 | **Free:** literal.** **Paid:** verify via **stem symbol 雨** / analyst-themed body sections — document in VERIFY-D notes |

**Overall VERIFY GREEN:** **AC-SNP-01〜06** + **Tier B** + **AC-PAY-01–02 & AC-PAY-05** all pass.

**PARTIAL:** Tier B pass but AC-PAY-03–04 fail → **`SNAPSHOT_GREEN_LABEL_PARITY_DEFERRED_TL_F7`**.

---

## J. Execution gate chain（proposal）

| Gate | Phase ID | Mutation | Deliverable |
|------|----------|----------|-------------|
| **A（本条）** | **CORE-DTR-VERIFY-A** | **none** | This plan |
| **B** | **CORE-DTR-VERIFY-B** | **none** | §G preflight counts recorded |
| **C** | **CORE-DTR-VERIFY-C** | **one live checkout** | Payment + webhook fulfillment |
| **D** | **CORE-DTR-VERIFY-D** | **none** | **15 min** UI + counts delta（§I） |
| **E** | **CORE-DTR-VERIFY-E** | **none** | **24h** counts-only monitor（AS-B1 cadence） |

### J1. VERIFY-C prerequisites（ordered）

1. **AS-B6-DISABLE-D**（recommended） or risk flag §F1  
2. **VERIFY-B** GREEN（no 24h bleed）  
3. **Production SHA** includes fulfillment + TL-FIX-C  
4. **Human GO** for exactly-one charge  
5. **Pre-purchase VERIFY-A** checklist GREEN（§H）

### J2. VERIFY-C forbidden

- second checkout；webhook replay；broad replay；manual entitlement；repair runner；snapshot sync；env change；deploy（unless DISABLE-D only）

---

## K. Non-target一覧

| Item | Reason |
|------|--------|
| **CORE-DTR-C** drift UI implementation | Separate gate |
| **CORE-DTR-B** checkout copy execution | Not VERIFY |
| **TL-FIX-D-HUMAN-R** existing owned user M3 | Different cohort |
| **TL-F7** type table unification | Label parity optional |
| **Webhook replay gates（5Z-I-*）** | Not for new purchase path |
| **AX-PROD / AL** | Forbidden |
| **Storefront frozen pages** | No test traffic required |

---

## L. No-mutation statement

- **No** checkout / payment / webhook / DB write / deploy / env / Stripe / Clerk / Slack  
- **No** raw user_id / email / session / Stripe ID / secret in SSOT

---

## M. Next gate

| Priority | Gate |
|----------|------|
| **1** | **CORE-DTR-VERIFY-B** — Human counts-only preflight（§G） |
| **2** | **AS-B6-DISABLE-D**（optional but recommended before **VERIFY-C**） |
| **3** | **CORE-DTR-VERIFY-A-R**（optional Human sign-off on plan） |
| **4** | **CORE-DTR-VERIFY-C** — exactly-one purchase（Human GO） |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-VERIFY-A-NEW-UNPAID-USER-PAID-DTR-SNAPSHOT-VERIFICATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-A-FREE-CORE-PAID-DTR-SNAPSHOT-CONSISTENCY-POLICY-PLAN-001`** | Policy |
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-B-FREE-CORE-PAID-DTR-UI-IMPLEMENTATION-PLAN-001`** | UI plan |
| **`M55-EVID-20260521-5Z-I-V-AS-B6-DISABLE-R-NOTIFICATION-DISABLE-FLAG-HUMAN-CHECKPOINT-RESULT-001`** | Notify runtime risk |
