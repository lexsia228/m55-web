# M55 Product Authority Header

schemaVersion: 1.0.0
generatorVersion: 1.0.0
generatedAt: 2026-07-25T07:00:00+00:00

## Pack hashes

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: ebd162a88045f07356d2d9a2ac3c4c39eb45ccdd444e19d96f2cfe1d855734a4
- historySha256: c1ce11973e0151e0f23d455005e5bef8a67c0ca60941509461d405d90e2e08f5

## Product identity

- PRODUCT_ID: m55
- PRODUCT_NAME: M55
- canonical Production origin: https://m-55.jp
- canonical host: m-55.jp
- non-authoritative host: m55.jp

## Repository

- repository: lexsia228/m55-web
- default branch: main
- last observed origin/main SHA: e6afe67262ebcee3353a3a43713f7ecf8369f26f
- last observed at: 2026-07-25T07:00:00+00:00

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

## Next exact gate

CATEGORY-2-M55-SHARED-CRITICAL-AUTHORITY-PACK-BOOTSTRAP-DIFF-REVIEW-REV1

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: ebd162a88045f07356d2d9a2ac3c4c39eb45ccdd444e19d96f2cfe1d855734a4
historySha256: c1ce11973e0151e0f23d455005e5bef8a67c0ca60941509461d405d90e2e08f5
generatedBundleSha256: 9f6cb4b670d36b8c60be90fcbce95b964f7d33cf6b5e22a85da6e15b7c396d3d
artifactSha256: 393564538d7a0ff57532c9c5d83e1daaada63211a5f90a87db8a6dd72cc505ac
generatorVersion: 1.0.0
generatedAt: 2026-07-25T07:00:00+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
