# Phase 5-6H-5Z-I-V-ENGINE-DEPLOY-PRODUCTION-PLANNING — Composite v2 Production deploy plan（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-DEPLOY-PRODUCTION-PLANNING** |
| **Title** | **Composite astrology v2 Production deploy planning** |
| **Classification** | **Category 1 / deploy planning / docs-only / no deploy** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_PRODUCTION_DEPLOY_PLANNING_READY_FOR_EXECUTION_PENDING_HUMAN_GO`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-DEPLOY-PRODUCTION-PLANNING-001`** |
| **Date** | **2026-05-21** |
| **Branch (source)** | **`work/home-cluster`** |
| **Branch tip (planning)** | **`21d5bb4`** |
| **Preview-verified runtime SHA** | **`2564061`**（FIX-B client bundle split） |
| **Production deploy** | **no**（本 Gate） |
| **main push** | **no**（本 Gate） |

**Read-only planning.** No Production deploy, redeploy, checkout, payment, DB write, SQL, env change, snapshot mutation, or CORE-DTR-VERIFY resume.

---

## B. Production readiness classification

| Tier | Label | Status |
|------|-------|--------|
| **Local verify（VERIFY-A）** | **GREEN** | Matrix **28/28**；GX-01 golden；stored envelope tests |
| **Branch preview build** | **GREEN** | GH automatic preview **Ready** @ **`2564061`** |
| **Branch preview smoke（logged-out）** | **GREEN** | **ENGINE-DEPLOY-PREVIEW-R** @ alias `m55-webv2-git-work-home-cluster-m55-official.vercel.app` |
| **Signed-in / owned envelope runtime** | **PARTIAL** | **not_run** on preview — **non-blocking** for code-only Production cutover |
| **Production DDL** | **APPLIED** | `engine_context_json` / `engine_version` additive；legacy snapshots **NULL 維持** |
| **v2 fulfillment write** | **OFF** | Flag default off；**no enable** in EXEC gate |
| **CORE-DTR-VERIFY** | **HOLD** | **Do not resume** as part of this deploy |
| **Production release（runtime）** | **NOT YET DEPLOYED** | `origin/main` tip **`5051cbe`** — composite v2 chain **未含む** |
| **Overall** | **`READY_FOR_EXECUTION_PENDING_HUMAN_GO`** | Execution gate requires explicit Human **`ENGINE-DEPLOY-PRODUCTION-EXECUTION go`** |

**Tip delta note:** `2564061..21d5bb4` is **docs-only**（PREVIEW-R SSOT）。Runtime artifact equals preview-tested **`2564061`**.

---

## C. Recommended Production deploy route

### C1. Canonical host（label only）

| Role | Safe label |
|------|------------|
| **Primary Production UI** | **`https://m55-webv2.vercel.app`** |
| **Vercel project** | **`m55-webv2`** |
| **Registry reference** | Prior SSOT **`vercel.domain.primary-ui`** |

**Not used for this cutover:** branch preview alias；CLI-only deploy URLs from PREVIEW partial-RED session.

### C2. Deploy path（recommended — matches AS-C6-D-R precedent）

| Step | Action | Gate |
|------|--------|------|
| **0** | Confirm **PREVIEW-R GREEN** evidence on branch | **done** @ **`21d5bb4`** |
| **1** | On **`work/home-cluster`**: merge **`origin/main`**（2 chore redeploy commits: AS-B6 notify env disable/activation lineage） | **EXEC pre-step** |
| **2** | Optional: `npm run build` + composite stem tests on integrated tip | **EXEC preflight** |
| **3** | Fast-forward **`main`** to integrated **`work/home-cluster`** tip **or** merge commit if FF blocked | **`ENGINE-DEPLOY-PRODUCTION-EXECUTION`** |
| **4** | **`git push origin main`** only — triggers **Vercel Production** auto-deploy | **EXEC** |
| **5** | Post-deploy HTTP smoke on **`m55-webv2.vercel.app`** | **`ENGINE-DEPLOY-PRODUCTION-R`**（separate result gate） |

**Do not use for first cutover:**

