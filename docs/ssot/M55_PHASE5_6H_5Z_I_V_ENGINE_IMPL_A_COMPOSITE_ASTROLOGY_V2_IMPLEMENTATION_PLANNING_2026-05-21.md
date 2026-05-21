# Phase 5-6H-5Z-I-V-ENGINE-IMPL-A — Composite astrology v2 implementation planning gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-A** |
| **Title** | **Composite astrology v2 implementation planning** |
| **Classification** | **Category 1 / implementation planning / docs-only / no-mutation** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-IMPL-A-COMPOSITE-ASTROLOGY-V2-IMPLEMENTATION-PLAN-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-SPEC-A/B/C/C-R**；**ENGINE-DECISION-B-R** |

**Execution:** planning only.** **No** code change / migration run / deploy / checkout in this gate.

**Golden firewall:** **`GOLDEN_1983_02_28_V2`** — **GX-01** first test；fail → **VERIFY-A RED** → **VERIFY HOLD**（SPEC-C-R）.

---

## B. Implementation phases（ordered）

| Phase | Gate ID | Scope | Exit criterion |
|-------|---------|-------|----------------|
| **0** | **IMPL-A**（本条） | Planning GREEN | Human GO for **IMPL-B** |
| **1** | **IMPL-B1** | Calendar data + table SSOT doc | JSON files + checksum；`GOLDEN_1983_02_28_V2` derivable from tables |
| **2** | **IMPL-B2** | `runM55CompositeStemPipeline` + types | Unit test **GX-01 GREEN** locally |
| **3** | **IMPL-B3** | DB migration（additive only） | Migration applied staging；**zero UPDATE** on prod rows in gate |
| **4** | **IMPL-B4** | Fulfillment + snapshot write v2 | Integration test insert mock row |
| **5** | **IMPL-B5** | My Page + draft + checkout metadata | v2 intake；checkout block |
| **6** | **IMPL-B6** | Routes: `/core`, `/dtr`, `/dtr/core` | Stored envelope read；legacy fork |
| **7** | **ENGINE-VERIFY-A** | GX-01〜11 matrix | **GX-01 fail = RED** |
| **8** | **Cutover** | Env flag + deploy gate | Separate Human GO |

**Est. LOC:** ~1,200–1,800（excl. calendar JSON bulk）.

---

## C. Calendar JSON creation plan

### C1. Bundle

| Field | Value |
|-------|--------|
| **correctionVersion** | `m55-calendar-2026-01` |
| **checksum** | `sha256:` prefix in `lib/m55/calendar/data/manifest.json` |

### C2. Files to create

| File | Content | Range |
|------|---------|-------|
| `lib/m55/calendar/data/manifest.json` | versions, checksums, range | — |
| `lib/m55/calendar/data/solar_terms_1900_2100.json` | `{ "YYYY-MM-DD": { "lichun": "ISO", ... term keys } }` or year-indexed array | 1900–2100 |
| `lib/m55/calendar/data/lunar_civil_days_1900_2100.json` | civil date + TZ bucket → `{ lunarYear, lunarMonth, lunarDay, dayStemIndex }` | 1900–2100 |
| `lib/m55/calendar/data/tz_country_primary.json` | `JP` → `Asia/Tokyo`, `US` → `America/New_York`, … | — |
| `00_PRIMARY_ACTIVE_LAW/M55_COMPOSITE_CALENDAR_TABLE_SSOT_v1.md` | Human-readable derivation notes | — |

### C3. Derivation workflow（pre-code）

| Step | Owner | Output |
|------|-------|--------|
| **1** | Human + tooling | Authoritative almanac export（**not** in git secrets） |
| **2** | Script `scripts/calendar/build-m55-calendar-bundle.mjs` | Generates JSON + manifest |
| **3** | Verify | **`GOLDEN_1983_02_28_V2`** row embedded as spot-check in manifest |
| **4** | Review | ENGINE-SPEC-C-R sign-off unchanged |

### C4. Table missing at runtime

