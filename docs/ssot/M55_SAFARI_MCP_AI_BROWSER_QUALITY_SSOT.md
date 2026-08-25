# M55 Safari MCP AI-Browser Quality SSOT

Status: **HUMAN-AUTHORIZED NON-PRODUCT CONTROL-PLANE SIDECAR v1**
Scope: **Safari MCP actual-browser observation for M55 Commercial Quality Control Plane**
Lane: **M55-SAFARI-MCP-SSOT** — does **not** replace or advance the active Pair product execution gate

## Authority position

Safari MCP is the **canonical actual-browser observation adapter** for the existing M55 Commercial Quality Control Plane.

Safari MCP is **not**:

- Product Authority
- Design Authority
- a parallel QA constitution
- a benchmark-selection authority
- a substitute for Human final commercial approval

Subordinate authorities:

| Priority | Owner |
|---|---|
| A0 — Executable state | `docs/ssot/M55_EXECUTION_STATE.json` |
| B+ — Global commercial quality | `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` |
| B++ — UX benchmark stack | `docs/ssot/M55_UX_BENCHMARK_STACK.md` |
| Control plane engine | `lib/commercialQuality/**` |
| M55 adapter | `lib/m55/commercialUx/qualityControl/**` |
| Evidence registry protocol | `docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md` |
| High-cost evidence ledger | `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md` |
| Operational readiness (subordinate) | `docs/runbooks/M55_SAFARI_MCP_LOCAL_READINESS_RUNBOOK.md` |

This SSOT contracts Safari-specific observation policy only. Typed browser-evidence schema extension belongs to a later adapter implementation gate.

## Roles and independence

| Role | Responsibility |
|---|---|
| **Cursor** | implementation owner + self-checker |
| **Codex** | default independent Safari browser auditor |
| **GPT** | Control Tower / evidence adjudicator |
| **Human** | benchmark/product authority · final commercial approval · all provider/destructive GO |

**Fail-closed rule:** when `implementer == independent_auditor`, independent Safari audit GREEN is **impossible**.

Cursor may prepare evidence and run self-checks. Cursor may **not** self-certify `INDEPENDENT_SAFARI_SSOT_REVIEW_GREEN` or `ACTUAL-BROWSER GREEN`.

## Human lock

Current non-substitutable Human final commercial approval remains mandatory.

Routine Safari traversal and evidence capture should be performed by AI.

Human receives a **compact affected-delta approval pack** after AI review GREEN.

AI browser evidence, Codex review, and Cursor self-check **do not** satisfy Human commercial-quality approval by themselves.

## STP eligibility

Safari Technology Preview (STP) eligibility is **candidate-based**, not permanently pinned.

| Stage | Rule |
|---|---|
| Candidate | latest **published** STP release |
| Local readiness proof | installed version/build · Safari MCP availability · required tool inventory · neutral-page smoke · required permissions |
| Eligible | only after readiness proof → `LATEST_ELIGIBLE_STP` |

Policy:

- do **not** permanently pin a release number in durable authority
- exact eligible version/build is frozen **per audit run** in evidence identity
- a new STP version alone is **not** a CLOSED GREEN invalidator
- fallback or downgrade requires explicit exception authority

Operational steps are subordinate guidance in `docs/runbooks/M55_SAFARI_MCP_LOCAL_READINESS_RUNBOOK.md`.

## Evidence identity

Every durable Safari browser evidence record must bind:

- source commit
- runtime identity
- `surface_id`
- `state_id`
- benchmark revision
- environment
- route / origin
- viewport (actual width and height)
- STP version / build
- auditor identity
- timestamp

Evidence without complete identity binding is **invalid** for closure.

## Evidence facets

Possible facets:

- screenshot
- DOM / page content
- console
- network
- interaction trace

The case manifest decides **REQUIRED** facets.

Do **not** blindly persist all raw evidence.

### Privacy and redaction

**Never** persist durably:

- cookies
- tokens
- session secrets
- query secrets
- sensitive request bodies
- account / personal data
- provider credentials

| Class | Default |
|---|---|
| Raw candidate evidence | temporary / untracked |
| Durable evidence | redacted summary · hashes · browser identity · verdict · invalidators · approval reference |

Reuse existing Commercial Quality approval-pack machinery (`lib/commercialQuality/approvalPack.ts`) and Evidence Registry protocol. Do not create a parallel evidence universe.

## Safari MCP mutation safety

Tool availability ≠ permission.

Authority requires all of:

- tool permission
- URL / environment classification
- action class
- expected HTTP method

