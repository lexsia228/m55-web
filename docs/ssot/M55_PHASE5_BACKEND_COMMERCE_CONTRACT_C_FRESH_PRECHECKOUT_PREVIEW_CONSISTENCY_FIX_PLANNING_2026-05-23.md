# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING — Fix strategy（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING** |
| **Title** | **Locked shelf preview fix — v2-aligned stem vs generic copy · profile/copy treatment** |
| **Classification** | **Category 1 / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PREVIEW_CONSISTENCY_FIX_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PREVIEW_CONSISTENCY_R_BLOCKED_TYPE_MISMATCH_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-001`** |
| **Mutation in this gate** | **no** |

**Fix strategy GREEN.** **Option A-hybrid** frozen · legacy **`essenceStemLaneIndex`** path **removed from locked preview** · checkout **HOLD** until fix implementation + re-R.

---

## B. Planning decision — selected fix strategy

### B.1 Decision matrix evaluation

| Criterion | Option A（v2 preview only） | Option B（generic only） | **Option A-hybrid（selected）** |
|-----------|----------------------------|-------------------------|--------------------------------|
| Aligns with **paid fulfillment** SSOT | **yes** when profile v2 complete | n/a（no type shown） | **yes** when complete |
| Aligns with **free `/core`** pipeline | **no** — free uses **`runCanonicalCorePipeline`** | n/a | **no**（intentional · commerce preview follows **paid v2**） |
| Safe with **current legacy profile** | **no** — pipeline incomplete | **yes** | **yes** — generic fallback |
| Removes **クリエイター** JDN bug | **yes** | **yes** | **yes** |
| DB mutation required | **no** | **no** | **no** |
| Launch safety | **partial** | **max** | **max** |

**Evaluation against Human recommendation:**

> If v2 preview can be computed with the same SSOT as free/core without DB mutation, choose Option A. If not guaranteed, choose Option B.

| Sub-question | Answer |
|--------------|--------|
| Same SSOT as **free/core**? | **No** — free = **`runCanonicalCorePipeline` / TYPE catalog** · paid preview target = **`runM55CompositeStemPipeline` / `TEN_STEM_DISPLAY`** |
| v2 preview without DB mutation? | **Yes** — deterministic from **`ProfileRepository`** + calendar tables in bundle |
| Guaranteed for **all** signed-in locked users? | **No** — requires **v2-complete profile**（birthTime **or** `birthTimeUnknown` + country） |

**Selected strategy:** **`Option A-hybrid`**

| Branch | When | Preview |
|--------|------|---------|
| **A-branch** | **`isV2FulfillmentProfileComplete(profile)`** | **`資質 / {paid.publicTitle}`** from **`runM55CompositeStemPipeline`** |
| **B-branch** | profile missing · legacy · v2 incomplete | **No concrete `publicTitle`** · generic copy only |

**Prohibited after fix:** locked path **`essenceStemLaneIndex(birthDate)`** for purchase preview.

---

## C. Planning questions — answers

### Q1. Can `DtrShelfPanel` locked path safely reuse v2/free core type source?

| Source | Safe for locked preview? | Reason |
|--------|--------------------------|--------|
| **Free `/core` (`runCanonicalCorePipeline`)** | **no** | Different engine · TYPE_04 ≠ paid stem lane · would **not** fix commerce trust |
| **Paid v2 (`runM55CompositeStemPipeline`)** | **yes** when profile v2 complete | Same fn chain as **`buildV2FulfillmentSnapshot`** · no DB |
| **Legacy JDN (`essenceStemLaneIndex`)** | **no** · **remove** | Root cause of **クリエイター** mismatch |

### Q2. If yes, what exact function should it call?

**New shared helper（implementation gate · repo-only）：**

```text
deriveLockedShelfStemPreviewFromProfile(profile: BirthProfile | null)
  → null | { stemLaneIndex, publicTitle, displayOneLine, nickname }
