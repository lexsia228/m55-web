# M55 Consult Reply Quality — Lane A Sample Check Record Template v1

## Document control

| Field | Value |
|-------|--------|
| Title | Lane A Sample Check — Redacted Audit Record Template |
| **Record type** | **TEMPLATE** (not a sample record) |
| Status | TEMPLATE ONLY — no actual sample performed |
| Scope | Lane A Production consult reply quality (E-08) |
| Upstream criteria | **E08-CLOSE-CRITERIA** (CLOSED) |
| Date (template) | _YYYY-MM-DD_ |
| Evaluator | _role only — no user_id / email_ |

**This document is not:**

- An implementation / prompt / sanitizer / code-change GO
- A **close** of **E-08** product quality (E-08 remains **OPEN**)
- Authorization to send consult messages, consume tickets, or run checkout
- A sample audit result (no Production send was performed for this file)

**When ticket = 0:** Do **not** fill this as a sample record. Use **BLOCKED_NO_TICKET** gate documentation only.

**When performing a real sample (ticket ≥ 1, separate explicit GO):**

1. Copy this file to a new path, e.g. `M55_CONSULT_REPLY_QUALITY_LANE_A_SAMPLE_CHECK_RECORD_YYYYMMDD_v1.md`
2. Set **Record type** to **SAMPLE RECORD**
3. Fill sections below; do **not** store full reply text

**Stack validity:**

- Valid only for Production stack **post-`3bfeb97`** (prompt micro-copy + quality sanitizer path)
- Legacy samples at `f3dc0e3` / `a9d8e9d` in `docs/review/` are **reference only** — **not** substitutes for post-`3bfeb97` evaluation

---

## 1. Header

| Field | Template placeholder |
|-------|----------------------|
| Gate name | _e.g. CATEGORY-1-M55-CONSULT-REPLY-QUALITY-LANE-A-SAMPLE-CHECK_ |
| Record type | **TEMPLATE** → change to **SAMPLE RECORD** when used |
| Date | _YYYY-MM-DD_ |
| Evaluator | _Human reviewer role — no PII_ |
| Environment | **Production** |
| Lane | **Lane A** |
| Product path | `/dtr/core` (`ConsultRoom`) |
| API path | `POST /api/room/core/send` |
| Production SHA | _prefix 7+ chars OK — full SHA optional_ |
| Related criteria | **E08-CLOSE-CRITERIA** (CLOSED) |
| Related commits | quality sanitizer: `4d42517` · prompt micro-copy: `3bfeb97` · observability: `739dd45` · runbook: `2db1d40` |

---

## 2. Preconditions checklist

Complete **before** send. If any required item fails, **do not send** — record as **BLOCKED**.

- [ ] **ticket before ≥ 1** (legitimate remaining count — not created during this sample via checkout / manual grant / DB)
- [ ] purchaser / entitled account
- [ ] **no checkout** during sample window
- [ ] **no manual grant** during sample window
- [ ] **no DB / SQL** direct edit for ticket
- [ ] **no webhook replay**
- [ ] **one send only** (send count = 1 if sent)
- [ ] **retry count = 0** (no resend on 4xx/5xx/timeout)
- [ ] **Theme A only** (fixed text below unless separate GO specifies otherwise)
- [ ] **`X-Idempotency-Key`** used
- [ ] **no PII** in prompt (no real names, email, phone, address, etc.)

---

## 3. Sample input

| Field | Value |
|-------|--------|
| Theme label | **Theme A — 対人・言いすぎ / 謝罪 / 善悪迷い** |
| Prompt summary | _1 line_ |
| Prompt exact text | See Theme A below |
| PII check | pass / fail |

**Theme A exact text (allowed in template; fixed test copy):**

> 大切な人に言いすぎたかもしれません。謝った方がいいのか、自分が悪いのか、相手も分かってくれていないだけなのか分からなくなっています。どう整理すればいいですか？

**Notes:**

- Theme A fixed text may be recorded verbatim (no PII).
- If a future sample uses **user-authored** text, store **redacted summary** only — not raw user prose with identifiers.

