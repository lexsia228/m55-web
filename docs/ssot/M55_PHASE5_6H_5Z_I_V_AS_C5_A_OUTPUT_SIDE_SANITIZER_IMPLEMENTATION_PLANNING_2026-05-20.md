# Phase 5-6H-5Z-I-V-AS-C5-A — Output-side sanitizer implementation planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C5-A** |
| **Title** | **Output-side sanitizer implementation planning** |
| **Classification** | **Category 1 / implementation planning-only / docs-only / no code change / no deploy / no external mutation** |
| **Verdict** | **`OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-C5-A-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**AS-C5-A plans AS-C5-B implementation only.** No sanitizer module created. No route edits. No deploy.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C5** | **`OUTPUT_SIDE_AI_SAFETY_SANITIZER_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AS-C5-OUTPUT-SIDE-AI-SAFETY-SANITIZER-PLAN-001`** | **`47e98c2`** |
| **AS-C4-R** | **`AI_PROMPT_SAFETY_PRODUCTION_SAFE_VERIFICATION_RESULT_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C4-R-PRODUCTION-SAFE-AI-SAFETY-VERIFICATION-RESULT-001`** | **`36f4bf7`** |
| **AS-C2** | **`AI_PROMPT_SAFETY_IMPLEMENTATION_EXECUTION_GREEN_NO_DEPLOY`** | **`M55-EVID-20260519-5Z-I-V-AS-C2-AI-PROMPT-SAFETY-IMPLEMENTATION-EXECUTION-001`** | **`bff147e`** |
| **AS-B1-D4** | **`HISTORICAL_FAILED_FULFILLMENT_CLOSURE_MONITORING_POLICY_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-B1-D4-HISTORICAL-FAILED-FULFILLMENT-CLOSURE-MONITORING-POLICY-PLAN-001`** | **`1de964b`** |

| Item | Value |
|------|--------|
| **Input-side guard** | **`lib/m55/ai/m55AiSafetyPolicy.ts`** — repo GREEN（**AS-C2**）；**not deployed** |
| **Output-side sanitizer** | **not implemented** |
| **AS-C5-A** | **does not implement sanitizer** |

---

## C. Implementation target inventory

| # | Target surface | Current state | Proposed AS-C5-B change | Risk controlled | Test requirement | Deploy later |
|---|----------------|---------------|-------------------------|-----------------|------------------|--------------|
| **1** | **Reply / 往復返書 future LLM JSON** | **Stub** — `generateStubReplyPayload`；input guard on theme/subquestions/free_text；**no LLM output scan** | Insert **`sanitizeM55ReplyJsonOutput`** after LLM parse、**before** `replyPayloadV11Schema` + **`m55_reply_generate_commit` RPC** | Unsafe JSON never persisted；no double ticket consume | **O1–O11**, **O9** fallback | **yes**（with **AS-C6+**） |
| **2** | **Consult room plaintext LLM** | **Live** — `app/api/room/core/send/route.ts`：`classifyM55AiSafetyInput` on user message；**`clampOutput` only** on assistant text | Insert **`sanitizeM55AiTextOutput`** after OpenAI completion、**before** `consult_messages` batch insert | Unsafe assistant text not stored；wallet not consumed on block | **O1–O8**, **O10**, consult integration | **yes** |
| **3** | **Future DTR LLM** | **None** — deterministic `runDtrEngine` only | **Conditional** — wire sanitizer if LLM overlay added | N/A until feature exists | TBD when introduced | TBD |
| **4** | **Public AI-generated copy** | **None** | **If** marketing/copy path added — same text sanitizer + static review gate | Low today | Static review | TBD |
| **5** | **Shared safety policy reuse** | **`m55AiSafetyPolicy.ts`** — categories + `safeMessageForCategory` + `buildM55AiSafetySystemInstruction` | **Import only** — no fork of regex tables；output module calls shared classifiers / messages | Drift prevention | Selfcheck parity with input fixtures | **no**（library-only） |

---

## D. Proposed file / module design（plan only — not created in AS-C5-A）

| Path | Role |
|------|------|
| **`lib/m55/ai/m55AiOutputSanitizer.ts`** | **New** — text + JSON sanitization；pure functions |
| **`lib/m55/ai/m55AiOutputSanitizer.selfcheck.mjs`** | **New** — fixture strings O1–O12；run via `node lib/m55/ai/m55AiOutputSanitizer.selfcheck.mjs` |
| **`lib/m55/ai/m55AiSafetyPolicy.ts`** | **Reuse** — `classifyM55AiSafetyInput` on each text field（output = same patterns）；`safeMessageForCategory`；`build*Message` helpers |
| **`lib/m55/reply/replyPayload.zod.ts`** | **Reuse** — `replyPayloadV11Schema` post-sanitize validation |
| **`lib/m55/reply/stubReplyGenerator.ts`** | **Optional** — run output sanitizer on stub for parity（low risk） |

### AS-C5-B edit points（routes only — no sanitizer logic inline）

| File | Integration hook |
|------|------------------|
| **`app/api/room/core/send/route.ts`** | After `clampOutput(completion…)` (~L209)；before `consult_messages.insert` (~L227) |
| **`app/api/reply/generate/route.ts`** | After future LLM JSON parse；before `replyPayloadV11Schema.safeParse` + RPC (~L421–447 today on stub) |

### Avoid in sanitizer module

| Forbidden |
|-----------|
| New provider SDK |
| `process.env` reads |
| Network calls |
| DB / Supabase calls |
| Payment / Stripe / webhook |
| Ticket / wallet mutation |
| Clerk / auth changes |

---

## E. Proposed sanitizer API（conceptual — AS-C5-B）

### Types（extend input policy）

| Type | Notes |
|------|-------|
| **`M55AiOutputAction`** | `allow` \| `sanitize` \| `refuse` \| `redirect` \| `escalate` \| `block` |
| **`M55AiOutputSurface`** | Reuse `M55AiSafetySurface`：`consult` \| `reply` \| `dtr` \| `general` |
| **`M55AiOutputSanitizeOptions`** | `{ surface, locale?: 'ja-JP', productLane?: string }` — **safe labels only** |

### `sanitizeM55AiTextOutput(text, options)`

| | |
|---|---|
| **Input** | `text: string`；`options: M55AiOutputSanitizeOptions` |
| **Output** | `{ action, safeText, categories: M55AiSafetyCategory[], reasonSafeLabel: string \| null }` |
| **Behavior** | Run `classifyM55AiSafetyInput(text, { surface })` per segment or whole string；map `refuse`/`redirect`/`escalate`/`block` → replace `safeText` with `safeMessageForCategory`；`sanitize` → replace offending sentence with 傾向 framing or refusal snippet；`allow` → `safeText = clamped original` |
| **Fail-closed** | Parser/runtime error → `action: refuse`；`safeText = buildGenericRefusalMessage()` |

### `sanitizeM55ReplyJsonOutput(json, options)`

| | |
|---|---|
| **Input** | `json: Record<string, unknown>`（already parsed object — route strips code fences） |
| **Output** | `{ ok: boolean, sanitizedJson: ReplyPayloadV11 \| null, fallbackUsed: boolean, categories: M55AiSafetyCategory[], reasonSafeLabel: string \| null }` |
| **Behavior** | Walk text fields per §F；aggregate **worst** action across fields；if any field `block`/`escalate`/`refuse` → may replace field or whole payload；then `replyPayloadV11Schema.safeParse`；on fail → `buildM55SafeFallbackReplyJson` |

### `buildM55SafeFallbackReplyJson(reason: { reasonSafeLabel: string; theme: string })`

| | |
|---|---|
| **Output** | Schema-valid **`ReplyPayloadV11`** stub aligned with request `theme` |
| **Source** | Derive from **`generateStubReplyPayload`** templates or minimal safe static object |
| **Never** | Return malformed JSON to UI |

### Internal helper（optional in AS-C5-B)

| Function | Role |
|----------|------|
| **`classifyM55AiOutputText`** | Thin wrapper → `classifyM55AiSafetyInput` + output action mapping |
| **`worstOutputAction(actions[])`** | Order: `block` > `escalate` > `refuse` > `redirect` > `sanitize` > `allow` |

**No implementation in AS-C5-A.**

---

## F. Reply JSON sanitizer plan

| Step | Policy |
|------|--------|
| **1** | Parse LLM string → JSON object（route responsibility） |
| **2** | Walk user-visible text fields（**AS-C5** §G list） |
| **3** | Per field: `sanitizeM55AiTextOutput` or inline classify |
| **4** | Aggregate worst action |
| **5** | **`replyPayloadV11Schema.safeParse(sanitized)`** — order: **sanitize then schema**（AS-C5 option B） |
| **6** | On schema fail or unrecoverable unsafe → **`buildM55SafeFallbackReplyJson`**；`fallbackUsed: true` |
| **7** | RPC **`m55_reply_generate_commit`** only when `ok === true` and schema pass |

### Text fields（`M55_REPLY_JSON_SCHEMA_v1` + `replyPayloadV11Schema`）

| Field | Sanitize |
|-------|----------|
| `theme` | yes — must match request theme after sanitize |
| `issue_summary`, `current_flow`, `background_tendency`, `load_point`, `first_step`, `next_question`, `caution_note` | yes |
| `followup_prompts[]` | yes — each string |
| `tone_label` | allow-list：`steady` / known enum only |
| `supporting_axes` | numeric validation only |
| `version` | passthrough |

### Ticket / payment boundaries

| Rule | Policy |
|------|--------|
| **Sanitizer** | **Stateless** — no DB |
| **RPC commit** | Only after output pass |
| **Idempotent replay** | Existing `succeeded` session short-circuit — **no second consume**（unchanged） |
| **Unsafe after generation, before RPC** | Return **`SAFETY_BLOCKED`** or schema-safe fallback path — **do not call RPC** |
| **Unsafe after RPC / persist** | **Out of AS-C5-B** — separate wallet/ticket policy gate |
| **Payment** | Never triggered |

---

## G. Consult output sanitizer plan

### Current flow（repo — `app/api/room/core/send/route.ts`）

```
auth → ownership → input validate → classifyM55AiSafetyInput (input) → wallet check
  → OpenAI completion → clampOutput → consult_messages.insert (user + assistant)
  → reply_ticket_wallets consume → consult_threads credits update → JSON response
