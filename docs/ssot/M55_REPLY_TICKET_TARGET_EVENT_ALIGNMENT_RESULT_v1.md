# M55 追加相談返書 — target event alignment 確認結果 SSOT（v1）

**文書種別:** **実際に `cli_resend` した event** と **`dedupe / fulfill status diagnostic` の SQL に束縛した target event** の **同一性**を **人間が確認した**結果の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**実行パケット:** [`M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_CHECK_PACKET_v1.md`](./M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_CHECK_PACKET_v1.md)  
**前提 diagnostic:** [`M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_RESULT_v1.md`](./M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_RESULT_v1.md)

**記録ポリシー:** **event id / session id / payment intent id / secret** は本文に **含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **確認場所** | **Stripe Workbench / Events** で対象 event を確認した。 |
| **同一性** | **`cli_resend` した event** と **SQL の target event** が **同一であること**を **人間が確認**した。 |
| **値の出力** | **識別子・secret は出力していない**。 |
| **未実施** | **追加 replay**、**追加決済**、**SQL 再実行**、**DB 更新**、**コード変更**、**商品棚 UI 操作**。 |

---

## 2. 確認結果

| フィールド | 値 |
|------------|-----|
| **`actual_replayed_event_type_checkout_completed`** | **true** |
| **`sql_target_event_matches_actual_replayed_event`** | **true** |
| **`sql_target_event_from_checkout_completed`** | **true** |
| **`wrong_event_type_selected`** | **false** |
| **`workbench_recent_delivery_matches_target`** | **true** |
| **`event_id_value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 3. PASS 判定

| 観点 | 結論 |
|------|------|
| **target event alignment** | **PASS** |
| **再送 event の型** | **`checkout.session.completed`** |
| **SQL target** | **actual replayed event と一致** |
| **誤った型の選定** | **なし**（`wrong_event_type_selected` = **false**） |
| **event id の実値** | **出していない** |

---

## 4. 意味

| 観点 | 解釈 |
|------|------|
| **event 選定ミス** | **可能性は低い**（**target は再送 event と一致**が確認された）。 |
| **前回 diagnostic** | それでも **`generic_stripe_events_has_target_event` = false** / **`processed_events_has_target_event` = false** だったため、**単純な event 選定違いだけでは説明しきれない**。 |
| **次の焦点** | **route 内部の記録・分岐**、および **HTTP 応答の status / body（redacted）** で **`lane` / `fulfill_status`** を観測する必要がある。 |
| **global dedupe** | **断定は保留**（**`stripe_events` への書き込みタイミング**と **観測した SQL 束縛の整合**は別途）。 |
| **DB fulfillment** | **成功・失敗はまだ未判定**。 |

---

## 5. 次の候補

1. **redacted route response / `fulfill_status` observation gate**  
2. **Webhook route の応答 JSON** に **`lane` / `fulfill_status`** があるか **マスク済みで確認**  
3. **必要なら** **最小限の redacted diagnostic log 追加 gate**（**別承認・別 PR**）  
4. **その後** **再 replay**（別承認）  
5. **その後** **post fulfillment baseline**（別承認）  

---

## 6. 引き続き NO-GO

- **追加決済**
- **追加 replay**
- **duplicate replay**
- **DB 手動 UPDATE**
- **コード修正**
- **SQL 再実行**
- **商品棚 UI**
- **Vercel env 変更**
- **event / session / payment intent id 全文の出力**
- **secret 出力**

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_RESULT_v1*