---

## 4. Execution result

| Field | Value |
|-------|--------|
| Sent | yes / no |
| Blocked reason (if Sent=no) | ticket / auth / entitlement / ownership / 409 / 422 / 500 / timeout / network / other |
| HTTP status | _numeric only_ |
| ticket before | _number only_ |
| ticket after | _number only_ |
| send count | 0 or 1 |
| retry count | **0** (required) |
| idempotency key used | yes / no |
| LLM call likely | yes / no / unknown |
| DB persistence likely | yes / no / unknown |
| Notes | _no secrets / no env values_ |

---

## 5. Eight-axis evaluation

**Rating definitions:** Follow **E08-CLOSE-CRITERIA** (PASS / PARTIAL / FAIL per axis).

**If Overall = BLOCKED:** set **all axes to N/A** — do not quality-evaluate.

**If no sample (ticket 0 / not sent):** do not fill ratings — template only.

| # | Axis | Rating (PASS / PARTIAL / FAIL / N/A) | Evidence summary (1–3 lines) | Short quote (optional, ≤1 sentence, redacted) | Issue (none / minor / major) |
|---|------|--------------------------------------|------------------------------|-----------------------------------------------|------------------------------|
| 1 | 保存版接地 | | | | |
| 2 | anti-sycophancy | | | | |
| 3 | 二択ほどき | | | | |
| 4 | 別視点 | | | | |
| 5 | 小さな一手 | | | | |
| 6 | sanitizer効果 | | | | |
| 7 | Product Truth | | | | |
| 8 | 文章品質 | | | | |

---

## 6. Sanitizer watchlist

Observe **post-generation** quality pass (`m55ConsultReplyQualitySanitizer`, commit `4d42517`).
Do **not** record env values or raw API payloads.

| Phrase / pattern | Present (yes/no) | Context (absent / acceptable / problematic) | Notes |
|------------------|------------------|-----------------------------------------------|-------|
| 効果的です | | | |
| おすすめします | | | |
| 役立つかもしれません / 役に立つかもしれません | | | |
| 心的負担 | | | |
| 関係の修復 / 深化につながる | | | |
| 相手の意見や気持ちを確認する（系） | | | |
| あなたはどう思っているの？ | | | |
| してみてはいかがでしょうか / してみてはどうでしょうか（系） | | | |
| replacementCount | _number or unknown — only if safely observable without secrets_ | | |

---

## 7. Product Truth guard

Answer **yes / no** plus **one-line memo** each (no UI screenshots with PII).

| Check | yes / no | Memo |
|-------|----------|------|
| Reads as consult reply linked to saved report | | |
| Does not read as generic chat | | |
| Does not read as unlimited consult | | |
| Not medical / legal / investment / career-judgment substitute | | |
| Not success guarantee / prophecy | | |
| Does not confuse with additional purchase or ticket purchase flow | | |

---

## 8. Overall result

| Field | Value |
|-------|--------|
| Overall | PASS / LIGHT PARTIAL / PARTIAL / FAIL / BLOCKED |
| Reason | _2–5 lines — summary only_ |
| Proceed to **E08-CLOSEOUT-PLANNING** | yes / no |
| Next gate | _see branching below_ |

### Branching (next gate)

| Overall | Typical next gate |
|---------|-------------------|
| **PASS** / **LIGHT PARTIAL** | `CATEGORY-1-M55-CONSULT-REPLY-QUALITY-E08-CLOSEOUT-PLANNING` |
| **PARTIAL** | `CATEGORY-1-M55-CONSULT-REPLY-QUALITY-E08-ISSUE-MAPPING-PLANNING` and/or micro-copy / sanitizer planning |
| **FAIL** | `CATEGORY-1-M55-CONSULT-REPLY-QUALITY-E08-ISSUE-MAPPING-PLANNING` |
| **BLOCKED** | `CATEGORY-1-M55-CONSULT-REPLY-QUALITY-LANE-A-SAMPLE-CHECK-PLANNING` (after conditions met; separate GO for send) |

