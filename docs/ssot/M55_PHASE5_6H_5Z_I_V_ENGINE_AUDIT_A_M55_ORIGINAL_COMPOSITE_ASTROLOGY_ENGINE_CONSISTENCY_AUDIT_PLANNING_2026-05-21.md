# Phase 5-6H-5Z-I-V-ENGINE-AUDIT-A — M55 original composite astrology engine consistency audit planning gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-AUDIT-A** |
| **Title** | **M55 original composite astrology engine consistency audit planning** |
| **Classification** | **Category 1 / engine contract audit planning / docs-only / no-mutation** |
| **Verdict** | **`M55_ORIGINAL_COMPOSITE_ASTROLOGY_ENGINE_CONSISTENCY_AUDIT_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-A-M55-ORIGINAL-COMPOSITE-ASTROLOGY-ENGINE-CONSISTENCY-AUDIT-PLAN-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **CORE-DTR-A/B**；**TL-FIX-C**；**CORE-DTR-VERIFY-A**；golden vector **`M55_GOLDEN_VECTOR_AUDIT_1983_02_28_SSOT_v1.md`** |

**Execution:** read-only code/doc inventory in this gate.** **No** code / DB / deploy / payment.

---

## B. Audit scope statement

**Question:** Does production/preview “鑑定ロジック” consistently implement **M55オリジナル複合占術** across `/core`, `/dtr`, `/dtr/core`, snapshot fulfillment, and label surfaces?

**Method (this gate):** Static repo inventory + route mapping + gap classification.** **ENGINE-AUDIT-B** = deeper read-only trace.** **ENGINE-AUDIT-C** = local deterministic matrix.** **TL-F7** = label parity product gate.

**Do not conflate:**
- **Engine output**（stem lane, sections, axis scores）
- **Display label**（`TYPE_CATALOG` / `HERO_VISUAL_PRESET` / `TEN_STEM_DISPLAY`）
- **Policy**（mutable `/core` vs immutable paid snapshot）

---

## C. Engine inventory

| Module | Role | Stem / type source | Boundary / 節入り / 旧暦 |
|--------|------|-------------------|-------------------------|
| **`essenceEngine.ts`** | **Shared stem primitive** — `essenceStemLaneIndex(iso)` → JDN + offset mod 10 | **birthDate only** | **Not applied**（comment L10: birthTime/tz not in input） |
| **`runCanonicalCorePipeline`** (`canonicalBoundary.ts`) | **Free `/core` engine** — axis, composition, TYPE seed | **`essenceStemLaneIndex` → `typeIndexFromStemLane` → `TYPE_CATALOG`** | **Partial** — `resolveBoundaryContext` computes solar/lunar/day boundaries; **does not change stem index** |
| **`buildCoreResult`** | Wraps pipeline → `CoreResult` | Same as pipeline | Only **`birthDate`** passed from profile today |
| **`ensureSealedCoreResult`** (`store.ts`) | Client cache / seal | Rebuild when profile mismatch | N/A |
| **`runDtrEngine`** (`dtrEngine.ts`) | **Paid DTR body** — 8 sections | **`essenceStemLaneIndex` → `TEN_STEM_DISPLAY` + `STEM_BODIES`** | **None** |
| **`runEssenceEngine`** | Layer2 essence envelope（home tmp / diagnostics） | Same JDN stem | **None** |
| **`todayEngine` / `weeklyEngine`** | Other scopes | `essenceStemLaneIndex(birthDate)` | **Not audited deep in A** |
| **`deriveDtrShelfStemDisplay`** | Server owned shelf stem | Same function as DTR | **None** |
| **`upsertDtrReportSnapshotAtFulfillment`** | Persist snapshot + `envelope_json` | `runDtrEngine` at fulfillment | **None** |

### C1. Label / display tables（not separate engines）

| Artifact | Location | Maps from |
|----------|----------|-----------|
| **`TYPE_CATALOG`** | `lib/m55/coreResult/typeCatalog.ts` | `typeIndexFromStemLane` (= stem lane 0–9) |
| **`HERO_VISUAL_PRESET`** | `components/core/CoreHeroSection.tsx` | `CoreResult.coreType` → EN/JP hero |
| **`CORE_TYPE_EN_TAG`** | `components/core/corePublicCopy.ts` | `coreType` → EN tag |
| **`TEN_STEM_DISPLAY`** | `lib/m55/tenStemCatalog.ts` | stem lane → JP `publicTitle` / symbol |
| **`DTR_TYPE_EN`** | — | **Removed from code**（TL-FIX-C）；historical docs only |
| **`STEM_BODIES`** | `dtrEngine.ts` | stem lane → paid section bodies |

### C2. Provisional stem law（audit flag）

| Field | Value |
|-------|--------|
| **Derivation ID** | `STEM_DERIVATION_PROVISIONAL_ID = jdn_offset_provisional_v1` |
| **Formula** | Gregorian civil date → JDN → `(jdn + 9) % 10` |
| **Status** | **Not asserted as final 複合占術 SSOT** — requires golden + calendar law audit |

---

## D. Route-to-engine mapping

| Route / API | Auth | Input source | Engine invoked | Output consumed |
|-------------|------|--------------|----------------|-----------------|
| **`/core`** | Client | `ProfileRepository` → `ensureSealedCoreResult` | `buildCoreResult` → `runCanonicalCorePipeline({ birthDate })` | `CoreResult` + `HERO_VISUAL_PRESET` |
| **`/dtr`** shelf unowned | Client | `ProfileRepository.birthDate` | `essenceStemLaneIndex` + `TEN_STEM_DISPLAY` | Card preview |
| **`/dtr`** shelf owned | Server | `snap.profile_snapshot` | `deriveDtrShelfStemDisplay` → same stem fn | Card preview（TL-FIX-C） |
| **`/dtr/core`** | Server | **`snap.profile_snapshot` only** | **`runDtrEngine` re-run at SSR**（not `envelope_json` read） | `DtrFullReader` + `TEN_STEM_DISPLAY` |
| **`GET /api/dtr/report-snapshot-ready`** | Server | DB ownership + snapshot presence | **No engine** — access only | `ready`, drift fields（CORE-DTR-B planned） |
| **Checkout fulfillment** | Server | Stripe metadata `profileBirthDate` / `profileNickname` → draft fallback | `runDtrEngine` → upsert **`profile_snapshot` + `envelope_json`** | DB immutable row |
| **My Page profile save** | Client | `ProfileRepository.save` | Triggers **`m55:profile_updated`** → `/core` rebuild | **Does not** call DTR engine / snapshot |
| **`/api/diagnostics/core-regression`** | Dev | `birthDate` (+ optional `country`) | `runCanonicalCorePipeline` | Determinism vectors |
| **`/api/room/core/send`** | Server | chat context | `runDtrEngine`（separate lane） | Out of CORE-DTR verify scope |

### D1. Critical read-path fork

| Path | Behavior | Risk class |
|------|----------|------------|
| **`envelope_json` at fulfillment** | Written once at purchase | **Historical truth** for audit |
| **`/dtr/core` SSR** | **Re-derives** `runDtrEngine` from **`profile_snapshot`**; comment: code text edits visible without migration | **Engine version drift** vs stored envelope；**stem stable** if `essenceStemLaneIndex` unchanged |
| **`/core` local seal** | Frozen `CoreResult` until profile changes | **Mutable** with profile |

---

## E. Input field matrix

| Field | `BirthProfile` / My Page | `DtrCanonicalInput` | `NormalizeBirthInput` (/core) | Fulfillment metadata | Affects stem lane today? |
|-------|-------------------------|---------------------|--------------------------------|----------------------|-------------------------|
| **birthDate** | **yes** | **yes** | **yes** | **yes** | **yes（sole stem driver）** |
| **nickname** | **yes** | **yes**（copy only） | **no** in pipeline | **yes** | **no**（DTR s8 bridge text only） |
| **birthTime** | **no UI** | **no** | optional API only | **no** | **no**（boundary only if passed） |
| **timezone** | **no** | **no** | derived `Asia/Tokyo` or `UTC` from country/place | **no** | **no** for stem |
| **birthplace / country** | **no UI** | **no** | optional API only | **no** | **no** for stem；**yes** for boundary metadata |
| **calendar system** | **no** | **no** | **no** | **no** | **no** |
| **locale** | implicit `ja-JP` | **`ja-JP` fixed** | N/A | N/A | **no** |
| **contextScope** | N/A | **`dtr` fixed** | N/A | N/A | **no** |
| **nowDate / fixedNow** | N/A | N/A | `fixedNow` in pipeline（dynamic slice） | N/A | **no** for static stem |

---

## F. Correction support matrix

| Correction | Implemented? | Where | Affects `essenceStemLaneIndex`? | Affects /core display? | Affects paid DTR? |
|------------|--------------|-------|--------------------------------|------------------------|-----------------|
| **節入り（solar term）** | **Metadata only** | `resolveBoundaryContext` → `solarTermBoundary` | **no** | Fingerprints / logging / anchor exception | **no** |
| **旧暦変換** | **Metadata only** | `lunarBoundary` | **no** | Same | **no** |
| **日付境界（子初など）** | **Partial** | day shift if birthTime &lt; 04:00 in boundary path | **no**（stem still civil `birthDate`） | Boundary strings | **no** |
| **タイムゾーン** | **Partial** | `resolveCanonicalTimezone` JP vs UTC | **no** | Boundary hour selection | **no** |
| **海外出生地** | **Partial** | country/place → TZ | **no** | Boundary | **no** |
| **出生時刻あり** | **Partial** | `normalizeTime`；missing → noon | **no** | fallbackMode flag | **no** |
| **leap / invalid date** | **yes** | `parseAndValidateIso` throws | N/A | Error path | Error at engine |
| **1983-02-28 anchor** | **yes** | Fixed boundaries `anchor-1983-02-28-fixed` | **no**（stem still JDN） | Regression anchor | **no** |
| **fallback noon** | **yes** | `birth-time-missing-fixed-noon` | **no** | Metadata | **no** |

**Conclusion (A-gate):** **複合占術の節入り・旧暦・時刻補正は `/core` pipeline に“境界メタデータ”として存在するが、天干レーン（鑑定stem）計算には未接続。** **Paid DTR は civil `birthDate` のみの provisional JDN 経路。**

---

## G. Label mapping matrix

| stemLane | Stem char | `TEN_STEM_DISPLAY.publicTitle` (paid) | `TYPE_CATALOG` (free) | `HERO_VISUAL_PRESET` EN (free) | Semantic alignment |
|----------|-----------|--------------------------------------|----------------------|-------------------------------|------------------|
| 0 | 甲 | プレジデント | TYPE_01 | OBSERVANT… | Different naming systems |
| 1 | 乙 | プランナー | TYPE_02 | … | … |
| 2 | 丙 | インフルエンサー | TYPE_03 | CREATOR* | **Known cross-table drift** |
| 3 | 丁 | クリエイター | **TYPE_04** | **ANALYST** | **Known cross-table drift** |
| … | … | … | … | … | … |
| 9 | 癸 | **アナリスト** | TYPE_10 | PRODUCER* | **Not same index semantics as “ANALYST”** |

\* Hero EN labels are **marketing presets** keyed by `coreType`, not `TEN_STEM` English.

**1983-02-28（computed JDN → stemLane = 3）:**

| Surface | Expected in VERIFY-A doc | **Actual per current code** |
|---------|-------------------------|----------------------------|
| **Free `/core`** | 分析類型 / **ANALYST** / 特質性 / **静観分析** | **PASS** — `TYPE_04` + `HERO_VISUAL_PRESET`（e2e `core-founder-anchor-hero.spec.ts`） |
| **Paid `/dtr/core`** | stem **癸** → **アナリスト** | **MISMATCH** — lane **3** → **丁 / クリエイター**（`TEN_STEM_DISPLAY[3]`） |

**Audit finding G-1:** VERIFY-A/CORE-DTR-VERIFY の「癸→アナリスト」は **現行 provisional engine では 1983-02-28 に成立しない。** 成立するのは **lane 3 → free ANALYST / paid クリエイター** の組み合わせ。** 複合占術の“正しい”癸日付なら **ENGINE-AUDIT-C** で calendar SSOT と突合が必要。

---

## H. Expected invariants — status

| Invariant | Status | Notes |
|-----------|--------|-------|
| Same profile input → same engine output（per engine fn） | **PASS** within `runDtrEngine` / `runCanonicalCorePipeline` | Deterministic by design |
| Paid snapshot fixed at purchase | **PASS** | `profile_snapshot` immutable；fulfillment upsert idempotent |
| `/core` recalculates on current profile | **PASS** | `ensureSealedCoreResult` + profile event |
| Label diff ≠ engine diff | **PARTIAL** | Same stem lane still yields **different public titles** free vs paid |
| Label mapping canonical | **GAP** | **TL-F7** not done；`DTR_TYPE_EN` removed |
| Profile change does not overwrite snapshot | **PASS** | No UPDATE path on drift |

---

## I. Verification case catalog（ENGINE-AUDIT-B/C）

| Case ID | Scenario | ENGINE-AUDIT-B action | Pass signal |
|---------|----------|----------------------|-------------|
| **VC-01** | `1983-02-28` golden | Trace stem lane + all surfaces | Free ANALYST；paid `publicTitle` documented |
| **VC-02** | Solar-term boundary date | Compare boundary metadata vs stem | Document if stem unchanged |
| **VC-03** | Lunar-conversion-required date | TBD calendar SSOT input | **BLOCKED** until SSOT |
| **VC-04** | With / without `birthTime` via API | `runCanonicalCorePipeline` only | boundary `fallbackMode` diff；stem same |
| **VC-05** | `country=JP` vs `US` | diagnostics matrix exists | stem same；boundary differs |
| **VC-06** | Overseas birthplace | API `country` / `birthplace` | TZ metadata only |
| **VC-07** | Profile change post-purchase | Read paths only | `/core` changes；`/dtr/core` stable |
| **VC-08** | Fulfillment → read | Compare `envelope_json` vs re-run | Stem + section hash match |
| **VC-09** | Engine version bump | Diff `envelope_json` vs SSR re-run | Document drift policy |

---

## J. Known gaps

| ID | Gap | Severity | Owner gate |
|----|-----|----------|------------|
| **G1** | **Stem = provisional JDN offset**, not 節入り/旧暦 law | **P0** prod correctness | ENGINE-AUDIT-C + calendar SSOT |
| **G2** | **Boundary corrections disconnected from stem** | **P0** | ENGINE-AUDIT-B trace |
| **G3** | **My Page lacks birthTime/country** — pipeline supports more than UI | **P1** | Product intake gate |
| **G4** | **Free `TYPE_CATALOG` vs paid `TEN_STEM_DISPLAY` naming**（lane 3 example） | **P1** UX | **TL-F7** |
| **G5** | **`/dtr/core` ignores stored `envelope_json`** — re-run engine | **P2** ops | ENGINE-AUDIT-B |
| **G6** | **`DTR_TYPE_EN` removed** but historical SSOT still references | **P3** docs | Doc hygiene |
| **G7** | **1983-02-28 VERIFY doc 癸/アナリスト** vs code **丁/クリエイター** | **P0** test plan | Fix VERIFY-A/C criteria |
| **G8** | **HERO EN preset ≠ TEN_STEM publicTitle** by design | **P2** | TL-F7 scope decision |

---

## K. Production risk classification

| Class | Meaning | Current items |
|-------|---------|---------------|
| **R0 — contract false confidence** | Marketing asserts full 複合占術 but stem is JDN-only | **G1, G2** |
| **R1 — free/paid user confusion** | Same birthDate, different type names | **G4, G7** |
| **R2 — immutable evidence drift** | Text changes without migration | **G5** |
| **R3 — historical doc noise** | Old diagnostics reference removed tables | **G6** |

**Production appropriateness assertion:** **BLOCKED** until **ENGINE-AUDIT-B GREEN** + **ENGINE-AUDIT-C** golden vectors + Human sign-off on stem law.

---

## L. Pass/fail criteria — ENGINE-AUDIT-B（read-only code audit）

| ID | Criterion |
|----|-----------|
| **AC-EB-01** | Every route in §D has traced file:line input → engine → display mapper |
| **AC-EB-02** | `essenceStemLaneIndex` call sites enumerated；none apply 節入り to stem |
| **AC-EB-03** | Fulfillment input fields documented（metadata keys only） |
| **AC-EB-04** | `envelope_json` vs SSR re-run policy documented with code citation |
| **AC-EB-05** | Golden `1983-02-28` stem lane **3** recorded in evidence（integer only） |
| **AC-EB-06** | Gap table §J updated with any new forks |
| **AC-EB-07** | VERIFY-A/C criteria aligned to §G（no false 癸 expectation） |
| **AC-EB-08** | No mutation；no raw ID in SSOT |

**Verdict labels:** `ENGINE_READ_ONLY_AUDIT_GREEN` | `ENGINE_READ_ONLY_AUDIT_PARTIAL` | `ENGINE_READ_ONLY_AUDIT_BLOCKED`.

---

## M. Pass/fail criteria — ENGINE-AUDIT-C（local deterministic test matrix）

| ID | Criterion |
|----|-----------|
| **AC-EC-01** | Script/matrix runs `essenceStemLaneIndex` + both engines for VC-01–06 |
| **AC-EC-02** | `core-regression` API vectors diffTotal = 0 on CI host |
| **AC-EC-03** | Optional: compare `envelope_json` hash vs re-run for fixture profile |
| **AC-EC-04** | Calendar-law cases **VC-03** marked skip or fail until SSOT |
| **AC-EC-05** | No production DB / payment |

---

## N. Next gates

| Priority | Gate |
|----------|------|
| **1** | **ENGINE-AUDIT-B** — read-only code audit execution（§L） |
| **2** | **ENGINE-AUDIT-C** — local deterministic matrix（§M） |
| **3** | **TL-F7** — label parity planning（free/paid canonical table） |
| **4** | **CORE-DTR-VERIFY-B〜E** — after §G-7 criteria fix |
| **5** | **CORE-DTR-C** — drift UI（orthogonal to stem law） |

---

## O. No-mutation statement

- **No** code / DB / checkout / webhook / env / deploy
- **No** raw user_id / email / session / secret

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-A-M55-ORIGINAL-COMPOSITE-ASTROLOGY-ENGINE-CONSISTENCY-AUDIT-PLAN-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-A-…`** | Mutable vs immutable policy |
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-VERIFY-A-…`** | E2E purchase verify plan（criteria update needed §G-1） |
