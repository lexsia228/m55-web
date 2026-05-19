# Phase 5‑6H‑5U‑A — Checkout creation controlled execution (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑A — Checkout creation controlled execution**

---

## 2. 実行範囲

- **Production の購入ボタンを 1 回だけ**押下する試行（**連打禁止**）。
- **Stripe Checkout Session の作成**および **`checkout.stripe.com` への到達**のみを確認する。
- **支払い完了は行わない。**
- **webhook／`env`／Production DB の意図的変更は行わない。**

---

## 3. 実行結果（本条コミット）

**本コミットは Cursor／repo から Production ブラウザ操作を実行・検証しない。** **人手による 1 回押下～`checkout.stripe.com` 到達の一次証跡は、本コミットでは SSOT に載せないため、判定は **`CHECKOUT_CREATION_CONTROLLED_EXECUTION_BLOCKED`**（**未検証／証跡未取り込み**）。**Human が既に条件を満たしている場合は、本文書 §3 の箇条書きを差し替え、判定を **`CHECKOUT_CREATION_CONTROLLED_EXECUTION_GREEN`** に更新する別コミットとする。**

**採用（本条 — BLOCKED 分岐）：**

- **Purchase button clicked once：** **本コミットでは確認できない**（agent 未実施）。
- **observed error：** **未報告**（Production UI からの一次メッセージは本条未掲載）。
- **checkout.stripe.com reached：** **unknown**（**本コミット未検証**）。
- **missing env recurrence：** **unknown**（**`5U-A` の人手試行が本条に紐づけられていない**）。
- **stopped without retry：** **yes**（**repo 側に再試行ログなし**／**連打は行わない方針**）。
- **Payment not completed / カード・ウォレット実決済：** **agent は実施せず。本条は「禁止事項遵守」を前提に記録のみ。**

**成功分岐の記録テンプレ（Human 証跡取り込み時に使用）：**

- Purchase button clicked **once**
- **Missing env エラーが再発しなかった**（または **missing env は観測されなかった**）
- **checkout.stripe.com reached: yes**
- **Checkout ページ表示: yes**
- **支払い未完了**／タブ閉じ／戻る
- **フル Checkout Session／Payment Intent／customer 相当 ID／email／client_reference は SSOT に書かない**

---

## 4. 証跡ルール

- **スクリーンショット可**（**Session／PI／個人IDが写る場合はマスク**）。
- **フル Checkout Session ID／Payment Intent ID／customer／email／client_reference_id は記録しない。**
- **Stripe Price ID：** **redacted のみ **`price_****U3hF`。**
- **secret／`whsec`／`sk_live` 等のフル値は扱わない。**

---

## 5. 判定

**`CHECKOUT_CREATION_CONTROLLED_EXECUTION_BLOCKED`**

（**Production 上の controlled execution の結果が、本条コミット時点で repo に取り込まれていない**ことを意味する。**`GREEN`** は **Human 証跡を §3 に反映した別コミット**で確定する。）

---

## 6. 本条での未実行事項

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
- No **`/api/stripe/*`** direct execution（ブラウザ導線以外）
- No purchase button spam
- No full IDs recorded

---

## 7. Next

- **`CHECKOUT_CREATION_CONTROLLED_EXECUTION_GREEN` 確定後：** **Phase 5‑6H‑5V — Checkout creation evidence checkpoint／live payment planning gate**
- **`5V`：** **Checkout 作成・到達の証跡を固定**し、**live payment** は **さらに後続の別 Gate** に分離する。
- **`BLOCKED` のままの場合：** **Human が `5U-A` の手順を実施し、redacted 証跡を §3 に反映してから `5V` へ。**

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5U`（planning）：** commit **`3112d6871ce846170a5b7dc89b2bc8d149b9014a`** — `docs: plan checkout creation controlled gate`
- **Vercel Project：** **`m55-webv2`**
- **前提：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** 活性化（redacted **`price_****U3hF`** のみ）。
