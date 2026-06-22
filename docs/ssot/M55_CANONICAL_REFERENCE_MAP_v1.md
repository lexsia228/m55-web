# M55 Canonical Reference Map v1

**Status:** ACTIVE — logic / display / copy traceability SSOT  
**Version:** `m55-canonical-reference-map-v1`  
**Machine mirror:** `docs/ssot/M55_CANONICAL_REFERENCE_MAP_MACHINE_v1.json`  
**Baseline branch:** `fix/m55-copy-lifestyle-language-ssot`  
**Baseline commit:** `7986ba74fe3ed80d2735e4363a46f2c42dab3ec3`  
**Date:** 2026-06-22  
**Classification:** Traceability / AI handoff — not engine law, not copy rewrite authority

---

## 0. Purpose

M55 の **占術ロジック（golden logic）**、**生成結果（envelope）**、**user-facing 表示**、**copy SSOT**、**surface 参照**、**obsolete 参照** を AI / Cursor / Human が同一正本から追跡できるようにする。

本 doc は **参照地図** であり、engine 仕様の上書きや product copy の全文正本ではない。矛盾時は各 owner ファイルと accepted gates を優先する。

---

## 1. Accepted gates

| Gate | Verdict |
|------|---------|
| CATEGORY-1 legacy snapshot v2 rebuild / production visual smoke logic review | **CLOSED GREEN** |
| CATEGORY-2 paid DTR copy lifestyle language audit planning | **COPY_AUDIT_PLANNING_GREEN** |
| CATEGORY-2 copy propagation contract planning | **COPY_PROPAGATION_CONTRACT_GREEN** |
| CATEGORY-2 prior copy SSOT recovery and authority freeze | **PRIOR_COPY_SSOT_RECOVERY_GREEN** |
| CATEGORY-2 canonical reference map planning | **REFERENCE_MAP_PLANNING_GREEN** |
| CATEGORY-2 canonical reference map implementation (this artifact) | **REFERENCE_MAP_IMPLEMENTATION_LOCAL_GREEN** (target) |

---

## 2. Golden logic owners

| Concern | Owner file | Allowed use | Forbidden use |
|---------|------------|-------------|---------------|
| **birthDate → v2 stemLaneIndex** | `lib/m55/compositeStem/pipeline.ts` (`runM55CompositeStemPipeline`) | fulfillment write, legacy display rebuild, free `/core` authority, stress audit | Per-surface duplicate lane derivation |
| **P-LUNAR stem from lunar row** | `lib/m55/compositeStem/stemLane.ts` | pipeline internal only | UI / copy imports |
| **/core stem authority** | `lib/m55/coreResult/resolveCoreStemAuthority.ts` → `pipeline.client.ts` | `buildCoreResult`, Core hero lane/title | `essenceStemLaneIndex` for primary display |
| **Legacy JDN lane (provisional)** | `lib/m55/essenceEngine.ts` (`essenceStemLaneIndex`, `jdn_offset_provisional_v1`) | legacy snapshot **raw** synthesis, audit diff | user-facing primary display, fulfillment write, owned shelf |
| **Envelope body assembly** | `lib/m55/dtrEngine.ts` (`runDtrEngine`) | `STEM_SECTION_BODIES` + `options.stemLaneIndex` | lane-less `runDtrEngine(input)` on v2 fulfillment/display paths |
| **v2 fulfillment write** | `lib/m55/compositeStem/buildV2FulfillmentSnapshot.ts` | checkout → DB `envelope_json` | copy-only forks |
| **Displayed envelope SSOT** | `lib/m55/compositeStem/resolveDisplayedDtrEnvelope.ts` | `/dtr/core`, consult send, owned shelf | legacy raw passthrough to user-facing |
| **Raw stored read (audit)** | `lib/m55/compositeStem/storedEnvelopeRead.ts` (`resolveStoredEnvelopeRead`) | v2 consistency check, resolver internal, rawMeta | reader / consult direct import |

---

## 3. Canonical pipeline diagram

