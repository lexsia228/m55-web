# Phase 5‑6H‑5U‑H — Checkout retry blocked by Stripe secret key mode mismatch finding (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑H — Checkout retry blocked by Stripe secret key mode mismatch finding**

---

## 2. 現在地

- **`5U‑E‑A`：** **`VERCEL_PRICE_ENV_OVERWRITE_EVIDENCE_RECORDED`**（**`STRIPE_PRICE_DTR_CORE_STATIC_V1`** corrected／上書き）
- **`5U‑F‑A`：** **`PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_GREEN`**（corrected env 読み込み Production deployment Ready／Latest）
- **`5U‑G`：** **`CHECKOUT_CREATION_CONTROLLED_RETRY_BLOCKED`**（当時セッションは証跡未提出であったが、その後 Human が本条の証跡を提示）
- **Human がスクリーンショット証跡に基づき、controlled retry に相当する試行結果を本条に伝達：** corrected env／redeploy 後、`https://m55-webv2.vercel.app` で **purchase button retry**
- **`checkout.stripe.com`：** **未到達**
- **`payment`：** **未完了**

---

## 3. Human observation

- **Production domain：** **`https://m55-webv2.vercel.app`**
- **Purchase button retry：** **attempted（corrected env redeploy 後）**
- **`missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1`：** **再発しなかった**
- **観測された可視エラー（Stripe／app、`Price` は redacted のみ）：**

  **`No such price: price_****U3hF; a similar object exists in live mode, but a test mode key was used to make this request.`**

- **`checkout.stripe.com` reached：** **no**
- **Stripe Checkout／Hosted ページ表示：** **no**
- **`Payment completed`：** **no**
- **スクリーンショット：** **フル Price ID が一時表示されても、SSOT／repo に意図的に転記しない。画像ファイルもコミットしない（全文面 redact しない限り）。**

---

## 4. Interpretation

- **Live Price が存在する旨をエラー文言が示唆する**（**「similar object exists in live mode」**）。
- **現時点でブロッカーは、「missing env」や typo のみによる Price mismatch だけではない** と読める。
- **エラーは、Live mode のオブジェクトに対して test mode Stripe key でリクエストが行われたことを示す。**
- **Likely blocker category：** **`Production STRIPE_SECRET_KEY`** の **test／live mode mismatch**。
- **`STRIPE_SECRET_KEY` が test key、過去／意図しないモードまたはアカウントの key である可能性** — **本条では細目まで確定しない（修正案ではない）。**
- **`STRIPE_SECRET_KEY` を本条では変更しない。**
- **`STRIPE_SECRET_KEY` の人手修正計画および必要な Production redeploy の完了後は、Checkout 再試行を別ゲートで扱う。** **本条で決済入力・決済完了はしない。** **本条で追加の購入ボタン押下はしない。**

---

## 5. 判定

**`CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED`**

---

## 6. Redaction policy

- **フル Price ID：** **記録しない。**
- **フル `STRIPE_SECRET_KEY`：** **記録しない。**
- **フル `whsec`：** **記録しない。**
- **フル Checkout Session ID：** **記録しない。**
- **フル Payment Intent ID：** **記録しない。**
- **フル customer／email／`client_reference_id`：** **記録しない。**
- **スクリーンショット：** **全文面 redacted でない限り repo にコミットしない。**
- **その他 secret：** **記録しない。**
- **redacted Price ID のみ：** **`price_****U3hF`**

---

## 7. 未実行事項

- No `checkout.stripe.com` arrival
- No payment completion
- No card／payment wallet execution
- No live payment
- No **`STRIPE_SECRET_KEY`** change
- No env／**`whsec`**／secret changes
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No Supabase changes
- No Vercel setting changes
- No additional redeploy
- No runtime／code／UI changes
- No Production DB changes
- No **`/api/stripe/*`** direct execution
- No full IDs recorded

---

## 8. Next

- **Phase 5‑6H‑5U‑I — Production Stripe secret key mode／account correction planning gate**
- **`5U‑I`：** **最初は docs-only。** Human-only の確認手順を計画し、必要なら **`price_****U3hF` を保持する Stripe アカウント**に対応する **correct Live **`STRIPE_SECRET_KEY`** を Vercel Production に載せる**旨を計画として整理する（**実際の値書き換えは別 GO／別フェーズ**。）
- **Webhook secret（`whsec`）は別途検討**し、**本条の finding checkpoint 内では変更しない。**
- **Checkout 再試行**および **live payment** は **さらに後続の Gate**。**購入ボタンの再押下は本条でしない。**

---

## Work anchor

- **`0fad76fe110a40b4fd61cd19ace269251f0dd593`** — `docs: record checkout creation controlled retry` — **`Phase 5‑6H‑5U‑G` SYSTEM／SSOT 記録コミット（本条の直前提）**

## Evidence cross-reference

- **`5U‑G`（前提ドキュメント）：** `docs/ssot/M55_PHASE5_6H_5U_G_CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_CORRECTED_ENV_REDEPLOY_2026-05-15.md` — **`CHECKOUT_CREATION_CONTROLLED_RETRY_BLOCKED`**