| Path | Why |
|------|-----|
| **Promote preview deployment to Production** | Preview was validated on **branch** context；Production should track **`main`** SHA for rollback clarity |
| **Deploy from local CLI without `main` push** | Breaks GH/Vercel SHA attestation；bypasses merge discipline |
| **Direct push to `work/home-cluster` only** | Does **not** update Production domain |

### C3. Target commit / branch

| Field | Value |
|-------|--------|
| **Source branch** | **`work/home-cluster`** |
| **Minimum runtime-verified SHA** | **`2564061`** |
| **Planning tip（includes docs）** | **`21d5bb4`** |
| **Expected EXEC tip** | **`21d5bb4` + merge(`origin/main`)** → **record exact SHA at EXEC**（must be **≥ `2564061`** on composite v2 code path） |
| **Destination branch** | **`main`** |
| **Pre-merge divergence** | **`work/home-cluster` +29 / `main` +2**（main-only: notify redeploy chores **`5051cbe`**, **`3c80d27`**） |

---

## D. Env / flags（presence only — no values）

| Variable / flag | Required state at Production EXEC | Action in EXEC gate |
|-----------------|-----------------------------------|---------------------|
| **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED`** | **unset or not `true`** | **Do not enable** — legacy fulfillment + NULL `engine_context_json` on existing rows |
| **`M55_OPS_NOTIFY_ENABLED`** | SSOT: Production set **`false`** after **AS-B6-DISABLE-D** | **Do not change** in composite v2 EXEC；**confirm presence only** in Vercel UI at Human checkpoint |
| **`M55_OPS_SLACK_WEBHOOK_URL`** | May be present | **No Slack send test** in EXEC |
| Stripe / Clerk / Supabase | Required for app boot | **Must remain set** — **no secret paste** in SSOT |

**Separate future gates（out of scope for EXEC）：**

| Capability | Gate |
|------------|------|
| v2 fulfillment write ON | **`ENGINE-ENV-GO`** + staging webhook |
| CORE-DTR-VERIFY new unpaid → paid snapshot | **HOLD** — dedicated verify gate only |
| Notify enable | **AS-B6** Human GO |

---

## E. Human GO checklist（before `ENGINE-DEPLOY-PRODUCTION-EXECUTION`)

| # | Item | Owner |
|---|------|-------|
| **GO-01** | Explicit phrase: **`ENGINE-DEPLOY-PRODUCTION-EXECUTION go`** | Human |
| **GO-02** | **PREVIEW-R** verdict **`COMPOSITE_ASTROLOGY_V2_DEPLOY_PREVIEW_R_GREEN`** accepted | Human |
| **GO-03** | Evidence commits on **`origin/work/home-cluster`**: **`2564061`**（fix）, **`21d5bb4`**（PREVIEW-R docs） | Agent/Human |
| **GO-04** | **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED`** will stay **off** on Production | Human |
| **GO-05** | **No** snapshot UPDATE/DELETE for legacy rows | Human |
| **GO-06** | **CORE-DTR-VERIFY** remains **HOLD**（not bundled into deploy） | Human |
| **GO-07** | **No** checkout / payment / webhook replay in EXEC session | Human |
| **GO-08** | Rollback owner identified（Vercel → previous Ready deployment） | Human |
| **GO-09** | `origin/main` merge integration plan accepted（§C2 step 1） | Human |
| **GO-10** | Storefront frozen pages policy unchanged（`/`, `/dtr/lp`, `/legal/*` — no drive-by edits in EXEC） | Human |

---

## F. Production smoke checklist（post-deploy — `ENGINE-DEPLOY-PRODUCTION-R`)

**Host:** **`https://m55-webv2.vercel.app`**（Production）。**Method:** anonymous `fetch` unless noted.

| # | Path / check | Expected |
|---|--------------|----------|
| **S-01** | `/` | **200**；no fatal error page |
| **S-02** | `/core` | **200**；no fatal |
| **S-03** | `/dtr` | **200** |
| **S-04** | `/dtr/lp` | **200** |
| **S-05** | `/my` | **200**（signed-out Clerk shell OK） |
| **S-06** | `/dtr/core` unauthenticated | **redirect / fail-closed** → **`/dtr/lp`**（not open core） |
| **S-07** | Vercel Production deployment SHA | **matches EXEC recorded tip** |
| **S-08** | Build status | **Ready / success** |
| **S-09** | Signed-in `/my` v2 fields | **Human optional** — birthTime / 時刻不明 / country JP / birthplace |
| **S-10** | Owned `/dtr/core` stored envelope | **Human optional** — **legacy NULL rows must still read legacy path**；no SSR `runDtrEngine` on page（code trace） |
| **S-11** | Checkout button | **not pressed** in smoke gate |

