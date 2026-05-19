# Phase 5‑6H‑5U‑I — Production Stripe secret key mode／account correction planning gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑I — Production Stripe secret key mode／account correction planning gate**

---

## 2. 現在地

- **`5U‑H`** **checkout blocked finding を記録済み：** **`CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED`**
- **Live Price が存在するとエラー文言が示唆する**
- **Stripe API リクエストが test mode secret で行われたと読める**（詳細 §3）
- **`checkout.stripe.com`：** **未到達（`5U‑H` 時点までの継続）**
- **`payment`：** **未完了／未実行**
- **`STRIPE_SECRET_KEY`：** **`5U‑I` で変更しない。** **`5U‑H` / 本条まで未変更として記録**（**値の実体は SSOT に書かない**）。
- **Webhook secret（例：`whsec`、`STRIPE_WEBHOOK_SECRET`）：本条・本 Gate で変更しない**

---

## 3. 問題

### Observed redacted error

**`No such price: price_****U3hF; a similar object exists in live mode, but a test mode key was used to make this request.`**

### Interpretation（本条 — 修正案ではなく読み）

- **`STRIPE_PRICE_DTR_CORE_STATIC_V1` は読み込まれている**（**当該系の missing env が主因とは読みにくい**）。
- **Price が Live mode で存在するとエラー文言が示唆する。** **SSOT では redacted** **`price_****U3hF`** **のみ。** **フル Price ID は記録しない**
- **Production の `STRIPE_SECRET_KEY` は、Test／誤モードまたは意図しないアカウント側の値である可能性が高い** と読める（**本条で細目まで確定しない**）。
- **Production で `checkout.stripe.com` に進むためには、`price_****U3hF` を保有する Stripe アカウントの Live secret と整合する `STRIPE_SECRET_KEY` に更新する必要がある** — **ただし変更は本条では行わず、別 Gate（`5U‑J`）と明示 GO 後のみ**。

---

## 4. この Gate の目的

次フェーズでの Human 実行に備え、**`m55-webv2`** の **Production `STRIPE_SECRET_KEY`** を、**Stripe Dashboard で確認した同一 Live アカウントの Live secret**へ **安全に**差し替えるための **手順・証跡・redaction を docs-only で整理する**。  
**本条（`5U‑I`）では Vercel env を変更しない。** **Stripe の設定オブジェクト自体も本条では変更しない。**

---

## 5. 次フェーズ（`5U‑J` 以降）で Human が確認・実施する案（計画のみ）

※ **本条はチェックリストの提示にとどめる。実行はしない。**

1. **Stripe Dashboard が Live mode であることを確認**（toggle／表示）
2. **redacted で把握している Live Price（`price_****U3hF` と整合する）がある Stripe アカウントであることを確認**
3. **Developers／API keys 等から Live secret を Human が取得**
4. **Vercel Project `m55-webv2` → Environment Variables**
5. **`STRIPE_SECRET_KEY`** を **Production／Preview／必要環境のみ** に、Human が値を更新（**スコープは運用規約に従う**）
6. **フル secret は SSOT／AI／Cursor に貼らない**
7. **更新後に必要となる redeploy：** **`Phase 5-6H-5U-K`** と分離する。** **`5U‑I`** **では redeploy しない**
8. **Webhook secret／`whsec` は本条の校正チェーンでも混同せず、この Gate では変更しない**

---

## 6. Secret handling

- **フル `STRIPE_SECRET_KEY`：** **SSOT に書かない。AI／Cursor／チャットに貼らない。**
- **フル `whsec`：** **本条では取り扱わない。** **転記しない。**
- **フル Price ID：** **記録しない。**
- **やむを得ないときは redacted のみ**（例：`sk_live_****`、`Live secret を Human が Dashboard で確認済みとするのみ` など）。**secret の suffix を SSOT に残さないことを原則とする**

---

## 7. 重要な分離

- **`STRIPE_SECRET_KEY`：**サーバー側の Stripe API 呼び出し（Checkout Session 作成など）で用いる。
- **`STRIPE_WEBHOOK_SECRET`／`whsec`：** Webhook の署名検証に用いる。** **Checkout に使う `STRIPE_SECRET_KEY` と同じ作業単位では変更しない。** **必要時は別 Gate。**
- **Checkout の controlled retry／live payment** は **`STRIPE_SECRET_KEY` と redeploy の後続 Gate とする。** **本条ではしない。**

---

## 8. 判定

**`READY_FOR_PRODUCTION_STRIPE_SECRET_KEY_HUMAN_CORRECTION_GATE`**

**制約：** **`STRIPE_SECRET_KEY` の値変更は、`5U‑J` で明示 GO があった場合にのみ Human が実施する。** **`5U‑I` では変更しない**

---

## 9. 未実行事項（本条）

- No **`STRIPE_SECRET_KEY`** change in **`5U‑I`**
- No env／**`whsec`**／secret changes
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No Checkout retry
- No purchase button click
- No live payment
- No Supabase changes
- No Vercel setting changes（**計画のみ。実 UI 変更は `5U‑J`**）
- No additional redeploy
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No full IDs or secrets recorded

---

## 10. Next

- **`Phase 5-6H-5U-J`** — **Vercel Production `STRIPE_SECRET_KEY` human correction**：Human が **`m55-webv2`** の **`STRIPE_SECRET_KEY`** のみ correct Live に更新。**Webhook secret／`whsec` は変更しない**
- **`Phase 5-6H-5U-K`** — **`redeploy` を `5U-J` と分離。** **`5U‑I` では redeploy を実行しない**
- **Checkout／live payment** は **より後続の Gate**

---

## Work anchor

- **`f84399bb5653d40a6be5c8e3a5002611e2438a11`** — `docs: record checkout stripe secret key mode mismatch finding` — **`Phase 5‑6H‑5U‑H` SSOT／SYSTEM commit（本条の直前提）**

## Prior evidence

- `docs/ssot/M55_PHASE5_6H_5U_H_CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED_FINDING_2026-05-15.md` — **`CHECKOUT_STRIPE_SECRET_KEY_MODE_MISMATCH_BLOCKED`**
