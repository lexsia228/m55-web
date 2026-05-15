# P1 Evidence Phase サマリ (2026-03-08)

**Current promotion gate:** blocked by TC-02 execution evidence. TC-03〜TC-07 are implementation-confirmed but runtime-evidence-pending.

**IMPLEMENTATION PASS / EVIDENCE PENDING** = code path reviewed, logic accepted, no runtime proof captured yet.

---

## 実施対象テスト一覧

| TC | テスト名 | 状態 |
|----|----------|------|
| TC-02 | One-time purchase happy path | 未実行（実施環境制約）|
| TC-03 | Replay / duplicate resistance | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-04 | Payment truth guard | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-05 | Full refund handling | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-06 | Partial refund handling | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-07 | Failed fulfillment / manual recovery drill | IMPLEMENTATION PASS / EVIDENCE PENDING |

---

## テストごとの証跡保存先

| TC | 証跡ファイル |
|----|--------------|
| TC-02 | `docs/audit/evidence/TC-02_ONE_TIME_HAPPY_PATH.md` |
| TC-03 | `docs/audit/evidence/TC-03_REPLAY_DUPLICATE_RESISTANCE.md` |
| TC-04 | `docs/audit/evidence/TC-04_PAYMENT_TRUTH_GUARD.md` |
| TC-05 | `docs/audit/evidence/TC-05_FULL_REFUND.md` |
| TC-06 | `docs/audit/evidence/TC-06_PARTIAL_REFUND.md` |
| TC-07 | `docs/audit/evidence/TC-07_FAILED_FULFILLMENT_MANUAL_RECOVERY.md` |

**実行手順書:** `docs/audit/P1_TC_EXECUTION_RUNBOOK_2026_03_08.md`

---

## 未解決点一覧

| # | 内容 |
|---|------|
| 1 | **client_reference_id=userId** の未ログイン・セッション切れ・アカウント切替時挙動は未検証 |
| 2 | getSupportUrl() が env 未設定時の fallback（本番では APP_ORIGIN 設定推奨）|
| 3 | TC 実行時の failures（該当時、各証跡ファイルに記入）|

---

## P1 再裁定に必要な残項目

| 項目 | 状態 |
|------|------|
| TC-02 E2E 実行・証跡記録 | 未実施 |
| TC-03〜TC-07 実装確認 | 完了。execution evidence は PENDING |
| ACTIVE 昇格判定 | TC-02 E2E 完了後に再裁定 |

**CONDITIONAL GREEN 維持:** TC-03〜TC-07 は IMPLEMENTATION PASS / EVIDENCE PENDING（execution evidence 未取得）。TC-02 E2E が最優先 blocker。TC-02 完了後、可能なら TC-03〜TC-07 の runtime evidence を補強し、ACTIVE 昇格可否を再裁定。再報告: `docs/audit/P1_ACTIVE_PROMOTION_REPORT_2026_03_09.md`
