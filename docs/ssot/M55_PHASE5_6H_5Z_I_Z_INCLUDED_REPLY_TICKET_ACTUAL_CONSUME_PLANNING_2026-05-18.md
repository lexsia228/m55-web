# Phase 5-6H-5Z-I-Z — Included reply-ticket actual consume / reply generation planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-Z Included reply-ticket actual consume / reply generation planning gate**

本条は **LEVEL_3 実消費・返書生成の実行計画のみ**。**実消費・reply generation・DB write・送信・追加決済は行わない**。Actual consume は **`5Z-I-AA` + explicit Human GO** のみ。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-W`** | DTR unlock **`UI_LOGIN_IDENTITY_CORRECTION_UNLOCK_VERIFICATION_GREEN`** |
| **`5Z-I-X`** | consume timing planning GREEN |
| **`5Z-I-Y`** | **`INCLUDED_REPLY_TICKET_UI_READONLY_VERIFICATION_GREEN`** — **remaining 1 visible** |
| **本条** | **actual consume planning only** |

**Work anchor：** **`7c57cc4557601b3740e40725b04eded5b4ea5930`** — **`docs: record included reply ticket ui readonly verification`**（**`5Z-I-Y`**）。

**Login / product context：** **`canonical-normal-login`**／**`M55-Official production user`**／paid DTR saved report unlocked

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-Z-INCLUDED-REPLY-TICKET-ACTUAL-CONSUME-PLAN-001`** | **本条：planning** |
| **`M55-EVID-20260518-5Z-I-Y-INCLUDED-REPLY-TICKET-UI-READONLY-VERIFICATION-001`** | UI read-only GREEN |
| **`M55-EVID-20260518-5Z-I-X-INCLUDED-REPLY-TICKET-VERIFICATION-PLAN-001`** | LEVEL_1–3 plan |
| **`M55-EVID-20260518-5Z-I-W-UI-LOGIN-IDENTITY-CORRECTION-UNLOCK-001`** | DTR unlock |

**Full user_id／email／session／prompt全文／返書全文：** **記録しない**。

---

## 4. Actual consume scope（§1）

| Rule | Value |
|------|--------|
| **Tickets to consume** | **exactly one included reply-ticket** |
| **User context** | **`canonical-normal-login`** / **`M55-Official production user`** |
| **Product context** | **paid DTR saved report**（ownership unlocked） |
| **Additional payment** | **prohibited** |
| **Checkout** | **prohibited** |
| **Refund** | **only via later failure decision gate** |
| **Second attempt** | **prohibited without separate gate** |
| **Route** | **`/reply`**（相談返書ルーム）— **not legacy `/api/room/core/send`** |

---

## 5. Input policy（§2）

| Rule | Detail |
|------|--------|
| **Theme** | **exactly one** selected（record **safe theme label only** in execution evidence） |
| **Supplementary questions** | **max 3**（record **count only**） |
| **Content scope** | **DTR saved report–grounded only** — **off-topic prohibited** |
| **Free text** | allowed per UI; **do not record full text in SSOT** |
| **SSOT recording** | **redacted topic/category + counts only** |

**Human-observed theme labels（`5Z-I-Y` UI — reference for safe labels）：** 役割・裁量／距離と期待／消耗と回復／迷いの一本化／入り方・抜け方（**pick one at execution**）

---

## 6. Execution trigger（§3 — repo confirmed）

| Step | Consumes? |
|------|------------|
| Theme / supplementary toggle / free-text typing | **no** |
| **「相談返書を作成する」**（wallet scroll CTA） | **no** |
| **「返書を作成する」** → **`POST /api/reply/generate`** | **yes**（wallet decrement on RPC success） |

| Requirement | Detail |
|-------------|--------|
| **HTTP** | **`POST /api/reply/generate`** |
| **Header** | **`X-Idempotency-Key`** required（client `crypto.randomUUID()` per attempt） |
| **Auth** | Clerk **`userId`**（Production-bound session） |
| **DB write authorization** | **`5Z-I-AA` explicit Human GO only** |
| **Pre-RPC** | may **`INSERT reply_sessions`**（status `accepted`）— **not wallet consume** |
| **Atomic commit** | RPC **`m55_reply_generate_commit`** — **`consumption_applied: true`** on success |

**Client guard：** `isSubmitting` disables double-click during in-flight request.

---

## 7. Expected artifacts after future execution（§4 — `5Z-I-AB` verification）

| Artifact | Expected change |
|----------|-----------------|
| **`reply_ticket_wallets.available_count`** | **1 → 0** |
| **`reply_ticket_wallets.consumed_count`** | **+1** |
| **`reply_wallet_ledgers`** | **one `reply_consume` entry**（delta **-1**） |
| **`reply_sessions`** | session row; status **`succeeded`** on success |
| **`reply_documents`** | **one document** linked to session (`payload_json` v1.1) |
| **Duplicate consume** | **no**（idempotent replay → **`consumption_applied: false`**） |
| **Additional paid ticket** | **no**（no Stripe / no checkout） |
| **Stripe event** | **none** for this flow |

---

## 8. Idempotency / duplicate click（§5）

