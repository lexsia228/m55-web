# Phase 5‑6H‑5X‑A — Live payment deferred / blocked evidence checkpoint (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5X‑A — Live payment deferred / blocked evidence checkpoint**

---

## 2. 現在地

- **`5U‑L‑A`：** **`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_GREEN`**
- **`5V`：** **`READY_FOR_PHASE_5_6H_5W_LIVE_PAYMENT_EXECUTION_PLANNING_GATE`**（Checkout creation evidence／live payment planning）
- **`5W`：** **`READY_FOR_PHASE_5_6H_5X_LIVE_PAYMENT_EXECUTION_GATE`**
- **`5X`：** **`LIVE_PAYMENT_EXECUTION_BLOCKED`**／**未実施**（evidence commit **`70ea18520ace01aa1c66e76f0ec99548ccc91f77`**）
- **Payment attempt count：** **0**
- **Product recap：** **M55 デジタル鑑定レポート (Standard)**
- **Amount：** **¥1,000**
- **Payment completed：** **no**
- **Live payment：** **未実行**
- **Webhook fulfillment：** **未証明**
- **Entitlement／DB grant：** **未証明**
- **Refund／rollback：** **未実行**

---

## 3. Deferred decision（ユーザー方針）

- **実金フロー検証（actual money-flow testing）は延期する。**
- **後日、次の両方を検証する意向がある：**
  - **A. ¥1,000 ベース DTR（本体レポート）の live payment**
  - **B. ¥500 追加の返書券（reply-ticket）の live payment**
- **A と B を同一の「一回の実行 Gate」にまとめてはならない。**
- **同日に実施する場合でも、各支払いごとに Gate・試行・証跡・支払後検証を分離する。**

---

## 4. Required future order（必須の順序）

1. **A. ¥1,000 DTR 本体レポートの live payment 実行**（**専用 Gate**）
2. **B. Stripe payment evidence checkpoint**（redacted のみ）
3. **C. Webhook delivery verification**
4. **D. Entitlement／DB read-only verification**
5. **E. Paid report unlock／DTR アクセス検証**
6. **F. 付帯 reply-ticket 付与の検証（該当する場合）**
7. **G. ¥500 追加返書券の Checkout／商品設計の planning Gate**
8. **H. ¥500 追加返書券の payment 実行**（**DTR 購入者状態が確認できた後・別試行**）
9. **I. ¥500 返書 wallet／ledger／チケット残高の検証**
10. **J. 必要なら Refund／rollback Gate**

---

## 5. Important rationale

- **¥500 追加返書券フローは DTR 購入者状態に依存する。**
- **ベース DTR の entitlement／レポート access を確認する前に ¥500 を先に試すと、失敗原因の切り分けが曖昧になる。**
- **したがって ¥1,000 本体 DTR を先に検証しなければならない。**
- **¥500 は DTR entitlement／report access 検証の後にのみ試験する。**

---

## 6. 判定

**`LIVE_PAYMENT_DEFERRED_BLOCKED_EVIDENCE_CHECKPOINT_GREEN`**

（**5X の BLOCKED／未実施と延期方針を SSOT に正しく固定したことの証跡**。**本条で決済を完了したことを意味しない。**）

---

## 7. 未実行事項（本条で実施しない）

- **5X‑A では live payment なし**
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
- No Production DB reads／writes
- No refund／rollback
- No **`/api/stripe/*`** direct execution
- No full IDs recorded

---

## 8. Next

- **`Phase 5‑6H‑5X‑B` — Batch live payment planning gate**
- **`5X‑B`** **で後日の同日マネーフロー試験シーケンスを計画する：** **¥1,000 DTR 本体を先** → **支払後 webhook／entitlement／レポート unlock 確認** → **続けて ¥500 追加返書券**。** **各段は別 Gate・別試行・別証跡。**
- **実際の payment 実行は、さらに後続の明示 GO まで禁止。**

---

## Work anchor / lineage

- **`70ea18520ace01aa1c66e76f0ec99548ccc91f77`** — `docs: record live payment execution`（**`5X`**）

Prior SSOT:

- `docs/ssot/M55_PHASE5_6H_5X_LIVE_PAYMENT_EXECUTION_2026-05-15.md` — **`LIVE_PAYMENT_EXECUTION_BLOCKED`**（**未実施**／**attempt 0**）
