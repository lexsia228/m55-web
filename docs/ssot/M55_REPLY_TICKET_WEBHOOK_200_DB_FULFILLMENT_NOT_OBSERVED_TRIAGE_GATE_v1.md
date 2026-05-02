# M55 追加相談返書 — webhook route 200 かつ DB fulfillment 未観測 トリアージゲート（v1）

**文書種別:** **`POST /api/stripe/webhook` が 200** である一方、**post fulfillment baseline で DB 側の期待差分が観測できない**場合の **切り分け条件・記録項目・STOP** を固定するゲート SSOT（**設計のみ**）  
**バージョン:** v1  

**記録ポリシー:** **event id・session id・payment intent id・metadata 実値・secret** は **記録しない**（セクション 4–5）。

---

## 重要（解釈の固定）

| 観点 | 内容 |
|------|------|
| **200 の意味** | **`POST /api/stripe/webhook` が 200** であることは **Webhook ルート到達および 2xx 応答の証跡**であり、**RPC 成功**や **DB 更新成功**の **証明ではない**。 |
| **仮説** | **Shadow / Report 不一致**、**DB 更新前 skip** などは **有力な仮説**だが、**本ゲートの時点では断定しない**。 |
| **次の焦点** | **event payload の metadata** と **webhook 内分岐**を **切り分ける**。 |

---

## 1. 確定していること

| 項目 | 状態 |
|------|------|
| **`checkout.session.completed` replay** | **実施済み** |
| **HTTP** | **`/api/stripe/webhook` で **200** を観測** |
| **決済** | **追加決済なし** |
| **機密** | **secret 露出なし**（運用上の宣言として記録） |
| **DB** | **post baseline 上、期待される fulfillment 反映は **未確認**** |

---

## 2. 未確定なこと

| 項目 | 状態 |
|------|------|
| **RPC が実際に呼ばれたか** | **未確定** |
| **RPC が成功したか** | **未確定** |
| **RPC が rejected / skipped になったか** | **未確定** |
| **`metadata.product_key` が `additional_reply_ticket` か** | **未確定** |
| **`metadata.report_instance_id` の有無** | **未確定** |
| **`report_instance_id` が現在の target と一致したか** | **未確定** |
| **`stripe_events` 等の global dedupe で早期 return したか** | **未確定** |
| **DTR 既存 fulfillment 側に吸われたか** | **未確定** |
| **shadow / report 不一致が原因か** | **未確定** |

---

## 3. 切り分け候補

### 3.1 Stripe（Dashboard）— metadata の人間確認

**対象:** **test `checkout.session.completed`** に紐づく **Session の metadata**（**値は SSOT・チャットに書かない**）。

| 確認観点 | 記録は boolean / unknown のみ |
|----------|-------------------------------|
| **`product_key`** | **`additional_reply_ticket` と整合するか** |
| **`report_instance_id`** | **存在するか** |
| **`user_ref_hash`** | **存在するか** |
| **`client_reference_id`** | **存在するか** |
| **mode** | **test か** |

### 3.2 静的確認 — `app/api/stripe/webhook/route.ts`

| 確認観点 |
|----------|
| **`checkout.session.completed` が Reply lane に入る条件** |
| **`additional_reply_ticket` が DTR / one-time fulfillment 経路へ誤って流れないか** |
| **global dedupe（例: `stripe_events`）が **Reply lane より前**で return しないか** |

### 3.3 静的確認 — `lib/m55/reply/replyTicketWebhookLane.ts`

| STOP / 分岐の観点 |
|-------------------|
| **`event.id` 欠損** |
| **`product_key` 不一致** |
| **`report_instance_id` 欠損 / 不正** |
| **`client_reference_id` 欠損** |
| **RPC error handling** |

### 3.4 静的確認 — `lib/m55/reply/replyTicketFulfillmentRpc.ts`

| 確認観点 |
|----------|
| **RPC 戻り値の解釈**（success / noop / error の区別） |
| **ログや観測可能な summary の出し方**（**全文ログは貼らない**運用と整合） |

---

## 4. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`event_metadata_product_key_present`** | **true / false / unknown** |
| **`event_metadata_product_key_is_additional_reply_ticket`** | **true / false / unknown** |
| **`event_metadata_report_instance_id_present`** | **true / false / unknown** |
| **`event_metadata_report_instance_matches_target`** | **true / false / unknown** |
| **`event_client_reference_id_present`** | **true / false / unknown** |
| **`webhook_route_reply_lane_before_dtr_fulfillment`** | **true / false / unknown**（静的監査の結論） |
| **`global_dedupe_can_short_circuit_before_reply_lane`** | **true / false / unknown** |
| **`rpc_return_logged_or_observable`** | **true / false / unknown** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 5. 記録禁止

- **Stripe event id 全文**
- **checkout session id 全文**
- **payment intent id 全文**
- **Checkout URL 全文**
- **webhook secret**
- **Stripe secret key**
- **Supabase keys**
- **DB URL**
- **raw `user_id`**
- **`report_instance_id` 全文を不用意に貼ること**
- **cookie / token / Authorization**
- **dev log 全文**
- **カード情報**

---

## 6. STOP 条件

以下に該当しそうになったら **中断**する。

- **追加決済**しようとする
- **duplicate replay** へ進もうとする
- **DB 手動 UPDATE** しようとする
- **event / session / payment_intent id 全文**を貼りそうになる
- **secret** を貼りそうになる
- **dev log 全文**を貼りそうになる
- **商品棚 UI** へ進もうとする
- **Vercel env** を変更しようとする

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **triage gate（本文書の作成）** | **GO** |
| **追加 replay** | **NO-GO** |
| **追加決済** | **NO-GO** |
| **post baseline 再実行** | **target と event metadata 確認後**（別承認） |
| **duplicate replay** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 8. 後続予定

1. **Stripe event metadata 確認 packet**  
2. **webhook route / Reply lane 静的監査 packet**  
3. **必要なら redacted diagnostic の最小追加**（**別 PR・別ゲート**）  
4. **再 replay**（別承認）  
5. **post fulfillment baseline 再実行**  
6. **fulfillment result SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_200_DB_FULFILLMENT_NOT_OBSERVED_TRIAGE_GATE_v1*
