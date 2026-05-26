# Phase BACKEND-COMMERCE-CONTRACT-C-DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R — /core vs paid DTR label mismatch diagnostic（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R** |
| **Title** | **Read-only diagnostic — free `/core` vs paid DTR saved card type display mismatch** |
| **Classification** | **Category 2 / read-only diagnostic / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_DTR_SNAPSHOT_CORE_RESULT_CONSISTENCY_R_BLOCKED_RESULT_MISMATCH_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R-001`** |
| **Date** | **2026-05-24** |
| **Cohort namespace** | **`M55-core-Development`** · **`launch-cohort-primary`** |
| **Prior gates** | Fulfillment GREEN post env-fix · unlock **observed** |
| **Mutation in this gate** | **no** |

**BLOCKED on result trust.** Observed UI: **`/core`** shows **分析類型 / PRESIDENT / 直観展開** · **`/dtr` saved card** shows **資質 / プロデューサー**. Code audit: **same `stemLaneIndex`** on legacy JDN path · **different label catalogs** — not a snapshot recompute bug on owned shelf.

---

## B. Observed mismatch summary（Human attestation · safe labels）

| Surface | Observed display |
|---------|------------------|
| **`/core`** | **分析類型** · **PRESIDENT** · **直観展開**（観測特性） |
| **`/dtr` saved report card** | **資質 / プロデューサー** |
| **`/dtr/core`** | Opens consultation room · ticket **1** visible |
| **Consistency** | **FAIL** |

**Index inference（code catalogs only · no raw profile）：** **PRESIDENT / 直観展開** ↔ **`TYPE_06`** ↔ **`stemLaneIndex` 5** · **プロデューサー** ↔ **`TEN_STEM_DISPLAY[5]`**（**己**）.

---

## C. Access / unlock / fulfillment status

| Layer | Status |
|-------|--------|
| **Payment** | **completed** |
| **Webhook** | **200** post Supabase env fix |
| **Fulfillment SQL band** | **1/1/1/1** · wallet **1** · grant **≥1** · S-5 **0**（Human attestation） |
| **`/dtr` saved card** | **visible** · **保存済み** badge |
| **`/dtr/core`** | **accessible** |
| **Unlock / entitlement** | **GREEN** — mismatch is **display taxonomy only** |

---

## D. Planning Q&A

### Q1. Which engine/path produces `/core` display?

| Step | Path |
|------|------|
| UI | `components/core/CoreEssencePanel.tsx` → `ensureSealedCoreResult` → `buildCoreResult` |
| Engine | `lib/m55/coreResult/buildCoreResult.ts` → **`runCanonicalCorePipeline({ birthDate })`** only |
| Stem | `essenceStemLaneIndex(birthDate)` → **`typeIndexFromStemLane(lane)`**（identity） |
| Type seed | **`TYPE_CATALOG[lane]`** → `coreType` **`TYPE_{lane+1}`** · `coreLabel`（例 **直観展開型**） |
| Hero chrome | `CoreHeroSection.tsx` **`HERO_VISUAL_PRESET[coreType]`** → EN **PRESIDENT** · JA **観測特性：直観展開** |
| Section label | **`classLabelJa = '分析類型'`**（hero chrome · not DTR **資質**） |

**Not used on `/core` today:** profile `birthTime` / `country` / `birthplace` in `buildCoreResult`（birthDate-only input）.

### Q2. Which engine/path produced `dtr_report_snapshots` for this checkout?

| Step | Path |
|------|------|
| Webhook | `fulfillDtrCoreFromCheckoutSessionId` → `upsertDtrReportSnapshotAtFulfillment` |
| Default Production | **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED !== 'true'`** → **legacy branch** |
| Legacy build | `runDtrEngine({ birthDate, nickname, … })` · **`essenceStemLaneIndex(birthDate)`** |
| v2 branch（if flag on） | `buildV2FulfillmentSnapshot` → **`runM55CompositeStemPipeline`** → `runDtrEngine(..., { stemLaneIndex: composite })` |

**Stored fields:** `profile_snapshot`（nickname + birthDate legacy）· `envelope_json` full **`DtrEnvelope`** · optional `engine_version` / `engine_context_json` if v2.

### Q3. Exact saved display fields in snapshot?

| Field | Role |
|-------|------|
| **`envelope_json.auditMeta.stemLaneIndex`** | **0–9** stem lane SSOT for paid read |
| **`envelope_json.auditMeta.stemChar`** | 天干 char |
| **`envelope_json.auditMeta.derivation`** | **`jdn_offset_provisional_v1`** legacy · **`m55_composite_stem_v2_p_lunar`** if v2 |
| **Hero title on shelf/reader** | **Not stored as string** — derived **`TEN_STEM_DISPLAY[stemLaneIndex].publicTitle`** at read time |
| **Body text** | **`envelope_json.payload.fullSections`** |

