# Codex Product Authority Adapter

Before analysis or mutation:

1. Read `.product-authority/generated/authority-header.md`
2. Run `npm run verify:product-authority` (steady-state) or bootstrap verifier on Authority Pack branch
3. Confirm ACTIVE lane, protected worktrees, and Production observed state
4. STOP on hash drift, authority conflict, or pending evidence promoted without verification

Pack anchors:

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: d2d7c235c307de8b9e2454a2cca1ef26c5bdaeae472aed1a6889f1a3edde4029
- historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
- generatedAt: 2026-07-27T09:56:00+00:00

Memory and conversation history are not authority.
Human-approved durable authority supersedes generated adapter guidance.
Generated adapters must not prescribe push, commit, merge, or deploy sequencing.

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: d2d7c235c307de8b9e2454a2cca1ef26c5bdaeae472aed1a6889f1a3edde4029
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: d6ca60d37b6a6dd81fa6e22f83b5dd71bd518b9ec245a048ec84bd77a5f775e2
artifactSha256: 2743c854f9384352e017b4124a4b968c4e5d2f8c9c81fcfbcd5dc8857a582e80
generatorVersion: 1.0.0
generatedAt: 2026-07-27T09:56:00+00:00
<!-- PRODUCT_AUTHORITY_METADATA_END -->
