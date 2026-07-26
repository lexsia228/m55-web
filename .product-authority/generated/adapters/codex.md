# Codex Product Authority Adapter

Before analysis or mutation:

1. Read `.product-authority/generated/authority-header.md`
2. Run `npm run verify:product-authority` (steady-state) or bootstrap verifier on Authority Pack branch
3. Confirm ACTIVE lane, protected worktrees, and Production observed state
4. STOP on hash drift, authority conflict, or pending evidence promoted without verification

Pack anchors:

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: 57a1dd0250852e243f08c4852c71f88db9e317ee2eacf3577ad8e302123030b5
- historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
- generatedAt: 2026-07-26T13:23:20+00:00

Memory and conversation history are not authority.
Human-approved durable authority supersedes generated adapter guidance.
Generated adapters must not prescribe push, commit, merge, or deploy sequencing.

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: 57a1dd0250852e243f08c4852c71f88db9e317ee2eacf3577ad8e302123030b5
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: 683f7f7fb1c6ef1444de44b8d518a72031224ada3a6814e4c6f42e3005a48f61
artifactSha256: 3c97c7f49e06d85e4e8ee5cab85204d4e8a7a7643f00aef2ca617638c68832fc
generatorVersion: 1.0.0
generatedAt: 2026-07-26T13:23:20+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
