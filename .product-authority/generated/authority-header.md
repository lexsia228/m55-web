# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: 1.1.0
generatedAt: 2026-08-06T10:02:33.727Z

## Pack hashes

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: 1ac34630e24ab0196f7e5c7f9cc2754cfafd425b1be6e25d28bbf2789da81df2
- historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658

## Product identity

- PRODUCT_ID: m55
- PRODUCT_NAME: M55
- canonical Production origin: https://m-55.jp
- canonical host: m-55.jp
- non-authoritative host: m55.jp

## Repository

- repository: lexsia228/m55-web
- default branch: main
- last observed origin/main SHA: f3ab98a08e06cef7b16405d1adced387c23a29d2
- last observed at: 2026-08-06T10:02:33.727Z

## Production observed state

- production.lastObservedSha: f3ab98a08e06cef7b16405d1adced387c23a29d2
- production.status: ROUTE_BUILD_IDENTITY_OBSERVED

## Lanes

- Product Authority Pack: COMPLETED
- Self funnel operational baseline: COMPLETED
- Growth Share (WT-011): COMPLETED
- Build Week: FROZEN

## Growth Share delivery state

- PR #81: MERGED
- Growth code is not Production

## STOP conditions

- hash drift between sources and lockfile
- authority conflict with generated header
- branch-local treated as merged runtime
- pending Production evidence promoted without verification
- protected worktree mutation during completed lanes
- secret-like values in authority or observations

## Unresolved evidence

- provider Production/Preview identities (Supabase, Clerk, Stripe)

Human-approved durable authority and verified observations supersede generated artifacts.
Generated outputs must not synthesize operational workflow gates.

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: 1ac34630e24ab0196f7e5c7f9cc2754cfafd425b1be6e25d28bbf2789da81df2
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: 20c70ebf3a25f073a18b209ce406212bc104ee87e528d7c093d76e1533c9344b
artifactSha256: d9a3fb611ce1faddcf802abfe137638b55d2d0bb88d2fb0bfb0ef0ff53454aff
generatorVersion: 1.1.0
generatedAt: 2026-08-06T10:02:33.727Z
<!-- PRODUCT_AUTHORITY_METADATA_END -->
