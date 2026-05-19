# Phase 5‑6H‑5R — Production Stripe Price ID human confirmation gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5R — Production Stripe Price ID human confirmation gate**

---

## 2. 現在地（証跡の前提）

- **`5Q`：** **`READY_FOR_PRODUCTION_STRIPE_PRICE_ID_HUMAN_CONFIRMATION_GATE`** 記載済み（計画 docs-only、commit **`0f63e994027986c9e664d1d072f6667e43ed0e09`**）。
- **`5Q‑A`：** **`HISTORICAL_STRIPE_PAYMENT_EVIDENCE_INVENTORY_RECORDED`**（commit **`59e108962072985673f6e64161ad38d476119e89`**）。
- **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** は **本条時点でも Production 側 blocker として未解消**（**`5P‑A`** と同一の Production エラー文と整合）。
- **`Checkout` 再試行なし。** **`env` 代入なし。** **live payment なし。**

**参照 Product lane（論理コード／表示名）：**

- **`DTR_CORE_STATIC_V1`**
- **M55 デジタル鑑定レポート Standard**

**前提価格（人間確認の対象）：** **¥1,000 `JPY`**

---

## 3. Stripe Dashboard — 人間確認結果（**redacted** のみ）

| 項目 | 確認内容 |
|------|----------|
| **Stripe mode** | Live／Production |
| **Product lane（表示）** | M55 デジタル鑑定レポート（Standard） |
| **論理チェックアウト product** | **`DTR_CORE_STATIC_V1`** |
| **Amount** | **¥1,000 `JPY`** |
| **Billing type** | one-time |
| **Status（Price）** | active（yes とみなす） |
| **Redacted Price ID** | **`price_****U3hF`** のみ記録 |

**フル Price ID：** **記録しない。** AI／Cursor／SSOT に**共有しない。** **本条もフル値を含まない。**

---

## 4. Vercel — 人手観測（補助証跡・**本条では変更なし**）

- **Environment Variables の一覧観察において：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** は **Preview 用として存在すると読めた。**
- **同じ一覧の範囲では、Production に同一キーが** **設定されていない／見えなかった**と読める（人間報告）。
- **上記は **`5P‑A`** の **`missing env`** エラー説明と整合する補助証跡**に過ぎる。
- **`env` の追加・削除・スコープ変更はしない。** **未解消のまま**（Production 反映は **`5S`** で分離）。

---

## 5. Verdict／判定（本条）

**`PRODUCTION_STRIPE_PRICE_ID_HUMAN_CONFIRMATION_GREEN`**

（**適合する Live Price が存在すること**と **末尾 redacted に留めた識別子**を人手で確認できたことを意味する。**Production checkout の成立や env 充足ではない**。）

---

## 6. 重要な制限

- **Full Price ID must not be stored in SSOT**／**sent to AI/Cursor**。  
- **`env` は本条では変更しない。**  
- **Checkout の再試行・payment は本条ではしない。**  
- **Vercel Production の **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** は **`5S`** **まで形式上未注入のまま**（本条は gate のみ）。

---

## 7. 本条での未実行事項

- No env / `whsec` / secret changes
- No Vercel setting changes
- No Stripe setting changes
- No Stripe webhook changes / replay
- No Checkout retry / no purchase button click
- No live payment
- No Supabase changes
- No additional redeploy
- No Production DB changes
- No **`POST`** / **`PUT`** / **`PATCH`** / **`DELETE`**
- No **`/api/stripe/*`** direct execution

---

## 8. Next

- **Phase 5‑6H‑5S — Vercel Production env variable addition planning／execution gate**
- **`5S`：** 人間が Vercel UI で **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** を **Production** に載せる手順・GO を分離する。** **`env` 代入後も `Checkout` 再試行と本番決済はより後続の明示 Gate とする。** **redeploy が要る場合は別途（例：`5T` SSOT と整合）。**

---

## Observed Production error（再掲）

`Product DTR_CORE_STATIC_V1 is not configured (missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1)`

---

## Work anchor

- Branch: **`work/home-cluster`**
- **`5Q`：** commit **`0f63e994027986c9e664d1d072f6667e43ed0e09`** — `docs: plan production stripe price env configuration`
- **`5Q‑A`：** commit **`59e108962072985673f6e64161ad38d476119e89`** — `docs: record historical stripe payment evidence inventory`
- **Vercel Project（アンカー）:** **`m55-webv2`**
- **Production URLs（アンカー）:** **`m55-web.vercel.app`**、**`m55-webv2.vercel.app`**
