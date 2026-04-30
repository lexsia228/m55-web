# M55 追加相談返書 — Stripe test price / env setup execution packet（v1）

**文書種別:** [`M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_PREPARATION_GATE_v1.md`](./M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_PREPARATION_GATE_v1.md) に基づき、**Stripe test mode** での **Product/Price 作成** と **ローカル env 参照**を行う際の **実行手順パケット**（**本ファイル作成時点では未実施**）  
**バージョン:** v1

**本エージェントの範囲:** **文書のみ**。Dashboard・env・API・SQL・DB・UI は**変更していない**。**price id・secret は本文に含めない**。

---

## 1. 実施対象

| 項目 | 内容 |
|------|------|
| **Stripe** | **test mode のみ**。**live は対象外**。 |
| **商材** | **追加相談返書チケット**用 **Product / Price** |
| **決済** | **One-time**（`mode=payment` と整合） |
| **金額** | **500 JPY** |
| **アプリ env キー** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`**（**値は SSOT に書かない**） |
| **アプリ metadata** | **`product_key` = `additional_reply_ticket`**（仕様のため記載。Price id と混同しない。） |
| **配置** | **ローカル `.env.local`** と **Vercel** は**別物**。**本パケットでは Vercel を原則触らない**（§8）。 |

---

## 2. Stripe Dashboard 作業方針

1. Dashboard 右上またはチーム運用どおり **`Test mode`** を明示してから開く。**live での作成・複製・切替禁止**。
2. **Product** を新規。**表示名は社内運用で識別しやすければよい**（製品論理名 ≠ `product_key` 文字列であってよい）。
3. **Price** を **500 JPY**・**一回払い（one-time）** で作成。
4. **`price_*` の識別子**は **運用メモおよび env にのみ転記**。**チャット・SSOT・ticket 本文・スクリーンショットの共有には載せない**。
5. スクショを撮る場合、**price id が写る領域をマスクする**か、**撮らない**。
6. **live の Product/Price は作らない**。

---

## 3. env 設定方針

| 対象 | 方針 |
|------|------|
| **`.env.local`（ローカル）** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET=`** に **Stripe test Price id を貼り付ける** — **別承認のうえ実施**。**ファイルの実内容をチャット転載しない**。 |
| **Vercel** | **本 packet の標準経路では変更しない**。Preview/Production に載せる場合は **別承認・別手順**。 |
| **値の開示** | **price id を含むいかなる env 値も SSOT に書かない**。 |
| **設定後チェック** | **boolean のみ**（ゲート準拠）: `key_exists`、`runtime_env_present`、`value_printed=false`、`secret_exposed=no`。参照: [`Stage B price env presence check gate`](./M55_REPLY_TICKET_STAGE_B_PRICE_ENV_PRESENCE_CHECK_GATE_v1.md)。 |

---

## 4. 記録してよいもの（結果 SSOT 用）

- **test mode で作業したこと**（宣言）
- **`amount = 500 JPY`**
- **one-time**（宣言）
- **env **キー名****（文字列 **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` のみ**）
- **`price_id_configured: true`** または環境単位 **`true/false`**（**id の列挙なし**）
- **`value_printed: false`**
- **`secret_exposed: no`**
- **timestamp**
- **秘密を含まない短文メモ**（実施者）

---

## 5. 記録禁止

- **price id の実文字列**
- **`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`**
- **Clerk / Supabase** の秘密
- **DB URL**
- **Cookie / Bearer / Authorization**
- **price id や secret が写り込んだ Dashboard スクショの共有**

---

## 6. STOP 条件

| # | 内容 |
|---|------|
| 1 | **live mode** で Product/Price を作成・編集している |
| 2 | **price id** を**貼りそう／貼した** |
| 3 | **secret** を**貼りそう／貼した** |
| 4 | **Checkout Session 作成**テストへ**無承認で**進む |
| 5 | **実決済**へ進む |
| 6 | **実 Webhook** を**意図的に**発火させる |
| 7 | **DB 更新 smoke** へ進む |
| 8 | **商品棚 UI** に露出させる |
| 9 | **Vercel env** を**無承認で**変更する |

---

## 7. 実施後の確認候補（まだ Session は作らない）

- **`.env.local` にキー行が存在するか** — **boolean のみ**（行の**値は表示・共有しない**）
- **Next / runtime で `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` が truthy か** — **boolean のみ**
- **`value_printed = false`**
- **`secret_exposed = no`**
- **Checkout Session の作成はまだ行わない**（次ゲート）

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **setup execution packet の作成** | **GO** |
| **実際の Dashboard 作業** | **別承認** |
| **ローカル `.env.local` への設定** | **別承認** |
| **Vercel env 変更** | **本 packet の標準では NO-GO** |
| **Checkout Session 作成** | **NO-GO** |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 実施後の結果 SSOT（任意）

`M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_PREPARATION_RESULT_v1.md` に §4 のフィールドのみを追記する。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。Dashboard 変更・env 実値設定・secret/price id 出力・API・SQL・DB・商品棚 UI を本エージェントは実施していない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_SETUP_EXECUTION_PACKET_v1*
