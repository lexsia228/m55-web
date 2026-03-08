# M55 PostHog Minimum Funnel Spec — 2026-03-07

## Purpose
Define the minimum privacy-safe product analytics events for `/prototype/hub`.

## Scope
Applies only to the isolated hub monetization surface.
Do not instrument storefront/public pages in this phase.
Do not contaminate AI chat with sales logging noise.

## Events
- `hub_view`
  - fired when `/prototype/hub` is viewed
- `view_retention_comparison`
  - fired when retention comparison section becomes visible
- `view_plan_summary`
  - fired when plan summary section becomes visible
- `dtr_card_click`
  - fired when a DTR shelf card is clicked

## Event firing rules
- `hub_view` fires once per page load/view
- `view_retention_comparison` fires once when the section becomes meaningfully visible
- `view_plan_summary` fires once when the section becomes meaningfully visible
- visibility-based events must not fire repeatedly in the same page session

## Privacy guardrails
- do not send free-text content
- do not send AI chat content
- do not send email addresses
- do not send raw sensitive identifiers unless explicitly approved
- do not send URL/query-derived context as analytics payload

## Rules
- do not use disabled annual CTA clicks as the primary signal
- keep properties minimal and operationally useful

## Suggested properties (minimal)
- `tier`
- `has_monthly_dtr`
- `section`
- `card_type`
- `is_unlocked`
- `source_surface`

## Operating note
Implement only after visual verification and Stripe merchant baseline are complete.