```

**Call chain（A-branch）：**

1. Map **`BirthProfile`** → **`FulfillmentProfileFields`**（mirror **`resolveFulfillmentProfileFields`** field semantics from local profile · country default **`JP`**）
2. **`isV2FulfillmentProfileComplete(fields)`** — `lib/m55/compositeStem/parseFulfillmentMetadata.ts`
3. **`runM55CompositeStemPipeline(toCompositeCanonicalInput(fields))`** — `lib/m55/compositeStem/pipeline.ts`
4. Map **`composite.paid.publicTitle`** + **`composite.stemLaneIndex`** + **`TEN_STEM_DISPLAY`** one-line

**Do not call:** **`essenceStemLaneIndex`** · **`deriveDtrShelfStemDisplay`**（JDN path） on locked client preview.

**Client bundle note:** pipeline already used in fulfillment tests · calendar tables static · **no new server API required** for preview.

### Q3. If no, what generic copy should replace concrete type?

**B-branch copy（frozen · no ranking · no %）：**

| Element | Copy |
|---------|------|
| **Eyebrow** | **omit** `資質 / {publicTitle}` row entirely |
| **Card title** | **`{nickname}さんの取り扱い説明書`** if nickname present · else **`本質の読み解きレポート（保存版）`** |
| **One-line** | **`あなたの本質を、構造として読み解く`**（existing generic · keep） |
| **Optional subline** | **`購入前にプロフィールの出生時刻（または時刻不明）を入力してください`** — shelf hint only · not on poster |

**Do not use:** sample type names · **クリエイター** · placeholder stem · hardcoded lane.

### Q4. Should launch block concrete type preview until profile v2 complete?

**Yes.**

| Rule | Policy |
|------|--------|
| **Concrete `publicTitle` on locked card** | Only when **`isV2FulfillmentProfileComplete`** |
| **Legacy / incomplete profile** | **B-branch generic only** |
| **Rationale** | Preview must match **post-purchase fulfillment inputs** · showing v2 stem without v2 intake is **false precision** |

### Q5. Should `/dtr/lp` missing-field copy mention only missing birthTime / unknown-time flag?

**Yes — P1 copy fix in same implementation window.**

| Surface | Current problem | Target copy |
|---------|-----------------|-------------|
| **`PurchaseButton` `needsProfile`** | mentions **国** even when **`JP` default satisfied** | **「購入前にマイページで出生時刻を入力するか、「出生時刻は不明」にチェックを入れてください。」** |
| **`MyPanel` legacy hint** | mentions **国** redundantly | **「購入前に出生時刻（または「時刻不明」）を入力してください。」** |
| **Country** | Show on **`/my`** when set · **do not** block checkout copy unless country truly missing |

**Gate logic unchanged:** **`validateDtrCheckoutProfile`** / **`isV2ProfileFieldsComplete`** — copy-only delta.

### Q6. What re-attestation screenshots are required?

**Gate:** **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`** re-run（post-implementation · no payment）

| # | Capture | Pass criterion |
|---|---------|----------------|
| **R-1** | **`/dtr` locked shelf · v2 incomplete profile** | **No** `資質 / クリエイター` · generic one-line only |
| **R-2** | **`/my` · after v2 save**（birthTime or unknown） | **プロフィール：複合占術入力** · no **旧形式** |
| **R-3** | **`/dtr` locked shelf · v2 complete** | **`資質 / アナリスト`**（cohort golden expectation）· image **`/ten-views/analyst.webp`** |
| **R-4** | **`/dtr/lp` · v2 complete** | **`PurchaseButton` enabled** · no erroneous country nag |
| **R-5** | **`/core`**（reference only） | Document **free hero may differ in chrome** · **not** commerce pass/fail |
| **R-6** | **`GET /api/room/core`** pre-purchase | **403 Not owned** unchanged |

**SSOT/ticket:** safe labels only · **no raw IDs** · crop Clerk if needed.

---

## D. Files to edit（implementation gate · not this gate）

| Priority | File | Change |
|----------|------|--------|
| **P0** | **`components/dtr/DtrShelfPanel.tsx`** | Replace locked **`essenceStemLaneIndex`** branch with **`deriveLockedShelfStemPreviewFromProfile`** · A/B branch |
| **P0** | **`lib/m55/compositeStem/deriveLockedShelfStemPreview.ts`**（new） | Shared v2 preview helper · fail-closed → `null` |
| **P0** | **`lib/m55/compositeStem/deriveLockedShelfStemPreview.test.ts`**（new） | Golden + incomplete profile cases |
| **P1** | **`components/PurchaseButton.tsx`** | Narrow **`needsProfile`** copy |
| **P1** | **`components/my/MyPanel.tsx`** | Narrow legacy hint copy |
| **P2** | **`lib/m55/dtrShelfStemDisplay.ts`** | Comment: **not for locked client preview** · owned server path unchanged |