| Condition | Behavior |
|-----------|----------|
| File missing | Process fails startup in prod build **or** v2 tier locked |
| Date key missing | `M55_COMPOSITE_CALENDAR_TABLE_MISSING` |
| **Forbidden** | Fallback to `essenceStemLaneIndex(birthDate)` |

---

## D. Engine pipeline design

### D1. Module layout

| Path | Role |
|------|------|
| **`lib/m55/compositeStem/types.ts`** | `M55CompositeCanonicalInput`, `CompositeStemResult`, error codes |
| **`lib/m55/compositeStem/normalize.ts`** | N0–N1 |
| **`lib/m55/compositeStem/timezone.ts`** | N2–N3 |
| **`lib/m55/compositeStem/dayBoundary.ts`** | N4 `M55_DAY_BOUNDARY_V1`（23:00 local） |
| **`lib/m55/compositeStem/solarTerm.ts`** | N5 P-SOLAR metadata |
| **`lib/m55/compositeStem/lunarDay.ts`** | N6 P-LUNAR primary |
| **`lib/m55/compositeStem/stemLane.ts`** | N7 `lunarDayStemIndex` → 0–9 |
| **`lib/m55/compositeStem/pipeline.ts`** | **`runM55CompositeStemPipeline`** |
| **`lib/m55/compositeStem/legacy.ts`** | Explicit wrapper calling old path — **legacy only** |
| **`lib/m55/compositeStem/constants.ts`** | version strings |

### D2. `runM55CompositeStemPipeline` contract

```ts
// Planning signature — not implemented in this gate
export function runM55CompositeStemPipeline(
  input: M55CompositeCanonicalInput,
): CompositeStemResult;
```

**Output includes:**

| Field | Notes |
|-------|-------|
| `stemLaneIndex`, `stemChar` | From lunar day pillar |
| `engineVersion` | `m55-composite-stem-v2` |
| `inputVersion`, `correctionVersion`, `calculationMode` | |
| `normalizedBirthContext` | post-N3 |
| `boundaryMetadata` | solar + lunar keys |
| `staticFingerprint`, `displayFingerprint` | deterministic hashes |

### D3. Pipeline rules（HYBRID H-SOLAR-LUNAR-01）

| Step | Rule |
|------|------|
| **P-LUNAR** | **Only** lunar day stem sets `stemLaneIndex` |
| **P-SOLAR** | `solarTermKey`, `solarYearKey` — may adjust lunar year before N6 |
| **Day boundary** | Local **23:00–23:59** → +1 civil day for lunar lookup |
| **birthTimeUnknown** | `solar_noon_local` + `calculationMode: unknown_time_noon` |
| **TZ** | country → primary IANA；overseas uses resolved local |
| **fail-closed** | No civil JDN terminus |

### D4. Integration points

| Consumer | Change |
|----------|--------|
| **`buildCoreResult`** | If profile tier v2 → composite pipeline → map to `CoreResult` + **TEN_STEM** labels |
| **`runDtrEngine`** | v2 branch: stem from composite；bodies still `STEM_BODIES[lane]` |
| **`deriveDtrShelfStemDisplay`** | Read stem from snapshot context, not live engine |
| **`essenceEngine.ts`** | **Do not** extend civil JDN for v2 — keep for legacy only |

---

## E. Stored envelope read path

### E1. `/dtr/core`（mandatory behavior change）

| Today | Target |
|-------|--------|
| `runDtrEngine(profile_snapshot)` SSR re-run | **`envelope_json` from DB only** |

| File | Change |
|------|--------|
| **`app/dtr/core/page.tsx`** | Remove re-run；pass `snap.envelope_json` |
| **`components/dtr/DtrFullReader.tsx`** | Branch on `engine_version` / `profile_snapshot.engineVersion` |
| **`lib/m55/dtrDraftDb.ts`** | Return `envelope_json` typed；expose `engine_version` |

### E2. Legacy vs v2 reader

| engineVersion | Reader |
|---------------|--------|
| **null / `dtr-v1-jdn-day-stem-provisional`** | Legacy envelope + badge **旧計算方式** |
| **`m55-composite-stem-v2`** | v2 envelope + **複合占術** badge |

