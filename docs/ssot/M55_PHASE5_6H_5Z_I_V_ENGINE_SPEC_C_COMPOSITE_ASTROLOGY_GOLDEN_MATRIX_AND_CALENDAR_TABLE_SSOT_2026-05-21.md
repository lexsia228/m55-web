# Phase 5-6H-5Z-I-V-ENGINE-SPEC-C — Composite astrology golden matrix and calendar table SSOT gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-SPEC-C** |
| **Title** | **Composite astrology golden matrix and calendar table SSOT** |
| **Classification** | **Category 1 / calendar + golden matrix SSOT / docs-only / no-mutation** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_GOLDEN_MATRIX_AND_CALENDAR_TABLE_SSOT_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-C-COMPOSITE-ASTROLOGY-GOLDEN-MATRIX-AND-CALENDAR-TABLE-SSOT-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-SPEC-B-R** — **`H-SOLAR-LUNAR-01`**；1983 golden **9/癸/アナリスト** |

**Execution:** SSOT + matrix specification only.** **No** code / DB / deploy / checkout.

**This gate makes HYBRID law *implementable in principle*** — numeric proof of boundary rows occurs in **ENGINE-VERIFY-A** after **ENGINE-IMPL-A** ingests tables.

---

## B. Calendar table source decision

### B1. Authority stack

| Priority | Source | Role |
|----------|--------|------|
| **1** | **本条 + ENGINE-SPEC-B-R** | Normative law |
| **2** | **`M55_COMPOSITE_CALENDAR_TABLE_SSOT_v1`**（planned file — **ENGINE-IMPL-A** creates） | Frozen table data |
| **3** | **`correctionVersion`** | `m55-calendar-2026-01` |

**Planned repo paths（implementation targets — not created in this gate）：**

| Artifact | Path |
|----------|------|
| **Calendar SSOT doc** | `00_PRIMARY_ACTIVE_LAW/M55_COMPOSITE_CALENDAR_TABLE_SSOT_v1.md` |
| **Solar term instants** | `lib/m55/calendar/data/solar_terms_1900_2100.json` |
| **Lunar day mapping** | `lib/m55/calendar/data/lunar_civil_days_1900_2100.json` |
| **Day-boundary constants** | `lib/m55/calendar/m55DayBoundary.ts`（code, IMPL-A） |

### B2. 旧暦変換の根拠（P-LUNAR）

| Field | Decision |
|-------|----------|
| **Method** | **Precomputed civil → lunar day table** per **`Asia/Tokyo` civil midnight anchor** for JP；per resolved IANA TZ for overseas |
| **Not used** | Runtime astronomical lunar age integration in v1 |
| **Provenance label** | `lunar_table_source: m55_almanac_v1_derived` |
| **Derivation note** | Tables built from **M55-authoritative almanac pipeline**（Human-approved derivation run — **no third-party API at runtime**） |
| **Stem mapping** | Lunar day stem index 0–9 → `essenceStemLaneIndex` **replacement** via **`lunarDayStemIndex(lunarDayKey)`** — **not** civil JDN |

### B3. 節入り / 二十四節気テーブルの根拠（P-SOLAR meta）

| Field | Decision |
|-------|----------|
| **Method** | **Precomputed solar term instants**（24 terms × years in range） |
| **Timezone for instants** | Stored as **ISO-8601 with offset**；comparison uses **birth local TZ** |
| **立春 rule** | **`solarYearKey`** increments at **立春 instant** in local TZ for birth location |
| **Stem impact** | **None direct** — only adjusts **`lunarYearAssignment`** before N6 |
| **Provenance label** | `solar_table_source: m55_solar_terms_v1` |

### B4. Timezone basis

| Case | TZ resolution |
|------|----------------|
| **JP birth** | **`Asia/Tokyo`** |
| **Overseas** | Country → primary IANA（table in `lib/m55/calendar/data/tz_country_primary.json`） |
| **City override** | Phase-2 — not v1 |
| **DST** | **Use IANA offset at local civil datetime**（tzdata rules embedded or library） |

### B5. Supported range

| Table | Range | Out of range |
|-------|-------|--------------|
| **Solar terms** | **`1900-01-01` … `2100-12-31`**（civil coverage） | `M55_COMPOSITE_DATE_OUT_OF_RANGE` |
| **Lunar civil map** | same | same |
| **Engine** | Reject birthDate outside range **before** stem |

### B6. Table missing / corrupt — fail-closed

| Condition | v2 engine | legacy engine |
|-----------|-----------|---------------|
| JSON missing at boot | **Fail-closed** — `/core` v2 tier shows maintenance | Unaffected |
| Date key missing in JSON | `M55_COMPOSITE_CALENDAR_TABLE_MISSING` | N/A |
| Checksum mismatch | `M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL` | N/A |
| **Forbidden** | Silent fallback to `essenceStemLaneIndex(birthDate)` in v2 | — |

---

## C. Day boundary rule（N4 — fixed for matrix）

