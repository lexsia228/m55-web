# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R — Preview / profile consistency diagnostic（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R** |
| **Title** | **Pre-checkout LP/shelf preview vs free core vs v2 fulfillment — type label + profile gate diagnostic** |
| **Classification** | **Category 1 / read-only diagnostic / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_PRECHECKOUT_PREVIEW_CONSISTENCY_R_BLOCKED_TYPE_MISMATCH_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-001`** |
| **Date** | **2026-05-23** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_CHECKOUT_E2E_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** |
| **Human GO status** | **`FRESH-CHECKOUT-D-EXEC go` given · execution stopped before payment** |
| **Mutation in this gate** | **no** |

**BLOCKED.** Pre-purchase report card uses **legacy provisional day-stem engine** → **`クリエイター`** while user-recognized free `/core` path and **v2 paid fulfillment SSOT** align on **`アナリスト`** family for the same cohort birth profile. **Live checkout remains HOLD.**

---

## B. Observed mismatch summary

| Surface | Observed | User expectation |
|---------|----------|------------------|
| **Free `/core`** | **ANALYST / 観測特性：静観分析**（`TYPE_04` canonical pipeline） | **アナリスト**（本質認識） |
| **Pre-purchase report card**（`/dtr` shelf · locked） | **`資質 / クリエイター`** | **`アナリスト`** |
| **`/my` profile** | **プロフィール：旧形式** · name · birth date · **国：日本** · timezone · **missing birth time / unknown flag** | v2-complete for checkout |
| **`/dtr/lp` purchase CTA** | **`PurchaseButton` disabled** · message asks for birth time / country on **`/my`** | enabled after v2 profile |
| **`GET /api/room/core`** | **403 Not owned**（pre-purchase · expected） | unchanged |

**Two independent blockers before `FRESH-CHECKOUT-D-EXEC`:**

1. **Type preview mismatch** — wrong engine on pre-purchase shelf card（code path）
2. **Profile v2 incomplete** — **`birthTimeUnknown` not set**（intentional checkout gate · user action）

---

## C. Planning questions — answers

### Q1. Why does purchase preview show クリエイター?

**Because pre-purchase shelf personalization uses `essenceStemLaneIndex(birthDate)` → provisional JDN day-stem lane **3** → `TEN_STEM_DISPLAY[3].publicTitle` = `クリエイター`.**

Not from paid snapshot · not from composite v2 pipeline · not random sample text.

### Q2. Is クリエイター a fallback/sample/hardcoded label?

| Answer | Detail |
|--------|--------|
| **Hardcoded string in LP card?** | **no** — comes from **`TEN_STEM_DISPLAY`** catalog |
| **Fallback when profile missing?** | **no** — profile **is present**（nickname + birthDate） |
| **Deterministic engine output?** | **yes** — **`essenceStemLaneIndex`**（legacy **`jdn_offset_provisional_v1`**） |
| **Same birthDate as v2 golden?** | **yes** — known cross-engine drift documented in **ENGINE-AUDIT-C VC-01** |

### Q3. Is LP preview using the same source of truth as free core result?

**No.**

| Path | Engine | Type surface |
|------|--------|----------------|
| **Free `/core`** | **`runCanonicalCorePipeline`** → **`buildCoreResult`** | **`TYPE_04` · ANALYST · 観測特性：静観分析** |
| **Pre-purchase `/dtr` card** | **`essenceStemLaneIndex`** + **`TEN_STEM_DISPLAY`** | **lane 3 · クリエイター** |
| **Paid DTR post-fulfillment** | **`runM55CompositeStemPipeline`** at fulfillment → stored snapshot | **lane 9 · アナリスト**（v2 SSOT for same golden birthDate） |

**`/dtr/lp` page itself** does not render a type row · mismatch is on **`/dtr` shelf `EntryReportCard`**（purchase preview card users see before LP CTA）.

### Q4. Does old-format profile cause fallback type generation?

| Effect | Answer |
|--------|--------|
| **Type label on shelf** | **no** — shelf only needs **`birthDate`** from **`ProfileRepository`** |
| **Checkout disabled** | **yes** — **`validateDtrCheckoutProfile`** fails until v2 complete |
| **Legacy → generic card** | **no** — card still **`kind: ready`** with stem from birthDate |

Old format **blocks payment** · does **not** switch type engine · type mismatch is **separate** engine-path bug.

### Q5. What fields are required by `validateDtrCheckoutProfile`?

**Source:** `lib/m55/compositeStem/checkoutProfileGate.ts` · `lib/soul/birthProfileV2.ts`

| Field | Required |
|-------|----------|
| **`nickname`** | **yes**（trimmed non-empty） |
| **`birthDate`** | **yes** |
| **`birthTime`** | **OR** |
| **`birthTimeUnknown === true`** | **required when birthTime empty** |
| **`country`** | **not explicitly validated in gate** — defaults **`JP`** on save via **`enrichBirthProfileForSave`** |

Failure codes: **`nickname_and_birthdate`** · **`birth_time_or_unknown`**.

### Q6. Why does `/my` show country Japan but LP still asks for country/time?

| Fact | Explanation |
|------|-------------|
| **Country visible on `/my`** | **`profile.country`** or display default **`DEFAULT_COUNTRY = JP`** → label **日本** |
| **Legacy badge** | **`hasLegacyProfileOnly`** true because **`profileFormat !== 'v2'`** and **`birthTimeUnknown` unset** |
| **Actual checkout block** | **`birth_time_or_unknown`** only |
| **LP / PurchaseButton copy** | **Over-broad UX copy** — mentions **国** even when country already satisfied · **`PurchaseButton` needsProfile** and **`MyPanel` legacy hint** bundle birth time + country |

**Not a country-missing DB bug** · **copy + v2 birth-time flag gap**.

### Q7. Should purchase preview display a concrete type before paid DTR is generated?

**SSOT policy（recommended · pending product GO in fix gate）：**

| Option | Policy |
|--------|--------|
| **A — Align preview** | Pre-purchase card uses **same composite v2 preview** as fulfillment would produce（or explicit “preview” badge） |
| **B — Generic copy** | Until purchase · show **no concrete `publicTitle`** · generic one-line only |
| **C — Current（legacy JDN）** | **REJECT for launch** — contradicts v2 fulfillment + free core user mental model |

**This gate:** **Option C observed · BLOCKED for checkout.**

### Q8. What is the correct SSOT for type labels across free core, LP preview, and paid DTR?

**Canonical references:**

| Surface | SSOT |
|---------|------|
| **Paid DTR body + hero** | Stored **`envelope_json`** + **`engine_context_json`** · **`engine_version = m55-composite-stem-v2`** · **`TEN_STEM_DISPLAY[stemLaneIndex].publicTitle`** |
| **Free `/core`（target post-TL-F7 / ENGINE-SPEC-B）** | **`TEN_STEM_DISPLAY` same table as paid v2** · hero **アナリスト** alignment for golden cohort |
| **Pre-purchase preview** | **Must not use legacy `essenceStemLaneIndex` alone** if v2 checkout fulfillment is SSOT |
| **Public framing** | **資質** label + **`publicTitle`** · no raw 甲乙丙丁 · no ranking language |

**See:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_ENGINE_SPEC_B_R_COMPOSITE_ASTROLOGY_STEM_LAW_UNRESOLVED_DECISIONS_SIGN_OFF_2026-05-21.md` §C1–C2.