### E3. CONTROL

**CONTROL-IMPL-A-READ-01:** Production `/dtr/core` must not import `runDtrEngine` for display path（repair/admin route excepted）.

---

## F. DB migration plan（additive only）

### F1. Migration file（planned name）

`supabase/migrations/20260601000000_dtr_report_snapshots_engine_context.sql`

```sql
-- Planning only — NOT executed in IMPL-A gate
ALTER TABLE dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS engine_context_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS engine_version text NULL;

COMMENT ON COLUMN dtr_report_snapshots.engine_context_json IS
  'Immutable composite engine context at purchase (normalizedBirth + boundaryMetadata).';
COMMENT ON COLUMN dtr_report_snapshots.engine_version IS
  'Denormalized engine version for read fork; legacy rows remain NULL.';
```

### F2. Rules

| Rule | Policy |
|------|--------|
| **Existing rows** | **No UPDATE** — `engine_version` stays NULL → legacy fork |
| **New v2 rows** | INSERT with all columns populated at fulfillment |
| **Rollback** | Drop columns only if zero v2 rows in env（staging policy） |

### F3. `profile_snapshot` JSON extension

Fulfillment upsert adds v2 keys per ENGINE-SPEC-B-R §F2 — parallel to column denorm.

---

## G. My Page input plan

### G1. `BirthProfile` extension

| Field | UI | Validation |
|-------|-----|------------|
| `birthDate`, `nickname` | existing | required |
| `birthTime` | time input | optional |
| `birthTimeUnknown` | checkbox **時刻不明** | required if time empty |
| `country` | select, default **日本** | required |
| `birthplace` | text | optional |
| `engineProfileTier` | `legacy` \| `v2` | set `v2` on successful save |

### G2. Files

| File | Change |
|------|--------|
| **`lib/soul/profile.ts`** | Extended type + validation |
| **`components/my/MyPanel.tsx`** | ProfileIntakeCard fields |
| **`lib/m55/dtrDraftClientSync.ts`** | `extra_json` v2 fields |
| **`app/api/purchase/checkout/route.ts`** | Metadata keys + **block** if tier !== v2 |
| **`app/api/dtr/draft/route.ts`** | Persist extra_json |

### G3. Checkout block

| Condition | UX |
|-----------|------|
| `engineProfileTier !== 'v2'` | Checkout disabled；copy **鑑定に必要なプロフィールを入力してください** |
| **Legacy tier** | Free `/core` via legacy engine only |

---

## H. Test plan

### H1. Order（strict）

| Order | Test ID | Type | Fail policy |
|-------|---------|------|-------------|
| **1** | **`GOLDEN_1983_02_28_V2`** | unit | **IMMEDIATE RED** — stop pipeline |
| **2** | **GX-01** | alias of above | same |
| **3** | **GX-10** | integration read | legacy row byte-stable |
| **4** | **GX-02〜09** | unit/matrix | RED blocks merge |
| **5** | **GX-11** | fulfillment mock | v2 INSERT only |

### H2. Test files（planned）

| File | Role |
|------|------|
| **`lib/m55/compositeStem/pipeline.golden.test.ts`** | **First file created** — GX-01 only |
| **`scripts/engine-verify-matrix.ts`** | Full GX matrix（extends audit-c script） |
| **`e2e/composite-golden-1983.spec.ts`** | optional post-IMPL-B6 |

### H3. Golden assertions（GX-01)

```ts
expect(result.stemLaneIndex).toBe(9);
expect(result.stemChar).toBe('癸');
expect(stem.publicTitle).toBe('アナリスト');
expect(result.calculationMode).toBe('full');
expect(result.engineVersion).toBe('m55-composite-stem-v2');
```

### H4. CI gate

| Gate | Rule |
|------|------|
| **PR to `work/home-cluster`** | `npm test` or `npx vitest` includes golden |
| **Pre-cutover** | **ENGINE-VERIFY-A** run on Human machine |

---

## I. Target files summary

