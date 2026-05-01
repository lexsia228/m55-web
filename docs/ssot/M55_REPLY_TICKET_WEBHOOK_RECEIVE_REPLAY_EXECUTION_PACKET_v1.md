# M55 追加相談返書 — webhook receive / replay 実行パケット（v1）

**文書種別:** **既存 test `checkout.session.completed`** を **再送**し、**ローカル `POST /api/stripe/webhook`** の受信と **Reply lane / RPC** を確認する人手手順・記録規約の SSOT  
**バージョン:** v1  

**親ゲート:** [`M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_GATE_v1.md`](./M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_GATE_v1.md)  
**listen 結果:** [`M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_RESULT_v1.md`](./M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_RESULT_v1.md)

**記録ポリシー:** **event id・session id・secret の全文**は **記録しない**（セクション 5–6）。

---

## 1. 実施対象

| 項目 | 内容 |
|------|------|
| **イベント** | **既存の test `checkout.session.completed`** |
| **SKU 文脈** | **追加相談返書チケット**の Checkout 完了に対応するイベント |
| **mode** | **test** |
| **`route_path`** | **`/api/stripe/webhook`** |
| **決済** | **追加決済しない** |
| **live** | **live event は扱わない** |
| **除外** | **`payment_intent.succeeded` を直接の付与検証対象にしない** |

---

## 2. 実施前確認

| # | 確認 |
|---|------|
| 1 | **`npm run dev`** が **起動中**であること。 |
| 2 | **`stripe listen` が起動中**であること。 |
| 3 | **forward 先**が **`http://localhost:3000/api/stripe/webhook`** であること。 |
| 4 | **`.env.local` の `STRIPE_WEBHOOK_SECRET`** と **listen 側の signing secret** が **一致**していること（**値は出力しない**）。 |
| 5 | **event 再送前**に **dev log 全文を貼らない**運用を **再確認**する。 |
| 6 | **event id 全文 / session id 全文 / secret** は **記録しない**。 |

---

## 3. replay 方法候補

| 方法 | 概要 |
|------|------|
| **A. Stripe Dashboard** | **Developers → Events** から **対象の test `checkout.session.completed`** を選び **再送**する。 |
| **B. Stripe CLI** | CLI の **イベント再送**機能で **同一タイプ**を送る（コマンド詳細は別ドキュメント化可 — **event id はチャットに貼らない**）。 |

| 規約 | 内容 |
|------|------|
| **event id** | **全文は SSOT・チャットに貼らない**。 |
| **記録** | **どちらの方法を使ったか**のみ記録する（**`replay_method`**）。 |
| **承認** | **replay の実行は本パケット作成後の別承認**。 |

---

## 4. 受信時に見るもの

| 観測 | 方針 |
|------|------|
| **Stripe CLI listen** | **`checkout.session.completed` が届いたか**（summary のみ）。 |
| **Next dev server** | **`POST /api/stripe/webhook` が記録されたか**（summary のみ）。 |
| **HTTP** | **ルート応答が 2xx か**。 |
| **Reply lane** | **追加相談返書レーンに入ったか**。 |
| **RPC** | **`m55_reply_ticket_fulfill_checkout_event` 呼び出し成功らしき summary** があるか（**unknown 可**）。 |
| **禁止** | **dev log 全文**、**session / event / user id の貼付**。 |

---

## 5. 記録してよいもの

| フィールド | 型 / 値 |
|------------|---------|
| **`webhook_replay_executed`** | **true / false** |
| **`replay_method`** | **`dashboard` / `cli` / `unknown`** |
| **`event_type`** | **`checkout.session.completed`** |
| **`mode`** | **`test`** |
| **`webhook_received_by_stripe_cli`** | **true / false** |
| **`webhook_received_by_next_route`** | **true / false** |
| **`route_path`** | **`/api/stripe/webhook`** |
| **`route_response_2xx`** | **true / false / unknown** |
| **`reply_lane_observed`** | **true / false / unknown** |
| **`rpc_called`** | **true / false / unknown** |
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

親ゲートの STOP に準ずる。特に以下で **中断**する。

- **live event** を再送しようとする
- **event id / session id / secret** を貼りそうになる
- **`/api/webhooks/stripe`** に送ろうとする
- **追加決済**しようとする
- **`payment_intent.succeeded` を直接付与対象**にしようとする
- **DB 手動 UPDATE** しようとする
- **duplicate replay 検証**へ **無計画に同時進行**しようとする
- **webhook 受信前**に **post baseline** を実行しようとする
- **商品棚 UI** へ進もうとする
- **Vercel env** を変更しようとする

---

## 8. 実行後の流れ

| 順序 | 内容 |
|------|------|
| 1 | **受信 summary** を **許可フィールドのみ**で記録する。 |
| 2 | **`route_response_2xx`**、**`reply_lane_observed`**、**`rpc_called`** が **確認できたら** **post fulfillment baseline SELECT**（[`m55_reply_ticket_post_fulfillment_baseline.sql`](../../scripts/sql/production/m55_reply_ticket_post_fulfillment_baseline.sql)）へ進む — **別承認**。 |
| 3 | **失敗時**は原因別に STOP して記録する（機微なし short note のみ）: **Stripe CLI 未受信**、**Next route 未受信**、**署名エラー**、**product_key 不一致**、**report_instance_id 欠損**、**RPC error** 等。 |
| 4 | **post baseline** は **replay 受信・処理確認後**。**別承認**。 |

---

## 9. 現時点の判定

| 項目 | 判定 |
|------|------|
| **execution packet（本文書の作成）** | **GO** |
| **replay 実行** | **別承認** |
| **post baseline** | **replay 受信後** |
| **duplicate replay** | **NO-GO** |
| **追加決済** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**webhook 再送なし**。**SQL 実行なし**。**DB 更新なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_EXECUTION_PACKET_v1*
