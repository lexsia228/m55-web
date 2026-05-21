# Phase 5-6H-5Z-I-V-ENGINE-IMPL-B2 — Composite v2 pipeline + golden test（2026-05-21）

## Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-B2** |
| **Title** | **Composite astrology v2 pipeline and golden test** |
| **Classification** | **Category 2 / pipeline code / no DB / no deploy** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_PIPELINE_AND_GOLDEN_TEST_GREEN`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-IMPL-B2-PIPELINE-AND-GOLDEN-TEST-001`** |
| **Prior** | **ENGINE-IMPL-B1** GREEN |

## Pipeline API

```ts
import { runM55CompositeStemPipeline } from '@/lib/m55/compositeStem/pipeline';

runM55CompositeStemPipeline(input: M55CompositeCanonicalInput): CompositeStemResult;
```

| Rule | Implementation |
|------|----------------|
| **P-LUNAR** | `lookupLunarCivilDay(effectiveLocalDate)` → `dayStemIndex` |
| **P-SOLAR** | `resolveSolarTermMetadata` → `boundaryMetadata` only |
| **23:00 boundary** | `applyDayBoundaryV1` |
| **birthTimeUnknown** | `12:00:00.000` + `unknown_time_noon` |
| **fail-closed** | `M55CompositeStemError`；no `essenceStemLaneIndex` in v2 path |

## GOLDEN_1983_02_28_V2 result

| Field | Expected | Actual |
|-------|----------|--------|
| stemLaneIndex | 9 | **9** |
| stemChar | 癸 | **癸** |
| paid.publicTitle | アナリスト | **アナリスト** |
| engineVersion | m55-composite-stem-v2 | **m55-composite-stem-v2** |
| calculationMode | full | **full** |
| lunarDayKey | (table) | **1983-1-15** |
| solarTermKey | present | **present** |

## Validation

```text
node scripts/calendar/verify-m55-calendar-bundle.mjs  → OK
npx tsx --test lib/m55/compositeStem/pipeline.golden.test.ts → 4/4 pass
npx tsc --noEmit → exit 0
git diff --check → exit 0
```

## No-mutation

- **Not connected:** dtrEngine, `/core`, `/dtr`, fulfillment, DB, entitlements, checkout
- **Not touched:** existing snapshots

## Next

**ENGINE-IMPL-B3** — additive DB migration（staging first）
