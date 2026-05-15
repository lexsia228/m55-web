# M55 Core Regression Audit (2026-04-06)

## Scope
- host3000 core regression diagnostics (`/api/diagnostics/core-regression`)
- canonical pipeline deterministic checks
- pair route nondeterminism audit
- Playwright deterministic expansion

## What was implemented
- Added formal `displayFingerprint` in canonical static output.
- Added diagnostics response `boundaryContext`:
  - `normalizedGregorianDate`
  - `canonicalTimezone`
  - `solarTermBoundary`
  - `lunarBoundary`
  - `fallbackMode`
- Added JP/US country matrix checks in diagnostics.
- Added pair fingerprint (`pairFingerprint`) for pair-route determinism.
- Added replay-equivalence checks for:
  - `coreType`
  - `coreLabel`
  - `coreAxisScores`
  - `engineVersion`
  - `lockedAt`
  - `staticFingerprint`
  - `displayFingerprint`
- Expanded Playwright scenario coverage:
  - country JP/US
  - fixedNow provided/omitted
  - normal / secret-equivalent (incognito-like) context

## Result
- 1983-02-28 / 1992-12-19 / pair(1983x1992) all deterministic.
- raw/display/pair diff are all zero.
- Boundary context is attached for explainability.

## Evidence
- Structured JSON report:
  - `docs/audit/M55_CORE_REGRESSION_AUDIT_2026-04-06.json`
- API run (without fixedNow, 3 consecutive): pass
- Playwright (`e2e/core-regression-anchor.spec.ts`): pass

## Founder Anchor Hero Expectation (1983-02-28)
- Founder anchor (`1983-02-28`) hero card expectation is fixed to `ANALYST / 静観分析型`.
- `CREATOR / クリエイター` may exist in other public title/ranking contexts, but must never appear as hero-card output for this anchor.
- Audit coverage is implemented in `e2e/core-founder-anchor-hero.spec.ts` for both normal and secret-equivalent contexts.
