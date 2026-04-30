# M55 追加相談返書 — Webhook Reply lane RPC call implementation gate（v1）

**文書種別:** 実装可否・範囲・STOP 条件を固定するゲート SSOT  
**バージョン:** v1  
**依存:** [`M55_REPLY_TICKET_PHASE_IV_RPC_PRODUCTION_APPLY_RESULT_v1.md`](./M55_REPLY_TICKET_PHASE_IV_RPC_PRODUCTION_APPLY_RESULT_v1.md)（コミット済み想定）

---

## 1. 現在の到達点

| 状態 | 内容 |
|------|------|
| Checkout API | `app/api/reply-tickets/checkout/route.ts` は **作成済み**（skeleton〜実装済みの範囲はコード準拠） |
| Webhook Reply lane | `app/api/stripe/webhook/route.ts` は **Reply lane skeleton まで** |
| Reply lane ロジック | `lib/m55/reply/replyTicketWebhookLane.ts` は **skeleton** |
| RPC（本番 DB） | `public.m55_reply_ticket_fulfill_checkout_event` **作成済み**（SECURITY DEFINER / `search_path=public` / RETURNS `jsonb`） |
| 本番 DDL | `public.stripe_processed_events` **作成済み**、`stripe_event_id` **partial UNIQUE 適用済み** |
| RPC 接続 | **Webhook から RPC は未接続** |
| 付与 | **追加チケット付与は未稼働** |
| データ更新 | **wallet / ledger / stripe_processed_events は Webhook から未更新** |

**補足:** 現状は Reply lane で **DTR 誤流入は防いでいる**が、**RPC はまだ呼んでいない**。

---

## 2. 実装してよい範囲（本ゲート承認後）

- **`lib/m55/reply/replyTicketWebhookLane.ts`** を skeleton から **RPC 呼び出し**へ拡張する。
- 必要なら **`lib/m55/reply/replyTicketFulfillmentRpc.ts`** のような **server-only helper を新規**してよい（命名は実装側で統一）。
- **`app/api/stripe/webhook/route.ts`** は **既存分岐を維持**し、**最小変更**のみ。
- **`app/api/reply-tickets/checkout/route.ts`（Checkout API）は原則変更しない**。
- **DTR fulfillment は変更しない**。
- **`payment_intent.succeeded` を直接の付与対象にしない**（Reply の fulfilled 経路のみ RPC 側設計と整合させる）。

---

## 3. RPC 呼び出し入力（マッピング）

| パラメータ | ソース（方針） |
|------------|----------------|
| `p_stripe_event_id` | Stripe **`event.id`** |
| `p_checkout_session_id` | **`session.id`** |
| `p_payment_intent_id` | `session.payment_intent` が **string のとき**その値（型・存在は実装で厳密化） |
| `p_product_key` | **`metadata.product_key`** |
| `p_report_instance_id` | **`metadata.report_instance_id`**（UUID 等、欠損時は §4） |
| `p_wallet_scope_user_id` | **ユーザー所有関係 / metadata / session client reference** 等から **慎重に解決**（仕様は実装前に確定） |
| `p_user_ref_hash` | **`metadata.user_ref_hash`** |
| `p_quantity` | **固定 `1`**（本ゲートでは数量可変を想定しない） |

**禁止:** **raw PII、本文、不要なペイロード全文**を RPC に渡さない。

---

## 4. `event.id` / `report_instance_id` STOP

- **`event.id` 欠損:** **RPC を呼ばず STOP**（エラー扱い・ログ方針は実装タスクで明文化）。
- **`report_instance_id` 欠損:** **RPC を呼ばず STOP**。
- **`product_key` 不一致**（Reply 追加チケット想定と合わない）: **RPC を呼ばない**。
- **skeleton 時代の「欠損でも 200 received」**は、fulfillment 実装時に **明確な方針に置き換える**（§5 と一体で決める）。

---

## 5. RPC 戻り値と HTTP 応答（実装前に固定）

本ゲートでは以下を **正** とし、実装・レビュー・運用モニタリングの前提とする。

| RPC 意味（概念） | HTTP / 挙動 |
|------------------|-------------|
| `processed` | **200 OK** |
| `duplicate_noop` | **200 OK** |
| `skipped_cap` | **200 OK**（**monitoring 対象**としてもよい） |
| `rejected_invalid_product` | **200 no-op** または **400 相当** — **セキュリティ・誤設定・Stripe 再送の影響を踏まえ慎重に選定**（実装 PR で確定） |
| `rejected_not_owner` / `rejected_wallet_inactive` | **200 no-op** + **monitoring 候補** |
| **技術的エラー**（DB 接続、予期しない例外等） | **throw** し **Stripe retry 対象**にする |

**注意:** 上表は「実装コードにそのまま 1:1 で書く」のではなく、**応答一覧と運用前提をゲートとして凍結**するものである。

---

## 6. Idempotency

- **partial UNIQUE + RPC の `duplicate_noop`** を **正** とする（二重計上防止のソース・オブ・トゥルース）。
- Webhook 側で **独自に wallet を更新しない**（付与は RPC 経路に一本化）。
- **既存 `stripe_events` の global dedupe** との関係を整理し、**先に dedupe で短絡された場合の挙動**（RPC が呼ばれるか／呼ばれないか、`duplicate_noop` の有無）を **実装前または実装 PR 内で確認・文書化**する。

---

## 7. DTR 汚染防止

- **`additional_reply_ticket` を DTR fulfillment に流さない**。
- **`ALLOWED_ONE_TIME_PRODUCTS` に追加しない**。
- **`fulfillDtrCoreFromCheckoutSessionId` を（Reply lane から）呼ばない**。
- **`product_key` 分岐を最上流**に維持し、DTR と Reply の lane を混線させない。

---

## 8. STOP 条件（違反なら実装不合格）

以下は **行ってはならない**。

- **RPC を使わずに** wallet / ledger を更新すること。
- **`event.id` 欠損で RPC を呼び出す**こと。
- **`report_instance_id` 欠損で RPC を呼び出す**こと。
- **`payment_intent.succeeded` を付与対象に変更**すること。
- **DTR fulfillment を改変**すること。
- **Checkout API を無関係な理由で変更**すること。
- **商品棚 UI** に着手すること（本フェーズ）。
- **本番決済テスト**に進むこと（別承認まで NO-GO）。
- **secret の出力**。

---

## 9. 検証（実装完了時のチェックリスト）

- `npx tsc --noEmit`
- `read_lints`（該当ファイル）
- **`git diff` で DTR checkout / fulfillment が変わっていないこと**を確認する。
- **RPC 呼び出し helper の型**（引数・戻り値）を確認する。
- 可能なら **モック / ログのみの dry-run 設計**を用意する。
- **DB 更新を伴う実 Webhook テスト**は **別承認**（本ゲートの外）。

---

## 10. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本ゲート文書の作成** | **GO** |
| **RPC call のコード実装** | **別承認**（次 PR / 次タスク） |
| **本番決済テスト** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL 実行・DB 更新・Stripe Dashboard / env / UI 操作・**secret の出力**は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_RPC_CALL_IMPLEMENTATION_GATE_v1*
