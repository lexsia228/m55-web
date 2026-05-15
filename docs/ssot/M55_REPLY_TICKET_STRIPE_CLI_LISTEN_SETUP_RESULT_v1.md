# M55 追加相談返書 — Stripe CLI `listen` setup 結果 SSOT（v1）

**文書種別:** **`stripe listen` 起動・forward 先・signing secret とローカル env の整合**を確認した結果の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**ゲート:** [`M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_GATE_v1.md`](./M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_GATE_v1.md)  
**前提 prereq:** [`M55_REPLY_TICKET_WEBHOOK_FORWARDING_PREREQ_CHECK_RESULT_v1.md`](./M55_REPLY_TICKET_WEBHOOK_FORWARDING_PREREQ_CHECK_RESULT_v1.md)

**記録ポリシー:** **`whsec_...`・その他 secret・event id 全文・session id 全文**は本文に **含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **Stripe CLI** | **`stripe listen` を起動した**。 |
| **forward 先** | **`http://localhost:3000/api/stripe/webhook`** へ向いていることを確認した。 |
| **正規 endpoint** | **`/api/stripe/webhook` を使用**。 |
| **誤 endpoint** | **`/api/webhooks/stripe` は使用していない**。 |
| **signing secret** | **`listen` 表示値**と **`.env.local` の `STRIPE_WEBHOOK_SECRET`** が **一致していること**を **人間が確認した**。 |
| **値の記録** | **secret 値は記録・出力していない**。 |
| **未実施** | **webhook 再送**、**追加決済**、**SQL / DB 更新**、**Dashboard / env 変更**、**商品棚 UI 操作**。 |

---

## 2. 確認結果

| フィールド | 値 |
|------------|-----|
| **`stripe_cli_listen_started`** | **true** |
| **`forward_endpoint_correct`** | **true** |
| **`webhook_secret_matches_local_env`** | **true** |
| **`webhook_secret_updated_locally`** | **false** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 3. PASS 判定

| 観点 | 結論 |
|------|------|
| **listen setup** | **PASS** |
| **local webhook forwarding 準備** | **成立** — **正しい endpoint** へ forward し、**signing secret と local env の整合**が取れている。 |
| **次ステップの前提** | **Webhook 受信確認**へ進める **前提が成立**。 |
| **未確認** | **Webhook イベント受信**は **未確認**。**RPC fulfillment** は **未確認**。**DB 更新**は **未確認**。 |

---

## 4. 次の候補

1. **webhook receive / replay gate**（受信ログの **summary のみ**）。  
2. **既存の test `checkout.session.completed` イベントを再送するか**は **別ゲートで判断**。**再送時も event id 全文は貼らない**。  
3. **post fulfillment baseline 再実行**は **webhook 受信・fulfillment 経路確認後**に **別承認**。  

---

## 5. 引き続き NO-GO

- **webhook 再送**
- **追加決済**
- **duplicate replay**
- **post baseline 再実行**
- **DB 手動 UPDATE**
- **Vercel env 変更**
- **secret / whsec / event id / session id の出力**
- **商品棚 UI** の公開・変更

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**webhook 再送なし**。**追加決済なし**。**SQL 実行なし**。**DB 更新なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_RESULT_v1*