### Overall criteria reminder (from E08-CLOSE-CRITERIA)

- **PASS:** No major axis FAIL; Product Truth PASS; anti-sycophancy PASS or light PARTIAL; 保存版接地 and sanitizer PASS or light PARTIAL.
- **LIGHT PARTIAL:** 1–2 axes PARTIAL; no major FAIL; operationally acceptable.
- **PARTIAL:** 2–3 axes weak; E-08 close **held**.
- **FAIL:** Structural FAIL on Product Truth / anti-sycophancy / 保存版接地 / sanitizer; E-08 close **not allowed**.
- **BLOCKED:** No send or no evaluable reply — see §11.

---

## 9. Redaction checklist

Confirm before publishing the sample record:

- [ ] no user_id
- [ ] no email
- [ ] no session ID
- [ ] no Stripe ID
- [ ] no Clerk ID
- [ ] no Supabase keys
- [ ] no tokens / secrets
- [ ] no DB row IDs
- [ ] no thread IDs
- [ ] no message IDs
- [ ] no full reply body
- [ ] no raw checkout URL
- [ ] no Authorization headers
- [ ] no OpenAI raw request/response dump
- [ ] no Vercel env values

---

## 10. Reply handling

**Mandatory rules for SAMPLE RECORD instances:**

1. **Full reply is not stored** in this document.
2. Use a **redacted summary** section only (bullets).
3. **Short quotes:** maximum **4** lines; each **≤ 1 sentence**; no PII / IDs / secrets.
4. Remove user-specific identifiers from any quote.
5. Evaluation is **summary-based** — not a reproduction of the full assistant message.

### Redacted summary (fill on SAMPLE RECORD only)

_Observed content (summary):_

- _bullet_
- _bullet_

### Short quotes (fill on SAMPLE RECORD only)

| # | Quote fragment (≤1 sentence, redacted) |
|---|--------------------------------------|
| 1 | |
| 2 | |
| 3 | |
| 4 | |

---

## 11. BLOCKED handling

Use when **Sent = no** or reply is not evaluable.

| Field | Value |
|-------|--------|
| Sent | **no** |
| Overall | **BLOCKED** |
| 8-axis evaluation | **N/A** (all axes) |
| Quality evaluation performed | **no** |
| send count | _record actual_ |
| retry count | **0** (confirm) |
| ticket before / after | _numbers only_ |
| HTTP status | _if any response_ |
| blocked reason | ticket / auth / entitlement / ownership / 409 / 422 / 500 / timeout / network / other |
| next action | _e.g. wait for ticket ≥ 1; fix auth; separate GO — no automatic retry_ |

**ticket = 0:** Do not send. Do not fill §5 ratings. Preconditions fail.

---

## 12. Safety boundary (this template)

| Statement | |
|-----------|--|
| This template does **not** close E-08 | E-08 product quality remains **OPEN** until separate CLOSEOUT gates |
| This template does **not** create a sample | TEMPLATE file has no Production send |
| This template does **not** authorize sending | Separate explicit GO required for consult send |
| consult send | **not performed** for this file |
| reply generation | **not performed** for this file |
| ticket consumption | **not performed** for this file |
| checkout / additional purchase | **not performed** for this file |
| DB / SQL / manual grant / webhook replay | **not performed** for this file |
| Product Truth change | **none** |
| prompt / sanitizer / Lane B / code change | **none** |

---

## 13. Lane scope reminder

**In scope (Lane A):** `/dtr/core` → `ConsultRoom` → `POST /api/room/core/send` → safety allow → quality pass → `m55_consult_reply_commit`.

**Out of scope (separate backlog):** Lane B `/reply`, `POST /api/reply/generate`, stub JSON, stub generator — **not** required for E-08 close per STUB-BOUNDARY.

---

## 14. Template attestation (DRAFT gate)

| Action | Done? |
|--------|-------|
| Created **one** new file under `docs/review/` | Yes (this file) |
| Actual sample result written | **No** |
| Full reply stored | **No** |
| E-08 closed | **No** |