| Rule ID | **M55_DAY_BOUNDARY_V1** |
|---------|-------------------------|
| **子初** | Local time **`23:00–23:59`** → effective civil date **+1 day** for lunar lookup |
| **早子** | **`00:00–00:59`** → effective date **−1 day** for lunar lookup（optional phase-2 — **v1: only 23:00 rule**） |
| **Default** | Other hours → same civil date |

**SPEC-C locks v1:** **23:00 local only**（matches partial `canonicalBoundary` hour&lt;4 UTC pattern directionally）.

---

## D. Golden matrix（normative test catalog）

**Columns:** `caseId` | input summary | **v2 expected** | legacy v1（reference） | notes

### D1. Anchor — TM-01 / GX-01

| caseId | Input | v2 expected | legacy v1 |
|--------|-------|-------------|-----------|
| **GX-01** | §E full fixture | §E | lane **3** 丁 / クリエイター |

### D2. 節入り境界（立春帯 — Tokyo）

**Fixture base:** `country=JP`, `birthTime=12:00`, `birthTimeUnknown=false`

| caseId | birthDate | v2 stem (expected at VERIFY) | legacy v1 | Boundary note |
|--------|-----------|------------------------------|-----------|---------------|
| **GX-02a** | `2024-02-03` | **Compute at VERIFY** — record `stemLane/stemChar` | lane 3 丁 | Civil day before 立春 |
| **GX-02b** | `2024-02-04` | **Compute at VERIFY** | lane 4 戊 | 立春当日帯 |
| **GX-02c** | `2024-02-05` | **Compute at VERIFY** | lane 5 己 | After 立春 |
| **GX-02-meta** | all | `solarTermKey` present in `boundaryMetadata` | partial meta only | **solarYearKey may differ 02a vs 02c** |

**Invariant:** If lunar day changes across GX-02a/b/c, **stem may change** — not required to match legacy civil JDN pattern.

### D3. 旧暦月境界

| caseId | birthDate | local time | v2 expected | note |
|--------|-----------|------------|-------------|------|
| **GX-03a** | `2024-01-11` | 12:00 JP | **Compute at VERIFY** | 旧暦正月帯候補 |
| **GX-03b** | `2024-02-10` | 12:00 JP | **Compute at VERIFY** | 旧暦月末帯候補 |
| **GX-03-meta** | pair | — | `lunarMonthKey` must be visible in metadata | month boundary ≠ civil month |

### D4. birthTime / unknown

| caseId | birthTime | birthTimeUnknown | v2 `calculationMode` | stem vs GX-01 base |
|--------|-----------|------------------|----------------------|-------------------|
| **GX-04a** | — | **true** | `unknown_time_noon` | **Compute at VERIFY**（may differ from noon explicit） |
| **GX-04b** | `03:30` | false | `full` | **Compute** — day boundary may apply |
| **GX-04c** | `23:30` | false | `full` | **Must apply M55_DAY_BOUNDARY_V1** — likely +1 lunar day |

### D5. Timezone / overseas

| caseId | country | birthplace | TZ | v2 vs same civil JP |
|--------|---------|------------|-----|---------------------|
| **GX-05a** | JP | 東京都 | Asia/Tokyo | baseline |
| **GX-05b** | US | — | America/New_York (table) | **Compute** — may differ |
| **GX-06** | US | New York | America/New_York | **Compute** — local 23:30 rule in US |

### D6. Invalid / out of range

| caseId | Input | Expected |
|--------|-------|----------|
| **GX-07** | `1990-02-30` | `M55_COMPOSITE_INVALID_BIRTHDATE` |
| **GX-08** | `1899-12-31` | `M55_COMPOSITE_DATE_OUT_OF_RANGE` |
| **GX-09** | `2101-01-01` | `M55_COMPOSITE_DATE_OUT_OF_RANGE` |

### D7. Legacy preservation

| caseId | Action | Expected |
|--------|--------|----------|
| **GX-10** | Read existing legacy snapshot row | **No recompute**；stem **3** 丁；envelope bytes unchanged |
| **GX-11** | New purchase after cutover | `engineVersion: m55-composite-stem-v2` only |

**Matrix execution artifact（post-IMPL）：** `docs/audit/ENGINE_VERIFY_MATRIX_RESULTS_YYYYMMDD.json`（generated by **ENGINE-VERIFY-A** — not this gate）.

---

## E. 1983-02-28 v2 expected result（fixed SSOT row）

**Input fixture `GOLDEN_1983_02_28_V2`:**

```json
{
  "birthDate": "1983-02-28",
  "birthTime": "12:00:00",
  "birthTimeUnknown": false,
  "country": "JP",
  "birthplace": "東京都",
  "timezone": "Asia/Tokyo",
  "locale": "ja-JP",
  "contextScope": "essence"
}
```

**Required v2 output（Human baseline — implementation MUST match after table ingest）：**

| Field | Value |
|-------|--------|
| **engineVersion** | `m55-composite-stem-v2` |
| **inputVersion** | `composite-input-v1` |
| **correctionVersion** | `m55-calendar-2026-01` |
| **calculationMode** | `full` |
| **stemLaneIndex** | **9** |
| **stemChar** | **癸** |
| **paid publicTitle** | **アナリスト** |
| **paid symbol** | **雨** |
| **free primary title** | **アナリスト** |
| **free 観測特性** | **静観分析** |
| **free chrome** | **分析類型** / **特質性**（unchanged labels） |

