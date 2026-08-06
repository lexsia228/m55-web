# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: 1.1.0
generatedAt: 2026-08-06T06:42:52.660Z

## Pack hashes

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: b0dabbaf2472059b83f7a7ddafc64a29c1e18090a278f055a9e1c732958d1bc1
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
- last observed origin/main SHA: 7e30b6456c6b2c45383ea8fb042efb9d17229893
- last observed at: 2026-08-06T06:42:52.660Z

## Production observed state

- production.lastObservedSha: 7e30b6456c6b2c45383ea8fb042efb9d17229893
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
observationsSha256: b0dabbaf2472059b83f7a7ddafc64a29c1e18090a278f055a9e1c732958d1bc1
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: f6aaae41a3c2fd556d251a12f83464a0ea17b4c813c5211a1c70f48f325c8786
artifactSha256: 73aef333b58a0de28da73e46fecf611306da9413b271f32646b6223fd16af3fb
generatorVersion: 1.1.0
generatedAt: 2026-08-06T06:42:52.660Z
<!-- PRODUCT_AUTHORITY_METADATA_END -->
