# M55 Worktree Registry

Status: **Worktree authority (Tier E — operational)**  
Last verified: **2026-07-27** (CATEGORY-2 Growth Share authority state reconciliation REV1 — verification-time snapshot)
Source command: `git worktree list --porcelain` + per-worktree `git status --porcelain`, `@{upstream}`, `rev-list --left-right --count origin/main...HEAD`

## How to read this registry

### Production main authority (Git remote)

- **Branch:** `origin/main`
- **Historical verified baseline:** `575791f2ab80d57c89317e07da4b8020cfba3485` — PR #74 merge anchor; historical transition/descendant anchor; **not** current live remote main
- **Pre-merge SHA (historical):** `37163a0d473c25365f3bddad579d4844fd8300df`
- **Locally recorded origin/main (bootstrap merge):** `04c90acdb55665f63df8d332be2cbc66e96b8e8e` — incorporated as second parent of `2591e69454d2d082e31e59a8cb0591bda11c3362`; historical bootstrap-era recorded remote; **not** current live remote main
- **Pre-PR #76 remote main:** `75c43f08976e3c7dbcf374d7cb06f520f6b76b93` — first parent of PR #76 merge commit; **not** current live remote main
- **PR #76 bootstrap feature HEAD:** `bf1ab0ffac7b34081cecc864c496abed6a196513` — second parent of PR #76 merge; preserved old bootstrap branch HEAD; **not** current live remote main
- **PR #76 merge commit (historical):** `38447ab1b39562606938936ce0da3d5a76d82c1b` — **not** current live remote main
- **PR #77 post-merge transition feature HEAD:** `6ad4e14ba7bbce65a3bac04a38bcdcbdbf461d7e` — squash source for PR #77; **not** current live remote main
- **PR #79 Authority Pack merge (historical):** `355462b84d4a1a28ba6d8a37a3e6a40346a572d2` — **not** current live remote main
- **Current live remote main (2026-07-27):** `696559009367a6ac445dc7a07876590b16cd8488` — PR #80 Self funnel operational baseline merge
- **last observed origin/main (2026-07-26T13:23:20+00:00):** `b13fcd540e210c3ffb41fa2f56889df74b1b3915` — mutable Git observation; **not** Production SHA
- **Authority Pack bootstrapStartHead (historical lane anchor):** `e6afe67262ebcee3353a3a43713f7ecf8369f26f` — lane creation anchor; **not** current live remote main
- Production code authority follows freshly verified `origin/main` — not conflated with historical baseline, bootstrap-era recorded remote, or local transition-branch identity.
- **Operational SHA note:** SHA values in this registry are **verification-time snapshots**. They are not immutable product contracts.

### PRIMARY_MAIN_HOME vs ACTIVE_BRANCH (do not conflate)

| Concept | Meaning |
|---|---|
| **Production main authority** | `origin/main` — freshly verified live SHA only; see historical baseline and recorded refs above |
| **PRIMARY_MAIN_HOME** | Designated baseline worktree path for post–PR #74 commercial funnel work |
| **ACTIVE_BRANCH** | The branch actively being edited in the current operational gate |