**Required `boundaryMetadata`（minimum keys）：**

| Key | Requirement |
|-----|-------------|
| `solarTermKey` | present（立春後帯想定 — exact value **filled at VERIFY**） |
| `solarTermBoundaryInstant` | ISO with offset |
| `lunarYearKey` | present |
| `lunarDayKey` | present — **must map to 癸 day stem** |
| `lunarMonthKey` | present |
| `dayBoundaryRule` | `m55_day_boundary_v1` |
| `tzSource` | `country_primary` or `explicit` |

**Legacy contrast row（unchanged — audit reference）：**

| engineVersion | stem | paid |
|---------------|------|------|
| `dtr-v1-jdn-day-stem-provisional` | 3 / 丁 | クリエイター |

---

## F. Boundary test cases — acceptance rules

| Rule ID | Pass condition |
|---------|----------------|
| **BC-01** | GX-02*: `solarTermKey` differs when crossing 立春 meta year |
| **BC-02** | GX-04c: lunar effective date ≠ civil when local ≥23:00 |
| **BC-03** | GX-05b: `boundaryMetadata.tzSource` reflects US |
| **BC-04** | GX-07–09: throw documented error codes |
| **BC-05** | GX-10: byte-stable legacy read |
| **BC-06** | GX-01: exact match §E numeric stem |

---

## G. Fail-closed policy（v2）

| Code | When | User-visible |
|------|------|--------------|
| `M55_COMPOSITE_CALENDAR_TABLE_MISSING` | date key absent | Quiet error + support path |
| `M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL` | hash fail | Maintenance |
| `M55_COMPOSITE_DATE_OUT_OF_RANGE` | birthDate ∉ [1900,2100] | Intake validation |
| `M55_COMPOSITE_INVALID_BIRTHDATE` | parse fail | Intake validation |
| `M55_COMPOSITE_INCOMPLETE_PROFILE` | checkout without v2 fields | Block checkout |

**v2 engine MUST NOT** call `essenceStemLaneIndex(birthDate)` as final stem.

---

## H. Implementation invariants（ENGINE-IMPL checklist）

| ID | Invariant |
|----|-----------|
| **INV-01** | v2 path: `runM55CompositeStemPipeline` only |
| **INV-02** | `essenceStemLaneIndex(civilDate)` **forbidden** as v2 stem terminus |
| **INV-03** | Calendar tables loaded at module init；missing → fail-closed |
| **INV-04** | Legacy rows: `engine_version` null or `dtr-v1-jdn-day-stem-provisional` → legacy reader |
| **INV-05** | New fulfillment after cutover: `m55-composite-stem-v2` only |
| **INV-06** | `/dtr/core`: read `envelope_json`；**no** `runDtrEngine` in SSR for prod |
| **INV-07** | `engine_context_json` written once at fulfillment |
| **INV-08** | **No UPDATE/DELETE** on existing snapshots |
| **INV-09** | Owned shelf uses snapshot stem, not live profile |
| **INV-10** | `correctionVersion` stored on snapshot for audit replay |

---

## I. CORE-DTR-VERIFY resume condition（consolidated）

| # | Gate / artifact | Required |
|---|-----------------|----------|
| **1** | **ENGINE-SPEC-C** | **GREEN**（本条） |
| **2** | **ENGINE-IMPL-A** | Calendar files + pipeline |
| **3** | **ENGINE-IMPL-B** | My Page + checkout metadata |
| **4** | **ENGINE-IMPL-C** | DB additive migration + fulfillment write |
| **5** | **ENGINE-IMPL-D** | Routes + stored envelope read |
| **6** | **ENGINE-VERIFY-A** | GX-01〜11 matrix **GREEN**；GX-01 exact §E |
| **7** | Human | **VERIFY-C GO**（one checkout） |
| **8** | Optional | CORE-DTR-C drift UI deployed |

**HOLD lifted only when 1–7 complete.**

**Updated VERIFY golden:** TM-01 = §E **GX-01**；reject legacy 癸 expectation on v1 engine.

---

## J. Next gate

| Priority | Gate |
|----------|------|
| **1** | **ENGINE-IMPL-A** — implementation planning + calendar file creation |
| **2** | **ENGINE-VERIFY-A** — run `engine-verify-matrix.ts` after tables exist |

**Optional:** `M55_COMPOSITE_CALENDAR_TABLE_SSOT_v1.md` in PRIMARY_ACTIVE_LAW when tables are ingested.

---

## K. No-mutation statement

- **No** code / DB / migration / checkout / deploy / env
- **No** raw ID / email / session / secret

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-C-COMPOSITE-ASTROLOGY-GOLDEN-MATRIX-AND-CALENDAR-TABLE-SSOT-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-B-R-COMPOSITE-ASTROLOGY-STEM-LAW-HUMAN-SIGN-OFF-001`** | Sign-off |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-C-M55-ENGINE-DETERMINISTIC-MATRIX-001`** | Legacy reference |
