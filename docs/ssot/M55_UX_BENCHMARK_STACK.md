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

Official reference:

`https://with.is/`

Role:

- Japanese relationship UX
- concise / natural Japanese
- psychological / value framing
- reassurance
- progressive user flow

### The Pattern

Official reference:

`https://www.thepattern.com/`

Role:

- introspective relationship language
- non-deterministic editorial tone
- self-understanding / relationship-understanding
- depth without prediction or judgment

### Paired

Official reference:

`https://www.paired.com/`

Role:

- Pair free → Premium architecture
- value-first monetization
- concrete actionable relationship value
- Premium distinction and revisit value

### Co–Star

Official reference:

`https://www.costarastrology.com/`

Role:

- personalized paid-reading merchandising
- premium editorial hierarchy
- packaging a one-time personalized reading

### Stripe

Official reference:

`https://stripe.com/`

Role:

- checkout / payment trust guardrail
- explicit price / payment semantics
- CTA / payment-provider clarity

### Baymard

Official reference:

`https://baymard.com/`

Role:

- checkout cognitive-load guardrail
- duplication / friction reduction
- order-summary clarity
- vertical-distance / task-effort discipline

### Canonical benchmark identity rule

These URLs identify the frozen external references.

They are **NOT** instructions to perform fresh competitor research every session.

The durable pattern/role definitions in this SSOT are the ordinary implementation reference.

Visiting/searching alternative competitor sites remains **prohibited** absent a valid reselection invalidator.

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

## Experience Archetype benchmark fallback mapping

Source owner:

`lib/m55/commercialUx/experience/experienceArchetypes.ts`

When a user-visible surface does not match an explicit route/surface row in **Fixed surface mapping** above, classify it by `M55_EXPERIENCE_ARCHETYPES` and use this fallback table.

| Archetype | Primary references | Guardrails |
|---|---|---|
| PUBLIC_POSTER | with + Co–Star | — |
| PUBLIC_EDITORIAL | The Pattern + with | M55 legal/support authority remains superior; Stripe/Baymard may guide clarity/friction only |
| GUIDED_FREE_FLOW | with | — |
| EDITORIAL_FREE_RESULT | The Pattern + with | — |
| SHARED_SOCIAL_ENTRY | The Pattern + with | — |
| PREMIUM_GUIDED_FLOW | with + Paired | — |
| PRODUCT_DECISION | Paired + Co–Star | Stripe + Baymard |
| PURCHASE_CONFIRMATION | Paired + Co–Star | Stripe + Baymard |
| DIGITAL_PUBLICATION | The Pattern + Paired | — |

### Benchmark classification precedence

1. explicit route/surface mapping in this SSOT (**Fixed surface mapping**)
2. archetype fallback mapping in this section
3. if still unmapped: **STOP / BENCHMARK CLASSIFICATION REQUIRED**

An unmapped new surface **must not** trigger ad-hoc competitor research.

A newly introduced `M55_EXPERIENCE_ARCHETYPES` entry must receive an explicit benchmark classification here before ordinary user-visible work may proceed.

### Known composite route/state bindings

Explicit surface mapping may apply to a **state or section inside a single route** and therefore overrides whole-route archetype fallback.

Source authorities:

- `components/compatibility/CompatibilityGuestExperience.tsx` — `JourneyPhase`: `'dob' | 'questions' | 'result'`
- `lib/m55/commercialUx/experience/experienceRouteRegistry.ts` — `legacy.synastry`, `legacy.synastry.confirm`, `legacy.synastry.success`, `legacy.synastry.report`

Freeze `/synastry`:

| Route / state | Surface mapping | Primary references | Guardrails |
|---|---|---|---|
| `/synastry` — `phase=dob` | Free input / questionnaire | with | — |
| `/synastry` — `phase=questions` | Free input / questionnaire | with | — |
| `/synastry` — `phase=result`, free reading body | Pair free result | The Pattern + Paired | — |
| `/synastry` — `phase=result`, embedded paid bridge | Premium bridge / purchase confirmation | Paired + Co–Star | Stripe + Baymard |
| `/synastry/purchase/confirm` | Premium bridge / purchase confirmation | Paired + Co–Star | Stripe + Baymard |
| `/synastry/purchase/success` | purchase/processing continuity (`PURCHASE_CONFIRMATION` fallback) | Paired + Co–Star | Stripe + Baymard where payment/trust semantics apply |
| `/synastry/report/:reportId` | Paid report / premium reading body | The Pattern + Paired | — |

A composite route **must not** be classified once at pathname level when its runtime states/sections correspond to different explicit surface mappings.

**State/section explicit mapping** has precedence over route-level `PRODUCT_DECISION` archetype fallback.

Classifying every `/synastry` runtime state as `PRODUCT_DECISION = Paired + Co–Star` is **prohibited**.

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
| Header navigation/state contract | `lib/m55/commercialUx/publicHeaderState.ts` |
| Shared footer owner | `app/_components/PublicFooter.tsx` |

