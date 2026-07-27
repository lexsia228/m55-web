# M55 Roadmap

Status: **Sequence authority (Tier E)**  
Machine order: `M55_ROADMAP_ORDER` in `lib/m55/contracts/m55CommercialFunnelContract.ts`

**Fixed order — agents must not reorder arbitrarily.**

1. Commercial Funnel SSOT ← **complete**
2. 個人無料→個人Premium ← **PARKED** (preserved; not current operational lane)
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

## Repository authority closure (operational — does not reorder the sequence above)

**SUPERSEDED (2026-07-26):** The block below records pre–Authority Pack transition snapshots. Current authoritative operational lane is **Product Authority Pack authority-data correction** on PR #79 (WT-010). Do not treat Self funnel as the active implementation lane.

| Item | Status |
|---|---|
| Bootstrap / worktree registry authority | **complete** — PR #76 merged @ `38447ab1b39562606938936ce0da3d5a76d82c1b` (historical) |
| Post-merge authority transition docs | **complete** — PR #77 squash @ `d4e7b7c3426d901d1ba8460e136040bf209a64de` |
| Authority closure / readiness | **GREEN_IMPLEMENTATION_AUTHORIZED** — additional docs-only gate **not required** |
| Current Production / origin/main | `d4e7b7c3426d901d1ba8460e136040bf209a64de` (historical snapshot — verify live remote separately) |
| Active lane (historical snapshot) | 個人無料→個人Premiumファネル一括実装 |
| Active worktree / branch (historical snapshot) | WT-001 · `feat/m55-self-free-to-premium-funnel-v1` @ `d4e7b7c…` |
| Self funnel runtime implementation | **source implemented (uncommitted / expected dirty)** · awaiting actual diff review |
| Current next gate (historical snapshot) | `CATEGORY-2-M55-SELF-FREE-TO-PREMIUM-FUNNEL-ACTUAL-DIFF-REVIEW-REV1` |
| After actual diff review | local profile visual QA → commit review → commit / push / PR / Production QA |
| Pair | **out of current lane** — roadmap step 3 later |
| Build Week / WT-009 | **freeze maintained** (PAUSED + FROZEN_BY_HUMAN_DECISION) |
| Stripe / DB / Clerk / env | **not authorized** in this lane |

Fixed 7-step sequence above remains unchanged. Step 2 implementation is **PARKED** while Authority Pack completes.

## P0 commercial defect override (current authority marker)

Human-approved **P0 override (2026-07-25):** Product Authority Pack bootstrap precedes Self funnel Human lock resumption.

| Item | Status |
|---|---|
| Product Authority Pack | **ACTIVE** — authority-data correction on PR #79 @ `fae04444618e2ae36e6fd813ddfddeee975b66c4` (2026-07-26) |
| Self funnel lane | **PARKED** — dirty implementation preserved; no mutation during Authority Pack lane |
| Build Week lane | **FROZEN** — do not modify |
| Authority Pack operational step | authority-data transition correction + final Human authority review — **not** emitted into generated Product Authority artifacts |
| Self funnel resume | After Authority Pack merge + Human approval — **not** during current authority-data gate |

If a new P0 commercial defect is discovered:

1. Add reason to `M55_DECISION_LOG.md`
2. Explicitly change ACTIVE LANE in `M55_CURRENT_STATE.md`

Do not silently skip or reorder steps.

## Superseded

`docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — detailed task registry remains reference-only; **phase order** defers to this file for commercial funnel work.
