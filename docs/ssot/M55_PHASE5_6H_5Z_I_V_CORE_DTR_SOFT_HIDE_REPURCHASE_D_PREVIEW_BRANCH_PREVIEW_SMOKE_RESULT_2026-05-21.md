# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW — Branch preview smoke result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW** |
| **Human GO** | **`CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW go`** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PREVIEW_PARTIAL_RED_HIDE_API_ROUTE_404`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PREVIEW-001`** |
| **Date** | **2026-05-21** |
| **Classification** | Preview deploy confirmation + agent logged-out smoke + Human signed-in **pending** |

**No Production deploy · no live checkout · no payment · no webhook replay · no env change · no VERIFY-C.**

---

## B. Preview metadata

| Field | Value |
|-------|--------|
| **safe URL** | `https://m55-webv2-5aku3sbr4-m55-official.vercel.app` |
| **target** | **preview**（Vercel `environment=Preview`） |
| **status** | **Ready / success**（GitHub deployment status） |
| **source branch** | `work/home-cluster` |
| **source commit** | **`33348ca`**（docs tip；includes soft-hide code **`c4c7f31`**） |
| **code tip (soft-hide)** | **`c4c7f31`** |
| **Production** | **no**（deployment-specific preview hostname） |

---

## C. Logged-out smoke（agent HTTP）

| Path | HTTP | Fatal | Notes |
|------|------|-------|-------|
| `/` | **200** | **no** | |
| `/core` | **200** | **no** | |
| `/dtr` | **200** | **no** | |
| `/dtr/lp` | **200** | **no** | |
| `/my` | **200** | **no** | signed-out shell |
| `/dtr/core` unauth | **307 → `/dtr/lp`** | **no** | fail-closed redirect |

---

## D. Signed-in `/my`（Human pending）

| Check | Agent | Human |
|-------|-------|-------|
| opened | — | **pending** |
| delete button visible (`ready`) | — | **pending** |
| forbidden words absent | — | **pending** |
| dialog copy exact (A-R) | — | **pending** |
| cancel safe | — | **pending** |
| fatal error | — | **pending** |

**Client bundle check (agent):** `/my` JS chunk `app/my/page-*.js` contains `report-snapshot/hide` path → **delete UI code deployed**.

---

## E. Delete flow（Human pending）

| Check | Agent | Human |
|-------|-------|-------|
| delete executed | — | **pending** |
| row disappeared | — | **pending** |
| toast shown | — | **pending** |
| raw id / hiddenAt exposed | — | **pending** |
| fatal / recovery loop | — | **pending** |

---

## F. Post-delete（Human pending）

| Check | Agent | Human |
|-------|-------|-------|
| `/dtr/core` hidden report blocked | — | **pending** |
| purchase CTA visible (hidden-only) | — | **pending** |
| CTA clicked | **no** | **no** |
| checkout / payment / webhook | **no** | **no** |

---

## G. API smoke

| Check | Expected | Agent result |
|-------|----------|--------------|
| unauthorized `POST …/hide` | **401** | **404** HTML（Next not-found）— **blocker** |
| `GET …/report-snapshot-ready` | **401** | **401** JSON ✓ |
| `POST …/purchase/checkout` | **401** | **401** JSON ✓ |
| visible delete **200** | Human | **pending** |
| hidden-only **409** | Human | **pending** |

**Interpretation:** `report-snapshot-ready` and `purchase/checkout` routes resolve on preview；`report-snapshot/hide` returns **404** for unauthenticated `POST` — route may be **missing from serverless manifest** despite client bundle reference. **Requires Human signed-in retest and/or redeploy investigation before GREEN.**

---

## H. Existing visible user regression（Human pending）

| Check | Agent | Human |
|-------|-------|-------|
| visible user can open `/dtr/core` | — | **pending** |
| stored envelope read OK | — | **pending** |

---

## I. STOP conditions

| Condition | Triggered? |
|-----------|------------|
| Production (not preview) | **no** |
| source commit mismatch | **no**（`33348ca` deployment active） |
| build failed | **no** |
| `/my` fatal (logged-out) | **no** |
| delete row not removed | **unknown**（Human pending） |
| hidden snapshot opens on `/dtr/core` | **unknown** |
| checkout/payment proceeded | **no** |
| env change required | **no** |
| raw ID/secret exposed | **no** |
| Production DB SQL required | **no** |
| **hide API route 404** | **yes**（agent unauthenticated probe） |

---

## J. No-mutation

| Action | Status |
|--------|--------|
| Production deploy / main push | **no** |
| live checkout / payment / webhook | **no** |
| env change | **no** |
| manual DB SQL | **no** |
| VERIFY-C | **no** |

---

## K. Next gates

| Gate | Action |
|------|--------|
| **D-PREVIEW-FIX** or redeploy | Resolve `POST /api/dtr/report-snapshot/hide` **404** on preview |
| **D-PREVIEW-R** | Human signed-in smoke attestation after fix |
| **D-PROD-DEPLOY** | Separate GO after preview GREEN |

---

## L. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Agent logged-out GREEN；hide API 404 → PARTIAL/RED |
