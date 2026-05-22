# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-MY-R — `/my` delete UI result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-MY-R** |
| **Title** | **My Page saved report delete UI — result recording** |
| **Classification** | **Category 1 / implementation result / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_MY_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-MY-R-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **D-API-COMMIT** @ **`a85942d`** · **D-READ-COMMIT** @ **`61a1a9d`** |
| **Git baseline (API)** | **`work/home-cluster` @ `a85942d`** |
| **Code status** | **Implemented in workspace** · pending **`D-MY-COMMIT`** |

**`/my` delete UI layer complete.** **Checkout repurchase lane, fulfillment INSERT policy, deploy — not in this gate.**

---

## B. Implementation summary

| Item | Status |
|------|--------|
| **`dtrSavedReportDeleteCopy.ts`** | **Implemented** — §B1.3 verbatim dialog + toast |
| **`SavedReportDeleteDialog`** | **Implemented** — portal modal · キャンセル / 削除する |
| **`MyPanel` delete button** | **Implemented** — text **削除** on core saved-report row |
| **Display condition** | **`snap.ready === true`** (`canOpenCore`) only |
| **Hide API call** | **`POST /api/dtr/report-snapshot/hide`** · `credentials: include` |
| **Success path** | Close dialog · refetch **`report-snapshot-ready`** · toast 6s |
| **409 `already_hidden`** | **Idempotent** — refetch + toast (no second user error) |
| **Failure** | Generic error copy · **no** raw snapshot id in UI |

---

## C. User copy attestation

| Surface | Canonical |
|---------|-----------|
| **Dialog title** | この保存版を削除しますか？ |
| **Confirm** | 削除する |
| **Toast primary** | 保存版を削除しました。 |
| **Trigger** | 削除 |

**Forbidden words absent from user-facing strings:** **非表示** · **元に戻す** · **再表示**

---

## D. Changed files（D-MY implementation）

| File | Role |
|------|--------|
| `lib/m55/dtrSavedReportDeleteCopy.ts` | SSOT copy constants |
| `lib/m55/dtrSavedReportDeleteCopy.test.ts` | Copy + wiring tests |
| `components/my/SavedReportDeleteDialog.tsx` | Confirmation dialog |
| `components/my/SavedReportDeleteDialog.module.css` | Dialog surface styles |
| `components/my/MyPanel.tsx` | Delete trigger · API · toast |
| `components/my/MyPanel.module.css` | Delete button + toast styles |

**Not changed:** `app/api/purchase/checkout/route.ts` repurchase lane · fulfillment · env · deploy.

---

## E. Test attestation

| Command | Result |
|---------|--------|
| `npx tsx --test lib/m55/dtrSavedReportDeleteCopy.test.ts` | **5/5 pass** |
| `npx tsc --noEmit` | **pass** |
| `git diff --check` | **pass** |

---

## F. Acceptance criteria

| Criterion | Met |
|-----------|-----|
| User can initiate 削除 from `/my` when saved report ready | **yes**（runtime when deployed） |
| Internal action uses hide API only | **yes** |
| No forbidden user copy | **yes** |
| No deploy in gate | **yes** |
| No checkout repurchase / fulfillment change | **yes** |

---

## G. No-mutation statement

| Action | Status |
|--------|--------|
| deploy / redeploy | **no** |
| env change | **no** |
| manual Production DB write | **no** |
| checkout repurchase lane | **no** |
| fulfillment INSERT policy change | **no** |
| snapshot body UPDATE/DELETE | **no** |
| entitlement deletion | **no** |
| **VERIFY-C** | **no** |

---

## H. Next gates

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-MY-COMMIT** | Commit D-MY code + this result SSOT |
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-CHECKOUT** | Repurchase lane（別 Human GO） |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | D-MY-R result post implementation |