```
birthDate + profile
  → runM55CompositeStemPipeline
  → stemLaneIndex
  → runDtrEngine(..., { stemLaneIndex, derivation: m55_composite_stem_v2_p_lunar })
  → envelope
  → DB store (v2) / legacy rebuild (read-time)
  → resolveDisplayedDtrEnvelope
  → user-facing reader / shelf / consult
```

**Rules**

- `essenceStemLaneIndex` / `jdn_offset_provisional_v1` は **legacy raw / audit only**。user-facing primary display で使ってはいけない。
- `resolveStoredEnvelopeRead` は **audit / resolver internal only**。reader / consult が直接使ってはいけない。
- DB envelope body（`envelope_json.payload.fullSections`）は **purchase artifact**。current user-facing copy source として固定しない（display propagation contract 参照）。

---

## 4. Copy SSOT hierarchy

| Rank | Source | Role |
|------|--------|------|
| **T1** | `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` ↔ `lib/m55/paidDtrProductCopy.ts` | Product / language law — 生活語・商品真実・consult 境界 |
| **T1b** | `lib/m55/dtrReportBridgeCopy.ts` | 章末 bridge / 返書導線（完成形） |
| **T2** | `docs/review/M55_PAID_DTR_WORD_POLISHING_OUTPUT_REVIEW_MAPPING_v1.md` | Engine 本文の**採用候補**（新語創作禁止） |
| **T3** | `lib/m55/dtrEngine.ts` stem3（クリエイター）全文 | in-repo 生活語実装モデル |

**Display copy owners (editable in future copy gate only)**

- `lib/m55/tenStemCatalog.ts` — `displayOneLine`（`publicTitle` 10 資質名は改名禁止）
- `lib/m55/dtrEngine.ts` — `STEM_SECTION_BODIES`
- `lib/m55/coreResult/typeCatalog.ts` — free `/core` 補助（例: `workStyle.summary`）
- `components/core/corePublicCopy.ts`, `components/core/CoreHeroSection.tsx` — free chrome

**Copy gate rule:** T1 / T1b / T2 / T3 から採用する。**新語創作禁止。**

---

## 5. Surface reference map

| Surface | Lane | Title / oneLine | Body | Consult |
|---------|------|-----------------|------|---------|
| `/core` (free) | `resolveCoreStemAuthority` → v2 pipeline | `resolveCorePublicStemDisplay` → `tenStemCatalog` | `typeCatalog` + `corePublicCopy` | — |
| `/dtr/core` reader | `resolveDisplayedDtrEnvelope` | `TEN_STEM_DISPLAY[lane]` at render | displayed `fullSections` | — |
| `/dtr` owned shelf | `deriveDtrShelfStemDisplayFromSnapshot` → resolver | `tenStemCatalog` | — | — |
| `/dtr` locked preview | `deriveLockedShelfStemPreviewFromDraft` → v2 pipeline | `tenStemCatalog` | — | — |
| consult send | displayed envelope lane | — | displayed sections excerpt | `buildConsultReportContextFromEnvelope(displayed)` |
| `/dtr/lp`, `/my` chrome | — | `paidDtrProductCopy` | — | `PAID_DTR_*` consult copy |

**Invariant:** free lane = paid v2 lane = legacy rebuild displayed lane = owned shelf lane (certified anchors: 1992-12-19 → lane 1 / プランナー; 1983-02-28 & 1919-11-01 → lane 9 / アナリスト).

---

## 6. Template / translation contract

| Layer | Source |
|-------|--------|
| **Template (tone / vocabulary)** | T1 + T1b + T2 adopted lines + T3 stem3 style |
| **Individual result (per birthDate)** | golden logic → `stemLaneIndex` + section keys + nickname |
| **Translation** | Apply template vocabulary to per-lane `STEM_SECTION_BODIES` — not one generic paragraph for all users |

Forbidden: new fortune authority; job-first default tone; surface-specific catalogs; stem-only relabel without body parity.

---

## 7. Obsolete and forbidden references

