# M55 Generation Quality Analytics Ledger Production Evidence

## 1. Gate / Commit Identity

| 項目 | 値 |
|---|---|
| Gate | CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-PRODUCTION-EVIDENCE-REV1 |
| Date | 2026-06-28 |
| Implementation commit | `58ccbb0643cee3b4913d5db087071590a99d6c80` |
| Implementation subject | `feat: add privacy-safe generation quality analytics ledger` |
| Prior base commit | `54d0acd161bb30acdb155c8ea5d224e95e087d05` |
| branch | `main` |
| origin/main (at evidence time) | `58ccbb0643cee3b4913d5db087071590a99d6c80` |
| Production SHA | `58ccbb0643cee3b4913d5db087071590a99d6c80` |
| Evidence result | Production deploy confirmed **GREEN** |
| target SHA match | **yes** |

## 2. Production Diagnostics

| 項目 | 値 |
|---|---|
| Host | `https://m55-webv2.vercel.app` |
| Diagnostics endpoint | `GET /api/diagnostics/build` |
| HTTP status | 200 |
| vercel_env | `production` |
| vercel_branch | `main` |
| vercel_git_sha | `58ccbb0643cee3b4913d5db087071590a99d6c80` |
| node_env | `production` |
| target SHA match | **yes** |

## 3. Route Health Summary

| Route | Status | Notes |
|---|---|---|
| `/` | 200 | OK |
| `/dtr` | 200 | OK |
| `/dtr/lp` | 200 | OK |
| `/support` | 200 | OK |
| `/legal/tokushoho` | 200 | OK |
| `/dtr/core` | 307 no follow / 200 follow | Existing redirect behavior |
| `/reply` | 404 | pre-existing (not introduced by this gate) |
| `/reply/result` | 404 | pre-existing (not introduced by this gate) |

## 4. Implementation Summary

| ファイル | 操作 |
|---|---|
| `supabase/migrations/20260628000000_m55_generation_quality_analytics_ledger_v1.sql` | added |
| `lib/m55/generationQualityAnalytics.ts` | added |
| `lib/m55/generationQualityAnalytics.test.ts` | added |
| `lib/m55/dtrPaidChapterBodyGen.ts` | modified (Priority 1 hook) |
| `lib/m55/dtrPaidIndividualizationCompose.ts` | modified (Priority 1 hook) |
| `lib/m55/dtrDraftDb.ts` | modified (deferral comment only; no snapshot analytics emit) |

**Priority 1 hooks implemented:**

- `paid_dtr_chapter_body` — fire-and-forget emit in `runChapterBodyGenPipeline`
- `dob_v2_visible_copy` — fire-and-forget emit in `buildPaidDtrSectionIndividualizationPrefix`
- Naturalness Guardrail result metrics — counts / rule keys only via `extractNaturalnessMetrics`

**Deferred / not implemented in this gate:**

- `paid_dtr_snapshot` analytics → `CATEGORY-2-M55-SNAPSHOT-ANALYTICS-HOOK-REV1`
  - Rationale: `DtrEnvelope.fullSections[].body` contains full paid report text; `JSON.stringify(envelope)` must not be used for naturalness analysis
- `consult_reply` analytics → separate future observe-only gate (Priority 3)
- `note_draft` analytics → separate future gate (Priority 2)

## 5. Privacy Boundary

Explicitly recorded:

- no raw body storage
- no raw user message storage
- no raw consult reply storage
- no raw paid report body storage
- no excerpt / text fragment / sentence sample / debug sample
- no prompt_raw / response_raw
- no scoped_anon_user_id in initial implementation
- no direct user_id / DOB date / payment / Stripe / Clerk / session identifiers
- violation keys are fixed catalog / rule keys only (`forbidden_internal_term`, `forbidden_mechanical_phrase`, etc.)
- `console.info` output is privacy-safe enum / number / boolean fields only:
  `generation_kind`, `content_surface`, `provider_id`, `final_status`, `naturalness_pass`, `output_length`, `stem_lane_index`, `chapter_id`

## 6. Consult Reply Hard Boundary

Explicitly recorded:

- consult reply body mutation なし
- rewrite なし
- regeneration なし
- repair なし
- backfill なし
- display-time normalization なし
- ticket operation なし
- production POST なし
- consult reply body analytics storage なし
- any consult reply content change requires separate explicit Human-approved gate

## 7. Migration Status

**Important:** migration file is committed in repo and deployed to Production **runtime source code only**.

| 項目 | 状態 |
|---|---|
| Migration file in repo | yes — `20260628000000_m55_generation_quality_analytics_ledger_v1.sql` |
| Supabase DB migration applied | **no** |
| Production DB touched | **no** |
| Analytics DB tables exist in Production | **no** (until separate Human GO apply gate) |
| migration apply | requires separate Human GO gate |

Do not imply analytics DB tables exist in Production until a separate apply gate is executed and confirmed.

## 8. Validation Evidence (Prior Review)

| 検証 | 結果 |
|---|---|
| analytics tests | 56 / 56 PASS |
| naturalness tests | 51 / 51 PASS |
| combined | 107 / 107 PASS |
| `npx tsc --noEmit` | PASS (clean) |
| Schema actual diff review REV2 | GREEN / READY_FOR_COMMIT |
| Push + observe REV1 | YELLOW (deploy pending) |
| Production deploy confirm REV1 | GREEN (target SHA matched) |

## 9. Explicit Non-Actions

- DB apply なし
- migration apply なし
- Supabase SQL なし
- env change なし
- deploy / redeploy なし
- provider call なし
- production POST なし
- consult reply mutation なし
- ticket operation なし
- payment / webhook なし
- NOTE / LP / SNS publication なし

## 10. Next Recommended Gates

| Gate | Purpose |
|---|---|
| `CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-EVIDENCE-PUSH-REV1` | Push this evidence doc to origin/main |
| `CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-MIGRATION-APPLY-PLANNING-REV1` | Separate Human GO only — Supabase migration apply planning |
| `CATEGORY-2-M55-SNAPSHOT-ANALYTICS-HOOK-REV1` | Section-level paid_dtr_snapshot analytics hook design |
| consult_reply observe-only | Separate future gate (Priority 3) |
