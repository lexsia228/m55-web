# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-FIX-CLIENT-BUNDLE-FIX-PLANNING — Bundle boundary（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-FIX-CLIENT-BUNDLE-FIX-PLANNING** |
| **Title** | **Remove server-only composite pipeline from client bundle — planning only** |
| **Classification** | **Category 2 / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PREVIEW_FIX_CLIENT_BUNDLE_FIX_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-CLIENT-BUNDLE-FIX-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PREVIEW_FIX_DEPLOY_OBSERVATION_RED_DEPLOY_FAILED_STALE_PRODUCTION_NO_MUTATION`** @ **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION-001`** |
| **Live Production** | **`4dcd856`**（stale）· **`6aa5245` build FAILED** |
| **Checkout / payment** | **HOLD** |

**Planning GREEN.** Selected strategy: **Option A — server-computed locked preview prop**（launch-safe · preserves Option A-hybrid preview semantics）.

---

## B. Root cause（confirmed）

```text
components/dtr/DtrShelfPanel.tsx  ('use client')
  import deriveLockedShelfStemPreviewFromProfile
    → runM55CompositeStemPipeline
      → lunarDay → loadCalendarBundle
        → node:fs / node:path
          → Webpack UnhandledSchemeError @ Vercel build
```

**Invariant violated:** owned shelf already uses **server prop** (`ownedShelfDisplay`) · locked shelf must **not** call composite pipeline in client graph.

---

## C. Architecture options

| Option | Summary | Preview fix preserved? | Launch risk | Selected |
|--------|---------|------------------------|-------------|----------|
| **A** | Server computes locked preview · pass **`DtrShelfStemDisplay \| null`** prop | **yes** · v2 complete → concrete type | **low** · mirrors **`ownedShelfDisplay`** | **yes** |
| **B** | Client locked shelf **generic only** · no concrete pre-purchase type | **partial** · loses v2 **`アナリスト`** pre-checkout | **lowest** code churn | no |
| **C** | Browser-safe duplicate pipeline without calendar/fs | **yes** in theory | **high** · duplicate engine · drift risk | **no** |

**Decision:** **Option A** — minimal launch-safe fix · **do not** import **`runM55CompositeStemPipeline`** from any **`'use client'`** module.

**Option B rejected** because FIX-PLANNING **Option A-hybrid** requires v2-complete pre-purchase preview aligned with fulfillment · generic-only would re-open consistency gap for Human re-R.

**Option C rejected** — contradicts SSOT single pipeline · high maintenance · prior ENGINE gate already rejected client calendar bundle path.

---

## D. Selected bundle-safe strategy（Option A detail）

### D.1 Data flow

```text
app/dtr/page.tsx (Server Component)
  resolveDtrShelfAccess(userId)
    when ownershipState === 'locked':
      getLatestDraftForUser(userId)          // DB SSOT (existing)
      resolveFulfillmentProfileFields(null, draft)
      deriveLockedShelfStemPreviewFromFields(fields)  // server-only
    → lockedShelfDisplay: DtrShelfStemDisplay | null

  <DtrShelfPanel
    lockedShelfDisplay={...}
    ownedShelfDisplay={...}   // unchanged
  />

DtrShelfPanel ('use client')
  locked branch:
    if lockedShelfDisplay → render 資質 / {publicTitle}
    else → generic copy (nickname optional from ProfileRepository for title only)
  NO import of deriveLockedShelfStemPreview / pipeline / lunarDay / loadCalendarBundle
```

### D.2 Profile source on server

| Source | Use |
|--------|-----|
| **`getLatestDraftForUser`** + **`extra_json`** | **primary** for v2 fields · same path as fulfillment (`parseFulfillmentMetadata`) |
| **`ProfileRepository`** | **client only** · optional nickname for generic title · **not** stem authority |

**Fail-closed:** incomplete v2 → **`lockedShelfDisplay: null`** → generic card（matches FIX-PLANNING branch B）.

### D.3 Server-only boundary

| Module | Role |
|--------|------|
| **`lib/m55/compositeStem/deriveLockedShelfStemPreview.ts`** | Keep pipeline call · add **`import 'server-only'`** or restrict imports to server graph only |
| **`lib/m55/dtrShelfAccess.ts`** | Invoke helper when **`unlockState === 'locked'`** |
| **`components/dtr/DtrShelfPanel.tsx`** | Props only · remove helper import |

### D.4 Optional refactor（implementation gate）

Split helper entry:

```text
deriveLockedShelfStemPreviewFromFields(FulfillmentProfileFields): DtrShelfStemDisplay | null
deriveLockedShelfStemPreviewFromDraft(draft): DtrShelfStemDisplay | null  // server
deriveLockedShelfStemPreviewFromProfile(profile): ...  // test-only or server draft adapter
```

