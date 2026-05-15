# P1 ACTIVE 昇格判定用 再報告 (2026-03-09)

- **P1 現状:** CONDITIONAL GREEN
- **Evidence readiness:** ALL GREEN
- **本報告:** TC-02〜TC-07 実行結果と ACTIVE 昇格可否の自己判定

**Current promotion gate:** blocked by TC-02 execution evidence. TC-03〜TC-07 are implementation-confirmed but runtime-evidence-pending.

---

## 1. TC ごとの実行結果

| TC | テスト名 | 実行 | 判定 | 根拠 |
|----|----------|------|------|------|
| TC-02 | One-time purchase happy path | 未実行 | 未実行 | Stripe CLI v1.37.2 インストール済み。stripe login（ペアリング）完了後、手順に従い実行可能。証跡取得待ち。 |
| TC-03 | Replay / duplicate resistance | 実装確認 | **IMPLEMENTATION PASS / EVIDENCE PENDING** | stripe_events 冪等、one_time_fulfillments 冪等。runtime evidence 未取得 |
| TC-04 | Payment truth guard | 実装確認 | **IMPLEMENTATION PASS / EVIDENCE PENDING** | sessions.retrieve、payment_status 判定、failed_fulfillments 挿入。runtime evidence 未取得 |
| TC-05 | Full refund handling | 実装確認 | **IMPLEMENTATION PASS / EVIDENCE PENDING** | full refund 時の revoke・entitlement_rights 削除。runtime evidence 未取得 |
| TC-06 | Partial refund handling | 実装確認 | **IMPLEMENTATION PASS / EVIDENCE PENDING** | partial 時 early return、revoke なし。runtime evidence 未取得 |
| TC-07 | Failed fulfillment / manual recovery | 実装確認 | **IMPLEMENTATION PASS / EVIDENCE PENDING** | 3 種の failed_fulfillments 挿入。runtime evidence 未取得 |

---

## 2. 判定一覧

| TC | 判定 |
|----|------|
| TC-02 | 未実行 |
| TC-03 | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-04 | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-05 | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-06 | IMPLEMENTATION PASS / EVIDENCE PENDING |
| TC-07 | IMPLEMENTATION PASS / EVIDENCE PENDING |

**実装確認済み（execution evidence 未取得）:** TC-03, TC-04, TC-05, TC-06, TC-07  
**最優先 blocker:** TC-02 の E2E 証跡取得  
**TC-02 実行後:** 可能なら TC-03〜TC-07 も runtime evidence で補強

---

## 3. 残存未解決点

| # | 内容 |
|---|------|
| 1 | **TC-02 E2E 実行**に必要な環境: Stripe CLI 導入、`stripe listen --forward-to localhost:3000/api/stripe/webhook` 起動、ログイン済みセッション、Supabase で one_time_fulfillments / entitlements / entitlement_rights 確認 |
| 2 | client_reference_id=userId の未ログイン・セッション切れ・アカウント切替時挙動は未検証 |
| 3 | ALLOWED_ONE_TIME_PRODUCTS の shared import 化は Backlog |

---

## 4. P1 ACTIVE 昇格可否 自己判定

**判定: CONDITIONAL GREEN 維持（ACTIVE 昇格は不可）**

| 昇格条件 | 状態 |
|----------|------|
| TC-02〜TC-07 の実行証跡取得 | TC-02 の E2E 証跡が未取得 |
| Build PASS | 取得済み（2026-03-09）|
| post-purchase alignment | 完了済み |

**理由:** ACTIVE 昇格条件は「TC-02〜TC-07 の実行証跡取得のみ」とされている。TC-03〜TC-07 は実装確認で IMPLEMENTATION PASS であるが execution evidence は PENDING。TC-02 は E2E 証跡（event_id / checkout_session_id / payment_intent_id、DB 確認）が必須で、最優先 blocker。実施環境制約により TC-02 E2E が未実行のため、ACTIVE 昇格は見送り。

**次のアクション:** (1) `stripe login` でペアリング完了（ブラウザ要）。(2) `stripe listen --forward-to localhost:3000/api/stripe/webhook` 起動、whsec_xxx を .env.local に設定。(3) ログイン → /dtr/lp → 購入 → 4242... で決済完了。(4) Stripe CLI ログ・success URL・Supabase から証跡を取得し、`docs/audit/evidence/TC-02_ONE_TIME_HAPPY_PATH.md` に記録。(5) 完了時点で ACTIVE 昇格を再裁定する。

**実施準備状況:** Stripe CLI v1.37.2 インストール済み。実行手順・Supabase 確認用 SQL は TC-02 証跡ファイルに記載済み。
