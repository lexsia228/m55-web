# M55 DTR DOB Personalization V2 Production Flag ON Evidence

## 1. Gate Identity

| 項目 | 値 |
|---|---|
| Gate | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-PRODUCTION-FLAG-ON-EVIDENCE-REV1 |
| Date | 2026-06-28 |
| Source gate | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-PRODUCTION-FLAG-ON-REV1 |
| Source gate result | GREEN |

## 2. Production Identity

| 項目 | 値 |
|---|---|
| Production SHA | `627c59c1806a73ed5422d20d0d943897391f16b1` |
| branch | `main` |
| vercel_env | `production` |
| node_env | `production` |
| diagnostics HTTP status | 200 |
| local / origin / prod aligned | yes |

## 3. Flag Operation

| 項目 | 値 |
|---|---|
| variable | `M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED` |
| value | `true` |
| scope | Production only |
| mechanism | Vercel CLI, `npx vercel env add` |
| project | `m55-official/m55-webv2` |
| domain | `m-55.jp` |
| stored | Sensitive |
| other env variables changed | none |
| Preview / Development envs | unchanged |
| Clerk / Supabase / Stripe env | unchanged |

## 4. Redeploy Result

| 項目 | 値 |
|---|---|
| redeploy command | `npx vercel --prod --yes` |
| deployment ID | `dpl_F8eVMi4Q9mQ4aXeakTaSQq6kWhTo` |
| target | production |
| alias | `https://m-55.jp` |
| readyState | READY |
| git SHA after redeploy | `627c59c1806a73ed5422d20d0d943897391f16b1` |
| source code SHA | unchanged |

## 5. GET-Only Production Observation

| Route | Raw | Final | Result |
|---|---:|---:|---|
| `/` | 307 | 200 | healthy |
| `/dtr` | 200 | 200 | healthy |
| `/dtr/lp` | 200 | 200 | healthy |
| `/support` | 200 | 200 | healthy |
| `/legal/tokushoho` | 200 | 200 | healthy |
| `/dtr/core` | 307 | 200 | healthy |
| `/reply` | 404 | 404 | expected |
| `/reply/result` | 404 | 404 | expected |

- production POST: none
- no auth / cookies / user data used

## 6. Activation Boundary

- DOB-v2 fulfillment is now active for future new fulfillment INSERTs only.
- Existing purchased snapshots are unchanged.
- Display reads stored version only.
- Missing version remains v1.
- Stored v1 remains v1.
- Stored v2 remains v2.
- No live fulfillment was triggered in the flag ON gate.
- Stripe / payment / wallet / ticket / consult send route logic was not changed.

## 7. Rollback / Kill-Switch

- Setting `M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED` to anything other than exact `'true'`, or deleting it, disables v2 for future fulfillments.
- Already-created v2 snapshots remain v2 by stored version design.
- Reverting already-created v2 snapshots would require a separate DB mutation gate and is not recommended.
- Rollback was not executed in the flag ON gate.

## 8. Known Harmless Background Command

- A background `vercel project ls` process exited with code 134.
- This was classified harmless because subsequent `vercel link`, `vercel env add`, and production redeploy succeeded.
- No follow-up required.

## 9. Explicit Non-Actions

The source flag ON gate and this evidence gate did not perform:

- source code edits
- DB connection
- DB mutation
- migration apply
- payment operation
- Stripe checkout
- webhook replay
- consult reply send
- ticket consume
- OpenAI / Gemini call
- production POST
- live purchase QA
- NOTE / LP / SNS
- real user data use
- unrelated env changes

## 10. Next Gate Recommendation

- Recommended next gate: CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-PRODUCTION-FLAG-ON-EVIDENCE-PUSH-AND-PROD-OBSERVATION-REV1
- After that, controlled live purchase QA may be considered in a separate gate.
- This file does not authorize or perform live purchase QA.
