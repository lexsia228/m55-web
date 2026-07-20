# M55 Current State

Status: **State registry (Tier E)**
Machine registry: `M55_COMMERCIAL_STATE_REGISTRY` in `lib/m55/contracts/m55CommercialFunnelContract.ts`
Worktree detail: **`docs/ssot/M55_WORKTREE_REGISTRY.md`** (authoritative for paths, branches, lifecycle)

Last updated: 2026-07-21 (Build Week Control Plane authority closure)

## Temporary operational interrupt — OpenAI Build Week

`feat/m55-build-week-control-plane-v1` is a temporary, runtime-free operational lane for
the M55 Control Plane. It does **not** replace the active product lane, alter roadmap order,
or authorize Self Funnel, HOME, Pair, commerce, database, or deployment implementation.

## Production main authority

- Remote: `origin/main`
- Pre-merge SHA: `37163a0d473c25365f3bddad579d4844fd8300df`
- Post-merge: replace with squash merge SHA on `origin/main` (verify after merge)

## Completed GREEN

| Item | Status |
|---|---|
| M55 Commercial Funnel SSOT | **GREEN** — PR #74 (squash merge target) |
| HOME_COMMERCIAL_FOUNDATION | CLOSED_GREEN |

## Post-merge authoritative state (read after PR #74 merge)

| Field | Value |
|---|---|
| **postMergeActiveLane** | 個人無料→個人Premiumファネルの一括実装 |
| **postMergeNextSingleAction** | Human selection of Self Funnel visual direction, result length, and ten-asset presentation. No source implementation is authorized before that selection. |
| **HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT** | NOT_YET |
| **Pair implementation** | Later lane — roadmap step 3（二人向け無料→有料） |
| **pairPremium** | NOT_LIVE — Stripe / Pair runtime へ先行しない |

### Prohibited ahead of Self funnel

- Stripe / webhook / checkout 変更
- Pair runtime 変更
- HOME final SSOT 化
- DO_NOT_USE worktree（cross-page-card-polish）での実装

## Active session (pre-merge snapshot — PR #74 open)

| Field | Value |
|---|---|
| Active worktree | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` |
| Active branch | `docs/m55-commercial-funnel-ssot-v1` |
| HEAD (snapshot) | `86260d50fa132dfd083a0f092f0cfa0c3eaa2adb` |
| PR | #74 |

After merge: same worktree → checkout `main`, pull `origin/main` → becomes **PRIMARY_MAIN_HOME**.

## Worktree quick reference

| Path | Lifecycle | Notes |
|---|---|---|
| `M55_WORKTREE-home-final-ia-v1` | ACTIVE → PRIMARY_MAIN_HOME after merge | See registry WT-001 |
| `M55_CANONICAL-cross-page-card-polish` | DO_NOT_USE | No edit / reset / clean / stash |

Full inventory: `M55_WORKTREE_REGISTRY.md`

## Runtime vs target (summary)

| Area | Current runtime | Target contract |
|---|---|---|
| Self free pre-result theme | 「今の関心」step あり | なし |
| Public legacy terms | 見取り図 / 保存版 残存 | Self funnel lane で解消 |
| Pair premium | NOT_LIVE | 二人向け無料→有料 lane（later） |
| Enforcement | PENDING_SELF_FUNNEL_IMPLEMENTATION | Next Self funnel PR |

## PR #74 scope

- Docs / contract / verifier / worktree registry only
- **Zero runtime UI changes**
