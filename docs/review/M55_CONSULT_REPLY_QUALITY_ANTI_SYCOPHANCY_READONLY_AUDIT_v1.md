# M55 Consult Reply Quality — Anti-Sycophancy Readonly Audit v1

## Document control

| Field | Value |
|-------|--------|
| Status | **READONLY AUDIT DRAFT** (not implementation GO) |
| Scope | E-08 — consult reply quality / anti-sycophancy / Product Truth alignment |
| Method | Static code + SSOT + UI copy review only |
| Date | 2026-05-31 |
| Prior memo | `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` (safety tone; referenced, not superseded) |
| Out of scope | Live send, LLM sample generation, DB mutation, prompt/code deploy |

**This document is not:**

- An implementation or prompt-change GO
- A return-generation or production-send GO
- A close of E-08 (findings remain open)
- An edit to `docs/ssot/**` or existing `docs/review/**` files

---

## 1. Executive judgment

| Item | Result |
|------|--------|
| **Audit DRAFT completeness** | **GREEN** — static inventory, 12-point matrix, gap table, cause taxonomy |
| **E-08 product quality (as-is)** | **PARTIAL** — boundaries and high-risk refusal are strong; sycophancy / report grounding / lane B stub quality are weak |
| **Implementation GO** | **No** |
| **Prompt-change GO** | **No** |
| **Return-generation GO** | **No** |

**Summary:** Purchaser-facing **UI and wallet** express saved-report-linked, non-generic, capped consult well. **Lane A (LLM)** is the live dialogue quality surface but **under-specifies** anti-sycophancy and alternate perspective, and **re-derives** report text from client `birthDate` rather than stored `envelope_json`. **Lane B (stub)** is deterministic template JSON with **no chapter/report body injection**. **Sanitizer** blocks category risks (medical/legal/prediction) but does **not** detect sycophancy phrases.

---

## 2. Two-lane reference table

### Lane A — Saved-report room / LLM

| Dimension | Finding |
|-----------|---------|
| **API** | `POST /api/room/core/send` (`app/api/room/core/send/route.ts`) |
| **UI** | `components/dtr/ConsultRoom.tsx` embedded in `components/dtr/DtrFullReader.tsx` → `/dtr/core` |
| **Generation** | OpenAI `gpt-4o-mini`, `temperature: 0.7`, `max_tokens: 600` |
| **System prompt** | `buildSystemPrompt(reportSections)` + `buildM55AiSafetySystemInstruction('consult')` |
| **Context source** | If request body includes `birthDate`: `runDtrEngine({ birthDate, nickname, … })` — **not** `dtr_report_snapshots.envelope_json`. Injects **only** `s3_essence`, `s4_strengths`, `s5_friction`, each **≤300 chars**. |
| **Ownership** | `resolveEntryReportOwnership` (fail-closed); `report_instance_id` for wallet row |
| **Consumption** | Pre-check `reply_ticket_wallets`; commit via `m55_consult_reply_commit` RPC after LLM success |
| **Input guard** | `classifyM55AiSafetyInput(..., { surface: 'consult' })` — block before LLM, no ticket burn |
| **Output guard** | `sanitizeM55AiTextOutput(..., { surface: 'consult' })` — category-based; allow path returns raw LLM text |
| **Product Truth (UI)** | `PAID_DTR_CONSULT_REPLY` / `PAID_DTR_CONSULT_ROOM_UI` in `lib/m55/paidDtrProductCopy.ts` |
| **Primary risks** | Sycophancy / self-justification; generic coaching tone; **context drift** vs purchased snapshot; partial chapter coverage |

### Lane B — Reply JSON / stub

| Dimension | Finding |
|-----------|---------|
| **API** | `POST /api/reply/generate` (`app/api/reply/generate/route.ts`) |
| **UI** | `components/reply/ConsultationRoomInput.tsx` → `/reply` |
| **Generation** | **`generateStubReplyPayload` only** — no OpenAI call in this route |
| **Context source** | Theme + subquestions + free_text → fixed `TEMPLATE_BY_MODE` (`guided` / `free`); **no** report sections, stem, or envelope |
| **Ownership / wallet** | Auth + `reply_sessions` + `reply_ticket_wallets` + RPC commit (same commerce family as Lane A) |
| **Input guard** | `classifyM55AiSafetyInput(..., { surface: 'reply' })` |
| **Output guard** | `sanitizeM55ReplyJsonOutput` → schema `replyPayloadV11Schema`; fallback uses `buildM55SafeFallbackReplyJson` (stub-shaped) |
| **Observability** | Trace field `stub_mode` defaults to **`false`** but generation path is **always stub** — log label **misleading** |
| **Product Truth (UI)** | Same copy module; cap display via wallet components |
| **Primary risks** | Generic template advice; **no** saved-report paragraph grounding; user may perceive “返書” without report linkage |

### Shared safety / limits

