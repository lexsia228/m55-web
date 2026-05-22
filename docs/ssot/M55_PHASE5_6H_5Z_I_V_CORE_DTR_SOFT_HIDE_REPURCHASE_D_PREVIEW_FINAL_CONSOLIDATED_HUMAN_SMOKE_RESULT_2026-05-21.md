# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FINAL — Consolidated preview smoke（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FINAL** |
| **Human GO** | **`D-PREVIEW consolidated Human smoke go`** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PREVIEW_FINAL_GREEN_NO_DEPLOY_NO_LIVE_CHECKOUT`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-FINAL-001`** |
| **Date** | **2026-05-21** |
| **Classification** | Consolidated preview Human + agent attestation · **no Production** |

**No Production deploy · no `main` push · no live checkout · no payment · no webhook · no env change · no VERIFY-C · no second delete on same target.**

---

## B. Preview deployment（確認 A）

| Field | Value |
|-------|--------|
| **safe URL** | `https://m55-webv2-git-work-home-cluster-m55-official.vercel.app` |
| **target** | **preview**（branch alias） |
| **source commit** | **`15d8eb1`**（branch tip；code fix **`a081259`** included） |
| **status** | **success** / Ready（GitHub `Vercel: success` @ `15d8eb1`） |
| **Production** | **no** |

---

## C. Post-delete hidden-only（確認 B）

Target already soft-hidden in preview — **no new delete** in this gate.

| Check | Source | Result |
|-------|--------|--------|
| **/my opened** | Human（session） | **yes** |
| **saved report card absent** | Human | **yes** |
| **/dtr/core opened**（hard refresh） | Human | **yes** |
| **old saved report not rendered** | Human | **yes** |
| **/dtr/core → /dtr/lp** | Human @ FIX-C-R + agent unauth **307→/dtr/lp** | **yes** |
| **loader continues** | Human FIX-C-R | **no** |
| **/dtr/lp purchase CTA visible** | Human | **yes** |
| **CTA clicked** | Human | **no** |
| **checkout / payment / webhook** | Human | **no** |
| **raw id / hiddenAt exposed** | Human | **no** |
| **fatal / recovery loop** | Human | **no** |

**Note:** Agent `GET /dtr/core` without session → **307 `/dtr/lp`**（anonymous fail-closed）。Signed-in hidden-only redirect attested in **FIX-C-R** @ `a081259`.

---

## D. API safety（確認 C）

| Check | Source | Result |
|-------|--------|--------|
| **unauth `POST …/hide`** | Agent | **401** JSON `{ code: 'unauthorized' }` · `x-matched-path: /api/dtr/report-snapshot/hide` |
| **second delete from UI** | Human scope | **not attempted**（card absent） |
| **hidden-only `409 already_hidden`** | Not run | **not tested**（no second delete；prior tests cover mapping） |
| **raw snapshot id / hiddenAt in API/UI** | Human + code | **no** |

---

## E. Dialog / cancel（確認 D）

| Field | Value |
|-------|--------|
| **run status** | **`not_run`** |
| **reason** | Preview target **already deleted** — no visible saved-report row；**no second delete** per gate scope |
| **complement** | **FIX-B** middleware · **hide API tests 9/9** · **A-R copy tests** · **R1 partial** shell attestation on file |

---

## F. Raw ID / email / session / secret

| Field | Value |
|-------|--------|
| **shared** | **no** |

---

## G. No-mutation

| Action | Status |
|--------|--------|
| Production deploy / main push | **no** |
| live checkout / payment / webhook | **no** |
| manual DB SQL | **no** |
| env change | **no** |
| VERIFY-C | **no** |
| second delete（same target） | **no** |

---

## H. Consolidated readiness

| Track | Status |
|-------|--------|
| **FIX-B** hide API 401 JSON | **GREEN** @ `56691d6` |
| **FIX-C / FIX-C-R** hidden-only redirect | **GREEN** @ `a081259` / Human **FIX-C-R** |
| **D-PREVIEW-FINAL** | **GREEN** — preview soft-hide path **ready for merge planning** |
| **Production deploy** | **not authorized** in this gate |
| **Live repurchase checkout** | **separate Human GO** |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | FINAL consolidated GREEN @ `15d8eb1` |
