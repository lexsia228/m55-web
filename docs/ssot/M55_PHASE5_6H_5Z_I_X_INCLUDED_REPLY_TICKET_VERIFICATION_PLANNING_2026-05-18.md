# Phase 5-6H-5Z-I-X — Included reply-ticket verification planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-X Included reply-ticket verification planning gate**

本条は **included reply-ticket の正式検証前の docs-only 計画固定**。**DB write／チケット消費／返書生成／返書送信／追加決済／runner／code 変更なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-W`** | **`UI_LOGIN_IDENTITY_CORRECTION_UNLOCK_VERIFICATION_GREEN`** |
| **DTR paid report** | unlocked under **`canonical-normal-login`** |
| **Included reply-ticket** | area visible / **remaining 1** observed（preliminary） |
| **Formal use** | **not executed** |
| **本条** | **verification level + STOP + evidence plan** |

**Work anchor：** **`2eeeae53004ad10c50af1a48082f94eb4cf611fc`** — **`docs: record ui login identity correction unlock`**（**`5Z-I-W`**）。

**Safe labels：** **`canonical-normal-login`**／**`M55-Official production user`**／**`previous-private-login`**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-X-INCLUDED-REPLY-TICKET-VERIFICATION-PLAN-001`** | **本条：planning** |
| **`M55-EVID-20260518-5Z-I-W-UI-LOGIN-IDENTITY-CORRECTION-UNLOCK-001`** | UI unlock GREEN |
| **`M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-RESULT-001`** | Clerk **`M55-Official`** |
| **`M55-EVID-20260516-5Z-I-Q-EXACTLY-ONE-REPAIR-EXECUTION-001`** | repair + included grant path |

**Full user_id／email／session／secret：** **記録しない**。

---

## 4. Observed preliminary state（`5Z-I-W` 継承）

| Check | Result |
|-------|--------|
| **Login context** | **`canonical-normal-login`** / **`M55-Official production user`** |
| **Report unlocked** | **yes** |
| **Included reply-ticket area visible** | **yes** |
| **Remaining observed** | **1** |
| **Formal verification/use** | **not executed** |
| **`M55-Official`** | **CANONICAL_KEEP** |
| **`M55-core`** | **HOLD_QUARANTINE / not delete** |

---

## 5. Verification level plan（§A）

| Level | Scope | DB write | **Recommend for `5Z-I-Y`** |
|-------|--------|----------|---------------------------|
| **LEVEL_1_UI_VISIBLE_ONLY** | 残数表示・ルーム導線・ボタンラベル確認 | **no** | **yes（primary）** |
| **LEVEL_2_DRY_PATH_NO_SUBMIT** | テーマ／補助質問トグル・入力欄のみ。**「返書を作成する」押下禁止** | **no** | **yes（optional）** |
| **LEVEL_3_ACTUAL_REPLY_USE** | 実消費＋返書生成（`POST /api/reply/generate`） | **yes** | **no — 別 Gate + explicit GO** |

**採用：** **`5Z-I-Y` は LEVEL_1 必須、LEVEL_2 まで。LEVEL_3 は `5Z-I-Z` 以降の別 Gate。**

---

## 6. Read-only inspection summary（repo — 未実行・設計確認のみ）

### 6.1 Reply-ticket UI

| Item | Finding |
|------|---------|
| **Primary route** | **`/reply`** → `app/reply/page.tsx` → `ConsultationRoomInput` |
| **Legacy/alternate** | `components/dtr/ConsultRoom.tsx`（`GET /api/room/core` wallet 併記） |
| **Remaining count source** | DB **`reply_ticket_wallets.available_count`** → UI **`残り {available_count}件`**（`ConsultationTicketWallet` / `ConsultRoom`） |
| **Wallet card CTA** | **「相談返書を作成する」** → scroll only（`onCreateReply`）— **no consume** |
| **Selection UI** | Theme chips + supplementary questions（max 3）— **client state only** |
| **Submit control** | **「返書を作成する」** → **`POST /api/reply/generate`** |

### 6.2 Wallet / ledger data model

| Table | Role |
|-------|------|
| **`reply_ticket_wallets`** | SSOT counters: `initial_included_count`, `purchased_count`, `consumed_count`, `available_count`, `status`; optional `report_instance_id` |
| **`reply_wallet_ledgers`** | Grant/consume audit (`included_grant`, `purchase_grant`, `reply_consume`, …) |
| **`reply_sessions`** | Per-attempt session; `idempotency_key`; status lifecycle |
| **`reply_documents`** | Generated reply payload (`payload_json` v1.1) |
| **`entitlement_rights`** | DTR ownership（reply page gate via `resolveEntryReportOwnership`） |

**Included grant source（read-only）：** `lib/m55/dtrCoreCheckoutFulfillment.ts` → **`grantInitialIncludedReplyIfNeeded`**（`lib/m55/reply/walletGrants.ts`）after DTR core fulfillment（**`5Z-I-Q` 文脈**）。