| Asset | Role |
|-------|------|
| `lib/m55/ai/m55AiSafetyPolicy.ts` | Input categories; cross-cutting system instruction blocks |
| `lib/m55/ai/m55AiOutputSanitizer.ts` | Output re-classification; JSON field scrub; consult block on non-allow |
| `00_PRIMARY_ACTIVE_LAW/M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md` | Length, high-risk, ticket consumption rules |
| `lib/m55/reply/replyTicketCheckoutConstants.ts` | `REPLY_TICKET_INCLUDED_COUNT=1`, `ADDITIONAL_MAX=4`, `TOTAL_CAP=5` |

---

## 3. Twelve-point matrix (Lane A / Lane B)

Legend: **PASS** = structurally supported in this lane’s generator + guards; **PARTIAL** = UI/SSOT or weak/indirect code support; **FAIL** = not supported or contradicted.

| # | Criterion | Lane A (LLM) | Lane B (stub) |
|---|-----------|----------------|---------------|
| 1 | Saved-report-linked consult | **PARTIAL** — owned report gate + report-scoped prompt wording; context from **re-run engine**, not snapshot envelope | **PARTIAL** — wallet tied to user/session; **no** report body in payload |
| 2 | Not generic chat | **PARTIAL** — prompt says Entry Report scope; temperature + vague “整理” allow coaching drift | **FAIL** — templates are theme-agnostic career/flow advice |
| 3 | Not unlimited consult | **PASS** — wallet + thread credits + RPC; UI copy | **PASS** — same wallet/RPC family |
| 4 | Product Truth 1 + max4 + total5 + ¥500 | **PASS** (UI + constants); engine s8 states **1 included** only (4/5/¥500 UI-side, same as Wave C engine note) | **PASS** (UI + constants); stub JSON does not state price |
| 5 | Not excessive validation / sycophancy | **PARTIAL** — “穏やか”; no explicit ban on “あなたは悪くない” | **PARTIAL** — neutral tone but no anti-sycophancy structure |
| 6 | Not self-justification reinforcement | **PARTIAL** — no explicit guard | **PARTIAL** — generic “停滞/判断” framing, not report-tied |
| 7 | Other/situational perspective (non-accusatory) | **FAIL** — not required in prompt (prior audit: high risk) | **FAIL** — templates omit |
| 8 | References chapters / tendencies / saved body | **PARTIAL** — 3 sections × 300 chars only; may mismatch purchased stem (e.g. v2 lane vs JDN re-derive) | **FAIL** — `supporting_axes` numeric only, no prose from report |
| 9 | Not medical/legal/investment/career substitute | **PASS** — input/output category refusal + prompt line | **PASS** — input refusal; stub caution_note generic disclaimer |
| 10 | Not fortune / prophecy / success guarantee | **PASS** — `deterministic_prediction` patterns + prompt | **PASS** — no prophecy in templates; sanitizer on fields if triggered |
| 11 | No gender logic | **PASS** — no gender patterns in ai libs (static grep) | **PASS** |
| 12 | No rename of プロデューサー etc. | **PASS** — consult paths do not emit stem `publicTitle` | **PASS** |

**Lane A aggregate:** 4 PASS, 6 PARTIAL, 2 FAIL  
**Lane B aggregate:** 5 PASS, 3 PARTIAL, 4 FAIL  

---

## 4. Gap table (expectation vs layers)

| Expectation (UI / SSOT) | UI copy | Prompt (A) | Stub (B) | Sanitizer | Product Truth constants | Wallet / RPC |
|-------------------------|---------|------------|----------|-----------|-------------------------|--------------|
| Saved-report-linked | Strong (`savedReportLinkedShortJa`, room lead) | Wording only | No body | N/A | `groundedInReportJa` | `report_instance_id` on wallet |
| Non-generic chat | Strong (`notGenericChatJa`) | Partial scope lines | Weak (generic templates) | Off-topic redirect (`reply` surface) | Forbidden phrases list (marketing) | N/A |
| Non-unlimited | Strong (`avoidOverpromisingJa`, cap summary) | N/A | N/A | N/A | `totalCapPerReport: 5` | Enforced |
| 1 + 4 + 5 + ¥500 | Full in `PAID_DTR_CONSULT_REPLY` | N/A | N/A | N/A | `replyTicketCheckoutConstants` | Enforced |
| Alternate perspective on conflict | `conflictPerspectiveJa` | **Missing** | **Missing** | **Missing** | Stated as UX expectation only | N/A |
| No “you’re right / they’re wrong” | Implied in `strongEmotionJa` | **Missing** | **Missing** | **Missing** | In prior safety audit §5 | N/A |
| Chapter-grounded reply | “4章” in room UI | 3 partial sections | None | N/A | Bridge copy elsewhere | N/A |
| Anti-sycophancy | Prior audit §4–§6 | **Weak** | **Weak** | Category-only | Docs only | N/A |

**Critical gap:** UI teaches quality bar (**別視点**, **正しさの判定で終わらせない**) that **prompt, stub, and sanitizer do not operationalize**.

---

## 5. E-08 cause classification

