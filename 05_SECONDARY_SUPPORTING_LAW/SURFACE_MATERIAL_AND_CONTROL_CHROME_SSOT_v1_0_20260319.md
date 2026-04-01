# SURFACE_MATERIAL_AND_CONTROL_CHROME_SSOT_v1_0_20260319

Status: ACTIVE LAW CANDIDATE
Scope: material hierarchy, card depth, control chrome, utility control meaning
Placement recommendation: 02_RELEASE_PATCH
Priority: active law for shell modernization without broad redesign

## 1. Purpose
This law fixes the “thin white card + blue link + weak utility square” problem.
It defines calm premium material hierarchy without changing route, pricing, or scope.

## 2. Core principle
M55 must look like one product shell, not a collection of white boxes and raw links.
Hierarchy must come from material, grouping, spacing, and control meaning — not from loud color, rank, or motion.

## 3. Surface hierarchy
All visible surfaces belong to exactly one of these layers:

1. hero surface
2. primary content surface
3. supporting shelf surface
4. utility strip / trust strip

No page should flatten all surfaces into identical white cards.

## 4. Hero surface law
Hero surfaces may carry:
- the strongest material depth
- a larger radius
- the quietest emphasis
- the page’s main summary / invitation

Hero must not become flashy or game-like.

## 5. Primary content surface law
Primary content surfaces are for the user’s main reading task.
They must:
- be clearly readable
- feel stable
- have stronger grouping than supporting cards
- avoid “blue link list” presentation

## 6. Supporting shelf law
Supporting shelves are for:
- secondary summaries
- paid shelf previews
- recommendation cards
- revisit cues

They should be visibly subordinate to hero/primary, but still belong to the same material family.

## 7. Utility strip law
Utility strips are for:
- support
- legal/trust helpers
- notice
- transactional recovery hints

They should be visually lighter than primary content, but still integrated.

## 8. Card depth law
Card depth must be expressed through:
- radius
- background density
- border strength
- shadow softness
- spacing groupings

Not through:
- loud gradients
- badges everywhere
- ranking cues
- animated attention traps

## 9. Link and button law
Links must not carry the burden of primary hierarchy.
Use buttons/chips/rows/cards intentionally.

### Buttons
Use for:
- main CTA
- primary transaction
- next-step action

### Text links
Use for:
- legal pages
- secondary help
- lightweight references

### Card rows / grouped actions
Use for:
- ownership actions
- revisit actions
- support destinations
- purchased-content destinations

“Blue text link only” is not enough for primary product UX.

## 10. Utility square law
A top-right utility square may exist only if it has a defined meaning.

Allowed meanings:
- notice
- settings
- support shortcut

Not allowed:
- empty placeholder
- decorative square with no stable task
- ambiguous icon with no page-level meaning

If meaning is undefined, remove it.

## 11. Calm premium law
Maintain:
- no-rank
- no badge storm
- no looped attention harvesting
- no overly game-like polish
- no cheap bright accent abuse

This law is consistent with:
- bottom-nav opacity discipline
- no-rank shelf law
- home image restraint
- quiet premium / trust-first positioning

## 12. Home restructuring law
Home/app surfaces must be reorganized into:
- primary card
- paid shelf
- trust strip
instead of a flat stack of same-weight cards.

This is not a broad redesign.
It is a hierarchy correction.

## 13. DTR shelf law
Paid shelf may feel premium, but must not become a rank board.
Recommendation order may exist internally, but UI must not expose ranking concepts.

## 14. Image law alignment
Respect the existing image restraint:
- image accents should stay limited
- background takeover is prohibited
- do not add large noisy hero illustrations without law-level need

## 15. Alignment with existing active law
This law is consistent with:
- quiet launch
- free CORE → DTR funnel
- public-safe translation
- no parked public revival
- release-night MVP continuity

## 16. Minimal implementation guidance
Minimal first pass should only touch:
- app/globals.css
- components/shell/ShellLayout.module.css
- app/page.tsx
- app/dtr/lp/page.tsx
- components/shell/ShellLayout.tsx

## 17. Acceptance rule
If the product no longer feels like:
- plain white cards
- blue-link dominance
- ambiguous utility chrome
and instead feels like one calm, layered product shell, this law is working.
