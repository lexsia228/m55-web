# Phase 5-6H-5Z-I-AB — Post-consume DB read-only verification gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-AB Post-consume DB read-only verification gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-AA`** | **`INCLUDED_REPLY_TICKET_ACTUAL_CONSUME_EXECUTION_RECORDED`** — **exactly-one consume**／**reply generated**／**remaining_after visible 0** |
| **本条** | **Production DB `SELECT` read-only** 証跡を **redacted のみ**固定 |
| **Agent（本条 commit）** | **Production `SELECT` 未実行** — **Human-local observation NOT SUBMITTED** |

**Work anchor：** **`5c414164f438f680b277f1cb9b60357468e83e2e`** — **`docs: update included reply ticket consume execution result`**（**`5Z-I-AA`**）。

**UI baseline（`5Z-I-AA` — not DB proof）：** **remaining_before 1** → **remaining_after visible 0**／**theme 距離と期待**／**supplementary 2**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-AB-POST-CONSUME-DB-READONLY-VERIFICATION-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-AA-INCLUDED-REPLY-TICKET-ACTUAL-CONSUME-EXECUTION-001`** | consume execution |
| **`M55-EVID-20260518-5Z-I-Z-INCLUDED-REPLY-TICKET-ACTUAL-CONSUME-PLAN-001`** | planning |
| **`M55-EVID-20260518-5Z-I-Y-INCLUDED-REPLY-TICKET-UI-READONLY-VERIFICATION-001`** | UI pre-consume |

**Full user_id／email／session／document id／reply id／SQL with full IDs：** **SSOT に記録しない**。

---

## 4. Safe labels（参照のみ）

| Label | Use |
|-------|-----|
| **`canonical-normal-login`** / **`M55-Official production user`** | Human SQL Editor filter context（**local only**） |
| **`5Z-I-AA included reply consume`** | execution window |
| **`距離と期待`** | theme safe label（UI — not stored in DB as sole key） |
| **`user_36xz`** | repair-era label（**may or may not equal post-login DB user** — **do not assume in SSOT**） |

---

## 5. DB read-only result summary（Human `SELECT` — redacted）

**Human-local Supabase Production `SELECT`：** **NOT SUBMITTED with this commit.**

**許可トークン：** `found expected`／`missing unexpected`／`duplicate unexpected`／`mismatch`／`unclear`／`non-blocking found`／`blocking found`

| 対象 | **classification** | **row_count / value** | 備考 |
|------|-------------------|----------------------|------|
| **A. `reply_ticket_wallets`** | **unclear** | **wallet row_count:** unclear | **expected:** row **1** for target user context；**`available_count_after`:** **0** expected |
| **B. `reply_wallet_ledgers`** | **unclear** | **`reply_consume` row_count:** unclear | **expected:** **1**；**duplicate consume:** unclear |
| **C. `reply_sessions`** | **unclear** | **row_count:** unclear | **expected:** **≥1**（recent session for consume） |
| **D. `reply_documents`** | **unclear** | **row_count:** unclear | **expected:** **≥1**；**generated content present:** unclear |
| **E. Payment / Stripe side-effect** | **unclear** | — | **expected:** **no** new payment for included consume |
| **F. Duplicate / idempotency** | **unclear** | — | **wallet negative:** unclear；**duplicate consume:** unclear；**duplicate reply:** unclear |

**Prior baseline（`5Z-I-R` repair — pre-consume, not post-consume proof）：** **`reply_ticket_wallets` `found expected` row_count 1** at repair grant — **does not substitute post-consume `available_count = 0` verification**.

---

## 6. Aggregate classification

| Field | Value |
|--------|--------|
| **aggregate_classification** | **`POST_CONSUME_DB_VERIFICATION_INCONCLUSIVE`** |

**未採用（Human SELECT pending）：** `POST_CONSUME_DB_ARTIFACTS_VERIFIED`／`PARTIAL`／`MISSING`／`DUPLICATE_OR_BLOCKING_FINDING`

---

## 7. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`POST_CONSUME_DB_READONLY_VERIFICATION_INCONCLUSIVE`** |

**未採用：**

| Token | 理由 |
|-------|------|
| **`POST_CONSUME_DB_READONLY_VERIFICATION_GREEN`** | no Human `row_count` submitted |
| **`POST_CONSUME_DB_READONLY_VERIFICATION_PARTIAL_BLOCKED`** | no partial evidence |
| **`POST_CONSUME_DB_READONLY_VERIFICATION_BLOCKED_DUPLICATE_OR_NEGATIVE`** | no duplicate evidence |

---

## 8. Human-local SELECT checklist（for follow-up — do not paste full IDs into SSOT）

Run in **Supabase SQL Editor** only. Record **row_count / classification only** in chat or SSOT amend.

| # | Check | Expected |
|---|-------|----------|
| 1 | Wallet for **M55-Official production user** | **1 row**；**`available_count = 0`** |
| 2 | Ledger **`event_type = reply_consume`**（recent） | **1** row for this consume；**not >1** |
| 3 | **`reply_sessions`** for user | **≥1**；status **`succeeded`** for latest consume |
| 4 | **`reply_documents`** linked to session | **≥1**；payload present（**do not copy payload to SSOT**） |
| 5 | No new Stripe checkout for this consume | **no** new OTF for included consume |
| 6 | **`available_count >= 0`** | **no negative** |

---

## 9. 未実行事項

- **Production DB write／second consume／retry**
- **reply generation re-run**
- **payment／checkout／refund／rollback**
- **runner／Events／replay**
- **env change／redeploy／code／UI change**
- **full IDs／secrets／session／prompt／reply full text**

---

## 10. Next

**採用（inconclusive）：**

- **`Phase 5-6H-5Z-I-AC` Post-consume diagnostic gate** — Human submits redacted **`row_count`** for §5 table
- **or** amend **`5Z-I-AB`** evidence after Human-local `SELECT`

**If later GREEN（wallet 0 + consume ledger 1 + session/doc found + no duplicate）：**

- **`5Z-I-AC` UI generated reply verification / end-to-end reply flow summary gate**

**Hard stop：** **no retry**／**no refund**／**no manual repair** until separately planned.

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_AB_POST_CONSUME_DB_READONLY_VERIFICATION_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-AB-POST-CONSUME-DB-READONLY-VERIFICATION-001`** |
| **Aggregate** | **`POST_CONSUME_DB_VERIFICATION_INCONCLUSIVE`** |
| **Verdict** | **`POST_CONSUME_DB_READONLY_VERIFICATION_INCONCLUSIVE`** |
| **Next** | **`5Z-I-AC` diagnostic** or Human `row_count` submission |
