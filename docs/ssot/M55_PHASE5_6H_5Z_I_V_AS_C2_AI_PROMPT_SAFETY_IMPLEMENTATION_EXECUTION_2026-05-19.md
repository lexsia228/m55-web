# Phase 5-6H-5Z-I-V-AS-C2 — AI prompt safety implementation execution gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C2** |
| **Title** | **AI prompt safety implementation execution** |
| **Classification** | **Category 2 / AI prompt safety implementation / code change allowed / no deploy / no mutation outside repo** |
| **Verdict** | **`AI_PROMPT_SAFETY_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-C2-AI-PROMPT-SAFETY-IMPLEMENTATION-EXECUTION-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Human GO** | **User instructed 次へ進め** |

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C1** | **`AI_PROMPT_SAFETY_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-C1-AI-PROMPT-SAFETY-IMPLEMENTATION-PLAN-001`** | **`fce0fb6`** |

---

## C. Files changed

| Path | Change |
|------|--------|
| `lib/m55/ai/m55AiSafetyPolicy.ts` | **created** — shared classifier + messages + system instruction |
| `lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs` | **created** — local classifier smoke (8 cases) |
| `app/api/room/core/send/route.ts` | shared guard + system instruction prefix |
| `app/api/reply/generate/route.ts` | pre-DB safety block (`SAFETY_BLOCKED`) |
| `lib/m55/reply/stubReplyGenerator.ts` | future LLM comment |
| `app/_components/SiteFooter.tsx` | JA disclaimer alignment |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_C2_AI_PROMPT_SAFETY_IMPLEMENTATION_EXECUTION_2026-05-19.md` | **this doc** |
| `docs/ssot/M55_SYSTEM_SSOT.md` | entry |
| `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md` | §2aL, controls |

**Not changed:** `lib/m55/dtrEngine.ts`（deterministic；AS-C3 copy review）、`app/legal/terms/page.tsx`（既存免責で十分）

---

## D. Implementation summary

### Shared policy module

- **`classifyM55AiSafetyInput(input, { surface })`**
- Categories: medical, legal, financial, self_harm, violence_illegal, emergency, deterministic_prediction, privacy_invasive, reply_scope_offtopic, jailbreak
- Actions: allow / refuse / redirect / escalate / block
- **`buildM55AiSafetySystemInstruction(surface)`** for consult/reply/dtr/general

### Consult route

- Replaced local `HIGH_RISK_PATTERNS` with shared classifier（**surface: consult**）
- Block before DB / LLM — preserves `{ error: 'blocked', safeMessage }` @ 422
- System prompt prefixed with shared safety instruction

### Reply route

- Classify theme + subquestions + free_text **before** session/wallet/RPC
- Returns `{ ok: false, error: { code: 'SAFETY_BLOCKED', message } }` @ 422 — **no ticket consumption path entered**

### DTR

- No template rewrite in AS-C2；deterministic engine unchanged

### Future LLM JSON

- `stubReplyGenerator.ts` documents mandatory `classifyM55AiSafetyInput` call before LLM

### Public copy

- `SiteFooter.tsx` — Japanese disclaimer line added（terms already aligned）

---

## E. Safety behavior summary

| Action | When |
|--------|------|
| **allow** | Normal report-scoped consult / reply deepening |
| **refuse** | medical, legal, financial, violence_illegal, deterministic_prediction, privacy_invasive |
| **redirect** | reply_scope_offtopic（reply surface only） |
| **escalate** | self_harm, emergency |
| **block** | jailbreak |

---

## F. Test / verification summary

| Command | Result |
|---------|--------|
| `npm run lint` | **N/A** — no root `lint` script |
| `npx tsc --noEmit -p tsconfig.json` | **PASS** |
| `node lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs` | **PASS**（8/8） |

### Selfcheck matrix

| Case | Expected |
|------|----------|
| normal consult | allow |
| medical | refuse |
| financial | refuse |
| legal | refuse |
| self-harm | escalate |
| death prediction | refuse |
| off-scope reply | redirect |
| jailbreak | block |

### Gaps for AS-C3

- DTR deterministic template wording audit（no automated test）
- Consult/reply E2E with auth + ownership（manual/staging）
- Output-side LLM sanitizer when reply LLM connects

---

## G. No deploy / no external mutation statement

- **No** deploy / redeploy
- **No** env / model / provider change
- **No** Production DB connection
- **No** DB write in this gate（code only）
- **No** SQL
- **No** Stripe / webhook / checkout / payment
- **No** Clerk / auth change
- **No** notification integration
- **No** raw key / secret / user_id / email / session / Stripe ID recorded
- **No** **AL / AL-PRE**
- **No** full normal dev flow release

---

## H. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **failed_fulfillments polling** | **AS-B1-R** when needed |
| **Automated notification** | **AS-B2/B3** later |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |

---

## I. Next phase

| Recommended | **`5Z-I-V-AS-C3`** Static/local AI safety review |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-C2-AI-PROMPT-SAFETY-IMPLEMENTATION-EXECUTION-001`** | **本条** |