**Fatal heuristic:** `Application error` / `Internal Server Error` in HTML body.

---

## G. Stop conditions（EXEC must abort if）

| ID | Condition |
|----|-----------|
| **PD-01** | Production deploy SHA **≠** EXEC-recorded tip / missing **`2564061`** on code path |
| **PD-02** | **PREVIEW-R GREEN** evidence missing or superseded by RED preview |
| **PD-03** | **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED=true`** discovered without env GO |
| **PD-04** | Vercel Production build **failure** |
| **PD-05** | **S-01–S-06** any **fatal** or unexpected open `/dtr/core` for anonymous |
| **PD-06** | Accidental **checkout / payment / webhook replay** |
| **PD-07** | Plan includes **snapshot UPDATE/DELETE** |
| **PD-08** | **CORE-DTR-VERIFY** mistakenly resumed in same session |
| **PD-09** | Human GO phrase **not** issued |
| **PD-10** | `main` push attempted **without** integrating **`origin/main`** when FF blocked |

---

## H. Rollback plan

| Layer | Action |
|-------|--------|
| **Vercel** | **Instant rollback** to previous **Production Ready** deployment（pre-cutover **`5051cbe`** lineage） |
| **Git** | Revert merge on **`main`** only if rollback insufficient — **separate Human decision**；prefer Vercel rollback first |
| **Flag** | **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED`** remains **off** |
| **DB** | **No rollback required** — schema additive only |
| **Snapshots** | **No UPDATE/DELETE** in rollback |

---

## I. Risk notes（Production-specific）

| Risk | Mitigation |
|------|------------|
| **Existing 6 legacy snapshots** | `engine_context_json` NULL → stored read uses legacy envelope path；**Human spot-check** optional post-deploy |
| **New purchases** | v2 write **off** → fulfillment stays legacy until **ENGINE-ENV-GO** |
| **Profile v2 UI on `/my`** | Deployed with code；incomplete profile still blocks checkout（400） |
| **Client bundle regression** | FIX-B validated on preview @ **`2564061`** |
| **main / branch divergence** | Merge **`origin/main`** before FF（§C2） |

---

## J. Next Gate

| Gate | When |
|------|------|
| **`ENGINE-DEPLOY-PRODUCTION-EXECUTION`** | After **Human GO** checklist **GO-01–GO-10** |
| **`ENGINE-DEPLOY-PRODUCTION-R`** | After Production deploy **Ready** — smoke §F |
| **`ENGINE-DEPLOY-PRODUCTION-EXECUTION-COMMIT`** | If EXEC produces docs-only result on **`main`** |
| **`ENGINE-ENV-GO`** | Only if enabling v2 fulfillment write later |

**Explicitly not next:** CORE-DTR-VERIFY execution；Production fulfillment flag ON；checkout/payment test.

---

## K. Evidence chain（read-only pointers）

| Phase | Verdict | Evidence |
|-------|---------|----------|
| VERIFY-A-EXEC | GREEN | `M55-EVID-20260521-5Z-I-V-ENGINE-VERIFY-A-EXEC-…` |
| DEPLOY-PRECHECK | PREVIEW_ONLY | `M55-EVID-20260521-5Z-I-V-ENGINE-DEPLOY-PRECHECK-001` |
| PREVIEW-R | GREEN | `M55-EVID-20260521-5Z-I-V-ENGINE-DEPLOY-PREVIEW-R-001` |
| PREVIEW-R-COMMIT | **`21d5bb4`** | pushed `origin/work/home-cluster` |
| **This plan** | PLANNING GREEN | **`M55-EVID-20260521-5Z-I-V-ENGINE-DEPLOY-PRODUCTION-PLANNING-001`** |

---

## L. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Initial Production deploy plan after PREVIEW-R |