For observed **プロデューサー:** **`publicTitle`** from **`TEN_STEM_DISPLAY[5]`** via **`deriveDtrShelfStemDisplayFromSnapshot`**.

### Q4. Is `/dtr` card reading snapshot or recomputing?

**Snapshot read（owned）.** `resolveDtrShelfAccess` → **`deriveDtrShelfStemDisplayFromSnapshot(snap)`** → **`resolveStoredEnvelopeRead`** → **`TEN_STEM_DISPLAY[envelope.auditMeta.stemLaneIndex]`**. **Does not** use client `ProfileRepository` when **`ownedShelfDisplay`** provided.

### Q5. Is `/dtr/core` reading snapshot or recomputing?

**Snapshot read only.** `app/dtr/core/page.tsx` → **`resolveStoredEnvelopeRead(snap)`** → **`DtrFullReader`** with **`purchasedSnapshot.envelope`**. **No SSR `runDtrEngine` re-derive** on read path（`storedEnvelopeRead.ts` header SSOT）.

### Q6. Are `/core` and paid DTR supposed to use the same canonical result?

| SSOT | Answer |
|------|--------|
| **Today (legacy provisional)** | **No — documented divergence** · same **`stemLaneIndex`** · **different public label tables** |
| **Target (v2 + TL-F7)** | **Yes — primary label parity via `TEN_STEM_DISPLAY`** · **`ENGINE-SPEC-B-R` §C1** |
| **Production adequacy** | **`BLOCKED_UNTIL_COMPOSITE_ENGINE_CORRECTION`** until **ENGINE-VERIFY-A** |

### Q7. PRESIDENT / 直観展開 → プロデューサー mapping?

**Not a 1:1 synonym map.** At **`stemLaneIndex` 5**:

| Catalog | Label |
|---------|-------|
| **`TYPE_CATALOG[5]` / `HERO_VISUAL_PRESET.TYPE_06`** | **PRESIDENT** · **直観展開** · **直観展開型** |
| **`TEN_STEM_DISPLAY[5]`**（paid DTR） | **己** · **プロデューサー** |

**Conclusion:** **cross-surface taxonomy mismatch** at **same stem index** — not “PRESIDENT translates to プロデューサー” by design.

### Q8. Checkout metadata vs `/core` profile?

**Fulfillment intake:** `resolveFulfillmentProfileFields` reads **`profileBirthDate`**, **`profileBirthTimeUnknown`**, **`profileCountry`**, etc. from Stripe session metadata（`parseFulfillmentMetadata.ts`）.

**`/core` rebuild:** **`buildCoreResult`** uses **`ProfileRepository` birthDate only** — metadata not consulted on `/core`.

**Legacy stem path:** both reduce to **`essenceStemLaneIndex(birthDate)`** when v2 write **off** · **same lane if same birthDate**.

### Q9. `unknown_time_noon` causing paid snapshot drift?

| Path | birthTime effect on stem |
|------|--------------------------|
| **Legacy fulfillment** | **none** — **`essenceStemLaneIndex(birthDate)`** only |
| **`/core` `buildCoreResult`** | **none on stem** — birthDate-only pipeline；noon used for **boundary metadata only** |
| **v2 fulfillment（flag on）** | **yes** — **`runM55CompositeStemPipeline`** uses full intake · **can diverge from `/core`** |

**For observed PRESIDENT vs プロデューサー pair:** **consistent with lane 5 on both sides** · **not** unknown-time drift · **label catalog split**.

### Q10. SSOT defining free→paid result parity?

| Document | Role |
|----------|------|
| **`M55_PHASE5_6H_5Z_I_V_TL_FIX_A_TYPE_LABEL_MISMATCH_FIX_PLANNING_2026-05-21.md`** | **Primary inventory** · free **`TYPE_CATALOG`** vs paid **`TEN_STEM_DISPLAY`** |
| **`M55_PHASE5_6H_5Z_I_V_ENGINE_AUDIT_A_*`** | Stem fork diagram |
| **`M55_PHASE5_6H_5Z_I_V_ENGINE_SPEC_B_R_*`** | v2 golden + **TL-F7** paid/free **`TEN_STEM`** alignment target |
| **`lib/m55/compositeStem/storedEnvelopeRead.ts`** | Paid read = **stored envelope authoritative** |

---

## E. Source-of-truth comparison

