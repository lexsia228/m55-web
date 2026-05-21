# M55 Composite Calendar Table SSOT v1

**Bundle ID:** `m55-calendar-2026-01`  
**Range:** `1900-01-01` … `2100-12-31` (civil, inclusive)  
**Status:** Ingested by **ENGINE-IMPL-B1** (static JSON + deterministic build/verify)

## Authority

| Priority | Source |
|----------|--------|
| 1 | ENGINE-SPEC-C / ENGINE-SPEC-C-R / ENGINE-IMPL-A |
| 2 | This document |
| 3 | Generated artifacts under `lib/m55/calendar/data/` |

## Artifacts

| File | Role |
|------|------|
| `manifest.json` | Bundle id, sha256 checksums, golden spot-check |
| `solar_terms_1900_2100.json` | 24 solar terms × year (`Asia/Tokyo` ISO instants) |
| `lunar_civil_days_1900_2100.json` | Civil date → lunar day + **P-LUNAR** `dayStemIndex` |
| `tz_country_primary.json` | Country → primary IANA TZ |

## Derivation (no runtime secrets)

| Table | Method | Provenance label |
|-------|--------|------------------|
| **Lunar civil map** | Bit-packed lunisolar table (1900–2100) + **M55 golden anchor** on `1983-02-28` → stem **9 (癸)** via lunar absolute-day delta | `m55_almanac_v1_derived` |
| **Solar terms** | Astronomical approximation (Sun ecliptic longitude) → Tokyo `+09:00` wall time | `m55_solar_terms_v1` |
| **TZ primary** | Static country map (JP → `Asia/Tokyo`, …) | `country_primary` |

**Forbidden:** Civil JDN `essenceStemLaneIndex` fallback for v2 stem. Missing key → `M55_COMPOSITE_CALENDAR_TABLE_MISSING` (fail-closed).

## Golden anchor (GX-01 / GOLDEN_1983_02_28_V2)

| Field | Value |
|-------|--------|
| civilDate | `1983-02-28` |
| bucket | `Asia/Tokyo` |
| dayStemIndex | **9** |
| dayStemChar | **癸** |
| lookup | `lunar_civil_days_1900_2100.json` → `days["1983-02-28"]` |

## Deterministic tooling

```bash
node scripts/calendar/build-m55-calendar-bundle.mjs
node scripts/calendar/verify-m55-calendar-bundle.mjs
```

Rebuild overwrites JSON + manifest; verify recomputes sha256 from parsed JSON (must match manifest).

## Next gate

**ENGINE-IMPL-B2:** `runM55CompositeStemPipeline` + golden unit test (reads these tables; no JDN fallback).