Tests remain on fields/golden profile without importing **`DtrShelfPanel`**.

---

## E. Files to edit（implementation gate）

| Priority | File | Change |
|----------|------|--------|
| **P0** | **`lib/m55/dtrShelfAccess.ts`** | Add **`lockedShelfDisplay`** on authenticated **`locked`** branch · draft read + helper |
| **P0** | **`components/dtr/DtrShelfPanel.tsx`** | Remove **`deriveLockedShelfStemPreviewFromProfile`** import · consume **`lockedShelfDisplay`** prop |
| **P0** | **`app/dtr/page.tsx`** | Pass **`lockedShelfDisplay`** from access |
| **P0** | **`lib/m55/compositeStem/deriveLockedShelfStemPreview.ts`** | Server-only marker · optional **`FromFields`/`FromDraft`** entry · no client re-export |
| **P1** | **`lib/m55/compositeStem/deriveLockedShelfStemPreview.test.ts`** | Test server paths · grep guard: **`DtrShelfPanel`** must not import pipeline/helper |
| **P1** | **`lib/m55/dtrShelfStemDisplay.ts`** | Comment: locked preview server prop |
| **docs** | FIX-IMPLEMENTATION / DEPLOY-OBSERVATION cross-link | Note bundle fix superseding client import |

**Explicit non-touch:** checkout API · webhook · fulfillment write · free **`/core`** hero · **`PurchaseButton`** logic（copy already shipped in **`6aa5245`**）.

---

## F. Expected visual behavior（unchanged intent）

| State | `/dtr` locked shelf |
|-------|---------------------|
| **v2 incomplete**（launch cohort） | **Generic** · no **`クリエイター`** · optional nickname title |
| **v2 complete**（post **`/my`** + draft synced） | **`資質 / アナリスト`** · lane 9 image |
| **owned** | Unchanged · **`ownedShelfDisplay`** from snapshot |

**SSR note:** first paint may use server draft before client hydration · acceptable if draft SSOT lags localStorage briefly · generic fail-closed preferred over wrong type.

---

## G. Build validation plan

| # | Check | Pass criteria |
|---|-------|---------------|
| **V-1** | **`npm run build`** | **no** `node:fs` / `node:path` in client graph · build **success** |
| **V-2** | **`npx tsc --noEmit`** | **PASS** |
| **V-3** | **`npx tsx --test lib/m55/compositeStem/deriveLockedShelfStemPreview.test.ts`** | **PASS** · golden **`アナリスト`** / incomplete **null** |
| **V-4** | grep **`DtrShelfPanel.tsx`** | **no** `deriveLockedShelfStemPreview` · **no** `runM55CompositeStemPipeline` · **no** `essenceStemLaneIndex` |
| **V-5** | grep **`'use client'`** files importing **`pipeline.ts`** | **none** on locked preview path |
| **V-6** | **`git diff --check`** | **PASS** |

---

## H. Deploy observation retry plan

| Step | Gate |
|------|------|
| **1** | **`…CLIENT-BUNDLE-FIX-IMPLEMENTATION`** · repo only |
| **2** | **`…CLIENT-BUNDLE-FIX-COMMIT-PLANNING`** → **`…COMMIT-EXEC`** |
| **3** | Vercel Production **Ready @ fix commit** |
| **4** | **Re-run **`FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION`** |
| **5** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`** · Human R-1–R-4 |
| **6** | **`FRESH-CHECKOUT-D-EXEC`** · **HOLD** until **5** GREEN + fresh GO |

---

## I. Checkout HOLD confirmation

| Item | Status |
|------|--------|
| **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** |
| Live payment / webhook / VERIFY-C | **HOLD** |

---

## J. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| code edit / commit / push / deploy | **no** |
| checkout / payment / DB write / SQL | **no** |
| webhook replay / VERIFY-C / env / Stripe | **no** |
| Production DELETE / raw ID recording | **no** |

---

## K. Recommended next gate

| Priority | Gate |
|----------|------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-FIX-CLIENT-BUNDLE-FIX-IMPLEMENTATION`** |
| **2** | **`…CLIENT-BUNDLE-FIX-COMMIT-PLANNING`** → **`…COMMIT-EXEC`** |
| **3** | **`FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION`** re-run |

---

## L. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-CLIENT-BUNDLE-FIX-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-FIX-DEPLOY-OBSERVATION-001`** | Deploy RED |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING-001`** | Preview strategy |

---

## M. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | CLIENT-BUNDLE-FIX-PLANNING GREEN · Option A selected |