### 6.3 API / routes（do not execute POST in planning）

| Route | Method | DB write risk |
|-------|--------|----------------|
| **`/api/reply/generate`** | POST | **yes** — session insert + RPC commit |
| **`/api/reply-tickets/checkout`** | POST | **yes** — Stripe checkout（追加購入。**`5Z-I-Y` 禁止**） |
| **`/api/reply/history`** | GET | read-only |
| **`/api/reply/session/[id]`** | GET | read-only |
| **`/api/room/core`** | GET | read-only（wallet snapshot） |
| **`/api/room/core/send`** | POST | **yes** — legacy consult send + consume（**別導線。`5Z-I-Y` 非対象**） |

**Commit RPC：** `m55_reply_generate_commit`（`supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql`）。

### 6.4 Consumption timing（設計 — repo 確定）

| Action | Consumes ticket? |
|--------|------------------|
| Theme / subquestion toggle | **no** |
| Free-text input | **no** |
| Wallet **「相談返書を作成する」** scroll | **no** |
| **`POST /api/reply/generate`** submit | **yes**（on successful RPC **`consumption_applied: true`**） |
| Session row insert (`reply_sessions` accepted) | **DB write occurs** but **not wallet decrement** until RPC success |
| Idempotent replay（same `X-Idempotency-Key`, doc exists） | **no double consume**（`consumption_applied: false`） |
| RPC / schema failure before commit | **no consume**（session may be `failed`） |
| **`POST /api/room/core/send`**（legacy） | **separate path** — consume on successful dual message commit |

**Failure rollback：** wallet decrement is **inside atomic RPC** with document insert; failed generate before RPC → **no consume**.

**Duplicate click:** client sets `isSubmitting`; server idempotency key per submit attempt.

### 6.5 Evidence requirements for next Gate（`5Z-I-Y`）

| # | Requirement |
|---|-------------|
| 1 | **`canonical-normal-login`** confirmed before UI check |
| 2 | Screenshot/notes: **remaining count = 1**（redacted — no email） |
| 3 | Confirm **「返書を作成する」** present but **not clicked** in LEVEL_1/2 |
| 4 | If LEVEL_2: theme toggle OK; **no submit** |
| 5 | **No** `POST /api/reply/generate` in `5Z-I-Y` |
| 6 | LEVEL_3 requires separate evidence: before/after `available_count`, `consumption_applied` flag |

---

## 7. STOP conditions（§B）

| ID | Condition |
|----|-----------|
| **S-01** | Remaining count **not visible** |
| **S-02** | Remaining count **≠ 1** |
| **S-03** | UI action would **immediately POST** generate/checkout |
| **S-04** | **「返書を作成する」** clicked accidentally |
| **S-05** | Endpoint / consume timing **unclear** to operator |
| **S-06** | Unexpected error / connection failure |
| **S-07** | **`canonical-normal-login`** not confirmed |
| **S-08** | Recording would expose **full IDs/session** |

---

## 8. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`READY_FOR_INCLUDED_REPLY_TICKET_UI_READONLY_VERIFICATION_GATE`** |

**採用理由：** repo read-only で **UI source / consume timing / idempotency** が特定可能。**`5Z-I-Y` = LEVEL_1（+ optional LEVEL_2）** で進行。

**未採用：**

| Token | 理由 |
|-------|------|
| **`INCLUDED_REPLY_TICKET_PLANNING_NEEDS_REPO_READONLY_DIAGNOSTIC`** | consume timing は RPC まで特定済み |
| **`INCLUDED_REPLY_TICKET_PLANNING_BLOCKED`** | blocking なし |

---

## 9. Next

**採用：**

- **`Phase 5-6H-5Z-I-Y` Included reply-ticket UI read-only verification gate**
  - **LEVEL_1**（required）+ optional **LEVEL_2**
  - **no submit / no consume / no DB write**

**後続（explicit GO 後）：**

- **`5Z-I-Z` or later** — **LEVEL_3** actual reply use（`consumption_applied` 検証）

---

## 10. 未実行事項

- **Production DB write**
- **ticket consume / reply generation / reply送信**
- **additional payment / checkout retry**
- **runner / second repair / Events / replay**
- **env change / redeploy / code / UI change**
- **formal included reply-ticket use**
- **full IDs / secrets / session 記録**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_X_INCLUDED_REPLY_TICKET_VERIFICATION_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-X-INCLUDED-REPLY-TICKET-VERIFICATION-PLAN-001`** |
| **Verdict** | **`READY_FOR_INCLUDED_REPLY_TICKET_UI_READONLY_VERIFICATION_GATE`** |
| **Next** | **`5Z-I-Y` LEVEL_1–2 UI read-only** |
| **LEVEL_3** | **deferred — explicit GO + separate gate** |
