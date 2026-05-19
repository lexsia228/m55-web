# Phase 5‑6H‑5U‑G — Checkout creation controlled retry after corrected env redeploy (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑G — Checkout creation controlled retry after corrected env redeploy**

---

## 2. 実行範囲

- **Production で購入ボタンの試行は、Human が厳密に 1 回のみ**（**連打禁止**）
- **Checkout Session 作成および `checkout.stripe.com`（Stripe Checkout ホスト）への到達確認のみを目的とする**
- **支払い完了禁止** — カード／ウォレット等の入力・Apple Pay／Google Pay／Shop Pay／PayPay 等の実決済操作は禁止
- **webhook／env／Production DB／runtime・コード／UI／Vercel 設定変更はしない**
- **`/api/stripe/*` は直接実行しない**

---

## 3. 実行結果

### 成功した場合（`CHECKOUT_CREATION_CONTROLLED_RETRY_GREEN` と SSOT できるときに満たす内容）

- **Purchase button clicked：** **once**（**exactly once**）
- **missing env error did not recur**
- **No such price error did not recur**
- **`checkout.stripe.com` reached：** **yes**
- **Checkout page loaded：** **yes**
- **Payment not completed**
- **Checkout／tab：** **closed or backed out**（タブを閉じる／ブラウザバック等で退出）
- **フル Checkout Session／Payment Intent／customer／email／client_reference：** **記録しない**

### 失敗した場合（本条の適用：`CHECKOUT_CREATION_CONTROLLED_RETRY_BLOCKED`）

**判定理由：** **`5U‑G`** の SSOT 作成セッションに、Human のブラウザ上の結果（ホスト確認・エラー文言）が伝えられていない。** repo／Cursor は Production の購入ボタン操作を検証しない。**

- **Purchase button clicked once or not clicked：** **本条では証明しない**（**Human の口述または追記無し。** **repo は押下を観測していない。**）
- **observed error：** **SSOT 記録時点では未提出。** **Stripe 側の具体的エラー有無までは本条で断定しない。**
- **`checkout.stripe.com` reached：** **本条では証明できない。** **Controlled retry が成功要件をみたしたと SSOT できず、本条は `GREEN` としない。**（**Human が成功節を§3 成功節に書き換えるなら `GREEN` へ更新**。）
- **`missing env` recurrence：** **本条では証明しない**（**未提出**）
- **`No such price` recurrence：** **本条では証明しない**（**未提出**）
- **stopped without retry：** **yes — repo／agent は再試行しない。** **Human は本条を追記または差し替えるまで Controlled retry を SSOT で成功とみなせない。購入ボタン連打は禁止。**

---

## 4. 証跡ルール

- **スクリーンショット：** **Session／PI／顧客識別子が写る場合は repo に載せない／SSOT にフル転記しない。**
- **フル Checkout Session ID：** **記録しない**
- **フル Payment Intent ID：** **記録しない**
- **フル customer／email／client_reference：** **記録しない**
- **Stripe Price ID：** **`price_****U3hF` のような redacted のみ。** **フル Price ID は記録しない**
- **secret／`whsec`／`sk_live`／service_role：** **記録しない**
- Stripe Dashboard での **created／open** 相当は **値は redacted** でのみ言及してよい

---

## 5. 判定

**`CHECKOUT_CREATION_CONTROLLED_RETRY_BLOCKED`**

※ **本条の `BLOCKED` は、「Stripe が必ずしも失敗した」とは断定しない。** **本条時点では「Controlled retry が SSOT 上成功証跡を残せなかった（証跡未提出／未記録）」を意味する。** **Human が §3「成功した場合」の項目をすべて口述または SSOT に追記できるときのみ、`CHECKOUT_CREATION_CONTROLLED_RETRY_GREEN` へ判定を更新する。** **Stripe API／UI のエラーで止まったときは §3 にエラー概要（フル ID なし）で追記する。**

---

## 6. 未実行事項（本条および agent の境界）

- No payment completion
- No card／payment wallet execution
- No live payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No env／`whsec`／secret changes
- No Supabase changes
- No Vercel setting changes
- No additional redeploy
- No runtime／code／UI changes
- No Production DB changes
- No **`/api/stripe/*`** direct execution
- No full Checkout Session／PI／customer／email／client_reference recorded
- **No purchase button連打／追加の Controlled retry（別 GO が無い限り本条で行わない）**

---

## 7. Next

- **`CHECKOUT_CREATION_CONTROLLED_RETRY_GREEN`** が SSOT で確定した場合：** **`Phase 5‑6H‑5V` — Checkout creation evidence checkpoint／live payment planning gate**。** **`5V` で Checkout 作成証跡を固定し、live payment はさらに後続の別 Gate に分離する。**
- **本条が `GREEN` と SSOT で断定できるまで：** **`Phase 5‑6H‑5V` に進まない。** **Human が既に Controlled retry を実施済みなら、§3 成功節へ差し替え・判定を **`GREEN`** に更正した follow-up commit を行う。**
- **Work anchor：** **`40d72e8b1649b8a4297eff980112dd02750e37ff`** — `docs: record corrected price env redeploy green` — **`Phase 5‑6H‑5U‑F‑A` SSOT／SYSTEM 記録コミット**
- **Prior：** **`Phase 5‑6H‑5U‑F‑A`** → **`PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_GREEN`**
  - `docs/ssot/M55_PHASE5_6H_5U_F_A_PRODUCTION_REDEPLOY_FOR_CORRECTED_PRICE_ENV_ACTIVATION_GREEN_2026-05-15.md`

### Production context snapshot（本条は追加 redeploy をしない）

- **Project：** **`m55-webv2`**
- **Deployment status（前提）：** **Ready／Latest**（**人手観測は `5U‑F‑A`**）
- **Environment：** **Production**
- **Branch：** **`main`**
- **Source commit：** **`a38918`** — `chore(audit): refresh repo asset index`
- **`STRIPE_PRICE_DTR_CORE_STATIC_V1`：** corrected 前提。**redacted のみ：** **`price_****U3hF`**
