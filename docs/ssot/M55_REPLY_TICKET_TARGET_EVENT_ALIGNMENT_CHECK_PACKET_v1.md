# M55 追加相談返書 — target event alignment 確認パケット（v1）

**文書種別:** **実際に再送した test `checkout.session.completed`** と **`dedupe / fulfill status diagnostic` の SQL に束縛した `target_stripe_event_id`** が **同一か**を **値なし**で確認する手順・記録規約の SSOT  
**バージョン:** v1  

**前提結果:** [`M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_RESULT_v1.md`](./M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_RESULT_v1.md)

**記録ポリシー:** **event id・session id・payment intent id の全文**および **秘密情報**は **記録しない**（セクション 4–5）。

---

## 1. このパケットの目的

| 観点 | 内容 |
|------|------|
| **切り分け** | **target event ID 不一致**／**イベント選定違い**が最有力である状況で、**人間が画面上で同一性を確認**する。 |
| **対象** | **Stripe Dashboard / Workbench / CLI** で参照できる **再送対象 event** と **SQL の target**。 |
| **記録** | **照合結果のみ `true` / `false` / `unknown`**。**event id 全文は SSOT・チャットに書かない**。 |
| **判定境界** | **fulfillment 成功・失敗はまだ判定しない**。 |

---

## 2. 確認対象

| 対象 | 説明 |
|------|------|
| **実際に再送した event** | **`cli_resend` 等で送った**イベント（**種類・モード**のみ確認）。 |
| **`event_type`** | **`checkout.session.completed`** であること。 |
| **環境** | **test**（**live は対象外**）。 |
| **SKU 文脈** | **追加相談返書チケット**に対応する Checkout 完了イベントであること（**metadata は値なしで確認**）。 |
| **SQL の target** | **diagnostic SQL の `params.target_stripe_event_id`** に差し込んだ値が指す論理 event。 |
| **Workbench** | **Recent deliveries** 等に **同一経路の event が見えるか**（**全文コピペ禁止**）。 |

---

## 3. 確認方法候補

| # | 手順 |
|---|------|
| 1 | **Stripe Workbench / Developers → Events** で、**再送した event の型**が **`checkout.session.completed`** であることを確認する。 |
| 2 | **`charge.updated` / `checkout.session.expired` 等**を **誤って target にしていないか**を確認する。 |
| 3 | **`cli_resend` で使った event** が **Dashboard で見ている event と同一であること**を **画面で照合**する（**ID は貼らない**）。 |
| 4 | **SQL に差し込んだ target event** が **上記と同じ event を指すか**を **人間が照合**する。 |
| 5 | **結果**は **`sql_target_event_matches_actual_replayed_event` 等の boolean のみ**記録する。 |

---

## 4. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`actual_replayed_event_type_checkout_completed`** | **true / false / unknown** |
| **`sql_target_event_matches_actual_replayed_event`** | **true / false / unknown** |
| **`sql_target_event_from_checkout_completed`** | **true / false / unknown** |
| **`wrong_event_type_selected`** | **true / false / unknown** |
| **`workbench_recent_delivery_matches_target`** | **true / false / unknown** |
| **`event_id_value_printed`** | **false** |
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
- **`report_instance_id` 全文**
- **cookie / token / Authorization**
- **dev log 全文**
- **カード情報**

---

## 6. STOP 条件

- **event id 全文**を貼りそうになる
- **誤った event 型**と分かっているのに **再送**しようとする
- **追加決済**しようとする
- **duplicate replay** へ進もうとする
- **DB 手動 UPDATE** しようとする
- **コード修正**しようとする
- **商品棚 UI** へ進もうとする
- **Vercel env** を変更しようとする

---

## 7. 判定方針

| `sql_target_event_matches_actual_replayed_event` | 次のアクション |
|----------------------------------------------------|----------------|
| **false** | **前回 diagnostic は target 不一致として無効寄り**。**正しい event を束縛した SELECT-only diagnostic** を **別パケット・別承認**で再実行する。 |
| **true** | **DB 未記録の理由**を **`stripe_events` insert 順序・route 応答 JSON・`fulfill_status`** 等で **観測**へ進む（**機微なし summary のみ**）。 |
| **unknown** | **再送は増やさず**、**同一性の確認手順**（ダッシュボードの別画面・別オペレータ照合等）を **追加**する。 |

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **packet（本文書の作成）** | **GO** |
| **実 alignment 確認** | **別承認** |
| **追加 replay** | **NO-GO** |
| **SQL 実行** | **NO-GO** |
| **コード修正** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_CHECK_PACKET_v1*
