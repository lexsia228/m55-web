# Phase 5‑6H‑5Z‑A0 — Evidence Registry / AI-safe identifier protocol checkpoint (2026‑05‑16 SSOT)

## 1. Phase名

**Phase 5‑6H‑5Z‑A0 — Evidence Registry / AI-safe identifier protocol checkpoint**

---

## 2. Reason

- **live payment／Stripe／Vercel／将来の Supabase read-only にまたがる証跡が増えた。**
- **AI／Cursor が同一証跡を `evidence_id` で参照できるようにし、フル機密 ID を SSOT に置かない。**
- **本条は docs-only。`Phase 5-6H-5Z-A` の実診断はまだ開始しない。**

---

## 3. 採用 Protocol

Canonical SSOT：**`docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md`**

概要：

- **ID 形式：** **`M55-EVID-YYYYMMDD-PHASE-SOURCE-KIND-NNN`**
- **registry schema／redaction／fingerprint／state／運用規則** は同 Protocol に従う。

---

## 4. Work anchor / prior

- **`73d43824ccb156997caceade0fb778b1dbf37ba8`** — `docs: plan post payment fulfillment diagnostic`（**`Phase 5-6H-5Z`**）

Prior：**`READY_FOR_POST_PAYMENT_FULFILLMENT_READ_ONLY_DIAGNOSTIC_EXECUTION_GATE`**

---

## 5. 5Y‑A seed evidence IDs（再掲・フル ID なし）

| evidence_id |
|-------------|
| `M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001` |
| `M55-EVID-20260516-5Y-A-STRIPE-EVENT-001` |
| `M55-EVID-20260516-5Y-A-STRIPE-LOG-001` |
| `M55-EVID-20260516-5Y-A-VERCEL-PROCESSING-001` |
| `M55-EVID-20260516-5Y-A-M55-UI-001` |

詳細は Protocol §8。**フル Stripe／checkout／customer／email／event／request ID は記録しない。**

---

## 6. 判定

**`EVIDENCE_REGISTRY_PROTOCOL_GREEN`**

---

## 7. 未実行事項（本条スコープ外）

- **Production DB の read-only 診断（`Phase 5-6H-5Z-A` を含む）**: **本条では未実行**
- **webhook replay**
- **Stripe webhook 変更、`STRIPE_WEBHOOK_SECRET` 変更、env／secret 変更**
- **DB writes**
- **runtime／code／UI 変更**
- **返金／rollback**
- **再決済**
- **フル ID の記録**

---

## 8. Next

- **`Phase 5-6H-5Z-A`** — **Post-payment fulfillment read-only diagnostic execution**
- **Phase 5-6H-5Z-A は `evidence_id` と redacted 参照のみで証跡を追う。** **フル ID は SSOT に保存しない。**
