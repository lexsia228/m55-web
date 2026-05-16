# Phase 5‑6H‑5U‑J — Vercel Production `STRIPE_SECRET_KEY` human correction evidence checkpoint (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑J — Vercel Production `STRIPE_SECRET_KEY` human correction evidence checkpoint**

---

## 2. 現在地

- **`5U‑H`：** **`CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED`**（test secret vs Live Price の示唆）を記録済み
- **`5U‑I`：** **correction planning GREEN**（SSOT：**`READY_FOR_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_GATE`**）
- **Human が Stripe で **Live secret key** を新規発行し、その表示名 **`M55-Live`** を付けた。** **フル key 値は転記しない。**
- **Human が Vercel `m55-webv2` の **`STRIPE_SECRET_KEY`** を Live secret に更新した。** **フル値は SSOT／repo／AI に記録しない。**
- **フル `STRIPE_SECRET_KEY`：** **未記録**
- **本条の Human 操作後、** **redeploy は未実行**
- **Checkout 再試行：** **未実行**
- **`payment`：** **未実行**

---

## 3. Human Vercel UI observation

- **Project：** **`m55-webv2`**
- **Variable key：** **`STRIPE_SECRET_KEY`**
- **Environment scope：** **Production** および **Preview**
- **Updated by：** **Human**
- **Sensitive：** **yes**（Vercel 上で sensitive 扱い）
- **フル値：** **SSOT に書かない。repo にコミットしない。**
- **更新が最近行われた旨が Vercel UI で読める**（**時刻のフル値は SSOT に必須としない**）
- **`STRIPE_WEBHOOK_SECRET`：** **変更していない**（**`whsec` 系も本条で触らない**）

---

## 4. 判定

**`VERCEL_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_RECORDED`**

---

## 5. 重要な制限

- **本条の範囲：** **`STRIPE_SECRET_KEY`** の Human による **Vercel** 校正（Production／Preview）の **記録のみ**。
- **現行の Running Production deployment が、すでに corrected secret を読み込んでいることを意味しない。** **再デプロイが通常必要。**
- **Checkout 再試行は **redeploy 完了後**の別 Gate。**
- **Checkout が成功することを証明しない。**
- **本番決済が成立することを証明しない。**
- **Webhook secret（`whsec`／`STRIPE_WEBHOOK_SECRET`）は別系統。本条では変更しない。**
- **本条での cleanup：** **過去 Stripe API key の **削除／ローテーション**は行わない。** **運用上の整理は別判断。**

---

## 6. Secret handling

- **フル `STRIPE_SECRET_KEY`：** **repo に保管しない。** **AI／Cursor／チャットに送らない。** **SSOT に書かない。**
- **フル `whsec`：** **本条では扱わず、転記もしない。**
- **フル Price ID／Checkout Session ID／Payment Intent ID／customer／email／client_reference：** **記録しない**
- **`M55-Live`：** **Stripe Dashboard で Human が付けた名前（表示ラベル）。secret の全文ではない。**

---

## 7. 未実行事項

- No redeploy after secret correction（**本条の直後含む**）
- No checkout retry
- No purchase button click
- No live payment
- No Stripe webhook changes
- No webhook replay
- No **`STRIPE_WEBHOOK_SECRET`**／**`whsec`** change
- No old Stripe key deletion／rotation cleanup in this checkpoint
- No Supabase changes
- **`STRIPE_SECRET_KEY`** 以外の **Vercel 設定の追加変更：なし**（**本条証跡は当該キーの Human 更新のみ**）
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No full IDs or secrets recorded

---

## 8. Next

- **`Phase 5-6H-5U-K` — Production redeploy for corrected `STRIPE_SECRET_KEY` activation gate**
- **`5U-K`：** **`m55-webv2`** で Production **redeploy を 1 回**行い、**Ready／Current**（運用側の読みで latest）を人手確認。** **`5U-K` 完了後でも Checkout／live payment は別 Gate。** **本条では実行しない。**

---

## Work anchor

- **`f3490940c10e2fc6174bf02e674a4b2f45476b9f`** — `docs: plan production stripe secret key correction` — **`Phase 5‑6H‑5U‑I` SYSTEM／SSOT commit（本条の直前提）**

## Prior evidence

- `docs/ssot/M55_PHASE5_6H_5U_I_PRODUCTION_STRIPE_SECRET_KEY_MODE_ACCOUNT_CORRECTION_PLANNING_2026-05-15.md` — **`READY_FOR_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_GATE`**
- `docs/ssot/M55_PHASE5_6H_5U_H_CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED_FINDING_2026-05-15.md` — **`CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED`**
