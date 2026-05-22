# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-FULFILL-R — Fulfillment repurchase INSERT result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-FULFILL-R** |
| **Title** | **Fulfillment repurchase INSERT — result recording** |
| **Classification** | **Category 1 / implementation result / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_FULFILL_GREEN_NO_DEPLOY_NO_LIVE_CHECKOUT`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-FULFILL-R-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **D-CHECKOUT-COMMIT** @ **`285e963`** · **D-MY** @ **`750d7c8`** · **D-API** @ **`a85942d`** |
| **Git baseline** | **`work/home-cluster` @ `285e963`** |
| **Code status** | **Implemented in workspace** · pending **`D-FULFILL-COMMIT`** |

**Fulfillment repurchase INSERT path complete.** **No live checkout in this gate.**

---

## B. Implementation summary

| Item | Status |
|------|--------|
| **`upsertDtrReportSnapshotAtFulfillment` dedupe** | **Visible-only** (`getVisibleDtrReportSnapshot`) |
| **Hidden-only repurchase** | **Continues INSERT** — prior hidden rows **unchanged** |
| **Visible exists** | Returns existing **`snapshotId`** — **no** INSERT |
| **23505 recovery** | Rereads **`getVisibleDtrReportSnapshot`** only |
| **`grantInitialIncludedReplyIfNeeded`** | **Idempotent** on repurchase（no second included grant） |
| **Reply wallet** | Active wallet **relinks** to new **`report_instance_id`**（not `null`-only filter） |
| **Log** | `dtr_snapshot_repurchase_fulfillment_insert` when hidden-only prior rows |

---

## C. Decision table（attested）

| Prior DB state | Fulfillment snapshot action |
|----------------|---------------------------|
| **Visible snapshot** | Skip INSERT · return existing id |
| **Hidden-only** | **INSERT** new visible row |
| **No rows** | INSERT (unchanged first-purchase path) |

---

## D. Changed files（D-FULFILL implementation）

| File | Role |
|------|--------|
| `lib/m55/dtrDraftDb.ts` | Visible-only dedupe + repurchase INSERT |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | Wallet relink on new snapshot |
| `lib/m55/dtrFulfillmentRepurchaseInsert.test.ts` | Contract tests |
| `lib/m55/dtrDraftDb.visible.test.ts` | Fulfillment dedupe assertion update |

**Not changed:** Stripe webhook replay · env · deploy · checkout route · hide API · `/my` UI.

---

## E. Test attestation

| Command | Result |
|---------|--------|
| `npx tsx --test lib/m55/dtrFulfillmentRepurchaseInsert.test.ts lib/m55/dtrDraftDb.visible.test.ts lib/m55/dtrCheckoutRepurchaseLane.test.ts` | **23/23 pass** |
| `npx tsc --noEmit` | **pass** |
| `git diff --check` | **pass** |

---

## F. No-mutation statement

| Action | Status |
|--------|--------|
| **live checkout** / payment / webhook replay | **no** |
| deploy / env / manual Production DB write | **no** |
| existing snapshot body UPDATE | **no** |
| entitlement deletion | **no** |
| **VERIFY-C** | **no** |

---

## G. Next gates

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-FULFILL-COMMIT** | Commit D-FULFILL code + this result SSOT |
| **D-PREVIEW-R** / **D-PROD-DEPLOY** | App deploy（別 Human GO） |

---

## H. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | D-FULFILL-R result post implementation |
