# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: 1.1.0
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
generatedBundleSha256: 3e95cd02bb338504a4330dd0b37e3fd60d5d8d0b9539f2fc1d67f638cd856ee8
artifactSha256: 6db45a664ec099a752a33b2a6b087d2113e801da02eb660782862e66314958a1
generatorVersion: 1.1.0
generatedAt: 2026-07-27T09:56:00+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