| Priority | Path |
|----------|------|
| **P0** | `lib/m55/compositeStem/**`（new） |
| **P0** | `lib/m55/calendar/data/**`（new JSON） |
| **P0** | `lib/m55/compositeStem/pipeline.golden.test.ts` |
| **P1** | `lib/m55/coreResult/buildCoreResult.ts` |
| **P1** | `lib/m55/dtrEngine.ts` |
| **P1** | `lib/m55/dtrDraftDb.ts` |
| **P1** | `app/dtr/core/page.tsx` |
| **P1** | `supabase/migrations/20260601000000_*.sql` |
| **P2** | `lib/soul/profile.ts`, `components/my/MyPanel.tsx` |
| **P2** | `app/api/purchase/checkout/route.ts` |
| **P2** | `lib/m55/dtrCoreCheckoutFulfillment.ts` |
| **P2** | `lib/m55/dtrShelfAccess.ts`, `components/dtr/DtrShelfPanel.tsx` |
| **P3** | `components/core/CoreEssencePanel.tsx`, `CoreHeroSection.tsx`（TL-F7 alignment） |
| **P3** | `00_PRIMARY_ACTIVE_LAW/M55_COMPOSITE_CALENDAR_TABLE_SSOT_v1.md` |

**Non-target:** `/home/**` frozen；storefront frozen pages；Stripe webhook signature logic.

---

## J. Rollback plan

| Trigger | Action |
|---------|--------|
| **GX-01 fail in staging** | Do not enable `M55_COMPOSITE_ENGINE_V2_ENABLED` |
| **Production incident** | Flag **false**；disable checkout（準備中） |
| **Code rollback** | Revert deploy；legacy read path still works（NULL `engine_version`) |
| **DB** | **Do not DELETE** snapshots；column drop only if no v2 rows |
| **Forbidden** | Mass UPDATE legacy snapshots |

---

## K. ENGINE-IMPL-B execution gate proposal

**IMPL-B** = **code execution** split into sub-gates（Human GO each）:

| Sub-gate | Title | Scope | Prerequisite |
|----------|-------|-------|--------------|
| **IMPL-B1** | Calendar bundle ingest | JSON + manifest + SSOT doc | **IMPL-A GREEN** |
| **IMPL-B2** | Composite pipeline + **GX-01** test | `lib/m55/compositeStem/**` | B1 tables prove 1983-02-28 |
| **IMPL-B3** | DB migration apply（staging first） | SQL additive | B2 GREEN |
| **IMPL-B4** | Fulfillment write path | `dtrDraftDb`, `dtrCoreCheckoutFulfillment` | B3 |
| **IMPL-B5** | My Page + checkout block | profile + checkout | B2 |
| **IMPL-B6** | Routes + stored envelope | `/dtr/core`, `/core`, shelf | B4–B5 |
| **VERIFY-A** | Full matrix | `engine-verify-matrix.ts` | B6 |

**Human GO for IMPL-B1** requires:

1. **IMPL-A** GREEN（本条）
2. Calendar derivation method acknowledged
3. **No** production cutover in IMPL-B tranche

**Branch strategy:** `work/home-cluster` only until VERIFY-A GREEN；no `main` merge without adequacy unblock.

---

## L. Golden / legacy quick reference

| Engine | 1983-02-28 stem | paid | UI |
|--------|-----------------|------|-----|
| **v2** | **9 / 癸** | **アナリスト** | 複合占術 |
| **legacy** | **3 / 丁** | **クリエイター** | **旧計算方式** |

---

## M. No-mutation statement

- **No** code / DB migration execution / deploy / checkout / env
- **No** snapshot UPDATE/DELETE
- **No** raw ID / email / session / secret

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-IMPL-A-COMPOSITE-ASTROLOGY-V2-IMPLEMENTATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-C-R-GOLDEN-ANCHOR-1983-02-28-AND-SNAPSHOT-FIREWALL-REINFORCEMENT-001`** | Golden firewall |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-C-COMPOSITE-ASTROLOGY-GOLDEN-MATRIX-AND-CALENDAR-TABLE-SSOT-001`** | Matrix |
