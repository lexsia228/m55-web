# M55 Team Checkpoint — 2026-03-07 Current Position

## Purpose
This file is the shared team snapshot of the current M55 web position.
It exists so all AI operators and human operators can restart from the same verified state without rereading chat history.

## Verified committed state
- Branch: `proto/hub-isolated-20260304`
- Latest confirmed UI/contract asset import commit: `79d049d`
- `79d049d` imported real Step5 contracts and real bottom-nav SVG assets:
  - `docs/audit/sources/ingest_2026-03-07/M55_BottomNav_OriginalGlyph_Icon_SSOT_v1_2026-01-26.html`
  - `docs/audit/sources/ingest_2026-03-07/M55_Home_Image_Policy_SSOT_v1_2026-01-26.html`
  - `docs/audit/sources/ingest_2026-03-07/M55_PrimeRanking_NoRankUI_SSOT_v1_2026-01-26.html`
  - `docs/audit/sources/ingest_2026-03-07/MANIFEST.md`
  - `public/assets/nav/ic_home.svg`
  - `public/assets/nav/ic_tarot.svg`
  - `public/assets/nav/ic_chat.svg`
  - `public/assets/nav/ic_prime.svg`
  - `public/assets/nav/ic_my.svg`

## Previously verified checkpoints still in force
- `245a145`: Task 2 guard and observability checkpoint added to `M55_SYSTEM_SSOT.md`
- `dea3a57`: Phase 1 foundation verified checkpoint added
- `521c1b4`: Automation operating system imported; latest preview was verified Ready at that stage
- `/prototype` local token-gated access was verified with `HTTP/1.1 200 OK`
- storefront/public routes remain frozen

## Canonical web UI/source-of-truth references
Primary prototype sources:
- `M55_HOME_ULTIMATE_FINAL_SSOT_MERGED.html` = hub/master structure source
- `m55_ai_meter_detail.html` = reusable component vocabulary source for other pages

Recovered contract sources now imported from Step5:
- Bottom nav identity contract
- Home image policy
- Prime no-rank contract
- Real 5-glyph SVG assets

## Required web identity invariants
- AI chat remains first-class
- Tarot remains first-class
- ai_meter / DTR connection flow remains first-class
- Today / Weekly / Prime / DTR / My remain part of the prototype information architecture
- Bottom nav must use the fixed 5-glyph SVG contract with opacity-only state changes
- No emoji bottom nav in implementation
- Home image policy remains image-in-card only, abstract-only, with at most two prominent image blocks per screen
- Prime shelf must not expose visible rank numerals or ranking language
- Monetization UI is additive only; it must not replace prototype identity

## Web SSOT set expected for current phase
These are the web-specific SSOT documents that should exist and be treated as canonical for the current UI phase:
- `docs/ssot/M55_WEB_UI_ARCHITECTURE_SSOT_v1_2026-03-07.md`
- `docs/ssot/M55_WEB_VISUAL_AND_COMPONENT_CONTRACT_SSOT_v1_2026-03-07.md`
- `docs/ssot/M55_WEB_PAGE_MAPPING_AND_REUSE_MATRIX_v1_2026-03-07.md`
- `docs/ssot/M55_WEB_BEHAVIORAL_AND_DATA_BINDING_CONTRACT_SSOT_v1_2026-03-07.md`

## Revenue / implementation position
- Public/storefront remains frozen
- Revenue UI must stay inside isolated prototype/hub lane
- Annual plan presentation is display-only
- Annual checkout / purchase CTA must remain disabled or feature-flagged until annual entitlement semantics are defined
- Webhook Task 1 (Premium monthly DTR grant) is an active implementation/review lane and must remain separate from docs-only/UI-asset commits unless already finalized in its own commit

## Immediate next approved sequence
1. Finalize/review webhook Task 1 diff in isolation
2. Present `/prototype/hub` text-only wireframe
3. After approval, implement Task 2 inside isolated hub only
4. Keep public/storefront unchanged

## Team operating rule
All future AI operators must use this file plus `docs/ssot/M55_SYSTEM_SSOT.md` as the current-position handoff before making further changes.
