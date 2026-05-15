# M55 Web Responsive Layout SSOT

Status: DRAFT FOR FREEZE
Mode: layout constitution
Scope: release-night MVP, post-release visual polish, desktop-to-mobile consistency

---

## 1. Objective

M55 Web must feel premium, quiet, and globally usable on:
- small mobile screens
- large phones
- tablets
- laptops
- wide desktop monitors

Responsive behavior must not change product meaning.
Only density, spacing, and composition may change.

The same IA must remain true on every screen size.

---

## 2. Non-negotiable layout law

1. Mobile-first.
2. Single primary content column.
3. No second business meaning on desktop.
4. No separate desktop IA.
5. No horizontally-dependent essential flow.
6. No prototype-style narrow fixed canvas.
7. Desktop gains breathing room, not extra complexity.
8. Release-night nav remains one primary system only.

---

## 3. Breakpoints

Use these layout ranges:

- compact: `< 640px`
- medium: `640px – 1023px`
- expanded: `1024px+`

Do not introduce different product flows by breakpoint.

---

## 4. Page width law

### compact
- max width: `100%`
- horizontal padding: `16px`
- section gap: `16px`
- card gap: `12px`

### medium
- max width: `760px`
- horizontal padding: `20px`
- section gap: `20px`
- card gap: `14px`

### expanded
- max width: `960px`
- horizontal padding: `28px`
- section gap: `24px`
- card gap: `16px`

### forbidden
- `> 960px` single content canvas for release-night MVP
- edge-to-edge wide desktop text blocks
- phone-sized app frame floating in vast empty desktop space

---

## 5. Header behavior

Header must stay visually light.

### compact
- left: M55 mark or page identity
- right: minimal support action only if needed
- no duplicate nav row

### medium / expanded
- same structure
- do not add desktop-only nav bars
- do not split primary actions across top and bottom nav

---

## 6. Bottom nav behavior

Primary nav remains:
- 本質
- 今日
- 週間
- DTR
- マイページ

### compact
- sticky bottom nav visible

### medium
- sticky bottom nav visible

### expanded
- bottom nav may remain visible for consistency during MVP
- if later adapted, any desktop variation must preserve exact same five destinations and order

Forbidden:
- second nav strip
- old prototype tabs
- tarot / ai-chat / compatibility / calendar public nav return

---

## 7. Shelf composition law

All content shelves follow one composition family.

Shelf order for release-night surfaces:
1. intro / page identity
2. free shelf
3. DTR paid shelf
4. support / notice / trust shelf

Desktop may increase whitespace between shelves.
Desktop must not create extra business shelves.

---

## 8. Card grid law

### compact
- one column only

### medium
- one column by default
- two columns allowed only for secondary informational cards

### expanded
- one content column remains primary
- two-column secondary informational rows allowed only when both cards are non-essential and equal priority

Forbidden:
- essential flow split across left/right columns
- product CTA isolated in separate sidebar during MVP

---

## 9. Typography fit law

Line length must remain readable.

- ideal reading width: ~45–75 characters per line for Japanese/Latin mixed body text
- long paragraphs must not span full desktop width
- headings must not wrap awkwardly due to narrow prototype container on desktop

---

## 10. Interaction sizing law

- minimum touch target: `44px`
- bottom nav item height: `>= 56px`
- primary CTA height: `>= 48px`
- list row tap area: `>= 44px`

---

## 11. Loading / empty / error fit law

Loading, empty, and error states must align with the same page width and padding as normal states.
Do not center tiny placeholders in a huge empty desktop void.

---

## 12. DTR / checkout layout law

On all screen sizes:
- price, explanation, CTA, and legal/support trust links must remain in the same visible reading zone
- no hidden trust links below a long fold after CTA
- no side-column trust surface for desktop-only users

---

## 13. Implementation targets

Primary consumers of this law:
- `app/globals.css`
- `components/shell/ShellLayout.module.css`
- `components/shell/ShellLayout.tsx`
- `app/page.tsx`
- `app/dtr/lp/page.tsx`

Secondary consumers:
- `app/support/page.tsx`
- `app/purchase/success/page.tsx`
- legal pages

---

## 14. Do-not-do list

- do not restore old app frame composition
- do not create desktop-only hero theater
- do not add left sidebar for MVP
- do not use two stacked nav systems
- do not compress desktop to a phone mockup width
- do not create breakpoint-specific pricing meaning

---

## 15. Freeze summary

Responsive means:
- same meaning
- better spacing
- better rhythm
- better fit

Responsive does **not** mean:
- new IA
- new monetization logic
- desktop-only experience
