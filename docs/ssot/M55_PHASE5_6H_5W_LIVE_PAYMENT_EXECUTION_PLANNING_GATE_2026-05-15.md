# Phase 5‑6H‑5W — Live payment execution planning gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5W — Live payment execution planning gate**

---

## 2. 現在地

- **`5U‑L‑A`：** **`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_GREEN`**（commits **`7c4dae353000bec557f39cb4acf756c578e5b4fa`**、**`d9a1bde7cf137912d4ee6f6a490261e1b4886758`**）
- **`5V`：** **`READY_FOR_PHASE_5_6H_5W_LIVE_PAYMENT_EXECUTION_PLANNING_GATE`**（Checkout creation evidence／live payment **planning** の SSOT；**live payment 未実行**；evidence commit **`db38fe423bf5df51658b64f09346528c6733d2ce`**）
- **`checkout.stripe.com`：** **到達済み（人手観測）**
- **Product：** **M55 デジタル鑑定レポート (Standard)**
- **Amount：** **¥1,000**
- **payment：** **未完了**
- **live payment：** **未実行**
- **webhook fulfillment：** **未証明**
- **entitlement／DB grant：** **未証明**
- **`STRIPE_WEBHOOK_SECRET`：** **未変更・未検証**

---

## 3. この Gate の目的

- **本番決済実行の範囲、停止条件、証跡ルール、返金／rollback 方針を事前に固定する。**
- **本条（5W）では実決済を実行しない。**
- **実決済、webhook 確認、DB entitlement 確認、返金／rollback の実作業は後続 Gate に分離する。**

---

## 4. Live payment execution plan 案

- **Product：** **M55 デジタル鑑定レポート (Standard)**
- **Amount：** **¥1,000 JPY**
- **Execution actor：** **human only**
- **Attempt count：** **exactly one payment attempt**
- **Payment method：** **human が選ぶ有効な live 決済手段**
- **No test card**
- **No API direct execution**
- **No repeated checkout attempts**
- **Payment completion：** **後続の明示 GO の後に限る**
- **Evidence：** **redacted のみ**

---

## 5. Payment execution success evidence rules

### 記録してよい項目

- **amount：** **¥1,000 JPY**
- **product：** **M55 デジタル鑑定レポート (Standard)**
- **Stripe status：** **paid／succeeded／completed 相当の要約**
- **timestamp：** **おおよその時刻**

### 記録禁止

- **フル Checkout Session ID**
- **フル Payment Intent ID**
- **フル customer ID**
- **email address**
- **client_reference_id**
- **フル Price ID**
- **secret／`whsec`／key の全文**

### スクリーンショット

- **全面 redact した場合のみ repo に含めうる**

---

## 6. Payment failure / stop conditions

次のいずれかなら **即停止**し、**`BLOCKED` として redacted 範囲で記録**。**再試行しない。**

- Checkout ページが読み込まない
- Payment が失敗する
- 想定外の金額／商品
- 想定外の通貨
- 想定外のユーザー／メール表示
- 想定外の webhook 失敗
- **二重課金リスク**
- アプリが致命的エラーを返す
- payment 後も entitlement が現れない
- **二重課金の不確実性がある**

---

## 7. Post-payment gates（分離）

### A. Stripe payment evidence checkpoint

- **paid／succeeded 状態の redacted 確認のみ**
- **フル ID は記録しない**

### B. Webhook delivery verification gate

- **`checkout.session.completed` の到達**
- **Production endpoint への成功／失敗**
- **`STRIPE_WEBHOOK_SECRET` 検証状況**
- **webhook secret の変更が必要なら別 Gate**

### C. Entitlement / DB read-only verification gate

- **DTR entitlement の有無**
- **レポートアクセス unlock**
- **reply ticket／wallet 付与（期待どおりか）**
- **まず read-only**
- **手動の DB mutation は禁止**

### D. User journey verification gate

- **return URL の結果**
- **paid report ページアクセス**
- **DTR room／reply room の可視性**
- **余計な追加購入なし**

### E. Refund / rollback gate

- **返金するかを事前に決める**
- **返金操作は別 Gate**
- **entitlement rollback が必要なら別 Gate**
- **別途承認なしに DB を手で patch しない**

---

## 8. 5W での判定

**`READY_FOR_PHASE_5_6H_5X_LIVE_PAYMENT_EXECUTION_GATE`**

**実際の本番決済は、本条（5W）コミット後の別明示 GO のみ。**

---

## 9. 未実行事項（本条で実施しない）

- No live payment in **`5W`**
- No payment completion
- No card／payment wallet execution
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
- No Production DB reads／writes
- No **`POST`／`PUT`／`PATCH`／`DELETE`**
- No **`/api/stripe/*`** direct execution
- No full IDs recorded

---

## 10. Next

- **`Phase 5‑6H‑5X` — Live payment execution gate**
- **`5X`：** 明示 GO のもと、human による live payment を **exactly one attempt** に限定しうる設計。Post-payment の webhook／DB／アクセス検証は、さらに後続 Gate に分離する。

---

## Work anchor / lineage

- **`db38fe423bf5df51658b64f09346528c6733d2ce`** — `docs: plan live payment after checkout creation evidence`（**`5V`**）
- **`7c4dae353000bec557f39cb4acf756c578e5b4fa`**, **`d9a1bde7cf137912d4ee6f6a490261e1b4886758`** — **`5U‑L‑A`**

Prior SSOT:

- `docs/ssot/M55_PHASE5_6H_5V_CHECKOUT_CREATION_EVIDENCE_LIVE_PAYMENT_PLANNING_2026-05-15.md` — **`READY_FOR_PHASE_5_6H_5W_LIVE_PAYMENT_EXECUTION_PLANNING_GATE`**
