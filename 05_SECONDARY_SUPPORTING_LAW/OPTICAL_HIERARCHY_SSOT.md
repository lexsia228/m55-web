# M55 Web Optical Hierarchy SSOT

Status: DRAFT FOR FREEZE
Mode: surface-depth law
Scope: public shell, premium content framing, trust-critical views

---

## 1. Objective

M55 Web must express information priority through depth, light, and surface layering.
This is not a license for heavy glassmorphism.
It is a law for quiet optical hierarchy.

The goal is to make users feel:
- what is primary
- what is supportive
- what is stable
- what is actionable

without visual noise.

---

## 2. Non-negotiable constraints

1. Content remains the primary visual layer.
2. Depth must improve readability, not reduce it.
3. Overuse of blur or transparency is forbidden.
4. Stripe-safe trust surfaces must remain highly legible.
5. No dark glossy hero treatment that overwhelms explanatory content.
6. One visual hierarchy system must apply across root, DTR, support, success, and legacy shell.

---

## 3. Optical hierarchy model

### Layer 0 — Background field
Quiet, low-contrast, stable, non-distracting.
No hard texture, no noisy gradients.

### Layer 1 — Surface cards
Primary cards for meaning, content, support, success, and paid explanation.
White or near-white surfaces with thin border and shallow shadow.

### Layer 2 — Controls and navigation
Tabs, bottom nav, chips, compact controls.
May use restrained translucency or soft glass cues if legibility remains strong.

### Layer 3 — Focus accents
Used sparingly for active state, CTA emphasis, and current context.
Never the dominant visual field.

---

## 4. Light law

Light should feel ambient, not theatrical.
Preferred effect:
- subtle edge highlights
- very soft elevation contrast
- minimal specular feel on compact controls only

Forbidden:
- intense spotlight gradients
- large neon glow
- dark luxury UI tropes
- over-blurred translucent panes

---

## 5. Blur / translucency law

`backdrop-filter` or blur-based depth may be used only on:
- compact nav shells
- chips
- small utility surfaces

It must not be the main body surface for reading-heavy content.
If blur reduces contrast or clarity, remove it.

---

## 6. Trust-critical surfaces

The following must favor clarity over optical flourish:
- DTR pricing block
- purchase CTA area
- Tokushoho / Terms / Refund / Support links
- support page sections
- purchase success page
- My Page ownership/proof sections

These views may use premium framing, but not legibility-risking effects.

---

## 7. Legacy iframe framing law

Legacy content must appear inside a parent-owned frame that communicates:
- containment
- ownership
- calm structure

That frame must use:
- stable border
- shallow shadow
- controlled radius
- adequate breathing room

The legacy content itself must not appear to spill directly onto the raw page background.

---

## 8. Typography and light relationship

Heavier type should carry meaning, not compensate for weak hierarchy.
Depth and typography must work together.
Do not solve hierarchy by simply making text bigger and bolder everywhere.

---

## 9. Acceptance criteria

Optical hierarchy is acceptable only if:
- the eye lands first on the intended primary content
- support and trust views feel premium but not flashy
- nav and content share the same visual climate
- the interface feels deeper without becoming more complex
- screenshots still look calm when motion is removed

---

## 10. Recommended implementation targets

- `app/globals.css`
- `components/shell/ShellLayout.module.css`
- `components/shell/ShellLayout.tsx`
- `app/page.tsx`
- `app/dtr/lp/page.tsx`
- `app/support/page.tsx`
- `app/purchase/success/page.tsx`

