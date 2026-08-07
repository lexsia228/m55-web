# M55 Commercial Quality Contract

Status: **Global governance contract (Tier B+ — frozen REV1)**
Scope: **All M55 development lanes — permanent**
Machine product truth remains: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Purpose

This document freezes the **top-level commercial quality contract** for all M55 work.
Human operators must not restate this priority at every gate; agents must treat it as mandatory authority.

## Primary business objective

**Commercialization and sustainable revenue** are the first business objective of M55 development.

- Internal governance, SSOT hygiene, registry discipline, and technical GREEN are **means**, not the final product.
- A lane is not complete when code passes tests alone.
- A user-visible surface is not closed until it meets **commercial-quality closure** defined below.

## User-visible closure standard

Technical GREEN alone is **insufficient** for any user-visible surface.

### USER_VISIBLE_CLOSED_GREEN

A user-visible surface may be marked **USER_VISIBLE_CLOSED_GREEN** only when **all** of the following are true:

| Requirement | Mandatory |
|---|---|
| Implementation validation GREEN | yes |
| Product Truth and safety GREEN | yes |
| Actual diff review GREEN | yes |
| Local or Preview actual-screen evidence | yes |
| 320 / 390 / desktop review where applicable | yes |
| Human commercial-quality approval | yes |
| No unresolved material comprehension or conversion defect | yes |

**Human visual lock is mandatory.**
Cursor or Codex self-report alone **cannot** satisfy Human commercial-quality approval.

Capturing 320 / 390 / desktop screenshots **without Human review** does **not** satisfy Human commercial-quality approval.
Screenshot capture completion is evidence preparation only; it is **not** closure.

Mobile and desktop **actual-screen evidence** is mandatory where the surface is responsive or breakpoint-sensitive.
Evidence becomes valid only **after a Human reviews** the captures for commercial quality.

### Human approval non-substitution

Human commercial-quality approval **cannot** be substituted by:

- Cursor implementation report
- Codex review report
- automated tests
- build / typecheck success
- generated screenshots without Human review
- screenshot capture completion
- visual-regression automation
- AI / model evaluation
- automated scoring

Clarifications:

- automated tests prove implementation properties only
- screenshots are evidence only after a Human reviews them
- neither automated tests nor generated screenshots satisfy Human visual / commercial approval
- `USER_VISIBLE_CLOSED_GREEN` remains **impossible** until explicit Human commercial-quality approval is recorded

## Commercial acceptance criteria

Every user-visible surface must be reviewed against:

- immediate understanding
- clear user value
- free / paid distinction
- purchase reason
- CTA clarity
- next-step continuity
- copy naturalness
- terminology consistency
- responsive visual quality
- accessibility
- privacy and trust
- no hidden or dead commercial path
- no misleading promise
- no unsupported precision claim

User comprehension, product value, conversion clarity, trust, terminology consistency, and responsive quality are **acceptance criteria**, not optional polish.

## Defect severity and closure rules

| Severity | Closure rule |
|---|---|
| P0 / P1 material | User-visible work **may not close** with unresolved material P0 or P1 defects |
| P2 | May close only with explicit Human acceptance or a recorded deferral in `M55_DECISION_LOG.md` |

## Claims, research, and competitor boundaries

- Competitor research may inform quality direction; **copying is prohibited**.
- Unsupported accuracy claims, unsupported science claims, and unsupported user-count claims are **prohibited**.
- Public copy must remain within Product Truth and `M55_COPY_AND_CLAIMS.md`.

## Pre-launch vs post-launch requirements

Pre-launch commercial quality and post-launch revenue validation are **separate requirements**.

| Phase | Requirement |
|---|---|
| Pre-launch | Commercial-quality closure for every user-visible surface before Production claim |
| Post-launch | Privacy-safe measurement and observed market data before commercial-success claim |

Commercial success **cannot** be claimed before observed market data.
Do **not** freeze invented conversion thresholds in this contract.
Thresholds require later Human approval after sufficient observed data.

## Post-launch validation (privacy-safe measurement)

Where applicable, funnel measurement must remain **privacy-safe** and may include:

- entry started
- input completed
- free result viewed
- Premium bridge viewed
- plan selected
- checkout started
- Premium Report opened

### Prohibited analytics payload

Privacy-safe funnel analytics must **never** contain the following.
Only explicitly allowlisted, non-sensitive funnel metadata may be sent.

**Forbidden — must not be sent:**

- raw date of birth
- birth year / month / day
- answer text
- answer IDs / facet IDs / internal answer selectors
- result text
- report text
- consultation text
- nickname
- email address
- user ID
- Clerk ID
- checkout / session identifiers
- arbitrary personal payloads
- arbitrary unreviewed properties

