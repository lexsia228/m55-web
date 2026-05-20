# Phase 5-6H-5Z-I-V-AS-C3 — Static/local AI safety review gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C3** |
| **Title** | **Static/local AI safety review** |
| **Classification** | **Category 1 / static-local safety review / no deploy / no external mutation** |
| **Verdict** | **`AI_PROMPT_SAFETY_STATIC_LOCAL_REVIEW_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-C3-STATIC-LOCAL-AI-SAFETY-REVIEW-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C2** | **`AI_PROMPT_SAFETY_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C2-AI-PROMPT-SAFETY-IMPLEMENTATION-EXECUTION-001`** | **`bff147e`** |

| AS-C2 deliverables | `m55AiSafetyPolicy.ts`；consult/reply guards；footer disclaimer；tsc PASS；selfcheck 8/8 |
| **Deploy** | **not performed** |

---

## C. Files reviewed

| Path | Role |
|------|------|
| `lib/m55/ai/m55AiSafetyPolicy.ts` | Shared classifier + messages + system instruction |
| `lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs` | Local matrix |
| `app/api/room/core/send/route.ts` | Consult guard + prompt prefix |
| `app/api/reply/generate/route.ts` | Pre-DB `SAFETY_BLOCKED` |
| `lib/m55/reply/stubReplyGenerator.ts` | Future LLM comment |
| `lib/m55/dtrEngine.ts` | Deterministic templates |
| `app/_components/SiteFooter.tsx` | JA disclaimer |
| `app/legal/terms/page.tsx` | Medical/legal/investment disclaimer |
| `00_PRIMARY_ACTIVE_LAW/M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md` | Consult authority |
| `docs/ssot/M55_REPLY_JSON_SCHEMA_v1.md` | Reply structure |
| AS-C / AS-C1 / AS-C2 SSOT | Planning + execution context |

---

## D. Safety review result

### Shared policy

| Check | Result |
|-------|--------|
| **Categories** | **PASS** — medical, legal, financial, self_harm, violence_illegal, emergency, deterministic_prediction, privacy_invasive, reply_scope_offtopic, jailbreak |
| **Actions** | **PASS** — allow, refuse, redirect, escalate, block |
| **Tone** | **PASS** — 生活語；専門窓口案内；非羞恥 |
| **Safe messages** | **PASS** — no product claims using 必ず/絶対/死ぬ/治る/儲かる as user outcomes |
| **reply_scope_offtopic** | **PASS** — `surfaces: ['reply']` only |
| **jailbreak** | **PASS** → **block** |
| **self_harm / emergency** | **PASS** → **escalate**（crisis message；not mere refuse） |

### Consult route

| Check | Result |
|-------|--------|
| Classification before LLM | **PASS** — lines 114–124 before `getSupabaseAdmin` / OpenAI |
| Blocked → no LLM | **PASS** — early `return` 422 |
| Response shape | **PASS** — `{ error: 'blocked', safeMessage }` preserved |
| DB expansion | **PASS** — no new persistence on block |
| Ticket consumption | **PASS** — block before wallet/insert |
| System prompt prefix | **PASS** — `buildM55AiSafetySystemInstruction('consult')` on allowed path |
| Auth | **PASS** — unchanged |

### Reply route

| Check | Result |
|-------|--------|
| Input scope | **PASS** — theme + subquestions + free_text |
| Pre-session/RPC | **PASS** — safety at 224–242 before `const db` |
| Off-scope | **PASS** → redirect message（code `SAFETY_BLOCKED`） |
| Normal deepening | **PASS** — T2 allow |
| Ticket/wallet | **PASS** — no change to RPC consumption logic |
| Future LLM | **PASS** — stub comment + route-level guard before generation |

### DTR deterministic

| Check | Result |
|-------|--------|
| LLM call | **none** — `runDtrEngine` template only |
| Blocking unsafe phrases | **none found** — no 診断/寿命/死ぬ/治る/儲かる/勝訴 in grep |
| Framing | **PASS** — tendency / load / 傾向 / 扱い方 |
| Copy polish（non-blocking） | `必ず` appears in **lifestyle ritual** context（e.g. 回復の儀式）；`投資` as **quality-effort** metaphor — optional later copy polish gate；**not** medical/financial advice |

### Public copy

| Check | Result |
|-------|--------|
| SiteFooter JA | **PASS** — not medical/legal/investment advice |
| terms / privacy / tokushoho | **PASS** — aligned disclaimers |
| Overclaim | **PASS** — no 100% safe / guaranteed outcome |

### Future LLM output sanitizer gap

| Item | Status |
|------|--------|
| Reply LLM JSON post-generation scan | **Not implemented** — required before production LLM enable |
| Consult LLM output scan | **Not implemented** — input guard + system prompt only |
| Stub path | **No LLM output risk** |
| Follow-up | **AS-C4** planning / **AS-C5** monitoring alignment |

---

## E. Test result summary

| Command | Result |
|---------|--------|
| `npm run lint` | **N/A** — script absent |
| `npx tsc --noEmit -p tsconfig.json` | **PASS** |
| `node lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs` | **PASS 10/10**（AS-C3 expanded T1–T10） |

| Case | Expected | Actual |
|------|----------|--------|
| T1 normal consult | allow | allow |
| T2 normal reply | allow | allow |
| T3 medical | refuse | refuse |
| T4 investment | refuse | refuse |
| T5 legal | refuse | refuse |
| T6 self-harm | escalate | escalate |
| T7 death prediction | refuse | refuse |
| T8 reply off-scope | redirect | redirect |
| T9 jailbreak | block | block |
| T10 privacy | refuse | refuse |

---

## F. Residual gaps

| Gap | Severity | Next |
|-----|----------|------|
| DTR `必ず` ritual phrasing polish | **low** | Optional copy gate |
| Authenticated E2E | **not run** | AS-C4 or manual staging |
| LLM output-side sanitizer | **medium** before LLM | AS-C4 / pre-LLM-enable gate |
| Production verification | **not run** | AS-C4 |
| **Deploy** | **not authorized** | Human GO required |

---

## G. Decision

| Statement | Value |
|-----------|--------|
| **Static/local AI safety review** | **GREEN** |
| **Deploy** | **unauthorized** |
| **Next** | **`5Z-I-V-AS-C4`** or **`AS-B1-R`** if paid traffic imminent |
| **AX-PROD** | **no** |
| **AL** | **no** |
| **Full normal dev flow** | **NOT released** |

---

## H. No deploy / no external mutation statement

- **No** deploy / redeploy
- **No** env / model / provider change
- **No** Production DB connection
- **No** DB write
- **No** SQL
- **No** Stripe / webhook / checkout / payment
- **No** Clerk / auth change
- **No** notification integration
- **No** raw key / secret / user_id / email / session / Stripe ID recorded
- **No** **AL / AL-PRE**
- **No** full normal dev flow release

---

## I. Tracks that remain separate

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

## J. Next phase

| Priority | Gate |
|----------|------|
| **Recommended** | **`5Z-I-V-AS-C4`** — Production-safe AI safety verification **planning** / no deploy |
| **Alternative** | **`5Z-I-V-AS-B1-R`** — Manual failed_fulfillments counts-only polling if paid test imminent |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-C3-STATIC-LOCAL-AI-SAFETY-REVIEW-001`** | **本条** |