```text
birthDate (same on legacy path)
  └─ essenceStemLaneIndex → lane L (inferred L=5 for this observation)

/core (free rebuild)
  └─ TYPE_CATALOG[L] + HERO_VISUAL_PRESET[TYPE_{L+1}]
       → 分析類型 / PRESIDENT / 直観展開

/dtr owned shelf + /dtr/core reader
  └─ snapshot.envelope.auditMeta.stemLaneIndex = L
  └─ TEN_STEM_DISPLAY[L].publicTitle
       → 資質 / プロデューサー
```

**Secondary image drift:** `DtrShelfPanel` **`DTR_TYPE_IMAGE[L]`** uses **`producer.webp`** at L=5 · **`CoreHeroSection`** uses **`president.webp`** for **TYPE_06** — same index · **different asset mapping**.

---

## F. Root cause hypothesis

| Class | Finding |
|-------|---------|
| **Primary** | **Cross-surface label catalog divergence** — **`TYPE_CATALOG` + `HERO_VISUAL_PRESET`**（free `/core`）vs **`TEN_STEM_DISPLAY`**（paid DTR snapshot read model） |
| **Not primary** | Snapshot recompute bug · client ProfileRepository drift on **owned shelf**（fixed server path）· fulfillment failure |
| **Conditional** | If **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED=true`** on Production · **true engine lane drift** vs `/core` **possible** — **not required** to explain **PRESIDENT↔プロデューサー at same index** |

**Exact files / functions:**

| File | Function / symbol |
|------|-------------------|
| `lib/m55/coreResult/buildCoreResult.ts` | `buildCoreResult` |
| `lib/m55/coreResult/canonicalBoundary.ts` | `runCanonicalCorePipeline` · `computeStaticCoreDeterministic` |
| `lib/m55/coreResult/typeCatalog.ts` | `TYPE_CATALOG` · `typeIndexFromStemLane` |
| `components/core/CoreHeroSection.tsx` | `HERO_VISUAL_PRESET` · `classLabelJa` |
| `lib/m55/dtrDraftDb.ts` | `upsertDtrReportSnapshotAtFulfillment` |
| `lib/m55/dtrEngine.ts` | `runDtrEngine` |
| `lib/m55/tenStemCatalog.ts` | `TEN_STEM_DISPLAY` |
| `lib/m55/compositeStem/storedEnvelopeRead.ts` | `deriveDtrShelfStemDisplayFromSnapshot` |
| `lib/m55/dtrShelfAccess.ts` | `resolveDtrShelfAccess` |
| `components/dtr/DtrShelfPanel.tsx` | owned card **資質 /** row |
| `components/dtr/DtrFullReader.tsx` | hero **資質 /** row |

**Mismatch type:** **taxonomy-only**（legacy JDN same lane）· **not true engine mismatch** for observed pair · **trust blocker** for **¥500追加返書 smoke** anyway.

---

## G. ¥500 additional reply smoke

**HOLD** — Human attestation + prior gate policy. User-visible **free vs paid type name contradiction** breaks saved-report trust before reply-ticket smoke.

---

## H. Required fix plan（planning only · no mutation in this gate）

| Priority | Item |
|----------|------|
| **P0** | **`TL-F7` / DTR-CORE-LABEL-PARITY`** — align **`/core` hero primary type** to **`TEN_STEM_DISPLAY[stemLane]`**（or single shared **`M55PublicStemDisplay`** SSOT） |
| **P1** | Unify **hero image index map** — **`DTR_TYPE_IMAGE`** vs **`HERO_VISUAL_PRESET`** at same **`stemLaneIndex`** |
| **P2** | **v2 fulfillment flag governance** — if enabled on Production · document **legacy `/core` vs v2 snapshot** drift policy per **ENGINE-SPEC-B-R §C3** |
| **P3** | Optional quiet badge **保存版（旧計算方式）** for legacy rows when v2 ships |

**Out of scope here:** snapshot UPDATE · profile rewrite · second checkout.

---

## I. Hard prohibitions confirmation

checkout retry · second payment · webhook replay · manual grant · repair runner · DB write · snapshot UPDATE · SQL mutation · VERIFY-C · env change · Stripe mutation · Production DELETE · raw IDs in SSOT — **all confirmed no**.

---

## J. Recommended next gate

| Gate | Purpose |
|------|---------|
| **`DTR-SNAPSHOT-CORE-LABEL-PARITY-PLANNING`** | Fix scope · SSOT table · `/core` vs paid display contract |
| **`TL-F7-IMPLEMENTATION`**（or subset） | Code fix for label parity |
| **`FRESH-ADDITIONAL-REPLY-SMOKE`** | **After** parity GREEN or explicit Human waiver |

**Re-poll:** **`DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R`** after fix deploy.
