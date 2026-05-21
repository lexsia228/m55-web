# Phase 5-6H-5Z-I-V-ENGINE-SPEC-A — Composite astrology stem law specification planning gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-SPEC-A** |
| **Title** | **Composite astrology stem law specification planning** |
| **Classification** | **Category 1 / stem law specification planning / docs-only / no-mutation** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_STEM_LAW_SPECIFICATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-A-COMPOSITE-ASTROLOGY-STEM-LAW-SPECIFICATION-PLAN-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-DECISION-B-R** — Option B；**ENGINE-AUDIT-A/B/C** |

**Execution:** specification only.** **No** code / DB migration run / deploy / checkout.

**Production adequacy:** remains **`BLOCKED_UNTIL_COMPOSITE_ENGINE_CORRECTION`**.  
**CORE-DTR-VERIFY:** remains **`HOLD`**.

---

## B. Scope and non-goals

### B1. In scope

- Layer2 **stem lane** determination for M55 composite astrology
- Canonical input, correction pipeline order, versioning, snapshot contract
- My Page intake expansion **policy**
- Route contracts `/core`, `/dtr`, `/dtr/core`, fulfillment
- Backward compatibility with **legacy** snapshots
- Test matrix definition for **ENGINE-VERIFY**（post-impl）

### B2. Out of scope（separate gates）

| Item | Gate |
|------|------|
| **TL-F7** free/paid **label table unification** | TL-F7 |
| **CORE-DTR-C** drift UI | CORE-DTR-C |
| **CORE-DTR-VERIFY** payment E2E | After ENGINE-VERIFY + criteria refresh |
| **Concrete 節入り instant table** data entry | ENGINE-SPEC-B or calendar data gate |
| **Code / migration execution** | ENGINE-IMPL-* |

---

## C. Canonical input contract

### C1. `M55CompositeCanonicalInput`（planned type name）

| Field | Type | Required | Stem role | Notes |
|-------|------|----------|-----------|-------|
| **birthDate** | `YYYY-MM-DD` | **yes** | **primary civil anchor** | Invalid → fail-closed |
| **birthTime** | `HH:mm` or `HH:mm:ss` | **conditional** | **yes** when known | See §C2 |
| **birthTimeUnknown** | `boolean` | **yes** when time omitted | **yes** | Explicit flag；implicit false if time present |
| **timezone** | IANA or M55 canonical id | **derived** | **yes** | User override optional（phase 2） |
| **country** | ISO-3166 alpha-2 | **conditional** | **yes** for TZ | Default infer：`JP` if UI locale JP and empty |
| **birthplace** | string（city/region label） | **optional** | **yes** when overseas | Used with country for TZ + local midnight rules |
| **calendarSystem** | enum | **fixed v1** | metadata | **`gregorian_civil`** only at v2 launch；lunar input **derived** not user-selected |
| **locale** | `ja-JP` | **yes** | display only | `contextScope` separate per engine |
| **nickname** | string | **yes** for product | **no** | Display / DTR copy only |
| **contextScope** | `essence` \| `dtr` \| … | **yes** | routing | Unchanged IO contract pattern |

### C2. Unknown birthTime policy（SPEC decision）

| Mode | Rule | Stem impact |
|------|------|-------------|
| **`birthTimeUnknown: true`** | Apply **`M55_UNKNOWN_TIME_POLICY = solar_noon_local`**（local solar 12:00 in resolved TZ） | Boundary + day pillar use noon-local |
| **Explicit time** | Use normalized time | Full boundary + 子初 rule |
| **Forbidden** | Silent default without flag in **stored** profile/snapshot | Prevents audit ambiguity |

**Rationale:** Matches partial `canonicalBoundary` noon fallback but **must be explicit** in stored contract for v2.

### C3. Overseas birthplace policy

| Case | Rule |
|------|------|
| **country = JP** | TZ default **`Asia/Tokyo`**；birthplace optional（都道府県レベル推奨） |
| **country ≠ JP** | **country required**；birthplace **recommended** |
| **TZ resolution order** | 1) explicit user TZ if present → 2) country primary TZ table → 3) birthplace city map → 4) **`UTC` fail-soft** with `tz_resolution: fallback_utc` in metadata |
| **Local datetime** | All boundary steps run in **resolved local TZ**, not browser TZ |

