# Phase 5‑6H‑5T‑A — Production redeploy for env activation GREEN checkpoint (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5T‑A — Production redeploy for env activation GREEN checkpoint**

---

## 2. 現在地

- **`5S‑A`：** **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`**（**`STRIPE_PRICE_DTR_CORE_STATIC_V1`** の **Production／Preview** 存在を人手確認済み）。
- **`5T`：** 以前 **`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_BLOCKED`**（repo／Cursor が redeploy 完了を証明できず／Human の UI 証跡待ち）。
- **Human が Vercel UI にて：** **Production 向け redeploy を 1 回のみ**実行し、観測した deployment が **Ready／Current（表記は Ready／Latest を含む）** と読める。
- **Production deployment is：** **Ready** と人手で読め、**Current**／**Production** として扱える。
- **Checkout 再試行：** **未実行。**
- **live payment：** **未実行。**

**Env 活性化の対象キー：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**（**redacted 参照：** **`price_****U3hF`**。**フル Price ID は未記録。**）

---

## 3. Human Vercel UI redeploy observation

- **Project：** **`m55-webv2`**
- **Deployment（表示／ID、redacted）：** **`6yVT8BHC…`**
- **Status：** **Ready** / **Latest**（UI 表記）
- **Environment：** **Production** / **Current**
- **Branch：** **`main`**
- **Source commit（観測）：** **`a38918`** — `chore(audit): refresh repo asset index`
- **Domains observed：**
  - **`m55-web.vercel.app`**
  - **`m55-webv2-git-main-m55-official.vercel.app`**
  - **`m55-webv2-hkb8ex9ob-m55-official.vercel.app`**
- **Duration observed：** **約 1m10s**
- **Build logs（提示断片）：** **warnings のみ**／**致死エラーは提示範囲では見えない**

---

## 4. 判定

**`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_GREEN`**

---

## 5. 重要な制限

- **本条は：** **`5S‑A`** で追加された **`env`** を **新しい Production deployment に読み込ませる**ための **redeploy が Ready／Current になった**ことの **人手観測の記録**にすぎない。
- **Checkout が成立すること、または本番決済が成立することを意味しない。**
- **Checkout 再試行は 5U（別 Gate）。**
- **Live payment** は **さらに後続の明示 Gate**。

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
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No full Price ID recorded
- **No additional redeploy** after the **one** human redeploy recorded above

---

## 7. Next

- **Phase 5‑6H‑5U — Checkout creation controlled gate**
- **`5U`：** **購入導線から Stripe Checkout Session が作成され、`checkout.stripe.com` に到達できるか**を **controlled** に確認する。** **本番決済の完了は禁止**（支払い完了はさらに後続 Gate）。
- **Live payment** は **別途分離**。

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5T`（planning／BLOCKED 記録）：** commit **`16cb70c270c6d5f0e4d333185023790722f21ec5`** — `docs: record production redeploy for env activation`
- **Vercel Project：** **`m55-webv2`**
