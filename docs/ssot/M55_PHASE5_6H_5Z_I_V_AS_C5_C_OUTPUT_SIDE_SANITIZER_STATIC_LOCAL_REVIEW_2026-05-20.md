# Phase 5-6H-5Z-I-V-AS-C5-C — Output-side sanitizer static/local review gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C5-C** |
| **Title** | **Output-side sanitizer static/local review** |
| **Classification** | **Category 1 / static-local review / docs-only / no deploy / no external mutation** |
| **Verdict** | **`OUTPUT_SIDE_SANITIZER_STATIC_LOCAL_REVIEW_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-C5-C-OUTPUT-SIDE-SANITIZER-STATIC-LOCAL-REVIEW-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**Classification:** Category 1 — **no code change** in this gate.** **Deploy:** **no**.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C5-B** | **`OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** | **`M55-EVID-20260520-5Z-I-V-AS-C5-B-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-EXECUTION-001`** | **`ef6d828`** |
| **AS-C5-A** | **`OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-C5-A-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-PLAN-001`** | **`a24ba46`** |
| **AS-C3** | **`AI_PROMPT_SAFETY_STATIC_LOCAL_REVIEW_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C3-STATIC-LOCAL-AI-SAFETY-REVIEW-001`** | **`f631da9`** |

**AS-C5-B deliverables reviewed:** `m55AiOutputSanitizer.ts`；`m55AiOutputSanitizer.selfcheck.mjs`；consult pre-insert guard；reply pre-RPC guard。

---

## C. Files reviewed

| Path | Role |
|------|------|
| `lib/m55/ai/m55AiOutputSanitizer.ts` | Output-side text + reply JSON sanitizer |
| `lib/m55/ai/m55AiOutputSanitizer.selfcheck.mjs` | O1–O12 local matrix |
| `lib/m55/ai/m55AiSafetyPolicy.ts` | Shared classifier + safe messages（reused） |
| `lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs` | Input-side T1–T10 matrix |
| `lib/m55/reply/replyPayload.zod.ts` | `replyPayloadV11Schema` validation |
| `lib/m55/reply/stubReplyGenerator.ts` | Fallback JSON stub base |
| `app/api/room/core/send/route.ts` | Consult output guard（post-`clampOutput`） |
| `app/api/reply/generate/route.ts` | Reply output guard（pre-schema/RPC） |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_C5_B_OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_EXECUTION_2026-05-20.md` | Implementation context |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_C5_A_OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_PLANNING_2026-05-20.md` | Planning alignment |
| `docs/ssot/M55_REPLY_JSON_SCHEMA_v1.md` | Reply field authority |
| `00_PRIMARY_ACTIVE_LAW/M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md` | Consult safety authority |

**Code mutation in AS-C5-C:** **none**.

---

## D. Static review result

### Sanitizer module（`m55AiOutputSanitizer.ts`）

| Check | Result |
|-------|--------|
| **Stateless / no side effects** | **PASS** — no `process.env`；no network；no DB；no provider SDK；no ticket mutation |
| **Policy reuse** | **PASS** — `classifyM55AiSafetyInput` + `safeMessageForCategory` + `buildGenericRefusalMessage` |
| **Exports** | **PASS** — `sanitizeM55AiTextOutput`；`sanitizeM55ReplyJsonOutput`；`buildM55SafeFallbackReplyJson`；`isConsultOutputSafetyBlocked` |
| **Actions** | **PASS** — allow, sanitize, refuse, redirect, escalate, block |
| **Fail-closed** | **PASS** — catch → generic refusal / fallback JSON |
| **Raw ID / secret exposure** | **PASS** — O12；no policy leakage in user-visible strings |
| **Tone** | **PASS** — 生活語；DTR-grounded fallback；no medical/legal/financial concrete advice in fallback |
| **Banned product language** | **PASS** — no ranking/scores/% in sanitizer |

### Reply JSON sanitizer（Primary）

| Check | Result |
|-------|--------|
| **Field walk** | **PASS** — explicit `REPLY_TEXT_FIELDS` + `tone_label` + `followup_prompts` |
| **Per-field text sanitize** | **PASS** — delegates to `sanitizeM55AiTextOutput` |
| **block / escalate** | **PASS** → full `buildM55SafeFallbackReplyJson` |
| **Schema validation** | **PASS** — `replyPayloadV11Schema.safeParse` after field sanitize |
| **Schema fail / theme mismatch** | **PASS** → fallback JSON |
| **Safe payload unchanged** | **PASS** — O11；`fallbackUsed` only when fields/actions differ |
| **RPC / DB inside module** | **PASS** — none |

### Consult text sanitizer（Secondary）