### C4. Canonical input matrix（v2 vs legacy）

| Field | Legacy `dtr-v1-jdn-day-stem-provisional` | Planned `m55-composite-stem-v2` |
|-------|------------------------------------------|----------------------------------|
| birthDate | ✅ stem | ✅ stem |
| birthTime | ❌ ignored | ✅ |
| birthTimeUnknown | ❌ | ✅ |
| country / birthplace | ❌ ignored（boundary meta only in /core partial path） | ✅ TZ + local |
| timezone | ❌ | ✅ derived |
| calendarSystem | ❌ | ✅ metadata |
| nickname | copy only | copy only |
| 節入り / 旧暦 | ❌ stem | ✅ stem path |

---

## D. Composite correction order（normative pipeline）

**Single function target:** `runM55CompositeStemPipeline(input) → CompositeStemResult`

| Step | ID | Operation | Output artifact | Fail-closed |
|------|-----|-----------|-----------------|-------------|
| **1** | `N0` | **Parse & validate** birthDate；time format；country code | `rawInput` | invalid date → `M55_COMPOSITE_INVALID_INPUT` |
| **2** | `N1` | **Normalize** ISO date；time → `HH:mm:ss.SSS`；trim strings | `normalizedBirth` | — |
| **3** | `N2` | **Resolve timezone**（§C3） | `resolvedTimezone` + `tzSource` | unknown country → fallback + flag |
| **4** | `N3` | **Build local civil datetime** `localBirth` in resolved TZ | `localDateTime` | — |
| **5** | `N4` | **Day boundary**（子初 / M55 day rollover — **SPEC-B must fix exact hour rule**；candidate: 23:00–00:59 previous day pillar） | `effectiveLocalDate` | — |
| **6** | `N5` | **Solar term boundary**（節入り）：map `effectiveLocalDate` + time → **solar term year index** | `solarTermKey`, `solarTermBoundaryInstant` | missing table → `M55_COMPOSITE_CALENDAR_TABLE_MISSING` in dev；prod fail-closed |
| **7** | `N6` | **Lunar conversion**（旧暦）：derive **lunar day pillar date** for stem sub-step | `lunarDateKey`, `lunarBoundaryInstant` | optional sub-step if composite law = solar-primary + lunar refine（**SPEC-B chooses primary pillar**） |
| **8** | `N7` | **Stem lane determination** from **composite key**（not raw civil JDN alone） | `stemLaneIndex` 0–9, `stemChar` | — |
| **9** | `N8` | **Fallback chain** | see §D2 | — |
| **10** | `N9` | **Emit fingerprints** + version fields | `staticFingerprint`, `displayFingerprint` | — |

**Normative rule:** **No step after N7 may read raw `birthDate` without prior normalized context.**

### D1. Primary pillar law（SPEC-A default — Human confirm in SPEC-B）

| Candidate | Description | Recommendation |
|-----------|-------------|----------------|
| **P-SOLAR** | Day stem from **solar term–adjusted** civil/lunar hybrid | **Default for v2 spec draft** |
| **P-LUNAR** | Day stem from lunar date after 旧暦 step | Alternate if product law says 旧暦主 |

**ENGINE-SPEC-B must lock P-SOLAR vs P-LUNAR** before implementation.

### D2. Fallback chain（ordered）

| Priority | Condition | Action |
|----------|-----------|--------|
| **F1** | Full input + tables present | Normal N0–N9 |
| **F2** | `birthTimeUnknown` | `solar_noon_local`（§C2） |
| **F3** | TZ unresolved | `UTC` + `tz_resolution: fallback_utc` |
| **F4** | 節入り table miss for date | **Do not** fall back to provisional JDN in v2 — **fail-closed** |
| **F5** | **Legacy read path only** | Use stored `engineVersion === dtr-v1-jdn-day-stem-provisional` |