**Out of scope this fix:** free **`/core`** hero realignment · **`runCanonicalCorePipeline`** · paid reader body · checkout API · Stripe · DB.

---

## E. Expected visual output

### E.1 Before fix（observed · BLOCKED）

| State | `/dtr` locked card |
|-------|-------------------|
| Legacy profile | **`資質 / クリエイター`** + creator image |

### E.2 After fix — B-branch（v2 incomplete · current cohort start）

| Element | Output |
|---------|--------|
| Eyebrow | **absent** |
| Title | **`{nickname}さんの取り扱い説明書`** |
| One-line | **`あなたの本質を、構造として読み解く`** |
| Type image | **generic / no analyst-creator mismatch** |

### E.3 After fix — A-branch（v2 complete · post `/my` save）

| Element | Output |
|---------|--------|
| Eyebrow | **`資質 / アナリスト`**（cohort golden） |
| One-line | **`TEN_STEM_DISPLAY[9].displayOneLine`** |
| Type image | **`/ten-views/analyst.webp`** |
| Fulfillment parity | Same stem lane as **`buildV2FulfillmentSnapshot`** would produce |

---

## F. Profile gate / copy treatment

| Layer | Treatment |
|-------|-----------|
| **Preview type** | Block concrete type until v2 complete（§C.Q4） |
| **Checkout API gate** | **unchanged** · **`validateDtrCheckoutProfile`** |
| **PurchaseButton client gate** | **unchanged logic** · **copy fix only** |
| **Human `/my` action** | Still required before checkout · birthTime or **`birthTimeUnknown`** |
| **Free `/core`** | **No change in this gate chain** |

---

## G. Checkout HOLD confirmation

| Item | Status |
|------|--------|
| **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** |
| **Live payment** | **HOLD** |
| **Webhook replay** | **HOLD** |
| **VERIFY-C** | **HOLD** |

**Unblock sequence:**

1. **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-IMPLEMENTATION`** GREEN
2. **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`** re-attestation GREEN
3. Human **`/my` v2 profile** complete
4. Fresh **`FRESH-CHECKOUT-D-EXEC go`**（prior GO consumed by STOP）

---

## H. Test / validation plan（implementation + re-R）

| # | Test | Type |
|---|------|------|
| **T-1** | Unit: incomplete profile → helper returns **`null`** · shelf generic | **automated** |
| **T-2** | Unit: golden v2 profile → **`publicTitle === アナリスト`** · lane **9** | **automated** |
| **T-3** | Unit: locked shelf code path never imports **`essenceStemLaneIndex`** | **grep / test** |
| **T-4** | Manual: R-1–R-4 screenshots | **Human re-R** |
| **T-5** | Regression: owned shelf still uses **`deriveDtrShelfStemDisplayFromSnapshot`** | **automated / manual** |
| **T-6** | No checkout/payment in fix implementation gate | **policy** |

---

## I. STOP conditions（implementation gate）

| # | Condition | Action |
|---|-----------|--------|
| **FPCF-S-1** | Locked preview still calls **`essenceStemLaneIndex`** | **STOP** |
| **FPCF-S-2** | Incomplete profile shows concrete **`publicTitle`** | **STOP** |
| **FPCF-S-3** | v2 complete profile shows **`クリエイター`** for golden cohort | **STOP** |
| **FPCF-S-4** | Checkout/payment executed in fix gate | **STOP** |
| **FPCF-S-5** | Free `/core` hero changed incidentally | **STOP** · scope violation |

---

## J. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| Code edit | **no** |
| DB write / checkout / payment | **no** |
| webhook replay / VERIFY-C | **no** |
| env / Stripe mutation | **no** |
| raw ID recording | **no** |

---

## K. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`**（re-run） | **no** · screenshots |
| **2** | Human **`/my` v2 profile** | user action |
| **3** | **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** until **1–2** + new GO |

**Prior:** **`FIX-IMPLEMENTATION`** CLOSED GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-IMPLEMENTATION-001`**

---

## L. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-001`** | Diagnostic BLOCKED |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** | Checkout plan · HOLD |

---

## M. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | FIX-PLANNING GREEN · Option A-hybrid selected |
