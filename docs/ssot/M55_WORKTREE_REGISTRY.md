# M55 Worktree Registry

Status: **Worktree authority (Tier E — operational)**  
Last verified: **2026-07-21**
Source command: `git worktree list --porcelain` + per-worktree `git status --porcelain`, `@{upstream}`, `rev-list --left-right --count origin/main...HEAD`

## How to read this registry

### Production main authority (Git remote)

- **Branch:** `origin/main`
- **SHA:** `37163a0d473c25365f3bddad579d4844fd8300df`
- This is the production code authority. It is **not** the same as any local checkout state below.

### PRIMARY_MAIN_HOME vs ACTIVE_BRANCH (do not conflate)

| Concept | Meaning |
|---|---|
| **Production main authority** | `origin/main` at the SHA above |
| **PRIMARY_MAIN_HOME** | Designated **post-merge baseline worktree** — the path where `main` should be checked out **after** PR #74 merges. Not “currently on `main`”. |
| **ACTIVE_BRANCH** | The branch actively being edited in the current lane (`docs/m55-commercial-funnel-ssot-v1`) |

**Current fact:** No registered worktree is checked out on local `main`.  
`/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` holds **ACTIVE_BRANCH** today and is designated **PRIMARY_MAIN_HOME** after merge.

### Lifecycle status values

`PRIMARY_MAIN` · `ACTIVE` · `TEMPORARY_ACTIVE` · `PAUSED` · `STALE` · `DO_NOT_USE` · `CLEANUP_PENDING` · `COMPLETED_REMOVABLE` · `UNKNOWN`

`PRIMARY_MAIN` in entry notes means **PRIMARY_MAIN_HOME designation**, not “this worktree is on branch `main` right now”.

### Documented post-merge transition (WT-001)

WT-001 branch/HEAD below are a **lastVerifiedAt snapshot**, not live Git state forever.

| Phase | branch | HEAD | Agent action |
|---|---|---|---|
| Pre-merge (PR #74 review) | `docs/m55-commercial-funnel-ssot-v1` | `86260d5…` | Normal SSOT PR work |
| Post-merge (expected) | `main` | `origin/main` squash merge SHA | checkout `main`, pull, verify merge SHA, **update this registry** + `M55_CURRENT_STATE.md`, re-run live preflight |

**Drift rule:** unexplained branch/HEAD mismatch → STOP. Documented post-merge transition + verified merge SHA on `origin/main` → update snapshot and continue (see `AGENTS.md`).

---

## Registered worktrees

### WT-001 — Commercial Funnel SSOT (current session)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` |
| branch | `docs/m55-commercial-funnel-ssot-v1` (pre-merge snapshot) |
| HEAD | `86260d50fa132dfd083a0f092f0cfa0c3eaa2adb` |
| upstream | `origin/docs/m55-commercial-funnel-ssot-v1` |
| divergence from `origin/main` | 0 behind · 2 ahead |
| ancestor of `origin/main` | NO (feature commit on top of main) |
| cleanliness | clean |
| locked / prunable | none |
| lifecycle | **ACTIVE** + **PRIMARY_MAIN_HOME** (post-merge designation) |
| purpose | M55 Commercial Funnel SSOT構築 — PR #74 |
| related lane / PR | ACTIVE LANE: Commercial Funnel SSOT · PR #74 |
| allowed operations | docs/contract/verifier edits on active branch; read authority first |
| prohibited operations | runtime/UI/route/API/DB/Stripe/Clerk/env changes in this lane |
| removal eligibility | NO — retain as PRIMARY_MAIN_HOME after merge |
| notes | **ACTIVE_BRANCH** holder (pre-merge). **Post-merge:** checkout `main`, pull `origin/main`, verify merge SHA, update registry snapshot, live preflight. See **Documented post-merge transition** above. |

### WT-002 — Compatibility purchase delivery (DO NOT USE)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish` |
| branch | `feat/m55-compatibility-purchase-delivery-v1` |
| HEAD | `59bba368886e9593de703352b83b319956ace9e3` |
| upstream | `origin/feat/m55-compatibility-purchase-delivery-v1` |
| divergence from `origin/main` | 13 behind · 3 ahead |
| ancestor of `origin/main` | NO |
| cleanliness | **dirty** — modified `.gitignore`; untracked `.qa-screenshots-*` directories |
| locked / prunable | none |
| lifecycle | **DO_NOT_USE** |
| purpose | Historical compatibility commerce / cross-page card polish lane |
| related lane / PR | compatibility commerce core **merged to main**; branch stale |
| allowed operations | read-only inspection if explicitly authorized |
| prohibited operations | **edit** · **reset** · **clean** · **stash** · **delete worktree** · new implementation |
| removal eligibility | NO — human decision required; do not auto-clean QA artifacts or `.gitignore` |
| notes | Main より古い。QA generated artifacts あり。uncommitted `.gitignore` 変更あり。Decision log REJECTED: 古い compatibility worktree で実装継続。 |

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

### WT-009 — OpenAI Build Week / M55 Control Plane

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1` |
| branch | `feat/m55-build-week-control-plane-v1` |
| base | `d8682a121ee54808b1214b9835fa3d936b648ca8` |
| HEAD | rolling feature-branch tip — verify with live Git and pushed-commit evidence |
| lifecycle | **TEMPORARY_ACTIVE** |
| purpose | OpenAI Build Week / M55 Control Plane |
| productLaneReplacement | false |
| returnState | `GREEN_SELF_FUNNEL_SPEC_READY_FOR_HUMAN_VISUAL_SELECTION` |
| allowed operations | control-plane CLI, generic engine, M55 authority adapter, reports, tests, Build Week documentation, minimal authority closure |
| prohibited operations | Self Funnel runtime · HOME · Pair · Stripe · checkout · DB · migration · Clerk · wallet · ticket · RPC · Production deploy |
| notes | Temporary operational interrupt. Authorized commits advance this `TEMPORARY_ACTIVE` branch, so HEAD is intentionally live-verified rather than frozen in this row. The product active lane and roadmap order remain unchanged. |

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
- Never edit **DO_NOT_USE** worktrees
- Never reset / clean / stash dirty worktrees without explicit human instruction
- Never create new worktrees without plan
- If registry ≠ live `git worktree list`, **stop and report**
- After lane work, update this registry and `M55_CURRENT_STATE.md` when facts change
