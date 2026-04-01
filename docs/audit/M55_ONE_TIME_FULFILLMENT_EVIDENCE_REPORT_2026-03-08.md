# M55 One-time Fulfillment Evidence Report (2026-03-08)

- **Status:** CONDITIONAL GREEN
- **Evidence readiness:** COMPLETE
- **Execution evidence:** PENDING（TC-02〜TC-07 手動実行・証跡記録待ち）
- **ACTIVE promotion:** blocked until TC-02〜TC-07 executed and recorded

**正本:** Canonical ID `stripe_go_live_test_checklist_2026_03_08`（repo mirror: `docs/ssot/stripe_go_live_test_checklist_2026_03_08.md`）  
**対象:** One-time card-based lane のみ。subscription lane は未着手。

**サブタスク完了:** post-purchase alignment → `docs/audit/P1_POST_PURCHASE_ALIGNMENT_SUBTASK_COMPLETE_2026_03_08.md`  
**実行手順書:** `docs/audit/P1_TC_EXECUTION_RUNBOOK_2026_03_08.md`  
**証跡保存先:** `docs/audit/evidence/`

**Current promotion gate:** blocked by TC-02 execution evidence. TC-03〜TC-07 are implementation-confirmed but runtime-evidence-pending.

---

## 1. Build PASS 証跡

| 項目 | 状態 | 備考 |
|------|------|------|
| npm run build | PASS | 2026-03-09 取得済み |

---

## 2. テスト結果一覧（正本 TC-02〜TC-07 準拠）

### TC-02 One-time purchase happy path

| 記録項目 | 値 |
|----------|-----|
| event_id | 要手動実行 |
| checkout_session_id | 要手動実行 |
| payment_intent_id | 要手動実行 |
| 実行結果 | 未実行（実施環境制約: Stripe CLI 未導入等）|
| 備考 | 証跡: `docs/audit/evidence/TC-02_ONE_TIME_HAPPY_PATH.md` |

**実行手順:** ログイン → POST /api/purchase/checkout { productId: "DTR_CORE_STATIC_V1" } → Checkout 完了（4242...）→ Webhook 発火後、one_time_fulfillments / entitlements / entitlement_rights を確認

---

### TC-03 Replay / duplicate resistance

| 記録項目 | 値 |
|----------|-----|
| 実装確認 | stripe_events UNIQUE、one_time_fulfillments 冪等 |
| 実行結果 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| 備考 | 証跡: `docs/audit/evidence/TC-03_REPLAY_DUPLICATE_RESISTANCE.md` |

**実行手順:** webhook/route.ts L49-56, L188-191 で冪等実装を確認

---

### TC-04 Payment truth guard

| 記録項目 | 値 |
|----------|-----|
| 検証内容 | Session 再取得で payment_status 確認 |
| payment_status !== paid 時 | failed_fulfillments 記録 |
| 実行結果 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| 備考 | 証跡: `docs/audit/evidence/TC-04_PAYMENT_TRUTH_GUARD.md` |

**実行手順:** webhook/route.ts L167-181 で sessions.retrieve・payment_status 判定・insertFailedFulfillment を確認

---

### TC-05 Full refund handling

| 記録項目 | 値 |
|----------|-----|
| 実装確認 | isFullRefund 判定、entitlements revoke、entitlement_rights delete |
| 実行結果 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| 備考 | 証跡: `docs/audit/evidence/TC-05_FULL_REFUND.md`。E2E は要手動 |

**実行手順:** TC-02 完了後、Stripe Dashboard で全額返金 → charge.refunded 受信 → status=revoked 確認

---

### TC-06 Partial refund handling

| 記録項目 | 値 |
|----------|-----|
| 実装確認 | !isFullRefund で early return、revoke なし |
| 実行結果 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| 備考 | 証跡: `docs/audit/evidence/TC-06_PARTIAL_REFUND.md`。E2E は要手動 |

**実行手順:** TC-02 完了後、一部金額のみ返金 → charge.refunded 受信 → revoke されないことを確認

---

### TC-07 Failed fulfillment / manual recovery drill

| failure_reason | failed_fulfillments 挿入 | 実行結果 |
|----------------|---------------------------|----------|
| missing_client_reference_id | 要（L101-104） | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| product_mismatch | 要（L129-132） | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| payment_status_not_paid | 要（L177-179） | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|

**備考:** 証跡: `docs/audit/evidence/TC-07_FAILED_FULFILLMENT_MANUAL_RECOVERY.md`

---

## 3. 未解決点・Backlog

| # | 種別 | 内容 |
|---|------|------|
| 1 | 未解決メモ | **client_reference_id=userId** の未ログイン・セッション切れ・アカウント切替時挙動は未検証 |
| 2 | Backlog | ALLOWED_ONE_TIME_PRODUCTS の shared import 化 |
| 3 | 失敗時 | （該当時のみ記入）|

---

## 4. 自己判定

| 判定 | 条件 |
|------|------|
| **ALL GREEN** | TC-02〜TC-07 すべて PASS、build PASS、証跡記録完了 |
| **CONDITIONAL GREEN** | 実装・正本準拠確認済み、Test mode 手動実行は要 |
| **YELLOW** | 一部 TC 未実施、要手動確認 |
| **RED** | 実装不備または critical 失敗あり |

**本レポート時点の自己判定:** **CONDITIONAL GREEN**

- 実装は正本（stripe_go_live_test_checklist_2026_03_08）および PAYMENT_FULFILLMENT_SSOT_CANDIDATE に準拠
- TC-03〜TC-07: 実装確認で IMPLEMENTATION PASS、execution evidence は PENDING（2026-03-09）
- TC-02: E2E 実行が未実施。Test mode（Stripe webhook forward、ログイン、Supabase）で実施が必要
- Build PASS は報告済み

**ACTIVE 昇格可否:** Blocked until TC-02 E2E executed and recorded. 再報告: `docs/audit/P1_ACTIVE_PROMOTION_REPORT_2026_03_09.md`
