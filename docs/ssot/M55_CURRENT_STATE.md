# M55 Current State

Status: **State registry (Tier E)**
Machine registry: `M55_COMMERCIAL_STATE_REGISTRY` in `lib/m55/contracts/m55CommercialFunnelContract.ts`
Worktree detail: **`docs/ssot/M55_WORKTREE_REGISTRY.md`** (authoritative for paths, branches, lifecycle)

Last updated: 2026-07-22 (CATEGORY-2 registry/current-state bootstrap REV2)

## Production main authority

| Field | Value |
|---|---|
| Remote | `origin/main` |
| Live main baseline | `575791f2ab80d57c89317e07da4b8020cfba3485` |
| Production observed baseline | `575791f2ab80d57c89317e07da4b8020cfba3485` |
| Pre-merge SHA (historical) | `37163a0d473c25365f3bddad579d4844fd8300df` |
| PR #74 — Commercial Funnel SSOT | **merged / completed** |

## Temporary operational interrupt (current gate)

| Field | Value |
|---|---|
| Gate | `CATEGORY-2-M55-WORKTREE-REGISTRY-AND-CURRENT-STATE-BOOTSTRAP-PATCH-REV2` |
| Purpose | worktree registry drift resolution · WT-001 post-merge transition record · WT-009 frozen worktree registration · Control Plane re-audit preparation before product source work |
| Scope | registry + current-state docs only — **no product source implementation** |

## Completed GREEN

| Item | Status |
|---|---|
| M55 Commercial Funnel SSOT | **GREEN** — PR #74 merged @ `575791f2…` |
| HOME_COMMERCIAL_FOUNDATION | CLOSED_GREEN |

## Post-merge authoritative state

Roadmap order is **unchanged**. Product source implementation remains **UNAUTHORIZED** until Control Plane re-audit after bootstrap.

| Field | Value |
|---|---|
| **postMergeActiveLane** | 個人無料→個人Premiumファネルの一括実装 |
| **postMergeNextSingleAction** | Cursor docs patch complete → Cursor STOP → Codex independent diff review → Control Plane re-execution |
| **HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT** | NOT_YET |
| **Pair implementation** | Later lane — roadmap step 3（二人向け無料→有料） |
| **pairPremium** | NOT_LIVE — Stripe / Pair runtime へ先行しない |

### Prohibited ahead of Self funnel

- Stripe / webhook / checkout 変更
- Pair runtime 変更
- HOME final SSOT 化
- DO_NOT_USE worktree（cross-page-card-polish）での実装
- WT-009 Build Week worktree（operational freeze — PAUSED + FROZEN_BY_HUMAN_DECISION）への編集

## Active session (bootstrap snapshot)

| Field | Value |
|---|---|
| Active worktree | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` (WT-001 PRIMARY_MAIN_HOME) |
| Active branch | `chore/m55-worktree-registry-current-state-bootstrap-rev1` |
| Historical pre-merge branch | `docs/m55-commercial-funnel-ssot-v1` (PR #74 — merged) |
| HEAD | `575791f2ab80d57c89317e07da4b8020cfba3485` |
| Post-bootstrap transition | Human-approved checkout `main` on WT-001 + registry snapshot update |
| Working tree (current) | exact-two authorized docs modifications pending independent review |

## Roles (bootstrap gate only)

| Actor | Role |
|---|---|
| Human | branch, write, commit, push, merge final approval |
| Cursor | edit `M55_WORKTREE_REGISTRY.md` + `M55_CURRENT_STATE.md` in this gate only |
| Codex | read-only independent review after Cursor stops |
| Control Plane | guardrail re-audit after bootstrap |
| GPT-5.6 | gate design and Human judgment synthesis |

Full AI coordination SSOT restructure is **out of scope** for this patch.

## Worktree quick reference

| Path | Lifecycle | Notes |
|---|---|---|
| `M55_WORKTREE-home-final-ia-v1` | ACTIVE / PRIMARY_MAIN_HOME | WT-001 — bootstrap branch |
| `M55_WORKTREE-build-week-control-plane-v1` | PAUSED (operational freeze) | WT-009 — PR #75 evidence · FROZEN_BY_HUMAN_DECISION |
| `M55_CANONICAL-cross-page-card-polish` | DO_NOT_USE | WT-002 — no edit / reset / clean / stash |

Full inventory: `M55_WORKTREE_REGISTRY.md`

## Runtime vs target (summary — unchanged)

| Area | Current runtime | Target contract |
|---|---|---|
| Self free pre-result theme | 「今の関心」step あり | なし |
| Public legacy terms | 見取り図 / 保存版 残存 | Self funnel lane で解消 |
| Pair premium | NOT_LIVE | 二人向け無料→有料 lane（later） |
| Enforcement | PENDING_SELF_FUNNEL_IMPLEMENTATION | Self funnel implementation lane |

Bootstrap review sequence is authoritative in **postMergeNextSingleAction** above. Do not proceed to product source implementation until Control Plane re-audit passes.
