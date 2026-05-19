# Phase 5‑6H‑5U‑E‑A — Vercel Production price env overwrite evidence checkpoint (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑E‑A — Vercel Production price env overwrite evidence checkpoint**

---

## 2. 現在地

- **`5U‑B`：** **`CHECKOUT_CREATION_CONTROLLED_PRICE_NOT_FOUND_BLOCKED`**（**`No such price`**／redacted **`price_****U3hF`**）。
- **`5U‑C`：** Stripe Price／account／mode **diagnostic planning** ゲート **`READY_FOR_STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_EXECUTION_GATE`** で記録済み。
- **`5U‑D`：** **`STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_INCONCLUSIVE`**
- **上書き前の blocker：** **`No such price`**（redacted **`price_****U3hF`**）
- **Human：** Stripe Dashboard で **Live Price ID を直接コピー**し **`m55-webv2`** の **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** に **Production／Preview で上書き保存**。**フル Price ID は AI／Cursor／SSOT に転記しない。**
- **本条以降：** **追加 redeploy なし**。**Checkout 再試行なし**。**決済なし**。

---

## 3. Human Vercel UI observation

- **Project：** **`m55-webv2`**
- **Key：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**
- **Environment：** **Production および Preview**（同一キー）
- **表示：** **Sensitive variable** と読める状態
- **更新時刻：** **Updated just now**／**約 47 秒前** 相当の文言を人手で確認
- **Vercel 注記：** **a new deployment is needed for changes to take effect** に相当
- **Full Price ID：** **SSOT／repo に記録しない。** **redacted 参照のみ：** **`price_****U3hF`**

---

## 4. Interpretation（本条）

- **本条は：** Human が **Price `env` を正しい値で上書きした**という **証跡の記録**に限定する。
- **現行 Production deployment が修正後の値を読み込んでいるとは限らない**（**再 deployment が別途必要**）。
- **Checkout が成功すること／本番決済が成立することを意味しない**。
- **checkout 再試行は 5U-F（redeploy）後の別ゲートまで保留**。
- **redeploy と controlled Checkout 試行後も `No such price` が続く場合：** **`STRIPE_SECRET_KEY`** のアカウント／モード不一致／価格の可視性等の **`5U‑D` 由来の論点が残り得る**（本条では確定しない）。

---

## 5. 判定

**`VERCEL_PRICE_ENV_OVERWRITE_EVIDENCE_RECORDED`**

---

## 6. Redaction

- **Full Price ID／`STRIPE_SECRET_KEY`／`whsec`／Session／PI／customer／email：** **SSOT に書かない。**
- **スクリーンショットの repo コミット：** **フル ID／secret が写らない場合のみ許容**。

---

## 7. 本条での未実行事項

- No redeploy after overwrite（**本条コミット時点では未実施**）
- No purchase button retry
- No checkout retry
- No payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- **本条以外の `env`／`whsec`／secret の追加変更はしない**（**当該キーの Human 上書きのみ許容済み**として記録）。
- No Supabase changes
- No runtime／code／UI changes
- No Production DB changes
- No **`/api/stripe/*`** direct execution
- No full IDs recorded
- No additional Vercel 設定変更（**当該 `env` の上書き以外**）

---

## 8. Next

- **Phase 5‑6H‑5U‑F — Production redeploy for corrected price env activation gate**
- **`5U‑F`：** **redeploy を 1 回**行い **Ready／Current** を確認（**詳細は `5U-F` SSOT**）。
- **Checkout 再試行**は **redeploy と別の明示ゲートで後続**。

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5U-D`：** commit **`f0ac351b65d4d05081e66f190deb910b2902d503`** — `docs: record stripe price account mode diagnostic`
- **Vercel Project：** **`m55-webv2`**