`PublicHeader.tsx` renders navigation from the shared header-state contract in `publicHeaderState.ts`.

Agents **MUST** inspect `components/shell/PublicHeaderContainer.tsx`, `components/shell/PublicHeader.tsx`, and `lib/m55/commercialUx/publicHeaderState.ts` before inventing page-local or replacement navigation.

If a header capability already exists: modify/reuse the shared Header owner. Do not recreate it locally.

If a requested navigation destination belongs site-wide: modify the shared header contract/renderer as appropriate.

Do not add a page-local substitute because the existing header inventory was not discovered.

Freeze route/capability identity only; display labels remain copy/terminology authority.

### Header capability inventory

**Brand / home:**

- M55 brand lockup routes to `/home`

**Desktop primary (`DESKTOP_PRIMARY_NAV`):**

- `/core`
- `/dtr/lp`

**About dropdown (`ABOUT_DROPDOWN_NAV`):**

- `/how-m55-works`
- `/ten-views`

**Mobile public (`MOBILE_MENU_PUBLIC`):**

- `/home`
- `/core`
- `/dtr/lp`
- `/how-m55-works`
- `/ten-views`

**Signed-in account (`ACCOUNT_DROPDOWN_NAV`):**

- `/dtr`
- `/my`

**Contextual primary-action contract** (owner: `lib/m55/commercialUx/publicHeaderState.ts`):

| Destination class | Route |
|---|---|
| `free_entry` | `/core` |
| `view_premium` | `/dtr/lp` |
| `return_free_result` | `/core` |
| `recipient_free` | `/core` |

**Header auth capability:**

**Desktop (`data-testid="m55-desktop-auth"`):**

- signed-out: Clerk `SignInButton` inside `<SignedOut>`
- signed-in: `ACCOUNT_DROPDOWN_NAV` dropdown + Clerk `UserButton` inside `<SignedIn>`

**Mobile menu (`MOBILE_MENU_PUBLIC` + `styles.mobileMenuAuth`):**

- public navigation: `MOBILE_MENU_PUBLIC` routes (separate from auth)
- signed-out: Clerk `SignInButton` inside mobile `<SignedOut>`
- signed-in: `ACCOUNT_DROPDOWN_NAV` routes + Clerk `UserButton` inside mobile `<SignedIn>`

`PublicHeader.tsx` must consume/render: `state.desktopPrimaryNav`, `state.aboutDropdownNav`, `state.mobileMenuPublic`, desktop and mobile `ACCOUNT_DROPDOWN_NAV`, brand `/home` link, desktop/mobile `SignedOut`/`SignedIn` auth blocks, `SignInButton`, and `UserButton`.

### Footer capability inventory

For routes using `PublicShell`, the shared Header and Footer **already exist**.

Owner: `app/_components/PublicFooter.tsx`

`PublicFooter` owns **site-wide discovery / navigation only** for support and legal destinations. It does **not** own canonical page content.

**UTILITY (`UTILITY_GROUP`):**

- M55 method link
- route authority: `lib/m55/method/m55MethodAuthority.ts`
- `M55_METHOD_CANONICAL_ROUTE` = `/how-m55-works`
- rendered by `PublicFooter` `UTILITY_GROUP`

**SUPPORT / LEGAL (`SUPPORT_LEGAL_GROUP`) — site-wide navigation routes:**

- `/support`
- `/legal/refund`
- `/legal/terms`
- `/legal/privacy`
- `/legal/tokushoho`

**Canonical content owners (route → page owner):**

| Route | Content owner |
|---|---|
| `/support` | `app/support/page.tsx` |
| `/legal/refund` | `app/legal/refund/page.tsx` |
| `/legal/terms` | `app/legal/terms/page.tsx` |
| `/legal/privacy` | `app/legal/privacy/page.tsx` |
| `/legal/tokushoho` | `app/legal/tokushoho/page.tsx` |

**Navigation vs content rule:**

- If the request changes legal/support **content**: modify the canonical route content owner above.
- If the request changes site-wide **access / navigation**: modify `PublicFooter`.
- Do not copy canonical legal/support content into `PublicFooter`.
- Do not create a second page-local legal/support block merely because the shared footer or canonical page was not discovered.
- Route-specific proximity disclosure is allowed only when an explicit product/legal contract requires it and the reason is stated before mutation.

Footer owns/renders a site-wide copyright line (`©` + four-digit year + `M55`). The year is not frozen handoff authority.

Before adding support/legal/privacy/refund/Tokushoho/method/footer utility: inspect `PublicFooter`, `m55MethodAuthority.ts`, and the canonical content owners above first.

Existing utility or site-wide legal destinations must not be duplicated locally.

### Duplication prohibition

Before adding **any** page-local:

- header
- footer
- M55 method utility link
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
