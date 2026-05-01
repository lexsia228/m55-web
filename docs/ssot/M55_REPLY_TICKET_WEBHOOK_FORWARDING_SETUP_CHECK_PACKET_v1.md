# M55 追加相談返書 — Stripe webhook forwarding setup / check パケット（v1）

**文書種別:** **Stripe webhook がローカル `POST /api/stripe/webhook` に届く構成か**を **人手・ツール準備の観点で確認**する手順 SSOT（**本ファイル作成時点では CLI 未起動・再送なし**）  
**バージョン:** v1  

**前提:** [`M55_REPLY_TICKET_DB_ALIGNMENT_RESULT_v1.md`](./M55_REPLY_TICKET_DB_ALIGNMENT_RESULT_v1.md) — **DB alignment PASS 候補**、local と SQL Editor の **Supabase project 一致済み**。**`target_report_same_as_checkout_test` は `unknown` のまま**。  
**親ゲート:** [`M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md`](./M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md)

**実装の正:** アプリの Stripe webhook ルートは **`/api/stripe/webhook`**（`middleware.ts` の許可パスと整合）。**`/api/webhooks/stripe` はこのプロジェクトの正規 endpoint ではない**。

**記録ポリシー:** **webhook secret・Stripe secret・URL 全文・ログ全文**は記録しない（セクション 4–5）。

---

## 1. このパケットの目的

| 観点 | 内容 |
|------|------|
| **転送経路** | **Stripe → ローカル**の webhook が **`http://localhost:3000/api/stripe/webhook`** に届く **構成になっているか**を確認する。 |
| **環境変数** | **ローカル `.env.local`** に **Webhook 署名検証用 secret が「設定されているか」**を **boolean のみ**で確認する（**値は出さない**）。実装上の変数名は **`STRIPE_WEBHOOK_SECRET`**（`app/api/stripe/webhook/route.ts`）。 |
| **shadow 残骸** | **m55-soul-shadow 時代の endpoint・Dashboard 設定・古い secret の取り違え**が **残っていないか**を **確認観点として列挙**する（**Dashboard の無承認変更はしない**）。 |
| **fulfillment 判定** | **成功・失敗はまだ判定しない**。 |

---

## 2. 確認対象

| # | 確認対象 | 方針 |
|---|----------|------|
| 1 | **ローカル dev server** | **`http://localhost:3000`** で **稼働しているか**（ポートがずれる場合はチーム固定値に合わせ、forward URL と **一致**させる）。 |
| 2 | **forward 先 URL** | **`http://localhost:3000/api/stripe/webhook`** を指しているか（**末尾スラッシュ・http/https の取り違え**に注意）。 |
| 3 | **誤 endpoint** | **`/api/webhooks/stripe`** を **CLI・Dashboard・ドキュメントメモ**で **使っていないか**。 |
| 4 | **`.env.local`** | **`STRIPE_WEBHOOK_SECRET` がキーとして存在し、空でないか**を **boolean のみ**確認（**値は印刷・貼付しない**）。 |
| 5 | **Stripe CLI** | **インストール済みか**、**`stripe login` 済みか**（実行は **別承認** — 本パケットは **確認項目の列挙**）。 |
| 6 | **Stripe Dashboard** | **Developers → Webhooks** で **test mode** の endpoint が **core 用のローカル forward** と整合するか、**shadow / live と混在していないか**を **閲覧のみ**で確認（**設定変更はまだしない**）。 |

---

## 3. shadow 残存確認（方針）

| 観点 | 内容 |
|------|------|
| **旧 endpoint / secret** | **過去の m55-soul-shadow 向け** Webhook endpoint や **別プロジェクトの signing secret** が **CLI の forward・Dashboard・メモ**に **残っていないか**を確認する。 |
| **DB 側** | **DB alignment 結果**に従い、**local env が core の Supabase を向けていること**は既に確認済みとする — webhook でも **「どの Stripe アカウント／どの mode」のイベントか**と **どの secret で検証するか**の **対応が一貫しているか**を **人間が確認**する。 |
| **secret の一致** | **転送元（Stripe CLI が表示する signing secret または Dashboard の endpoint secret）**と **`.env.local` の `STRIPE_WEBHOOK_SECRET`** が **ペアとして一致している必要がある** — **照合しても値は SSOT に書かない**。 |
| **記録** | 結果は **`true` / `false` / `unknown`** のみ（例: **shadow 残骸ありそう** → `previous_shadow_settings_remaining`）。 |

---

## 4. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`local_dev_server_running`** | **true / false** |
| **`webhook_forward_endpoint_correct`** | **true / false / unknown** |
| **`wrong_endpoint_webhooks_stripe_used`** | **true / false**（**`/api/webhooks/stripe` を使っていると判明した場合 true**） |
| **`stripe_cli_installed`** | **true / false / unknown** |
| **`stripe_cli_authenticated`** | **true / false / unknown** |
| **`webhook_secret_present_boolean`** | **true / false**（**`STRIPE_WEBHOOK_SECRET` の存在・非空**） |
| **`previous_shadow_settings_remaining`** | **true / false / unknown** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 5. 記録禁止

- **Stripe webhook secret**
- **Stripe secret key**
- **Supabase URL 全文**
- **DB URL**
- **anon key**
- **service role key**
- **Checkout URL 全文**
- **session id 全文**
- **Stripe event id 全文**
- **raw `user_id`**
- **cookie / token / Authorization**
- **dev log 全文**

---

## 6. STOP 条件

以下に該当しそうになったら **中断**する。

- **secret** を貼りそうになる
- **`/api/webhooks/stripe`** に forward しようとする、または **誤 endpoint** で進めようとする
- **live webhook** を触りそうになる
- **Dashboard の endpoint を無承認で変更**しようとする
- **webhook 再送**へ進もうとする
- **追加決済**へ進もうとする
- **DB 手動 UPDATE** しようとする
- **duplicate replay** へ進もうとする
- **商品棚 UI** へ進もうとする

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **setup / check パケット（本文書の作成）** | **GO** |
| **Stripe CLI 起動** | **次の別承認** |
| **webhook 再送** | **NO-GO** |
| **post baseline 再実行** | **NO-GO** |
| **追加決済** | **NO-GO** |
| **duplicate replay** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 8. 後続予定

1. **本パケットをコミット**  
2. **Stripe CLI / env の presence（boolean）確認**（別セッション）  
3. **forwarding endpoint が `/api/stripe/webhook` であることの再確認**  
4. **webhook 受信ログの summary 確認**（全文貼付禁止）  
5. **正しい target 束縛**で **post fulfillment baseline 再実行**  
6. **fulfillment result SSOT**  
7. **duplicate replay gate**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**Stripe CLI 未起動**。**webhook 再送なし**。**SQL 実行なし**。**DB 更新なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_FORWARDING_SETUP_CHECK_PACKET_v1*
