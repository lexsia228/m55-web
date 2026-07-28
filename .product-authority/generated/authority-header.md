# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: 1.0.0
generatedAt: 2026-07-27T09:56:00+00:00

## Pack hashes

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: 8b37ff59842b8675e466683edf37a376109b26abfd945b3a7934b487e59152c5
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

- Product Authority Pack: COMPLETED
- Self funnel operational baseline: COMPLETED
- Growth Share (WT-011): ACTIVE
- Build Week: FROZEN

## Growth Share delivery state

- PR #81: OPEN_UNMERGED_BRANCH_LOCAL
- Growth code is not Production

## STOP conditions

- hash drift between sources and lockfile
- authority conflict with generated header
- branch-local treated as merged runtime
- pending Production evidence promoted without verification
- protected worktree mutation during completed lanes
- secret-like values in authority or observations

## Unresolved evidence

- Production SHA on m-55.jp
- provider Production/Preview identities (Supabase, Clerk, Stripe)

Human-approved durable authority and verified observations supersede generated artifacts.
Generated outputs must not synthesize operational workflow gates.

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: 8b37ff59842b8675e466683edf37a376109b26abfd945b3a7934b487e59152c5
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: d3c8b9c1f809913af96c6c2d21e01916ae36335ce3a2f480363630464c60adb9
artifactSha256: 3f6fb472bc54c9bd9d0fdee703fabff360c2a18aa4f2f6911573d5f2eefaed4e
generatorVersion: 1.0.0
generatedAt: 2026-07-27T09:56:00+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
