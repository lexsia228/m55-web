# M55 Refined Execution Roadmap — 2026-03-07

## Purpose
This file freezes the current execution order for the M55 web monetization phase.
It is an operational roadmap for team alignment and AI handoff.
It is not yet a permanent constitutional SSOT checkpoint.

## Phase 1A: Freeze money core
- finalize webhook diff
- apply migration
- verify invoice.paid grant
- verify duplicate replay does not double-grant
- verify retryable failure remains retryable
- define payment-failure state machine
- do not immediately revoke access on a single failed renewal

## Phase 1B: Merchant baseline
- enable Stripe automatic receipts
- enable failed-payment customer emails
- confirm JP disclosure / receipt / legal paths
- do not build a custom receipt system yet

## Phase 2: Build value-selling hub
- present text-only wireframe for `/prototype/hub`
- preserve AI chat, Tarot, ai_meter, Today, Weekly, Prime/DTR, and My as first-class surfaces
- annual plan remains display-only
- annual checkout / purchase CTA stays disabled or feature-flagged

## Phase 2.5: Add guarded funnel observability
- prefer PostHog as primary hub funnel analytics
- keep tracking minimal and privacy-safe
- do not contaminate AI chat with sales logging noise

## Phase 3: Tune and only then expand
- tune comparison copy
- tune shelf order
- tune disabled CTA language
- postpone domestic provider branching
- postpone BRAND_MODE / site cloning until the current revenue loop is stable

## Operating note
This roadmap should later be summarized into a short checkpoint in `docs/ssot/M55_SYSTEM_SSOT.md` immediately before the next implementation phase begins.

---
## Roadmap Update — 2026-03-28

### Binding Pass (Phase 1 Core Bindings): COMPLETE
Local build verified (exit 0, 28 routes compiled, no TypeScript errors).
Runtime behaviour on live traffic requires independent re-verification before production traffic increase.

Covered:
- /core, /today, /weekly, /my, /dtr/core ownership gate, concierge room
- Shell SiteFooter isolation via layout responsibility
- Home React replacement (v12 transplant, blur-free, chapter preview readable with no obscuring treatment)

### Phase 2 Candidate (not yet scoped or scheduled)

1. Live-traffic E2E re-verification
   - Ownership gate paths (locked / expired / owned) recommended for re-verification
     before production traffic increase
   - Highest priority: confirms current funnel is working before any new feature work

2. Entry Report purchase → room auto-open flow
   - Post-checkout user must currently navigate to /dtr/core manually
   - Requires: post-success redirect or session hint
   - Depends on E2E verification confirming the purchase → entitlement path is clean

3. Concierge room add-on SKU
   - Add-on CTA exists in room UI; no purchase flow implemented
   - Requires: Stripe SKU for consult add-on, webhook handler extension
   - Lower priority until base funnel is verified in live traffic

4. /core, /today, /weekly page-level UI hierarchy pass (optional, lowest priority)
   - Logic provisional freeze in place; no layout hierarchy optimization applied
   - Defer until items 1–3 are addressed

### Frozen (no-touch until further notice)
- Public storefront: /, /dtr/lp, /support, /legal/*
- Stripe review constraints remain constitutional base
- No new product lanes on Home
- No generic public AI chat surface
- No subscription-first public surface

### Current state after informational-page pass
Completed:
1. `/how-m55-works` implemented as public informational support page
2. `/ten-views` implemented and refined into **10の資質**
3. both pages are public and cross-linked quietly
4. primary nav remains unchanged
5. current public funnel remains unchanged

### What is frozen now
- current public line:
  - Free
  - ¥1,000 Entry Report
  - purchaser-only concierge room
- public primary tabs:
  - Home
  - 本質
  - レポート
  - My
- `/how-m55-works`
- `/ten-views`
- no new lane on Home
- no nav expansion
- no bottom-nav / old commerce surface revival

### Immediate next execution order
1. `/purchase/success` visual / reward verification
   - confirm post-purchase emotional clarity
   - confirm CTA hierarchy is correct
   - confirm user is pushed toward owned reading, not scattered utility actions

2. `/my` state-aware intake verification
   - confirm `no_profile / ready / editing` behavior
   - confirm saved users do not see crude always-on input
   - confirm ownership / library remains the visual priority

3. visual token normalization spec
   - fix which accent / heading / shell / CTA tokens are canonical
   - do not roll out yet
   - produce token table first

4. controlled rollout to page-level UI
   - `/core`
   - `/today`
   - `/weekly`
   in that order, only after token table is frozen

### What should not be rushed
- all-page visual unification in one pass
- primary nav expansion
- top / bottom tab redesign
- v0-led work on ownership gate, room, checkout, webhook, or entitlement logic
- public introduction of compatibility / subscription / future ladder

### Why this order is correct
- current conversion spine is already fixed around Entry Report
- supporting pages now improve understanding without fragmenting the funnel
- reward / intake UX still directly affect conversion and retention
- token normalization must precede broad visual rollout to avoid drift

### One-line roadmap sentence
The next M55 execution phase is: freeze support pages, verify purchase-success and My intake UX, then freeze a canonical visual token table before rolling design language into `/core`, `/today`, and `/weekly`.
