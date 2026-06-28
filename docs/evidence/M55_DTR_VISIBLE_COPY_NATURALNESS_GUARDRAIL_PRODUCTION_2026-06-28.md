# M55 DTR Visible Copy Naturalness Guardrail Production Evidence

## 1. Gate / Commit Identity

| 項目 | 値 |
|---|---|
| Gate | CATEGORY-1-M55-DTR-VISIBLE-COPY-NATURALNESS-GUARDRAIL-PRODUCTION-EVIDENCE-REV1 |
| Date | 2026-06-28 |
| Implementation commit | `e52a4e2cc7bdd0bf77a9f5c1028bd53d8f38d853` |
| Implementation subject | `feat: add naturalness guardrail for DTR visible copy` |
| Prior base commit | `159dd56d931d7ed9fe023e1a9f1db6ce22b704b6` |
| branch | `main` |
| origin/main (at evidence time) | `e52a4e2cc7bdd0bf77a9f5c1028bd53d8f38d853` |
| Production SHA | `e52a4e2cc7bdd0bf77a9f5c1028bd53d8f38d853` |

## 2. What Changed

- Added Naturalness Guardrail for user-facing DTR visible copy.
- Added `checkNaturalness` / `assertNaturalness` and supporting rule functions in `lib/m55/dtrVisibleCopyNaturalness.ts`.
- Rewrote DOB-v2 visible copy to remove mechanical / backend wording.
- Removed `読み取りです` / `正午基準` / `補正した読み取り` from new template / catalog path.
- Naturalized stem 7, 8, and 9 visible copy.
- Removed `構成は、` opener and bare `観測` from user-visible source.
- Fixed s7 duplicate sentence by avoiding repeated `handlingHint` output in the s7 prefix builder.
- Added guardrail coverage for `速報より、蓄積` and cold `外からは` evaluation patterns.

## 3. Files Changed by Implementation Commit

| ファイル | 操作 |
|---|---|
| `lib/m55/dtrDobPersonalizationV2.ts` | modified |
| `lib/m55/dtrEngine.ts` | modified |
| `lib/m55/dtrPaidIndividualizationCompose.ts` | modified |
| `lib/m55/dtrVisibleCopyNaturalness.ts` | added |
| `lib/m55/dtrVisibleCopyNaturalness.test.ts` | added |

## 4. Validation Already Completed

| 検証 | 結果 |
|---|---|
| `dtrVisibleCopyNaturalness` tests | 51 / 51 PASS |
| `npx tsc --noEmit` | PASS |
| Actual diff review REV1 | YELLOW / HOLD (B1–B4 blockers identified) |
| Patch REV2 | GREEN / READY_FOR_COMMIT |
| Actual diff review REV2 | GREEN / READY_FOR_COMMIT |
| Commit gate REV1 | GREEN |
| Push + Production observation REV1 | GREEN |

## 5. Production Observation

| 項目 | 値 |
|---|---|
| Host | `https://m55-webv2.vercel.app` |
| Diagnostics endpoint | `GET /api/diagnostics/build` |
| HTTP status | 200 |
| vercel_env | `production` |
| vercel_git_sha | `e52a4e2cc7bdd0bf77a9f5c1028bd53d8f38d853` |
| vercel_branch | `main` |
| node_env | `production` |

**Route summary:**

| Route | Status |
|---|---|
| `/` | 307 → `/home` |
| `/dtr` | 200 |
| `/dtr/lp` | 200 |
| `/support` | 200 |
| `/legal/tokushoho` | 200 |
| `/dtr/core` | 307 → `/dtr/lp` (logged out) |
| `/reply` | 404 (expected) |
| `/reply/result` | 404 (expected) |

**Operational constraints observed:**

- no manual deploy
- no env change
- no DB / payment / OpenAI / Gemini
- no production POST
- no logged-in real user snapshot browsing in this gate

## 6. Activation Boundary

| 項目 | 状態 |
|---|---|
| `M55_DTR_CHAPTER_BODY_GEN_ENABLED` | OFF (unchanged by this gate) |
| real AI provider integration | not active / not implemented by this gate |
| real provider-generated chapter bodies live | **not claimed** |

This evidence does **not** claim that real AI provider-generated chapter bodies are live in Production.

## 7. Existing Purchaser Boundary

- no DB mutation
- no backfill
- no display-time regeneration
- existing purchased snapshots remain unchanged by design
- existing snapshots may be used as before/after evidence for future human visual confirmation

## 8. Claim Boundary

### Allowed

- New source / template / catalog path has Naturalness Guardrail and visible copy naturalization in Production.
- New generated / snapshot path can use improved base copy and guardrail.
- Production SHA and routes were observed read-only at `e52a4e2cc7bdd0bf77a9f5c1028bd53d8f38d853`.
- s7 duplicate sentence fix is in Production source path.

### Not Allowed

- all existing purchased snapshots were rewritten
- all logged-in UI examples are visually confirmed after this evidence gate
- real AI provider generation is live
- `M55_DTR_CHAPTER_BODY_GEN_ENABLED` is ON

## 9. Remaining HOLD Items

- Human logged-in UI visual confirmation of naturalized copy (`生年月日の細かなリズム`, `【この保存版だけの本質リズム】`, `【この保存版だけの補助整理】`, and absence of forbidden internal terms)
- Optional future analytics ledger design for privacy-safe quality data accumulation
- NOTE claim audit before publication
- bare `外からは` in stems 0–6 remains as documented claim boundary (natural psychological contrast, not guardrail-covered)

## 10. Explicit Non-Actions (This Evidence Gate)

- no source edit outside this evidence file
- no push
- no deploy / redeploy
- no env change
- no DB connection / mutation
- no payment / Stripe / webhook replay
- no OpenAI / Gemini call
- no production POST
- no NOTE / LP / SNS publication
- no raw PII / secrets / full snapshot body exposure
- no existing purchaser data update / backfill

## 11. Proposed Next Gates

| ステップ | ゲート名 |
|---|---|
| Human visual confirmation | CATEGORY-1-M55-DTR-VISIBLE-COPY-NATURALNESS-GUARDRAIL-PRODUCTION-VISUAL-CONFIRMATION-REV1 |
| Evidence push | CATEGORY-2-M55-DTR-VISIBLE-COPY-NATURALNESS-GUARDRAIL-PRODUCTION-EVIDENCE-PUSH-REV1 |
