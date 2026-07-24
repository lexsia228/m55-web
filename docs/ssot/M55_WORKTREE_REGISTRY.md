# M55 Worktree Registry

Status: **Worktree authority (Tier E — operational)**  
Last verified: **2026-07-24** (CATEGORY-2 documented post-merge transition REV1 — PR #76)
Source command: `git worktree list --porcelain` + per-worktree `git status --porcelain`, `@{upstream}`, `rev-list --left-right --count origin/main...HEAD`

## How to read this registry

### Production main authority (Git remote)

- **Branch:** `origin/main`
- **Historical verified baseline:** `575791f2ab80d57c89317e07da4b8020cfba3485` — PR #74 merge anchor; historical transition/descendant anchor; **not** current live remote main
- **Pre-merge SHA (historical):** `37163a0d473c25365f3bddad579d4844fd8300df`
- **Locally recorded origin/main (bootstrap merge):** `04c90acdb55665f63df8d332be2cbc66e96b8e8e` — incorporated as second parent of `2591e69454d2d082e31e59a8cb0591bda11c3362`; historical bootstrap-era recorded remote; **not** current live remote main
- **Pre-PR #76 remote main:** `75c43f08976e3c7dbcf374d7cb06f520f6b76b93` — first parent of PR #76 merge commit; **not** current live remote main
- **PR #76 bootstrap feature HEAD:** `bf1ab0ffac7b34081cecc864c496abed6a196513` — second parent of PR #76 merge; preserved old bootstrap branch HEAD; **not** current live remote main
- **Current live remote main:** `38447ab1b39562606938936ce0da3d5a76d82c1b` — PR #76 merge commit
- Production code authority follows freshly verified `origin/main` — not conflated with historical baseline, bootstrap-era recorded remote, or local transition-branch identity.
- **Operational SHA note:** SHA values in this registry are **verification-time snapshots**. They are not immutable product contracts.

### PRIMARY_MAIN_HOME vs ACTIVE_BRANCH (do not conflate)

| Concept | Meaning |
|---|---|
| **Production main authority** | `origin/main` — freshly verified live SHA only; see historical baseline and recorded refs above |
| **PRIMARY_MAIN_HOME** | Designated baseline worktree path for post–PR #74 commercial funnel work |
| **ACTIVE_BRANCH** | The branch actively being edited in the current operational gate |

**Current fact (2026-07-24):** WT-001 holds **PRIMARY_MAIN_HOME** on branch `chore/m55-worktree-registry-post-merge-transition-rev1` during documented post-merge transition. This branch is **not** `main` and is **not** the old bootstrap branch. Local `main` checkout remains a **separate Human-approved transition gate** — not current state.

### Lifecycle status values

`PRIMARY_MAIN` · `ACTIVE` · `PAUSED` · `STALE` · `DO_NOT_USE` · `CLEANUP_PENDING` · `COMPLETED_REMOVABLE` · `UNKNOWN`

`PRIMARY_MAIN` in entry notes means **PRIMARY_MAIN_HOME designation**, not “this worktree is on branch `main` right now”.

### Documented post-merge transition (WT-001)

WT-001 branch/HEAD below are a **lastVerifiedAt snapshot**, not live Git state forever.

| Phase | branch | HEAD | Agent action |
|---|---|---|---|
| Historical (pre-merge PR #74) | `docs/m55-commercial-funnel-ssot-v1` | `86260d5…` | **Historical** — PR #74 merged |
| Post-merge historical baseline | `main` | `575791f2…` | Historical verified baseline after PR #74 squash merge — not current live remote main |
| Bootstrap merge | `chore/m55-worktree-registry-current-state-bootstrap-rev1` | `2591e694…` | `merge(main): refresh repo audit index before bootstrap push`; locally recorded `origin/main` @ `04c90ac…` as second parent |
| Bootstrap feature HEAD (PR #76 parent 2) | `chore/m55-worktree-registry-current-state-bootstrap-rev1` | `bf1ab0ff…` | Merged into `origin/main` via PR #76; branch **preserved** at this SHA |
| PR #76 merge / current origin/main | `main` (remote) | `38447ab1…` | Merge commit; parents `75c43f0…` + `bf1ab0ff…` |
| Current (documented post-merge transition) | `chore/m55-worktree-registry-post-merge-transition-rev1` | `38447ab1…` | Created from origin/main merge SHA; docs-only transition — **no product source**; uncommitted / unpushed relative to this gate |
| Expected later main checkout | `main` | *Human-approved transition gate* | Separate Human-approved checkout `main` after Control Plane closure — not current state |

**Drift rule:** unexplained branch/HEAD mismatch → STOP. Documented post-merge transition + freshly verified live remote main → update snapshot and continue (see `AGENTS.md`).

---

## Registered worktrees

### WT-001 — PRIMARY_MAIN_HOME

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` |
| branch | `chore/m55-worktree-registry-post-merge-transition-rev1` |
| HEAD | `38447ab1b39562606938936ce0da3d5a76d82c1b` |
| baseline | `main` @ `575791f2ab80d57c89317e07da4b8020cfba3485` |
| current origin/main | `38447ab1b39562606938936ce0da3d5a76d82c1b` — PR #76 merge commit |
| locally recorded origin/main (bootstrap merge) | `04c90acdb55665f63df8d332be2cbc66e96b8e8e` — second parent of `2591e69454d2d082e31e59a8cb0591bda11c3362`; historical only |
| old bootstrap branch (preserved) | `chore/m55-worktree-registry-current-state-bootstrap-rev1` @ `bf1ab0ffac7b34081cecc864c496abed6a196513` |
| upstream | **none** |
| cleanliness | pre-edit snapshot authority: clean · current transition branch: exact-three authorized documented post-merge transition docs modifications pending review |
| locked / prunable | none |
| lifecycle | **ACTIVE** + **PRIMARY_MAIN_HOME** |
| purpose | **PRIMARY_MAIN_HOME** — post–PR #74 commercial funnel baseline worktree; documented post-merge transition only |
| related lane / PR | PR #74 merged · PR #76 **MERGED** @ `38447ab1…` · documented post-merge transition gate |
| allowed operations | CURRENT_STATE / WORKTREE_REGISTRY / ROADMAP docs edits during authorized documented post-merge transition gate only |
| prohibited operations | product source/runtime/UI/route/API/DB/Stripe/Clerk/env changes without explicit lane activation |
| removal eligibility | NO — retain as PRIMARY_MAIN_HOME |
| notes | PR #76 MERGED (merge commit `38447ab1…`; parents `75c43f0…` + `bf1ab0ff…`). Old bootstrap branch preserved at `bf1ab0ff…`. Current transition branch created from origin/main merge SHA; local identity is **not** remote main and **not** old bootstrap branch; still uncommitted / unpushed for this docs gate. **Product source implementation is unauthorized.** Expected later `main` checkout is a separate Human-approved transition gate. See **Documented post-merge transition** above. |

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
| purpose | HOME full upgrade reassurance / paid LP copy lane |
| related lane / PR | pre-HOME-final; not current lane |
| allowed operations | none in current lane |
| prohibited operations | edit without lane activation |
| removal eligibility | deferred — human review |
| notes | Current commercial funnel lane では触らない。 |

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
