# M55 FP-V1 Individualization Variance QA Evidence

- **Gate:** `CATEGORY-2-M55-FREE-PAID-INDIVIDUALIZATION-FP-V1-VARIANCE-QA-IMPLEMENTATION-REV1`
- **Tested commit SHA:** `ca0c253956000b277b9822af3f585aa0907a7707`
- **Date:** 2026-07-09
- **Scope:** fp-v1 pure functions only (`lib/m55/individualization/**`)
- **Data:** synthetic DOB / synthetic free-v1 / synthetic paid-v1 only
- **Non-scope:** UI copy, Free Result, paid bake, DB write, Stripe, ticket, AI, real user data

## Versions

| Spec | Version |
|---|---|
| fingerprint | fp-v1 |
| DOB axis lookup | dal-v1 |
| primary theme reply map | ptrm-v1 |
| field naming | gmfn-v1 |
| free questionnaire | free-v1 |
| paid questionnaire | paid-v1 |

## Test matrix summary

| Suite | Cases | Result |
|---|---|---|
| DOB decade + leap | 13 DOBs | PASS |
| dayBand boundaries | 8 DOBs | PASS |
| month / season3 | 12 months + leap late | PASS |
| stemLaneIndex 0–9 | 30 lookups (3 dayBands × 10 stems) | PASS |
| free-v1 variance | F0 vs F1–F8 (same DOB) | PASS |
| paid-v1 variance | P0 vs P1–P5 (same DOB + free) | PASS |
| anti-template | determinism / DOB diff / evidence / leakage / fail-closed | PASS |

**Test file:** `lib/m55/individualization/individualizationV1.variance.test.ts`
**Runner:** `npx tsx --test` → 10/10 PASS (plus existing unit 20/20 PASS)

## DOB coverage

### Decade / boundary / leap

| Synthetic DOB | Role |
|---|---|
| 1955-06-15 | 1950s boundary |
| 1963-03-10 | 1960s |
| 1968-11-21 | 1960s |
| 1972-01-01 | 1970s |
| 1977-08-20 | 1970s |
| 1983-04-11 | 1980s |
| 1989-12-31 | 1980s |
| 1992-07-15 | 1990s |
| 1998-02-28 | 1990s |
| 2001-05-10 | 2000s |
| 2005-09-21 | 2000s |
| 2012-10-01 | 2010s boundary |
| 2000-02-29 | leap day |

### dayBand boundaries (`1990-01-*`)

| DOB | Expected dayBand |
|---|---|
| 1990-01-01 | early |
| 1990-01-10 | early |
| 1990-01-11 | mid |
| 1990-01-20 | mid |
| 1990-01-21 | late |
| 1990-01-28 | late |
| 1990-01-29 | late |
| 1990-01-31 | late |

### month / season3

- Months 1–12 covered via `1990-{01..12}-15`
- season3 values observed: `{0, 1, 2}`
- `2000-02-29` → dayBand `late`

### stemLaneIndex

- stems 0–9 each exercised
- distance (`stem % 3`): close / middle / solo all observed
- change (`(stem + dayBandIndex) % 3`): observe / adjust / rebuild all observed

## Free variance comparison (case-to-case)

Fixed: synthetic DOB `1992-07-15`, stem `3`, paid = P0 baseline.
Hashes below are truncated (first 12 hex chars) for evidence readability.

| Case | Change | freeAxes.distance | pick | primaryTheme | freeHash | outputHash |
|---|---|---|---|---|---|---|
| F0 | baseline | close | diverge/decision | work | `57b795f8773b` | `f3d1ba88496f` |
| F2 | distance → solo_reset | solo | diverge/distance | work | `6e72f6f5ef68` | `ebce55fdde26` |
| F6 | primary_theme → relation | close | diverge/decision | relation | `91cb8ce413b8` | `171743733e4f` |

**Observation:** same DOB + different free → freeExpression / pick / freeAnswerHash / outputHash differ. Theme-only (F6) keeps axes but changes `primaryReplyTheme` + hashes (expected).

## Paid variance comparison (case-to-case)

Fixed: synthetic DOB `1983-04-11`, stem `4`, free = F0 baseline.

| Case | Change | chapterBias | intensity | hesitation | paidHash | outputHash |
|---|---|---|---|---|---|---|
| P0 | baseline | I:2 II:2 III:1 IV:1 | mid | present / II / too_many | `816386c2bf48` | `729e46a16cc4` |
| P2 | friction → unclear_end | I:2 II:1 III:2 IV:1 | mid | present / III / unclear_end | `5db356dcd91d` | `83e09d545449` |
| P5 | paid = null | null | low | absent | null | `3ee6e0e699f2` |

**Observation:** same DOB + same free + different paid → paidDepth / hesitation / paidAnswerHash / outputHash differ. P4 (report/reading only) moves readingStyle/reportUsage + affinity + hashes without requiring chapterBias change (expected).

## DOB variance (same free/paid)

| Case | Synthetic DOB | dobFp (trunc) | outputHash (trunc) |
|---|---|---|---|
| D1 | 1963-03-10 | `53c4b7c72315` | `ba41954b1cd7` |
| D2 | 2005-09-21 | `9be1db2361c0` | `4ca893eb61d9` |

**Observation:** same free/paid + different DOB → dobFp and outputHash differ; align/diverge sets also differ.

## outputHash reaction summary

| Comparison | outputHash reacts? |
|---|---|
| identical inputs | same hash (deterministic) |
| same DOB, different free | yes |
| same DOB + free, different paid | yes |
| same free + paid, different DOB | yes |

## Safety leakage summary

Checked on draft JSON samples:

| Check | Result |
|---|---|
| evidenceAnswerIds empty rate | 0% |
| `"score"` key | absent |
| `"birthDate"` key in output | absent |
| diagnosis / consultation / advice / fortune / horoscope | absent |
| rawPrompt / rawResponse / systemPrompt | absent |
| stripeSecret / clerkSecret / serviceRole / userId / email | absent |
| 相談返書 / 相談サービス | absent |
| invalid DOB / bad stem / unknown answer_id | fail-closed |

Note: synthetic DOB strings appear only as **test inputs**, not as output object keys.

## Anti-template connection

| Anti-template rule | Evidence |
|---|---|
| same DOB, different free → free-side data changes | F0 vs F2/F6 |
| same DOB + free, different paid → paid-side data changes | P0 vs P2/P5 |
| same free, different DOB → dobBase/align changes | D1 vs D2 |
| evidenceAnswerIds non-empty | all success samples |
| no score storage | leakage suite |
| no raw birthDate in output | leakage suite |
| outputHash reacts to input diffs | hash tables above |
| stem/template alone ≠ “individualized complete” | noted: DOB-only is one layer; free/paid layers also required |

## Deferred (not covered by this QA)

- Free Result UI copy resonance
- 保存版 body naturalness / chapter prose individuality
- “explanation one sentence” UX
- purchase rate / SNS / NOTE inflow
- generation_meta allowlist wiring / paid bake runtime

## Conclusion

**`individualized`**

fp-v1 pure functions produce deterministic, input-reactive fingerprints across synthetic DOB × free-v1 × paid-v1. No template-only assignment pattern was observed in the covered matrix. Safety denylist clean. Runtime / UI / DB / Stripe remain unconnected.

## Commands run

```text
npx tsx --test lib/m55/individualization/individualizationV1.test.ts
npx tsx --test lib/m55/individualization/individualizationV1.variance.test.ts
npx tsc --noEmit
git diff --check
```
