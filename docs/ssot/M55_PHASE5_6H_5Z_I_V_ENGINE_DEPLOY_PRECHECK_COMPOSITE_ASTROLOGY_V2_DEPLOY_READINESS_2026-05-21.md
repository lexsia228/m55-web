# Phase 5-6H-5Z-I-V-ENGINE-DEPLOY-PRECHECK — Composite v2 deploy readiness（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-DEPLOY-PRECHECK** |
| **Title** | **Composite astrology v2 deploy precheck** |
| **Classification** | **Category 1 / deploy readiness / docs-only / no deploy** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_DEPLOY_PRECHECK_READY_FOR_PREVIEW_ONLY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-DEPLOY-PRECHECK-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Code tip** | **`c8ce038`**（VERIFY-A-EXEC-COMMIT） |

**Read-only precheck.** No deploy, redeploy, main push, checkout, DB write, env change, or CORE-DTR-VERIFY resume.

---

## B. Deploy readiness classification

| Tier | Label | Meaning |
|------|-------|---------|
| **Code + local verify** | **GREEN** | VERIFY-A-EXEC **28/28**；matrix JSON **GREEN**；`c8ce038` on `origin/work/home-cluster` |
| **Branch preview deploy** | **READY** | Recommended **next** deploy route |
| **Production release** | **NOT READY** | No immediate Production cutover；`main` 未マージ；runtime smoke 未実施 |
| **Production adequacy (release)** | **RE-EVALUABLE, NOT ASSERTED** | Local VERIFY-A GREEN は **release 承認ではない** |

**Overall verdict:** **`COMPOSITE_ASTROLOGY_V2_DEPLOY_PRECHECK_READY_FOR_PREVIEW_ONLY`**

---

## C. Git / branch（read-only）

| Check | Result |
|-------|--------|
| Current branch | **`work/home-cluster`** |
| HEAD (full) | **`c8ce0385fa3333d8c2f2a8e86a2f3be4765c597f`** |
| HEAD (short) | **`c8ce038`** |
| `origin/work/home-cluster` | **0 ahead / 0 behind** — tip **`c8ce038`** |
| **main push** | **no**（本 Gate では未実施） |
| vs `origin/main` | **`work/home-cluster` +26 / -2** commits |

**Recent chain on `work/home-cluster`:**

```text
c8ce038 docs: record composite astrology v2 verification
b93a776 docs: plan composite astrology v2 verification
f5f26e2 feat: read dtr reports from stored envelopes
1675cf4 feat: implement composite astrology v2 through checkout metadata
```

**`origin/main` tip（参考）:** `5051cbe` — notify env disable redeploy（composite v2 **未含む**）

---

## D. Vercel deploy target recommendation

| Option | Recommendation | Rationale |
|--------|----------------|-----------|
| **Branch preview deploy** | **YES — next Gate** | Isolates **`work/home-cluster` @ `c8ce038`**；no `main` merge required；stored envelope + checkout gate smoke **after** deploy |
| **Production deploy（即時）** | **NO** | Runtime 未確認；fulfillment flag 方針未 GO；CORE-DTR-VERIFY **HOLD**；legacy snapshot 6 行の挙動は preview で先に確認 |
| **Production planning** | **Later** | **`ENGINE-DEPLOY-PRODUCTION-PLANNING`** after preview GREEN + Human GO + optional `main` FF |

**Why not Production first:**

1. **Runtime未反映** — local GREEN ≠ Production behavior.
2. **`/dtr/core` stored envelope** — needs **post-deploy** read-path smoke（owned user + snapshot row）.
3. **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED`** — must stay **off** until separate env GO；accidental Production enable risks wrong v2 writes.
4. **Checkout profile gate** — deploy 後も **v2 incomplete → block**；staging purchase は **別 Gate**。
5. **`main` divergence** — Production 慣行は `main` 経由；branch preview で先に検証する。

**Registry reference（label only）:** Primary UI host **`m55-webv2.vercel.app`** per prior SSOT — preview URL は Vercel branch deployment から Human 確認（本 Gate では未発行）。

---

## E. Env / flags（presence only — no values）

| Variable / flag | Code default | Deploy note |
|-----------------|--------------|-------------|
| **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED`** | **off**（`=== 'true'` only） | **Do not enable** in preview without **ENGINE-ENV-GO** gate；legacy fulfillment 維持 |
| **`M55_OPS_NOTIFY_ENABLED`** | SSOT label **`false`** on Production after AS-B6-DISABLE-D | **Runtime on `main` Production** expected **disabled**；**preview env snapshot unknown** until Vercel UI read at deploy — **record presence only, not values** |
| Stripe / Clerk / Supabase secrets | required for app | **Do not paste** in SSOT；confirm **set** in Vercel at deploy gate |

