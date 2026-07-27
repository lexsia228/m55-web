# M55 Current State

Status: **State registry (Tier E)**
Machine registry: `M55_COMMERCIAL_STATE_REGISTRY` in `lib/m55/contracts/m55CommercialFunnelContract.ts`
Worktree detail: **`docs/ssot/M55_WORKTREE_REGISTRY.md`** (authoritative for paths, branches, lifecycle)
Product Authority Pack: **`.product-authority/`** (durable authority + observations)

Last updated: 2026-07-27 (Self funnel Growth / share implementation — WT-011)

## ACTIVE LANE — Self funnel Growth / share (WT-011)

| Field | Value |
|---|---|
| Lane | **Self funnel Growth — share / OG / viral return / Premium conversion** |
| Status | **ACTIVE** |
| Worktree ID | **WT-011** |
| Worktree | `/Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1` |
| Branch | `feat/m55-self-funnel-growth-share-v1` |
| Base SHA | `696559009367a6ac445dc7a07876590b16cd8488` — PR #80 merge = current `origin/main` |
| Implementation | **IN PROGRESS** — privacy-safe share card, shared entry, OG, analytics, Premium sticky |
| Classification of Production | **OPERATIONAL_BASELINE** — not final commercial launch |

Growth is a continuation of the Self free→Premium commercial sequence after the PR #80 operational baseline. Do **not** append Growth commits to the merged PR #80 feature branch (WT-001).

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

## Product Authority Pack (completed — historical snapshot)

| Field | Value |
|---|---|
| Worktree ID | **WT-010** |
| Worktree | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-pack-v1` |
| Branch | `feat/m55-product-authority-pack-v1` |
| bootstrapStartHead | `e6afe67262ebcee3353a3a43713f7ecf8369f26f` — historical lane creation anchor; **not** current origin/main |
| History (2026-07-26) | sequences **0–2** present — `INITIALIZATION` · `AUTHORITY_PROCESS_INCIDENT` · `BOOTSTRAP_RECONCILIATION` |
| Bootstrap reconciliation | **Complete** — steady-state verifier active |
| CI steady-state enforcement | **Active and PASS** at reviewed PR tip |
| PR #79 (2026-07-26 snapshot) | transition recorded — tip later merged; snapshot is not machine authority |
| Reviewed tip SHA (2026-07-26 CI snapshot) | `fae04444618e2ae36e6fd813ddfddeee975b66c4` — feature tip only; not Production authority |
| Commit 1 (Push Protection rewrite) | `f9daeb1f38205ca6d6eebb8e90c0a19f4ad58704` |
| Commit 2 (bootstrap reconciliation) | `2761706505576a2baeacbdd40acd130a1f70e81b` |
| Commit 3 (registry fixture CI portability) | `fae04444618e2ae36e6fd813ddfddeee975b66c4` |

Authority Pack merge **does not** replace Growth Human visual lock. Branch-local Growth code is **not** merged runtime until merged to `origin/main`.

## Canonical Production authority

| Field | Value |
|---|---|
| Canonical Production origin | `https://m-55.jp` |
| Canonical host | `m-55.jp` |
| Non-authoritative host | `m55.jp` |
| Non-authoritative reason | Not current M55 Production authority |
| Diagnostics URL | `https://m-55.jp/api/diagnostics/build` |
| last observed origin/main (2026-07-26T13:23:20+00:00) | `b13fcd540e210c3ffb41fa2f56889df74b1b3915` — Product Authority observation snapshot; mutable Git observation |
| Current live remote main (2026-07-27) | `696559009367a6ac445dc7a07876590b16cd8488` — PR #80 merge |
| Production observed SHA | `696559009367a6ac445dc7a07876590b16cd8488` |
| Production confirmation | **GREEN** — OPERATIONAL_BASELINE smoke (no live purchase) |

## Parked / frozen / completed lanes

| Lane | Status | Worktree ID | Worktree | Notes |
|---|---|---|---|---|
| Self free→Premium baseline | **COMPLETED** | **WT-001** | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` | PR #80 merged · OPERATIONAL_BASELINE · do not append Growth |
| Product Authority Pack | **COMPLETED** | **WT-010** | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-pack-v1` | PR #79 merged |
| Paid LP / HOME microcopy | **PAUSED** | **WT-006** | `/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1` | reference-only |
| Build Week control plane | **FROZEN** | **WT-009** | `/Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1` | `DO_NOT_MODIFY` |

## State separation

