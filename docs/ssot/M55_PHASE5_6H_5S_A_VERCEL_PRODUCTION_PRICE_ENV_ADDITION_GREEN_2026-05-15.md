# Phase 5‑6H‑5S‑A — Vercel Production price env addition human confirmation GREEN checkpoint (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5S‑A — Vercel Production price env addition human confirmation GREEN checkpoint**

---

## 2. 現在地

- **`5R`** **Price ID human confirmation：** **`PRODUCTION_STRIPE_PRICE_ID_HUMAN_CONFIRMATION_GREEN`**（SSOT 参照）。
- **`5S`：** 以前 **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_BLOCKED`**（**repo／Cursor 単体では Production への `env` 追加を検証できない**ため）。
- **Human が Vercel UI にて：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** が **Production および Preview** に **表示されている**ことを **人手で確認**（本条の証跡）。
- **フル Price ID：** **未記録のまま**（本条でも記録しない）。
- **redeploy：** **未実行**。
- **Checkout 再試行：** **未実行**。
- **live payment：** **未実行**。

---

## 3. Human UI observation

- **Vercel Project：** **`m55-webv2`**
- **Key：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**
- **Environment 表示：** **Production および Preview**（同一キーが両環境に紐づいている旨の UI 観測）。
- **Toast／メッセージ：** **environment variable updated successfully**（成功トースト相当の文言を人間が観測）。
- **Vercel UI 注記：** **a new deployment is needed for changes to take effect**（新規 deployment が要る旨の表示を観測）。
- **redacted value reference：** **`price_****U3hF`**（**末尾 redact のみ**）。
- **フル値：** **記録せず、AI／Cursor／SSOT に転記していない。**

---

## 4. 判定

**`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`**

---

## 5. 重要な制限

- **本条は、Vercel UI 上で `STRIPE_PRICE_DTR_CORE_STATIC_V1` が Production／Preview に存在する**ことだけを人手観測として確定する。
- **現行の Production deployment が新しい `env` を読み込んでいることは意味しない**（Vercel の注記どおり **redeploy／新 deployment** が別途必要になり得る）。
- **Checkout 再試行は 5S‑A では行わない。**
- **本番決済は行わない。**

---

## 6. Secret handling

- **Full Price ID：** **repo に保存しない。** **AI／Cursor に送らない。** **SSOT に書かない。**
- **`whsec`／`sk_live`／service role 等のシークレット：** **フル値を本条では扱わない。**

---

## 7. 本条での未実行事項

- No redeploy in **5S‑A**
- No checkout retry
- No purchase button click
- No live payment
- No additional Vercel setting changes beyond what Human already reported for this key
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No Supabase changes
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution

---

## 8. Next

- **Phase 5‑6H‑5T — Production redeploy for env activation planning／execution gate**
- **`5T`** を **分離する理由：** Vercel UI が **「新しい deployment が要る」**と示しているため、**`env` 反映の活性化**は **redeploy ゲート**で扱う。
- **Checkout 再試行**と**live payment**は **さらに後続の明示 Gate**に置く。

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5S`（planning gate 記録）：** commit **`9469e5eb672164aa49407155220e502d2217e75b`** — `docs: record vercel production price env addition`
- **Vercel Project：** **`m55-webv2`**
