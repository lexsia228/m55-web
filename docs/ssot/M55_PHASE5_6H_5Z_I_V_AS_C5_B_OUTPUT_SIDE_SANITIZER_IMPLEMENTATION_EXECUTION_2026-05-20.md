# Phase 5-6H-5Z-I-V-AS-C5-B — Output-side sanitizer implementation execution gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C5-B** |
| **Title** | **Output-side sanitizer implementation execution** |
| **Classification** | **Category 2 / output-side sanitizer implementation / code change allowed / no deploy / no external mutation** |
| **Verdict** | **`OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-C5-B-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-EXECUTION-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**Human GO:** **`AS-C5-B go`** — Category 2 code change authorized.** **Deploy:** **no**.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C5-A** | **`OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-C5-A-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-PLAN-001`** | **`a24ba46`** |
| **AS-C5** | **`OUTPUT_SIDE_AI_SAFETY_SANITIZER_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-C5-OUTPUT-SIDE-AI-SAFETY-SANITIZER-PLAN-001`** | **`47e98c2`** |

---

## C. Files changed

| File | Change |
|------|--------|
| **`lib/m55/ai/m55AiOutputSanitizer.ts`** | **New** — text + reply JSON sanitizers；fallback builder |
| **`lib/m55/ai/m55AiOutputSanitizer.selfcheck.mjs`** | **New** — O1–O12 fixtures |
| **`app/api/room/core/send/route.ts`** | Output sanitizer before `consult_messages` insert |
| **`app/api/reply/generate/route.ts`** | Output sanitizer before schema + RPC |
| **`docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_C5_B_OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_EXECUTION_2026-05-20.md`** | **本条** |
| **`docs/ssot/M55_SYSTEM_SSOT.md`** | Gate entry |
| **`docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`** | §2aP-B；CONTROL-104 closed |

---

## D. Implementation summary

| Component | Status |
|-----------|--------|
| **`sanitizeM55AiTextOutput`** | Implemented — reuses `classifyM55AiSafetyInput` + `safeMessageForCategory` |
| **`sanitizeM55ReplyJsonOutput`** | Implemented — field walk；`replyPayloadV11Schema`；theme check |
| **`buildM55SafeFallbackReplyJson`** | Implemented — `generateStubReplyPayload` + safe prefix |
| **`isConsultOutputSafetyBlocked`** | Exported — non-`allow` blocks before DB insert |
| **Consult integration** | After `clampOutput`；422 `blocked` + `safeMessage`；**no insert / no wallet consume** on block |
| **Reply integration** | After stub generation；sanitized payload to schema + RPC |
| **Selfcheck** | **12/12 PASS** via `npx tsx` runner |

---

## E. Safety behavior summary

| Action | Behavior |
|--------|----------|
| **allow** | Original text retained（trimmed） |
| **sanitize** | Field-level replacement when tone_label normalized |
| **refuse** | Safe refusal message（medical/legal/financial/etc.） |
| **redirect** | Reply off-scope redirect message |
| **escalate** | Crisis escalation message |
| **block** | Jailbreak block message |
| **fail-closed** | Sanitizer error → generic refusal / fallback JSON |

**Reply JSON:** `block` / `escalate` → full fallback JSON.** **Schema fail** → fallback JSON.** **Theme mismatch** → fallback JSON.

---

## F. Test result summary

| Check | Result |
|-------|--------|
| **`npx tsc --noEmit`** | **PASS** |
| **`node lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs`** | **10/10 PASS** |
| **`npx tsx lib/m55/ai/m55AiOutputSanitizer.selfcheck.mjs`** | **12/12 PASS**（O1–O12） |
| **`npm run lint:ssot`** | **Not run** — scope limited to storefront paths；sanitizer paths out of lint:ssot glob |
| **Production E2E** | **Not run** — no deploy |
| **Authenticated consult/reply E2E** | **Not run** |

---

## G. Residual gaps

| Gap | Notes |
|-----|-------|
| **AS-C5-C** | Static/local sanitizer review still recommended |
| **Deploy** | **AS-C6** or later — input + output guards repo-only until deploy gate |
| **Production verification** | **AS-C4-R** posture unchanged — new output guard **not** on Production until deploy |
| **LLM reply path** | Stub only today — output sanitizer wired for future LLM JSON |
| **Consult edge** | Messages already inserted before wallet consume on success path only — unsafe output now blocked **before** insert |
| **Selfcheck runner** | Requires **`npx tsx`** for TS module graph（documented）；`node --experimental-strip-types` alone insufficient for nested imports |

---

## H. No-deploy / no external mutation statement

- **No** deploy / redeploy
- **No** env / model / provider change
- **No** Production DB connection / SQL / migration
- **No** Stripe / webhook / checkout / payment change
- **No** Clerk / auth change
- **No** notification integration
- **No** repair / repair runner
- **No** raw key / secret / user_id / email / session / Stripe ID in SSOT
- **No** AL / AL-PRE / AX-PROD
- **No** full normal dev flow release

**Route DB behavior:** Unchanged except consult **blocks before insert** on unsafe output（reduces orphan unsafe assistant rows）.

---

## I. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **AS-B1** | **Monitored historical finding** — **AS-B1-MONITOR** cadence |
| **Automated notification** | **AS-B2/B3** |
| **Deploy** | **AS-C6** or later |
| **Full normal dev flow** | **NOT released** |

---

## J. Next phase

| Recommended | **`5Z-I-V-AS-C5-C`** — Output-side sanitizer static/local review |
|-------------|---------------------------------------------------------------|

| Alternative | **`AS-C6`** — Prompt safety deploy planning（Human GO） |

| Ops | **`AS-B1-MONITOR`** when paid-test near |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-C5-B-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-EXECUTION-001`** | **本条** |