Merged runtime authority is the **committed `origin/main` / Production runtime state**.
Branch-local uncommitted source is **not** merged runtime truth.
Normative target behavior may precede merged runtime.
When merged authority or runtime state changes, update observations via Product Authority Pack reconciliation — not conversation memory.

## Global commercial quality contract (permanent)

| Field | Value |
|---|---|
| Contract | `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` — **REV1 frozen** |
| User-visible closure | `USER_VISIBLE_CLOSED_GREEN` requires implementation GREEN + Product Truth GREEN + actual diff review GREEN + actual-screen evidence + Human commercial-quality approval |

## Active commercial sequence

1. Commercial Funnel SSOT — complete
2. 個人無料→個人Premium operational baseline — **MERGED** (PR #80 · OPERATIONAL_BASELINE)
3. Self funnel Growth / share — **ACTIVE** (WT-011)
4. 二人向け無料→有料 — later
5. HOME最終統合 — later
6. HOME正式SSOT — later

## NEXT SINGLE ACTION

Complete Growth implementation on WT-011 / `feat/m55-self-funnel-growth-share-v1` as one cohesive PR, then Human visual + real-platform share verification. No Production merge until approved. No live purchase. No DB / Auth / Provider / env mutation.

## Verification

```bash
npm run verify:product-authority:bootstrap
npm run verify:product-authority
npm run test:product-authority
npm run verify:m55-ssot
```

## Global commercial quality contract (permanent — verifier preserved)

| Field | Value |
|---|---|
| Contract | `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` — **REV1 frozen** |
| Merge status | **Not merged into `origin/main` yet** — Growth branch-local implementation |
| **selfInputExperienceStatus** | `INPUT_EXPERIENCE_COMMERCIAL_FINALIZATION_GREEN_READY_FOR_HUMAN_LOCK` — baseline on Production; Growth share loop pending Human review |
| **HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT** | NOT_YET |

## State separation (lifecycle-independent — verifier preserved)

```
merged_runtime_is_committed_authority = true
branch_local_state_is_not_merged_runtime = true
normative_target_may_precede_runtime = true
global_verifier_requires_unmerged_runtime = false
runtime_specific_validation_owned_by_lane = true
post_merge_state_transition_required = true
```

Merged runtime (`origin/main` @ `696559009367a6ac445dc7a07876590b16cd8488` as of 2026-07-27; Authority Pack observation also records `b13fcd540e210c3ffb41fa2f56889df74b1b3915` as of 2026-07-26T13:23:20+00:00) is committed authority.
Target contract may precede runtime.
Branch-local Self funnel Growth source is **not merged main runtime**.
Historical pre-merge SHA: `37163a0d473c25365f3bddad579d4844fd8300df` — retained for verifier/history.
documented post-merge transition remains recorded for WT-001 historical context.

## Active authoritative state (Self funnel commercial sequence)

| Field | Value |
|---|---|
| **postMergeActiveLane** | 個人無料→個人Premiumファネルの一括実装 |
| **postMergeNextSingleAction** | Cursor docs patch complete → Cursor STOP → Codex independent diff review → Control Plane re-execution |
| **pairPremium** | NOT_LIVE |
| **Pair implementation** | Later lane — roadmap step（二人向け無料→有料） |
| Historical branch | `docs/m55-commercial-funnel-ssot-v1` (PR #74 — merged; **not** current active branch) |
| Current Growth branch | `feat/m55-self-funnel-growth-share-v1` |

### Prohibited ahead of / during Growth lane

- Stripe / webhook / checkout backend 変更
- Pair runtime 変更
- WT-009 Build Week worktree edits
- Live purchase / Production mutation
- Appending to WT-001 merged PR #80 feature branch

## Completed GREEN (preserved)

| Item | Status |
|---|---|
| M55 Commercial Funnel SSOT | **GREEN** |
| Worktree registry / current-state bootstrap | **GREEN** |
| Post-merge authority transition docs | **GREEN** |
| Authority closure / implementation readiness | **GREEN_IMPLEMENTATION_AUTHORIZED** |
| Self funnel operational baseline (PR #80) | **GREEN** — OPERATIONAL_BASELINE on Production |

## Runtime vs target (scope separation — verifier preserved)

| Area | Merged runtime (`origin/main`) | Target contract | Branch-local Self funnel Growth (not merged main runtime) |
|---|---|---|---|
| Self free pre-result theme | `preResultThemeSelection: false` | `preResultThemeSelection: false` | unchanged |
| Share / OG / viral return | not yet on Production | privacy-safe share loop | implementation in progress on WT-011 |
| Pair premium | NOT_LIVE | 二人向け無料→有料 lane（later） | unchanged |
