# M55 追加相談返書 — webhook forwarding prereq 確認結果 SSOT（v1）

**文書種別:** **Stripe CLI の利用可否**および **ローカル env における Webhook secret キーの有無**の初期確認結果  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**パケット:** [`M55_REPLY_TICKET_WEBHOOK_FORWARDING_SETUP_CHECK_PACKET_v1.md`](./M55_REPLY_TICKET_WEBHOOK_FORWARDING_SETUP_CHECK_PACKET_v1.md)

**記録ポリシー:** **secret・URL 全文・キー値**は本文に **含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **Stripe CLI** | **インストール／コマンド存在**の確認（**listen は起動していない**）。 |
| **`.env.local`** | **`STRIPE_WEBHOOK_SECRET` が「存在し空でない」か**を **boolean のみ**確認。 |
| **値の出力** | **secret・その他の値は出力・転記していない**。 |
| **未実施** | **`stripe listen` 起動**、**webhook 再送**、**追加決済**、**SQL / DB 更新**、**Dashboard / env 変更**。 |

---

## 2. 確認結果

| フィールド | 値 |
|------------|-----|
| **`stripe_cli_installed`** | **true** |
| **`webhook_secret_present_boolean`** | **true** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |
| **`local_dev_server_running`** | **unknown** |
| **`webhook_forward_endpoint_correct`** | **not_checked_yet** |
| **`wrong_endpoint_webhooks_stripe_used`** | **false** |
| **`previous_shadow_settings_remaining`** | **unknown** |

※ **`local_dev_server_running`:** 実施時に **明示的に確認済みなら `true` に更新**する。未確認の場合は **`unknown`** のままとする。

---

## 3. 判定

| 観点 | 結論 |
|------|------|
| **prereq check** | **PASS** — **Stripe CLI は利用可能**、**ローカル env に Webhook secret 用キーは存在**すると記録する。 |
| **forwarding** | **`webhook_forward_endpoint_correct` は未確認**（**not_checked_yet**）。**正規 forward 先は別ゲートで `http://localhost:3000/api/stripe/webhook` と固定して確認する**。 |
| **secret 整合** | **`stripe listen` 開始後に表示される signing secret** と **`.env.local` の値が一致するか**は **未確認**。 |
| **fulfillment** | **`POST /api/stripe/webhook` 受信**、**RPC fulfillment**、**DB 更新**は **未確認**。 |

---

## 4. 次の候補

1. **Stripe CLI `listen` setup gate**（起動・forward URL・secret の取り扱いを **別 SSOT で固定**）。  
2. **正しい forward 先:** **`http://localhost:3000/api/stripe/webhook`**。  
3. **誤 endpoint:** **`/api/webhooks/stripe` は使わない**。  
4. **listen 開始後に表示される signing secret** の **環境への反映ルール**（**値は記録しない**）を **別ゲート**で確定する。  
5. **webhook 再送**は **さらに後**の別承認。  

---

## 5. 引き続き NO-GO

- **`stripe listen` 起動**（本結果 SSOT の作成のみでは未実施とする — **別承認まで NO-GO**）
- **webhook 再送**
- **追加決済**
- **duplicate replay**
- **post baseline 再実行**
- **DB 手動 UPDATE**
- **Dashboard 変更**
- **secret 出力**
- **商品棚 UI** の公開・変更

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**Stripe CLI listen 未起動**。**webhook 再送なし**。**SQL 実行なし**。**DB 更新なし**。**追加決済なし**。**Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_FORWARDING_PREREQ_CHECK_RESULT_v1*
