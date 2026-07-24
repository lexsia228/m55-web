# M55 Roadmap

Status: **Sequence authority (Tier E)**  
Machine order: `M55_ROADMAP_ORDER` in `lib/m55/contracts/m55CommercialFunnelContract.ts`

**Fixed order — agents must not reorder arbitrarily.**

1. Commercial Funnel SSOT ← **current**
2. 個人無料→個人Premium
3. 二人向け無料→有料
4. HOME最終統合
5. HOME正式SSOT
6. ファネル計測
7. 全ページvisual統一

## Repository authority closure (operational — does not reorder the sequence above)

| Item | Status |
|---|---|
| Bootstrap / worktree registry authority | **complete** — PR #76 merged @ `38447ab1b39562606938936ce0da3d5a76d82c1b` |
| Current next sub-gate | documented post-merge transition → Control Plane post-merge verification/audit |
| Product implementation readiness | separate Human gate **after** Control Plane closure |
| Self funnel runtime implementation | **not started / not authorized** |

PR #76 merge alone does **not** authorize product source implementation. Fixed 7-step sequence above remains unchanged; Self funnel (step 2) is not active implementation.

## P0 commercial defect override

If a new P0 commercial defect is discovered:

1. Add reason to `M55_DECISION_LOG.md`
2. Explicitly change ACTIVE LANE in `M55_CURRENT_STATE.md`

Do not silently skip or reorder steps.

## Superseded

`docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — detailed task registry remains reference-only; **phase order** defers to this file for commercial funnel work.