```

### AS-C5-B target flow

```
… → OpenAI completion → clampOutput → sanitizeM55AiTextOutput(aiContent, { surface: 'consult' })
  → if action !== allow (and not sanitize-to-safe): return 422 { error: 'blocked', safeMessage } — NO insert, NO wallet consume
  → if allow/safe: consult_messages.insert → wallet consume → response (unchanged shape)
```

| Constraint | Policy |
|------------|--------|
| **Response shape** | Preserve `{ reply, thread }` or blocked `{ error, safeMessage }` — same as input guard |
| **Auth** | No change |
| **DB writes** | No extra writes；only existing insert path after pass |
| **Provider / env** | No model or key change in sanitizer gate |
| **`clampOutput`** | Keep — sanitizer runs **after** length clamp |
| **Orphan prevention** | Output block **before** insert fixes “paid for unsafe assistant text” gap |

### Consult blocked response（mirror input）

```json
{ "error": "blocked", "safeMessage": "<Japanese safe text>" }
```

Status **422**；**no ticket consumption**（aligns with input block at L114–124).

---

## H. Failure mode and fallback policy

| Scenario | Planned behavior |
|----------|------------------|
| **Classifier matches unsafe pattern** | Map to action；replace with `safeMessageForCategory` or field-level 傾向 rewrite |
| **Classifier uncertain / internal error** | **Fail-closed** → `buildGenericRefusalMessage()` or consult blocked JSON |
| **Sanitizer throws** | Treat as refuse；never return raw LLM text |
| **Logging** | **`category` + `action` + `surface` + `reasonSafeLabel`** only — no prompt, no full message, no user_id |
| **SSOT / chat** | No raw model output stored |
| **Ticket** | No consume on consult block；no duplicate RPC on reply |
| **Checkout / payment** | Never |

---

## I. Test matrix for AS-C5-B / AS-C5-C

| ID | Fixture / scenario | Expected |
|----|-------------------|----------|
| **O1** | Safe reflective 傾向/整理 output | **allow** |
| **O2** | Medical concrete advice in output | **refuse** or **sanitize** → safe text |
| **O3** | Investment recommendation | **refuse** / **sanitize** |
| **O4** | Legal strategy / 勝訴断定 | **refuse** / **sanitize** |
| **O5** | Death/fate certainty（いつ死ぬ、寿命） | **refuse** |
| **O6** | Self-harm / emergency in output | **escalate** |
| **O7** | Jailbreak / policy leakage | **block** |
| **O8** | Off-scope reply `issue_summary` | **redirect** |
| **O9** | Malformed or post-sanitize schema break | **`buildM55SafeFallbackReplyJson`**；`fallbackUsed: true` |
| **O10** | Tone / 生活語 check | Non-frightening；no 必ず治る / 儲かる |
| **O11** | Schema-valid safe reply JSON | **unchanged** after sanitize（allow path） |
| **O12** | Selfcheck / logs | **No** raw IDs, secrets, or full prompts in output |

**Execution:** `m55AiOutputSanitizer.selfcheck.mjs` + optional route-less unit tests；**AS-C5-C** static review.

---

## J. Acceptance criteria for AS-C5-B implementation

Future **AS-C5-B** may be **`OUTPUT_SIDE_SANITIZER_IMPLEMENTATION_GREEN_NO_DEPLOY`** only if **all**:

| # | Criterion |
|---|-----------|
| 1 | **`m55AiOutputSanitizer.ts`** created |
| 2 | **`sanitizeM55AiTextOutput`** implemented |
| 3 | **`sanitizeM55ReplyJsonOutput`** + **`buildM55SafeFallbackReplyJson`** implemented（or explicit stub-compatible fallback documented in gate result） |
| 4 | **Consult** path integrated **before** `consult_messages` insert |
| 5 | **Reply** path hook documented for LLM + applied to stub path for parity if low-cost |
| 6 | **`m55AiOutputSanitizer.selfcheck.mjs`** — **O1–O12** pass |
| 7 | **`tsc` / project typecheck** passes |
| 8 | **No** deploy / env / model / provider / DB / payment / auth mutation in **AS-C5-B** |
| 9 | **No** raw ID / secret in logs or SSOT |
| 10 | **Rollback** documented（§K） |
| 11 | **Input guard** remains active（defense in depth） |

---

## K. Rollback / disable plan

| Mechanism | Policy |
|-----------|--------|
| **Primary** | Single revert commit removing sanitizer module + route hooks |
| **Shape** | Pure local helpers — no DB migration |
| **Env** | No feature flag required for planning；optional `M55_OUTPUT_SANITIZER_DISABLED` **not** introduced in AS-C5-A（avoid env coupling） |
| **Provider** | No settings change |
| **Deploy** | **AS-C5-B** remains **no deploy**；production behavior unchanged until **AS-C6+** |

---

## L. Decision boundaries

| Statement | Value |
|-----------|--------|
| **AS-C5-A authorizes AS-C5-B** | **no** — explicit **Human GO** required for code changes |
| **AS-C5-B authorizes deploy** | **no** — **AS-C6** or later |
| **AS-B1-MONITOR** | Operational lane — unchanged |
| **AS-B1-REPAIR** | **closed** |
| **AX-PROD** | **blocked** |
| **AL** | **unauthorized** |
| **Deploy** | **no** |
| **Production auth compliance** | **RED** under **AS** exception |

---

## M. No-mutation statement

- **No** code change
- **No** sanitizer implementation or new module files
- **No** prompt deployment
- **No** deploy / redeploy
- **No** env / model / provider change
- **No** Production DB connection
- **No** DB write / SQL
- **No** Stripe / webhook / checkout / payment
- **No** Clerk / auth change
- **No** notification integration
- **No** repair / repair runner
- **No** raw key / secret / user_id / email / session / Stripe ID
- **No** AL / AL-PRE / AX-PROD
- **No** full normal dev flow release

---

## N. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **AS-B1 historical failures** | **Monitored historical finding**（**AS-B1-D4**） |
| **AS-B1-MONITOR** | Paid-test / traffic checkpoints only |
| **Automated notification** | **AS-B2/B3** later |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Deploy** | **AS-C6** or later |
| **Full normal dev flow** | **NOT released** |

---

## O. Next phase

| Priority | Gate | Condition |
|----------|------|-----------|
| **Recommended** | **`5Z-I-V-AS-C5-B`** | Output-side sanitizer **implementation execution** — **only if Human explicitly approves code changes** |
| **Alternative** | **`5Z-I-V-AS-C6`** | Prompt safety **deploy planning** — if Human wants deployment path first |
| **Ops** | **`AS-B1-MONITOR`** | When paid-test / traffic is near |
| **After C5-B** | **`AS-C5-C`** | Static/local sanitizer review |
| **After C5-C** | **`AS-C5-D`** | No-payment verification |
| **Deploy** | **`AS-C6+`** | Separate from C5-B |

**Default:** **No repair. No deploy.** Continue Category 1 readiness unless Human GO for **C5-B** or **C6** planning.

---

## Repo files reviewed（read-only — AS-C5-A）

| Path | Finding |
|------|---------|
| `lib/m55/ai/m55AiSafetyPolicy.ts` | Input classifier + safe messages；10 categories；5 input actions |
| `lib/m55/ai/m55AiSafetyPolicy.selfcheck.mjs` | Pattern for output selfcheck |
| `app/api/room/core/send/route.ts` | Input guard L115；`clampOutput` L44–47, L209；insert L227；wallet after insert |
| `app/api/reply/generate/route.ts` | Input guard L227；stub L414–443；RPC L447 |
| `lib/m55/reply/stubReplyGenerator.ts` | Deterministic stub；future LLM note |
| `docs/ssot/M55_REPLY_JSON_SCHEMA_v1.md` | Field contract |
| `docs/ssot/M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md` | Ticket + output cap authority |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-C5-A-OUTPUT-SIDE-SANITIZER-IMPLEMENTATION-PLAN-001`** | **本条** |