| Cause bucket | Severity | Evidence |
|--------------|----------|----------|
| **prompt (Lane A) primary** | High | No mandatory alternate perspective; no anti-sycophancy banned phrases; “穏やかに整理” only |
| **stub (Lane B) primary** | High | `stubReplyGenerator.ts` fixed paragraphs; no `envelope_json` / section text |
| **context source primary** | High | `send/route.ts` uses `runDtrEngine(birthDate)` slice, not stored snapshot at purchase |
| **sanitizer secondary** | Medium | Reuses input classifier on output; no sycophancy regex / structure validator |
| **UI copy (expectation)** | Low risk for drift | `paidDtrProductCopy.ts` is aligned with Product Truth |
| **Product Truth (engine s8)** | Low | `SYSTEM_RULE_COPY`: 1 consult attached, purchase-time fixed; not 4/5/¥500 |
| **entitlement / wallet** | Low (quality-neutral) | Cap and consumption correct; does not fix tone |
| **docs / SSOT gap** | Medium | `M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` + AI_CONSULT SSOT exist; **not encoded** in prompt/stub |

---

## 6. Important observation notes (required)

1. **Lane A is the live dialogue quality surface** for `/dtr/core` ConsultRoom (LLM replies).
2. **Lane B is stub-only today** — quality audit for “LLM返書” must not conflate with Lane B templates.
3. **`stub_mode: false`** in `app/api/reply/generate/route.ts` logging does **not** mean LLM — generation is always `generateStubReplyPayload`.
4. **Lane A does not read `dtr_report_snapshots.envelope_json`** — it re-runs `runDtrEngine` from client-supplied `birthDate` (and optional nickname), injecting truncated sections. Risks:
   - Stem/body mismatch vs **purchase-time** snapshot (v1 vs v2 lane, Wave C engine-new-only text not visible if re-derive differs).
   - “購入時点固定” for **displayed report** vs **consult context** can diverge.
5. **UI states the expected reply quality** (`conflictPerspectiveJa`, non-unlimited, non-generic); **prompt/stub do not guarantee** that quality.
6. **Sanitizer** protects regulated domains; it does **not** implement the five-part reply structure in `M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` §6.

---

## 7. Remediation candidates (separate GO only)

| Class | Candidate (not approved here) |
|-------|-------------------------------|
| **prompt reinforcement** | Explicit bans: unconditional validation, blame assignment, absolute breakup/quit; require one non-accusatory other-perspective clause on relationship themes; require cite-at-least-one report section id |
| **stub reinforcement** | Inject snapshot excerpt or section summaries into stub fields; theme-specific templates per stem lane |
| **sanitizer reinforcement** | Output patterns: `悪くない`, `相手が悪い`, `あなたは正しい`, therapy absolutes; optional structure lint |
| **context source review** | Load `envelope_json` from `report_instance_id` for consult system prompt (read-only at generation time; no snapshot UPDATE) |
| **UI copy verification** | Human pass on ConsultRoom + wallet under owned state (no code change in audit GO) |
| **SSOT reflection** | Map §6 reply structure into AI_CONSULT SSOT and prompt/stub specs in a future planning gate |

**Explicitly not in scope of any candidate list above without new GO:** DB schema, RPC semantics, checkout SKU, entitlement keys, Stripe, deploy.

---

## 8. Do not touch (this track)

- Code, prompt, DB, RPC, wallet consumption logic, entitlements, checkout
- Consult send, return generation, production mutation
- `snapshot` / `envelope_json` / `dtr_report_snapshots` UPDATE or backfill
- Product Truth changes, プロデューサー rename
- `docs/ssot/**` edits
- Existing `docs/review/**` edits (this file is **additive only**)

---

## 9. File inventory (readonly)

| Category | Path |
|----------|------|
| Lane A API | `app/api/room/core/send/route.ts`, `app/api/room/core/route.ts` |
| Lane B API | `app/api/reply/generate/route.ts` |
| Safety | `lib/m55/ai/m55AiSafetyPolicy.ts`, `lib/m55/ai/m55AiOutputSanitizer.ts` |
| Stub | `lib/m55/reply/stubReplyGenerator.ts` |
| UI | `components/dtr/ConsultRoom.tsx`, `components/reply/ConsultationRoomInput.tsx`, `components/reply/consultation-ticket-wallet.tsx` |
| Copy / Truth | `lib/m55/paidDtrProductCopy.ts`, `lib/m55/dtrEngine.ts` (s8), `lib/m55/dtrReportBridgeCopy.ts` |
| Constants | `lib/m55/reply/replyTicketCheckoutConstants.ts` |
| SSOT law | `00_PRIMARY_ACTIVE_LAW/M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md` |
| Prior review | `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` |

---

## 10. Next gate

**Recommended:** `CATEGORY-1-M55-CONSULT-REPLY-QUALITY-ANTI-SYCOPHANCY-READONLY-AUDIT-REVIEW-COMMIT-PLANNING`

That gate is limited to: review this DRAFT, commit eligibility for **`docs/review/M55_CONSULT_REPLY_QUALITY_ANTI_SYCOPHANCY_READONLY_AUDIT_v1.md` only**, no code/prompt/DB changes.

---

## 11. Execution attestation (this gate)

| Action | Done? |
|--------|-------|
| Created **one** new file under `docs/review/` | Yes |
| Code / prompt / DB / consult send / return generation | **No** |
| commit / push / deploy | **No** |
