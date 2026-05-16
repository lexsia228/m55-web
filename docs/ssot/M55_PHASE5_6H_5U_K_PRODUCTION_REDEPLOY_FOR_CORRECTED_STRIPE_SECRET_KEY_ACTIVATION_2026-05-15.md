# Phase 5‑6H‑5U‑K — Production redeploy for corrected `STRIPE_SECRET_KEY` activation gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑K — Production redeploy for corrected `STRIPE_SECRET_KEY` activation gate**

---

## 2. 現在地

- **`5U‑H`：** **`CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED`**（mode mismatch の人手観測）を記録済み
- **`5U‑I`：** **correction planning GREEN**（**`READY_FOR_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_GATE`**）
- **`5U‑J`：** **`VERCEL_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_RECORDED`**。** **`STRIPE_SECRET_KEY`** を **Production／Preview** で Human が更新。**フル secret は未記録。**
- **`STRIPE_WEBHOOK_SECRET`／`whsec`：** **`5U‑J` と本条で変更しない**（本条でも変更しない）
- **校正済み `STRIPE_SECRET_KEY` を Running が読んだか：** **`5U‑J`** 時点では未証明。** **`5U‑K`** が活性化証跡の対象。** **本条ドラフト作成時点では結果は未提出。**

- **`secret` 校正後の Checkout／試購／本番決済：** **実行していない／未証明**

---

## 3. 実行範囲

- **`m55-webv2`** **Production：** redeploy は Human が **ちょうど 1 回**のみ実行する想定。その結果のみ本条に証跡化する。** **本条は redeploy と状態読みのみ。**
- **Checkout 再試行禁止**
- **購入ボタン押下禁止**
- **`payment`** **禁止**

**本条で行わないこと：**

- No webhook／**`STRIPE_WEBHOOK_SECRET`**／`whsec` 変更
- No env／secret の追加変更（**本条は読み込み活性化のみ**）
- No Supabase／Production DB／runtime・コード／UI 変更
- No **`POST`／`PUT`／`PATCH`／`DELETE`**
- No **`/api/stripe/*`** の直接実行
- **追加 redeploy の連打禁止。** **失敗時は本条 **`BLOCKED`** に留める。** **再試行は別 GO と別フェーズで扱う。**

---

## 4. Redeploy結果

### 成功した場合（`PRODUCTION_REDEPLOY_FOR_CORRECTED_STRIPE_SECRET_KEY_ACTIVATION_GREEN` とするために Human が本条へ書ける事項）

Human が確認したとき、少なくとも次を満たす：

- **Redeploy：** **Production 向けに **1 回のみ**実行**（**連打なし**）
- **Environment：** **Production**
- **Production deployment の status：** **Ready**
- **Current または Latest：** **yes（どちらのラベルを用いたか短文でよい）**
- **`Branch`：** **`main`**（または SSOT と矛盾しない旨を人手で確認済みとして記載）
- **Deployment 表示／ID：** **あった場合のみ redacted**（例。**`xxxxxxxx…`**）**で記録。** **フル値の必須記録はしない。**
- **Source commit／message：** **任意で転記。**
- **Deployment：** **Human が **`Ready`**（かつ **`Current`** または **`Latest`**）と UI で読んだ旨を本条に書く。** **決済成功とは別。** **表示 ID は redact。**

### 本条の適用（SSOT 作成時点：人手 redeploy の **結果がチャットまたは本条に伝えられていない**）

- **本条を書いているこのセッションでは、Human が Vercel UI にて **`m55-webv2`** Production の **Redeploy 1 回**を実施したかどうかの **結果証跡を受領していない。** **repo／agent は Deployments を操作しない。**
- **Redeploy executed once：** **本条では証明しない**
- **Status（Ready／Failed／未確認）：** **`Unknown`／未証明**
- **`Current`／`Latest`：** **未証明**
- **`branch`：** **`main` との一致：** **未証明**
- **failure reason：** **未提出。** **本条では推測しない。**
- **retry：** **しない。** **repo／agent が Vercel を操作しない。** **UI が **`Failed`** 等のときは本条 **`BLOCKED`** とし連打しない。**

---

## 5. 判定

**`PRODUCTION_REDEPLOY_FOR_CORRECTED_STRIPE_SECRET_KEY_ACTIVATION_BLOCKED`**

※ **Human の redeploy 結果は本条ドラフトでは未伝達。** **Verdict：** **`PRODUCTION_REDEPLOY_FOR_CORRECTED_STRIPE_SECRET_KEY_ACTIVATION_BLOCKED`。** **§4 の成功テンプレを追記できる follow-up があれば **`GREEN`。** **UI が単に **`Failed`** 等と読める場合も **`BLOCKED`** のままとし、その場合 redeploy は連打しない。**

---

## 6. 重要な制限

- **本条：** **corrected `STRIPE_SECRET_KEY`** を読み込ませる **Production redeploy を 1 回** と、その **deployment の UI 状態（Ready 等）** の証跡に限定。** **Checkout／live payment が成功することは証明しない。**
- **`STRIPE_WEBHOOK_SECRET`** **は本条でも変更しない。**
- **Checkout：** **`Phase 5-6H-5U-L`** で **controlled retry（purchase ボタン 1 回のみ、決済禁止）** とする。** **本条ではしない。**

---

## 7. 未実行事項（本条時点／agent 境界）

- No checkout retry
- No purchase button click
- No live payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No **`STRIPE_WEBHOOK_SECRET`** change
- No env／`whsec`／secret additional changes beyond **`5U-J`** が既に行った校正（本条で新規変更しない）
- No Supabase changes
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- **追加 redeploy：** **連打しない**（**本条の証跡が失敗のとき自動再試行しない**。）
- No full **`STRIPE_SECRET_KEY`**／`whsec`／Price／Session／PI／顧客識別子の記録

---

## 8. Next

- **`GREEN` のあと：** **`Phase 5-6H-5U-L` — Checkout creation controlled retry after corrected `STRIPE_SECRET_KEY` redeploy**。** **`5U‑L`：** purchase ボタン **exactly once** で **`checkout.stripe.com`** 到達のみ。** **決済完了禁止。**

- **`BLOCKED`：** Human が結果または失敗の要点（フル値なし）を §4 に書き換え、別コミットで更正。** redeploy は連打しない。** **明示 GO と別フェーズで再評価。**

---

## Work anchor

- **`7dda2ed382db21019bb293211fc4d4f1ed6bae70`** — `docs: record production stripe secret key correction` — **`Phase 5‑6H‑5U‑J` SYSTEM／SSOT commit（本条の直前提）**

## Prior evidence

- `docs/ssot/M55_PHASE5_6H_5U_J_VERCEL_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_2026-05-15.md` — **`VERCEL_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_RECORDED`**
