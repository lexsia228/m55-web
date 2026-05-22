# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FIX-C — Hidden-only UX（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FIX-C** |
| **Title** | **Post-delete hidden-only `/dtr/core` loader UX fix** |
| **Classification** | **Category 1 / routing fix / no-deploy** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PREVIEW_FIX_C_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FIX-C-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **D-PREVIEW-R2** — delete OK；`/dtr/core` loader stuck on hidden-only |
| **Branch** | **`work/home-cluster`** |

**No Production deploy · no `main` push · no live checkout · no DB write · no env change · no VERIFY-C.**

---

## B. Problem（D-PREVIEW-R2）

| Item | Value |
|------|--------|
| **State** | owned + **no visible** snapshot + **hidden** row(s) after user **削除** |
| **Symptom** | `/dtr/core` → `/dtr/processing?recovery=owned` → **「保存版を確認しています」** indefinite poll |
| **Root cause** | `DtrProcessingClient` polls until `hasPurchaseSnapshot` (visible-only) — never true after soft-hide |
| **Not** | Route missing · hide API failure |

---

## C. Fix summary

| File | Change |
|------|--------|
| `lib/m55/dtrShelfAccess.ts` | `isDtrOwnedHiddenOnlyState` · hidden-only → `showPurchaseCta: true` · `lpCtaMode: purchase` · `DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH` |
| `app/dtr/core/page.tsx` | hidden-only → redirect **`/dtr/lp`** (not owned-recovery) |
| `app/dtr/processing/page.tsx` | owned-recovery branch: hidden-only → **`/dtr/lp`** |
| `components/dtr/DtrProcessingClient.tsx` | owned poll: `showPurchaseCta` → stop poll · redirect **`/dtr/lp`** |

**Expected UX:** No indefinite loader；repurchase path on LP；`/my` card absent unchanged；no second delete in gate.

**Unchanged:** hide API · `/my` delete UI · checkout lane · fulfillment · DB · env.

---

## D. Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **pass** |
| `git diff --check` | **pass** (at commit) |

**No** raw user_id · email · session · secret in SSOT.

---

## E. No-mutation

| Action | Status |
|--------|--------|
| Production deploy / main push | **no** |
| live checkout / payment / webhook | **no** |
| DB write / manual SQL | **no** |
| env change | **no** |
| second delete | **no** |
| VERIFY-C | **no** |

---

## F. Next gate

| Gate | Action |
|------|--------|
| **D-PREVIEW-FIX-C-R** | Preview redeploy → post-delete `/dtr/core` → **`/dtr/lp`** (no loader loop) |
| **D-PREVIEW-R** | Human signed-in flows as scoped |

---

## G. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | FIX-C hidden-only redirect to LP |