| Design element | Status |
|----------------|--------|
| **`X-Idempotency-Key` per submit** | **confirmed**（`ConsultationRoomInput.handleSubmit`） |
| **Server session lookup by `(user_id, idempotency_key)`** | **confirmed** |
| **RPC replay when document exists** | **`consumption_applied: false`** |
| **409 on payload mismatch** | **confirmed** |
| **Client `isSubmitting`** | **confirmed** |

**Planning verdict：** idempotency **sufficient for `5Z-I-AA`** — **STOP if operator observes duplicate debit**.

---

## 9. Failure classification（§6）

| Token | Meaning |
|-------|---------|
| **`CONSUME_STOPPED_BEFORE_WRITE`** | STOP or abort before **`POST /api/reply/generate`** completes |
| **`CONSUME_FAILED_AFTER_DEBIT`** | wallet decremented but no usable reply artifact（critical — escalate） |
| **`CONSUME_FAILED_NO_REPLY_ARTIFACT`** | API error / 422 / 500 without confirmed document |
| **`CONSUME_SUCCESS_REPLY_GENERATED`** | 200 + reply visible / navigation to result |
| **`CONSUME_INCONCLUSIVE`** | outcome unclear without DB read-back |
| **`DUPLICATE_CONSUME_RISK`** | second debit or **available_count < expected** without explanation |

---

## 10. Evidence format — future execution gate（§7）

Record **only**:

| Field | Example |
|-------|---------|
| **execution_count** | **1** |
| **selected_theme_safe_label** | e.g. **`theme-role-discretion`**（redacted category — not full prompt） |
| **supplementary_question_count** | **0–3** |
| **remaining_before** | **1** |
| **final_ui_result** | **generated / failed / stopped / unclear** |
| **wallet_after** | **verified later / not yet**（**`5Z-I-AB`**） |
| **db_write_occurred** | **yes / no / unclear** |
| **reply_generated** | **yes / no / unclear** |
| **consumption_applied** | from API response if visible（**boolean only**） |

**Never record：** full prompt, full reply body, user_id, email, session, cookies, tokens.

---

## 11. STOP conditions（§8）

| ID | Condition |
|----|-----------|
| **Z-S-01** | **remaining ≠ 1** immediately before execution |
| **Z-S-02** | wrong login context（not **`canonical-normal-login`** / **`M55-Official`**） |
| **Z-S-03** | DTR report **not unlocked** |
| **Z-S-04** | **`POST /api/reply/generate`** endpoint uncertain |
| **Z-S-05** | idempotency uncertain |
| **Z-S-06** | UI shows **purchase / payment** requirement |
| **Z-S-07** | unexpected **checkout** redirect |
| **Z-S-08** | full IDs/session would be exposed in evidence |
| **Z-S-09** | uncertainty whether click **consumes** |
| **Z-S-10** | **duplicate click** risk not mitigated |
| **Z-S-11** | Human **not ready** to spend included ticket |
| **Z-S-12** | **`5Z-I-AA` explicit GO** not given |

---

## 12. Gate sequence（§9）

| Phase | Role | DB write |
|-------|------|----------|
| **`5Z-I-AA`** | **Actual included reply consume execution** | **yes**（on GO） |
| **`5Z-I-AB`** | Post-consume **DB read-only** verification | **no** |
| **`5Z-I-AC`** | **UI generated reply** verification | **no** |
| **`5Z-I-AD`** | Additional **¥500** reply-ticket purchase **planning** | **no** — **only after included flow GREEN** |

---

## 13. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`READY_FOR_INCLUDED_REPLY_TICKET_ACTUAL_CONSUME_EXECUTION_GATE`** |

**採用理由：** route（**`/api/reply/generate`**）、consume timing（RPC **`m55_reply_generate_commit`**）、idempotency、expected artifacts are **repo-confirmed**（**`5Z-I-X`**）; UI preflight **GREEN**（**`5Z-I-Y`**）。

**未採用：**

| Token | 理由 |
|-------|------|
| **`INCLUDED_REPLY_TICKET_ACTUAL_CONSUME_PLANNING_BLOCKED`** | no blocking finding |
| **`INCLUDED_REPLY_TICKET_ACTUAL_CONSUME_PLANNING_NEEDS_MORE_REPO_DIAGNOSTIC`** | diagnostic complete in **`5Z-I-X`** |

---

## 14. Next

**採用：**

- **`Phase 5-6H-5Z-I-AA` Included reply-ticket actual consume execution gate**
  - **requires explicit Human GO**
  - **may perform DB write** by consuming the included ticket
  - **exactly one execution**; then **`5Z-I-AB`** → **`5Z-I-AC`**

**未採用（本条）：** read-only diagnostic branch

---

## 15. 未実行事項

- **ticket consume / reply generation / reply送信**
- **Production DB write / write RPC**
- **additional payment / checkout / refund / rollback**
- **runner / second repair / Events / replay**
- **env change / redeploy / code / UI change**
- **full IDs / secrets / session / prompt / reply full text**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_Z_INCLUDED_REPLY_TICKET_ACTUAL_CONSUME_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-Z-INCLUDED-REPLY-TICKET-ACTUAL-CONSUME-PLAN-001`** |
| **Verdict** | **`READY_FOR_INCLUDED_REPLY_TICKET_ACTUAL_CONSUME_EXECUTION_GATE`** |
| **Next** | **`5Z-I-AA`**（explicit GO） |
