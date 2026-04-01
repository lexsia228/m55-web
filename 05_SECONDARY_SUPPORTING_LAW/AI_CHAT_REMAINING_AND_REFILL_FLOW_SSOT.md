# M55 Web AI Chat Remaining Count and Refill Flow SSOT

Status: DRAFT FOR FREEZE
Mode: entitlement visibility / refill flow law
Scope: DTR-linked AI consult surfaces, future refill/top-up integration

---

## 1. Objective

Whenever M55 provides a limited number of AI consult uses, the product must:
- show remaining count clearly
- show exhaustion clearly
- provide a lawful refill path if refill is enabled
- keep the consult tied to the purchased artifact

---

## 2. Core law

Remaining AI consult count is not hidden state.
It is part of the product surface.

If the user has consult entitlement, M55 must show:
- current remaining count
- whether consult is currently available
- what happens when the count reaches zero

---

## 3. Visibility law

The remaining count must be visible in at least one of these places:
- DTR reading surface near the consult entry
- purchased report / My Page detail surface
- consult panel header

Preferred rule:
- show it in two places if space allows

Minimum copy examples:
- 「相談残り 1 回」
- 「相談残り 0 回」

---

## 4. Zero-state law

When remaining count becomes zero:
- consult input must become unavailable or clearly disabled
- zero-state copy must explain that included consult usage is exhausted
- a refill CTA may appear if refill is enabled
- support path remains reachable

Do not silently fail.
Do not hide the consult area without explanation.

---

## 5. Refill CTA law

If refill is enabled, the CTA must:
- be adjacent to the zero-state or consult area
- clearly say what is being added
- stay inside the DTR-linked context

Allowed CTA concepts:
- 追加相談
- 相談回数を追加
- 追加相談を購入

Disallowed CTA concepts:
- vague upgrade wording
- unrelated subscription bait
- hidden refill inside distant settings

---

## 6. Flow law

### With remaining count > 0
User can:
- read report
- open consult
- send focused questions
- see remaining count decrement after use according to the product rule

### With remaining count = 0
User sees:
- exhausted state
- refill CTA if enabled
- support/help if needed

### After refill purchase
User sees:
- updated remaining count
- return path to the same purchased DTR context

---

## 7. Placement law

Recommended order inside a DTR-linked consult area:
1. report title / ownership context
2. remaining consult count
3. consult entry or zero-state
4. refill CTA if exhausted and enabled
5. support/help fallback

---

## 8. Business integrity law

Refill must be framed as:
- additional consult usage
- attached to the DTR context
- not a hidden subscription substitution

The first public product remains the DTR artifact itself.
Refill is secondary.

---

## 9. Similar-market absorption notes

Current consumer products often make the paid layer clearer when:
- the user sees what is free vs paid
- the user sees what is consumed vs still available
- the user sees what unlocks next

LINE占い repeatedly teaches users time-based consult value and reward/refill-like continuation behavior through ticket/time campaigns and explicit participation steps. citeturn622784search1turn622784search9turn622784search10
The Pattern distinguishes free access from deeper paid access with explicit feature boundaries. citeturn694856search0turn694856search3

M55 should absorb the clarity, not the noisy promotion.

---

## 10. Do-not-do list

- do not hide remaining count
- do not surprise the user with exhaustion
- do not place refill far away from the exhausted context
- do not present refill before explaining the included consult use
- do not confuse refill with subscription tier activation

---

## 11. Freeze summary

AI consult count must always be visible.
Exhaustion must be explicit.
Refill, if enabled, must be adjacent, clear, calm, and tied to the purchased DTR.
