# Phase 5-6H-5Z-I-Q — Exactly-one repair execution gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-Q Exactly-one repair execution gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-P`** | **`READY_FOR_EXACTLY_ONE_REPAIR_EXECUTION_GATE`** — exactly-one 実行計画 SSOT 済み（`b52d6e0`）。 |
| **`5Z-I-O-D`** | **`HUMAN_SIDE_DRY_RUN_READY_RECORDED_FOR_REPAIR_PLANNING`**（Stripe **all matched**／Supabase **all 0**／final **`DRY_RUN_READY_FOR_EXACTLY_ONE_REPAIR_EXECUTION_PLANNING`**／**repair 実行なし**）。 |
| **本条コミット工程** | **Human-private での exactly one が前提**。**Cursor／agent workspace は full `M55_REPAIR_*`／live Stripe／Supabase role を SSOT に書けず入力も検証しないため、**runner は本条コミットでは起動しない**。**無断再試行・二回実行なし**。 |

**Work anchor：** **`b52d6e0cfa1c201c3683899d86b4995a75315463`** — **`docs: plan exactly one repair execution`**（**`5Z-I-P`**）。

**Runner path（変更なし・read-only 前提）：** `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`  
**確認フレーズ（ソース定数）：** `M55_EXECUTE_CONFIRM_PHRASE` **＝** **`M55_CONFIRM_ONE_SHOT_DTR_CORE_MANUAL_REPAIR_20260516`**（runner ソースと同一文字列）

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-Q-EXACTLY-ONE-REPAIR-EXECUTION-001`** | **本条：** exactly-one repair **実行 gate 記録枠** |
| **`M55-EVID-20260516-5Z-I-P-EXACTLY-ONE-REPAIR-EXECUTION-PLAN-001`** | 実行計画 |
| **`M55-EVID-20260516-5Z-I-O-D-HUMAN-SIDE-DRY-RUN-READY-ATTESTATION-001`** | dry-run READY |
| **`M55-EVID-20260516-5Z-I-N-MINIMAL-REPAIR-RUNNER-CODE-CREATED-001`** | runner コード作成 |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | Supabase mapping（read-only 前提） |

**Full IDs／secrets：** **記録しない**。

---

## 4. Execution summary（redacted）

| Field | 本条コミット時点の記録 |
|-------|------------------------|
| **command class** | `npx tsx scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`（**値は記載しない**） |
| **execution count（runner 起動）** | **0**（workspace agent は runner を起動していない。Human-private の exactly one は本条の外。） |
| **dry-run mode** | **`not_applicable`**（runner 未起動） |
| **confirmation phrase matched** | **`not_applicable`**（runner 未起動） |
| **full IDs／secrets printed** | **no** |
| **DB write occurred by runner** | **no** |
| **repair final token** | **`REPAIR_NOT_EXECUTED`** |

**Safe labels（参照のみ・DB 値ではない）：** **`cs_live_JSRW`**（checkout 部分一致ラベル）／**`user_36xz`**（user／client_reference 部分一致ラベル）

---

## 5. Validation summary（redacted）

| Area | 本条コミット時点 |
|------|------------------|
| **Stripe validation（9 項）** | **not_executed**（runner 未起動） |
| **pre-existing artifact 事前確認** | **not_executed** |
| **`stripe_events` pre-insert** | **not_executed** |
| **`fulfillDtrCoreFromCheckoutSessionId`** | **not_executed** |
| **full IDs** | **記録なし** |

**Human-private で exactly one を完了した場合：** 次回以降の追認コミットでは **`5Z-I-P` §7.1** の許可列挙に従い **matched／inserted／success 等**のみ記録する（**raw 出力・full ID 禁止**）。

---

## 6. Final result

| Field | Value |
|--------|--------|
| **final result token** | **`REPAIR_NOT_EXECUTED`** |
| **説明** | **`5Z-I-Q` で許可される Production repair は Human-private のみ**。本条は **SSOT 記録と gate 境界の固定**。**workspace 上で runner を起動していない**ため **修復の成否は未確定**。**二回目実行・retry なし**。 |

---

## 7. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`REPAIR_EXECUTION_NOT_EXECUTED`** |

**Human-private で `REPAIR_EXECUTED_ONCE` 等を得た場合の推奨判定（参考・本条未採用）：** **`EXACTLY_ONE_REPAIR_EXECUTION_RECORDED`** ／ STOP 系／部分失敗系は **`5Z-I-P`** の STOP 一覧に従い **別 redacted attest**。

---

## 8. 未実行事項（本条コミット工程）

- **runner の二回目実行・自動再試行**
- **manual SQL／manual entitlement／manual wallet・ticket**
- **Events API／webhook／CLI／Dashboard replay／再送**
- **新規決済／checkout 再試行／refund／rollback**
- **Stripe webhook 設定・`STRIPE_WEBHOOK_SECRET`／whsec／env の恒久的変更**
- **Vercel redeploy／package／dependency／npm script 変更**
- **runner・runtime／UI の変更**
- **full ID／secret／raw ターミナル／printenv の SSOT 記録**
- **safe label を DB リテラルとして用いること**

**本条：** **UI unlock／返書券確認は行わない**（**`5Z-I-S`／`5Z-I-T` 以降**）。

---

## 9. Next

**本条の記録（runner 未起動）の場合：**

- **`5Z-I-Q` の実体（Human-private exactly one）が未完了**の間、**`5Z-I-R`（post-repair read-only verification）を開始しない**。
- Human が private で **exactly one を完了**したら、**同一 Evidence 枠に redacted メタのみ**追認し、結果に応じて次を選ぶ：
  - **成功（`REPAIR_EXECUTED_ONCE` 想定）：** **`Phase 5-6H-5Z-I-R` Post-repair Production DB read-only verification gate**（**UI unlock なし**／**refund なし**）。
  - **write 前 STOP：** **`Phase 5-6H-5Z-I-R` Repair stopped before write diagnostic gate**（**別 planning なし retry 禁止**）。
  - **部分 write 後失敗：** **`Phase 5-6H-5Z-I-R` Partial-write diagnostic／read-only verification gate**（**証跡なし retry／refund 禁止**）。

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_Q_EXACTLY_ONE_REPAIR_EXECUTION_2026-05-16.md`
