# M55 追加相談返書 — Checkout Session creation test ゲート（v1）

**文書種別:** **test mode・ローカル**において **`POST /api/reply-tickets/checkout`** から **Checkout Session 作成**までを試すかどうかを固定するゲート SSOT  
**バージョン:** v1  
**前提:** [`M55_REPLY_TICKET_STRIPE_TEST_PRICE_LOCAL_ENV_SETUP_RESULT_v1.md`](./M55_REPLY_TICKET_STRIPE_TEST_PRICE_LOCAL_ENV_SETUP_RESULT_v1.md)（**local `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` 設定済み・runtime present**）

**本ファイル作成時:** API・Session 作成・Dashboard/env 変更・DB 更新を**実施していない**。**秘密・URL 全文は本文に含めない**。

---

## 1. このゲートの目的

| 項目 | 内容 |
|------|------|
| **判断** | **ローカル**で、追加返書チケット用 **`checkout.sessions.create`** まで到達する **Session 作成テスト**に進むかを **ゲートとして固定**する。 |
| **Stripe** | **test mode のみ**。**live は対象外**。 |
| **支払い** | **行わない**（決済画面に遷移しても **カードで支払わない**）。 |
| **記録** | **`checkout_url` が返る可能性**があるため、**SSOT・チャットに URL 全文を貼らない**ルールを **この文書で固定**する。 |
| **Webhook** | **実 Webhook → RPC fulfillment** は **まだ NO-GO**。 |

---

## 2. 前提条件

| 条件 | 内容 |
|------|------|
| **Price env** | **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** が **ローカル runtime で present**（boolean 確認済み想定）。 |
| **Stripe 秘密鍵** | **`STRIPE_SECRET_KEY`** は **既存のローカル設定**を利用。**値は確認画面・ログ・SSOT に出さない**。 |
| **Webhook secret** | **本ゲートでは扱わない**（Stripe CLI forward 等は **別ゲート**）。 |
| **Vercel** | **env を変更しない**。 |
| **UI** | **商品棚経由ではなく**、**開発者向け・非公開**の検証とする（同一オリジン `fetch` 等）。 |
| **認証** | **ログイン済みユーザー**で実施。**same-origin credentials** でよいが **ヘッダ実値は貼らない**。 |
| **`report_instance_id`** | **本人が所有する**スナップショットのみ。**UUID をチャット転載しない**運用でもよい（**本人の開発 UI から取得**など）。 |
| **PII** | **raw `user_id`、生年月日、report 本文、相談本文**を **チャット／SSOT に出さない**。 |

---

## 3. 実施範囲（別承認後に実行される想定）

| 項目 | 内容 |
|------|------|
| **HTTP** | **`POST /api/reply-tickets/checkout`** を **認証済み**で呼ぶ。 |
| **body** | **`product_key` = `additional_reply_ticket`**、**`report_instance_id`** = **本人所有の安全な ID**（API 契約どおり）。 |
| **ゲート経路** | **所有権・wallet・cap** により **`422`/`403`/`404`** で止まる場合は **本ゲートの「Session 未到達」**として記録（**DB 捏造禁止**の[`Stage B`](./M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_COMPLETION_v1.md) と整合）。 |
| **期待（成功経路だけが本ゲートの主目的）** | **Stripe 側で Session が作成**され、応答に **`checkout_url`** および／または **`session_id`** が含まれる。 |
| **記録** | **URL／session の完全文字列は SSOT に書かない**（§4 の boolean／短いフラグのみ）。 |
| **ブラウザ** | **URL を開いて決済しない**。必要なら **開かない**。 |

---

## 4. 記録してよいもの（結果 SSOT）

| フィールド | 例 |
|------------|-----|
| **`http_status`** | **200** またはエラー時のコード |
| **`response_has_checkout_url`** | **true/false** |
| **`response_has_session_id`** | **true/false** |
| **`stripe_mode`** | **test**（宣言または Dashboard 状態に整合） |
| **`amount_nominal`** | **500 JPY**（製品要件のラベルのみ。**決済結果の確定証明ではない**） |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |
| **`checkout_url_full_printed`** | **false** |
| **`payment_completed`** | **false**（必須維持） |
| **`timestamp`** | （運用入力） |

---

## 5. 記録禁止

- **Checkout URL 全文**
- **`session_id` 全文・`sess_...` 実列**
- **price id 実値**
- **Stripe secret / Webhook secret**
- **DB URL**、資格情報
- **Clerk / Supabase** secret
- **Cookie / Bearer / Authorization**
- **raw `user_id`**
- **生年月日**
- **report 本文・相談本文**

---

## 6. DB 不変方針

- **Checkout Session の作成のみ**では、設計どおり **`reply_ticket_wallets` / `reply_wallet_ledgers` / `stripe_processed_events`** は**変わらない想定**。  
- **実 Webhook を発火しない**。**決済完了させない**。  
- 任意確認: 実施前後 **`SELECT` のみ**で **件数**を照合。**INSERT/UPDATE が観測されたら STOP** とし原因切り分け（想定外の副作用）。

---

## 7. STOP 条件

| # | 内容 |
|---|------|
| 1 | **live mode** |
| 2 | **Checkout URL 全文を貼りそう／貼した** |
| 3 | **price id・secret を出しそう** |
| 4 | **決済画面で支払いを完了させようとする** |
| 5 | **実 Webhook fulfillment** まで進もうとする |
| 6 | **意図しない DB 更新** |
| 7 | **商品棚 UI** に経路を出す |
| 8 | **Vercel env** を変更する |
| 9 | **`app/api/purchase/checkout`（DTR）や oneTime を改変**する |

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本ゲート文書の作成** | **GO** |
| **Checkout Session creation の実実行** | **別承認** |
| **支払い完了** | **NO-GO** |
| **実 Webhook** | **NO-GO** |
| **DB 更新 smoke** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 実施後の結果 SSOT（任意）

`M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md` に **§4 のフィールドのみ**を記載する。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。API・コード・SQL（更新を伴う処理）・DB 変更・Dashboard/env 変更・**秘密および URL/session 実列の転記**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_GATE_v1*