**Required Human decisions before v2 purchase path:**

| Decision | Gate |
|----------|------|
| Enable v2 fulfillment write | **Separate env GO** + staging webhook test |
| Enable notify | **AS-B6** track — **out of scope** for composite v2 preview |
| Production cutover | **ENGINE-DEPLOY-PRODUCTION-PLANNING** |

---

## F. Runtime risk inventory

| Risk | Status | Mitigation |
|------|--------|------------|
| v2 code **not on Production runtime** | **yes** | Branch preview deploy |
| DB schema **Production DDL applied** | **yes**（B3-D-R：N=6，legacy NULL 6/6） | No SQL in deploy gate |
| Existing snapshots **legacy** | **yes** | GX-10 local pass；**preview** must confirm `/dtr/core` read |
| New purchases v2 envelope | **blocked at runtime** until flag on | Flag stays off in preview |
| Checkout **composite_profile_incomplete** | **in code** | Post-deploy: incomplete profile → 400 |
| Calendar bundle **in repo** | **yes** | verify script in CI/local |
| Silent JDN v2 fallback | **not in VERIFY-A** | Re-run matrix post-deploy optional |

**Post-deploy verification（別 Gate — not DEPLOY-PRECHECK）：**

- `/dtr/core` opens with **stored** envelope（owned + snapshot）
- `/dtr` owned shelf stem from snapshot
- `/api/purchase/checkout` returns **400** when profile incomplete
- Calendar load no boot failure

---

## G. Stop conditions（deploy must not proceed if）

| ID | Condition |
|----|-----------|
| **SD-01** | VERIFY-A results **not** on branch tip（JSON / `engine-verify-matrix.ts` missing at `c8ce038`） |
| **SD-02** | Branch tip **≠** `c8ce038` / not pushed to `origin/work/home-cluster` |
| **SD-03** | Human intends **Production** deploy without preview smoke |
| **SD-04** | **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED=true`** set without env GO |
| **SD-05** | Unchecked **secret** requirement（Stripe/Clerk/Supabase unset on preview） |
| **SD-06** | **CORE-DTR-VERIFY** resumed by mistake |
| **SD-07** | **GX-01** or **GX-10** RED on re-run before deploy |
| **SD-08** | Plan to **UPDATE/DELETE** existing snapshots for “fix” |

**Precheck session:** **SD-01** and **SD-02** — **clear**. **SD-03–08** — **Human discipline** at next gate.

---

## H. Preconditions satisfied（this precheck）

| Item | Status |
|------|--------|
| VERIFY-A-EXEC-COMMIT | **GREEN** @ **`c8ce038`** |
| B1–B6 + VERIFY chain on branch | **present** |
| Production DDL | **applied**（additive only） |
| Local matrix JSON | `docs/audit/ENGINE_VERIFY_MATRIX_RESULTS_20260521.json` |
| CORE-DTR-VERIFY | **HOLD**（unchanged） |

---

## I. No-mutation boundary

| Boundary | Status |
|----------|--------|
| deploy / redeploy | **no** |
| main push | **no** |
| checkout / payment / webhook | **no** |
| Production DB / SQL | **no** |
| env change | **no** |
| snapshot UPDATE/DELETE | **no** |
| CORE-DTR-VERIFY restart | **no** |

---

## J. Next gate

| Priority | Gate | Scope |
|----------|------|-------|
| **1（推奨）** | **ENGINE-DEPLOY-PREVIEW** | Deploy **`work/home-cluster` @ `c8ce038`** to Vercel **preview** only；post-deploy smoke（stored envelope read, checkout block, calendar boot） |
| **2** | **ENGINE-DEPLOY-PRODUCTION-PLANNING** | After preview GREEN + Human GO：`main` merge strategy, Production env, flag policy |
| **3** | Staging purchase / GX-11 live | Flag on + webhook — **not** with preview flag off only |

**Do not** label Production **release-ready** until preview runtime smoke + explicit Human sign-off.