**Current fact (2026-07-27):** WT-011 is the sole **ACTIVE** implementation lane (Self funnel Growth / share on `feat/m55-self-funnel-growth-share-v1`; live HEAD validated as descendant of reviewed implementation tip `d7af28a…`; PR #81 unmerged). WT-001 Self funnel operational baseline is **COMPLETED** (PR #80 merged; Production classified `OPERATIONAL_BASELINE`). WT-010 Product Authority Pack is **COMPLETED** (PR #79 merged; retained infrastructure). WT-006 paid-lp remains **PAUSED**. WT-009 Build Week remains **FROZEN**.

### Lifecycle status values

`PRIMARY_MAIN` · `ACTIVE` · `PAUSED` · `STALE` · `DO_NOT_USE` · `CLEANUP_PENDING` · `COMPLETED_REMOVABLE` · `UNKNOWN`

`PRIMARY_MAIN` in entry notes means **PRIMARY_MAIN_HOME designation**, not “this worktree is on branch `main` right now”.

### Documented post-merge transition (historical)

Historical post-merge transition snapshots remain recorded for audit. WT-011 is the **ACTIVE Growth Share** implementation lane after Self funnel operational baseline merge.

| Phase | branch | HEAD | Agent action |
|---|---|---|---|
| Historical (pre-merge PR #74) | `docs/m55-commercial-funnel-ssot-v1` | `86260d5…` | **Historical** — PR #74 merged |
| Post-merge historical baseline | `main` | `575791f2…` | Historical verified baseline after PR #74 squash merge — not current live remote main |
| PR #76 merge / prior origin/main | `main` (remote) | `38447ab1…` | Merge commit; parents `75c43f0…` + `bf1ab0ff…` |
| Documented post-merge transition branch (preserved) | `chore/m55-worktree-registry-post-merge-transition-rev1` | `6ad4e14…` | PR #77 feature HEAD; docs-only transition — **preserved historical** |
| Authority Pack PR #79 merge | `main` (remote) | `355462b…` | **MERGED** — Product Authority Pack complete |
| Self funnel PR #80 merge | `main` (remote) | `6965590…` | **MERGED** — Self free→Premium **OPERATIONAL_BASELINE** |
| Current (Self funnel Growth lane) | `feat/m55-self-funnel-growth-share-v1` | live HEAD (Git) | Descendant of reviewed tip `d7af28a…` · PR #81 unmerged |

**Drift rule:** unexplained branch/HEAD mismatch → STOP. Documented post-merge transition + freshly verified live remote main → update snapshot and continue (see `AGENTS.md`).

---

## Registered worktrees

### WT-001 — PRIMARY_MAIN_HOME

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` |
| branch | `feat/m55-self-free-to-premium-funnel-v1` |
| HEAD | `fda934d8f31da715d3a4fb35681c7b3dff3dd41d` |
| baseline | `main` @ `355462b84d4a1a28ba6d8a37a3e6a40346a572d2` |
| current origin/main | `696559009367a6ac445dc7a07876590b16cd8488` |
| upstream | `origin/feat/m55-self-free-to-premium-funnel-v1` @ `fda934d…` |
| cleanliness | **clean** |
| locked / prunable | none |
| lifecycle | **COMPLETED** · **PRIMARY_MAIN_HOME** (superseded **ACTIVE** baseline) |
| operational state | **OPERATIONAL_BASELINE_MERGED** |
| purpose | **PRIMARY_MAIN_HOME** — Self free→Premium operational baseline (merged; reference only) |
| related lane / PR | PR #80 **MERGED** @ `6965590…` · feature tip `fda934d…` · backup `refs/backup/m55-self-funnel-pre-main-sync-rev1` retained |
| product implementation authorized | **false** for new growth work — use WT-011 |
| allowed operations | read-only inspection · historical baseline reference |
| prohibited operations | append growth commits · Stripe / webhook / DB / Clerk / env / Pair runtime / WT-009 edits |
| removal eligibility | NO — retain as PRIMARY_MAIN_HOME / merged baseline reference |
| next gate | Growth work on WT-011 only |
| notes | PR #80 merged to `main`. Production classified **OPERATIONAL_BASELINE** (not final commercial launch). Do not continue growth by appending to this merged feature branch. |

### WT-002 — Compatibility purchase delivery (DO NOT USE)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish` |
| branch | `feat/m55-compatibility-purchase-delivery-v1` |
| HEAD | `59bba368886e9593de703352b83b319956ace9e3` |
| upstream | `origin/feat/m55-compatibility-purchase-delivery-v1` @ `59bba368886e9593de703352b83b319956ace9e3` |
| local branch | **KEEP** — branch preserved; worktree removed |
| remote branch | **KEEP** @ `origin/feat/m55-compatibility-purchase-delivery-v1` @ `59bba368886e9593de703352b83b319956ace9e3` |
| PR | **#66 MERGED** |
| divergence from `origin/main` | 13 behind · 3 ahead (historical snapshot at removal) |
| ancestor of `origin/main` | NO |
| cleanliness | **historical archived inventory** — pre-removal: modified `.gitignore`; untracked `.qa-screenshots-*` directories (not current dirty state) |
| filesystem path | **absent** — authorized removal completed 2026-07-23 |
| Git worktree metadata | **absent** |
| stale metadata | **absent** |
| locked / prunable | none |
| lifecycle | **DO_NOT_USE** — historical preserved record; not a live worktree |
| purpose | Historical compatibility commerce / cross-page card polish lane |
| related lane / PR | PR **#66 MERGED** · compatibility commerce core **merged to main** |
| allowed operations | read-only registry / historical inspection only |
| prohibited operations | **worktree recreation** · reuse · **reset** · **stash** · **clean** · local branch deletion · remote branch deletion · archive deletion · new implementation |
| removal | **GREEN** — Human authorized force removal completed 2026-07-23 |
| removal eligibility | worktree removal **GREEN**; local branch / remote branch / archive deletion **NOT AUTHORIZED** |
| nonsecret archive | `/Users/lexsia/Documents/M55_ARCHIVE/WT-002_compatibility-purchase-delivery_59bba368_2026-07-23` |
| archive verification | **GREEN** — exact 8 files · checksum 7/7 PASS · bundle verification PASS · tracked patch preserved · QA evidence 102 files · QA bytes 26,084,746 |
| secure backup | `/Users/lexsia/Documents/M55_SECURE_ARCHIVE/WT-002_local-config_59bba368_2026-07-23.sparsebundle` |
| external manifest | `/Users/lexsia/Documents/M55_SECURE_ARCHIVE/WT-002_local-config_59bba368_2026-07-23.manifest.json` |
| secure backup verification | **GREEN** — AES-256 · APFS · SPARSEBUNDLE · payloadLayout VOLUME_ROOT · 5 regular files · 3 directories · 2,432 bytes · source comparison 5/5 PASS twice · independent verification GREEN · manifest review GREEN · currently unmounted · historical manifest `removalAuthorized` remains false |
| reuse | **PROHIBITED** — do not recreate or reuse this worktree |
| deletion authority | local branch · remote branch · archive deletion **NOT AUTHORIZED** |
| notes | Former live worktree **removed** 2026-07-23 (Human authorized). Former path absent from filesystem and Git worktree inventory. Historical archived inventory (pre-removal): uncommitted `.gitignore` change; QA generated artifacts. compatibility commerce core merged to main. Decision log REJECTED: 古い compatibility worktree で実装継続. Do not treat as live worktree or live dirty state. |

### WT-003 — Compatibility quality matrix

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_CANONICAL` |
| branch | `feat/m55-compatibility-quality-matrix` |
| HEAD | `3928cb9bcec67e290437cd03164341a1c6acfac9` |
| upstream | `origin/feat/m55-compatibility-quality-matrix` |
| divergence from `origin/main` | 47 behind · 1 ahead |
| ancestor of `origin/main` | NO |
| cleanliness | **dirty** — untracked `.qa-screenshots-*`, untracked component/test files |
| locked / prunable | none |
| lifecycle | **PAUSED** |
| purpose | Compatibility pair reading quality matrix lane |
| related lane / PR | Not active commercial funnel lane |
| allowed operations | none in current lane |
| prohibited operations | edit without explicit lane reopen |
| removal eligibility | NO |
| notes | Current commercial funnel lane では使用しない。Branch/HEAD が authority。 |

### WT-004 — Ops control plane bootstrap

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_CANONICAL-ops-control-plane-wave1` |
| branch | `chore/ops-control-plane-bootstrap` |
| HEAD | `dde083b3cf85b7580728935be9079bfab3291e4c` |
| upstream | `origin/chore/ops-control-plane-bootstrap` |
| divergence from `origin/main` | 359 behind · 0 ahead |
| ancestor of `origin/main` | YES |
| cleanliness | clean |
| locked / prunable | none |
| lifecycle | **PAUSED** |
| purpose | Ops control plane wave 1 |
| related lane / PR | ops — not commercial funnel |
| allowed operations | none in current lane |
| prohibited operations | edit without ops lane activation |
| removal eligibility | deferred — human review |
| notes | Stale relative to main; no active work. |

### WT-005 — Ops current-state semantics

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_CANONICAL-ops-current-state-semantics-wave1` |
| branch | `chore/ops-current-state-semantics-wave1` |
| HEAD | `403d4235cdb2d1b73adbfa9dc60d76c7360c65d0` |
| upstream | `origin/chore/ops-current-state-semantics-wave1` |
| divergence from `origin/main` | 357 behind · 0 ahead |
| ancestor of `origin/main` | YES |
| cleanliness | clean |
| locked / prunable | none |
| lifecycle | **PAUSED** |
| purpose | Ops verified checkpoint semantics |
| related lane / PR | ops — not commercial funnel |
| allowed operations | none in current lane |
| prohibited operations | edit without ops lane activation |
| removal eligibility | deferred — human review |
| notes | Stale relative to main; no active work. |

### WT-006 — Paid LP / home microcopy

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1` |
| branch | `pre-note/home-fullka-microcopy` |
| HEAD | `8391d02ea18db8e026de3370caa9199a3b273b67` |
| upstream | `origin/pre-note/home-fullka-microcopy` |
| divergence from `origin/main` | 235 behind · 0 ahead |
| ancestor of `origin/main` | YES |
| cleanliness | clean |
| locked / prunable | none |
| lifecycle | **PAUSED** |
| operational state | **REFERENCE_ONLY** |
| purpose | HOME full upgrade reassurance / paid LP copy lane |
| related lane / PR | pre-HOME-final; not current lane |
| allowed operations | none in current lane |
| prohibited operations | edit without lane activation |
| removal eligibility | deferred — human review |
| notes | Live paid-lp worktree preserved as **PAUSED / reference-only**. Not Authority Pack. Current commercial funnel lane では触らない。 |

### WT-007 — Analysis hub

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-analysis-hub-v1` |
| branch | `feat/m55-analysis-hub-account-center-v1` |
| HEAD | `468f89550e765f762c5084d7ebe135bf22dc5526` |
| upstream | `origin/feat/m55-analysis-hub-account-center-v1` |
| divergence from `origin/main` | 10 behind · 16 ahead |
| ancestor of `origin/main` | NO |
| cleanliness | clean |
| locked / prunable | none |
| lifecycle | **PAUSED** |
| purpose | Analysis hub / account center lane |
| related lane / PR | not commercial funnel |
| allowed operations | none in current lane |
| prohibited operations | edit without lane activation |
| removal eligibility | deferred — human review |
| notes | Diverged from main; paused. |

### WT-008 — HOME poster clean main

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-home-poster-clean-main-v1` |
| branch | `feat/m55-home-poster-clean-main` |
| HEAD | `2a88ddddcc58fc45823d9c966c2a6d4ba99cd40a` |
| upstream | `origin/main` (tracking ref; branch is feature) |
| divergence from `origin/main` | 7 behind · 2 ahead |
| ancestor of `origin/main` | NO |
| cleanliness | clean |
| locked / prunable | none |
| lifecycle | **PAUSED** |
| purpose | HOME poster hero clean-main lane |
| related lane / PR | HOME poster — frozen hero rules apply |
| allowed operations | none in current lane |
| prohibited operations | edit without explicit HOME reopen |
| removal eligibility | deferred — human review |
| notes | Upstream tracks `origin/main` but checked-out branch is feature. Not PRIMARY_MAIN_HOME. |

### WT-009 — Build Week Control Plane (operational freeze)

| Field | Value |
|---|---|
| id | WT-009 |
| path | `/Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1` |
| branch | `feat/m55-build-week-control-plane-v1` |
| HEAD | `0cba2cb998e07b81c71ea51d69f7ae0fe92b7f75` |
| upstream | `origin/feat/m55-build-week-control-plane-v1` |
| cleanliness | clean (verification-time snapshot) |
| locked / prunable | none |
| lifecycle | **PAUSED** |
| operational state | **FROZEN_BY_HUMAN_DECISION** |
| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |
| related lane / PR | PR #75 — **OPEN** (operational freeze by Human decision) |
| allowed operations | read-only inspection · Control Plane canonical external audit · PR/check status read-only observation |
| prohibited operations | source/docs/test/config edit · commit · push · rebase · force-push · merge to `main` · product runtime change · Production change · worktree removal |
| removal eligibility | NO — requires PR #75 final disposition + explicit Human approval in separate gate |
| notes | Build Week submission evidence preserved under Human decision. Stronger than typical PAUSED: read-only inspection only; no edit/commit/push/rebase/merge without explicit Human gate; no merge to `main`; no product/runtime/Production changes; auto-cleanup/remove prohibited. Removal only after PR #75 final disposition + separate Human gate. |

### WT-010 — Product Authority Pack

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-pack-v1` |
| branch | `feat/m55-product-authority-pack-v1` |
| bootstrapStartHead | `e6afe67262ebcee3353a3a43713f7ecf8369f26f` |
| upstream | `origin/feat/m55-product-authority-pack-v1` @ `fae04444618e2ae36e6fd813ddfddeee975b66c4` (2026-07-26) |
| cleanliness | worktree may be clean between allowlisted commits — `ALLOWLIST_ONLY_DURING_IMPLEMENTATION` remains lane policy |
| locked / prunable | none |
| lifecycle | **COMPLETED** (superseded **ACTIVE** lane — PR #79 merged) |
| operational state | **ALLOWLIST_ONLY_DURING_IMPLEMENTATION** |
| purpose | **Product Authority Pack** — sequences 0–2 reconciled; PR #79 merged; completed infrastructure retained |
| related lane / PR | [PR #79](https://github.com/lexsia228/m55-web/pull/79) **MERGED** @ `355462b…` · merge commit on `main` |
| allowed operations | read-only inspection · observation refresh via steady-state verifier |
| prohibited operations | new Authority Pack mutation without explicit lane reopen |
| removal eligibility | deferred — retain worktree for reference |
| notes | `bootstrapStartHead` records lane origin @ origin/main (`e6afe672…`) — **not** current HEAD. Rewritten Commit 1: `f9daeb1f38205ca6d6eebb8e90c0a19f4ad58704`. Reconciliation Commit 2: `2761706505576a2baeacbdd40acd130a1f70e81b`. CI-portability Commit 3 / PR tip (2026-07-26): `fae04444618e2ae36e6fd813ddfddeee975b66c4`. Preflight validates ancestry from `bootstrapStartHead`, not equality. Superseded pre-rewrite Commit 1 `178dadab4697f4797b8f00fd473d08a135b3ec4e` and safety-ref tip `844c5bbb73795b2f162e29516be79fb401c3b55e` are retained local history only — **not active branch provenance**. PR #79 merge SHA `355462b84d4a1a28ba6d8a37a3e6a40346a572d2`. Steady-state verifier active on `main`. |

### WT-011 — Self funnel Growth / share lane

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1` |
| branch | `feat/m55-self-funnel-growth-share-v1` |
| implementationReviewedTip | `d7af28a59755076b6269e93edfba03297eb98084` |
| liveHeadSource | Git |
| headValidation | DESCENDANT_OF_REVIEWED_IMPLEMENTATION_TIP |
| baseline | `main` @ `696559009367a6ac445dc7a07876590b16cd8488` |
| current origin/main | `696559009367a6ac445dc7a07876590b16cd8488` |
| upstream | `origin/feat/m55-self-funnel-growth-share-v1` — remote feature ref must equal live local HEAD |
| cleanliness | **clean** (verification-time snapshot) |
| locked / prunable | none |
| lifecycle | **ACTIVE** |
| operational state | **GROWTH_SITEWIDE_COMMERCIAL_AUDIT_THEN_UNIFIED_UX** |
| purpose | Sitewide commercial consistency audit → unified Growth Share commercial UX implementation |
| related lane / PR | Base: PR #80 **MERGED** · [PR #81](https://github.com/lexsia228/m55-web/pull/81) **unmerged** / branch-local |
| product implementation authorized | **true** for Growth scope only |
| allowed operations | authority/docs reconciliation · sitewide commercial audit · Growth UX implementation · Human visual review |
| prohibited operations | Stripe / webhook / DB / Clerk / env / Pair runtime · live purchase · append to merged PR #80 branch |
| removal eligibility | NO while ACTIVE |
| next gate | sitewide commercial UX audit → unified implementation → Human review |
| notes | `implementationReviewedTip` records the reviewed Growth Share implementation baseline (`d7af28a…`) — **not** a permanently current branch HEAD. Authority-only descendant commits pass preflight without registry SHA self-invalidation. Historical Commit 2 provenance `b710dc543c02572a038170feb562a0a6514a313f`. Growth code is not Production. |

---

## Non-worktree directories explicitly excluded

The following paths under `/Users/lexsia/Documents/` are **not** Git worktrees and are **not** rows in this registry:

- `M55_B2C_KEYVISUAL_PRODUCTION_R2`
- `M55_PRIVATE_VAULT`
- encrypted sparsebundle assets

Do not infer branch, HEAD, or lane from folder names alone.

---

## Agent rules (summary)

See `AGENTS.md` for full rules. Key points:

- Confirm `pwd` / `branch` / `HEAD` / `status` / `git worktree list` before work
- Never edit **DO_NOT_USE** worktrees; never edit WT-009 (operational freeze under PAUSED) without explicit Human gate
- Never reset / clean / stash dirty worktrees without explicit human instruction
- Never create new worktrees without plan
- If registry ≠ live `git worktree list`, **stop and report**
- After lane work, update this registry and `M55_CURRENT_STATE.md` when facts change
