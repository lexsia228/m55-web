# Phase 5-6H-5Z-I-V-AK — Production Clerk auth compliance correction planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AK** |
| **Title** | **Production Clerk auth compliance correction planning** |
| **Classification** | **Category 2 planning only / docs-only / no-mutation** |
| **Verdict** | **`PRODUCTION_CLERK_AUTH_COMPLIANCE_CORRECTION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AK-PRODUCTION-CLERK-AUTH-COMPLIANCE-CORRECTION-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AJ-R commit** | **`6a548bd`** |

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **`5Z-I-V-AJ-R`** | **Production auth compliance RED** confirmed |
| **DTR owned + AC-P6** | **GREEN** — **do not** treat as auth compliance closure |
| **Correction required** | Env / Clerk key posture must change for compliance |
| **Planning ≠ execution** | This gate **plans only**；**no mutation** |
| **Category 2** | Correction **execution** needs **explicit Human GO** + **`5Z-I-V-AL`** |
| **Prior lineage** | **`5Z-I-V-L`/`M`** options remain valid input；**AK** supersedes as post-**AJ-R** correction plan |

---

## C. Non-compliance summary（AJ-R — prefix class only）

| Item | Value |
|------|--------|
| **Vercel Production publishable** | **`pk_test_`** |
| **Vercel Production secret** | **unclear** |
| **Vercel Preview publishable** | **`pk_test_`** |
| **Vercel Preview secret** | **unclear** |
| **Clerk app safe label** | **`m55-official`** |
| **Clerk environment type** | **development** |
| **Clerk publishable** | **`pk_test_`** |
| **Clerk secret** | **`sk_test_`** |
| **Canonical domain** | **configured** |
| **Same-app** | **yes**（human-reported / **limited confidence**） |
| **Dual-app conflict** | **resolved yes** |
| **Raw key shared** | **no** |

---

## D. Target compliant state（not executed）

| Target | Requirement |
|--------|-------------|
| **Clerk environment** | **Production-appropriate** instance on canonical app（**`m55-official`** unless Human selects Option 2） |
| **Vercel Production publishable** | **`pk_live_`**（if Clerk production mode available and policy requires） |
| **Vercel Production secret** | **`sk_live_`**（matching pair；prefix confirmed at execution without raw recording） |
| **Same-app** | **yes** — publishable + secret from **same** Clerk app/environment |
| **Domain** | **`m55-webv2.vercel.app`** remains **correctly associated** in Clerk |
| **Preview / dev** | **Separated** — Preview must **not** accidentally receive Production **`pk_live_`** keys |
| **Compliance verdict after correction** | Requires **`5Z-I-V-AN`** verification — **not** implied by env edit alone |

---

## E. Correction options（evaluate only — not executed）

### Option 1 — Enable Clerk Production on **`m55-official`**；update Vercel Production to **`pk_live_` / `sk_live_`**

| Dimension | Assessment |
|-----------|------------|
| **Action** | Human enables Clerk **Production** environment on **`m55-official`**；obtains production key pair；updates Vercel **Production** env only（Preview unchanged unless planned） |
| **Benefit** | Minimal app churn；domain already **configured**；dual-app conflict **resolved** to **`m55-official`** |
| **Risk** | **`pk_live_` may not exist yet**（prior **`5Z-I-V-M`**: not visible）；enablement path **unclear** |
| **User ID / orphan risk** | **High if** Clerk issues **new** user IDs on production instance — see §F |
| **DB impact** | **entitlements**, **dtr_report_snapshots**, **reply_ticket_wallets**, **reply_wallet_ledgers**, **one_time_fulfillments** keyed by Clerk **`user_id`** |
| **Rollback** | Human-local backup of current Vercel Production env names + prefix classes；revert to **`pk_test_`** pair if rollback keys retained |
| **Human-only** | Enable Production in Clerk；copy keys **locally only**；set Vercel Production env；**never** paste raw keys to AI/SSOT |
| **Post-correction verify** | **`5Z-I-V-AN`** — login, owned DTR, unpaid path, domain |

### Option 2 — Dedicated new production Clerk app；point Vercel Production to its **`pk_live_` / `sk_live_`**

| Dimension | Assessment |
|-----------|------------|
| **Action** | Create/select clean production app；configure domain；migrate Vercel Production env |
| **Benefit** | Clean separation from historical **`M55-core`** quarantine |
| **Risk** | **Highest** user ID churn；domain cutover complexity |
| **User ID / orphan risk** | **Very high** — treat as **migration project** |
| **DB impact** | Same tables as Option 1 — **all** Clerk-keyed rows at risk |
| **Rollback** | Harder — requires second env backup |
| **Human-only** | App creation, domain, DNS if needed, env set |
| **Post-correction verify** | **`5Z-I-V-AN`** + mapping audit gate if IDs change |

### Option 3 — Documented temporary exception：retain **`pk_test_`** on Production

| Dimension | Assessment |
|-----------|------------|
| **Action** | No key change；governance accepts known-risk dev keys on Production |
| **Benefit** | No immediate user ID churn |
| **Risk** | **Remains non-compliant**；not auth compliance GREEN |
| **User ID / orphan risk** | **Low** short-term |
| **Compliance** | **Does not** resolve **AJ-R RED** — **not recommended** as target state |
| **Use** | **Emergency continuity only** with explicit governance — **not** this AK plan’s target |

### Recommended option

**Primary recommendation: Option 1** — enable Clerk Production on **`m55-official`** and migrate Vercel Production to **`pk_live_` / `sk_live_`** **only after** Human confirms production keys exist in Clerk dashboard（prefix class check, no raw paste）.

**Fallback: Option 2** if Option 1 cannot obtain **`pk_live_`** / Production instance on **`m55-official`**.

**Reject as compliance target: Option 3** — does not close RED.

---

## F. Critical migration risk

| Risk | Detail |
|------|--------|
| **Clerk user ID change** | Switching Clerk environment/app may issue **new** `user_*` IDs |
| **Orphan tables** | **entitlements**, **dtr_report_snapshots**, **reply_ticket_wallets**, **reply_wallet_ledgers**, **one_time_fulfillments**, and related ownership artifacts |
| **Paid user impact** | **`human-ui-current-user`** and other paid users may **lose** DTR unlock until mapping/repair |
| **Required before AL** | **User identity mapping / preservation / migration decision** documented（Human-only gate or appendix） |
| **No blind copy** | Do **not** copy artifacts across IDs without explicit migration plan |
| **Prior exception** | **`5Z-I-V-N`** temporary dev-auth exception is **not** a substitute for compliance correction |

---

## G. Pre-correction checklist（future **`5Z-I-V-AL`** — must all pass before execution)

| # | Check |
|---|--------|
| **1** | Human confirmed **target Clerk app** = **`m55-official`**（or documented Option 2 app label） |
| **2** | Human confirmed **`pk_live_` / `sk_live_`** prefix classes in Clerk **without** sharing raw keys |
| **3** | Human confirmed publishable + secret **same-app: yes** |
| **4** | Human backed up current Vercel Production env state **outside SSOT** |
| **5** | Human documented **rollback route** |
| **6** | Human assessed **user ID migration** requirement（yes/no/unclear + plan if yes） |
| **7** | Human assessed **paid user access** would remain intact or has repair plan |
| **8** | **Explicit Human GO** for correction **execution** recorded |
| **9** | Dedicated **`5Z-I-V-AL`** gate doc opened |

---

## H. Future execution split（not executed in AK）

| Phase | Title | Category | Scope |
|-------|--------|----------|--------|
| **`5Z-I-V-AL`** | Production Clerk auth compliance **correction execution** | **Category 2** | Vercel Production env key update；Clerk dashboard actions **Human-only**；**no redeploy** unless AL scope explicitly includes it or **AM** separated |
| **`5Z-I-V-AM`** | Production **redeploy** for Clerk env activation | **Category 2** | **After AL**；explicit GO；activate new env in running deployment |
| **`5Z-I-V-AN`** | **Post-correction** auth/UI verification | **Category 3** read-only | Login, owned DTR, unpaid path, no checkout/payment/DB mutation |

**Order:** **AK**（plan）→ **AL**（env）→ **AM**（redeploy if needed）→ **AN**（verify）.

---

## I. Stop conditions for future correction

Future **AL** must **STOP** if:

| # | Condition |
|---|-----------|
| **1** | Target Clerk production environment **cannot** be confirmed |
| **2** | Only **`pk_test_` / `sk_test_`** keys available |
| **3** | Same-app association **unclear** |
| **4** | User ID migration risk **unresolved** |
| **5** | Rollback path **unclear** |
| **6** | Raw keys would need pasting into AI/SSOT |
| **7** | Paid user access risk **unassessed** |
| **8** | Production domain association **unclear** |
| **9** | Redeploy impact **unclear**（defer to **AM** planning） |

---

## J. No-mutation statement

**Explicitly confirmed — none performed in AK:**

- No env change / no Clerk setting change / no Vercel setting change
- No redeploy / deploy / promote
- No code change
- No Production DB write
- No auth mutation / user creation
- No Stripe / webhook / checkout / payment
- No runner execution
- No raw key / secret / fragments recorded
- No manual entitlement / snapshot / wallet mutation

---

## K. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Type-label mismatch** | **separate / open** |
| **`npm run audit` Background NoTouch** | **separate / open** |
| **Full normal dev flow** | **NOT released** |
| **Correction completed** | **no** — planning only |

---

## L. Next phase

| Field | Value |
|-------|--------|
| **Recommended next** | **`5Z-I-V-AL`** — Production Clerk auth compliance correction **execution** |
| **Requires** | **Explicit Human GO**；§G checklist complete；**not automatic** from AK |
| **Do not execute AL** in AK gate |

### Unresolved blockers before AL

| Blocker | Status |
|---------|--------|
| **`pk_live_` visible on `m55-official`** | **unclear**（prior **`5Z-I-V-M`**: **no**）— Human must confirm in Clerk before AL |
| **Vercel Production secret prefix** | **unclear** until re-set at execution |
| **User ID migration plan** | **open** |
| **Human GO for AL** | **not granted** in AK |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AK-PRODUCTION-CLERK-AUTH-COMPLIANCE-CORRECTION-PLAN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AJ-R-PRODUCTION-AUTH-COMPLIANCE-CLERK-DASHBOARD-REPLAY-RESULT-001`** | RED confirmation |
| **`M55-EVID-20260518-5Z-I-V-L-VERCEL-CLERK-ENV-CORRECTION-PLAN-001`** | prior options |
| **`M55-EVID-20260518-5Z-I-V-M-CLERK-PRODUCTION-INSTANCE-CAPABILITY-MIGRATION-IMPACT-001`** | migration risk |

---

## 未実行事項（AK）

- **AL / AM / AN** not run
- no correction / env / redeploy / mutation
