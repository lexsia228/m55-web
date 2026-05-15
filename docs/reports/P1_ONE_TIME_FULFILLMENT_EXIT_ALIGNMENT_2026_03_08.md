# P1 One-Time Fulfillment 出口整合 実装レポート (2026-03-08)

**正本:** post_purchase_alignment_ssot_2026_03_08  
**状態:** CONDITIONAL GREEN（完全適合）

---

## 1. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `docs/ssot/post_purchase_alignment_ssot_2026_03_08.md` | 正本 SSOT |
| `lib/oneTimeCheckout.ts` | **新規** one-time lane 定数（ALLOWED_ONE_TIME_PRODUCTS, DTR_CORE_STATIC_V1）|
| `app/api/purchase/checkout/route.ts` | success_url に session_id 付与、**payment_intent_data.description**（receipt-facing）追加 |
| `app/purchase/success/page.tsx` | Session 再取得・one-time lane 検証、entitlement 分岐、recoveryRef 表示 |
| `app/purchase/success/success.module.css` | supportLink スタイル |
| `components/QuietPolling.tsx` | Reflect Report 軸 copy |

---

## 2. Success Page の最終分岐条件

| 条件 | 表示 |
|------|------|
| entitlement 反映済み（status=active） | redirect → `/dtr/core?post_purchase=1`（happy path）|
| entitlement 未反映 **かつ** session_id あり **かつ** Session 検証成功（mode=payment, client_reference_id=userId, productId in ALLOWED） | delayed access: Reflect Report copy + QuietPolling + **recoveryRef（session_id）** + support URL |
| entitlement 未反映 **かつ** session_id なし | delayed access: 同上（recoveryRef なし）|
| entitlement 未反映 **かつ** session_id あり **かつ** Session 検証失敗 | 「セッションを確認できませんでした。サポートまでお問い合わせください。」+ support URL |
| エラー（DB 取得失敗・設定エラー） | エラー文言 + support URL |

**Session 検証:** `stripe.checkout.sessions.retrieve(session_id)` で mode=payment、client_reference_id=userId、metadata.productId ∈ ALLOWED_ONE_TIME_PRODUCTS を確認。

---

## 3. Receipt-facing wording の実反映箇所

| 種別 | ファイル | 箇所 | 文言・設定 |
|------|----------|------|------------|
| **Stripe receipt-facing** | `app/api/purchase/checkout/route.ts` | `payment_intent_data.description` | `'Reflect Report'`（Stripe レシート・メール・カスタマーポータル等に表示）|
| Success page | `app/purchase/success/page.tsx` | タイトル | 「Reflect Report をご購入いただきありがとうございます」|
| Success page | `app/purchase/success/page.tsx` | 本文（delayed） | 「決済を確認しています。Reflect Report の権限反映まで少々お待ちください。」|
| QuietPolling | `components/QuietPolling.tsx` | polling 中 | 「Reflect Report の権限反映を確認しています…」|
| QuietPolling | `components/QuietPolling.tsx` | max 到達後 | 「Reflect Report の反映に少し時間が必要な場合があります。」|

**statement descriptor は別管理。** Stripe Dashboard または payment_intent_data.statement_descriptor で審査中 M55-aligned を維持。receipt-facing（description）とは混同しない。

---

## 4. 未解決点一覧

| # | 内容 |
|---|------|
| 1 | `getSupportUrl()` が env 未設定かつ headers も取得できない場合、`/support` 相対 URL に fallback。本番では `APP_ORIGIN` または `NEXT_PUBLIC_APP_URL` 設定を推奨。 |
| 2 | **client_reference_id=userId** の未ログイン・セッション切れ・アカウント切替時挙動は未検証。 |
| 3 | webhook の `ALLOWED_ONE_TIME_PRODUCTS` は `lib/oneTimeCheckout.ts` と重複 → **Backlog**: shared import 化 |

---

## 5. TC-02〜TC-07 evidence 取得への影響有無

| TC | 影響 | 理由 |
|----|------|------|
| TC-02〜TC-07 | **影響なし** | webhook 実装は変更なし。success page は READ のみ。fulfillment truth-source は webhook。 |
