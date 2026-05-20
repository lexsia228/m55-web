# Phase 5-6H-5Z-I-V-AS-C5 — Output-side AI safety sanitizer planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C5** |
| **Title** | **Output-side AI safety sanitizer planning** |
| **Classification** | **Category 1 / output-side AI safety sanitizer planning / docs-only / no deploy / no code change / no external mutation** |
| **Verdict** | **`OUTPUT_SIDE_AI_SAFETY_SANITIZER_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-C5-OUTPUT-SIDE-AI-SAFETY-SANITIZER-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |

**AS-C5 plans output-side sanitizer only.** No implementation, no deploy, no code change in this gate.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C4-R** | **`AI_PROMPT_SAFETY_PRODUCTION_SAFE_VERIFICATION_RESULT_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C4-R-PRODUCTION-SAFE-AI-SAFETY-VERIFICATION-RESULT-001`** | **`36f4bf7`** |
| **AS-C4** | **`AI_PROMPT_SAFETY_PRODUCTION_SAFE_VERIFICATION_PLANNING_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C4-PRODUCTION-SAFE-AI-SAFETY-VERIFICATION-PLAN-001`** | **`f7e2f8f`** |
| **AS-C3** | **`AI_PROMPT_SAFETY_STATIC_LOCAL_REVIEW_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C3-STATIC-LOCAL-AI-SAFETY-REVIEW-001`** | **`f631da9`** |
| **AS-C2** | **`AI_PROMPT_SAFETY_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C2-AI-PROMPT-SAFETY-IMPLEMENTATION-EXECUTION-001`** | **`bff147e`** |

| AS-C4-R residual | **output-side sanitizer not implemented** → **AS-C5** |
| **Input-side** | **`lib/m55/ai/m55AiSafetyPolicy.ts`** — local/static GREEN；**not deployed** |
| **AS-C5** | **Does not implement sanitizer** |

---

## C. Why this gate exists

| Driver | Detail |
|--------|--------|
| **Input guard alone is insufficient** | Safe user input does not guarantee safe LLM output |
| **LLM risk modes** | Medical/legal/financial advice；deterministic overclaim；self-harm content；privacy leakage；jailbreak residue |
| **User exposure point** | Output is what users read — must be classified **after generation, before return** |
| **AS-C5 scope** | Architecture + policy + test matrix + gate split — **planning only** |

---

## D. Target surfaces

| # | Surface | Current status | Output risk | Future sanitizer need | Implementation gate | Test requirement |
|---|---------|----------------|-------------|----------------------|---------------------|------------------|
| **1** | **Reply / 往復返書 LLM JSON** | **Stub only** — no LLM；`generateStubReplyPayload` | Highest when LLM connects — multi-field JSON | **Mandatory** before LLM enable | **AS-C5-B** | Per-field sanitize + schema-valid fallback |
| **2** | **Consult room LLM text** | **Live LLM** — `clampOutput` only（length）；**no output classify** | Medium — free-text assistant message | **Required** on deploy path | **AS-C5-B** | Post-`completion` scan before DB insert |
| **3** | **DTR future LLM** | **Deterministic** — no LLM today | Low until LLM overlay | **Conditional** if LLM added | **AS-C5-B** or DTR-specific gate | Template + output scan |
| **4** | **Public AI-generated copy** | **None** today | Low | **If** future marketing/AI copy path | TBD | Static review |

---

## E. Sanitizer architecture proposal（planning only）

### Pipeline position

```
LLM generates output
  → parse (JSON or plain text)
  → classifyM55AiOutputSafety(text | fields)  [new — reuses category taxonomy from input policy]
  → action: allow | sanitize | refuse | redirect | escalate | block
  → if JSON: re-validate M55_REPLY_JSON_SCHEMA_v1
  → return to client OR safe fallback
  → persist only after output safety decision (consult: before message insert)
