# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: 1.0.0
generatedAt: 2026-07-26T13:23:20+00:00

## Pack hashes

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: 57a1dd0250852e243f08c4852c71f88db9e317ee2eacf3577ad8e302123030b5
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
- last observed origin/main SHA: b13fcd540e210c3ffb41fa2f56889df74b1b3915
- last observed at: 2026-07-26T13:23:20+00:00

## Production observed state

- production.lastObservedSha: null
- production.status: PENDING_REOBSERVATION_ON_M-55.JP

## Lanes

- ACTIVE: Authority Pack (ACTIVE)
- PARKED: Self funnel (PARKED)
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
observationsSha256: 57a1dd0250852e243f08c4852c71f88db9e317ee2eacf3577ad8e302123030b5
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: 683f7f7fb1c6ef1444de44b8d518a72031224ada3a6814e4c6f42e3005a48f61
artifactSha256: 99c7a9ba970d46830f6b22be50b51377e388e68e83f25781141ba07b0d185932
generatorVersion: 1.0.0
generatedAt: 2026-07-26T13:23:20+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
