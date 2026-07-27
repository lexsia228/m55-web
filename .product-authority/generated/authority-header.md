# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: 1.0.0
generatedAt: 2026-07-27T09:56:00+00:00

## Pack hashes

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: d2d7c235c307de8b9e2454a2cca1ef26c5bdaeae472aed1a6889f1a3edde4029
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
- last observed origin/main SHA: 696559009367a6ac445dc7a07876590b16cd8488
- last observed at: 2026-07-27T09:56:00+00:00

## Production observed state

- production.lastObservedSha: null
- production.status: PENDING_REOBSERVATION_ON_M-55.JP

## Lanes

- ACTIVE: Authority Pack (COMPLETED)
- PARKED: Self funnel (COMPLETED)
- FROZEN: Build Week (FROZEN)

## STOP conditions

- hash drift between sources and lockfile
- authority conflict with generated header
- branch-local treated as merged runtime
- pending Production evidence promoted without verification
- protected worktree mutation during Authority Pack lane
- secret-like values in authority or observations

## Unresolved evidence

- Production SHA on m-55.jp
- provider Production/Preview identities (Supabase, Clerk, Stripe)

Human-approved durable authority and verified observations supersede generated artifacts.
Generated outputs must not synthesize operational workflow gates.

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: d2d7c235c307de8b9e2454a2cca1ef26c5bdaeae472aed1a6889f1a3edde4029
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: d6ca60d37b6a6dd81fa6e22f83b5dd71bd518b9ec245a048ec84bd77a5f775e2
artifactSha256: f4358998525af14b17e2ca94c0e1a075b79277ef78f573c018d6ef0d200748e2
generatorVersion: 1.0.0
generatedAt: 2026-07-27T09:56:00+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
