# Phase 5-6H-5Z-I-V-ENGINE-SPEC-B-R — Composite astrology stem law unresolved decisions sign-off gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-SPEC-B-R** |
| **Title** | **Composite astrology stem law unresolved decisions sign-off** |
| **Classification** | **Category 2 / Human sign-off / docs-only / no-mutation** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_STEM_LAW_HUMAN_SIGN_OFF_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-B-R-COMPOSITE-ASTROLOGY-STEM-LAW-HUMAN-SIGN-OFF-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-SPEC-A** — **`COMPOSITE_ASTROLOGY_STEM_LAW_SPECIFICATION_PLANNING_GREEN_NO_MUTATION`** |

**Execution:** Human decision record only.** **Authorizes** **ENGINE-IMPL-A** planning to start.** **Does not** authorize code, migration, or checkout.

**Carry-forward status:**

| Label | Value |
|-------|--------|
| **Production adequacy** | **`BLOCKED_UNTIL_COMPOSITE_ENGINE_CORRECTION`**（unchanged until **ENGINE-VERIFY-A**） |
| **CORE-DTR-VERIFY** | **`HOLD`**（unchanged until §Q5 resume condition） |

---

## B. Q1 — 主柱決定（Human GO）

### Decision: **HYBRID `H-SOLAR-LUNAR-01`**

| Role | Law | Used for **stemLaneIndex**? |
|------|-----|---------------------------|
| **Primary pillar** | **`P-LUNAR`** — 旧暦日柱（lunar day pillar after local TZ + day boundary） | **yes** |
| **Auxiliary pillar** | **`P-SOLAR`** — 節入り（solar term year/month context + boundary instants） | **no**（metadata + pre-lunar **effective year** adjustment only） |

### Normative pipeline binding（supersedes SPEC-A §D1 draft default）

| Step | Effect |
|------|--------|
| **N4 day boundary** | Applies before lunar conversion |
| **N5 solar term** | Sets **`solarYearKey` / `solarTermKey`**；may shift **lunar year assignment** near 立春 — **does not directly pick stem index** |
| **N6 lunar** | Produces **`lunarDayKey`** → **N7 stem lane** from **lunar day stem table** |
| **N7** | **`stemLaneIndex`** from lunar day pillar only |

**Rejected for stem primary:** **P-SOLAR-only**（節入り alone sets stem）.  
**Rejected:** **P-LUNAR-only** with no solar term metadata（節入りは補助メタとして必須保持）.

**Calendar data gate:** **`m55-calendar-2026-01`** bundle must include **solar term table + lunar conversion table** before **ENGINE-VERIFY-A**.

---

## C. Q2 — 1983-02-28 golden baseline（Human GO）

### C1. v2 target（`m55-composite-stem-v2` + full intake）

**Profile fixture（golden）：**

| Field | Value |
|-------|--------|
| birthDate | `1983-02-28` |
| birthTime | `12:00` |
| birthTimeUnknown | `false` |
| country | `JP` |
| birthplace | `東京都`（代表） |
| timezone | `Asia/Tokyo`（derived） |
| calculationMode | `full` |

**Expected v2 engine output（Human-approved baseline — verified in ENGINE-SPEC-C / ENGINE-VERIFY-A）：**

| Field | Expected |
|-------|----------|
| **stemLaneIndex** | **9** |
| **stemChar** | **癸** |
| **paid `TEN_STEM_DISPLAY.publicTitle`** | **アナリスト** |
| **paid symbol** | **雨** |

**Free `/core`（v2 tier, post-TL-F7 alignment target）：**

| Surface | Expected |
|---------|----------|
| **Primary type label** | **アナリスト**（`TEN_STEM_DISPLAY` — **same table as paid** for v2） |
| **Hero EN auxiliary** | **ANALYST** allowed as secondary tag only if TL-F7 keeps EN chip |
| **観測特性** | **静観分析**（観測特性：静観分析） |
| **分析類型 / 特質性** | Keep existing chrome labels |

**Paid `/dtr/core`（v2 snapshot）：**

