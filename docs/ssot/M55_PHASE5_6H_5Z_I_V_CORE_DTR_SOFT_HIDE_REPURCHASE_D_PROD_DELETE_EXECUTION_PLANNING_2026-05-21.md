# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DELETE-EXECUTION-PLANNING — Production delete planning（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DELETE-EXECUTION-PLANNING** |
| **Title** | **Production saved report delete execution planning** |
| **Classification** | **Category 1 / docs-only / no-delete** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PROD_DELETE_EXECUTION_PLANNING_GREEN_READY_FOR_EXECUTION_PENDING_HUMAN_GO`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DELETE-EXECUTION-PLANNING-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **D-CLOSE-PARTIAL-READY** · **D-PROD-DEPLOY-EXECUTION** @ **`0e9597c`** · DB **C-D-R** |

**No Production delete in this gate · no live checkout · no payment · no webhook · no DB SQL · no env change · no VERIFY-C.**

---

## B. Target readiness

| Requirement | Status |
|-------------|--------|
| **Production app** | **`https://m55-webv2.vercel.app`** @ **`0e9597c`** |
| **DB schema** | **`user_hidden_*`** + visible-only partial unique **active**（C-D-R） |
| **Hide API + `/my` UI** | deployed |
| **Account** | **visible saved report MUST exist at EXECUTION time** |
| **Human confirms** | target row is **approved for delete** on Production |
| **Prior cancel-only R** | dialog/cancel **GREEN** @ `a239d27`（session may differ later） |
| **DTR-CORE supplemental** | **N/A** @ `f24b5dc` — do **not** use unpurchased account |

**Readiness verdict:** **READY_FOR_EXECUTION** when Human attests **current** visible row + delete approval — **not** inferable from DTR-CORE N/A alone.

---

## C. Irreversibility（Human lock）

| Item | Policy |
|------|--------|
| **User action** | UI label **削除** — sets `user_hidden_at` only |
| **Hard DELETE** | **forbidden** in app |
| **Undo in UI** | **none** — repurchase creates **new** visible row |
| **DB rollback** | **not planned** — hide columns remain for audit |
| **Entitlements / Stripe** | **retained** |

**EXECUTION is one-way for user-visible report access.**

---

## D. Expected result（EXECUTION — all required for GREEN）

| # | Expectation |
|---|-------------|
| **E1** | `/my` — saved report **card visible** before delete |
| **E2** | **削除** button visible |
| **E3** | Dialog title: **`この保存版を削除しますか？`** |
| **E4** | Dialog body materially matches §B1.3: 運営上保持 · MP/一覧から非表示・開けない · 再購入必要 · 取り消せない |
| **E5** | **削除する** clicked **once only** |
| **E6** | API **`POST /api/dtr/report-snapshot/hide`** → **200** `{ ok: true }` |
| **E7** | `/my` — saved report **card absent** after success |
| **E8** | Toast: **`保存版を削除しました。`**（+ secondary per SSOT） |
| **E9** | `/dtr/core` — **no** old envelope body |
| **E10** | `/dtr/core` → **`/dtr/lp`** or purchase path · **no** indefinite loader |
| **E11** | **No** raw snapshot id / `hiddenAt` in UI or API response |
| **E12** | **Checkout CTA not clicked** |

### D.1 API contract（reference）

| State | HTTP | Body |
|-------|------|------|
| Success hide | **200** | `{ ok: true }` |
| Unauthenticated | **401** | `{ code: 'unauthorized' }` |
| No visible row | **404** | `{ code: 'no_visible_snapshot' }` |
| Already hidden | **409** | `{ code: 'already_hidden' }` |
| DB error | **500** | `{ code: 'hide_failed' }` |

**UPDATE columns only:** `user_hidden_at` · `user_hidden_source=my_panel` · `user_hidden_reason=user_delete`

---

## E. Stop conditions（abort EXECUTION）

