# Phase 5-6H-5Z-I-V-ENGINE-IMPL-B1 — Calendar bundle ingest（2026-05-21）

## Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-B1** |
| **Title** | **Composite astrology v2 calendar bundle ingest** |
| **Classification** | **Category 2 / static data + build scripts / no DB / no deploy** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_CALENDAR_BUNDLE_INGEST_GREEN`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-IMPL-B1-CALENDAR-BUNDLE-INGEST-001`** |
| **Prior** | **ENGINE-IMPL-A** GREEN |

## Bundle

| Field | Value |
|-------|--------|
| **bundleId** | `m55-calendar-2026-01` |
| **range** | `1900-01-01` … `2100-12-31` |
| **dayCount** | **73414** |
| **primary bucket** | `Asia/Tokyo` |

## Changed files

| Path | Why |
|------|-----|
| `lib/m55/calendar/data/*.json` | Generated bundle artifacts + manifest |
| `lib/m55/calendar/generation/*.mjs` | Deterministic lunisolar + solar term generation |
| `scripts/calendar/build-m55-calendar-bundle.mjs` | Build JSON + sha256 manifest |
| `scripts/calendar/verify-m55-calendar-bundle.mjs` | Fail-closed integrity + golden spot-check |
| `00_PRIMARY_ACTIVE_LAW/M55_COMPOSITE_CALENDAR_TABLE_SSOT_v1.md` | Human-readable table law |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_ENGINE_IMPL_B1_*` (this file) | Checkpoint |

## Derivation

| Table | Method | Label |
|-------|--------|-------|
| Lunar civil map | Bit-table lunisolar (1899–2100) + **M55 golden anchor** `1983-02-28` → stem **9 (癸)** via lunar absolute-day delta | `m55_almanac_v1_derived` |
| Solar terms | Sun ecliptic longitude approximation → Tokyo `+09:00` | `m55_solar_terms_v1` |
| TZ | Static `tz_country_primary.json` | `country_primary` |

**Forbidden:** Civil JDN `essenceStemLaneIndex` fallback for v2 stem.

## Golden lookup (GX-01)

| civilDate | bucket | dayStemIndex | dayStemChar | lunarDayKey |
|-----------|--------|--------------|-------------|-------------|
| `1983-02-28` | `Asia/Tokyo` | **9** | **癸** | `1983-1-15` |

**lookupBasis:** `lunar_civil_days_1900_2100.json` → `days["1983-02-28"]`

## Validation (recorded)

```text
node scripts/calendar/build-m55-calendar-bundle.mjs   → M55_CALENDAR_BUNDLE_BUILD_OK
node scripts/calendar/verify-m55-calendar-bundle.mjs  → M55_CALENDAR_BUNDLE_VERIFY_OK
npx tsc --noEmit                                      → exit 0
git diff --check                                      → exit 0
```

## No-mutation confirmation

- **Not touched:** `runM55CompositeStemPipeline`, `dtrEngine`, `/core`, `/dtr`, `/dtr/core`, DB, entitlements, checkout, deploy, env
- **No** snapshot UPDATE/DELETE
- **No** secrets in repo or logs

## Next gate

**ENGINE-IMPL-B2:** `lib/m55/compositeStem/**` pipeline + `GOLDEN_1983_02_28_V2` unit test