| Source | Status |
|--------|--------|
| `00_PRIMARY_ACTIVE_LAW/M55_TEN_STEM_PROFESSIONAL_MAPPING_SSOT_20260324_v1.md` | **Obsolete for tone** — history only, not copy implementation guide |
| `essenceStemLaneIndex` on display/fulfillment paths | **Forbidden** |
| `deriveDtrShelfStemDisplay` (JDN) as owned shelf primary | **Forbidden** — superseded by resolver path |
| 8 chapters / max 3 replies / ¥700 add-on / Entry Report as primary JP name | **Obsolete product truth** — see T1 Conflict Register |

---

## 8. Display propagation contract (planned — not implemented in this gate)

**Target (COPY_PROPAGATION_CONTRACT_GREEN):** Option B — read-time display-normalize.

- **Raw stored** `envelope_json` remains in DB unchanged (purchase artifact / audit).
- **User-facing** reader, shelf, consult use **displayed envelope** built from current copy SSOT catalog.
- **stored_v2:** normalize copy at read time using **stored** `stemLaneIndex` + profile — **do not** re-run pipeline for lane.
- **legacy:** existing full rebuild path unchanged.
- **No DB rewrite.**

Current code (baseline): stored_v2 may passthrough stored body until normalize gate lands. Reference map documents both **current** and **target** contract.

---

## 9. Allowed edit files (future copy gate)

- `lib/m55/tenStemCatalog.ts` (displayOneLine only)
- `lib/m55/dtrEngine.ts` (STEM_SECTION_BODIES text only)
- `lib/m55/coreResult/typeCatalog.ts` (display copy only)
- `components/core/CoreHeroSection.tsx` (chrome only)
- `lib/m55/compositeStem/resolveDisplayedDtrEnvelope.ts` (display-normalize only — no lane logic change)
- fingerprint / audit test fixtures tied to copy changes

---

## 10. Forbidden files / concerns (this lane)

**Do not edit in Category-2 copy / reference gates without explicit reopen:**

- `lib/m55/compositeStem/pipeline.ts`, `stemLane.ts`, calendar bundle law
- `lib/m55/essenceEngine.ts` logic
- HOME (`app/home/**`, `components/home/**`)
- NOTE surfaces
- price / reply count constants (`replyTicketCheckoutConstants.ts`, checkout surfaces)
- DB schema, migrations, Stripe, Clerk, env
- snapshot rewrite / `envelope_json` mutation

---

## 11. Required tests

| Test | Guards |
|------|--------|
| `lib/m55/canonicalReferenceMap.static.test.ts` | Reference map files + source import guards |
| `lib/m55/compositeStem/resolveDisplayedDtrEnvelope.test.ts` | displayed resolver contract |
| `lib/m55/compositeStem/canonicalV2CrossSurfaceStress.test.ts` | 816 cohort lane/body parity |
| `lib/m55/birthdaySsotCrossSurfaceParity.test.ts` | cross-surface freeze |
| `lib/m55/paidDtrProductCopy.test.ts` | T1 product truth regression |
| `lib/m55/compositeStem/fulfillmentWrite.test.ts` | no legacy JDN on v2 write path |
| `lib/m55/tenStemLifestyleLanguageAudit.test.ts` | 10-stem lifestyle copy / forbidden work-org term guard |

---

## 12. AI handoff rule

Before any Category-2 copy or display-normalize implementation:

1. Read **this file** and `M55_CANONICAL_REFERENCE_MAP_MACHINE_v1.json`.
2. Edit **only** paths listed in §9 or gate-specific allowlist.
3. Do not use obsolete professional-mapping SSOT for tone.
4. Do not import `resolveStoredEnvelopeRead` in reader or consult routes.
5. Do not use `essenceStemLaneIndex` for user-facing primary display.
6. PR / gate report must state: `Reference Map updated: yes|no`.

---

## 13. Gate log

| Date | Gate | HEAD | Verdict |
|------|------|------|---------|
| 2026-06-22 | CATEGORY-2-M55-CANONICAL-REFERENCE-MAP-AND-TRACEABILITY-SSOT-IMPLEMENTATION-LOCAL-REV1 | `7986ba74fe3ed80d2735e4363a46f2c42dab3ec3` | REFERENCE_MAP_IMPLEMENTATION_LOCAL_GREEN (target) |
