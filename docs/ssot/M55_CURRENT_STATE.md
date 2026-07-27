# M55 Current State

Status: **State registry (Tier E)**
Machine registry: `M55_COMMERCIAL_STATE_REGISTRY` in `lib/m55/contracts/m55CommercialFunnelContract.ts`
Worktree detail: **`docs/ssot/M55_WORKTREE_REGISTRY.md`** (authoritative for paths, branches, lifecycle)
Product Authority Pack: **`.product-authority/`** (durable authority + observations)

Last updated: 2026-07-27 (Self funnel Production baseline merge + Growth lane start REV1)

## ACTIVE LANE — Self funnel Growth / share (WT-011)

| Field | Value |
|---|---|
| Lane | **Self funnel Growth — share / OG / viral return / Premium conversion** |
| Status | **ACTIVE** |
| Worktree ID | **WT-011** |
| Worktree | `/Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1` |
| Branch | `feat/m55-self-funnel-growth-share-v1` |
| Base SHA | `696559009367a6ac445dc7a07876590b16cd8488` — PR #80 merge = `origin/main` |
| Implementation | **PENDING** — lane opened only; Growth scope not yet implemented |
| Classification of Production | **OPERATIONAL_BASELINE** — not final commercial launch |

## Completed Self funnel operational baseline (PR #80)

| Field | Value |
|---|---|
| PR | **#80 MERGED** |
| Merge method | GitHub merge commit |
| Merge SHA / origin/main | `696559009367a6ac445dc7a07876590b16cd8488` |
| Feature tip | `fda934d8f31da715d3a4fb35681c7b3dff3dd41d` |
| Production host | `https://m-55.jp` |
| Production diagnostics | `vercel_env=production` · `vercel_branch=main` · `vercel_git_sha=6965590…` |
| Production classification | **OPERATIONAL_BASELINE** |
| Prior worktree | WT-001 `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` — **COMPLETED** reference |
| Backup ref retained | `refs/backup/m55-self-funnel-pre-main-sync-rev1` |

Do **not** append Growth commits to the merged PR #80 feature branch.

## Canonical Production authority

| Field | Value |
|---|---|
| Canonical Production origin | `https://m-55.jp` |
| Canonical host | `m-55.jp` |
| Non-authoritative host | `m55.jp` |
| Diagnostics URL | `https://m-55.jp/api/diagnostics/build` |
| Production observed SHA | `696559009367a6ac445dc7a07876590b16cd8488` |
| Production confirmation | **GREEN** — operational baseline smoke (no live purchase) |

## Parked / frozen / completed lanes

| Lane | Status | Worktree ID | Worktree | Notes |
|---|---|---|---|---|
| Self free→Premium baseline | **COMPLETED** | **WT-001** | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` | PR #80 merged · OPERATIONAL_BASELINE |
| Product Authority Pack | **COMPLETED** | **WT-010** | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-pack-v1` | PR #79 merged |
| Paid LP / HOME microcopy | **PAUSED** | **WT-006** | `/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1` | reference-only |
| Build Week control plane | **FROZEN** | **WT-009** | `/Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1` | `DO_NOT_MODIFY` |

## NEXT SINGLE ACTION

Implement Growth scope on WT-011 / `feat/m55-self-funnel-growth-share-v1` as one cohesive PR:

1. Privacy-safe shareable result identity
2. One-tap social sharing + copy-link fallback
3. Dynamic OG / share preview
4. Viral return loop (public safe summary + CTA)
5. Result reveal polish
6. Premium conversion strengthen (no manipulation)
7. Privacy-safe funnel analytics

No live purchase. No DB / Auth / Provider / env mutation.

## Global commercial quality contract (permanent)

| Field | Value |
|---|---|
| Contract | `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` — **REV1 frozen** |
| User-visible closure | `USER_VISIBLE_CLOSED_GREEN` requires implementation GREEN + Product Truth GREEN + actual diff review GREEN + actual-screen evidence + Human commercial-quality approval |

## Active commercial sequence

1. Commercial Funnel SSOT — complete
2. 個人無料→個人Premium operational baseline — **MERGED** (PR #80 · OPERATIONAL_BASELINE)
3. Self funnel Growth / share — **ACTIVE** (WT-011 · implementation pending)
4. Final commercial launch / paid promotion — **NOT STARTED**