**Explicit:** **v2 must not silently call `essenceStemLaneIndex(birthDate)` alone.**

### D3. Invalid input handling

| Error code | When |
|------------|------|
| `M55_COMPOSITE_INVALID_BIRTHDATE` | parse fail |
| `M55_COMPOSITE_INVALID_BIRTHTIME` | malformed time when not unknown |
| `M55_COMPOSITE_CALENDAR_TABLE_MISSING` | 節入り/旧暦 data gap |
| `M55_COMPOSITE_INCOMPLETE_PROFILE` | checkout/snapshot missing required v2 fields |

---

## E. My Page input expansion spec

### E1. Field requirements（phased）

| Phase | birthTime | country | birthplace | birthTimeUnknown |
|-------|-----------|---------|------------|------------------|
| **IMPL-1（MVP v2）** | **optional** with explicit 「時刻不明」 | **optional**；空なら JP inference rules | optional | **required UI** when time empty |
| **IMPL-2** | **required** for new purchases | **required** if country ≠ JP | recommended | checkbox |

### E2. Existing users（未入力）

| State | `/core` behavior | Purchase behavior |
|-------|------------------|-------------------|
| **Legacy profile**（birthDate only） | Run **legacy** engine until user completes v2 intake | Checkout blocked or **legacy lane** if Human allows one more legacy purchase（**default: block new checkout until v2 complete**） |
| **Partial v2** | Fail-closed locked state with intake CTA | Same |
| **Stored flag `profileEngineTier: legacy\|v2`** in local + draft sync | Server mirrors draft `extra_json` | — |

### E3. UI copy policy（no implementation）

| Element | JP direction |
|---------|--------------|
| birthTime | **出生時刻（任意）** — helper: 不明の場合は「時刻不明」を選んでください |
| birthTimeUnknown | **時刻不明**（checkbox） |
| country | **出生国** |
| birthplace | **出生地（任意）** |
| Save | **プロフィールを保存** — sub: 鑑定の計算に使用します |

### E4. Storage spec

| Store | Fields |
|-------|--------|
| **ProfileRepository**（local） | extend `BirthProfile` + `engineProfileTier` |
| **dtr_guest_drafts.extra_json** | `birthTime`, `birthTimeUnknown`, `country`, `birthplace`, `timezone?` |
| **Stripe metadata** | add `profileBirthTime`, `profileBirthTimeUnknown`, `profileCountry`, `profileBirthplace`（length limits） |

---

## F. Snapshot contract

### F1. Version fields（per snapshot row）

| Field | Purpose | Example |
|-------|---------|---------|
| **engineVersion** | Layer2 engine id | `dtr-v1-jdn-day-stem-provisional` \| **`m55-composite-stem-v2`** |
| **inputVersion** | Canonical input schema | `composite-input-v1` |
| **correctionVersion** | Calendar table bundle id | `m55-calendar-2026-01` |
| **calculationMode** | `full` \| `unknown_time_noon` \| `tz_fallback_utc` | |

### F2. `profile_snapshot` v2 shape（planned JSON）

```json
{
  "nickname": "string",
  "birthDate": "YYYY-MM-DD",
  "birthTime": "HH:mm:ss|null",
  "birthTimeUnknown": true,
  "country": "JP",
  "birthplace": "string|null",
  "timezone": "Asia/Tokyo",
  "calendarSystem": "gregorian_civil",
  "engineVersion": "m55-composite-stem-v2",
  "inputVersion": "composite-input-v1",
  "correctionVersion": "m55-calendar-2026-01",
  "calculationMode": "full"
}
```

**Legacy rows** retain `{ nickname, birthDate }` only — read as **`engineVersion: dtr-v1-jdn-day-stem-provisional`** by default.

### F3. `normalizedBirthContext` + `boundaryMetadata`（persisted at fulfillment）

| Blob | Contents |
|------|----------|
| **normalizedBirthContext** | post-N1 values + `localDateTime` ISO + `effectiveLocalDate` |
| **boundaryMetadata** | `solarTermKey`, `solarTermBoundaryInstant`, `lunarDateKey`, `dayBoundaryRule`, `tzSource`, `fallbackMode` |

