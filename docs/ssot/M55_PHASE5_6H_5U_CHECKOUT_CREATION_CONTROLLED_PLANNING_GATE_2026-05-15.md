# Phase 5‑6H‑5U — Checkout creation controlled planning gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U — Checkout creation controlled planning gate**

---

## 2. 現在地

- **`5S‑A`：** **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`**（**`STRIPE_PRICE_DTR_CORE_STATIC_V1`** Production／Preview）。
- **`5T‑A`：** **`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_GREEN`**（Production deployment **Ready／Current**、`main`、source **`a38918`** 系を `5T‑A` で記録）。
- **現在の Production deployment は、`5T‑A` 時点の redeploy により **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** を読み込める状態とみなせる前提**（**Checkout 作成による検証は未実施**）。
- **過去の blocker（例）：** `Product DTR_CORE_STATIC_V1 is not configured (missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1)` — **`5S‑A`／`5T‑A` 後は解消が期待されるが、本条では未検証**。
- **redacted Price ID（参照のみ）：** **`price_****U3hF`。フル値は記録しない。**
- **redeploy 後の Checkout 再試行：** **未実行。**
- **live payment：** **未実行。**

---

## 3. この Gate（5U）の目的

**次フェーズ（`5U‑A`）で、Production 上の **1 回限りの購入ボタン操作**により **Stripe Checkout Session が作成され、`checkout.stripe.com` に到達するか**を **controlled** に確認するための **planning のみ**を固定する。  
**本条（`5U`）では、購入ボタン押下・Checkout 作成・本番決済は一切行わない。**

---

## 4. 次フェーズ（**`5U‑A`**）で許可予定の操作

- **Production ドメイン**（例：**`m55-web.vercel.app`**）で **`/dtr/lp`** または該当商品導線へ移動する。
- **ログインが必要なら、人間がログインする**（資格情報は AI／SSOT に出さない）。
- **購入ボタンを 1 回だけ**押す（**連打禁止**）。
- **`checkout.stripe.com` に到達**したら **成功候補**として記録する。
- **Stripe Checkout 画面では支払い情報を入力しない**（カード／ウォレット実決済操作禁止）。
- **決済を完了させない。**
- **到達後はブラウザバックまたはタブを閉じる。**
- **可能なら** Stripe Dashboard で Checkout Session が **created／open** 等と読めることを **redacted** で確認（**Session ID／PI／customer／email／client_reference のフル値は記録しない**）。

---

## 5. 次フェーズ（**`5U‑A`**）でも禁止する操作

- **支払い完了、カード等の入力、Apple Pay／Google Pay／Shop Pay／PayPay 等の実決済操作。**
- **webhook replay。**
- **`env`／`whsec`／secret の変更。**
- **Stripe 設定変更。**
- **Supabase／Production DB の意図的変更。**
- **`/api/stripe/*` の直接実行**（ブラウザからのアプリ導線以外での API 叩き）。
- **購入ボタン連打。**
- **失敗時の即コード修正・即設定変更（別 Gate）。**
- **追加 redeploy。**

---

## 6. 成功条件（案・`5U‑A` 記録用）

- **購入ボタン 1 回**で **`missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1`** が**再発しない**（別の 4xx は状況記録）。
- **`checkout.stripe.com` に到達**する。
- **Checkout Session が作成されたと推定できる**（Dashboard redacted または URL 到達）。
- **支払いは未完了**、**本番としての決済確定は発生していない**。
- **webhook 経由の fulfillment／entitlement 付与は、支払い未完了なら発生しない／期待しない。**
- **`env`／webhook／DB に手を加えていない。**

---

## 7. 失敗時の停止条件（案）

- **`missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1` が再発**する。
- **アプリが 4xx／5xx** で Checkout 作成に至らない。
- **`checkout.stripe.com` へ遷移しない。**
- **想定外に「決済完了」系の画面や entitlement 付与が疑われる。**
- **1 回では再現できず、追加クリックが必要と判断した場合（連打に進まず停止）。**

---

## 8. 証跡ルール

- **スクリーンショット可**（**Session／PI／個人識別子が写る場合はマスクまたは撮影しない**）。
- **Checkout Session ID／Payment Intent ID／customer／email／client_reference_id のフル値は SSOT に書かない。**
- **Stripe Price ID は引き続き redacted のみ：** **`price_****U3hF`。**
- **secret／`whsec`／`sk_live` 等のフル値は扱わない。**

---

## 9. 判定（本条 5U）

**`READY_FOR_CHECKOUT_CREATION_CONTROLLED_EXECUTION_GATE`**

**購入ボタン押下／Checkout Session 作成の実作業は、本条コミット後の別明示 GO かつ Phase `5U‑A` のみで実施する。**

---

## 10. 本条（**`5U`**）での未実行事項

- No purchase button click in **5U**
- No checkout retry in **5U**
- No checkout session creation verification in **5U**（実行フェーズは **`5U‑A`**）
- No live payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No env／`whsec`／secret changes
- No Supabase changes
- No Vercel setting changes
- No additional redeploy
- No runtime／code／UI changes
- No Production DB changes
- No manual `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No full Price ID recorded

---

## 11. Next

- **Phase 5‑6H‑5U‑A — Checkout creation controlled execution**
- **`5U‑A`：** **購入ボタンを 1 回だけ**押し、**`checkout.stripe.com` 到達**のみを確認する。** **支払い完了は禁止。** **live payment** は **さらに後続の別 Gate**。

---

## Repo reference（read-only・本条では変更なし）

アプリ実装の参照用（**コード変更は本条禁止**）。

| 項目 | 参照 |
|------|------|
| **購入 UI** | `components/PurchaseButton.tsx` — `productId` を `POST /api/purchase/checkout` に送付 |
| **product → env** | **`DTR_CORE_STATIC_V1` → `STRIPE_PRICE_DTR_CORE_STATIC_V1`**（`PRODUCT_ID_TO_ENV`） |
| **Checkout API** | `app/api/purchase/checkout/route.ts` — `priceId` 欠落時 **400**、`Product … is not configured (missing env: …)` |
| **Session URLs** | `success_url`: **`{origin}/dtr/processing?session_id={CHECKOUT_SESSION_ID}`**、`cancel_url`: **`{origin}/dtr/lp?checkout=cancelled`** |
| **定数** | `lib/oneTimeCheckout.ts` — **`DTR_CORE_STATIC_V1`** |

**注意：** **未ログインは 401**（クライアントはログイン導線）。**既に購入済み等は 409** となり Stripe へ行かない経路があり得る — **`5U‑A` はアカウント状態を事前に人間が把握する。**

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5T‑A`（直前 GREEN）：** commit **`c5dc8c3b18cb6437dbb4c5883336717b1f512240`** — `docs: record production redeploy env activation green`
- **Vercel Project：** **`m55-webv2`**
