# M55 Prototype Hub Visual Verification and Release Sequence — 2026-03-07

## Purpose
This file freezes the immediate post-implementation execution order for `/prototype/hub`.
It is an operational release-sequence document, not yet a permanent SSOT checkpoint.

## Constraint
`/prototype` is token-gated by the `x-m55-proto` header, so visual verification must be performed manually with authenticated/header-injected access.

## Step 1: Visual verification of `/prototype/hub`
Manual checklist:
- Bottom nav safe-area: confirm fixed bottom nav does not cover content
- Annual CTA: confirm it is visibly disabled and non-interactive
- Prime shelf: confirm curated/no-rank feel, with no visible rank numerals or ranking language
- AI chat / Tarot: confirm they are immediately discoverable as first-class surfaces

## Step 2: Freeze money core
- finalize webhook Task 1 in its own commit
- verify invoice.paid grant
- verify duplicate replay does not double-grant
- verify retryable failure remains retryable
- define payment-failure state machine
- do not immediately revoke on a single failed renewal

## Step 3: Merchant baseline
- enable Stripe successful payment receipts
- enable Stripe failed-payment customer emails
- confirm JP legal/disclosure/receipt paths
- do not build custom receipt UI yet

## Step 4: Guarded funnel observability
- use PostHog as primary hub funnel analytics
- track:
  - hub_view
  - view_retention_comparison
  - view_plan_summary
  - dtr_card_click
- do not use disabled annual CTA clicks as the primary signal
- do not contaminate AI chat with sales-noise logging

## Step 5: Tune after verification
- tune copy
- tune shelf order if needed
- tune disabled CTA language
- postpone domestic provider branching
- postpone BRAND_MODE / site cloning

## Operating note
This document should later be summarized into a short checkpoint in `docs/ssot/M55_SYSTEM_SSOT.md` only after visual verification and webhook freeze are complete.
