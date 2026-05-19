# Phase 5‑6H‑5U‑L — Checkout creation controlled retry after corrected `STRIPE_SECRET_KEY` redeploy (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑L — Checkout creation controlled retry after corrected `STRIPE_SECRET_KEY` redeploy**

---

## 2. 実行範囲

- **Production で purchase ボタンを Human が厳密に 1 回のみ試す**（**連打禁止**）
- **Checkout Session 作成および `checkout.stripe.com`（Stripe Checkout ホスト）への到達確認のみ**
- **支払い完了禁止** — カード／ウォレット・Apple Pay／Google Pay／Shop Pay／PayPay 等の実決済操作は禁止
- **webhook／env／Production DB の変更なし**（本条は人間のブラウザ操作と観測の記録に限定）

---

## 3. 実行結果

### 成功した場合（`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_GREEN` と SSOT できるときに満たす内容）

- **Purchase button：** **clicked once**
- **`missing env`：** **再発しなかった**
- **`No such price`：** **再発しなかった**
- **Test mode key／account mismatch 系の表示：** **再発しなかった**（人手で読んだ範囲）
- **`checkout.stripe.com` reached：** **yes**
- **Checkout page loaded：** **yes**
- **Payment not completed**
- **Checkout／tab：** **closed or backed out**
- **フル Checkout Session／Payment Intent／customer／email／client_reference：** **記録しない**

### 本条の適用（SSOT 記録セッション：**人手結果が未到達**）

**判定理由：** 本ドキュメントを作成したセッションに、Human のブラウザ上の結果（エラー文言・`checkout.stripe.com` 到達可否）が伝えられていない。** repo／agent は Production で購入ボタンを押下しない。**

- **Purchase button clicked once or not clicked：** **本条では証明しない**
- **observed error：** **未提出**（**UI 上の文言は SSOT 作成時点では不明**）
- **`checkout.stripe.com` reached：** **本条では証明できない**
- **`missing env` recurrence：** **未提出**
- **`No such price` recurrence：** **未提出**
- **Test mode key error recurrence：** **未提出**
- **stopped without retry：** **yes — agent は再試行しない。Human が結果を本文に載せられるまで購入ボタン連打はしない。**

---

## 4. 証跡ルール

- **スクリーンショット：** **Session／PI／顧客識別子が写る場合は repo に載せない／SSOT にフル転記しない。**
- **フル Checkout Session ID：** **記録しない**
- **フル Payment Intent ID：** **記録しない**
- **フル customer／email／client_reference_id：** **記録しない**
- **Price ID：** **redacted のみ**（例：**`price_****U3hF`**）。**フル Price ID は記録しない**
- **secret／`whsec`／`sk_live`／service_role：** **記録しない**

---

## 5. 判定

**`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_BLOCKED`**

※ **本条の `BLOCKED` は「Stripe が必ずしも失敗した」とは限らない。** **本条ドラフト時点で Human の観測が本文に無いため、** **`GREEN` と断定できない**状態を指す。** §3 成功テンプレを人手で満たせば follow-up で **`GREEN`** に更正。** **UI にエラーが残る場合は概要のみ（フル ID なし）を §3 に書き、`BLOCKED` を維持、連打しない。** **

---

## 6. 未実行事項（本条および agent 境界）

- No payment completion
- No card／payment wallet execution
- No live payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No **`STRIPE_WEBHOOK_SECRET`** change
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

- **`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_GREEN`** が SSOT で確定した場合：** **`Phase 5-6H-5V` — Checkout creation evidence checkpoint／live payment planning gate**。** **`5V` で Checkout 作成証跡を固定し、live payment はさらに後続の別 Gate。**

- **`GREEN` 未確定：** **`Phase 5-6H-5V` に進まない。** Human が Controlled retry 済みなら §3 を成功節に差し替え、follow-up commit で更正。

---

## Work anchor

- **`9e36a047157decd90a6b567665777d444d7d2f4c`** — `docs: record corrected stripe secret key redeploy green` — **`Phase 5‑6H‑5U‑K‑A` evidence commit（本条の直前提）**

## Context snapshot（前提・本条では変更しない）

- **Project：** **`m55-webv2`**
- **Production deployment（観測済）：** **`6G5HrffJ8`** — **Ready／Latest／Current**（**`5U‑K‑A`**）
- **Corrected env：** **`STRIPE_SECRET_KEY`**（**本文は SSOT に書かない**）
- **`STRIPE_WEBHOOK_SECRET`：** **`5U‑K‑A` 以降も変更していない旨として運用**（本条でも変更しない）

## Prior evidence

- `docs/ssot/M55_PHASE5_6H_5U_K_A_PRODUCTION_REDEPLOY_FOR_CORRECTED_STRIPE_SECRET_KEY_ACTIVATION_GREEN_2026-05-15.md` — **`PRODUCTION_REDEPLOY_FOR_CORRECTED_STRIPE_SECRET_KEY_ACTIVATION_GREEN`**
