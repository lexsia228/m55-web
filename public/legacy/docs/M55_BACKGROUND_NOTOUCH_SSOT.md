# M55 Background NoTouch SSOT
**Authority:** Constitution Level-0
**Status:** Frozen / Non-negotiable

## Absolute Rule
- The global background is immutable. Do not change `html`/`body` background color, gradients, images, or full-screen overlays.

## Allowed
- **Card-internal** glass/film effects (inside components) that do not replace the global background.
- **SystemHalt overlay film** (temporary, full-screen, but must not rewrite background styles).

## Forbidden
- Any `body::before/body::after` full-screen decoration.
- Any global background images (photos, patterns, film grain across the whole screen).
- "Ambient" animations tied to background.

## CI Guard Expectations
- Prebuild guard must fail on:
  - service worker / push notification code
  - notification badge UI patterns
  - global background rewrite attempts