| Check | Result |
|-------|--------|
| **Placement** | **PASS** — after `clampOutput`（L217）；before `consult_messages.insert`（L243） |
| **Block semantics** | **PASS** — `isConsultOutputSafetyBlocked` → non-`allow` → 422 |
| **Response shape** | **PASS** — `{ error: 'blocked', safeMessage }` preserved |
| **DB / ticket** | **PASS** — early return；no batch insert；no wallet consume on block path |
| **Input guard preserved** | **PASS** — AS-C2 classification before LLM unchanged |
| **Auth** | **PASS** — unchanged |

### Reply route integration

| Check | Result |
|-------|--------|
| **Placement** | **PASS** — after `generateStubReplyPayload`；before `replyPayloadV11Schema` + RPC |
| **Sanitized payload to schema** | **PASS** — `outputSanitized.sanitizedJson` |
| **Hard failure path** | **PASS** — `OUTPUT_SAFETY_FAILED` 422 when `!ok` |
| **Input guard preserved** | **PASS** — AS-C2 `classifyM55AiSafetyInput` before generation unchanged |
| **Payment / auth** | **PASS** — no changes to checkout/auth paths |
| **Future LLM** | **PASS** — same hook point documented in AS-C5-B |

---

## E. Test result summary

| Command | Result |
|---------|--------|
| `npm run lint` | **N/A** — no lint script in `package.json`；storefront-limited lint policy unchanged |
| `npx tsc --noEmit` | **PASS** |
| `node lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs` | **PASS 10/10** |
| `npx tsx lib/m55/ai/m55AiOutputSanitizer.selfcheck.mjs` | **PASS 12/12**（O1–O12） |

| Case | Expected | Actual |
|------|----------|--------|
| O1 safe reflective | allow | allow |
| O2 medical | refuse/sanitize | refuse |
| O3 investment | refuse/sanitize | refuse |
| O4 legal | refuse/sanitize | refuse |
| O5 death/fate certainty | refuse/sanitize | refuse |
| O6 self-harm/emergency | escalate | escalate |
| O7 jailbreak/policy leak | block | block |
| O8 off-scope reply | redirect | redirect |
| O9 malformed/unsafe JSON | fallback JSON | fallback |
| O10 生活語 tone | maintained | PASS |
| O11 safe reply unchanged | unchanged | PASS |
| O12 no raw IDs/secrets | no leak | PASS |

**Production verification:** **not run**。** **Authenticated E2E:** **not run**.

---

## F. Residual gaps

| Gap | Severity | Next |
|-----|----------|------|
| **Deploy** | **blocking for Production guard** | **AS-C6**（Human GO） |
| **Production verification** | **not re-run** for output guard | Post-deploy checkpoint |
| **Authenticated consult/reply E2E** | **not run** | Staging after deploy |
| **Input + output guards on Production** | **repo-only until deploy** | AS-C6 |
| **LLM reply JSON path** | **stub today** | Output hook ready for future LLM |
| **Selfcheck runner** | **requires `npx tsx`** for nested TS imports | Documented in AS-C5-B |

---

## G. Decision

| Statement | Value |
|-----------|--------|
| **Output-side sanitizer static/local review** | **GREEN** |
| **AS-C5-B commit reviewed** | **`ef6d828`** |
| **Deploy** | **no** |
| **Production auth compliance** | **RED** under **AS** exception |
| **AX-PROD** | **no** |
| **AL** | **no** |
| **Repair** | **no** |
| **Full normal dev flow** | **NOT released** |

---

## H. No deploy / no external mutation statement

- **No** deploy / redeploy
- **No** env / model / provider change
- **No** Production DB connection / SQL / migration
- **No** DB write
- **No** Stripe / webhook / checkout / payment
- **No** Clerk / auth change
- **No** notification integration
- **No** repair / repair runner
- **No** raw key / secret / user_id / email / session / Stripe ID in SSOT
- **No** **AL / AL-PRE** / **AX-PROD**
- **No** full normal dev flow release
- **No** code change in AS-C5-C

---

## I. Tracks that remain separate

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
| **Deploy** | **AS-C6** or later |
| **Full normal dev flow** | **NOT released** |

---

## J. Next phase

| Recommended | **`5Z-I-V-AS-C6`** — Prompt safety + output sanitizer **deploy planning**（Category 1；Human GO for execution） |
|-------------|------------------------------------------------------------------------------------------------------------------|

| Alternative | **`AS-B1-MONITOR`** — paid-test / traffic checkpoint |

| Ops | Re-run **AS-C4-R** posture check **after** deploy when Human GO authorizes |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-C5-C-OUTPUT-SIDE-SANITIZER-STATIC-LOCAL-REVIEW-001`** | **本条** |
