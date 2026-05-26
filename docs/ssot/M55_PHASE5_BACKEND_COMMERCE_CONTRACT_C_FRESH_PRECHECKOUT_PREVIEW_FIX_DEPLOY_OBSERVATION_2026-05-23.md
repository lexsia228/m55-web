# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION — Deploy observation（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION** |
| **Title** | **Production deploy Ready + signed-in locked shelf visual attestation** |
| **Classification** | **Category 2 / deploy observation / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PREVIEW_FIX_DEPLOY_OBSERVATION_RED_DEPLOY_FAILED_STALE_PRODUCTION_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION-001`** |
| **Date** | **2026-05-23** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PREVIEW_FIX_COMMIT_EXEC_GREEN`** @ **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-COMMIT-EXEC-001`** |
| **Target commit** | **`6aa5245`** |
| **Live Production commit** | **`4dcd856`**（last Vercel **success**） |
| **Checkout / payment** | **HOLD** |

**Deploy observation RED.** Preview fix **not live** on Production alias · signed-in attestation **blocked** until client-bundle fix + successful redeploy.

---

## B. Deploy Ready result

| Check | Result |
|-------|--------|
| **GitHub `main` HEAD** | **`6aa5245`** · message matches preview fix |
| **Vercel Production deploy @ `6aa5245`** | **FAILURE** · deployment **`dpl_GPzJ2SRfXaXcbYbsfBzEFHEJNk7e`** |
| **Vercel Production deploy @ `4dcd856`** | **SUCCESS** · still serving **`m55-webv2.vercel.app`** |
| **Human dashboard Ready @ `6aa5245`** | **no** · build failed |

### B.1 Build failure（safe summary · no secrets）

**Import chain:**

```text
components/dtr/DtrShelfPanel.tsx ('use client')
  → lib/m55/compositeStem/deriveLockedShelfStemPreview.ts
  → lib/m55/compositeStem/pipeline.ts
  → lib/m55/compositeStem/lunarDay.ts
  → lib/m55/calendar/loadCalendarBundle.ts
  → node:fs / node:path
```

**Error class:** Webpack client bundle · **`UnhandledSchemeError: Reading from "node:path" is not handled by plugins`**

**Implication:** v2 composite pipeline is **server-only** · must not be imported directly from **`DtrShelfPanel`** client component without boundary fix.

---

## C. Logged-out smoke（stale Production @ `4dcd856`）

| Path | HTTP |
|------|------|
| `/` | **200** |
| `/core` | **200** |
| `/dtr` | **200** |
| `/dtr/lp` | **200** |
| `/my` | **200** |
| `/dtr/core` | **307 → `/dtr/lp`** |

**Note:** smoke **PASS** on **pre-fix** deployment · **does not** attest preview fix.

Logged-out `/dtr` HTML: **`クリエイター`** absent · **`essenceStemLaneIndex`** absent（client bundle not yet exercised for signed-in locked path on new code）.

---

## D. Signed-in v2 incomplete visual result

| Observation | Result |
|-------------|--------|
| **`/dtr` locked shelf no `クリエイター`** | **NOT_RUN** · fix **not deployed** |
| **Generic card/copy for incomplete profile** | **NOT_RUN** |
| **No checkout/payment** | **confirmed** · gate policy |

**Human attestation:** blocked until successful deploy of client-bundle fix.

---

## E. `/my` profile / copy result

| Observation | Result |
|-------------|--------|
| Profile still incomplete until birth time / unknown-time | **NOT_RUN** on new code |
| Copy no longer nags country when JP default | **NOT_RUN** on new code · repo intent verified in **`PurchaseButton`** / **`MyPanel`** source |

---

## F. v2 complete visual result

| Observation | Result |
|-------------|--------|
| **`/dtr` → `資質 / アナリスト`** | **NOT_RUN** |
| Purchase button eligibility after v2 complete | **NOT_RUN** |
| Checkout | **HOLD** |

---

## G. Checkout HOLD confirmation

| Item | Status |
|------|--------|
| **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** |
| Live payment / webhook / VERIFY-C | **HOLD** |

Deploy failure **does not** change HOLD posture.

---

## H. No Production mutation confirmation

| Action | Status |
|--------|--------|
| checkout / payment | **no** |
| DB write / Supabase SQL | **no** |
| webhook replay / VERIFY-C | **no** |
| env / Stripe mutation | **no** |
| Production DELETE | **no** |
| raw ID recording | **no** |

---

## I. Recommended next gate

| Priority | Gate |
|----------|------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-FIX-CLIENT-BUNDLE-FIX-PLANNING`** | **CLOSED GREEN** @ **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-CLIENT-BUNDLE-FIX-PLANNING-001`** · Option A |
| **2** | **`…CLIENT-BUNDLE-FIX-IMPLEMENTATION`** | **NEXT** |
| **3** | **`…COMMIT-EXEC`** + redeploy |
| **4** | **Re-run this DEPLOY-OBSERVATION gate** |
| **5** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`** · **HOLD** until **4** GREEN |

**Do not proceed** to signed-in re-R or checkout until Production deploy **success** @ fixed commit.

---

## J. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION-001`** | **本条** |
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-COMMIT-EXEC-001`** | Prior push |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-IMPLEMENTATION-001`** | Implementation |

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | DEPLOY-OBSERVATION RED · Vercel build failed @ **`6aa5245`** |
