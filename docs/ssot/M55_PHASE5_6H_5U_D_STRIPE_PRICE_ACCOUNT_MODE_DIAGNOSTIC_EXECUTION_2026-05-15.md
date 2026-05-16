# Phase 5‑6H‑5U‑D — Stripe Price／account／mode human diagnostic execution (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑D — Stripe Price／account／mode human diagnostic execution**

---

## 2. 現在地

- **`5U‑B`：** **`CHECKOUT_CREATION_CONTROLLED_PRICE_NOT_FOUND_BLOCKED`**（**`No such price`**／redacted **`price_****U3hF`**）
- **`5U‑C`：** **`READY_FOR_STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_EXECUTION_GATE`**（**planning 確定・本条は execution 記録枠**）
- **現在の blocker：** **`No such price`**（redacted **`price_****U3hF`**）
- **`checkout.stripe.com`：** **未到達（`5U‑B` 時点の継続前提）**
- **payment：** **未完了**
- **参照 Product lane（人間照合用）：** **M55 デジタル鑑定レポート（Standard）／`DTR Core Static V1` 相当**、**¥1,000 JPY**、**one-time**、**Live**

---

## 3. Human diagnostic results（redacted）

**本コミットは Cursor／repo から Stripe／Vercel UI を実行・目視できない。** **以下のセルは「人手が `5U-C` の A–D を実施した場合に記入」する。** **本条時点では **未記録** とし、**別コミットで §3 を埋めたうえで **`STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_CAUSE_IDENTIFIED`** へ遷移**できる。

| 観測項目 | 本条の記録 |
|----------|------------|
| **Stripe mode（Live／Test）** | **未検証**（repo 外） |
| **Stripe product 観測** | **未検証** |
| **amount／currency が ¥1,000 JPY と一致** | **未検証** |
| **billing type が one-time** | **未検証** |
| **Price active** | **未検証** |
| **Price ID suffix が `price_****U3hF` と一致** | **未検証** |
| **Vercel `m55-webv2` Production に `STRIPE_PRICE_DTR_CORE_STATIC_V1` 存在** | **未検証** |
| **Vercel の値が Stripe Price と同値に見えるか** | **未検証**（**フル値は記録しない**） |
| **Production `STRIPE_SECRET_KEY` が同一 Stripe アカウント／Live と整合** | **未検証**（**フル secret 禁止**） |
| **Account／mode の一貫性** | **未検証** |

**likely blocker category（本条時点）：** **unclear**（**人手診断未取り込み**）

**Human が記入する際の許容値（参考）：** `price id typo/mismatch`／`test/live mismatch`／`stripe account mismatch`／`inactive/deleted price`／`secret key mismatch`／`unclear`

---

## 4. 判定

**`STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_INCONCLUSIVE`**

（**原因は本条コミットでは特定されない。** **§3 が人手で埋まり原因が確定したら **`STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_CAUSE_IDENTIFIED`** を別コミットで宣言する。**）

---

## 5. 重要な制限

- **`5U-D` 内で値の修正をしない。**
- **Checkout 再試行をしない。**
- **`env`／secret を変更しない。**
- **Stripe 設定を変更しない。**
- **必要な修正は 5U-E に分離する。**

---

## 6. Redaction

- **Full Price ID／`STRIPE_SECRET_KEY`／`whsec`／Session／PI／customer／email：** **SSOT に書かない。**
- **スクリーンショットの repo コミット：** **フル ID／secret が写る場合は行わない。**

---

## 7. 本条での未実行事項

- No purchase button retry
- No checkout retry
- No payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No env／`whsec`／secret changes
- No Vercel setting changes
- No Supabase changes
- No runtime／code／UI changes
- No Production DB changes
- No additional redeploy
- No **`/api/stripe/*`** direct execution
- No full IDs recorded

---

## 8. Next（**`5U-E`** — 原因に応じて文書を分ける）

**本条が INCONCLUSIVE の間は、まず人手で §3 を完成させ、その後 `5U-E` を具体化する。**

- **env 値誤りが原因と確定した場合：** **Phase 5‑6H‑5U‑E — Vercel Production price env correction gate**
- **secret／account／mode 不一致が原因と確定した場合：** **Phase 5‑6H‑5U‑E — Stripe secret／account／mode correction planning gate**
- **原因がまだ不明な場合：** **Phase 5‑6H‑5U‑E — deeper read-only diagnostic gate**

**いずれも：修正・Checkout 再試行・本番決済は別 Gate。**

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5U-C`：** commit **`9ae80dba7b00f33229f737d94f355ee8b1e3abbd`** — `docs: plan stripe price account mode diagnostic`
- **Vercel Project：** **`m55-webv2`**
- **Env key：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**
