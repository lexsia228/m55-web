# M55 追加相談返書 — Stage B Checkout API validation（支払いなし）ゲート（v1）

**文書種別:** `POST /api/reply-tickets/checkout` を **Stripe Checkout 成功前**までで検証するためのゲート SSOT  
**バージョン:** v1  
**前提:** Stage A pass — [`M55_REPLY_TICKET_STAGE_A_STATIC_VERIFICATION_RESULT_v1.md`](./M55_REPLY_TICKET_STAGE_A_STATIC_VERIFICATION_RESULT_v1.md)  
**上位ゲート:** [`M55_REPLY_TICKET_DRY_RUN_TEST_MODE_SMOKE_GATE_v1.md`](./M55_REPLY_TICKET_DRY_RUN_TEST_MODE_SMOKE_GATE_v1.md) の **Stage B**

---

## 1. Stage B の目的

- **`POST /api/reply-tickets/checkout`** に対する **HTTP レイヤーおよびサーバー側 validation / ゲート**を確認する。
- **支払いを発生させない**（ユーザーが Stripe の支払い画面に進んだり、決済が成立したりしないことを前提）。
- **DB を更新しない**（当 API は gate 成功後にのみ Session 作成を試みるため、**到達させない構成**または **env により実呼び出し前に失敗**させる）。
- **Stripe Checkout Session の作成成功**までは **原則到達しない**（本ゲートの意図は **validation と fail-closed** の確認）。
- **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` 未設定**の環境では、**安全に上位ロジックに進まずエラーになる**ことを確認できる（コード上は `stripe_error` + **503** 系）。

---

## 2. 確認候補（期待レスポンスの目安）

実装準拠の整理（`/api/reply-tickets/checkout` + `replyTicketCheckoutValidate`）。**本文に secret を書かない。**

| シナリオ | 期待 code（または意味） | HTTP 目安 |
|----------|-------------------------|-----------|
| 未ログイン | `unauthenticated` | **401** |
| JSON 不正・空オブジェクト等 | `invalid_request` | **422** |
| `report_instance_id` 欠損・空 | `invalid_request` | **422** |
| `product_key` 欠損・空 | `invalid_request` | **422** |
| `product_key` が `additional_reply_ticket` と一致しない | `invalid_product` | **422** |
| スナップショット所有権なし | `forbidden_not_owner` | **403** |
| wallet 行なし | `wallet_not_found` | **404** |
| wallet 非 active | `wallet_not_active` | **422** |
| キャップ到達 | `cap_reached` | **422** |
| `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` 未設定（trim 後も空） | `stripe_error`（メッセージに env **名のみ**、アプリが返す説明文の範囲） | **503** |

**禁止:** レスポンス本文・ログ・SSOT に **Stripe secret・Clerk/JWT の実値・cookie 実体・DB URL・service role** を転記しない。

---

## 3. 実施方法

- **ローカル**または**安全な非公開**デプロイ上で実行する。**live 本番ユーザーへの実課金**はしない。
- 可能なら **`curl` / Postman 相当**で HTTP を送る。**認証必須**のケースは **ブラウザでログインしたセッションに相当するヘッダ**が必要になり得る — 手順内で役割のみ説明し、**実トークンをチャットや SSOT に貼らない**。
- **成功する Checkout URL は意図的に作らない** — すべてのケースで **Stripe `checkout.sessions.create` が呼ばれない／呼ばれる前に失敗**する組み合わせを優先する（例: 未ログイン、body だけ不正、`STRIPE_PRICE_*` を外したローカル、ゲート NG など）。
- **Stripe API をこのゲート文書だけで自動実行しない** — 人手の許可がある場合でも **別手順書**とし、**Dashboard / env 変更はしない**。

---

## 4. DB 確認

- Stage B は **DB 更新なし**を正とする。
- **`stripe_processed_events` / `reply_ticket_wallets` / `reply_wallet_ledgers`** は **カウント・値が変化しない**ことを、実施環境が追跡できるなら **実施前後で確認**（任意）。
- **Checkout Session を成功させない**方針であれば、**Stripe 側にも決済オブジェクトが増えない**（運用上の確認は test mode での環境のみに限定）。

---

## 5. STOP 条件

以下に該当したら **中断**する。

- **live 決済**に進む、またはユーザーに実請求が発生し得る操作
- **Stripe Dashboard** または **環境変数・シークレットストアを本ゲートに紐づけて変更**する（**変更しない**）
- **secret / cookie / bearer token / Webhook signing secret** を**ログ・チャット・SSOT・スクリーンショット共有**する
- **商品棚 UI** で当該フローを露出・公開変更する
- **実 Webhook を発火**し、または **wallet / ledger / processed_events** が**変わるイベント**まで進める
- **`app/api/purchase/checkout`（DTR checkout route）や oneTime／DTR fulfillment の改変**

---

## 6. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本ゲート文書の作成** | **GO** |
| **Stage B の実施** | **別承認** |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |
| **商品棚 UI / Dashboard·env のための変更** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL・DB 更新・Stripe API の実行・Dashboard / env 変更・**secret/cookie/token の出力**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_GATE_v1*
