# Phase 5-6H-5Z-I-V-AS-C6 — Prompt safety + output sanitizer deploy planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C6** |
| **Title** | **Prompt safety + output sanitizer deploy planning** |
| **Classification** | **Category 2 / deploy planning-only / docs-only / no deploy / no external mutation** |
| **Verdict** | **`PROMPT_SAFETY_OUTPUT_SANITIZER_DEPLOY_PLANNING_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-C6-PROMPT-SAFETY-OUTPUT-SANITIZER-DEPLOY-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Vercel project** | **`m55-webv2`** |

**Human GO:** **`AS-C6 Prompt safety + output sanitizer deploy planning go`** — planning only.** **Deploy in AS-C6:** **no**.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C5-C** | **`OUTPUT_SIDE_SANITIZER_STATIC_LOCAL_REVIEW_GREEN_NO_DEPLOY`** | **`M55-EVID-20260520-5Z-I-V-AS-C5-C-OUTPUT-SIDE-SANITIZER-STATIC-LOCAL-REVIEW-001`** | **`dd31ea3`** |
| **AS-C5-B** | **`OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** | **`M55-EVID-20260520-5Z-I-V-AS-C5-B-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-EXECUTION-001`** | **`ef6d828`** |
| **AS-C2** | **`AI_PROMPT_SAFETY_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C2-AI-PROMPT-SAFETY-IMPLEMENTATION-EXECUTION-001`** | **`bff147e`** |
| **AS-C3** | **`AI_PROMPT_SAFETY_STATIC_LOCAL_REVIEW_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C3-STATIC-LOCAL-AI-SAFETY-REVIEW-001`** | **`f631da9`** |
| **AS-C4-R** | **`AI_PROMPT_SAFETY_PRODUCTION_SAFE_VERIFICATION_RESULT_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C4-R-PRODUCTION-SAFE-AI-SAFETY-VERIFICATION-RESULT-001`** | **`36f4bf7`** |

**Repo readiness at planning time:** input guard + output sanitizer **implemented** on **`work/home-cluster`**；**not** on Production until **`AS-C6-D`** with separate deploy GO.

---

## C. Deployment scope candidate

### Future deploy **includes**（code already on branch）

| Component | Commit anchor | Paths |
|-----------|---------------|-------|
| **Input-side AI safety guard** | **`bff147e`**（ancestor of **`ef6d828`**） | `lib/m55/ai/m55AiSafetyPolicy.ts`；`m55AiSafetyPolicy.selfcheck.mjs` |
| **Consult input guard** | same chain | `app/api/room/core/send/route.ts` — `classifyM55AiSafetyInput` before LLM |
| **Reply input guard** | same chain | `app/api/reply/generate/route.ts` — pre-session/RPC `SAFETY_BLOCKED` |
| **Output-side sanitizer** | **`ef6d828`** | `lib/m55/ai/m55AiOutputSanitizer.ts`；`m55AiOutputSanitizer.selfcheck.mjs` |
| **Consult output guard** | **`ef6d828`** | `send/route.ts` — `sanitizeM55AiTextOutput` after `clampOutput`；pre-insert |
| **Reply output guard** | **`ef6d828`** | `reply/generate/route.ts` — `sanitizeM55ReplyJsonOutput` pre-schema/RPC |
| **Public disclaimer** | **`bff147e`** | `app/_components/SiteFooter.tsx`（if not already on Production） |
| **Docs-only commits** | **`dd31ea3`** onward | SSOT only — safe to include；no runtime delta beyond **`ef6d828`** |

**Recommended deploy target commit（execution gate）：** **`ef6d828`** minimum for safety code；**`work/home-cluster` HEAD** at Human GO time if docs-only commits after **`ef6d828`** are acceptable.

### Future deploy **must not include**

| Excluded | Reason |
|----------|--------|
| **Vercel env change** | Not required for guard/sanitizer |
| **model / provider change** | Out of scope |
| **DB migration / SQL** | No schema dependency |
| **Stripe / webhook / checkout / payment** | AS deploy boundary |
| **Clerk / auth correction** | Production auth compliance **RED** — separate track |
| **AX-PROD migration** | **BLOCKED** |
| **repair runner** | **Not authorized** |
| **notification integration** | AS-B2/B3 later |
| **full normal dev flow release** | **NOT released** |

---

## D. Pre-deploy prerequisites

Future **`5Z-I-V-AS-C6-D`** deploy execution may begin **only if all** hold:

| # | Prerequisite |
|---|----------------|
| 1 | **Working tree clean**（no uncommitted safety-path edits） |
| 2 | **Target commit explicitly named**（e.g. **`ef6d828`** or documented HEAD SHA prefix） |
| 3 | **Production deploy target confirmed** — **`m55-webv2`** / **`m55-webv2.vercel.app`** / branch policy agreed |
| 4 | **No env / model / provider change** required for this deploy |
| 5 | **`npx tsc --noEmit`** — **PASS**（recorded AS-C6 planning: **PASS**） |
| 6 | **`node lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs`** — **10/10 PASS** |
| 7 | **`npx tsx lib/m55/ai/m55AiOutputSanitizer.selfcheck.mjs`** — **12/12 PASS** |
| 8 | **`npm run lint`** — **N/A**（no script）；**`lint:ssot`** storefront-only — record status only |
| 9 | **Rollback SHA / deployment ID** captured before promote |
| 10 | **Human explicitly states deploy/redeploy GO** in **`AS-C6-D`**（not implied by AS-C6 planning GO） |
| 11 | **AS-B1-MONITOR baseline** reviewed if paid-test / traffic checkpoint is near（failed_fulfillments historical **7** / 24h **0**） |
| 12 | **Production auth compliance RED** acknowledged — deploy does **not** fix auth |

---

## E. Future deploy execution boundary（`5Z-I-V-AS-C6-D`）

| Rule | Requirement |
|------|-------------|
| **Scope** | Deploy **existing repo changes** only（no new safety feature work in same gate） |
| **Env** | **No** Vercel env add/change/delete |
| **DB** | **No** Production DB connection for gate；**no** SQL；**no** migration apply |
| **Stripe** | **No** webhook replay；**no** checkout；**no** live payment |
| **Clerk / auth** | **No** instance creation；**no** setting change |
| **AX-PROD / AL** | **Not authorized** |
| **Full normal dev flow** | **Not released** |
| **Payment tests** | **Not mixed** into deploy execution |
| **Post-deploy verification** | Separate no-payment gate（§G） |

### Deployment path options（planning — not executed）

| Option | Action | Risk | Notes |
|--------|--------|------|-------|
| **1** | Vercel promote Preview → Production | **medium** | Requires Preview at target commit；explicit GO |
| **2** | Merge **`work/home-cluster`** → **`main`** + push（Vercel Git Production autodeploy） | **medium** | Precedent **`5Z-I-V-AB`**；aligns **`main`** track |
| **3** | Defer | **low** | Guards remain repo-only |

**Recommended for M55 canonical track:** **Option 2** when Human GO — merge then autodeploy；record Production SHA prefix + rollback SHA.

---

## F. Rollback plan

| Step | Action |
|------|--------|
| **Immediate** | Revert Production to **prior Ready deployment**（Vercel rollback）**or** revert merge on **`main`** and redeploy prior SHA — per platform path used in **`AS-C6-D`** |
| **DB rollback** | **Not required** — no migration in scope |
| **Env rollback** | **Not required** — no env change planned |
| **Stop triggers** | Normal consult/reply **blocked too aggressively**；owned DTR path regression；unpaid path regression |
| **Follow-up** | If rollback executed, record **`AS-C6-D-R`** or dedicated rollback result gate |

**Rollback anchor（planning-time label only）：** capture **current Production commit SHA prefix** at start of **`AS-C6-D`** — do not paste full secrets.

---

## G. Post-deploy no-payment verification plan

Execute **after** **`AS-C6-D`** deploy；**no payment**；**no checkout completion**；**no webhook replay**；**no DB repair**.

| # | Check | Method | Pass criterion |
|---|-------|--------|----------------|
| G1 | **Public footer / terms** | Browser GET **`/legal/terms`** + footer on public page | Disclaimer visible；no new forbidden terms |
| G2 | **Consult high-risk input** | API or staging account — medical/jailbreak sample strings | **422** `blocked` + `safeMessage`；no orphan unsafe assistant row |
| G3 | **Consult normal input** | Safe deepening string | **200** path；message persisted |
| G4 | **Reply high-risk input** | Off-scope / medical theme | **422** `SAFETY_BLOCKED` or safe block **before** ticket RPC |
| G5 | **Reply normal stub path** | Valid deepening | **200**；schema-valid payload |
| G6 | **DTR / report pages** | Owned path smoke | **GREEN** posture unchanged |
| G7 | **Unpaid non-owned** | **AC-P6** path | **GREEN** unchanged |
| G8 | **Output sanitizer on Production** | High-risk LLM output fixture（if test account） | Block or safe fallback；no policy leak |
| G9 | **No payment** | Explicit | No checkout；no live charge |
| G10 | **Auth compliance** | Acknowledge | Remains **RED** under AS — deploy does not close |

