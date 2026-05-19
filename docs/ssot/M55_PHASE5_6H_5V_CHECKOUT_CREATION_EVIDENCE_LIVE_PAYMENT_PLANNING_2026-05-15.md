# Phase 5‑6H‑5V — Checkout creation evidence checkpoint / live payment planning gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5V — Checkout creation evidence checkpoint / live payment planning gate**

---

## 2. 現在地

- **`5U‑L‑A`：** **`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_GREEN`**（evidence commits **`7c4dae353000bec557f39cb4acf756c578e5b4fa`**、**`d9a1bde7cf137912d4ee6f6a490261e1b4886758`**）
- **`checkout.stripe.com`：** **到達済み（人手観測）**
- **Product：** **M55 デジタル鑑定レポート (Standard)**
- **Amount：** **¥1,000**
- **payment：** **未完了**
- **webhook fulfillment：** **未証明**
- **entitlement／DB grant：** **未証明**
- **`STRIPE_WEBHOOK_SECRET`：** **`5U‑L‑A` において未変更。本条（5V）でも変更しない。署名検証の運用確認は本条では行わない。**

---

## 3. 5U‑L‑A 証跡再掲

- **Production purchase button：** **clicked exactly once**
- **`missing env` 再発：** **no**
- **`No such price` 再発：** **no**
- **test mode key 系エラー再発：** **no**（人手で読んだ表示範囲）
- **`checkout.stripe.com` reached：** **yes**
- **Checkout page loaded：** **yes**
- **`Payment completed`：** **no**
- **フル Checkout Session／Payment Intent／customer／email／client_reference_id：** **記録しない**
- **スクリーンショット：** **全面 redact しない限り repo にコミットしない**

---

## 4. 5V の目的

- **本番決済（live payment）に進む前に、計画と Gate を文書上で分離する。**
- **本条（5V）では live payment を実行しない。**

---

## 5. Live payment 前に整理すべき Gate

### A. Live payment execution gate

- **金額：** **¥1,000**
- **商品：** **M55 デジタル鑑定レポート (Standard)**
- **実施者：** **human only**
- **支払い方法：** **human が選定**
- **試行：** **1 回のみ**
- **payment 完了後：** **成功／失敗を redacted の範囲で SSOT に記録する方針を別途固定**
- **フル PI／session／customer／email：** **記録しない**

### B. Stripe webhook verification gate

- **`checkout.session.completed` が Production webhook に届くか**（到達・整合）は別 Gate で確認
- **webhook endpoint／`whsec` の実地確認は別 Gate**
- **`STRIPE_WEBHOOK_SECRET`：** **本条（5V）では変更しない**
- **webhook 設定変更が必要なら別 Gate**

### C. Entitlement / DB verification gate

- **payment 後に DTR entitlement／purchase／wallet／レポートアクセスが付与されるか**
- **Production DB の確認は別 Gate（read-only のみを計画し、手動修正・書き換えは禁止）**

### D. Refund / rollback plan

- **本番決済テスト後に返金するかを事前に決める**
- **Stripe refund 操作は別 Gate**
- **DB entitlement の rollback が必要なら別 Gate**
- **返金と DB 状態の整合は別途 SSOT に記録**

### E. User journey verification gate

- **決済後 return URL**
- **paid report access**
- **reply ticket／相談室の可視性**
- **いずれも payment 後の別 Gate**

---

## 6. 5V での判定

**`READY_FOR_LIVE_PAYMENT_PLANNING_NEXT_GATE`**

より明示的な別名（推奨ラベル）：

**`READY_FOR_PHASE_5_6H_5W_LIVE_PAYMENT_EXECUTION_PLANNING_GATE`**

---

## 7. 重要な制限

- **本条は、Checkout 作成および `checkout.stripe.com` 到達の証跡整理に限定する。**
- **live payment の成功を証明しない。**
- **webhook の fulfillment を証明しない。**
- **entitlement／DB 付与を証明しない。**
- **レポート unlock を証明しない。**
- **Live payment の実行は 5V より後の明示 GO のみ。**

---

## 8. 未実行事項（本条で実施しない）

- No live payment
- No payment completion
- No purchase button retry
- No checkout retry
- No Stripe webhook changes
- No webhook replay
- No **`STRIPE_WEBHOOK_SECRET`** change
- No env／`whsec`／secret changes
- No Supabase changes
- No Vercel setting changes
- No additional redeploy
- No runtime／code／UI changes
- No Production DB reads／writes unless explicitly planned later in a separate gate
- No `POST`／`PUT`／`PATCH`／`DELETE`（本条スコープ外）
- No **`/api/stripe/*`** direct execution
- No full IDs recorded

---

## 9. Next

- **`Phase 5‑6H‑5W` — Live payment execution planning gate**
- **`5W`：** **まず docs-only。** **実際の live payment 実行は、金額・利用者・カード／決済手段・返金／ロールバック・webhook／DB 証跡ルールを文書化したうえでの、後続の明示 GO のみ。**

---

## Context snapshot

- **Project：** **`m55-webv2`**
- **Production deployment：** **Ready／Current**（本条では deployment id を新規に固定しない）

---

## Work anchor / evidence lineage

- **`7c4dae353000bec557f39cb4acf756c578e5b4fa`** — `docs: record checkout creation controlled retry green evidence`
- **`d9a1bde7cf137912d4ee6f6a490261e1b4886758`** — `docs: tidy redaction line in 5U-L-A checkout evidence SSOT`

Prior SSOT:

- `docs/ssot/M55_PHASE5_6H_5U_L_A_CHECKOUT_CREATION_CONTROLLED_RETRY_GREEN_EVIDENCE_2026-05-15.md` — **`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_GREEN`**
