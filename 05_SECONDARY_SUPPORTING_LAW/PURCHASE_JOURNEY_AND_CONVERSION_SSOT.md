# M55 Web Purchase Journey & Conversion SSOT

Status: DRAFT FOR FREEZE
Mode: conversion / trust / journey law
Scope: release-night MVP, wave A, future refills and owned continuity

---

## 1. Objective

M55 must provide a clear, calm, non-confusing journey from first visit to first purchase.
The user must always know:
- what the product is
- what they get
- what happens after buying
- where their owned content will live
- how to get help if something goes wrong

---

## 2. Non-negotiable constraints

- First public primary monetization remains ¥1,000 DTR.
- The user must understand before being sold to.
- Legal / refund / support must stay one-click reachable near purchase.
- Success must explain ownership continuity.
- My Page remains the ownership center, not a commercial shelf.
- No dead-end after purchase.
- Do not bury help in footer-only dependency.

---

## 3. Mandatory journey stages

### Stage 1: Visit
The user learns what M55 is and what unlocks after input.

### Stage 2: Input
The user enters nickname, birthdate, privacy consent.

### Stage 3: Free understanding
The user can see CORE / TODAY / WEEKLY.

### Stage 4: Paid decision
The user reaches `/dtr/lp` and understands:
- what DTR is
- price
- what is included
- where help exists

### Stage 5: Checkout
The user completes purchase.

### Stage 6: Success / reflection waiting
The user understands what is happening and where the purchased content appears.

### Stage 7: Ownership center
The user can find the purchased item in My Page / purchased reports.

---

## 4. Product explanation law

The first paid lane must explain all of the following in plain language:
- what DTR is for
- what problem it solves beyond free views
- whether AI follow-up exists and how it is limited
- where purchased access appears
- what to do if reflection is delayed

---

## 5. AI follow-up law for the first release

The first release may frame AI follow-up as:
- DTR-linked focused consultation
- follow-up after reading the report
- limited and trackable usage

It must not be framed as:
- unlimited concierge from day one
- a separate generic public chat product
- vague “chat included somewhere” ambiguity

---

## 6. Mandatory visible purchase-adjacent elements

Near the CTA, the user must be able to reach:
- Tokushoho
- Terms
- Refund
- Support

The purchase page must also make ownership continuity understandable:
- where it appears after purchase
- how long reflection may take
- where to check first
- where to ask for help

---

## 7. Success law

The success page must answer:
- purchase completed?
- where do I see it?
- what if it is not there yet?
- how do I contact support?

Success must always link to:
- My Page / purchased reports
- Support

---

## 8. Refill / top-up law

If the paid flow later includes additional DTR-linked AI usage:
- remaining uses must be clearly visible
- 0 uses must not become a hidden failure state
- refill CTA must be calm, secondary, and clear
- refill must appear as a continuation of the purchased artifact, not a random upsell wall

---

## 9. My Page role law

My Page must act as:
- ownership center
- purchased reports center
- archive / reopen center where applicable
- contract / support / account center

It must not act as:
- promotional chaos shelf
- unrelated feature graveyard

---

## 10. Future-proofing law

Future monetization layers may extend the journey, but the base journey order must remain stable:
visit → understand → input → free understanding → DTR purchase → success → owned continuity

---

## 11. Implementation targets

Primary files likely affected:
- `app/page.tsx`
- `app/dtr/lp/page.tsx`
- `app/purchase/success/page.tsx`
- `app/support/page.tsx`
- `app/my/page.tsx`
- purchase/refill CTA components later

---

## 12. Freeze summary

The first purchase journey must feel understandable, calm, and complete.
If users can explain the path in one sentence — “I entered my info, saw my personal views, bought the deeper report, and can find it in My Page” — the journey is correct.
