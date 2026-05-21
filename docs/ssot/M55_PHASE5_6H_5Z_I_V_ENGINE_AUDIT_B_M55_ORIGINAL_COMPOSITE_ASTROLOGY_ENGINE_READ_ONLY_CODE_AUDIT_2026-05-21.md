# Phase 5-6H-5Z-I-V-ENGINE-AUDIT-B — M55 original composite astrology engine read-only code audit gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-AUDIT-B** |
| **Title** | **M55 original composite astrology engine read-only code audit** |
| **Classification** | **Category 1 / read-only code audit / docs-only / no-mutation** |
| **Verdict** | **`ENGINE_READ_ONLY_AUDIT_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-B-M55-ORIGINAL-COMPOSITE-ASTROLOGY-ENGINE-READ-ONLY-CODE-AUDIT-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-AUDIT-A** — **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-A-…-001`** |

**Execution:** static repo trace only.** **No** code / DB / payment / deploy.

---

## B. AC-EB checklist result

| ID | Criterion | Result |
|----|-----------|--------|
| **AC-EB-01** | Route → file:line traced | **PASS** — §D |
| **AC-EB-02** | `essenceStemLaneIndex` call sites | **PASS** — §C（10 call sites） |
| **AC-EB-03** | Fulfillment inputs | **PASS** — §F |
| **AC-EB-04** | `envelope_json` vs SSR re-run | **PASS** — §G |
| **AC-EB-05** | `1983-02-28` → stemLane **3** | **PASS** — §I |
| **AC-EB-06** | Gap table updated | **PASS** — §K |
| **AC-EB-07** | VERIFY criteria alignment | **PASS** — §I（癸/アナリストは lane 9 のみ） |
| **AC-EB-08** | No mutation / no raw ID | **PASS** |

---

## C. `essenceStemLaneIndex` — definition + all call sites

### C1. Definition

| Location | Role |
|----------|------|
| ```101:105:lib/m55/essenceEngine.ts``` | `parseAndValidateIso` → `gregorianToJdn` → `jdnDayStemIndex(jdn)` |
| ```97:99:lib/m55/essenceEngine.ts``` | `((jdn + STEM_JDN_OFFSET_MOD10) % 10)` — **`STEM_JDN_OFFSET_MOD10 = 9`** |
| ```10:10:lib/m55/essenceEngine.ts``` | Comment: **birthTime/timezone not in canonical input** |

**Stem inputs actually used:** **civil `YYYY-MM-DD` only.** No 節入り / 旧暦 / TZ in this function.

### C2. Call-site inventory（production-relevant）

| # | File:line | Caller context | Input to `essenceStemLaneIndex` |
|---|-----------|----------------|--------------------------------|
| 1 | ```143:143:lib/m55/coreResult/canonicalBoundary.ts``` | `computeStaticCoreDeterministic` | `normalizedInput.normalizedGregorianDate` |
| 2 | ```798:798:lib/m55/dtrEngine.ts``` | `runDtrEngine` | `input.birthDate` |
| 3 | ```21:21:lib/m55/dtrShelfStemDisplay.ts``` | `deriveDtrShelfStemDisplay` | `profile.birthDate`（snapshot） |
| 4 | ```255:255:components/dtr/DtrShelfPanel.tsx``` | Unowned shelf preview | `ProfileRepository.get` → `birthDate` |
| 5 | ```242:242:components/dtr/DtrShelfPanel.tsx``` | Owned shelf | **does not call** — uses `ownedShelfDisplay.stemLaneIndex` from server |
| 6 | ```113:113:lib/m55/todayEngine.ts``` | Today scope | `input.birthDate` |
| 7 | ```104:104:lib/m55/weeklyEngine.ts``` | Weekly scope | `input.birthDate` |
| 8 | ```228:228:components/home/home/HomePanel.tsx``` | Home explore（**frozen path**） | `profile.birthDate` |
| 9 | ```228:228:components/home/home_tmp/HomePanel.tsx``` | Draft home | same |
| 10 | ```220:220:lib/m55/essenceEngine.ts``` | `runEssenceEngine`（internal） | `input.birthDate` via `jdnDayStemIndex` |

