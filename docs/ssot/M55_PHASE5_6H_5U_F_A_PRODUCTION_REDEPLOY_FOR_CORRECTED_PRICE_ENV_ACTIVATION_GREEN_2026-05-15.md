# Phase 5‑6H‑5U‑F‑A — Production redeploy for corrected price env activation GREEN checkpoint (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑F‑A — Production redeploy for corrected price env activation GREEN checkpoint**

---

## 2. 現在地

- **`5U‑E‑A`：** **`VERCEL_PRICE_ENV_OVERWRITE_EVIDENCE_RECORDED`**（**`STRIPE_PRICE_DTR_CORE_STATIC_V1`** corrected、redacted **`price_****U3hF`**）
- **`5U‑F`：** 以前 **`PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_BLOCKED`**（repo が redeploy を同時証跡できず）
- **Human が Vercel UI にて：** corrected `env` 反映後に Production **redeploy を 1 回のみ**実行
- **Production deployment：** **Ready／Latest**（人手観測）
- **Checkout 再試行：** **未実行**
- **live payment：** **未実行**

---

## 3. Human Vercel UI redeploy observation

- **Project：** **`m55-webv2`**
- **Deployment（表示／ID、redacted）：** **`2w7o55HBG…`**
- **Status：** **Ready** / **Latest**
- **Environment：** **Production**
- **Branch：** **`main`**
- **Source commit（観測）：** **`a38918`** — `chore(audit): refresh repo asset index`
- **Domains observed：**
  - **`m55-web.vercel.app`**
  - **`m55-webv2-git-main-m55-official.vercel.app`**
  - **`m55-webv2-78f7sbp-m55-official.vercel.app`**
- **Duration observed：** **約 1m15s**
- **Full Price ID：** **記録しない。** **redacted のみ：** **`price_****U3hF`**

---

## 4. 判定

**`PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_GREEN`**

---

## 5. 重要な制限

- **本条は：** **corrected `STRIPE_PRICE_DTR_CORE_STATIC_V1`** を読み込む **新規 Production deployment** が **Ready／Latest** になったという **人手観測**に限定する。
- **Checkout が成功すること／本番決済が成立することを意味しない。**
- **Checkout 再試行は Phase 5‑6H‑5U‑G（controlled retry）。**
- **Live payment** は **さらに後続 Gate**。

---

## 6. 本条での未実行事項

- No checkout retry
- No purchase button click
- No live payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No env／`whsec`／secret additional changes
- No Supabase changes
- No Vercel 設定の追加変更（**本条は redeploy 1 回の記録のみ**）
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No full Price ID recorded
- **No additional redeploy** beyond the **one** human redeploy

---

## 7. Next

- **Phase 5‑6H‑5U‑G — Checkout creation controlled retry after corrected env redeploy**
- **`5U‑G`：** **購入ボタン 1 回**で **`checkout.stripe.com` 到達**のみ確認。** **支払い完了禁止。**

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5U‑F`（BLOCKED 記録）：** commit **`a2bda197b6777346f4c918564e8d91992e7c6f8a`** — `docs: record redeploy for corrected price env activation`
- **Vercel Project：** **`m55-webv2`**
