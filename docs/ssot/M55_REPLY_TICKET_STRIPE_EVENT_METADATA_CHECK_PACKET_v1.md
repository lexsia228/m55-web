# M55 追加相談返書 — Stripe event / session metadata 確認パケット（v1）

**文書種別:** **Stripe Dashboard** 上で **test `checkout.session.completed`** に紐づく **Checkout Session の metadata** が **Reply lane / RPC に必要な条件**を満たすかを **値なし**で確認する手順・記録規約の SSOT  
**バージョン:** v1  

**親トリアージ:** [`M55_REPLY_TICKET_WEBHOOK_200_DB_FULFILLMENT_NOT_OBSERVED_TRIAGE_GATE_v1.md`](./M55_REPLY_TICKET_WEBHOOK_200_DB_FULFILLMENT_NOT_OBSERVED_TRIAGE_GATE_v1.md)

**記録ポリシー:** **metadata の実値・event id・session id・payment intent id** は **記録しない**（セクション 4–5）。

---

## 1. このパケットの目的

| 観点 | 内容 |
|------|------|
| **切り分け** | **`POST /api/stripe/webhook` が 200** だが **DB fulfillment が未確認**である状況で、**metadata 不足・不一致**が原因かを切り分ける。 |
| **確認内容** | **event / session の metadata** が **Reply lane に必要な情報**を持つかを **boolean / unknown のみ**で記録する。 |
| **判定の境界** | **fulfillment 成功・失敗はまだ判定しない**。 |

---

## 2. 確認対象

| 項目 | 内容 |
|------|------|
| **イベント型** | **`checkout.session.completed`**（**test**） |
| **文脈** | **追加相談返書チケット**の Checkout 完了に対応するイベント |
| **場所** | **Stripe Dashboard**（**閲覧のみ** — **設定変更はしない**） |
| **mode** | **test**。**live event は対象外** |
| **記録** | **event id 全文 / checkout session id 全文**は **記録しない** |

---

## 3. metadata 確認項目

オペレータは Dashboard で **対象 Session / Event** を開き、以下を **値を書き留めず**確認する。

| # | 項目 | 記録は boolean / unknown のみ |
|---|------|-------------------------------|
| 1 | **`metadata.product_key`** | **存在するか** |
| 2 | 同上 | **`additional_reply_ticket` と一致するか** |
| 3 | **`metadata.report_instance_id`** | **存在するか** |
| 4 | 同上 | **今回の baseline / Checkout で使った target と一致するか**（**UUID はチャット・SSOT に貼らない** — 画面同士で照合） |
| 5 | **`metadata.user_ref_hash`** | **存在するか** |
| 6 | **`client_reference_id`** | **存在するか** |
| 7 | **`payment_intent`** | **存在するか**（**ID の値は記録しない**） |
| 8 | **金額・通貨** | **500 JPY 相当か**（Dashboard 表示の解釈のみ — **数値の転記はしない**） |
| 9 | **mode** | **test か** |

---

## 4. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`event_type`** | **`checkout.session.completed`** |
| **`mode`** | **`test`** |
| **`event_metadata_product_key_present`** | **true / false / unknown** |
| **`event_metadata_product_key_is_additional_reply_ticket`** | **true / false / unknown** |
| **`event_metadata_report_instance_id_present`** | **true / false / unknown** |
| **`event_metadata_report_instance_matches_target`** | **true / false / unknown** |
| **`event_metadata_user_ref_hash_present`** | **true / false / unknown** |
| **`event_client_reference_id_present`** | **true / false / unknown** |
| **`event_payment_intent_present`** | **true / false / unknown** |
| **`event_amount_currency_expected`** | **true / false / unknown** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 5. 記録禁止

- **event id 全文**
- **checkout session id 全文**
- **payment intent id 全文**
- **`report_instance_id` 全文**
- **`user_ref_hash` の値**
- **`client_reference_id` の値**
- **Checkout URL 全文**
- **webhook secret**
- **Stripe secret key**
- **DB URL**
- **Supabase keys**
- **raw `user_id`**
- **cookie / token / Authorization**
- **Dashboard の機微スクリーンショット**
- **dev log 全文**

---

## 6. STOP 条件

以下に該当しそうになったら **中断**する。

- **live event** を見ている・操作している
- **event / session / payment intent id 全文**を貼りそうになる
- **metadata の値**を貼りそうになる
- **`report_instance_id` 全文**を貼りそうになる
- **secret** を貼りそうになる
- **Dashboard 設定**を **変更**しようとする
- **追加 replay** しようとする
- **追加決済**しようとする
- **DB 手動 UPDATE** しようとする
- **商品棚 UI** へ進もうとする

---

## 7. 判定方針（結果の読み方）

| パターン | 解釈 |
|----------|------|
| **`product_key` / `report_instance_id` / `client_reference_id` が不足** | **Reply lane で STOP した候補** |
| **`product_key` が `additional_reply_ticket` でない** | **Reply lane 対象外**の候補 |
| **`report_instance_id` が target と不一致** | **post baseline の target 不一致**の候補 |
| **metadata が期待どおり揃っている** | **`webhook route` / Reply lane / `replyTicketFulfillmentRpc` の静的監査**へ進む |

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **metadata check packet（本文書の作成）** | **GO** |
| **実 metadata 確認** | **別承認** |
| **追加 replay** | **NO-GO** |
| **追加決済** | **NO-GO** |
| **SQL 実行** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_PACKET_v1*
