# M55 Current State

Status: **State registry (Tier E)**
Machine registry: `M55_COMMERCIAL_STATE_REGISTRY` in `lib/m55/contracts/m55CommercialFunnelContract.ts`
Worktree detail: **`docs/ssot/M55_WORKTREE_REGISTRY.md`** (authoritative for paths, branches, lifecycle)

Last updated: 2026-07-20 (Worktree registry completion — PR #74)

## Production main authority

- Remote: `origin/main`
- SHA: `37163a0d473c25365f3bddad579d4844fd8300df`

No registered worktree is currently checked out on local `main`.

## Active session

| Field | Value |
|---|---|
| Active worktree | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` |
| Active branch | `docs/m55-commercial-funnel-ssot-v1` |
| HEAD | `31fbb05c7c7f49d07cb57a4f7c9d983ef21ac880` |
| PR | #74 (OPEN) |

## Post-merge plan (PRIMARY_MAIN_HOME)

After PR #74 merges: in `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1`, checkout `main`, pull `origin/main`, and use as **PRIMARY_MAIN_HOME** baseline for the next lane (個人無料→個人Premium).

This worktree is **ACTIVE** today (feature branch) — not “on `main`” until after merge.

## Lane status

| Item | Status |
|---|---|
| HOME_COMMERCIAL_FOUNDATION | CLOSED_GREEN |
| HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT | NOT_YET |
| ACTIVE LANE | M55 Commercial Funnel SSOT構築 |
| NEXT AFTER SSOT MERGE | 個人無料→個人Premiumファネルの一括実装 |

## Worktree quick reference

| Path | Lifecycle | Notes |
|---|---|---|
| `M55_WORKTREE-home-final-ia-v1` | ACTIVE | Current session · PRIMARY_MAIN_HOME after merge |
| `M55_CANONICAL-cross-page-card-polish` | DO_NOT_USE | See registry — no edit/reset/clean/stash/delete |

Full inventory: `M55_WORKTREE_REGISTRY.md`

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
