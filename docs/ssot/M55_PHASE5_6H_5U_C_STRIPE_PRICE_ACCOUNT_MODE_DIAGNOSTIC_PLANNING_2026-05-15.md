# Phase 5‑6H‑5U‑C — Stripe Price ID／account／mode mismatch diagnostic planning gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5U‑C — Stripe Price ID／account／mode mismatch diagnostic planning gate**

---

## 2. 現在地

- **`5S‑A`：** Vercel Production **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** 追加 **GREEN**
- **`5T‑A`：** Production redeploy **env 活性化 GREEN**
- **`5U`（planning）：** **`READY_FOR_CHECKOUT_CREATION_CONTROLLED_EXECUTION_GATE`**
- **`5U‑B`：** **`CHECKOUT_CREATION_CONTROLLED_PRICE_NOT_FOUND_BLOCKED`** — **missing env は再発せず**、**`No such price`**（redacted **`price_****U3hF`**）で停止、**`checkout.stripe.com` 未到達**、**payment 未完了**、**フル ID は SSOT に未記録**
- **本条（`5U‑C`）：** **docs-only planning**。**Stripe／Vercel／`env` を変更しない。**

---

## 3. 診断仮説（`5U‑D` で人手により切り分け）

- **`STRIPE_PRICE_DTR_CORE_STATIC_V1` に誤った Price ID が入っている**
- **Price ID の typo／切り捨て／前後空白**
- **Test／Live のモード不一致**
- **Stripe アカウント不一致**（Price を作ったアカウントと **`STRIPE_SECRET_KEY` のアカウントが異なる**）
- **Production の `STRIPE_SECRET_KEY` が、当該 Price（**`price_****U3hF`**）を参照できないアカウント／キー**
- **Price が inactive／削除済／キーから見えない状態**
- **`DTR_CORE_STATIC_V1` レーンと設定 Price のプロダクト／金額／通貨／one-time の整合ズレ**

---

## 4. 本条（**`5U‑C`**）での判定

**`READY_FOR_STRIPE_PRICE_ACCOUNT_MODE_DIAGNOSTIC_EXECUTION_GATE`**

**実診断（Stripe／Vercel 画面での照合・変更）**は **本条コミット後の別明示 GO** かつ **Phase `5U‑D`** のみで実施する。

---

## 5. 診断時の redaction rule（`5U‑D` 以降も継続）

- **Full Price ID：** **SSOT／AI／Cursor に書かない**
- **`STRIPE_SECRET_KEY`／`whsec`／`sk_live` 等：** **フル値を記録・貼付しない**
- **Session／PI／customer／email／client_reference：** **フル値を記録しない**
- **スクリーンショット：** **secret／フル ID が写らない、またはマスクした場合のみ** repo 検討（**原則本文は redacted テキスト**）
- **必要なら** **`sk_live_****XXXX`** のような **末尾のみ**の言及に留める
- **Secrets を AI／チャット／SSOT にペーストしない**

---

## 6. 本条（**`5U‑C`**）での未実行事項

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
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No full IDs recorded

---

## 7. Next

- **Phase 5‑6H‑5U‑D — Stripe Price／account／mode human diagnostic execution**（**read-only／人手 UI 確認が中心**。**誤った `env` 値を発見しても `5U‑D` 内では変更しない**。）
- **Phase 5‑6H‑5U‑E（案）— Vercel `env` 修正ゲート**：**値の是正が必要になった場合**、**変更は `5U‑E` に分離**する。

---

## 人間が **`5U‑D`** で確認する候補（チェックリスト）

### A. Stripe Dashboard（Live）

- **対象 Price が Live に存在するか**
- **Price が active か**
- **Product／amount／currency／one-time が期待と整合するか**
- **Price ID の末尾が redacted 記録 **`price_****U3hF`** と整合するか**（**フル ID は SSOT に書かない**）

### B. Vercel（**`m55-webv2`**）Production Environment Variables

- **`STRIPE_PRICE_DTR_CORE_STATIC_V1` が意図した Price ID か**（**フル値は画面から SSOT へコピーしない**）
- **コピー typo／truncation／余計な空白がないか**（**比較は人間の画面操作のみ**）
- **Production に設定されているか**（Preview のみ、等の取り違えがないか）

### C. Vercel Production **`STRIPE_SECRET_KEY`**

- **`STRIPE_SECRET_KEY` が、当該 Price を保持する Stripe Live アカウントのものか**（**フル secret は記録しない**）
- **Test key／別アカウント／旧キーでないか**（**Dashboard 上の表示・末尾 redacted のみで手記録可**）

### D. Stripe account／mode

- **Price と Secret key が同一 Stripe アカウントか**（UI 上の一致確認）
- **Live／Test の一致**
- **Dashboard のアカウント表示・モード表示**で人手が突き合わせる

---

## Repo reference（read-only・本条では変更なし）

| 項目 | 参照 |
|------|------|
| **product → env** | **`DTR_CORE_STATIC_V1` → `STRIPE_PRICE_DTR_CORE_STATIC_V1`**（`PurchaseButton`／`app/api/purchase/checkout/route.ts` の `PRODUCT_ID_TO_ENV`） |
| **Price 解決** | `process.env[STRIPE_PRICE_DTR_CORE_STATIC_V1]` → `stripe.checkout.sessions.create({ line_items: [{ price: priceId }] })` |
| **missing env** | `priceId` 未定時 400／`missing env` メッセージ（**`5U‑B` では再発せず** → **値は読めている**方向） |

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5U‑B`：** commit **`b00a8f1614bb8b5ddf79357d2b67ab66f813e629`** — `docs: record checkout price not found blocked finding`
- **Vercel Project：** **`m55-webv2`**
