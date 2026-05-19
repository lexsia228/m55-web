# Phase 5‑6H‑5T — Production redeploy for env activation planning／execution gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5T — Production redeploy for env activation planning／execution gate**

---

## 2. 現在地

- **`5S‑A`：** **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`**（SSOT 参照。Work anchor commit **`0785595292774e419b2d30230112a2c35be9497f`**）。
- **`STRIPE_PRICE_DTR_CORE_STATIC_V1`：** **Production および Preview に存在**（`5S‑A` の人手観測と整合）。
- **redacted Price ID（参照のみ）：** **`price_****U3hF`。**
- **フル Price ID：** **未記録のまま**。
- **Vercel UI 注記：** **a new deployment is needed for changes to take effect**（→ 本条が扱う **redeploy**）。
- **Checkout 再試行：** **未実行**。
- **live payment：** **未実行**。

**Vercel Project：** **`m55-webv2`**  
**Production branch（アンカー）：** **`main`**  
**deployment 語彙：** env 反映前の Production deployment は **previous Ready／Current** の系譜として扱う（UI 文言に依存）。

---

## 3. 実行範囲

- **Production redeploy のみ**を本条の対象とする（Human が Vercel **Deployments** から **最新 Production** に対し **Redeploy を 1 回だけ**実施する手順）。
- **Checkout 再試行：** **しない。**
- **購入ボタン押下：** **しない。**
- **本番決済：** **しない。**
- **webhook／`env`／`whsec`／secret の追加変更：** **しない。**
- **DB 変更：** **しない。**

---

## 4. Redeploy 結果（本条コミット時点）

**`repo` および本コミットは、Vercel 上で redeploy が完了したかを証明しない。** Human が UI で実行した結果は **別証跡**で **`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_GREEN`** を確定させる。

- **Redeploy executed（本条の証跡）：** **no**（**本条はゲートと手順の固定**；実行は Human／Vercel UI 側）。
- **status：** **Unknown**（本条コミット時点）。
- **reason（可視なら追記対象）：** **Deployment の Ready／Current、ログ、deployment id はフル値を SSOT に載せず、必要なら redact して別途記録する。**
- **no retry policy：** 失敗時は **再試行せず** **`BLOCKED`** として記録し、**人間が原因切り分け後にのみ**次の明示 GO で再開する。

---

## 5. 判定

**`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_BLOCKED`**

（**env 活性化のための Production redeploy 完了を本条では未確定**。**Human が 1 回の redeploy を完了し Ready／Current を確認できた場合**に **`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_GREEN`** へ。）

---

## 6. 重要な制限

- **本条の redeploy は、新しい Production deployment に `env` を読み込ませるための活性化**にすぎない。
- **Checkout が成功する、または本番決済が成立することを意味しない。**
- **Checkout 再試行は 5U（別 Gate）。**
- **live payment** は **さらに後続の明示 Gate**。

---

## 7. 本条での未実行事項

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

---

## 8. Next

- **`PRODUCTION_REDEPLOY_FOR_ENV_ACTIVATION_GREEN`** 確定後：**Phase 5‑6H‑5U — Checkout creation controlled gate**
- **`5U`：** **購入ボタン押下**または **Checkout Session 作成の確認**を **controlled** に行う。**本番決済はまだ行わない。** **Stripe Checkout 画面到達まで**を **別 Gate** として扱う。

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5S‑A`（直前 GREEN）：** commit **`0785595292774e419b2d30230112a2c35be9497f`** — `docs: record vercel production price env addition green`
- **Vercel Project：** **`m55-webv2`**
