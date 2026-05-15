# M55 追加相談返書 — redacted route response / fulfill_status 観測ゲート（v1）

**文書種別:** **`POST /api/stripe/webhook` が返す応答**の **redacted JSON / summary** から **`lane` / `fulfill_status` / skip 理由**を観測するためのゲート SSOT（**本文書作成時点では観測・再送・コード変更なし**）  
**バージョン:** v1  

**前提:** [`M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_RESULT_v1.md`](./M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_RESULT_v1.md) — **target event alignment PASS**  
**diagnostic コンテキスト:** [`M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_RESULT_v1.md`](./M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_RESULT_v1.md)

**記録ポリシー:** **event id・session id・payment intent id・secret・全文ログ**は **記録しない**（セクション 3–4）。

---

## 1. このゲートの目的

| 観点 | 内容 |
|------|------|
| **200 の内訳** | **Webhook route が 200 を返したとき**、**Reply lane に入ったか**、**どの `fulfill_status` か**を **機微なし**で固定する。 |
| **観測経路** | **応答 JSON**（**キー名・列挙値のみ**）または **Next dev の redacted summary**。 |
| **境界** | **event / session / payment intent の全文**および **secret を出さない**。**DB の最終成否はまだ断定しない**。 |

---

## 2. 観測候補

| # | 観測 |
|---|------|
| 1 | **route response JSON** に **`lane`** が含まれるか |
| 2 | **route response JSON** に **`fulfill_status`** が含まれるか |
| 3 | **Reply lane**（例: `lane=reply_ticket`）が **観測できるか** |
| 4 | **RPC が呼ばれたか**（間接的なフラグ・ログ要約のみ） |
| 5 | **RPC result の status** が **`processed` / `duplicate_noop` / `rejected_*` / `skipped_cap` 等として読み取れるか** |
| 6 | **global dedupe**（**応答が `{ received: true }` のみ**等）で **早期 return** に見えるか |
| 7 | **`client_reference_id` / `report_instance_id` / `product_key` による STOP（400 系）**ではないか |
| 8 | **`duplicate_noop` / `rejected_*` / `skipped_cap` / `processed`** の **どれが妥当か**（**断定は結果 SSOT**） |

---

## 3. 記録してよいもの

| フィールド | 型 / 値 |
|------------|---------|
| **`route_response_2xx`** | **true / false / unknown** |
| **`route_response_json_observed`** | **true / false / unknown** |
| **`route_response_lane`** | **`reply_ticket` / `dtr` / `generic_dedupe` / `unknown`** |
| **`fulfill_status_observed`** | **`processed` / `duplicate_noop` / `skipped_cap` / `rejected_invalid_product` / `rejected_not_owner` / `rejected_wallet_inactive` / `rejected_wallet_not_found` / `error` / `unknown`** |
| **`rpc_called`** | **true / false / unknown** |
| **`global_dedupe_observed`** | **true / false / unknown** |
| **`reply_lane_observed`** | **true / false / unknown** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

※ **`rejected_wallet_not_found`** は **HTTP / JSON で明示される場合とログ依存の場合があり得る** — **unknown を許容**する。

---

## 4. 記録禁止

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
- **`user_ref_hash` の値**
- **`client_reference_id` の値**
- **cookie / token / Authorization**
- **dev log 全文**
- **カード情報**

---

## 5. STOP 条件

- **secret** を貼りそうになる
- **event / session / payment intent id 全文**を貼りそうになる
- **dev log 全文**を貼りそうになる
- **追加決済**しようとする
- **duplicate replay**へ進もうとする
- **DB 手動 UPDATE**しようとする
- **商品棚 UI**へ進もうとする
- **Vercel env** を変更しようとする

---

## 6. 実行方針

| 項目 | 内容 |
|------|------|
| **本ゲート** | **実行しない** — **観測の設計のみ**。 |
| **次** | **observation execution packet** を作成する。 |
| **観測源** | **Stripe CLI replay 時の response**、または **Next dev の redacted summary** のみ。 |
| **観測不能時** | **最小の redacted diagnostic log 追加 gate** を **別承認**で検討。**コード修正はまだ NO-GO**。 |

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **gate（本文書の作成）** | **GO** |
| **observation execution** | **別承認** |
| **webhook 再送** | **NO-GO** |
| **SQL 実行** | **NO-GO** |
| **コード変更** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 8. 後続予定

1. **redacted route response / fulfill_status observation execution packet**  
2. **必要なら** **最小 redacted diagnostic log gate**  
3. **再 replay**（別承認）  
4. **観測結果 SSOT**  
5. **post fulfillment baseline 再実行**  
6. **fulfillment result SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_GATE_v1*
