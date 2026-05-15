# M55 追加相談返書 — Stripe event / session metadata 確認結果 SSOT（v1）

**文書種別:** **Stripe Dashboard** における **test `checkout.session.completed` / Checkout Session の metadata** を **値なし**で確認した結果の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**実行パケット:** [`M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_PACKET_v1.md`](./M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_PACKET_v1.md)  
**親トリアージ:** [`M55_REPLY_TICKET_WEBHOOK_200_DB_FULFILLMENT_NOT_OBSERVED_TRIAGE_GATE_v1.md`](./M55_REPLY_TICKET_WEBHOOK_200_DB_FULFILLMENT_NOT_OBSERVED_TRIAGE_GATE_v1.md)

**記録ポリシー:** **event id・session id・payment intent id・report_instance_id・user_ref_hash・client_reference_id の値**および **秘密情報**は本文に **含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **確認場所** | **Stripe Dashboard** で **対象 test `checkout.session.completed` / Checkout Session** を確認した。 |
| **metadata** | **値は記録せず**、**boolean のみ**で確認した。 |
| **補助** | **AI による確認を補助的に実施**した（**値の出力なし**）。 |
| **Dashboard** | **設定変更はしていない**。 |
| **未実施** | **追加 replay**、**追加決済**、**SQL / DB 更新**、**コード変更**、**商品棚 UI 操作**。 |

---

## 2. 確認結果

| フィールド | 値 |
|------------|-----|
| **`event_type`** | **`checkout.session.completed`** |
| **`stripe_environment_test`** | **true** |
| **`checkout_session_mode`** | **`payment`** |
| **`event_metadata_product_key_present`** | **true** |
| **`event_metadata_product_key_is_additional_reply_ticket`** | **true** |
| **`event_metadata_report_instance_id_present`** | **true** |
| **`event_metadata_report_instance_matches_target`** | **true** |
| **`event_metadata_user_ref_hash_present`** | **true** |
| **`event_client_reference_id_present`** | **true** |
| **`event_payment_intent_present`** | **true** |
| **`event_amount_currency_expected`** | **true** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 3. PASS 判定

| 観点 | 結論 |
|------|------|
| **metadata check** | **PASS** |
| **必須情報の揃い** | **`product_key` / `report_instance_id` / `user_ref_hash` / `client_reference_id` / `payment_intent` / amount–currency（期待どおり）** が **揃っている**と記録する。 |
| **Stripe payload 欠落** | **可能性は低い**（上記により）。 |
| **`report_instance_id` と target の不一致** | **可能性も低い**（**matches_target = true**）。 |
| **DB fulfillment** | **成功・失敗はまだ判定しない**。 |

---

## 4. 限界

| 項目 | 状態 |
|------|------|
| **Webhook route 内で Reply lane に入ったか** | **未確定** |
| **global dedupe で早期 return したか** | **未確定** |
| **Reply lane の STOP 条件で止まったか** | **未確定** |
| **RPC 戻り値**（processed / duplicate_noop / rejected / skipped / error） | **未確定** |
| **DB 反映** | **未確認** |

---

## 5. 次の候補

1. **webhook route / Reply lane 静的監査パケット**  
2. **`app/api/stripe/webhook/route.ts`** の **分岐順**確認  
3. **`lib/m55/reply/replyTicketWebhookLane.ts`** の **STOP 条件**確認  
4. **`lib/m55/reply/replyTicketFulfillmentRpc.ts`** の **RPC 戻り値の扱い**確認  
5. **必要なら redacted diagnostic log の最小追加**（**別ゲート・別 PR**）  

---

## 6. 引き続き NO-GO

- **追加決済**
- **追加 replay**
- **duplicate replay**
- **DB 手動 UPDATE**
- **SQL 実行**
- **コード修正**
- **商品棚 UI** の公開・変更
- **Vercel env 変更**
- **event / session / payment intent / report_instance / user_ref / client_reference の値出力**
- **secret 出力**

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_RESULT_v1*
