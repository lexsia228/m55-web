# M55 追加相談返書 — Stripe test price / env preparation ゲート（v1）

**文書種別:** **Stage B 完了後**の次フェーズとして、追加相談返書チケット用 **Stripe test mode の Product/Price と env 参照**を整えるための **準備ゲート SSOT**（設計・手順境界の固定）  
**バージョン:** v1  
**前提完了:** [`M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_COMPLETION_v1.md`](./M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_COMPLETION_v1.md)

**本ファイル作成時:** Stripe Dashboard は**変更していない**。`.env.local` / Vercel は**設定変更していない**。**price id・secret は本文に含めない**。API・SQL・DB・商品棚 UI は**実行・変更していない**。

---

## 1. このゲートの目的

| 項目 | 内容 |
|------|------|
| **ゴール** | **`POST /api/reply-tickets/checkout`** が **`checkout.sessions.create`** で参照する **Stripe Price ID** を、**test mode のみ**で用意し、アプリ側 **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** で参照できる状態にする**方針を固定**する（**本ゲート文書のみでは準備完了にしない**）。 |
| **env 名（固定）** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`**（コード契約どおり。**値は書かない**）。 |
| **値の開示** | **price id 実値・すべての秘密は SSOT・チャット・ログ共有に載せない**。 |
| **Dashboard** | **Stripe Dashboard での作成・変更は別承認**まで **NO-GO**。 |
| **Checkout Session** | **作成テストは別ゲート** — 本ゲートだけでは開始しない。 |

---

## 2. 準備対象（仕様メモ）

| 項目 | 要件 |
|------|------|
| **Stripe mode** | **test mode のみ**（このゲートおよび直後の実施フェーズ）。**live mode の Product/Price は対象外**。 |
| **決済タイプ** | **one-time**（Checkout `mode=payment` と整合）。 |
| **金額** | **500 円**・**JPY**。 |
| **SKU 意味論** | アプリ側 **`product_key`** は **`additional_reply_ticket`**（Checkout metadata／検証コードと整合。**Stripe Product の名前は運用命名でよいが SSOT に price id を書かない**。） |
| **env key** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`**（Stripe **Price API id**、`price_...` を指す。**値は環境ごとに保持し SSOT に貼らない**。） |
| **環境の分離** | **ローカル（例: `.env.local`）** と **Vercel（preview / production）** は **別々に管理**。**同じ test price id を流用するか**はチーム方針。**いずれも無承認では書き換えない**。 |

**参照（コード）:** `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` は [`app/api/reply-tickets/checkout/route.ts`](../../app/api/reply-tickets/checkout/route.ts) で参照。

---

## 3. 記録してよいもの（実施後の結果 SSOT でよいフィールド）

| フィールド | 例 |
|------------|-----|
| **env key name** | `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`（文字列そのものはキー名のみ） |
| **stripe mode** | **`test`** と declare |
| **price amount** | **`500 JPY`**（金額のみ。id は出さない） |
| **`price_id_configured`** | **true / false**（**場所は「local」「Vercel preview」等ラベルのみ**でも可） |
| **`value_printed`** | **`false`** を維持 |
| **`secret_exposed`** | **`no`** |

---

## 4. 記録禁止

- **Stripe secret key**、**Webhook signing secret**
- **price id の実文字列**
- **DB URL**、資格情報
- **Clerk / Supabase service role** 等 KMS
- **Cookie / Bearer / Authorization**

---

## 5. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **live mode** で Product/Price を作成・変更しようとする |
| 2 | **price id 実値**を **チャット / SSOT** に貼る |
| 3 | **いかなる secret** を **開示・スクリーンショット共用**する |
| 4 | **無承認で** **Checkout Session 作成テスト**まで進む |
| 5 | **実決済** |
| 6 | **実 Webhook 発火**（fulfillmentまで） |
| 7 | **商品棚 UI** に露出 |
| 8 | **DB 更新 smoke** |

---

## 6. 次の段階案（推奨順・概念）

1. **本 preparation ゲート**（本文書）— **作成のみ GO**。
2. **Stripe Dashboard での test Product/Price 作成** と **env へのバインド** — **別承認**後のみ実施。
3. **`price env presence` の再確認**（boolean／**値なし**）— [`Stage B price env gate`](./M55_REPLY_TICKET_STAGE_B_PRICE_ENV_PRESENCE_CHECK_GATE_v1.md) と同型の衛生規律。
4. **Checkout Session creation test gate** — **test mode**での **Session のみ**（**決済完了までは未定義**）。
5. **test webhook fulfillment gate**（別 SSOT）。
6. **duplicate replay test**。
7. **live 低額**は **さらに後**。

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **preparation gate 文書の作成** | **GO** |
| **Stripe Dashboard 変更** | **NO-GO**（別承認まで） |
| **env に実値を設定すること** | **NO-GO**（別承認まで） |
| **Checkout Session の作成テスト** | **NO-GO**（次ゲート） |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 実施後の結果 SSOT（任意）

`M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_PREPARATION_RESULT_v1.md` に §3 のフィールドのみを記載する（**値は載せない**）。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。Dashboard / env 変更・secret・price id の出力・API・SQL・DB・UI を本エージェントは実施していない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_PREPARATION_GATE_v1*
