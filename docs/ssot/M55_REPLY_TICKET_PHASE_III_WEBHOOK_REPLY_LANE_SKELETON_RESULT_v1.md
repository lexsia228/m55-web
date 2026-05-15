# M55_REPLY_TICKET_PHASE_III_WEBHOOK_REPLY_LANE_SKELETON_RESULT_v1

Status: **Phase III — Stripe 共有 Webhook に **Reply 専用レーン skeleton** を追加した結果。** **wallet／ledger／`stripe_processed_events` には未書き込み。**  

Recorded: **2026-04-28**

Upstream:

- `docs/ssot/M55_REPLY_TICKET_PHASE_II_CHECKOUT_API_SKELETON_RESULT_v1.md`
- `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md`

---

## 1. 変更ファイル一覧

| 種別 | パス |
|------|------|
| 変更 | `app/api/stripe/webhook/route.ts` |
| 新規 | `lib/m55/reply/replyTicketWebhookLane.ts` |
| 新規 | `docs/ssot/M55_REPLY_TICKET_PHASE_III_WEBHOOK_REPLY_LANE_SKELETON_RESULT_v1.md`（本条） |

---

## 2. Webhook 分岐内容

`handleCheckoutCompleted` 内、**subscription レーン処理の後**かつ **`session.mode === 'payment'` 確定後、`ALLOWED_ONE_TIME_PRODUCTS.has(productId)` より前**に以下を挿入した。

| 条件 | 挙動 |
|------|------|
| `session.metadata.product_key`（および `REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey` と同義キー）が **`additional_reply_ticket`** | **`handleReplyTicketCheckoutCompletedSkeleton`** に委譲。**`fulfillDtrCoreFromCheckoutSessionId` には入らない。** |
| それ以外 | **既存の `productId`／`ALLOWED_ONE_TIME_PRODUCTS`／DTR one-time 経路**をそのまま適用。 |

---

## 3. Reply lane skeleton で行うこと

| 項目 | 実施 |
|------|------|
| **`event.id`** | 欠損時はログし **200 acknowledged**（Stripe 再送ポリシーとの整合は後続 fulfillment で精緻化）。 |
| **`product_key`** | 再確認（内部不整合時も **200** で落とさない）。 |
| **`report_instance_id`** | メタデータから取得し、**欠損時はログのみ**（**200 acknowledged**）。 |
| **`checkout_session_id`** | `session.id` を参照（ログ用）。 |
| **`payment_intent_id`** | `session.payment_intent` から抽出候補（ログ用）。 |
| **wallet／ledger／`stripe_processed_events`** | **更新しない** |

---

## 4. まだ DB 更新していないこと（本条スコープ）

Reply skeleton **自体**は **INSERT／UPDATE なし**。  

**既存 Webhook フレーム:** ハンドラが **200** を返した後、従来どおり **`stripe_events` への `event.id` 記録**（Webhook 全体の冪等）が **`POST` の外枠で実行**される。**`stripe_processed_events` テーブルへの書き込みは行っていない。**（fulfillment フェーズの正本は設計 SSOT どおり後続。）

---

## 5. DTR fulfillment へ Reply を流さない確認

| 確認 | 結果 |
|------|------|
| **`fulfillDtrCoreFromCheckoutSessionId` 呼び出し** | **Reply `product_key` 分岐では到達しない**。 |
| **`app/api/purchase/checkout/route.ts`** | **変更なし** |
| **`lib/oneTimeCheckout.ts`（`ALLOWED_ONE_TIME_PRODUCTS`）** | **変更なし** — **`additional_reply_ticket` は未追加**。 |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts`** | **変更なし** |

---

## 6. Typecheck／lint 結果

| コマンド | 結果 |
|-----------|------|
| `npx tsc --noEmit` | **exit code 0** |
| `read_lints`（webhook / reply lane） | **問題なし** |

---

## 7. 次の候補ゲート

**Fulfillment transaction**：`stripe_processed_events` 挿入／partial UNIQUE 競合 no-op／wallet +1／ledger +1／単一トランザクション（設計 SSOT 参照）。**`payment_intent.succeeded` は引き続き付与対象外。**

---

## 8. CHANGELOG — v1

- 初版: `checkout.session.completed` の `metadata.product_key` 分岐、`replyTicketWebhookLane` skeleton、DTR 未混入の記録。
