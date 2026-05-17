# Phase 5-6H-5Z-I-Q — Exactly-one repair execution gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-Q Exactly-one repair execution gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-P`** | **`READY_FOR_EXACTLY_ONE_REPAIR_EXECUTION_GATE`** — exactly-one 実行計画 SSOT 済み（`b52d6e0`）。 |
| **`5Z-I-O-D`** | **`HUMAN_SIDE_DRY_RUN_READY_RECORDED_FOR_REPAIR_PLANNING`**（Stripe **all matched**／Supabase **all 0**／final **`DRY_RUN_READY_FOR_EXACTLY_ONE_REPAIR_EXECUTION_PLANNING`**）。 |
| **`b9793ea` における Cursor／agent 記録** | **`REPAIR_EXECUTION_NOT_EXECUTED`**（workspace では runner **未起動**。同一 Evidence で **baseline** とした）。 |
| **本条（SSOT update）** | Human-private terminal にて **exactly-one repair** が **完了**。**redacted メタのみ**同一 Evidence で追認。**本条コミットでは runner を再実行しない**／**DB に追加 write しない**。 |

**Planning anchor：** **`b52d6e0cfa1c201c3683899d86b4995a75315463`** — **`docs: plan exactly one repair execution`**（**`5Z-I-P`**）。

**Prior execution gate baseline：** **`b9793ea601b07cdee5ba08345b57b0854adc7f23`** — **`docs: record exactly one repair execution`**（**agent-scope `NOT_EXECUTED`**）。

**Runner path（変更なし・本条では実行しない）：** `scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`。
**確認フレーズ（ソース定数）：** `M55_EXECUTE_CONFIRM_PHRASE` **＝** **`M55_CONFIRM_ONE_SHOT_DTR_CORE_MANUAL_REPAIR_20260516`**（runner ソースと同一文字列）

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-Q-EXACTLY-ONE-REPAIR-EXECUTION-001`** | **本条：** exactly-one repair **実行 gate 記録枠（同一 ID で Human-private 結果を追認）** |
| **`M55-EVID-20260516-5Z-I-P-EXACTLY-ONE-REPAIR-EXECUTION-PLAN-001`** | 実行計画 |
| **`M55-EVID-20260516-5Z-I-O-D-HUMAN-SIDE-DRY-RUN-READY-ATTESTATION-001`** | dry-run READY |
| **`M55-EVID-20260516-5Z-I-N-MINIMAL-REPAIR-RUNNER-CODE-CREATED-001`** | runner コード作成 |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | Supabase mapping（read-only 前提） |

**Full IDs／secrets：** **記録しない**。**raw terminal／printenv：** **転載しない**。

---

## 4. Execution summary（redacted・Human-private 追認）

| Field | Human-private attestation |
|-------|---------------------------|
| **command class** | `npx tsx scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`（**値・one-liner は SSOT に書かない**） |
| **execution count（runner invocations）** | **1** |
| **dry-run mode** | **false** |
| **confirmation phrase matched** | **yes** |
| **full IDs／secrets printed** | **no** |
| **`stripe_events` pre-insert** | **inserted** |
| **`fulfillDtrCoreFromCheckoutSessionId`** | **success** |
| **DB write occurred by runner** | **yes** |
| **repair final token** | **`REPAIR_EXECUTED_ONCE`** |
| **second execution** | **no** |
| **retry** | **no** |
| **refund／rollback** | **no** |
| **full IDs／secrets shared（chat／SSOT／スクショ）** | **no** |

**Safe labels（参照のみ・DB 値ではない）：** **`cs_live_JSRW`**／**`user_36xz`**

---

## 5. Validation summary（redacted）

| Area | Human-private attestation |
|------|---------------------------|
| **Stripe validation（9 項相当）** | **all matched** |
| **pre-existing artifact（期待 empty）** | dry-run と整合する前提で **問題なし**（**カウント・ID は転記しない**） |
| **`stripe_events` pre-insert** | **inserted** |
| **`fulfillDtrCoreFromCheckoutSessionId`** | **success** |
| **full IDs** | **記録なし** |

---

## 6. Final result

| Field | Value |
|--------|--------|
| **final result token** | **`REPAIR_EXECUTED_ONCE`** |
| **説明** | **`b9793ea` で agent-scope は未実行だったが、Human-private で **exactly one** が完了**。再実行・retry・refund なし。**本条コミットは SSOT のみ**。 |

---

## 7. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`EXACTLY_ONE_REPAIR_EXECUTION_RECORDED`** |

**参考：** 旧 baseline 判定 **`REPAIR_EXECUTION_NOT_EXECUTED`** は **`b9793ea` の記録のみ**。**本条で Human-private 結果に置換**。

---

## 8. 未実行事項（本条 SSOT update コミット）

- **runner 再実行・二回目実行・自動 retry**
- **Production DB に対する本条コミットからの追加 write**
- **manual SQL／Events／replay／決済／refund／rollback**
- **runner／package／lockfile／runtime／UI の変更**
- **full ID／secret／raw ターミナル転載／printenv 共有**

**UI unlock／返書券：** **`5Z-I-S`／`5Z-I-T` 側**。**本条では未実施**。

---

## 9. Next

- **`Phase 5-6H-5Z-I-R` Post-repair Production DB read-only verification gate**（**本条の実行成功を前提**。）
- **`5Z-I-R` まで：** **UI アンロック確認なし**。**本条で refund なし**。

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_Q_EXACTLY_ONE_REPAIR_EXECUTION_2026-05-16.md`
