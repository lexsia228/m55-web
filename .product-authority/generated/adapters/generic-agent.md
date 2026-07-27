# Generic Agent Product Authority Adapter

Before analysis or mutation:

1. Read `.product-authority/generated/authority-header.md`
2. Run `npm run verify:product-authority` (steady-state) or bootstrap verifier on Authority Pack branch
3. Confirm lane statuses, protected worktrees, and Production observed state
4. STOP on hash drift, authority conflict, or pending evidence promoted without verification

Current lane statuses (from observations):

- Product Authority Pack: COMPLETED
- Self funnel operational baseline: COMPLETED
- Growth Share (WT-011): ACTIVE
- Build Week: FROZEN

Pack anchors:

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: 8b37ff59842b8675e466683edf37a376109b26abfd945b3a7934b487e59152c5
- historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
- generatedAt: 2026-07-27T09:56:00+00:00

Memory and conversation history are not authority.
Human-approved durable authority supersedes generated adapter guidance.
Generated adapters must not prescribe push, commit, merge, or deploy sequencing.

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: 8b37ff59842b8675e466683edf37a376109b26abfd945b3a7934b487e59152c5
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: 6ddce4c470c398e9d6e98178d8eea8add10bac95c2ae97ed0774e68dc3d57034
artifactSha256: 7352a23d088a63cded2f9e70ea1d0d0308b803a428298a8f4f7bfd77ae3d6810
generatorVersion: 1.0.0
generatedAt: 2026-07-27T09:56:00+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