**Allowlisted categories (examples only — not a runtime schema):**

- event name
- version
- approved surface identifier
- approved product / plan identifier
- timestamp

This section defines the **global privacy boundary** only.
It does **not** redefine the runtime analytics schema.

## Machine-enforceable contract flags

Frozen equivalents for verifier and agent enforcement:

```
analytics_forbidden_payloads_include_answer_ids = true
analytics_forbidden_payloads_include_nickname = true
analytics_forbidden_payloads_include_email = true
analytics_forbidden_payloads_include_user_id = true
analytics_forbidden_payloads_include_arbitrary_personal_payload = true

automated_tests_replace_human_approval = false
generated_screenshots_replace_human_approval = false
human_visual_review_required_for_screenshot_evidence = true
```

## Agent obligations

Before user-visible implementation or review, agents must read this contract in the mandatory order defined in `AGENTS.md`.

Agents must not:

- close a user-visible gate on technical GREEN alone
- substitute agent self-report for Human visual approval
- substitute automated tests for Human commercial-quality approval
- substitute generated screenshots or screenshot capture completion for Human commercial-quality approval
- claim commercial success before observed market data
- invent or freeze conversion thresholds without Human approval

## Commercial quality control plane (machine enforcement)

Machine enforcement of this contract runs through a shared control plane. It **prepares** evidence; it never grants closure.

| Layer | Owner | Rule |
|---|---|---|
| Repository-independent engine | `lib/commercialQuality/**` | Must not import Product Truth, copy modules, route registries, selectors or Premium authorities |
| M55 adapter and registrations | `lib/m55/commercialUx/qualityControl/**` | Imports existing governed identities by stable reference; never restates their authority |
| Browser execution | `e2e/helpers/commercialQualityRunner.ts`, `e2e/commercial-quality-control-plane.spec.ts` | Reuses the clean-capture environment; read-only measurement, no sanitization before capture |
| Verification and CI | `scripts/verify-m55-commercial-quality-control-plane.mjs`, `.github/workflows/audit.yml` | Registration and negative fixtures are mandatory; browser gate is mandatory |

### Surface / state manifest

Schema version **1**. Every governed user-visible surface registers a project-qualified surface ID, a stable runtime-state ID, authority references, a deterministic setup identity, a viewport range with width step and breakpoint neighbourhoods, protected elements, critical CTA authority, fixed/sticky elements, section boundaries, state variants, content stress profiles, output behaviour, and source owner files.

Registration coverage is enforced for **51/51** ECP page entries, **12/12** Premium runtime states, **14/14** Premium capture cases and **7/7** commercial visual cases.

### Canonical baseline status

Exactly three values are legal:

| Status | Meaning |
|---|---|
| `none` | No canonical baseline exists |
| `candidate` | Machine-generated review material awaiting Human decision |
| `human-approved` | Promoted after independent review **and** Human commercial approval |

### Candidate approval pack

Generated output lives in `test-results/commercial-quality-approval-pack/`, is **untracked**, and is generated only after manifest, geometry, semantic and accessibility gates all PASS. It records the source commit, manifest digest and candidate file hashes, is explicitly labelled `candidate`, and is cleaned before each generation.

Generated packs **never** update canonical screenshots and **never** promote themselves. Consistent with the Human approval non-substitution rules above, no Human approval record is ever generated automatically.

### Baseline promotion requirements

Canonical promotion requires **all** of:

1. geometry GREEN
2. semantic machine review GREEN
3. accessibility GREEN
4. independent-review approval record
5. Human commercial approval record
6. exact source commit
7. exact manifest digest
8. exact candidate file hashes

Promotion is rejected on missing Human approval, stale source commit, changed manifest digest, altered candidate hash, implementation-generated self-approval, direct candidate-to-canonical assignment, or an unknown approval authority.

Geometry remains authoritative **before** pixel comparison.

## Relationship to lane contracts

Lane contracts (`M55_SELF_FUNNEL_CONTRACT.md`, `M55_PAIR_FUNNEL_CONTRACT.md`) define **target flow and product boundaries**.
This contract defines **how any user-visible work in any lane is accepted and closed**.

When lane contract and this global contract conflict on acceptance standards, **this contract governs closure quality**; lane contracts govern flow and product truth.

## Freeze record

| Field | Value |
|---|---|
| Contract ID | `M55_COMMERCIAL_QUALITY_CONTRACT` |
| Revision | REV1 + privacy / Human-lock micro-patch |
| Freeze date | 2026-07-25 |
| Gate | `CATEGORY-2-M55-GLOBAL-COMMERCIAL-QUALITY-CONTRACT-PRIVACY-AND-HUMAN-LOCK-MICRO-PATCH-REV1` |
| Status | **GREEN — ready for actual diff review REV2** |
