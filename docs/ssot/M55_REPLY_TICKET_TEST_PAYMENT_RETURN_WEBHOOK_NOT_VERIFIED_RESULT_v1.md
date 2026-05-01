# M55 追加相談返書 — test payment return 観測 / Webhook fulfillment 未検証 結果 SSOT（v1）

**文書種別:** **test checkout payment completion** 実行後の **UI・ルーティング観測**と **Webhook / RPC / DB の未検証**、および **post fulfillment baseline の無効判定**を単一記録に固定する SSOT  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**関連:** [`M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_EXECUTION_PACKET_v1.md)、[`M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md`](./M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md)、[`M55_REPLY_TICKET_DB_POST_FULFILLMENT_BASELINE_PACKET_v1.md`](./M55_REPLY_TICKET_DB_POST_FULFILLMENT_BASELINE_PACKET_v1.md)

**記録ポリシー:** **Checkout URL 全文・session id・user id 実値・secret** は本文に **含めない**。今回添付ログに生値が含まれた事実のみ記録し、**今後は dev log 全文を貼らず summary のみ**とする。

---

## 1. 観測済み

| 項目 | 内容 |
|------|------|
| **Checkout** | **Stripe test Checkout 画面**へ到達した。 |
| **支払い後の遷移** | **test 支払い後**に **`/reply?checkout=complete...`** 形式の URL へ **return** した（**クエリ全文・session 値は記載しない**）。 |
| **UI** | **`/reply` 画面**で **返書が利用可能である旨の表示**を確認した。 |
| **判定上の注意** | **表示のみ**では **Webhook fulfillment 成功**とは **判定しない**（サーバー側の idempotency・wallet・ledger は別検証が必要）。 |

---

## 2. 未確認

| 項目 | 状態 |
|------|------|
| **`POST /api/stripe/webhook` の受信** | **確認できていない**（添付ログの範囲）。 |
| **`m55_reply_ticket_fulfill_checkout_event` RPC 実行** | **未検証**。 |
| **`stripe_processed_events` +1** | **未検証**。 |
| **wallet `purchased_count` +1** | **未検証**。 |
| **wallet `available_count` +1** | **未検証**。 |
| **ledger +1** | **未検証**。 |
| **duplicate replay** | **未検証**。 |

---

## 3. post baseline 無効判定

次の理由により、**今回の post fulfillment baseline SQL の結果は fulfillment 成否の判定に使わない**。

| 理由 | 説明 |
|------|------|
| **件数の不一致** | **pre baseline**（本番 SSOT に記録済みの断面）では **`stripe_processed_events` = 0**、`reply_ticket_wallets` = **8**、`reply_wallet_ledgers` = **10**、`reply_sessions` = **11** であった。一方 **post 実行結果**では **`stripe_processed_events` = 0** のまま **`reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` がすべて 0** と観測された。 |
| **ターゲット束縛の欠落** | **`target_parameter_bound_bool` = false**、**`target_report_exists_bool` = false** — **実行時に対象 `report_instance_id` が束縛されていないか**、**別 DB / 別プロジェクトを見ている可能性**が高い。 |
| **断定禁止** | 上記より **fulfillment の失敗・成功は断定しない**。 |
| **再 baseline** | **正しい DB 接続先**および **正しい target 指定**で **pre / post を再度**取る必要がある。 |

---

## 4. ログ取り扱い改善

| 事項 | 方針 |
|------|------|
| **今回** | 添付ログに **session id / user id 系の生値**が **含まれた**。 |
| **今後** | **dev log 全文をチャット・チケット・SSOT に貼らない**。**summary のみ**記録する。 |
| **禁止出力** | **Checkout URL 全文・session id・user id・secret** は **出力・転記しない**。 |

---

## 5. 次の候補

1. **DB 接続先 alignment gate** — ローカルアプリが参照している **Supabase project** と、**SQL Editor で実行した DB** が **同一か**を手順化して確認する。  
2. **Stripe webhook forwarding gate** — **Stripe CLI / Dashboard の test webhook** が **`POST /api/stripe/webhook`** に届く経路の確認。  
3. **Webhook 受信ログの確認** — **機微値をマスクした summary のみ**で十分性を判断する。  
4. **alignment 後に post fulfillment baseline を再実行** — **PRE と同一 target・同一 DB** で SELECT を取り直す。  

---

## 6. 引き続き NO-GO

- **追加支払い**
- **duplicate replay**
- **商品棚 UI** の公開・変更
- **Vercel env 変更**
- **live 決済**
- **DB 手動更新**
- **secret / session / user id の出力**

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL 実行・DB 更新・Stripe Dashboard/env 変更・追加決済・秘密出力・商品棚 UI 操作は **実施していない**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_TEST_PAYMENT_RETURN_WEBHOOK_NOT_VERIFIED_RESULT_v1*
