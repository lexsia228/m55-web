# Phase 5‑6H‑5U‑B — Checkout creation controlled human attempt price-not-found blocked finding (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑B — Checkout creation controlled human attempt price-not-found blocked finding**

---

## 2. 現在地

- **`5S‑A`：** **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`**
- **`5T‑A`：** **`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_GREEN`**
- **`5U`（planning）：** **`READY_FOR_CHECKOUT_CREATION_CONTROLLED_EXECUTION_GATE`**
- **`5U‑A`：** **`CHECKOUT_CREATION_CONTROLLED_EXECUTION_BLOCKED`**（**repo／Cursor は Human の Production 試行を当時証明できず**）
- **Human が Production（**`https://m55-webv2.vercel.app`**）で購入ボタンを **1 回**試行**
- **`checkout.stripe.com` 未到達**

---

## 3. Human observation

- **Production domain：** **`https://m55-webv2.vercel.app`**
- **Purchase button clicked：** **once**（**再押下なし**）
- **`missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1`：** **再発しなかった**（従来の missing env 系エラーではない）
- **観測された表示（Stripe 系・人手）：** **`No such price`**／**`price_****U3hF`** 相当の文言（**末尾 redact との整合；フル文字列は UI に一時表示されても SSOT には書かない**）
- **checkout.stripe.com reached：** **no**
- **Checkout ページ表示（Stripe ホスト）：** **no**
- **Payment completed：** **no**
- **スクリーンショット：** **フル Price ID が写っていても、意図的に SSOT／repo へ転記しない**（**画像ファイルはコミットしない**）

---

## 4. Interpretation（本条 — 修正ランプではない）

- **Production deployment は `STRIPE_PRICE_DTR_CORE_STATIC_V1` の値を読み込んで Stripe API に渡している**ように読める（**エラーが missing env から Stripe の price lookup 失敗へ変化**）。
- **現在の blocker は、おそらく** Stripe **Price ID とアカウント／モードの不一致**、**誤った Price ID 値**、または **Production が用いる `STRIPE_SECRET_KEY` から当該 Price が見えない**等の **診断領域**（**本条では確定しない**）。
- **Checkout 作成が成功することを証明しない。**
- **本番決済が成立することを証明しない。**
- **診断ゲート（`5U‑C`）の計画・明示 GO があるまで、購入・Checkout 再試行はしない。**

---

## 5. 判定

**`CHECKOUT_CREATION_CONTROLLED_PRICE_NOT_FOUND_BLOCKED`**

---

## 6. Redaction policy

- **Full Price ID：** **記録しない。**
- **スクリーンショットの repo 同梱：** **しない。**
- **Full Checkout Session／Payment Intent／customer／email／client_reference：** **記録しない。**
- **secret／`whsec`／`sk_live` 等：** **記録しない。**
- **redacted のみ：** **`price_****U3hF`**

---

## 7. 本条での未実行事項

- No `checkout.stripe.com` arrival
- No payment completion
- No card／payment wallet execution
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
- No **`/api/stripe/*`** direct execution
- No full IDs recorded
- **No second purchase button click / no checkout retry**

---

## 8. Next

- **Phase 5‑6H‑5U‑C — Stripe Price ID／account／mode mismatch diagnostic planning gate**
- **`5U‑C`：** **まず docs-only。** **secret を晒さず**に、少なくとも次を人手で照合する設計とする：
  - **Vercel Production の `STRIPE_SECRET_KEY` が、当該 Price が存在する Stripe アカウント（または期待するアカウント）と整合するか**
  - **Stripe モードが Live であること**
  - **Price が active であること**
  - **`STRIPE_PRICE_DTR_CORE_STATIC_V1` に入れた値が Live Price ID と **完全一致**（誤字・切り捨てなし）か**
- **証跡は redacted のみ。フル ID／secret は SSOT に書かない。**

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5U‑A`：** commit **`2f7ceb4f14e2d6a4a27105180f73e160f0d28649`** — `docs: record checkout creation controlled execution`
- **Env key（論理名）：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**
