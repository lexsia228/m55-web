# Phase 5-6H-5Z-I-V-AS-C6-D-R — Import path fix + redeploy execution gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C6-D-R** |
| **Title** | **Import path fix + redeploy execution** |
| **Classification** | **Category 2 / import path code fix + redeploy execution / no env / no DB / no payment / no auth mutation** |
| **Verdict** | **`PROMPT_SAFETY_OUTPUT_SANITIZER_IMPORT_FIX_REDEPLOY_GREEN_NO_ENV_NO_DB`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-C6-D-R-IMPORT-PATH-FIX-REDEPLOY-EXECUTION-001`** |
| **Date** | **2026-05-20** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Vercel project** | **`m55-webv2`** |

**Human GO:** **`5Z-I-V-AS-C6-D-R go`**

---

## B. Prior failure reference

| Phase | Verdict | Evidence | Commit / SHA |
|-------|---------|----------|--------------|
| **AS-C6-D** | **`PROMPT_SAFETY_OUTPUT_SANITIZER_DEPLOY_EXECUTION_FAILED_NO_ENV_NO_DB`** | **`M55-EVID-20260520-5Z-I-V-AS-C6-D-…-001`** | result docs **`25d6b3b`** |
| **Failed merge** | Vercel build failed | — | **`7bcebe7`** |
| **Rollback / last Ready** | Production served | — | **`c2b9ab1`** |
| **Failed deploy label** | prefix only | — | **`dpl_FSJYBvBh5…`** |

**Failure cause:** `m55AiOutputSanitizer.ts` used **`.js` extension** relative imports；Next.js webpack could not resolve them.** **`tsc`** passed；**`npm run build`** failed.

---

## C. Fix summary

| File | Change |
|------|--------|
| **`lib/m55/ai/m55AiOutputSanitizer.ts`** | Removed **`.js`** from 4 relative imports |

| Import before | Import after |
|---------------|--------------|
| `./m55AiSafetyPolicy.js` | `./m55AiSafetyPolicy` |
| `../reply/replyPayload.zod.js` | `../reply/replyPayload.zod` |
| `../reply/types.js` | `../reply/types` |
| `../reply/stubReplyGenerator.js` | `../reply/stubReplyGenerator` |

| Constraint | Status |
|------------|--------|
| **Behavior refactor** | **no** |
| **Other AI safety files** | **no** `.js` imports found in `lib/m55/ai` besides sanitizer |
| **Env / config** | **unchanged** |
| **DB / Stripe / Clerk / auth** | **unchanged** |

**Code fix commit:** **`4efd4af`** — `fix: make ai output sanitizer imports next compatible`

---

## D. Pre-redeploy checks

| Check | Result |
|-------|--------|
| **`npx tsc --noEmit`** | **PASS** |
| **input safety selfcheck** | **10/10 PASS** |
| **output sanitizer selfcheck** | **12/12 PASS**（`npx tsx`） |
| **`npm run build`** | **PASS** |
| **`npm run lint`** | **N/A** |
| **Working tree clean** | **yes**（before fix commit） |
| **Target commit** | **`4efd4af`** |
| **Rollback candidate** | **`c2b9ab1`**（pre-success Production Ready） |

---

## E. Redeploy execution

| Field | Value |
|-------|--------|
| **Deploy path** | **Option 2** — fast-forward **`main`** with **`work/home-cluster`** |
| **Source branch** | **`work/home-cluster`** @ **`4efd4af`** |
| **Destination branch** | **`main`** |
| **Pre-retry `main` HEAD** | **`7bcebe7`** |
| **Pushed `main` commit** | **`4efd4af`** |
| **Vercel Production status** | **Ready** — `success` / “Deployment has completed” |
| **Deployment safe label** | **`46qzPcHff…`**（Vercel deployment id prefix from status URL） |
| **Production running SHA** | **`4efd4af`**（GitHub Vercel status on pushed commit） |
| **AS-C2 included** | **yes**（ancestor **`bff147e`**） |
| **AS-C5-B included** | **yes**（ancestor **`ef6d828`**） |
| **AS-C5-C docs included** | **yes**（ancestor **`dd31ea3`**） |
| **Env changed** | **no** |
| **DB changed** | **no** |
| **Stripe / payment** | **no** |
| **Clerk / auth** | **no** |

---

## F. Scope confirmation

| Item | Status |
|------|--------|
| **Input-side guard on Production** | **yes** — in deployed build |
| **Output-side sanitizer on Production** | **yes** — in deployed build |
| **Footer/disclaimer** | **included** in merge ancestry |
| **Full normal dev flow** | **NOT released** |
| **Production auth compliance** | **RED** under **AS** — unchanged |
| **AX-PROD** | **BLOCKED** |
| **AL** | **unauthorized** |
| **No-payment verification** | **not complete** — **AS-C6-V** required |

---

## G. Next gate

| Recommended | **`5Z-I-V-AS-C6-V`** — Post-deploy no-payment safety verification result |
|-------------|------------------------------------------------------------------------|

| Alternative | **`AS-B1-MONITOR`** if paid-test near |

---

## H. No external mutation statement

- **No** env / model / provider change
- **No** Production DB connection / SQL / DB write / migration apply
- **No** Stripe / webhook / checkout / payment
- **No** Clerk / auth change
- **No** notification integration
- **No** repair / repair runner
- **No** raw key / secret / user_id / email / session / Stripe ID in SSOT
- **No** **AL / AL-PRE** / **AX-PROD**
- **No** full normal dev flow release

---

## I. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** — post-deploy check **AS-C6-V** |
| **AC-P6 unpaid** | **GREEN** — post-deploy check **AS-C6-V** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **AS-B1** | **Monitored historical finding** |
| **Automated notification** | **AS-B2/B3** later |
| **Full normal dev flow** | **NOT released** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-C6-D-R-IMPORT-PATH-FIX-REDEPLOY-EXECUTION-001`** | **本条** |
