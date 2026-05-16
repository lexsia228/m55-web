# Phase 5‑6H‑5Q — Production Stripe price env configuration planning gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5Q — Production Stripe price env configuration planning gate**

---

## 2. 現在地（証跡の前提）

- **`5P‑A`：** **`PRODUCTION_CHECKOUT_PRICE_ENV_BLOCKED_FINDING_RECORDED`**（直近 SSOT：**`53097e9eed08eaf07a0dc4aa5a36a482730c7fba`**）。
- Production **製品／レポート相当ページは到達可能**のまま。**購入相当のクリックは 5‑6H‑5P‑A（`5P‑A`）フェーズで一度だけ実施済み**（本条でも再試行しない）。
- **Checkout 作成成功は確認しない。** **Live payment は実行しない。** **`env`／webhook／secret／`whsec`／DB は本条・本コミットで変更しない。**

対象環境のアンカー:

- **Vercel Project（運用上の主アンカー）:** **`m55-webv2`**
- **Production domains:** **`https://m55-web.vercel.app`**、**`https://m55-webv2.vercel.app`**

---

## 3. 問題（blocked 原因の固定）

**Missing environment variable name（値は記載しない）:**

- **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**

**Observed app error（`5P‑A` 記録と同一）:**

```
Product DTR_CORE_STATIC_V1 is not configured (missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1)
```

---

## 4. 想定される必要作業（計画のみ。**本条では実施しない**）

- **Stripe Dashboard** で **`DTR Core Static V1`** に相当する SKU（前提 **¥1,000 / `JPY`**）の **`Price`** ID を **人間**が確認する（次 Gate **`5R`**）。
- **`m55-webv2`** の **Production Environment Variables** に **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** が **未定義の可能性が高い**。**`5P‑A` のメッセージ**と整合する。値は一般に **`price_`** で始まる形式とみなすが、**本 SSOT にはフル値を載せない**。
- **`env` 代入後は Production で redeploy が要る場合がある**。**本条・本コミットでは redeploy をしない**（後続 **`5T`** など）。
- **`Checkout` 再試行・購入ボタン再試行も、`5Q` においてしない。**

**repo 読取のみ**で参照してよい例（本条ではコード・値の変更しない）:

- `lib/oneTimeCheckout.ts` — **`DTR_CORE_STATIC_V1`**
- `components/PurchaseButton.tsx` — product → **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** の対応コメント／マップ
- `app/api/purchase/checkout/route.ts` — Checkout Session 経路および price env の解決
- 既存 SSOT：`M55_PURCHASE_FLOW_SPLIT.md`、`M55_PHASE5_6A_...` 等

---

## 5. Secret / value の扱い（厳守）

- **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** の **フル値（例：`price_` の末尾を含む完全文字列）は** AI／Cursor／SSOT に**出さない。**
- 記録できるのは **`price_****`** のような **redacted**、または **末尾 4 桁程度**のみ（運用側裁量）。
- **`whsec`／`sk_live`／その他 secret／Clerk／`Supabase` service role／`DATABASE_URL`** は **`5Q`・`5R` の SSOT で扱わない。**

---

## 6. `5R` 以降の分離案（境界のメモのみ。本条は実行しない）

| Gate | 概要 |
|------|------|
| **`5R`** — Stripe Price ID human confirmation | Dashboard で確認。フル値は貼らない。 |
| **`5S`** — Vercel Production env の追加 | 人間が UI で代入。**追加直後も Checkout は再試行しない**。 |
| **`5T`** — Production redeploy | `env` 反映が必要な場合の別明示 Gate。 |
| **`5U`** — Checkout dry / controlled | session 確認まで。**決済 GO は別**。 |
| **`5V`** — Live payment | 返金／events／DB entitlement／rollback を専用 SSOT で確定後。 |

本条 **`5Q` は上表を実行しない。**

---

## 7. 本条 **`5Q` での未実行事項**

- No env / `whsec` / secret changes
- No Vercel setting changes
- No Stripe Dashboard **設定変更**
- No Stripe webhook changes / replay
- No Checkout retry / no purchase button click
- No live payment
- No Supabase changes
- No additional redeploy
- No runtime / code / UI changes
- No Production DB changes
- No **`POST`** / **`PUT`** / **`PATCH`** / **`DELETE`**
- No **`/api/stripe/*`** direct execution

---

## 8. 判定（本条）

**`READY_FOR_PRODUCTION_STRIPE_PRICE_ID_HUMAN_CONFIRMATION_GATE`**

Stripe Price ID の人間確認および Vercel `env` 追加は、**本コミット後の別明示 GO** と **`5R` 以降**の順のみで進める。

---

## 9. Next

- **Phase 5‑6H‑5R — Production Stripe Price ID human confirmation gate**
- **`5R` でもフル値を AI／Cursor に出さない。** redacted／末尾桁のみの証跡で進める。

---

## Work anchor

- Branch: **`work/home-cluster`**
- Prior SSOT commit: **`53097e9eed08eaf07a0dc4aa5a36a482730c7fba`** — `docs: record production checkout price env blocked finding`
- Blocking env name: **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**
