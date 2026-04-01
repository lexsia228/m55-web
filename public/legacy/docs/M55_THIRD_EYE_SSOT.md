> STATUS: **DEPRECATED / REFERENCE ONLY** (M55 Phase2)
>
> このドキュメントは「参照隔離（Legacy Archive）」として保持されています。
> **実装のSSOTとしては使用しないでください。**
>
> **Authoritative SSOT（唯一の正）**
> - `M55_SOUL_INJECTION_PARTS_SSOT_PACK_v1_0_2026-02-12.zip` 内 `21__M55_UI_COMPONENTS_SSOT_v1.md`
> - Runtime DOM reference: `public/legacy/index.html` の `.te-slot > .dots > .dot`
>
> 以降は履歴保持のため、当時の内容を原文のまま残しています。

# M55 Third Eye SSOT (Three Dots)
**Authority:** Ministry of UI (Subordinate to HQ SSOT)
**Status:** Frozen / Non-negotiable

## 1. Purpose
Third Eye (three dots) is a silent **visual memo** of observation depth. It must never be framed as achievement, unlock, world-sync, ranking, or score.

## 2. Hard Prohibitions
- **DOM additions / DOM moves forbidden.** Use existing DOM only.
- **No infinite loops** (no perpetual pulse, blink, shimmer, breathing). Only single, finite transitions are allowed.
- **No notification semantics** (no badges, red dots, bells, unread counts, "new" markers).
- **No numbers** (no % / points / scores in or near Third Eye).

## 3. DOM Mapping (Frozen)
- `MILESTONE_WRAP`: `section.card.card-shelf .dots`
- `DOT_EL_1..3`: `.dots > div.dot` (3 elements)
- Visual repositioning is CSS-only. Do **not** change DOM order or tap targets.

## 4. State Model
State is applied as a single class on the parent:
- `eye-s0-locked`
- `eye-s1-awake`
- `eye-s2-awake2`
- `eye-s3-fullopen`
- `eye-s4-dtr` (single-shot only)

Reset rule:
- After DTR emission, always reset to `eye-s0-locked` once, then wait for the next aggregation window.

## 5. Visual Tokens
- Hue is fixed to **Aqua Insight**. State difference is **depth/glow only** (no hue shifts).
- Use CSS variables (token indirection preferred):
  - `--eye-dormant`
  - `--eye-awake`
  - `--eye-glow-soft`
  - `--eye-glow-deep`

## 6. Safety
After CSS visual repositioning, the dots must be display-only:
- `pointer-events: none` on visual-moved `.dots`
- All actions must remain on existing GM tap elements.