---

## D. Likely root cause

| Layer | Classification | Root cause |
|-------|----------------|------------|
| **Type mismatch** | **Code bug / SSOT drift** | **`DtrShelfPanel`** locked path uses **`essenceStemLaneIndex`**（legacy provisional） instead of **composite v2 preview** or generic copy |
| **Checkout disabled** | **Profile gate（by design）+ user data gap** | **`birthTimeUnknown` not saved** → **`isV2ProfileFieldsComplete` false** |
| **Country in error copy** | **Copy / UX** | Messages mention **国** though gate does not require explicit country entry when **`JP` default applies** |

**Not root cause:** random hardcoded sample · legacy DB owner rows · Stripe · webhook.

---

## E. Exact files / components responsible

| File | Role |
|------|------|
| **`components/dtr/DtrShelfPanel.tsx`** | Pre-purchase **`cardProfile`** · **`essenceStemLaneIndex(profile.birthDate)`** → **`TEN_STEM_DISPLAY[idx]`** · renders **`資質 / {publicTitle}`** |
| **`lib/m55/essenceEngine.ts`** | **`essenceStemLaneIndex`** · **`STEM_DERIVATION_PROVISIONAL_ID = jdn_offset_provisional_v1`** |
| **`lib/m55/dtrShelfStemDisplay.ts`** | Server **`deriveDtrShelfStemDisplay`** — same **`essenceStemLaneIndex`**（unused for locked client path） |
| **`lib/m55/tenStemCatalog.ts`** | **`TEN_STEM_DISPLAY[3].publicTitle = クリエイター`** · **`[9] = アナリスト`** |
| **`lib/m55/coreResult/buildCoreResult.ts`** | Free **`/core`** · **`runCanonicalCorePipeline`** |
| **`components/core/CoreHeroSection.tsx`** | Free hero **`TYPE_04` → ANALYST / 静観分析** |
| **`lib/m55/compositeStem/pipeline.ts`** | **Paid fulfillment v2** · **`runM55CompositeStemPipeline`** |
| **`lib/m55/compositeStem/buildV2FulfillmentSnapshot.ts`** | Fulfillment snapshot write path |
| **`components/PurchaseButton.tsx`** | Client pre-check **`validateDtrCheckoutProfile`** · disabled + **`needsProfile`** message |
| **`lib/m55/compositeStem/checkoutProfileGate.ts`** | Checkout API + button gate |
| **`lib/soul/birthProfileV2.ts`** | **`hasLegacyProfileOnly`** · **`isV2ProfileFieldsComplete`** · **`profileFormatLabel`** |
| **`components/my/MyPanel.tsx`** | **旧形式** badge · birth time / unknown editor |
| **`app/dtr/lp/page.tsx`** | LP shell · **`PurchaseButton`** host · **no type row** |
| **`app/api/purchase/checkout/route.ts`** | Server-side **`validateDtrCheckoutProfile`** enforcement |

