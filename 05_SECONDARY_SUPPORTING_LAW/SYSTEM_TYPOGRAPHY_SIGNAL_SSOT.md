# M55 Web System Typography Signal SSOT

Status: DRAFT FOR FREEZE
Mode: typography law
Scope: public shell, trust surfaces, future global expansion

---

## 1. Objective

M55 Web must use typography to direct attention quickly and quietly.
This is not a brand-font law.
This is a signal law.

The system must work across devices, locales, and operating systems.

---

## 2. Font family law

Use system-native or broadly safe stacks first.
Do not depend on a single proprietary platform font being present everywhere.

Preferred strategy:
- system-ui first
- platform-native feel where available
- predictable rendering across desktop and mobile

---

## 3. Typography hierarchy law

The interface should rely on four functional levels:
- page title
- section title
- body
- meta/supportive text

No uncontrolled intermediate levels.

---

## 4. Weight signal law

Weight changes must communicate hierarchy, not decoration.

Allowed:
- strong weight for the single page title
- medium/semibold for section titles
- regular for body
- lighter or lower-contrast treatment for meta

Forbidden:
- making every heading bold-heavy
- fake premium achieved through constant ultra-bold text
- tiny, low-contrast labels where trust clarity is required

---

## 5. Tracking / spacing law

Micro-adjustments may improve premium feel, but must remain restrained.
No obvious display-font tricks.
No dramatic letter-spacing on body text.

---

## 6. Numerals / prices / counts

Prices, remaining consult counts, and ownership numbers must be:
- highly legible
- visually stable
- easy to scan

Do not stylize them so much that trust is weakened.

---

## 7. Acceptance criteria

Typography passes only if:
- the user knows where to look first
- trust surfaces remain legible
- Japanese and English both render cleanly
- premium feel comes from restraint, not display theatrics

---

## 8. Recommended targets

- `app/globals.css`
- `app/page.tsx`
- `app/dtr/lp/page.tsx`
- `app/support/page.tsx`
- `app/purchase/success/page.tsx`
- `app/my/page.tsx`

