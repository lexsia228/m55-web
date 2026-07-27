# M55 Roadmap

Status: **Sequence authority (Tier E)**  
Machine order: `M55_ROADMAP_ORDER` in `lib/m55/contracts/m55CommercialFunnelContract.ts`

**Fixed order — agents must not reorder arbitrarily.**

1. Commercial Funnel SSOT ← **complete**
2. 個人無料→個人Premium ← **complete** (PR #80 operational baseline merged; Growth Share continues on WT-011)
3. 二人向け無料→有料
4. HOME最終統合
5. HOME正式SSOT
6. ファネル計測
7. 全ページvisual統一

## Active commercial priority

第一目標は **商用化・収益化・ユーザー訴求**。内部整理を目的化しない。

Global acceptance standard: `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` (REV1 frozen).
User-visible surfaces require `USER_VISIBLE_CLOSED_GREEN`; technical GREEN alone is insufficient.
Human commercial-quality approval and actual-screen evidence are mandatory before closure.

## Current implementation lane (2026-07-27)

| Item | Status |
|---|---|
| **ACTIVE lane** | Self funnel Growth / share (WT-011) |
| Worktree / branch | `/Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1` · `feat/m55-self-funnel-growth-share-v1` |
| implementationReviewedTip | `d7af28a59755076b6269e93edfba03297eb98084` — reviewed Growth Share baseline; live HEAD validated as Git descendant |
| PR | **#81 unmerged** / branch-local |
| Production baseline | PR #80 merged @ `696559009367a6ac445dc7a07876590b16cd8488` — OPERATIONAL_BASELINE |
| **Current next phase** | sitewide commercial UX audit → unified Growth Share commercial UX implementation → Human review |
| Merge / deploy | **Not authorized** until Human commercial approval |
| Pair | **out of current lane** — roadmap step 3 later |
| Build Week / WT-009 | **freeze maintained** (PAUSED + FROZEN_BY_HUMAN_DECISION) |
| Stripe / DB / Clerk / env | **not authorized** in this lane |

## Repository authority closure (operational — does not reorder the sequence above)

**SUPERSEDED (2026-07-26):** The block below records pre–Authority Pack transition snapshots. Do not treat Self funnel or Authority Pack as the current implementation lane.

| Item | Status |
|---|---|
| Bootstrap / worktree registry authority | **complete** — PR #76 merged @ `38447ab1b39562606938936ce0da3d5a76d82c1b` (historical) |
| Post-merge authority transition docs | **complete** — PR #77 squash @ `d4e7b7c3426d901d1ba8460e136040bf209a64de` |
| Authority closure / readiness | **GREEN_IMPLEMENTATION_AUTHORIZED** — additional docs-only gate **not required** |
| Current Production / origin/main | `696559009367a6ac445dc7a07876590b16cd8488` — PR #80 Self funnel operational baseline |
| Active lane (historical snapshot) | 個人無料→個人Premiumファネル一括実装 |
| Active worktree / branch (historical snapshot) | WT-001 · `feat/m55-self-free-to-premium-funnel-v1` @ `fda934d…` |
| Self funnel runtime implementation | **merged operational baseline** — Growth continues on WT-011 |
| Current next gate (historical snapshot) | `CATEGORY-2-M55-SELF-FREE-TO-PREMIUM-FUNNEL-ACTUAL-DIFF-REVIEW-REV1` |
| After actual diff review | local profile visual QA → commit review → commit / push / PR / Production QA |
| Pair | **out of current lane** — roadmap step 3 later |
| Build Week / WT-009 | **freeze maintained** (PAUSED + FROZEN_BY_HUMAN_DECISION) |
| Stripe / DB / Clerk / env | **not authorized** in this lane |

Fixed 7-step sequence above remains unchanged. Step 2 operational baseline is **complete**. Growth Share (WT-011) is the unambiguous current implementation lane within step 2 commercial sequence continuation.

## P0 commercial defect override (superseded — historical)

**SUPERSEDED (2026-07-27):** Authority Pack authority-data correction and Self funnel PARKED state are complete. Growth Share (WT-011) is the current lane.

Human-approved **P0 override (2026-07-25):** Product Authority Pack bootstrap preceded Self funnel Human lock resumption.

| Item | Status |
|---|---|
| Product Authority Pack | **COMPLETED** — authority-data correction merged via PR #79 |
| Self funnel lane | **COMPLETED** — PR #80 operational baseline merged to Production |
| Build Week lane | **FROZEN** — do not modify |
| Authority Pack operational step | authority-data transition correction + final Human authority review — **complete** |
| Self funnel resume | **Complete** — Growth Share continues on WT-011 |

If a new P0 commercial defect is discovered:

1. Add reason to `M55_DECISION_LOG.md`
2. Explicitly change ACTIVE LANE in `M55_CURRENT_STATE.md`

Do not silently skip or reorder steps.

## Superseded

`docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — detailed task registry remains reference-only; **phase order** defers to this file for commercial funnel work.
