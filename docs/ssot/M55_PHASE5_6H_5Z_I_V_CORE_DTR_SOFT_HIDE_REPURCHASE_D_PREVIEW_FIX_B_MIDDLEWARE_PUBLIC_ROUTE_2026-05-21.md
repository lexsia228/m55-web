# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FIX-B — Hide API middleware public route（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FIX-B** |
| **Title** | **Hide API middleware public route fix** |
| **Classification** | **Category 1 / middleware fix / no-deploy** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PREVIEW_FIX_B_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FIX-B-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **D-PREVIEW-FIX-A** — `CLERK_PROTECT_REWRITE` diagnosed（route not missing） |
| **Branch** | **`work/home-cluster`** |

**No Production deploy · no `main` push · no live checkout · no DB write · no env change · no VERIFY-C.**

---

## B. Problem（FIX-A）

| Item | Value |
|------|--------|
| **Symptom** | Unauthenticated `POST /api/dtr/report-snapshot/hide` → **404 HTML** |
| **Headers** | `x-matched-path: /404` · `x-clerk-auth-reason: protect-rewrite, dev-browser-missing` |
| **Reference** | `GET /api/dtr/report-snapshot-ready` → **401 JSON**（public middleware + handler `auth()`） |
| **Root cause** | Hide route **not** in `isPublicRoute` → `auth.protect()` before handler |

Route file **`app/api/dtr/report-snapshot/hide/route.ts`** exists；handler returns **401 JSON** when `!userId`.

---

## C. Fix

| File | Change |
|------|--------|
| `middleware.ts` | Add **`'/api/dtr/report-snapshot/hide'`** to `isPublicRoute` |

**Unchanged:** hide business logic · `/my` delete UI · checkout repurchase lane · fulfillment · DB · env · Stripe / Clerk dashboard.

**Auth model（aligned with `report-snapshot-ready`）:**

- Middleware: allow through（public list entry）
- Handler: `auth()` → **401** `{ code: 'unauthorized' }` when signed out
- Signed-in business **404**: `{ code: 'no_visible_snapshot' }` JSON only

---

## D. Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **pass** |
| `npx tsx --test lib/m55/hideDtrReportSnapshot.test.ts` | **9/9 pass** |
| `git diff --check` | **pass** |
| Local smoke `POST …/hide`（no session） | **401** · `application/json` · `{"code":"unauthorized"}` |
| **404 HTML** on unauth probe | **resolved**（local） |

**No** raw user_id · email · session · secret in SSOT or logs.

---

## E. No-mutation

| Action | Status |
|--------|--------|
| Production deploy | **no** |
| `main` push | **no** |
| live checkout / payment / webhook | **no** |
| Production DB write / SQL | **no** |
| env / Stripe / Clerk dashboard | **no** |
| snapshot UPDATE/DELETE / entitlement delete | **no** |
| VERIFY-C | **no** |

---

## F. Next gate

| Gate | Action |
|------|--------|
| **D-PREVIEW-FIX-B-R** | Push → branch preview redeploy → unauth `POST …/hide` **401 JSON** on preview |
| **D-PREVIEW-R** | Human signed-in `/my` delete smoke |

---

## G. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | FIX-B middleware public route + local 401 smoke |
