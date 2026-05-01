# M55 追加相談返書 — webhook receive / replay ゲート（v1）

**文書種別:** **`stripe listen` 完了後**に **Webhook 受信を確認**し、必要なら **既存 test `checkout.session.completed` を再送**して追加相談返書 fulfillment を検証するためのゲート SSOT（**本文書作成時点では再送なし**）  
**バージョン:** v1  

**前提結果:** [`M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_RESULT_v1.md`](./M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_RESULT_v1.md) — **listen setup PASS**

**記録ポリシー:** **event id・session id・payment intent id・secret の全文**は **記録しない**（セクション 5–6）。

---

## 1. このゲートの目的

| 観点 | 内容 |
|------|------|
| **受信確認** | **Stripe CLI listen** が整った状態で **`POST /api/stripe/webhook` 受信**へ進む **条件・記録様式**を固定する。 |
| **再送方針** | **既存の test `checkout.session.completed` イベントの再送**を **検討対象**とする。**追加決済より既存 event 再送を優先**する。 |
| **識別子** | **event id 全文は SSOT / チャットに貼らない**。 |
| **post baseline** | **Webhook 受信・処理確認の後**に **post fulfillment baseline**（別承認）へ進む。 |

---

## 2. 前提条件

| 前提 | 内容 |
|------|------|
| **ローカル dev** | **稼働中**（通常 **`http://localhost:3000`**）。 |
| **`stripe listen`** | **起動中**。 |
| **forward 先** | **`http://localhost:3000/api/stripe/webhook`**。 |
| **signing secret** | **`.env.local` の `STRIPE_WEBHOOK_SECRET` と一致**済み（結果 SSOT 参照）。 |
| **Stripe** | **test mode**。**live event を扱わない**。 |
| **決済** | **追加決済しない**。 |
| **商品棚 UI** | **未公開**。 |

---

## 3. replay 候補

| 項目 | 方針 |
|------|------|
| **手段** | **Stripe Dashboard** または **Stripe CLI** から、**既存の test `checkout.session.completed`** を **再送**する（**実行は別承認**）。 |
| **event id** | **全文は SSOT・チャットへ貼らない**。 |
| **対象イベント** | **追加相談返書チケット**に紐づく **test Checkout 完了**の **`checkout.session.completed`**（メタデータ・SKU が reply lane に入るもの）。 |
| **除外** | **`payment_intent.succeeded` を直接の付与トリガとして選ばない**（本ゲートの replay 候補から外す）。 |

---

## 4. webhook 受信時に見るもの

| 観測 | 方針 |
|------|------|
| **Stripe CLI 側** | **event 受信の summary**（型・成功フラグ程度。**全文ログは貼らない**）。 |
| **Next dev 側** | **`POST /api/stripe/webhook` 受信の summary**。 |
| **Reply lane** | **追加相談返書レーンに入ったか**（ログ・応答の **要約のみ**）。 |
| **RPC** | **`m55_reply_ticket_fulfill_checkout_event` が呼ばれたか・成功したか**（**boolean / unknown**）。 |
| **HTTP** | **ルート応答が 2xx か**。 |
| **ログ** | **dev log 全文は貼らない**。 |

---

## 5. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`webhook_replay_executed`** | **true / false** |
| **`event_type`** | **`checkout.session.completed`**（固定文字列として記録可） |
| **`mode`** | **`test`** |
| **`webhook_received_by_stripe_cli`** | **true / false** |
| **`webhook_received_by_next_route`** | **true / false** |
| **`route_path`** | **`/api/stripe/webhook`** |
| **`rpc_called`** | **true / false / unknown** |
| **`route_response_2xx`** | **true / false / unknown** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 6. 記録禁止

- **Stripe event id 全文**
- **checkout session id 全文**
- **payment intent id 全文**
- **Checkout URL 全文**
- **webhook secret**
- **Stripe secret key**
- **DB URL**
- **Supabase keys**
- **raw `user_id`**
- **cookie / token / Authorization**
- **dev log 全文**
- **カード情報**

---

## 7. STOP 条件

以下に該当しそうになったら **中断**する。

- **live event** を再送しようとする
- **event id / session id / secret** を貼りそうになる
- **`/api/webhooks/stripe`** に送ろうとする
- **追加決済**しようとする
- **`payment_intent.succeeded` を直接付与対象**にしようとする
- **DB 手動 UPDATE** しようとする
- **duplicate replay 検証**へ **同一セッションで無計画に**進もうとする
- **webhook 受信前**に **post baseline** を実行しようとする
- **商品棚 UI** へ進もうとする
- **Vercel env** を変更しようとする

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **gate（本文書の作成）** | **GO** |
| **webhook replay execution** | **別承認** |
| **追加決済** | **NO-GO** |
| **duplicate replay** | **NO-GO** |
| **post baseline** | **webhook 受信確認後** |
| **商品棚 UI** | **NO-GO** |

---

## 9. 後続予定

1. **webhook receive / replay execution packet**  
2. **既存 `checkout.session.completed` 再送**（別承認）  
3. **webhook 受信確認**（summary のみ）  
4. **post fulfillment baseline 再実行**  
5. **fulfillment result SSOT**  
6. **duplicate replay gate**  
7. **cancel / expired / refund SSOT**  
8. **observability / incident response SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**webhook 再送なし**。**追加決済なし**。**SQL 実行なし**。**DB 更新なし**。**post baseline 未実行**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_GATE_v1*