**Indirect:** `runEssenceSpotcheck` ```169:169:lib/m55/essenceEngine.ts``` includes **`1983-02-28`**.

**Not calling `essenceStemLaneIndex`:** `DtrFullReader` uses **`envelope.auditMeta.stemLaneIndex`** ```2341:2341:components/dtr/DtrFullReader.tsx```（engine output, not re-derived in client）.

---

## D. Route-to-engine mapping（file:line）

### D1. `/core`

| Step | File:line |
|------|-----------|
| Page shell | ```7:18:app/core/page.tsx``` → `CoreEssencePanel` |
| Profile read | ```40:40:components/core/CoreEssencePanel.tsx``` — `ProfileRepository.get(ownerId)` |
| Seal / build | ```45:45:components/core/CoreEssencePanel.tsx``` — `ensureSealedCoreResult` |
| Store gate | ```67:70:lib/m55/coreResult/store.ts``` — return cached v3 if `sealedInputs` match |
| Fresh build | ```80:81:lib/m55/coreResult/store.ts``` — `buildCoreResult(cur)` |
| Pipeline entry | ```9:11:lib/m55/coreResult/buildCoreResult.ts``` — **`runCanonicalCorePipeline({ birthDate })` only** |
| Stem + TYPE | ```143:145:lib/m55/coreResult/canonicalBoundary.ts``` |
| UI hero labels | ```155:156:components/core/CoreEssencePanel.tsx``` — `CoreHeroSection(result)` |
| Hero preset | ```129:129:components/core/CoreHeroSection.tsx``` — `HERO_VISUAL_PRESET[result.coreType]` |
| Class / trait copy | ```161:162:components/core/CoreHeroSection.tsx``` — **`分析類型`**, **`特質性`** |

### D2. `/dtr` shelf

| Step | File:line |
|------|-----------|
| Server access | ```19:27:app/dtr/page.tsx``` — `resolveDtrShelfAccess` |
| Owned stem | ```188:192:lib/m55/dtrShelfAccess.ts``` — `deriveDtrShelfStemDisplay(snap.profile_snapshot)` |
| Panel render | ```240:248:components/dtr/DtrShelfPanel.tsx``` — `TEN_STEM_DISPLAY[ownedShelfDisplay.stemLaneIndex]` |
| Unowned preview | ```252:256:components/dtr/DtrShelfPanel.tsx``` — client `essenceStemLaneIndex` |

### D3. `/dtr/core`