```

### Planned module（not created in AS-C5）

| Path | Role |
|------|------|
| **`lib/m55/ai/m55AiOutputSanitizer.ts`** | `classifyM55AiOutputSafety()`；field walkers；fallback builders |
| **`lib/m55/ai/m55AiSafetyPolicy.ts`** | Shared category patterns + Japanese safe messages（import/reuse） |

### Logging（future）

| Rule | Policy |
|------|--------|
| **Log** | `category` + `action` + `surface` only |
| **Never log** | raw prompt, full user message, user_id, email, session, Stripe ID, secrets |

---

## F. Output-side action policy

| Action | When | User sees |
|--------|------|-----------|
| **allow** | Output passes all checks | Original LLM output（length-clamped） |
| **sanitize** | Isolated unsafe phrase in otherwise safe text | Replace sentence with 傾向/整理 framing |
| **refuse** | Medical/legal/financial concrete advice | `buildMedicalRefusalMessage()` etc.（from shared policy） |
| **redirect** | Off-scope reply content | `buildReplyOffScopeRedirectMessage()` |
| **escalate** | Self-harm / imminent harm in output | `buildSelfHarmCrisisEscalationMessage()` |
| **block** | Jailbreak residue / policy leak / instruction dump | `buildJailbreakBlockMessage()` or generic safe short text |

**Default:** **fail-closed** — when classifier uncertain → **refuse** or safe fallback, not raw LLM text.

---

## G. JSON output handling（reply LLM）

| Step | Policy |
|------|--------|
| **1** | Parse LLM response to JSON object |
| **2** | Walk **plain-text fields**（see list below） |
| **3** | Classify each field；aggregate worst action |
| **4** | If **sanitize**: rewrite field or replace with safe stub sentence |
| **5** | **`replyPayloadV11Schema.safeParse`** after sanitization |
| **6** | If schema fails → **safe fallback JSON**（pre-approved stub template）；**never** malformed JSON to UI |

### Fields to sanitize（`M55_REPLY_JSON_SCHEMA_v1`）

| Field | Sanitize |
|-------|----------|
| `theme` | yes（must stay aligned with request theme） |
| `issue_summary` | yes |
| `current_flow` | yes |
| `background_tendency` | yes |
| `load_point` | yes |
| `first_step` | yes |
| `next_question` | yes |
| `caution_note` | yes |
| `followup_prompts[]` | yes（each element） |
| `tone_label` | allow-list only（no free unsafe text） |
| `supporting_axes` | numeric only — no text risk |

### Schema vs sanitizer order（decision deferred to AS-C5-A）

| Option | Note |
|--------|------|
| **A: schema first, then sanitize** | Reject malformed early |
| **B: sanitize first, then schema** | Preferred — ensures user never sees unsafe text even in invalid shape |

**AS-C5 recommends B** for user safety.

---

## H. Deterministic wording guard（output patterns）

Output sanitizer **must flag**（conservative；context exceptions require explicit allow-list in implementation gate）:

| Pattern class | Examples |
|---------------|----------|
| **Absolute certainty** | 絶対、必ず |
| **Outcome claims** | 死ぬ、治る、儲かる、必ず治る、必ず儲かる |
| **Legal certainty** | 勝訴、敗訴確定、有罪確定 |
| **Medical certainty** | 診断、処方、この病気、治療すべき |
| **Financial certainty** | 儲かる、損しない、必ず利益 |
| **Fate / death date** | 寿命、いつ死ぬ、死期、余命 |
| **Jailbreak residue** | system prompt、ignore previous、DAN |

| Exception policy | Only **harmless ritual** 必ず（e.g. 回復の儀式）via explicit allow-list in **AS-C5-B** — default **flag** |

---

## I. Failure and fallback behavior

| Scenario | Planned behavior |
|----------|------------------|
| **Sanitizer runtime error** | Fail-closed → safe generic M55 message |
| **Unsafe output detected** | Replace with refusal/escalation snippet — **do not return raw** |
| **Ticket / wallet** | **Prefer:** output check **before** ticket-consuming persist（consult: before `consult_messages` insert） |
| **Unsafe after generation, before persist** | No ticket consumption；no payment |
| **Unsafe detected after persist**（edge） | Separate **wallet/ticket policy gate** — not in AS-C5 |
| **Payment / checkout** | Never triggered by sanitizer |
| **DB mutation** | Sanitizer itself **stateless**；persist only via existing routes after pass |

### Consult-specific（current `route.ts`）

| Today | Future |
|-------|--------|
| `aiContent = clampOutput(completion…)` | Insert `classifyM55AiOutputSafety(aiContent)` **before** batch insert |
| On fail → return safe assistant text **without** insert；**no wallet decrement** |

### Reply-specific（future LLM）

| Today | Future |
|-------|--------|
| Stub only | LLM → sanitize fields → schema → RPC commit only if safe |

---

## J. Future implementation gate split（not executed in AS-C5）

| Gate | Purpose |
|------|---------|
| **`5Z-I-V-AS-C5-A`** | Output-side sanitizer **implementation planning**（file list, ticket policy, schema order） |
| **`5Z-I-V-AS-C5-B`** | Sanitizer **implementation execution**（Category 2 Human GO） |
| **`5Z-I-V-AS-C5-C`** | Local/static sanitizer review |
| **`5Z-I-V-AS-C5-D`** | No-payment verification |
| **`5Z-I-V-AS-C5-E`** | Deploy planning（with **AS-C6** alignment） |

---

## K. Test matrix for future sanitizer

| ID | Simulated LLM output | Expected action |
|----|----------------------|-----------------|
| **O1** | Safe reflective 傾向/整理 text | **allow** |
| **O2** | Medical diagnosis sentence | **refuse** or **sanitize→refuse** |
| **O3** | Investment buy/sell recommendation | **refuse** |
| **O4** | Legal win strategy | **refuse** |
| **O5** | いつ死ぬ / 寿命断定 | **refuse** |
| **O6** | Self-harm encouragement | **escalate** |
| **O7** | Jailbreak / system prompt leak | **block** |
| **O8** | Off-scope general chat in reply JSON `issue_summary` | **redirect** |
| **O9** | Sanitized JSON breaks schema | **safe fallback JSON** |
| **O10** | Tone check | **生活語**、non-frightening |

**Execution:** **AS-C5-C** — unit tests on `m55AiOutputSanitizer.ts` with fixture strings only.

---

## L. Acceptance criteria for future implementation

| # | Criterion |
|---|-----------|
| 1 | **Unsafe output not returned** to user |
| 2 | **Normal output** remains useful and on-scope |
| 3 | **JSON valid** or **safe fallback** returned |
| 4 | **No** raw IDs / secrets in logs or SSOT |
| 5 | **No** payment / checkout triggered |
| 6 | **No duplicate** ticket consumption |
| 7 | **No** sanitizer-initiated DB mutation |
| 8 | **Rollback** — feature flag or revert commit |
| 9 | **Input-side guard** remains active（defense in depth） |

---

## M. Current decision

| Statement | Value |
|-----------|--------|
| **Output-side sanitizer planning** | **GREEN** |
| **Implementation** | **not done** |
| **Input-side（AS-C2）** | local/static GREEN；**not deployed** |
| **Deploy** | **unauthorized** |
| **AX-PROD** | **blocked** |
| **AL** | **unauthorized** |
| **Auth compliance** | **RED** under **AS** exception |
| **Full normal dev flow** | **NOT released** |

---

## N. No-deploy / no-mutation statement

- **No** code change
- **No** sanitizer implementation
- **No** prompt deployment
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

## O. Tracks that remain separate

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
| **Deploy** | **AS-C6** or later |
| **Full normal dev flow** | **NOT released** |

---

## P. Next phase

| Priority | Gate | Condition |
|----------|------|-----------|
| **Recommended** | **`5Z-I-V-AS-E`** | Limited Category 1 continuation / release-readiness handoff planning |
| **Alternative** | **`5Z-I-V-AS-B1-R`** | Paid traffic / test imminent |
| **Sanitizer impl** | **`5Z-I-V-AS-C5-A`** | Only with explicit Human GO for implementation planning |

**Default:** Thread handoff (**AS-E**) before Category 2 sanitizer execution unless Human prioritizes ops (**AS-B1-R**) or sanitizer (**C5-A**).

---

## Repo reference（read-only — AS-C5）

| Path | Gap noted |
|------|-----------|
| `lib/m55/ai/m55AiSafetyPolicy.ts` | Input-only today |
| `app/api/room/core/send/route.ts` | `clampOutput` only — **no output classify** |
| `app/api/reply/generate/route.ts` | Stub path — no LLM output |
| `lib/m55/reply/stubReplyGenerator.ts` | Comment references future input guard |
| `docs/ssot/M55_REPLY_JSON_SCHEMA_v1.md` | Field list for sanitizer walk |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-C5-OUTPUT-SIDE-AI-SAFETY-SANITIZER-PLAN-001`** | **本条** |
