# Phase 5‑6H‑5X‑B — Batch live payment planning gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5X‑B — Batch live payment planning gate**

---

## 2. 現在地

- **`5U‑L‑A`：** **`CHECKOUT_CREATION_CONTROLLED_RETRY_AFTER_SECRET_KEY_REDEPLOY_GREEN`**
- **`5V`：** **`READY_FOR_PHASE_5_6H_5W_LIVE_PAYMENT_EXECUTION_PLANNING_GATE`**
- **`5W`：** **`READY_FOR_PHASE_5_6H_5X_LIVE_PAYMENT_EXECUTION_GATE`**
- **`5X`：** **`LIVE_PAYMENT_EXECUTION_BLOCKED`**／**未実施**／**Payment attempt count：** **0**
- **`5X-A`：** **`LIVE_PAYMENT_DEFERRED_BLOCKED_EVIDENCE_CHECKPOINT_GREEN`**（evidence commit **`cf5e858587f240e57b51c3fc590a1495704cd16b`**）
- **Product recap：** **M55 デジタル鑑定レポート (Standard)**／**¥1,000**（**Checkout 到達履歴**）
- **Payment completed：** **no**
- **Live payment：** **未実行**
- **Webhook fulfillment：** **未証明**
- **Entitlement／DB grant：** **未証明**
- **Refund／rollback：** **未実行**

---

## 3. この Gate の目的

- **後日、実金決済検証を「まとめて」実施する場合の順序・境界・証跡ルールを SSOT に固定する。**
- **本条（5X‑B）では実決済を実行しない（docs-only）。**
- **¥1,000 DTR 本体と ¥500 追加返書券は、同一作業日に実施してもよいが、必ず別 Gate・別試行・別証跡として分離する。**

---

## 4. 将来の実行順序（batch 内の段階）

### A. ¥1,000 DTR base payment execution

- **Product：** **M55 デジタル鑑定レポート (Standard)**
- **Amount：** **¥1,000 JPY**
- **Human only**
- **Exactly one payment attempt**
- **No test card**
- **No API direct execution**
- **Redacted evidence only**

### B. ¥1,000 payment evidence checkpoint

- **paid／succeeded／completed 相当を redacted のみ確認**
- **フル Session／PI／customer／email は記録しない**

### C. Webhook delivery verification

- **`checkout.session.completed` の配送**
- **Production endpoint の配送成否**
- **`STRIPE_WEBHOOK_SECRET` 検証は別枠**
- **webhook 設定変更が必要なら別 Gate**

### D. Entitlement／DB read-only verification

- **DTR entitlement**
- **paid report unlock**
- **付帯 reply-ticket 付与（該当時）**
- **reply wallet／ledger（該当時）**
- **まず read-only**
- **DB 手動修正禁止**

### E. User journey verification

- **return URL**
- **paid report access**
- **DTR room／reply room の可視性**
- **余計な追加購入なし**

### F. ¥500 additional reply-ticket checkout planning

- **DTR 購入者状態が成立してから実施**
- **¥1,000 と同一 Gate に混ぜない**

### G. ¥500 additional reply-ticket payment execution

- **Product：** **additional reply-ticket**（**表記は別 SSOT で固定**）
- **Amount：** **¥500 JPY**
- **Human only**
- **Exactly one payment attempt**
- **Redacted evidence only**

### H. ¥500 reply wallet／ledger／ticket balance verification

- **reply ticket 残高の増分**
- **ledger エントリ**
- **entitlement／権利（該当時）**
- **まず read-only**
- **DB 手動修正禁止**

### I. Refund／rollback planning

- **返金するかを事前決定**
- **返金の実行は別 Gate**
- **entitlement rollback が必要なら別 Gate**

---

## 5. 重要な順序ルール

- **¥1,000 DTR 本体を先に検証する。**
- **¥500 追加返書券は、DTR entitlement／report unlock／付帯 reply-ticket 確認の後にのみ検証する。**
- **同一作業日に実施してもよいが、同一 Gate に混在させない。**
- **各支払いは別 Gate・別試行・別証跡。**
- **失敗時は再試行せず、BLOCKED として記録する。**

---

## 6. 証跡ルール

### 記録してよい項目

- **product**
- **amount**
- **success／failure**
- **おおよその timestamp**
- **redacted Stripe status**
- **return ページ結果（公開可能な要約）**

### 記録禁止

- **フル Checkout Session ID**
- **フル Payment Intent ID**
- **フル customer ID**
- **email address**
- **client_reference_id**
- **フル Price ID**
- **secret／`whsec`／key の全文**

---

## 7. 判定

**`READY_FOR_BATCH_LIVE_PAYMENT_SEQUENCE_PLANNING_COMPLETE`**

また、実際の ¥1,000 本体決済実行に進むためのゲート名として：

**`READY_FOR_PHASE_5_6H_5Y_DTR_BASE_LIVE_PAYMENT_EXECUTION_GATE`**

**実際の ¥1,000 本体 live payment は、本条コミット後の別明示 GO のみ。**

---

## 8. 未実行事項（本条で実施しない）

- No live payment in **`5X-B`**
- No payment completion
- No purchase button press
- No checkout retry
- No checkout creation
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

## 9. Next

- **`Phase 5‑6H‑5Y` — DTR base ¥1,000 live payment execution gate**
- **`5Y`：** 明示 GO 後に限り、human による ¥1,000 DTR base の **exactly one** payment attempt を許容しうる設計。
- **Post-payment の webhook／entitlement／report unlock は、引き続き後続の別 Gate に分離。**
- **¥500 追加返書券フローは、DTR base の検証が成功した後にのみ後続として計画する。**

---

## Work anchor / lineage

- **`cf5e858587f240e57b51c3fc590a1495704cd16b`** — `docs: record live payment deferred checkpoint`（**`5X-A`**）

Prior SSOT:

- `docs/ssot/M55_PHASE5_6H_5X_A_LIVE_PAYMENT_DEFERRED_BLOCKED_EVIDENCE_CHECKPOINT_2026-05-15.md` — **`LIVE_PAYMENT_DEFERRED_BLOCKED_EVIDENCE_CHECKPOINT_GREEN`**