**SQL in this gate:** **none executed** · read-only code/SSOT inspection only.

---

## F. Checkout HOLD confirmation

| Item | Status |
|------|--------|
| **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** — superseded by preview consistency BLOCKED |
| **Live payment** | **HOLD** |
| **Webhook replay** | **HOLD** |
| **VERIFY-C** | **HOLD** |

**Even if user completes v2 profile on `/my`**, **type preview mismatch remains a launch-trust blocker** until fix gate or explicit product waiver.

---

## G. Required fix plan（planning only · no mutation here）

### G.1 P0 — Pre-purchase type preview alignment

| Step | Action | Gate |
|------|--------|------|
| **FPC-FIX-1** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING`** — choose **align v2 preview** vs **generic copy** | planning |
| **FPC-FIX-2** | Implementation — replace **`DtrShelfPanel` locked `essenceStemLaneIndex`** path | code |
| **FPC-FIX-3** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`** re-run — Human visual + read-only | attestation |

**Implementation sketch（for fix planning）：**

- Run **`runM55CompositeStemPipeline`**（or shared server preview helper）from **v2-complete profile** for locked shelf card **OR**
- Drop concrete **`publicTitle`** until post-purchase · keep generic one-line

### G.2 P0 — Profile v2 completion（Human · `/my`）

| Step | Action |
|------|--------|
| **FPC-PROF-1** | On **`/my`** · set **出生時刻** or check **出生時刻は不明** |
| **FPC-PROF-2** | Save → **`profileFormat: v2`** · **`validateDtrCheckoutProfile` ok** |
| **FPC-PROF-3** | Reconfirm **`PurchaseButton`** enabled |

**Does not alone clear type mismatch BLOCKED.**

### G.3 P1 — Copy polish

| Step | Action |
|------|--------|
| **FPC-COPY-1** | Narrow **`PurchaseButton` / MyPanel** messages to **actual missing fields**（time/unknown · not country when JP default satisfied） |

### G.4 P2 — Free core / paid label convergence（existing TL track）

| Step | Action |
|------|--------|
| **FPC-CORE-1** | Track **ENGINE-SPEC-B** free hero **`TEN_STEM_DISPLAY.publicTitle`** alignment（separate from commerce gate · do not block FPC-FIX-2 on full TL scope） |

---

## H. Issue classification matrix

| Symptom | Classification |
|---------|----------------|
| **`資質 / クリエイター` on pre-purchase card** | **Code bug** — wrong preview engine |
| **Purchase button disabled** | **Profile data issue** + **intentional gate** |
| **旧形式 badge** | **Expected** for incomplete v2 fields |
| **Country shown but mentioned in error** | **Copy / fallback messaging** |
| **Free core feels like アナリスト** | **Correct user mental model** vs **legacy shelf preview** |

---

## I. Stop conditions（triggered）

| # | Condition | Status |
|---|-----------|--------|
| **FPC-S-1** | Pre-purchase type ≠ v2 fulfillment expectation | **TRIGGERED** |
| **FPC-S-2** | Checkout disabled at profile gate | **TRIGGERED** |
| **FPC-S-3** | Payment attempted despite mismatch | **not triggered**（Human stopped） |

---

## J. No-mutation confirmation

| Action | Status |
|--------|--------|
| checkout / payment | **no** |
| DB write / DDL / DML | **no** |
| webhook replay / manual grant | **no** |
| VERIFY-C / env / Stripe mutation | **no** |
| Production DELETE | **no** |
| raw ID / email / session in SSOT | **no** |
| SELECT * | **no** |

---

## K. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-IMPLEMENTATION`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-IMPLEMENTATION-001`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`**（re-run） | **NEXT** |
| **4** | Human **`/my` v2 profile completion** | user action |
| **5** | **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** until **FPC-S-1 cleared** + profile gate pass + fresh **`FRESH-CHECKOUT-D-EXEC go`** if prior GO consumed by STOP |

---

## L. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING-001`** | Fix strategy · Option A-hybrid |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** | Checkout plan · now blocked |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** | Cohort start |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** | Commerce contract |

---

## M. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | BLOCKED type mismatch · checkout HOLD reaffirmed |
