# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-PRECHECK — Preview deploy precheck（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-PRECHECK** |
| **Title** | **Branch preview deploy precheck** |
| **Classification** | **Category 1 / precheck / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PREVIEW_PRECHECK_GREEN_READY_FOR_BRANCH_PREVIEW_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-PRECHECK-001`** |
| **Date** | **2026-05-21** |
| **Target commit** | **`c4c7f31`** (`feat: insert new report on saved report repurchase`) |
| **Branch** | **`work/home-cluster`** |

**Precheck only.** **No deploy, live checkout, payment, webhook, DB write, or env change in this gate.**

---

## B. Git / branch

| Check | Result |
|-------|--------|
| **branch** | `work/home-cluster` |
| **HEAD** | `c4c7f31` |
| **origin/work/home-cluster** | `c4c7f31`（一致） |
| **Tracked diff** | **none**（clean for soft-hide commits） |
| **Untracked** | Expected only — `.vercel/`, `.cursor-preview-cache/`, unrelated `docs/ssot/*`, `scripts/*`（**not staged**） |

### Soft-hide code chain @ `c4c7f31`

| Gate | Commit | Message |
|------|--------|---------|
| D-READ | `61a1a9d` | read only visible dtr snapshots |
| D-API | `a85942d` | add saved report hide api |
| D-MY | `750d7c8` | add saved report delete ui |
| D-CHECKOUT | `285e963` | allow checkout after saved report deletion |
| D-FULFILL | `c4c7f31` | insert new report on saved report repurchase |

**Production DB:** soft-hide schema applied @ C-D-R（runtime app **not** yet on Production）。

---

## C. Test suite（agent-run @ precheck）

| Suite | Command | Result |
|-------|---------|--------|
| Hide API | `lib/m55/hideDtrReportSnapshot.test.ts` | **9/9 pass** |
| Delete copy + `/my` wiring | `lib/m55/dtrSavedReportDeleteCopy.test.ts` | **5/5 pass** |
| Checkout repurchase | `lib/m55/dtrCheckoutRepurchaseLane.test.ts` | **5/5 pass** |
| Fulfillment repurchase | `lib/m55/dtrFulfillmentRepurchaseInsert.test.ts` | **6/6 pass** |
| Visible read | `lib/m55/dtrDraftDb.visible.test.ts` | **12/12 pass** |
| **Combined** | all five files | **37/37 pass** |
| **tsc** | `npx tsc --noEmit` | **pass** |
| **whitespace** | `git diff --check` | **pass** |

---

## D. Build advisory（local only — not a preview block）

| Check | Result |
|-------|--------|
| **Local `npm run build`** | **Failed** — `/meter` prerender: Clerk `Missing publishableKey`（local env 未設定） |
| **Preview implication** | **Advisory only** — Vercel preview is expected to supply Clerk keys；**not** attributed to soft-hide diff |
| **Compile step** | **Compiled successfully** before static generation error |

**Stop condition “build fail”:** **not triggered** for branch preview GO（env-local artifact）. Re-run build on Vercel after deploy if needed.

---

## E. Runtime risk（preview scope）

| Surface | Precheck posture |
|---------|------------------|
| **`/my` 削除 UI** | Confirm on **branch preview only**（Human） |
| **`POST /api/dtr/report-snapshot/hide`** | Human smoke on preview — auth required |
| **Hidden-only repurchase checkout** | **No live checkout** in D-PREVIEW gate |
| **Fulfillment / webhook** | **No live webhook replay** in D-PREVIEW gate |
| **VERIFY-C** | **HOLD** — do not conflate with soft-hide preview |

---

## F. Preview readiness classification

| Class | Verdict |
|-------|---------|
| **Overall** | **`READY_FOR_BRANCH_PREVIEW`** |
| **Code @ commit** | **`c4c7f31`** |
| **DB schema** | Production applied；app deploy pending |
| **Live commerce** | **Out of scope** until separate Human GO |

---

## G. Human smoke checklist（D-PREVIEW — after deploy）

| # | Check | Pass criteria |
|---|-------|----------------|
| 1 | Sign in → `/my` | Owned report row shows **削除** when `report-snapshot-ready` → `ready: true` |
| 2 | Delete dialog | §B1.3 copy；**削除する** confirms |
| 3 | After delete | Row gone from `/my`；toast shown；no **非表示** wording |
| 4 | `/dtr/core` | Hidden snapshot **not** readable（redirect / no body） |
| 5 | Repurchase CTA | Shelf/LP shows purchase path when hidden-only（**no live charge** unless separate GO） |
| 6 | Hide API 401 | Logged-out `POST …/hide` → **401** |
| 7 | Visible user | Existing visible snapshot user still sees **開く**；no delete if not ready |

**Forbidden in preview smoke:** Production live checkout · VERIFY-C · entitlement revoke · hard delete.

---

## H. Stop conditions

| Condition | Status |
|-----------|--------|
| Tests fail | **clear** |
| Source commit mismatch | **clear**（`c4c7f31` local = origin） |
| Build fail blocks preview | **clear**（local Clerk env only） |
| Live checkout/payment required for precheck | **clear**（not required） |
| Production DB write required | **clear** |
| Env change required in precheck gate | **clear** |

---

## I. No-mutation statement

| Action | Status |
|--------|--------|
| deploy / redeploy | **no** |
| main push | **no** |
| live checkout / payment / webhook | **no** |
| Production DB manual write | **no** |
| env change | **no** |
| **VERIFY-C** | **no** |

---

## J. Next gate

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW** | Vercel branch preview deploy — **Human GO** |
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-R** | Human visual smoke @ checklist §G |

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | D-PREVIEW-PRECHECK post D-FULFILL-COMMIT |