### Default prohibited actions

- real checkout
- purchase
- Stripe mutation
- Clerk mutation
- Supabase / DB write
- migration
- webhook replay
- account deletion
- credit / report consumption
- non-idempotent submit
- destructive dialog accept
- reference-site login / signup / purchase / message
- unapproved POST / PUT / PATCH / DELETE

**Production:** public read-only observation by default.

Unexpected mutating request → **STOP**.

## Viewports

Preserve existing Commercial Quality authority:

| Viewport | Use |
|---|---|
| **320** | core mobile narrow |
| **390** | core mobile standard |
| **desktop** | existing canonical desktop width from manifest / control plane |

Support breakpoint neighbourhood **B-1 / B / B+1** only when the case manifest requires it.

Record actual width and height in evidence identity.

Long reports may use manifest-defined scroll / section anchors.

## Benchmark mapping

Use only the Human-approved fixed stack in `docs/ssot/M55_UX_BENCHMARK_STACK.md`.

Safari observation does not authorize benchmark reselection.

Extract abstract patterns only:

- hierarchy
- progressive disclosure
- CTA prominence / proximity
- value framing
- commercial comprehension
- trust placement
- editorial rhythm
- readability
- responsive behavior
- revisit framing
- checkout clarity

Prohibited:

- literal copy reuse
- visual duplication
- proprietary copy reuse
- benchmark substitution

## Quality rubric

Dimensions (no single omnibus numeric score):

| Dimension | Use |
|---|---|
| **VISUAL** | layout, hierarchy, responsive integrity |
| **COMMERCIAL** | value, CTA, free/paid distinction, conversion clarity |
| **READABILITY** | Japanese editorial rhythm, comprehension |
| **RUNTIME** | load, interaction, state correctness |
| **ACCESSIBILITY** | observed a11y signals — **not** complete WCAG certification |

Verdicts: **PASS** / **YELLOW** / **RED**
Severity: **P0** / **P1** / **P2**

Unresolved P0 / P1 → cannot close.

Safari accessibility observation does **not** equal complete WCAG certification.

## CLOSED GREEN

CLOSED GREEN binds to affected source / dependency identity **and** browser evidence.

### Valid invalidators

- affected source change
- shared component change
- CSS / token change
- state contract change
- Product Truth change
- claims / copy change
- benchmark mapping change
- browser evidence logic change
- confirmed relevant WebKit regression / fix
- Human actual-screen defect
- relevant runtime / provider identity change
- canonical baseline change

### Not invalidators

- new chat
- new model
- new STP version alone
- missing old screenshot
- AI wants to rerun
- new competitor
- unrelated source change

No high-cost rerun without invalidator. Search `M55_HIGH_COST_EVIDENCE_LEDGER.md` first.

## Source / browser gate separation

| Gate | Meaning |
|---|---|
| **SOURCE REVIEW GREEN** | implementation / diff / static governance acceptable |
| **ACTUAL-BROWSER GREEN** | Safari MCP evidence acceptable for affected surface |

SOURCE REVIEW GREEN **does not equal** ACTUAL-BROWSER GREEN.

Safari browser evidence remains a separate affected-surface gate.

## Compact Human approval contract

After AI review GREEN on an affected delta, Human receives:

1. surface / state identity
2. source commit and invalidator summary
3. viewport set and STP version/build used
4. auditor identity (must not equal implementer)
5. rubric verdict summary (PASS/YELLOW/RED · P0/P1/P2)
6. redacted evidence references (hashes / summaries — not raw secrets)
7. explicit ask: approve / reject / request bounded fix

Human approval records commercial quality only. It does not advance `M55_EXECUTION_STATE.json` unless a separate authorized gate requires it.

## Relationship to existing control plane

| Mechanism | Safari MCP role |
|---|---|
| Surface / state manifest | supplies `surface_id` / `state_id` / viewport requirements |
| Approval pack | candidate evidence packaging — Human lock preserved |
| Evidence Registry protocol | durable evidence registration |
| High-Cost Evidence Ledger | rerun prohibition and invalidator search |
| Playwright commercial-quality gate | complementary; Safari MCP is actual WebKit observation |

Do not reopen high-cost validation closed in the ledger without a documented invalidator.

## Freeze record

| Field | Value |
|---|---|
| Document ID | `M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT` |
| Revision | v1 |
| Freeze date | 2026-08-25 |
| Gate | `M55-SAFARI-MCP-SSOT-DOCS-ONLY-IMPLEMENTATION` |
| Status | **IMPLEMENTED — docs/control-plane hooks only** |