**Recommended gate label:** **`5Z-I-V-AS-C6-V`** post-deploy verification result（Category 1；no deploy）.

---

## H. Risk register

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Route response shape regression（422 fields） | **medium** | Post-deploy G2–G5 matrix |
| R2 | Normal consult/reply blocked too aggressively | **medium** | T1/T2 + O1/O11 selfcheck；manual safe strings |
| R3 | Fallback JSON schema mismatch at runtime | **low** | `replyPayloadV11Schema` + O9/O11 |
| R4 | Production auth compliance **RED** | **high**（separate） | Do not mix Clerk correction into deploy |
| R5 | AS-C2/C5 never production-verified before deploy | **medium** | **`AS-C6-V`** no-payment verification |
| R6 | No authenticated E2E yet | **medium** | Staging account if available；else API-level |
| R7 | No payment tests in this gate | **low** | Explicit exclusion |
| R8 | Latent runtime-only bug（import/bundler） | **low** | `next build` on CI path before deploy GO |
| R9 | **`work/home-cluster` → `main` merge conflict** | **medium** | Pre-merge diff review gate |
| R10 | Production still lacks output guard until deploy completes | **high**（current） | **`AS-C6-D`** only with explicit GO |

---

## I. Stop conditions

**`AS-C6-D`** must **STOP** if:

| Condition |
|-----------|
| Target commit unclear or not ancestor of branch to deploy |
| Working tree dirty with unreviewed safety edits |
| **`tsc`** or selfcheck fails on target commit |
| Env change required for deploy to work |
| DB migration / SQL requested in same gate |
| Stripe / Clerk / auth change requested in same gate |
| Checkout / live payment / webhook replay requested |
| Raw secrets / full user_id / email / session must be pasted to proceed |
| Human GO for **deploy execution** is ambiguous or conflated with planning GO |
| Production auth compliance treated as GREEN by deploy alone |

---

## J. No-deploy / no external mutation statement

- **No** deploy / redeploy / Vercel Production promote
- **No** env / model / provider change
- **No** Production DB connection / SQL / DB write / migration
- **No** Stripe / webhook / checkout / payment
- **No** Clerk / auth change
- **No** notification integration
- **No** repair / repair runner
- **No** raw key / secret / user_id / email / session / Stripe ID in SSOT
- **No** **AL / AL-PRE** / **AX-PROD**
- **No** full normal dev flow release
- **No** code edit in **AS-C6**（read-only repo review only）

---

## K. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **AS-B1 historical failures** | **Monitored finding** — **AS-B1-MONITOR** at paid-test checkpoints |
| **Automated notification** | **AS-B2/B3** later |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |

---

## L. Next phase

| Priority | Gate | When |
|----------|------|------|
| **Recommended** | **`5Z-I-V-AS-C6-D`** — Deploy execution for prompt safety + output sanitizer | **Only** if Human explicitly says **deploy/redeploy GO** |
| **After deploy** | **`5Z-I-V-AS-C6-V`** — Post-deploy no-payment verification result | After **`AS-C6-D`** |
| **Alternative** | **`5Z-I-V-AS-B1-MONITOR`** | Paid-test / traffic checkpoint near |
| **Alternative** | Thread handoff | If execution thread is heavy |

**AS-C6 does not authorize deploy execution.**

---

## Read-only repo review summary（AS-C6）

| Path | Finding |
|------|---------|
| `app/api/room/core/send/route.ts` | Input guard L119；output sanitizer L217；block before insert |
| `app/api/reply/generate/route.ts` | Input guard L228；output sanitizer L422；pre-RPC |
| `lib/m55/ai/m55AiSafetyPolicy.ts` | Stateless classifier；no env/DB |
| `lib/m55/ai/m55AiOutputSanitizer.ts` | Stateless；reuses policy；no RPC/DB |
| `m55AiSafetyPolicy.selfcheck.mjs` | **10/10** |
| `m55AiOutputSanitizer.selfcheck.mjs` | **12/12**（`npx tsx`） |
| `package.json` | No `lint` script；`lint:ssot` storefront-only |
| `vercel.json` | **Not present** in repo — Vercel Git integration assumed per **`5Z-I-V-AB`** |

| `npx tsc --noEmit` | **PASS** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-C6-PROMPT-SAFETY-OUTPUT-SANITIZER-DEPLOY-PLAN-001`** | **本条** |
