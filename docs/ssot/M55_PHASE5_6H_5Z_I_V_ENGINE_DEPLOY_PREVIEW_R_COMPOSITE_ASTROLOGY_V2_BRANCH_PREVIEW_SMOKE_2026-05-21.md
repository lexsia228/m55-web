# Phase 5-6H-5Z-I-V-ENGINE-DEPLOY-PREVIEW-R — Branch preview smoke（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-DEPLOY-PREVIEW-R** |
| **Title** | **Composite v2 branch preview smoke result** |
| **Classification** | **Category 2 / HTTP smoke + SSOT record / no Production** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_DEPLOY_PREVIEW_R_GREEN`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-DEPLOY-PREVIEW-R-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Source commit** | **`2564061`** |
| **Prior fix** | **ENGINE-DEPLOY-PREVIEW-FIX-B** (`COMPOSITE_ASTROLOGY_V2_PREVIEW_BUILD_FIX_GREEN`) |
| **Production deploy** | **no** |
| **main push** | **no** |
| **checkout / payment** | **not executed** |

---

## B. Preview metadata

| Check | Result |
|-------|--------|
| **Preview URL (safe label)** | **`https://m55-webv2-git-work-home-cluster-m55-official.vercel.app`** |
| **Deployment ID** | **`dpl_7Trof38TVtit5mzJCmqYhb2bHbPS`** |
| **Instance URL (safe label)** | **`https://m55-webv2-134pplmyd-m55-official.vercel.app`** |
| **Vercel target** | **`preview`**（not Production） |
| **Vercel status** | **Ready** |
| **GitHub Vercel check @ `2564061`** | **`success`** — Deployment has completed |
| **Build log clone** | `Branch: work/home-cluster, Commit: 2564061` |
| **Production promotion** | **not executed** |

---

## C. Logged-out HTTP smoke

**Method:** `fetch` (anonymous, no cookies). **Fatal heuristic:** `Application error` / `Internal Server Error` / Next error payload in HTML.

| Path | HTTP | Redirect / notes | Fatal |
|------|------|------------------|-------|
| `/` | **200** | — | **no** |
| `/core` | **200** | — | **no** |
| `/dtr` | **200** | — | **no** |
| `/dtr/lp` | **200** | — | **no** |
| `/my` | **200** | Clerk **サインイン** shell（v2 fields not in HTML when signed-out） | **no** |
| `/dtr/core` | **307** | **`Location: /dtr/lp`** — unauthenticated fail-closed | **no** |

**Logged-out verdict:** **pass**

---

## D. Signed-in smoke

| Item | Result |
|------|--------|
| `/my` v2 UI（birthTime / 時刻不明 / country JP / birthplace） | **`not_run`** — Human Clerk session required |
| **Code attestation（`MyPanel.tsx` @ `2564061`）** | `mp-country`、出生時刻、`時刻不明` checkbox、`profileFormatLabel`、legacy notice copy present in source |

---

## E. DTR purchase safety

| Check | Result |
|-------|--------|
| Checkout button pressed | **no** |
| Payment / webhook replay | **no** |
| `M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED` | **unchanged**（not enabled） |
| env / secret recorded | **no** |

---

## F. Stored envelope smoke

| Item | Result |
|------|--------|
| Owned `/dtr/core` read with snapshot row | **`not_run`** — Human auth + owned snapshot required |
| Unauthenticated `/dtr/core` | **307 → `/dtr/lp`** — fail-closed **pass** |
| SSR `runDtrEngine` on `/dtr/core` | **code trace pass** — `app/dtr/core/page.tsx` uses `resolveStoredEnvelopeRead` only; `storedEnvelopeRead.test.ts` asserts no `runDtrEngine` import on page |

---

## G. No-mutation attestation

| Action | Status |
|--------|--------|
| Production deploy | **no** |
| main push | **no** |
| checkout / payment / webhook | **no** |
| Production DB write / SQL | **no** |
| env / Stripe / Clerk / Slack change | **no** |
| snapshot UPDATE / DELETE | **no** |
| CORE-DTR-VERIFY resume | **no**（**HOLD** maintained） |

---

## H. Next Gate

| Condition | Gate |
|-----------|------|
| Preview smoke GREEN（this gate） | **`ENGINE-DEPLOY-PRODUCTION-PLANNING`**（Human GO required before any Production deploy） |
| Runtime fatal on preview | **`ENGINE-DEPLOY-PREVIEW-FIX-C`** |

**Optional follow-up（non-blocking）:** Human signed-in `/my` v2 field smoke；owned `/dtr/core` stored envelope smoke（no checkout).

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | PREVIEW-R after FIX-B @ `2564061` |