**Storage location（planning）：** prefer new jsonb column **`engine_context_json`** on `dtr_report_snapshots`（additive migration）— **do not mutate** existing rows.

### F4. `sourceProfile`

| Field | Meaning |
|-------|---------|
| **source** | `checkout_metadata` \| `draft_fallback` |
| **capturedAt** | fulfillment timestamp ISO |
| **checkoutSessionId** | truncated safe label only in logs — **not** full ID in SSOT |

### F5. `envelope_json` policy（fixes ENGINE-AUDIT-B G5）

| engineVersion | Write | Read `/dtr/core` |
|---------------|-------|------------------|
| **legacy** | At fulfillment | **Prefer stored `envelope_json`**；re-run only for explicit repair gate |
| **v2** | At fulfillment from v2 engine | **Must read stored `envelope_json`**；no silent SSR re-run |

**Immutability:** `envelope_json` + `engine_context_json` **INSERT at purchase**；**never UPDATE** on profile change.

---

## G. Versioning policy

| ID | engineVersion | Status | Stem law |
|----|---------------|--------|----------|
| **LEGACY-V1** | `dtr-v1-jdn-day-stem-provisional` | **frozen** | `essenceStemLaneIndex(birthDate)` |
| **COMPOSITE-V2** | **`m55-composite-stem-v2`**（approved name） | **target** | §D pipeline |

| Rule | Policy |
|------|--------|
| **Existing snapshots** | Keep LEGACY-V1 forever readable |
| **New purchases after cutover** | COMPOSITE-V2 only |
| **Overwrite prohibition** | **No UPDATE** of legacy rows to v2 |
| **Second purchase** | New row or new `product_id` session — CORE-DTR-A additive lane |
| **contractVersion** | DtrEnvelope `contractVersion: v2` when engine v2 |

**Cutover:** Human **`ENGINE-SPEC-B`** date + feature flag `M55_COMPOSITE_ENGINE_V2_ENABLED`（planning label only — no env change in this gate）.

---

## H. Route contract

| Route | Input source | Engine | Output |
|-------|--------------|--------|--------|
| **`/core`** | **Current profile**（v2 fields） | **COMPOSITE-V2** if profile tier v2；else **LEGACY-V1** until intake complete | Mutable `CoreResult` + labels |
| **`/dtr` owned shelf** | **Snapshot `profile_snapshot`** | **No live engine** — display **`engine_context` + stem from snapshot** | Card matches **purchase-time** |
| **`/dtr` unowned** | Current profile preview | COMPOSITE-V2 or LEGACY per tier | Preview only |
| **`/dtr/core`** | **Snapshot only** | Read **`envelope_json`** for matching `engineVersion` | **No profile re-run** |
| **fulfillment** | Checkout metadata + draft fallback | Run engine per **tier at purchase time** | INSERT snapshot + envelope + engine_context |
| **My Page** | Edit current profile | Does **not** UPDATE snapshots | Drift UI per CORE-DTR-B |

---

## I. DB / migration policy（planning only — no execution）

| # | Policy |
|---|--------|
| **M1** | **No UPDATE** on existing `dtr_report_snapshots` rows |
| **M2** | **Additive** migration preferred：`engine_context_json jsonb NULL`；optional `engine_version text NULL` denormalized for index |
| **M3** | **Legacy/v2 coexist** in same table — branch on `engineVersion` in `profile_snapshot` or column |
| **M4** | **Read path version fork** in `getDtrReportSnapshot` consumer — mandatory |
| **M5** | **Rollback** = disable `M55_COMPOSITE_ENGINE_V2_ENABLED`；new purchases pause；legacy rows unaffected |
| **M6** | **No DELETE** migrations on evidence tables |

**Alternative（if JSON-only）：** embed version keys only in `profile_snapshot` without new column — acceptable for MVP if indexed queries not needed.

---

## J. Test matrix（ENGINE-VERIFY acceptance draft）

