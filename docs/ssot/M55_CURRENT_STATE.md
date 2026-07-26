# M55 Current State

Status: **State registry (Tier E)**
Machine registry: `M55_COMMERCIAL_STATE_REGISTRY` in `lib/m55/contracts/m55CommercialFunnelContract.ts`
Worktree detail: **`docs/ssot/M55_WORKTREE_REGISTRY.md`** (authoritative for paths, branches, lifecycle)
Product Authority Pack: **`.product-authority/`** (durable authority + observations)

Last updated: 2026-07-26 (Authority Pack observation refresh patch REV1)

## Product Authority Pack lane (ACTIVE — WT-010)

| Field | Value |
|---|---|
| Lane | **Product Authority Pack authority-data correction / final Human review** |
| Status | **ACTIVE** |
| Worktree ID | **WT-010** |
| Worktree | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-pack-v1` |
| Branch | `feat/m55-product-authority-pack-v1` |
| bootstrapStartHead | `e6afe67262ebcee3353a3a43713f7ecf8369f26f` — historical lane creation anchor; **not** current origin/main |
| History (2026-07-26) | sequences **0–2** present — `INITIALIZATION` · `AUTHORITY_PROCESS_INCIDENT` · `BOOTSTRAP_RECONCILIATION` |
| Bootstrap reconciliation | **Complete** — steady-state verifier active |
| CI steady-state enforcement | **Active and PASS** at reviewed PR tip |
| PR #79 (2026-07-26 snapshot) | **OPEN** — base `main` · head `feat/m55-product-authority-pack-v1` |
| PR tip SHA (2026-07-26 CI snapshot) | `fae04444618e2ae36e6fd813ddfddeee975b66c4` |
| Commit 1 (Push Protection rewrite) | `f9daeb1f38205ca6d6eebb8e90c0a19f4ad58704` |
| Commit 2 (bootstrap reconciliation) | `2761706505576a2baeacbdd40acd130a1f70e81b` |
| Commit 3 (registry fixture CI portability) | `fae04444618e2ae36e6fd813ddfddeee975b66c4` |
| Required CI at reviewed tip | **GREEN** — including `verify-product-authority-pack` |
| Current lane action | authority-data transition correction — **merge prohibited** pending final Human authority approval |
| GitHub ruleset / CODEOWNERS enforcement | **Not claimed active** in this gate |
| Production deployment | **None** — no Production re-observation performed |

Authority Pack merge **does not** complete Self funnel Human lock or resume Self funnel implementation.
PR-tip branch-local code is **not** merged runtime.

## Canonical Production authority

| Field | Value |
|---|---|
| Canonical Production origin | `https://m-55.jp` |
| Canonical host | `m-55.jp` |
| Non-authoritative host | `m55.jp` |
| Non-authoritative reason | Not current M55 Production authority |
| Diagnostics URL | `https://m-55.jp/api/diagnostics/build` |
| last observed origin/main (2026-07-26T13:23:20+00:00) | `b13fcd540e210c3ffb41fa2f56889df74b1b3915` — mutable Git observation; **not** Production SHA |
| Production observed SHA | **null** — `PENDING_REOBSERVATION_ON_M-55.JP` |
| Production confirmation | **Do not claim** post-merge Production SHA confirmation in this gate |

## Parked / frozen lanes

| Lane | Status | Worktree ID | Worktree | Notes |
|---|---|---|---|---|
| Self free→Premium funnel | **PARKED** | **WT-001** | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` | dirty · preserved · `NO_MUTATION_DURING_AUTHORITY_PACK_LANE` |
| Paid LP / HOME microcopy | **PAUSED** | **WT-006** | `/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1` | reference-only · not Authority Pack |
| Build Week control plane | **FROZEN** | **WT-009** | `/Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1` | `DO_NOT_MODIFY` |

Self funnel branch: `feat/m55-self-free-to-premium-funnel-v1` @ `76cb15577dd46ce99980aed6a4df474960fd51d9` (branch-local · dirty · not merged runtime)

Build Week branch: `feat/m55-build-week-control-plane-v1` @ `0cba2cb998e07b81c71ea51d69f7ae0fe92b7f75` (frozen)

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

## Active commercial sequence (unchanged)

Roadmap order preserved. Authority Pack P0 override precedes Self funnel Human lock resumption.

1. Commercial Funnel SSOT — complete
2. 個人無料→個人Premium — **PARKED** (implementation preserved; awaiting Authority Pack final Human review)
3. 二人向け無料→有料 — later
4. HOME最終統合 — later
5. HOME正式SSOT — later

Current operational lane (2026-07-26): **Authority Pack authority-data correction** on PR #79 — not Self funnel implementation.

## Prohibited during Authority Pack lane

- Mutating parked Self funnel or frozen Build Week worktrees
- Claiming Production SHA confirmed without independent observation on `m-55.jp`
- Treating `m55.jp` as canonical Production authority
- Treating branch-local dirty Self funnel source as merged runtime

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
| Merge status | **Not merged into `origin/main` yet** — Authority Pack bootstrap is independent |
| **selfInputExperienceStatus** | `INPUT_EXPERIENCE_COMMERCIAL_FINALIZATION_GREEN_READY_FOR_HUMAN_LOCK` — branch-local; pending Human lock; not merged runtime |
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

Merged runtime (`origin/main` @ `b13fcd540e210c3ffb41fa2f56889df74b1b3915` as of 2026-07-26T13:23:20+00:00) is committed authority.
Target contract may precede runtime.
Branch-local Self funnel source is **not merged main runtime**.
Historical pre-merge SHA: `37163a0d473c25365f3bddad579d4844fd8300df` — retained for verifier/history.
documented post-merge transition remains recorded for WT-001 historical context.

## Active authoritative state (Self funnel — PARKED)

| Field | Value |
|---|---|
| **postMergeActiveLane** | 個人無料→個人Premiumファネルの一括実装 |
| **postMergeNextSingleAction** | Cursor docs patch complete → Cursor STOP → Codex independent diff review → Control Plane re-execution |
| **pairPremium** | NOT_LIVE |
| **Pair implementation** | Later lane — roadmap step 3（二人向け無料→有料） |
| Historical branch | `docs/m55-commercial-funnel-ssot-v1` (PR #74 — merged; **not** current active branch) |

### Prohibited while Self funnel lane is PARKED

- Stripe / webhook / checkout backend 変更
- Pair runtime 変更
- WT-009 Build Week worktree edits

## Completed GREEN (preserved)

| Item | Status |
|---|---|
| M55 Commercial Funnel SSOT | **GREEN** |
| Worktree registry / current-state bootstrap | **GREEN** |
| Post-merge authority transition docs | **GREEN** |
| Authority closure / implementation readiness | **GREEN_IMPLEMENTATION_AUTHORIZED** |

## Runtime vs target (scope separation — verifier preserved)

| Area | Merged runtime (`origin/main`) | Target contract | Branch-local Self funnel (uncommitted; not merged main runtime) |
|---|---|---|---|
| Self free pre-result theme | legacy debt | `preResultThemeSelection: false` | implementation targets false |
| Pair premium | NOT_LIVE | 二人向け無料→有料 lane（later） | unchanged |
