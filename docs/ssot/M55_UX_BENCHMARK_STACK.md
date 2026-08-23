# M55 UX Benchmark Stack

Status: **HUMAN-APPROVED FIXED REFERENCE STACK v1**

Scope: **all M55 user-visible commercial surfaces**

## Primary UX optimization lens

Japanese women.

This is a **UX optimization lens**, not an eligibility or exclusion rule.

## Authority rule

Benchmark references **NEVER** override:

1. Product Authority / machine product truth
2. M55 commercial quality contract (`docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md`)
3. Active funnel contract (`M55_SELF_FUNNEL_CONTRACT.md` or `M55_PAIR_FUNNEL_CONTRACT.md`)
4. M55 Copy and Claims (`docs/ssot/M55_COPY_AND_CLAIMS.md`)
5. M55 Visual System (`docs/ssot/M55_VISUAL_SYSTEM.md`)
6. Privacy / accessibility / legal requirements

Literal competitor copying is **prohibited**.

Allowed assimilation:

- information architecture
- hierarchy
- spacing / density
- CTA placement
- value presentation
- interaction pattern
- editorial rhythm
- trust placement

All resulting copy and design must be **newly expressed as M55**.

## Fixed benchmark stack

### with

Role:

- Japanese relationship UX
- concise / natural Japanese
- psychological / value framing
- reassurance
- progressive user flow

### The Pattern

Role:

- introspective relationship language
- non-deterministic editorial tone
- self-understanding / relationship-understanding
- depth without prediction or judgment

### Paired

Role:

- Pair free → Premium architecture
- value-first monetization
- concrete actionable relationship value
- Premium distinction and revisit value

### Co–Star

Role:

- personalized paid-reading merchandising
- premium editorial hierarchy
- packaging a one-time personalized reading

### Stripe

Role:

- checkout / payment trust guardrail
- explicit price / payment semantics
- CTA / payment-provider clarity

### Baymard

Role:

- checkout cognitive-load guardrail
- duplication / friction reduction
- order-summary clarity
- vertical-distance / task-effort discipline

## Fixed surface mapping

Do **not** reselect benchmarks every gate.

| Surface | Primary references | Guardrails |
|---|---|---|
| HOME | with + Co–Star | — |
| Free input / questionnaire | with | — |
| Free result | The Pattern + with | — |
| Pair free result | The Pattern + Paired | — |
| Premium bridge / purchase confirmation | Paired + Co–Star | Stripe + Baymard |
| Paid report / premium reading body | The Pattern + Paired | — |
| My Page / owned report / revisit | Paired + with | — |

### Normal workflow

1. identify surface
2. use frozen mapping above
3. inspect M55 product / copy / visual authority
4. assimilate reference patterns
5. implement M55-native result
6. affected validation
7. Human visual approval

### Prohibited workflow

- new gate → web-search new competitors → redesign reference system → repeat

## Research / reselection freeze

Ad-hoc competitor research is **prohibited** during ordinary user-visible work.

The stack may be reconsidered only if at least one **invalidator** exists:

- Human changes primary UX target
- reference service ends or materially changes
- M55 product architecture materially changes
- observed Production data materially rejects the current pattern
- legal / accessibility / privacy conflict
- Human explicitly authorizes benchmark reselection

**Not invalidators:**

- "A new AI found another attractive site"
- "A new chat started"

## Shared public chrome inventory

Freeze exact shared owners:

| Role | Owner path |
|---|---|
| Public shell owner | `app/_components/PublicShell.tsx` |
| Shared header state owner | `components/shell/PublicHeaderContainer.tsx` |
| Shared header renderer | `components/shell/PublicHeader.tsx` |
| Shared footer owner | `app/_components/PublicFooter.tsx` |

For routes using `PublicShell`, the shared Header and Footer **already exist**.

`PublicFooter` currently owns site-wide support / legal destinations including:

- Support (`/support`)
- Refund (`/legal/refund`)
- Terms (`/legal/terms`)
- Privacy Policy (`/legal/privacy`)
- Specified Commercial Transactions Act disclosure (`/legal/tokushoho`)

### Duplication prohibition

Before adding **any** page-local:

- header
- footer
- support link block
- refund link block
- terms link block
- privacy link block
- Tokushoho / legal link block

the agent **must** inspect the shared owners above.

If a site-wide destination already exists: **do not duplicate it locally**.

If the requested improvement is site-wide: modify the shared owner instead of making another page-local copy.

A page-local legal / support element is allowed only when:

- a product / legal contract explicitly requires proximity at that step, **and**
- the shared footer is insufficient,

and the reason must be stated before mutation.

Otherwise: **STOP / ROUTE CHANGE TO SHARED OWNER**.

Duplicating existing site chrome because the agent failed to discover it is an **authority-discovery failure**, not acceptable polish.

## Contract reference

| Field | Value |
|---|---|
| Document ID | `M55_UX_BENCHMARK_STACK` |
| Revision | v1 |
| Freeze date | 2026-08-23 |
| Status | HUMAN-APPROVED FIXED REFERENCE STACK v1 |