| # | Stop |
|---|------|
| **S1** | Account is **not** visible-owned at preflight |
| **S2** | Dialog copy **not** materially exact |
| **S3** | Target is **not** Human-approved for delete |
| **S4** | API **not** 200 on first delete click |
| **S5** | Post-delete **old** saved report still readable on `/dtr/core` |
| **S6** | **Loader loop** on `/dtr/processing?recovery=owned` or similar |
| **S7** | **raw id** / **hiddenAt** / **secret** exposed |
| **S8** | Accidental navigation toward **live checkout / payment** |
| **S9** | Requires **DB SQL** or **env** change to proceed |

**On stop:** document RED/PARTIAL · **no** second delete click · **no** checkout.

---

## F. Delete execution checklist（Human — EXECUTION gate）

### F.0 Preflight（before click 削除する）

| Step | Check | Pass |
|------|-------|------|
| **P0** | Production domain correct | ☐ |
| **P1** | `/my` — visible saved report card **yes** | ☐ |
| **P2** | Human confirms **delete approved** for this report | ☐ |
| **P3** | Dialog opened — title/body/forbidden words **yes** | ☐ |
| **P4** | **No** live checkout intent | ☐ |

### F.1 Execute（single click）

| Step | Check | Pass |
|------|-------|------|
| **X1** | Click **削除する** **once** | ☐ |
| **X2** | API status **200** | ☐ |
| **X3** | Response has **`ok: true`** only（no raw id） | ☐ |

### F.2 Post-delete（no checkout）

| Step | Check | Pass |
|------|-------|------|
| **A1** | `/my` card **absent** | ☐ |
| **A2** | Toast shown | ☐ |
| **A3** | `/dtr/core` — no old body | ☐ |
| **A4** | `/dtr/core` → `/dtr/lp` or purchase CTA path | ☐ |
| **A5** | No loader loop | ☐ |
| **A6** | Checkout CTA **not** clicked | ☐ |

---

## G. Delete execution result template（EXECUTION-R）

```
Production:
- domain: m55-webv2.vercel.app
- app commit: 0e9597c

Preflight:
- visible card before delete: yes/no
- delete Human-approved: yes/no

Execute:
- 削除する clicked once: yes/no
- API status: 200 / other
- API body ok:true: yes/no

Post-delete:
- /my card absent: yes/no
- toast shown: yes/no
- /dtr/core no old body: yes/no
- /dtr/core redirect/purchase path: yes/no
- loader loop: yes/no
- raw id/hiddenAt exposed: yes/no
- checkout clicked: no

Result: GREEN / PARTIAL / RED
```

---

## H. Verification design summary

| Layer | Method |
|-------|--------|
| **Pre** | Human `/my` visible + dialog copy |
| **Execute** | Network tab or safe status only — **no** response body with ids in SSOT |
| **Post UI** | `/my` · toast · `/dtr/core` · `/dtr/lp` |
| **Post API** | Optional logged-in **409** on second attempt — **not required** if UI prevents |
| **Commerce** | **no** checkout click |
| **Leak** | **no** id/hiddenAt in DOM or JSON |

---

## I. Formal HOLD（unchanged until separate GO）

| Item | Status |
|------|--------|
| **D-PROD-DELETE-EXECUTION** | **pending explicit Human GO** |
| **live repurchase checkout** | **HOLD** |
| **VERIFY-C** | **HOLD** |

---

## J. No-mutation（this gate）

| Action | Status |
|--------|--------|
| Production delete execute | **no** |
| live checkout / payment / webhook | **no** |
| manual DB SQL | **no** |
| env change | **no** |
| VERIFY-C | **no** |
| raw ID / email / session / secret | **no** |

---

## K. Next gate

| Gate | Requirement |
|------|-------------|
| **D-PROD-DELETE-EXECUTION** | Human GO: **`CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DELETE-EXECUTION go`** |
| **D-PROD-DELETE-EXECUTION-R** | Record §G template · docs commit |

---

## L. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Delete EXECUTION planning GREEN pending Human GO |
