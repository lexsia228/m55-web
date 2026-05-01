# M55 追加相談返書 — Stripe CLI `listen` setup ゲート（v1）

**文書種別:** **`stripe listen` をローカル Webhook 検証用に起動する前**に満たす条件・コマンド・signing secret の取り扱いを固定するゲート SSOT（**本文書作成時点では listen 未起動**）  
**バージョン:** v1  

**前提結果:** [`M55_REPLY_TICKET_WEBHOOK_FORWARDING_PREREQ_CHECK_RESULT_v1.md`](./M55_REPLY_TICKET_WEBHOOK_FORWARDING_PREREQ_CHECK_RESULT_v1.md)  
**関連パケット:** [`M55_REPLY_TICKET_WEBHOOK_FORWARDING_SETUP_CHECK_PACKET_v1.md`](./M55_REPLY_TICKET_WEBHOOK_FORWARDING_SETUP_CHECK_PACKET_v1.md)

**記録ポリシー:** **`whsec_...` 全文・その他 secret** は **SSOT / チャットに貼らない**。

---

## 1. このゲートの目的

| 観点 | 内容 |
|------|------|
| **事前条件** | **`stripe listen` を起動する前**に、**forward 先・環境・モード**を **ゲートとして固定**する。 |
| **forward 先** | **`http://localhost:3000/api/stripe/webhook`** に **統一**する。 |
| **誤 endpoint** | **`/api/webhooks/stripe` は使わない**（アプリの正規ルートは **`/api/stripe/webhook`**）。 |
| **signing secret** | **`listen` 出力の signing secret** と **`.env.local` の `STRIPE_WEBHOOK_SECRET`** の **関係・更新ルール**を本文で決める（**値は書かない**）。 |
| **fulfillment 判定** | 本ゲートは **listen 起動の準備**のみ。**Webhook 受信成功・RPC・DB 更新の断定はしない**。 |

---

## 2. 前提条件

以下を **満たしてから** `stripe listen` の実行を **別承認**で検討する。

| 前提 | 内容 |
|------|------|
| **ローカル dev** | **`http://localhost:3000`** でアプリが **稼働している**こと。 |
| **Stripe CLI** | **インストール済み**かつ **`stripe login` 済み**（prereq / 別確認）。 |
| **`.env.local`** | **`STRIPE_WEBHOOK_SECRET` キーが存在し空でない**（boolean で prereq 済みでも **listen 直前に再確認可**）。 |
| **アプリ** | **`POST /api/stripe/webhook`** ルートを **実装が提供している**こと。 |
| **Stripe** | **test mode** で扱う。**live webhook は触らない**。 |
| **決済** | **追加決済しない**（listen の検証は **既存イベント再送または後続別ゲート**で扱う — **本ゲートのスコープ外で明示**）。 |

---

## 3. `listen` コマンド候補

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

| 規約 | 内容 |
|------|------|
| **forward URL** | 上記 **`/api/stripe/webhook`** のみ。**`/api/webhooks/stripe` に絶対にしない**。 |
| **実行** | **`stripe listen` の起動は次の別承認**（本ファイルは **コマンドの固定のみ**）。 |

---

## 4. signing secret 方針

| 項目 | 方針 |
|------|------|
| **出力** | `stripe listen` 起動時に **`whsec_...` 形式の signing secret** が **表示されることがある**。その **全文はチャット・SSOT・ログ共有に貼らない**。 |
| **検証** | アプリは **`STRIPE_WEBHOOK_SECRET`** で署名検証する。**listen が出力した値と `.env.local` が一致している必要がある**。 |
| **不一致時** | **値をどこにも出力せず**、**`.env.local` を更新するか**を **別承認**で判断する。更新した場合も **結果記録は boolean のみ**（例: **`webhook_secret_updated_locally`**）。 |
| **Vercel** | **Vercel env は変更しない**（ローカル検証のみ）。 |

---

## 5. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`stripe_cli_listen_started`** | **true / false** |
| **`forward_endpoint_correct`** | **true / false** |
| **`webhook_secret_present_boolean`** | **true / false** |
| **`webhook_secret_updated_locally`** | **true / false** |
| **`local_dev_server_running`** | **true / false** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 6. 記録禁止

- **`whsec_...` 全文**
- **Stripe secret key**
- **DB URL**
- **Supabase keys（anon / service role 等）**
- **Checkout URL 全文**
- **session id 全文**
- **Stripe event id 全文**
- **raw `user_id`**
- **cookie / token / Authorization**
- **dev log 全文**

---

## 7. STOP 条件

以下に該当しそうになったら **中断**する。

- **`whsec` や signing secret 全文**を貼りそうになる
- **`/api/webhooks/stripe`** に forward しようとする
- **live webhook** を触ろうとする
- **Vercel env** を変更しようとする
- **webhook 再送**のみ先行しようとする（**listen・secret 整合なし**）
- **追加決済**しようとする
- **DB 手動 UPDATE** しようとする
- **duplicate replay** へ進もうとする
- **商品棚 UI** へ進もうとする

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **listen setup gate（本文書の作成）** | **GO** |
| **`stripe listen` 起動** | **次の別承認** |
| **signing secret と local env の整合確認** | **listen 起動後・別手順** |
| **webhook 再送** | **NO-GO** |
| **post baseline 再実行** | **NO-GO** |
| **追加決済** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**Stripe CLI listen 未起動**。**webhook 再送なし**。**SQL 実行なし**。**DB 更新なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_GATE_v1*
