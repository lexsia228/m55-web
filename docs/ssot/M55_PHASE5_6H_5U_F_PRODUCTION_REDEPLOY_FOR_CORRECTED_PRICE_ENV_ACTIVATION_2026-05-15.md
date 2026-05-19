# Phase 5‑6H‑5U‑F — Production redeploy for corrected price env activation gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑F — Production redeploy for corrected price env activation gate**

---

## 2. 現在地

- **`5U‑B`：** **`CHECKOUT_CREATION_CONTROLLED_PRICE_NOT_FOUND_BLOCKED`**
- **`5U‑D`：** **`STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_INCONCLUSIVE`**
- **`5U‑E‑A`：** **`VERCEL_PRICE_ENV_OVERWRITE_EVIDENCE_RECORDED`** — Human が **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** を **Production／Preview** に上書き（redacted **`price_****U3hF`**）。**フル Price ID は記録しない。**
- **現行 Production deployment が corrected 値を読み込んでいることは、本条コミットでは未証明。**
- **`5U‑E‑A` 後：** **Checkout 再試行なし、本番決済なし。**

---

## 3. 実行範囲

- **`m55-webv2`** で **Production 向け redeploy を 1 回だけ**（連打禁止）。
- **Checkout 再試行：** **禁止。**
- **購入ボタン：** **禁止。**
- **本番決済：** **禁止。**
- **`env`／`whsec`／secret／webhook／DB：** **変更しない（追加変更なし）。**

---

## 4. Redeploy 結果（本条コミット）

**本コミットは Cursor／repo から Production redeploy の完了を証明しない。** Human が Deployments で **Production を 1 回 redeploy** し **Ready／Current** を確認したら §4 を別コミットで更新し **`PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_GREEN`** を確定する。

**採用（本条 — BLOCKED 分岐）：**

- **Redeploy executed：** **本コミットでは確認できない**（**repo が Vercel 操作を証明しない**）。
- **status：** **Unknown**
- **reason：** Planning／証跡枠のみ先固定。**Human が UI で 1 回実行した結果を載せていない**。
- **retry：** **しない**（失敗時は停止し **別 Gate**）。
- **Branch（期待）：** **`main`**（人手確認）。
- **Deployment id／ソース commit：** **フル値は SSOT に書かない**。必要時 **redacted** のみ別証跡。

**GREEN 確定時の記録テンプレ（人手）：**

- Redeploy **once**、Production **Ready**、**Current**、**`main`**、corrected **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** の **deployment への読み込みを前提として活性化記録**

---

## 5. 判定

**`PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_BLOCKED`**

（**本条はゲート計画であり、Human の redeploy 完了を同時証跡としない**。）

---

## 6. 重要な制限

- **本条の redeploy は、corrected `env` を新しい Production deployment に載せるためのもの**。
- **Checkout 成立や本番決済を証明しない。**
- **Checkout 再試行は Phase 5‑6H‑5U‑G（controlled retry）** と分離。**支払い完了は禁止**。
- **live payment** はさらに後続 Gate。

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
- No Vercel 設定の **追加変更**（**redeploy は Human の単発操作のみ**）。
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No redeploy を **連続実行**
- No full Price ID recorded

---

## 8. Next

- **`PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_GREEN`** 確定後：**Phase 5‑6H‑5U‑G — Checkout creation controlled retry after corrected env redeploy**
- **`5U‑G`：** **購入ボタン 1 回**で **`checkout.stripe.com` 到達**のみ確認。** **支払い完了禁止。**

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5U‑E‑A`：** commit **`12f33785cfaa047b8ac8c611ba079969d9fa827a`** — `docs: record vercel price env overwrite evidence`
- **Vercel Project：** **`m55-webv2`**
