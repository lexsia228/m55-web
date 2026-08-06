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
- observationsSha256: 1ac34630e24ab0196f7e5c7f9cc2754cfafd425b1be6e25d28bbf2789da81df2
- historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
- generatedAt: 2026-08-06T10:02:33.727Z

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
observationsSha256: 1ac34630e24ab0196f7e5c7f9cc2754cfafd425b1be6e25d28bbf2789da81df2
historySha256: 020f5f103a3028935c6ccc7e105b781ada73b06666cc4b0dedb666f06b7e1658
generatedBundleSha256: 20c70ebf3a25f073a18b209ce406212bc104ee87e528d7c093d76e1533c9344b
artifactSha256: 7d62e5c3c6cbe0c92792ae9dd36218893cc60b0c86ba69310a1a7ed9e71545d9
generatorVersion: 1.1.0
generatedAt: 2026-08-06T10:02:33.727Z
<!-- PRODUCT_AUTHORITY_METADATA_END -->