| Step | File:line |
|------|-----------|
| Ownership gate | ```22:26:app/dtr/core/page.tsx``` — `resolveEntryReportOwnership` |
| Snapshot load | ```28:28:app/dtr/core/page.tsx``` — `getDtrReportSnapshot` |
| **Engine re-run** | ```34:39:app/dtr/core/page.tsx``` — `runDtrEngine({ birthDate, nickname } from **profile_snapshot**)` |
| Reader | ```47:50:app/dtr/core/page.tsx``` — `purchasedSnapshot={{ envelope, profile }}` |
| Stem display | ```2340:2342:components/dtr/DtrFullReader.tsx``` — `env.auditMeta.stemLaneIndex` → `TEN_STEM_DISPLAY[idx]` |
| Hero paid | ```663:663:components/dtr/DtrFullReader.tsx``` — `stem.publicTitle`（**資質 /** row） |

### D4. `/api/dtr/report-snapshot-ready`

| Step | File:line |
|------|-----------|
| Route | ```14:20:app/api/dtr/report-snapshot-ready/route.ts``` |
| Access only | ```20:20:app/api/dtr/report-snapshot-ready/route.ts``` — `resolveDtrShelfAccess` — **no engine** |

### D5. My Page profile

| Step | File:line |
|------|-----------|
| Save | ```58:74:lib/soul/profile.ts``` — `birthDate` + `nickname` only；`queueDtrDraftSync` |
| `/core` refresh | ```32:35:components/core/CoreEssencePanel.tsx``` — `m55:profile_updated` event |
| **No** snapshot mutation | No code path from `ProfileRepository.save` to `dtr_report_snapshots` UPDATE |

---

## E. `runDtrEngine` — input / output（file:line）

### E1. Input type

```13:18:lib/m55/dtrEngine.ts
export type DtrCanonicalInput = {
  birthDate: string;
  nickname: string;
  locale: 'ja-JP';
  contextScope: 'dtr';
};
```

### E2. Output envelope

```44:50:lib/m55/dtrEngine.ts
export type DtrEnvelope = {
  contractVersion: 'v1';
  engineVersion: string;
  generatedAt: string;
  payload: DtrPayload;
  auditMeta: DtrAuditMeta;
};
```

```38:42:lib/m55/dtrEngine.ts
export type DtrAuditMeta = {
  stemLaneIndex: number;
  stemChar: string;
  derivation: string;
};
```

### E3. Core logic

| Step | File:line | Effect on result |
|------|-----------|------------------|
| Stem index | ```798:798:lib/m55/dtrEngine.ts``` | `essenceStemLaneIndex(input.birthDate)` |
| Stem display row | ```799:799:lib/m55/dtrEngine.ts``` | `TEN_STEM_DISPLAY[idx]` |
| Section bodies | ```800:800:lib/m55/dtrEngine.ts``` | `STEM_BODIES[idx]` |
| Nickname splice | ```801:801:807:807:lib/m55/dtrEngine.ts``` | s1 overline；s8 bridge；**stem 3 tokens** ```830:866:lib/m55/dtrEngine.ts``` |
| Return meta | ```898:902:lib/m55/dtrEngine.ts``` | `derivation: 'jdn_offset_provisional_v1'` |
| Engine version | ```906:906:lib/m55/dtrEngine.ts``` | `'dtr-v1-jdn-day-stem-provisional'` |

**Not in input:** birthTime, timezone, country, 節入り, 旧暦.

---

## F. Fulfillment → `envelope_json` persisted shape

| Step | File:line |
|------|-----------|
| Trigger | ```142:147:lib/m55/dtrCoreCheckoutFulfillment.ts``` — `upsertDtrReportSnapshotAtFulfillment` |
| Profile source | ```90:100:lib/m55/dtrDraftDb.ts``` — Stripe metadata **`profileNickname`**, **`profileBirthDate`**；draft fallback |
| Engine | ```107:116:lib/m55/dtrDraftDb.ts``` — `runDtrEngine(input)` |
| DB write | ```134:141:lib/m55/dtrDraftDb.ts``` — **`profile_snapshot`**, **`envelope_json`**, `draft_snapshot` |

### F1. `envelope_json` top-level fields（at write time）

| Field | Source |
|-------|--------|
| `contractVersion` | `'v1'` ```905:905:lib/m55/dtrEngine.ts``` |
| `engineVersion` | `'dtr-v1-jdn-day-stem-provisional'` |
| `generatedAt` | `new Date().toISOString()` ```907:907:lib/m55/dtrEngine.ts``` |
| `payload.title` | `Entry Report — {nick}さんの取り扱い説明書` ```889:889:lib/m55/dtrEngine.ts``` |
| `payload.fullSections` | 8 sections from `SECTION_SPECS` + `STEM_BODIES[idx]` |
| `payload.teaserSections` | titles only, empty body ```880:886:lib/m55/dtrEngine.ts``` |
| `auditMeta.stemLaneIndex` | JDN lane |
| `auditMeta.stemChar` | `stem.stemChar` from `TEN_STEM_DISPLAY` |
| `auditMeta.derivation` | `'jdn_offset_provisional_v1'` |

**Immutable column:** migration comment ```36:36:supabase/migrations/20260420000000_dtr_drafts_and_report_snapshots.sql```.

---

## G. `envelope_json` read path vs re-run（AC-EB-04）

| Path | Uses stored `envelope_json`? | Evidence |
|------|------------------------------|----------|
| `getDtrReportSnapshot` | Loads into row type | ```69:69:lib/m55/dtrDraftDb.ts``` |
| **`/dtr/core` SSR** | **No** — re-runs engine | ```31:39:app/dtr/core/page.tsx``` comment L31–33 |
| `DtrFullReader` | Consumes **passed-in** `envelope` from page（re-run product） | ```2340:2340:components/dtr/DtrFullReader.tsx``` |

**Implication:** Purchase-time `envelope_json` is **evidence / audit**；live UI text tracks **current `runDtrEngine` code** if `profile_snapshot` unchanged.** Stem lane stable** iff `essenceStemLaneIndex` unchanged.

---

## H. `canonicalBoundary.ts` — stem connection（必須 #6）

### H1. Pipeline order

```214:217:lib/m55/coreResult/canonicalBoundary.ts
  const normalized = normalizeBirthContext(input);
  const boundary = resolveBoundaryContext(normalized);
  const staticCore = computeStaticCoreDeterministic(normalized, boundary);
```

### H2. Stem computation — **boundary NOT used for lane**

```143:144:lib/m55/coreResult/canonicalBoundary.ts
  const lane = essenceStemLaneIndex(normalizedInput.normalizedGregorianDate);
  const idx = typeIndexFromStemLane(lane);
```

**`boundaryContext` used for:**
- ```151:151:lib/m55/coreResult/canonicalBoundary.ts``` — `staticFingerprint` includes `boundary.dayBoundary`
- ```160:164:lib/m55/coreResult/canonicalBoundary.ts``` — `displayFingerprint` includes solar/lunar/fallbackMode
- ```181:188:lib/m55/coreResult/canonicalBoundary.ts``` — `computeDynamicObservation` weekly boundary strings

**NOT used for:** `lane` / `idx` / axis score selection（scores from `TYPE_CATALOG[idx].coreAxisScores` ```148:154:lib/m55/coreResult/typeCatalog.ts``` in seed）.

### H3. Corrections in `resolveBoundaryContext`（必須 #7）

| Correction | Implemented | File:line | Affects stem? |
|------------|-------------|-----------|---------------|
| **節入り** | **Label only** (`solarTermBoundary` ISO string) | ```124:128:lib/m55/coreResult/canonicalBoundary.ts``` | **no** |
| **旧暦** | **Label only** (`lunarBoundary`) | ```125:129:lib/m55/coreResult/canonicalBoundary.ts``` | **no** |
| **時刻** | `normalizeTime`；missing → `12:00:00.000` ```54:55:lib/m55/coreResult/canonicalBoundary.ts``` | ```115:116:lib/m55/coreResult/canonicalBoundary.ts``` day shift if h&lt;4 | **no**（stem uses civil date L143） |
| **timezone** | `resolveCanonicalTimezone` JP vs UTC ```63:69:lib/m55/coreResult/canonicalBoundary.ts``` | ```113:131:lib/m55/coreResult/canonicalBoundary.ts``` boundary hour | **no** |
| **海外出生地** | `country` / `birthplace` → TZ ```64:66:lib/m55/coreResult/canonicalBoundary.ts``` | same | **no** |
| **1983-02-28 anchor** | Fixed boundaries ```103:110:lib/m55/coreResult/canonicalBoundary.ts``` | **no** stem change |
| **Invalid date** | `assertIsoDate` / `parseAndValidateIso` | ```50:52:lib/m55/coreResult/canonicalBoundary.ts```, ```79:90:lib/m55/essenceEngine.ts``` | throw |

**`/core` UI path does not pass `birthTime` / `country`:** ```9:11:lib/m55/coreResult/buildCoreResult.ts``` — always noon fallback + `UNSPECIFIED` country in normalize string ```92:92:lib/m55/coreResult/canonicalBoundary.ts```.

**Diagnostics API can pass `country`:** ```150:150:app/api/diagnostics/core-regression/route.ts``` — boundary differs；**stem unchanged** per ENGINE-AUDIT-A country matrix.

---

## I. `1983-02-28` — current code expectations（必須 #8）

**Computed:** JDN → **`stemLaneIndex = 3`**（Python spot-check in AUDIT-A；code path ```101:105:lib/m55/essenceEngine.ts```）.

| Surface | stemLane | Stem char | Primary public label | EN / trait |
|---------|----------|-----------|----------------------|------------|
| **Free `/core` hero** | 3 | **丁** | `coreType` **TYPE_04** ```29:29:lib/m55/coreResult/buildCoreResult.ts``` | **ANALYST** ```89:90:components/core/CoreHeroSection.tsx```；trait **静観分析** ```90:90:components/core/CoreHeroSection.tsx```；**分析類型** ```162:162:components/core/CoreHeroSection.tsx``` |
| **Free catalog seed** | 3 | 丁 | **静観分析型** ```145:145:lib/m55/coreResult/typeCatalog.ts``` | — |
| **Paid `/dtr/core` hero** | 3 | 丁 | **クリエイター** ```663:663:components/dtr/DtrFullReader.tsx``` `stem.publicTitle` | `TEN_STEM_DISPLAY[3]` ```41:47:lib/m55/tenStemCatalog.ts``` |
| **Paid shelf（owned）** | 3 | 丁 | **クリエイター** | `deriveDtrShelfStemDisplay` ```21:26:lib/m55/dtrShelfStemDisplay.ts``` |
| **Essence spotcheck** | 3 | 丁 | `TEN_STEM` title in summary | ```169:174:lib/m55/essenceEngine.ts``` |

**Lane 9（癸 / アナリスト）:** Only when `birthDate` maps to JDN lane 9 — **not** `1983-02-28`.

**e2e contract:** ```40:43:e2e/core-founder-anchor-hero.spec.ts``` — ANALYST + 静観分析 for `1983-02-28`.

**VERIFY-A fix:** Post-purchase pass = **same stemLane 3** + paid shows **クリエイター**；not 癸/アナリスト unless calendar law changes stem.

---

## J. Free vs paid label sources（必須 #9）

| Layer | Free `/core` | Paid `/dtr` / `/dtr/core` |
|-------|--------------|---------------------------|
| **Stem index** | `essenceStemLaneIndex(birthDate)` | **Same function** |
| **Type table** | `TYPE_CATALOG[lane]` → `coreType`, `coreLabel`, axis scores | **Not used** in `runDtrEngine` |
| **Hero EN/JP** | `HERO_VISUAL_PRESET[coreType]` ```71:122:components/core/CoreHeroSection.tsx``` | **Not used** |
| **Paid title** | — | `TEN_STEM_DISPLAY[lane].publicTitle` ```799:799:lib/m55/dtrEngine.ts``` |
| **Paid body** | `TYPE_CATALOG` narratives via `buildCoreResult` | `STEM_BODIES[lane]` in `dtrEngine.ts` |
| **`DTR_TYPE_EN`** | **Absent in `*.ts`/`*.tsx`**（removed TL-FIX-C） | — |

**Lane 3 example（1983-02-28）:**

| Index | `TEN_STEM_DISPLAY` | `TYPE_CATALOG` coreLabel | `HERO_VISUAL_PRESET` |
|-------|-------------------|--------------------------|----------------------|
| 3 | **クリエイター** | **静観分析型** | **ANALYST** / **静観分析** |

**Conclusion:** **Same stem lane, three parallel label systems** on free hero vs free catalog vs paid.

---

## K. Intended M55 spec vs code（必須 #10）

| Spec source | What it requires | Code reality | Gap |
|-------------|------------------|--------------|-----|
| **`M55_CANONICAL_IO_CONTRACT_SSOT_v1`** | `birthDate` 演算初期値；`nickname` 非主因；determinism | **Matched** for DTR + essence | Optional fields not wired in My Page |
| **`M55_TEN_STEM_PROFESSIONAL_MAPPING_SSOT_20260324`** | Layer3 **display** mapping from ten stems；**does not change Layer2** | `TEN_STEM_DISPLAY` used in paid | Free uses **separate** `TYPE_CATALOG` / `HERO_VISUAL_PRESET` |
| **`M55_GOLDEN_VECTOR_AUDIT_1983_02_28`** | Same input → same raw/display | `/core` e2e + diagnostics | Paid labels differ from free hero |
| **Product term「複合占術」** | No dedicated PRIMARY_ACTIVE_LAW file found | Implementation = **JDN day-stem provisional** + boundary **metadata** on `/core` only | **G1** — 節入り/旧暦 not driving stem |
| **ENGINE-AUDIT-A G1–G8** | — | **Confirmed in code** | See §L |

**Layer SSOT explicit rule:** ```15:15:00_PRIMARY_ACTIVE_LAW/M55_TEN_STEM_PROFESSIONAL_MAPPING_SSOT_20260324_v1.md``` — **Layer2 演算を変更しない**. Code complies by **not** mapping 節入り into `essenceStemLaneIndex` — but product copy may **over-imply** full composite astrology.

---

## L. Known gaps（post-audit）

| ID | Finding | Severity |
|----|---------|----------|
| **G1** | Stem = JDN + offset only | **P0** |
| **G2** | `resolveBoundaryContext` disconnected from stem | **P0** |
| **G3** | My Page: birthDate + nickname only | **P1** |
| **G4** | Free hero `HERO_VISUAL_PRESET` ≠ `TEN_STEM` at same lane | **P1** — TL-F7 |
| **G5** | `/dtr/core` ignores stored `envelope_json` for display | **P2** |
| **G6** | `TYPE_CATALOG` label vs `TEN_STEM` at lane 3 both differ from hero EN | **P1** |
| **G7** | VERIFY「癸/アナリスト」≠ `1983-02-28` code path | **P0** doc |
| **G9** | `runDtrEngine` stem-3 nickname token replacements hard-coded ```842:866:lib/m55/dtrEngine.ts``` | **P2** maintainability |

---

## M. Production risk（unchanged from A, code-confirmed）

| Class | Status |
|-------|--------|
| **R0** | Asserting full 複合占術 on 節入り/旧暦 — **not supported in code** |
| **R1** | Same birthDate → **ANALYST** (free) vs **クリエイター** (paid) for lane 3 — **confirmed** |
| **R2** | Engine text refresh without reading `envelope_json` — **confirmed** ```31:33:app/dtr/core/page.tsx``` |

**Production appropriateness:** Still **BLOCKED** for calendar-law assertion；**OK for “provisional JDN stem + immutable snapshot profile”** contract.

---

## N. Next gates

| Gate | Role |
|------|------|
| **ENGINE-AUDIT-C** | Deterministic matrix；`runEssenceSpotcheck`；`core-regression` API；optional `envelope_json` hash vs re-run |
| **TL-F7** | Unify or document `TYPE_CATALOG` / `HERO_VISUAL_PRESET` / `TEN_STEM_DISPLAY` |
| **CORE-DTR-VERIFY-B+** | Use §I expected values |

---

## O. No-mutation statement

- **No** code / DB / payment / deploy / env / Stripe / Clerk / Slack
- **No** raw user_id / email / session / secret in SSOT

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-B-M55-ORIGINAL-COMPOSITE-ASTROLOGY-ENGINE-READ-ONLY-CODE-AUDIT-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-A-M55-ORIGINAL-COMPOSITE-ASTROLOGY-ENGINE-CONSISTENCY-AUDIT-PLAN-001`** | Planning |
