# M55 Web Checkout Trust Surface SSOT

Status: DRAFT FOR FREEZE
Mode: trust / conversion constitution
Scope: release-night MVP primary monetization lane

---

## 1. Objective

The DTR checkout surface must be modern, premium, and Stripe-review-safe.
It must reduce confusion, refund friction, and dispute risk without feeling defensive.

---

## 2. Primary lane

Release-night MVP primary monetization lane:
- `¥1,000 DTR`
- canonical public sell page: `/dtr/lp`

No other paid lane may visually compete with it on the page.

---

## 3. Mandatory visible trust elements

The following must be visible in the same reading zone as the primary CTA:
- price
- product summary
- delivery expectation
- Tokushoho link
- Terms link
- Refund link
- Support link

These must not be hidden behind a footer-only dependency.

---

## 4. Product clarity law

The page must clearly answer:
- what this is
- what the user receives
- when access appears
- where purchased access is found
- what to do if reflection is delayed

Forbidden:
- mystical vagueness in purchase explanation
- overclaim language
- urgency tricks
- hidden delivery conditions

---

## 5. CTA law

Primary CTA must be singular and visually clear.
No competing second primary CTA in the same section.

CTA zone should include:
- price
- button
- trust links
- short reassurance copy

---

## 6. Success continuity law

The success surface must explicitly state:
- purchase completed or processing
- check My Page for owned access
- if access is delayed, wait briefly and then use support
- support remains one click away

Success must never be a dead end.

---

## 7. Support law

Support page must contain, at minimum:
- payment issue
- missing access
- duplicate charge / statement recognition
- deletion / retention question
- contact path

Support must read like an operational help surface, not a vague contact page.

---

## 8. Legal tone law

Legal / support trust surfaces must be:
- calm
- direct
- low-jargon
- consistent in wording

Forbidden:
- threatening copy
- over-apologetic instability tone
- vague policy references without links

---

## 9. Stripe-safe clarity law

The paid surface must preserve alignment between:
- page title
- page description
- displayed price
- checkout target
- support path
- refund path

No mismatch between visible product meaning and checkout behavior.

---

## 10. Mobile / desktop law

On all sizes, the CTA and trust links must remain near each other.
Desktop may add whitespace but must not separate legal/support into a remote sidebar.

---

## 11. Implementation targets

Primary consumers:
- `app/dtr/lp/page.tsx`
- `components/PurchaseButton.tsx`
- `app/support/page.tsx`
- `app/purchase/success/page.tsx`
- legal pages

---

## 12. Audit checklist

Before launch, confirm:
- CTA visible
- price visible
- 4 trust links visible near CTA
- support page contains 5 required blocks
- success page links to My Page and support
- no dead-end after success

---

## 13. Freeze summary

Premium design is not enough.
The user must feel:
- I know what this is
- I know what happens next
- I know where to go if something fails
