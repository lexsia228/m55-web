# Cursor Product Authority Adapter

Before analysis or mutation:

1. Read `.product-authority/generated/authority-header.md`
2. Run `npm run verify:product-authority` (steady-state) or bootstrap verifier on Authority Pack branch
3. Confirm lane statuses, protected worktrees, and Production observed state
4. STOP on hash drift, authority conflict, or pending evidence promoted without verification

Current lane statuses (from observations):

- Product Authority Pack: COMPLETED
- Self funnel operational baseline: COMPLETED
- Growth Share (WT-011): COMPLETED
- Build Week: FROZEN

Pack anchors:

- authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
- observationsSha256: b0dabbaf2472059b83f7a7ddafc64a29c1e18090a278f055a9e1c732958d1bc1
- historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
- generatedAt: 2026-08-06T06:42:52.660Z

Memory and conversation history are not authority.
Human-approved durable authority supersedes generated adapter guidance.
Generated adapters must not prescribe push, commit, merge, or deploy sequencing.

## M55 Experience Control Plane v2 (enforcement)

- Active Growth lane work must obey ECP v2 (`m55-ecp-v2`).
- Constitution: `lib/m55/commercialUx/experience/experienceConstitution.ts`
- Route registry: `lib/m55/commercialUx/experience/experienceRouteRegistry.ts`
- Copy domains: `lib/m55/commercialUx/experience/copyAuthorityDomains.ts`
- Do not create a second shell/header/CTA/trait/plan/print authority.
- Required local verification:
  - `npm run verify:m55-experience-control-plane`
  - `npm run verify:m55-ssot`
  - `npm run verify:product-authority`
- Product Truth prices/plans remain machine-contract owned; UI must use `PLAN_COMPARISON`.
- No LLM-as-a-Judge is a required merge gate. Human commercial/visual approval remains mandatory.

<!-- PRODUCT_AUTHORITY_METADATA_START -->
authoritySha256: d08aa1fc1a57224681f516c38ee3581b8635f95b779cb8b0ab5809849917a0f3
observationsSha256: b0dabbaf2472059b83f7a7ddafc64a29c1e18090a278f055a9e1c732958d1bc1
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: f6aaae41a3c2fd556d251a12f83464a0ea17b4c813c5211a1c70f48f325c8786
artifactSha256: 9c89c5d205db17527f5d921ff843b23f0a94d296b0c9f6abdb1e624386342c56
generatorVersion: 1.1.0
generatedAt: 2026-08-06T06:42:52.660Z
<!-- PRODUCT_AUTHORITY_METADATA_END -->
