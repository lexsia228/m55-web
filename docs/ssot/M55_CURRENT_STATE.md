# M55 Current State

Status: **State registry (Tier E)**  
Machine registry: `M55_COMMERCIAL_STATE_REGISTRY` in `lib/m55/contracts/m55CommercialFunnelContract.ts`

Last updated: 2026-07-20 (Commercial Funnel SSOT PR)

## Production main

- SHA: `37163a0d473c25365f3bddad579d4844fd8300df`
- Verified equal to `origin/main` at SSOT PR precheck

## Lane status

| Item | Status |
|---|---|
| HOME_COMMERCIAL_FOUNDATION | CLOSED_GREEN |
| HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT | NOT_YET |
| ACTIVE LANE | M55 Commercial Funnel SSOT構築 |
| NEXT AFTER SSOT MERGE | 個人無料→個人Premiumファネルの一括実装 |

## Worktree

| Path | Status |
|---|---|
| `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` | CURRENT SAFE |
| `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish` | STALE — DO NOT USE |

Stale reason: compatibility commerce core merged to main; branch older than main; QA artifacts and uncommitted `.gitignore` changes.

## Runtime vs target (summary)

| Area | Current | Target |
|---|---|---|
| Self free pre-result theme | 「今の関心」step あり | なし |
| Public legacy terms | 見取り図 / 保存版 残存 | Self funnel lane で解消 |
| Pair premium | NOT_LIVE | 二人向け無料→有料 lane |
| Enforcement | PENDING_SELF_FUNNEL_IMPLEMENTATION | Deferred runtime assertions in verifier |

## Branch (this PR)

- `docs/m55-commercial-funnel-ssot-v1`
- Docs / contract / verifier only — **zero runtime UI changes**