| Case ID | Scenario | Legacy v1 | v2 expected |
|---------|----------|-----------|-------------|
| **TM-01** | 1983-02-28 + full input | lane 3 丁 | **TBD in SPEC-B**（golden vector redefinition） |
| **TM-02** | 節入り前後（立春付近） | civil JDN drift | **solar term branch change** |
| **TM-03** | 旧暦代表日 | no lunar | lunar sub-step differs |
| **TM-04** | birthTime 03:30 vs unknown | same stem v1 | may differ v2 |
| **TM-05** | JP vs US TZ same civil | same stem v1 | may differ v2 |
| **TM-06** | overseas birthplace | same stem v1 | TZ local differs |
| **TM-07** | invalid date | reject | reject |
| **TM-08** | unknown time noon policy | noon meta only | `calculationMode: unknown_time_noon` |
| **TM-09** | legacy snapshot read | unchanged | **no recompute** |
| **TM-10** | new v2 purchase | N/A | `engineVersion: m55-composite-stem-v2` |
| **TM-11** | profile drift | N/A | snapshot immutable |

**Runner:** extend `scripts/engine-audit-c-matrix.ts` → `engine-verify-matrix.ts` post-impl.

---

## K. Backward compatibility policy

| Actor | Rule |
|-------|------|
| **Reader** | If `engineVersion` legacy → LEGACY-V1 labels + envelope |
| **Writer** | If purchase date ≥ cutover → COMPOSITE-V2 only |
| **Free /core** | Legacy users see legacy until intake migration |
| **Marketing** | Must disclose legacy vs new save format during transition |

---

## L. No-delete / no-overwrite controls

| ID | Rule |
|----|------|
| **CONTROL-SPEC-A-01** | No DELETE snapshots / entitlements / fulfillments |
| **CONTROL-SPEC-A-02** | No UPDATE `profile_snapshot` / `envelope_json` for engine migration |
| **CONTROL-SPEC-A-03** | v2 engine changes → new rows only |
| **CONTROL-SPEC-A-04** | Inherits **CONTROL-ENGINE-DEC-B-01〜05** + **CONTROL-CORE-DTR-01〜06** |

---

## M. Implementation phase split（proposal）

| Phase | Gate | Deliverable |
|-------|------|-------------|
| **0** | **ENGINE-SPEC-B-R** | Human sign-off：P-SOLAR vs P-LUNAR；1983 golden；節入り table source |
| **1** | **ENGINE-IMPL-A** | `lib/m55/compositeStem/` pipeline + calendar tables + tests |
| **2** | **ENGINE-IMPL-B** | My Page + draft sync + checkout metadata |
| **3** | **ENGINE-IMPL-C** | DB additive migration + fulfillment + snapshot write |
| **4** | **ENGINE-IMPL-D** | `/core` `/dtr` `/dtr/core` read fork；stop SSR re-run |
| **5** | **ENGINE-VERIFY-A** | TM-01〜11 matrix GREEN |
| **6** | **Production adequacy review** | Unblock `BLOCKED_UNTIL_*` |
| **7** | **CORE-DTR-VERIFY resume** | Updated criteria |

**Parallel:** TL-F7 label parity（does not unblock adequacy alone）.

---

## N. Human decision points for ENGINE-SPEC-B

| # | Question |
|---|----------|
| **Q1** | Primary pillar：**P-SOLAR** vs **P-LUNAR** |
| **Q2** | 1983-02-28 post-v2 golden：**stemChar / publicTitle** expected |
| **Q3** | 節入り table source：embedded CSV vs external SSOT file |
| **Q4** | New checkout during transition：**block** vs **allow legacy one-time** |
| **Q5** | `engine_context_json` new column vs profile_snapshot-only |

---

## O. No-mutation statement

- **No** code / DB write / migration run / checkout / deploy / env
- **No** raw ID / email / session / secret

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-A-COMPOSITE-ASTROLOGY-STEM-LAW-SPECIFICATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-DECISION-B-R-HUMAN-DECISION-COMPOSITE-ENGINE-CORRECTION-REQUIRED-001`** | Human Option B |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-C-M55-ENGINE-DETERMINISTIC-MATRIX-001`** | Baseline matrix |