| Surface | Expected |
|---------|----------|
| Hero **資質 /** row | **アナリスト** |
| **engineVersion** | `m55-composite-stem-v2` |
| Body | From **stored `envelope_json`** at purchase |

### C2. Legacy contrast（same birthDate, legacy row）

| Field | Legacy `dtr-v1-jdn-day-stem-provisional`（AUDIT-C confirmed） |
|-------|----------------------------------------------------------------|
| stemLaneIndex | **3** |
| stemChar | **丁** |
| paid publicTitle | **クリエイター** |
| free hero EN (today) | **ANALYST** |

### C3. Legacy vs v2 **display policy**（no recalculation）

| Context | Copy / UX |
|---------|-----------|
| **Legacy owned shelf / reader** | Quiet badge: **保存版（旧計算方式）** — sub: **購入時の入力と計算方式で固定されています** |
| **v2 owned** | Badge: **保存版（複合占術）** — no “旧計算方式” |
| **Drift between legacy snapshot and current /core** | CORE-DTR-B drift UI — **not** “updated to match profile” |

**Note:** Golden numeric values in §C1 are **Human product baseline**；implementation must prove via **ENGINE-SPEC-C** matrix + calendar tables before **ENGINE-VERIFY-A GREEN**.

---

## D. Q3 — DB / snapshot 形（Human GO）

### D1. Storage shape — **Option B+**（selected）

| Artifact | Decision |
|----------|----------|
| **`engine_context_json`** | **required** new nullable jsonb on `dtr_report_snapshots` — holds `normalizedBirthContext` + `boundaryMetadata` |
| **Denormalized column `engine_version`** | **yes** — `text NULL` — speeds read fork + ops queries |
| **`profile_snapshot` JSON** | **yes** — embeds `engineVersion`, `inputVersion`, `correctionVersion`, `calculationMode` + intake fields（duplicate keys allowed for reader convenience） |
| **`envelope_json`** | **unchanged column** — full `DtrEnvelope` at purchase |

**Rejected:** JSON-only without `engine_context_json`（auditability insufficient）.  
**Rejected:** `engine_version` only in JSON without column（read fork fragility）.

### D2. `envelope_json` stored-read guarantee

| engineVersion | `/dtr/core` rule |
|---------------|------------------|
| **legacy** | **Read `envelope_json` first**；re-run `runDtrEngine` **forbidden** in production path（repair gate only） |
| **v2** | **Read `envelope_json` only** — **no SSR re-run** |

**Implementation control:** `CONTROL-SPEC-B-READ-01` — code path must branch on `engine_version` / `profile_snapshot.engineVersion` before any engine import.

### D3. Read-path version fork

```
getDtrReportSnapshot(row)
  ├─ engine_version == m55-composite-stem-v2
  │    → DtrFullReader(envelope=row.envelope_json, context=row.engine_context_json)
  └─ else (null | dtr-v1-jdn-day-stem-provisional)
       → DtrFullReader(envelope=row.envelope_json)  // legacy frozen body
```

**Shelf:** use `profile_snapshot` + `engine_context_json.stemLaneIndex` — **never** live engine for owned.

---

## E. Q4 — My Page / checkout 入力要件（Human GO）

### E1. Field requirements at cutover（single phase — no split IMPL-1/2）

| Field | Requirement |
|-------|-------------|
| **birthDate** | **required**（unchanged） |
| **nickname** | **required** |
| **birthTime** | **optional** — if empty → **`birthTimeUnknown` must be true** |
| **birthTimeUnknown** | **required UI** — checkbox **時刻不明**（mutually exclusive with time field） |
| **country** | **required**（default select **日本**） |
| **birthplace** | **optional**；helper: 海外出生の場合は都市名を入力 |
| **timezone** | **derived** — advanced override **hidden** in v1 UI |

### E2. Checkout gating

| Rule | Decision |
|------|----------|
| **v2 intake incomplete** | **Block checkout** — CTA disabled with message **鑑定に必要なプロフィールを入力してください** |
| **Legacy tier users** | May use **free /core** on **LEGACY-V1** until they complete v2 intake |
| **New purchases** | **COMPOSITE-V2 only** after cutover（§F） |

### E3. Legacy tier UX

| Element | Decision |
|---------|----------|
| **My Page badge** | **プロフィール：旧形式** — CTA **詳細なプロフィールを追加** |
| **After v2 save** | Badge **プロフィール：複合占術対応** |
| **Draft sync** | `extra_json.engineProfileTier`: `legacy` \| `v2` |

### E4. Stripe metadata（minimum at checkout）

| Key | Required at v2 checkout |
|-----|-------------------------|
| `profileBirthDate` | yes |
| `profileNickname` | yes |
| `profileBirthTime` | if known |
| `profileBirthTimeUnknown` | `true` \| `false` |
| `profileCountry` | yes |
| `profileBirthplace` | optional |

---

## F. Q5 — 実装 cutover（Human GO）

### F1. v2-only new purchases

| Event | Rule |
|-------|------|
| **Cutover trigger** | **ENGINE-VERIFY-A** verdict **`ENGINE_VERIFY_MATRIX_GREEN`** + Human **IMPL deploy GO** |
| **Feature flag** | `M55_COMPOSITE_ENGINE_V2_ENABLED=true` on Production（env gate separate） |
| **Before cutover** | New purchases may still use **legacy** engine（status quo） |
| **After cutover** | **All new fulfillments** → `m55-composite-stem-v2` only |

### F2. Legacy snapshot display copy（fixed）

| Location | JP |
|----------|-----|
| Shelf / reader badge | **保存版（旧計算方式）** |
| Footnote | **この保存版は購入時の計算方式のままです。現在のプロフィールで再計算はされません。** |

### F3. Rollback

| Action | Decision |
|--------|----------|
| Set `M55_COMPOSITE_ENGINE_V2_ENABLED=false` | **yes** |
| **Stop new purchases** | **yes** — checkout shows **準備中** |
| **Mutate existing snapshots** | **no** |
| **Revert read path** | legacy branch only |

### F4. CORE-DTR-VERIFY resume condition（updated）

| # | Condition |
|---|-----------|
| **R1** | **ENGINE-VERIFY-A** GREEN |
| **R2** | **TM-01** passes §C1 v2 golden |
| **R3** | **ENGINE-SPEC-C** or equivalent calendar table ingestion recorded |
| **R4** | **CORE-DTR-B/C** drift UI deployed（recommended, not blocking VERIFY-B preflight） |
| **R5** | Human **VERIFY-C** one-checkout GO |

**Superseded:** VERIFY criteria expecting **癸/アナリスト** on **legacy** engine — **replaced** by §C1 v2 vs §C2 legacy contrast.

---

## G. v2 golden baseline summary table

| Engine | 1983-02-28 stem | Paid title | Free primary（target） |
|--------|-----------------|------------|-------------------------|
| **legacy v1** | 3 / 丁 | クリエイター | ANALYST hero（現状） |
| **composite v2** | **9 / 癸** | **アナリスト** | **アナリスト** + 静観分析 |

---

## H. No-delete / no-overwrite confirmation

| Control | Status |
|---------|--------|
| **CONTROL-SPEC-A-01〜04** | **confirmed** |
| **CONTROL-ENGINE-DEC-B-01〜05** | **confirmed** |
| **CONTROL-SPEC-B-READ-01** | **new** — stored envelope read |
| **No UPDATE / DELETE** on snapshots, entitlements, fulfillments | **confirmed** |

---

## I. Next gates

| Priority | Gate | Role |
|----------|------|------|
| **1（recommended parallel）** | **ENGINE-SPEC-C** | Detailed golden matrix + calendar table SSOT ingestion plan |
| **2** | **ENGINE-IMPL-A** | Implementation planning — pipeline, tables, types |
| **3** | **ENGINE-IMPL-B〜D** | My Page, DB migration, routes |
| **4** | **ENGINE-VERIFY-A** | TM-01〜11 execution |
| **5** | Unblock production adequacy + **CORE-DTR-VERIFY** |

**ENGINE-IMPL-A may start** after this sign-off — calendar proof may complete in parallel via **ENGINE-SPEC-C**.

---

## J. No-mutation statement

- **No** code / DB / migration / checkout / deploy / env
- **No** raw ID / email / session / secret

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-B-R-COMPOSITE-ASTROLOGY-STEM-LAW-HUMAN-SIGN-OFF-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-A-COMPOSITE-ASTROLOGY-STEM-LAW-SPECIFICATION-PLAN-001`** | SPEC-A |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-DECISION-B-R-HUMAN-DECISION-COMPOSITE-ENGINE-CORRECTION-REQUIRED-001`** | Option B |
