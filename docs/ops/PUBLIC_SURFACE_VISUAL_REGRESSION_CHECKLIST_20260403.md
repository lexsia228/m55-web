# Public Surface Visual Regression Checklist

Goal: verify Home-canonical public shell consistency after shared primitive migration.

## Baseline pages

- `/home`
- `/ten-views`
- `/support`
- `/legal/tokushoho`
- `/legal/terms`
- `/legal/privacy`
- `/legal/refund`
- `/dtr/lp`

## Checkpoints at same breakpoint

- Top bar uses same structure and spacing as Home:
  - brand lockup
  - nav item baseline
  - auth area alignment
- Canvas background tone is identical to Home (`#f9f7f4`).
- Outer frame feel is consistent (same shell padding and width envelope).
- Footer/legal row has same visual balance and link rhythm.
- No duplicate local footer on page components.

## Screenshot comparison protocol

1. Open each baseline page at:
   - mobile width (390x844)
   - desktop width (1440x900)
2. Capture full-page screenshots.
3. Compare against prior baseline images for:
   - top bar vertical rhythm
   - section start spacing under header
   - footer row tone and density
   - canvas continuity (no white competing wrappers)
4. If any mismatch appears, fix shared primitives first:
   - `PublicShell`
   - `PublicHeader`
   - `PublicFooter`
   - `PublicTypography`
5. Only then adjust page-local internals if mismatch remains.
