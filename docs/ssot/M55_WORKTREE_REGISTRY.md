# M55 Worktree Registry

Status: **Worktree authority (Tier E — operational)**  
Last verified: **2026-08-06** (`git worktree list --porcelain`; PR #90 MERGED Premium public terminology closure · WT-018/WT-019 retained read-only · WT-020 MRQ governance docs alignment registered)
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
- **Historical snapshot label (valid through 2026-07-31 only) — `696559009367a6ac445dc7a07876590b16cd8488`:** PR #80 Self funnel operational baseline merge; **not** current live remote main as of 2026-08-01 — see the current bullet immediately below
- **last observed origin/main (2026-07-26T13:23:20+00:00):** `b13fcd540e210c3ffb41fa2f56889df74b1b3915` — mutable Git observation; **not** Production SHA
- **PR #81 live remote main (2026-08-01; historical):** `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149` — superseded as Git main identity by PR #83
- **Remote main observed (PR #88 merge lifecycle gate, 2026-08-04):** `060fee287355eb00573d968445fcc374510d185d` — transition snapshot only; superseded as current live remote main by PR #90; immutable PR #88 merge commit `060fee287355eb00573d968445fcc374510d185d` (parents `e26f17b9001166a54171e36ce0d8fd3481315dfa` · `aa80853962b5d2df8fcb40fb482e807af4f6f788`); immutable PR #86/Production product-implementation snapshot `10e601465b66b8132a7ceb845300af1924ba468b`; historical Production deployment id **5738008464** · **not** current Production SHA
- **Current live remote main (PR #90 merge gate, 2026-08-06):** `ac71d054556ebec06d6fa107fbe359a88052aca6` — immutable PR #90 merge commit (parents `6286a745bbcf4ab15c006cc54946a05c4a4dc195` · `af33c722e6e585f51f8e51297055d090606fd32e`); Production deployment id **5762301638** · Production SHA `ac71d054556ebec06d6fa107fbe359a88052aca6` · state **READY** · canonical `/core` GET **HTTP 200** · public GET health **GREEN** · public Premium terminology **CLOSED GREEN** (PR #90 Production settlement)
- **Authority Pack bootstrapStartHead (historical lane anchor):** `e6afe67262ebcee3353a3a43713f7ecf8369f26f` — lane creation anchor; **not** current live remote main
- Production code authority follows freshly verified `origin/main` — not conflated with historical baseline, bootstrap-era recorded remote, or local transition-branch identity.
- **Operational SHA note:** SHA values in this registry are **verification-time snapshots**. They are not immutable product contracts.

### PRIMARY_MAIN_HOME vs ACTIVE_BRANCH (do not conflate)

| Concept | Meaning |
|---|---|
| **Production main authority** | `origin/main` — freshly verified live SHA only; see historical baseline and recorded refs above |
| **PRIMARY_MAIN_HOME** | Designated baseline worktree path for post–PR #74 commercial funnel work |
| **ACTIVE_BRANCH** | The branch actively being edited in the current operational gate |

**CURRENT (2026-08-06) — authoritative, read this first:** PA-2A remains CLOSED GREEN and the commercial-surface alias/reuse freeze is CLOSED GREEN. IND-FREE is **CLOSED GREEN**. P0 Premium public terminology is **CLOSED GREEN** — PR #90 **MERGED** @ `ac71d054556ebec06d6fa107fbe359a88052aca6` (MERGE COMMIT; feature head `af33c722e6e585f51f8e51297055d090606fd32e`); Production deployment id **5762301638** · Production SHA `ac71d054556ebec06d6fa107fbe359a88052aca6` · READY · public Premium terminology **GREEN**. **last observed origin/main (Product Authority governed):** `7e30b6456c6b2c45383ea8fb042efb9d17229893` @ `2026-08-06T06:42:52.660Z`. PR #68 is **CLOSED** as **superseded** — **unmerged**; branch retained; not an implementation source. PR #30 is **OPEN** — independent; not blocking MRQ; HOME reopen not authorized. PR #75 is **OPEN** — frozen reference-only; not blocking MRQ. WT-018 (`/Users/lexsia/Documents/M55_WORKTREE-premium-public-terminology-v1`, `fix/m55-premium-public-terminology-v1` @ `af33c722e6e585f51f8e51297055d090606fd32e`) is **COMPLETED** — retained read-only; write/product implementation authority **false**. WT-019 (`/Users/lexsia/Documents/M55_WORKTREE-minimum-revenue-quality-v1`, `map/m55-minimum-revenue-quality-v1` @ `ac71d054556ebec06d6fa107fbe359a88052aca6`) is **COMPLETED** — MRQ mapping Revision 1 accepted **CLOSED GREEN**; retained reference/read-only; write authority **false**; MRQ implementation authority **false**; no remote branch. WT-020 (`/Users/lexsia/Documents/M55_WORKTREE-mrq-governance-alignment-v1`, `docs/m55-mrq-governance-alignment-v1`) is docs-only MRQ governance alignment; no product/source write authority. WT-013/WT-014/WT-015/WT-016/WT-017 remain retained read-only per prior gates. ACTIVE lane is **M55 MINIMUM-REVENUE-QUALITY**; MRQ implementation worktree is **not created** and **not authorized**; patch scope is **not frozen**; sales launch is **not authorized**.

> **HISTORICAL SNAPSHOT — dated 2026-07-27; valid only through 2026-07-31; superseded 2026-08-01 by the CURRENT paragraph above. Do not treat as current.**
>
> WT-011 was, at that time, the sole ACTIVE implementation lane (Self funnel Growth / share on `feat/m55-self-funnel-growth-share-v1`; live HEAD validated as descendant of reviewed implementation tip `d7af28a…`; PR #81 was unmerged at that time). WT-001 Self funnel operational baseline was **COMPLETED** (PR #80 merged; Production classified `OPERATIONAL_BASELINE`). WT-010 Product Authority Pack was **COMPLETED** (PR #79 merged; retained infrastructure). WT-006 paid-lp remained **PAUSED**. WT-009 Build Week remained **FROZEN**.

### Lifecycle status values

`PRIMARY_MAIN` · `ACTIVE` · `PAUSED` · `STALE` · `DO_NOT_USE` · `CLEANUP_PENDING` · `COMPLETED_REMOVABLE` · `UNKNOWN`

`PRIMARY_MAIN` in entry notes means **PRIMARY_MAIN_HOME designation**, not “this worktree is on branch `main` right now”.

### Documented post-merge transition (historical)

Historical post-merge transition snapshots remain recorded for audit.

> **HISTORICAL, valid through 2026-07-31:** at that time, WT-011 was the ACTIVE Growth Share implementation lane after the Self funnel operational baseline merge.

**CURRENT (2026-08-01):** WT-011 Growth Share implementation is **COMPLETED** — PR #81 **MERGED**. It is **not** an ACTIVE implementation lane. See the table below for the full merge sequence including this transition.

| Phase | branch | HEAD | Agent action |
|---|---|---|---|
| Historical (pre-merge PR #74) | `docs/m55-commercial-funnel-ssot-v1` | `86260d5…` | **Historical** — PR #74 merged |
| Post-merge historical baseline | `main` | `575791f2…` | Historical verified baseline after PR #74 squash merge — not current live remote main |
| PR #76 merge / prior origin/main | `main` (remote) | `38447ab1…` | Merge commit; parents `75c43f0…` + `bf1ab0ff…` |
| Documented post-merge transition branch (preserved) | `chore/m55-worktree-registry-post-merge-transition-rev1` | `6ad4e14…` | PR #77 feature HEAD; docs-only transition — **preserved historical** |
| Authority Pack PR #79 merge | `main` (remote) | `355462b…` | **MERGED** — Product Authority Pack complete |
| Self funnel PR #80 merge | `main` (remote) | `6965590…` | **MERGED** — Self free→Premium **OPERATIONAL_BASELINE** |
| Self funnel Growth PR #81 merge | `main` (remote) | `bf5ef09…` | **MERGED** (2026-08-01T08:38:25Z) — Self funnel Growth / share (WT-011) commercial + technical closure complete; feature head `6770c40…`; pre-merge main `110fa79…` |
| PR #81 post-merge docs-only transition | `chore/m55-pr81-post-merge-transition-v1` | `234f01cfc40b35c94dff871d3c18eee4afb73dd8` | WT-012 — **COMPLETED**, retained read-only |
| PR #83 merge | `main` (remote) | `dd08f5dfde1e3a9425db6baa9d4310d074376c03` | **MERGED** — PA-2A control-plane lane CLOSED GREEN; feature branch retained |
| Commercial-surface governance freeze completion | `chore/m55-pa-reconciliation-pr81-v1` | `85210e7a45472a9cf6fab16e51c9a397c3f97025` | WT-013 — freeze CLOSED GREEN; retained read-only audit/review |
| IND-FREE implementation base | `feat/m55-ind-free-commercial-convergence-v1` | `326ccd6f1c97911ba82281dbc0a9d4dd835ed782` | WT-014 — PR #86 **MERGED**; retained read-only; feature branch preserved |
| PR #86 merge | `main` (remote) | `10e601465b66b8132a7ceb845300af1924ba468b` | **MERGED** — IND-FREE commercial convergence CLOSED GREEN; feature head `326ccd6…`; pre-merge main `d8985a9…` |
| PR #86 post-merge docs-only transition (v1 superseded) | `docs/m55-pr86-post-merge-transition-v1` | `f1c24449185a59c79e42d7a420a41809799da615` | WT-015 — PR #87 **CLOSED**/unmerged; superseded by PR #88; retained read-only |
| PR #86 post-merge replacement transition (v2 completed) | `docs/m55-pr86-post-merge-transition-v2` | `aa80853962b5d2df8fcb40fb482e807af4f6f788` | WT-016 — PR #88 **MERGED**; retained read-only |
| PR #88 merge | `main` (remote) | `060fee287355eb00573d968445fcc374510d185d` | **MERGED** — MERGE COMMIT; parents `e26f17b…` · `aa80853…`; Production deployment id **5738008464** READY |
| PR #88 post-merge lifecycle reconciliation | `docs/m55-pr88-post-merge-lifecycle-v1` | gate-time operational authority | WT-017 — docs-only; no product/source write authority |
| Premium public terminology | `fix/m55-premium-public-terminology-v1` | `af33c722e6e585f51f8e51297055d090606fd32e` | WT-018 — **COMPLETED**; PR #90 **MERGED** @ `ac71d054556ebec06d6fa107fbe359a88052aca6`; retained read-only |
| PR #90 merge | `main` (remote) | `ac71d054556ebec06d6fa107fbe359a88052aca6` | **MERGED** — MERGE COMMIT; parents `6286a74…` · `af33c72…`; Production deployment id **5762301638** READY; P0 terminology **CLOSED GREEN** |
| MRQ read-only mapping | `map/m55-minimum-revenue-quality-v1` | `ac71d054556ebec06d6fa107fbe359a88052aca6` | WT-019 — mapping Revision 1 **CLOSED GREEN**; retained reference/read-only; no remote branch |
| MRQ governance docs alignment | `docs/m55-mrq-governance-alignment-v1` | gate-time operational authority | WT-020 — docs-only; no product/source write authority |

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
| current origin/main (2026-07-27 verification-time snapshot; not current as of 2026-08-01 — see `bf5ef09f…` in "Production main authority" above) | `696559009367a6ac445dc7a07876590b16cd8488` |
| upstream | `origin/feat/m55-self-free-to-premium-funnel-v1` @ `fda934d…` |
| cleanliness | **clean** |
| locked / prunable | none |
| lifecycle | **COMPLETED** · **PRIMARY_MAIN_HOME** (superseded **ACTIVE** baseline) |
| operational state | **OPERATIONAL_BASELINE_MERGED** |
| purpose | **PRIMARY_MAIN_HOME** — Self free→Premium operational baseline (merged; reference only) |
| related lane / PR | PR #80 **MERGED** @ `6965590…` · feature tip `fda934d…` · backup `refs/backup/m55-self-funnel-pre-main-sync-rev1` retained |
| product implementation authorized | **false** — no new Growth work and no further Self Funnel implementation authorized from this worktree; WT-011 Growth/share is **COMPLETED** (PR #81 MERGED) and must **not** receive new implementation |
| allowed operations | read-only inspection · historical baseline reference |
| prohibited operations | append growth commits · Stripe / webhook / DB / Clerk / env / Pair runtime / WT-009 edits · routing new product work to WT-011 |
| removal eligibility | NO — retain as PRIMARY_MAIN_HOME / merged baseline reference |
| next gate | none for product implementation — current ACTIVE worktree is **WT-013** for the read-only commercial-surface governance freeze; Pair and commerce remain not authorized |
| notes | PR #80 merged to `main`. Production classified **OPERATIONAL_BASELINE** (not final commercial launch). Do not continue growth by appending to this merged feature branch. Do **not** restart Growth or Self Funnel implementation on WT-011. |

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
| related lane / PR | PR #75 — **OPEN** (frozen reference-only by Human decision; **not blocking MRQ**) |
| allowed operations | read-only inspection · Control Plane canonical external audit · PR/check status read-only observation |
| prohibited operations | source/docs/test/config edit · commit · push · rebase · force-push · merge to `main` · product runtime change · Production change · worktree removal |
| removal eligibility | NO — frozen reference-only; not blocking MRQ; requires explicit Human approval in separate gate for retirement |
| notes | Build Week submission evidence preserved under Human decision. Stronger than typical PAUSED: read-only inspection only; no edit/commit/push/rebase/merge without explicit Human gate; no merge to `main`; no product/runtime/Production changes; auto-cleanup/remove prohibited. PR #75 disposition: **FROZEN_REFERENCE_ONLY** — not blocking MRQ. Removal only after explicit Human gate. |

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

**CURRENT (2026-08-01) — PR #81 MERGED; this lane is COMPLETED, not ACTIVE.**

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1` |
| branch | `feat/m55-self-funnel-growth-share-v1` |
| feature head | `6770c40ac52ce5e222e4f485b8c9c83aa3814d48` |
| merge commit | `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149` — **MERGED** at `2026-08-01T08:38:25Z` |
| pre-merge main | `110fa79fe45ef24481a7fd1fd8e19cebbcb98d39` |
| upstream | `origin/feat/m55-self-funnel-growth-share-v1` — remote feature ref equals live local HEAD `6770c40…` (unchanged post-merge; retained temporarily) |
| cleanliness | **clean** (verification-time snapshot, 2026-08-01) |
| locked / prunable | none |
| lifecycle | **COMPLETED** — PR #81 MERGED; **not** ACTIVE; **not** the current implementation lane |
| operational state | **RETAINED_FOR_HANDOFF_VERIFICATION** |
| purpose | Sitewide commercial consistency audit → unified Growth Share commercial UX implementation — **completed** |
| related lane / PR | Base: PR #80 **MERGED** · [PR #81](https://github.com/lexsia228/m55-web/pull/81) **MERGED** @ `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149` (2026-08-01T08:38:25Z) — **not** unmerged |
| product implementation authorized | **false** — implementation complete; retained for handoff verification only |
| retention reason | new-thread handoff verification and separately authorized closeout |
| allowed operations | read-only inspection · new-thread handoff verification |
| prohibited operations | further implementation · Stripe / webhook / DB / Clerk / env / Pair runtime · live purchase · append to merged PR #80 or PR #81 branches |
| removal eligibility | **NO** — retained temporarily pending new-thread handoff verification and a separately authorized closeout; not yet eligible for worktree/branch deletion |
| next gate | **no product implementation** — retained temporarily for verified context-import closeout only; new-thread cutover remains prohibited until Product Authority reconciliation; do **not** route new Growth / Self Funnel / active development here |
| Production status | Growth code **is now Production** (merged via PR #81) |
| notes | `implementationReviewedTip` (historical field, see snapshot below) records the reviewed Growth Share implementation baseline (`d7af28a…`) — **not** a permanently current branch HEAD. Authority-only descendant commits passed preflight without registry SHA self-invalidation. Historical Commit 2 provenance `b710dc543c02572a038170feb562a0a6514a313f`. |

> **HISTORICAL SNAPSHOT — dated 2026-07-27; valid only through 2026-07-31; superseded 2026-08-01 by the CURRENT table above. Do not treat any field below as current.**
>
> | Field (as of 2026-07-27) | Value (as of 2026-07-27) |
> |---|---|
> | implementationReviewedTip | `d7af28a59755076b6269e93edfba03297eb98084` |
> | liveHeadSource | Git |
> | headValidation | DESCENDANT_OF_REVIEWED_IMPLEMENTATION_TIP |
> | baseline | `main` @ `696559009367a6ac445dc7a07876590b16cd8488` |
> | current origin/main | `696559009367a6ac445dc7a07876590b16cd8488` |
> | lifecycle | `ACTIVE` — superseded 2026-08-01, now `COMPLETED` |
> | operational state | `GROWTH_SITEWIDE_COMMERCIAL_AUDIT_THEN_UNIFIED_UX` — superseded 2026-08-01, now `RETAINED_FOR_HANDOFF_VERIFICATION` |
> | related lane / PR | PR #81 **unmerged** / branch-local — superseded 2026-08-01, now **MERGED** |
> | product implementation authorized | `true` for Growth scope only — superseded 2026-08-01, now `false` |
> | Production status (as of 2026-07-27) | "Growth code is not Production" — superseded 2026-08-01, Growth code is now Production |

### WT-012 — PR #81 post-merge SSOT and thread handoff

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-pr81-post-merge-transition-v1` |
| branch | `chore/m55-pr81-post-merge-transition-v1` |
| branch creation base (`origin/main` at worktree creation) | `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149` — **immutable**; PR #81 product-implementation merge commit; **not** this branch's current HEAD; later docs-only commits do not redefine the product implementation baseline |
| configured upstream (`@{upstream}`) | `origin/main` — verified via `git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'` |
| same-name remote branch (`origin/chore/m55-pr81-post-merge-transition-v1`) | **absent** — `git ls-remote --heads origin chore/m55-pr81-post-merge-transition-v1` returned empty; do **not** conflate configured upstream=`origin/main` with existence of a same-name remote feature branch |
| push authorization | **none** in this gate — no push / PR / merge |
| Pre-corrective reviewed HEAD (first docs-only commit) | `4552cb23cc01b1f27b0e1d360d8dc6594aa9a3fb` |
| Current starting HEAD for residual-ambiguity corrective gate | `86d6f8fdfa6c92586eefe7756e68aa8084b01667` (second docs-only commit; boundary correction) |
| Final live HEAD after this residual corrective commit | **live HEAD (Git)** — advances by exactly one commit from `86d6f8fd…`; verify via `git rev-parse HEAD`; do not fabricate this commit's SHA inside this file |
| divergence from `origin/main` (at start of this residual corrective gate) | 0 behind / 2 ahead; after this residual corrective commit: 0 behind / 3 ahead |
| cleanliness | **clean** (verification-time snapshot, 2026-08-01) |
| locked / prunable | none |
| lifecycle | **COMPLETED** — retained read-only |
| operational state | **POST_MERGE_TRANSITION_COMPLETE** — no longer ACTIVE; no source implementation |
| purpose | SSOT reconciliation · post-merge record · ChatGPT thread handoff · residual ambiguity correction (this record) · independent review |
| related lane / PR | Follows merged [PR #81](https://github.com/lexsia228/m55-web/pull/81) @ `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149`; not itself a PR at creation of this record |
| product implementation authorized | **false** — docs-only; no source/test/workflow change authorized; Product Authority reconciliation is later and separate; new-thread cutover remains prohibited |
| allowed operations | read-only historical inspection only |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · `.product-authority/**` edits or regeneration · edits to WT-009 or WT-011 worktrees · push / PR / merge / rebase / amend / reset · Production mutation · Pair implementation |
| removal eligibility | deferred — retain until the WT-013 governance transition/reuse freeze is complete and removal is separately authorized |
| next gate | none — transition complete; do not route active work here |
| notes | Created to execute `CATEGORY-1-M55-PR81-POST-MERGE-SSOT-AND-THREAD-HANDOFF-IMPLEMENTATION-REV1`; boundary-corrected by `CATEGORY-1-M55-PR81-POST-MERGE-SSOT-HANDOFF-CORRECTIVE-PATCH-REV1`; residual ambiguity corrected by `CATEGORY-1-M55-PR81-POST-MERGE-SSOT-HANDOFF-RESIDUAL-AMBIGUITY-CORRECTIVE-PATCH-REV2`. Branch creation base verified as `bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149`. |

### WT-013 — Retained read-only audit and review worktree

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-pa-reconciliation-pr81-v1` |
| branch | `chore/m55-pa-reconciliation-pr81-v1` |
| HEAD | `85210e7a45472a9cf6fab16e51c9a397c3f97025` |
| origin/main | `10e601465b66b8132a7ceb845300af1924ba468b` |
| cleanliness | **clean** — retained read-only |
| lifecycle | **PAUSED** — retained read-only |
| operational state | **RETAINED_READ_ONLY_AUDIT_AND_REVIEW** |
| purpose | Retained read-only audit, contract review, actual-diff review and historical inspection only |
| related lane / PR | PR #83 **MERGED**; PA-2A control-plane lane **CLOSED GREEN**; commercial-surface alias/reuse freeze **CLOSED GREEN**; feature branch retained after merge |
| product implementation authorized | **false** — no application-source write authority |
| Cursor write lane | **none** |
| allowed operations | read-only audit · contract review · actual-diff review · historical inspection only |
| prohibited operations | application-source write · Product Authority input/generated edit · Production operation · commerce activation · commit/push/PR/merge without a later explicit gate |
| removal eligibility | **NO** — retain until separately authorized retirement gate |
| next gate | See `M55_CURRENT_STATE.md` → `NEXT SINGLE ACTION`. |
| notes | WT-013 is not an implementation worktree and has no authority over active IND-PAID implementation. |

### WT-014 — IND-FREE commercial convergence implementation

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-ind-free-commercial-convergence-v1` |
| branch | `feat/m55-ind-free-commercial-convergence-v1` |
| HEAD | `326ccd6f1c97911ba82281dbc0a9d4dd835ed782` — authorized PR #86 feature head; feature branch preserved |
| upstream | `origin/feat/m55-ind-free-commercial-convergence-v1` — remote feature ref equals live local HEAD |
| cleanliness | **clean** — retained read-only |
| lifecycle | **COMPLETED** — retained read-only |
| operational state | **IND_FREE_COMMERCIAL_CONVERGENCE_CLOSED_GREEN** |
| lane | IND-FREE — 個人無料結果のcanonical naming・conversion copy・measurement convergence |
| related lane / PR | PR #86 **MERGED** @ `10e601465b66b8132a7ceb845300af1924ba468b`; merge parents `d8985a9c9102ee5a65fd748bb5623ee293bd849c` · `326ccd6f1c97911ba82281dbc0a9d4dd835ed782`; merge method **MERGE COMMIT**; Premium proof current and accepted; Experience Control Plane violation count **0**; Production deployment id **5729622031** · Production SHA `10e601465b66b8132a7ceb845300af1924ba468b` · state **READY** · canonical `/core` GET **HTTP 200** |
| product implementation authorized | **false** — implementation completed; no additional source-write authority |
| write authority | none — retained read-only |
| review authority | WT-013 retained read-only audit and review only |
| allowed operations | read-only historical inspection only |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · concurrent implementation writes · commit · push · PR creation/update · merge · DB/Stripe/Clerk/env change · Production GET/POST · deployment · COMP-FREE/COMP-PAID edits · new system/registry/wrapper/renderer/component/SSOT |
| removal eligibility | deferred — retain until separately authorized retirement gate |
| next gate | none for product implementation — current ACTIVE lane is **IND-PAID** per `M55_ROADMAP.md` |
| notes | Do not delete the feature branch or worktree. Completed IND-FREE proof, UI and visual review must not be reopened absent a new relevant delta. |

### WT-015 — PR #86 post-merge SSOT transition (v1 superseded)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-pr86-post-merge-transition-v1` |
| branch | `docs/m55-pr86-post-merge-transition-v1` |
| HEAD | `f1c24449185a59c79e42d7a420a41809799da615` |
| branch creation base (`origin/main` at worktree creation) | `10e601465b66b8132a7ceb845300af1924ba468b` — **immutable**; PR #86 product-implementation merge commit |
| cleanliness | **clean** — retained read-only |
| lifecycle | **PAUSED** — superseded transition attempt |
| operational state | **POST_MERGE_TRANSITION_SUPERSEDED_CLOSED_UNMERGED** |
| purpose | PR #86 post-merge SSOT transition attempt (v1); superseded by PR #88 |
| related lane / PR | PR #87 **CLOSED** and **unmerged** @ `f1c24449185a59c79e42d7a420a41809799da615`; superseded by PR #88; not product implementation |
| product implementation authorized | **false** — docs-only; write authority **none** |
| allowed operations | read-only historical inspection only |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · `.product-authority/**` edits or regeneration · edits to WT-009 · WT-014 · WT-016 or WT-017 worktrees · Production mutation · Pair implementation · commit/push/PR merge/branch update without a later explicit gate |
| removal eligibility | **NO** — branch and worktree retained; retirement/deletion prohibited without separate authorization |
| next gate | none involving PR #87 merge or branch update; retirement only by separate authorization |
| notes | Transition-only worktree per WT-012 precedent. Do not route implementation work here. |

### WT-016 — PR #86 post-merge replacement transition delta (v2 completed)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-pr86-post-merge-transition-v2` |
| branch | `docs/m55-pr86-post-merge-transition-v2` |
| branch creation base (`origin/main` at worktree creation) | `10e601465b66b8132a7ceb845300af1924ba468b` — **immutable**; PR #86 product-implementation merge commit |
| immutable completed PR #88 head | `aa80853962b5d2df8fcb40fb482e807af4f6f788` |
| initial transition commit | `c6db50a359709e722ae70aedfb610c2c61532b1c` — **immutable** creation fact; initial tree `2057c01e55540ef6da1780f4590a535a80c2e598` |
| cleanliness | **clean** — retained read-only |
| lifecycle | **COMPLETED** — retained read-only |
| operational state | **PR88_MERGED_TRANSITION_COMPLETE_RETAINED_READ_ONLY** |
| purpose | Completed PR #88 replacement transition for PR #87 registry reconciliation |
| related lane / PR | PR #88 **MERGED** @ `060fee287355eb00573d968445fcc374510d185d` (MERGE COMMIT; parents `e26f17b9001166a54171e36ce0d8fd3481315dfa` · `aa80853962b5d2df8fcb40fb482e807af4f6f788`); PR #87 **CLOSED**/unmerged; no product implementation |
| product implementation authorized | **false** — docs-only; write authority **none** |
| allowed operations | read-only historical inspection only |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · `.product-authority/**` edits or regeneration · edits to WT-009 · WT-013 · WT-014 · WT-015 or WT-017 worktrees · Production mutation · force-push · merge without separate gate |
| removal eligibility | **NO** — branch and worktree retained; retirement/deletion prohibited without separate authorization |
| next gate | none for product implementation — current ACTIVE lane is **IND-PAID** per `M55_ROADMAP.md`; retirement only by separate authorization |
| notes | Replacement transition worktree per WT-012/WT-015 precedent. Do not route product implementation here. |

### WT-017 — PR #88 post-merge lifecycle reconciliation

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-pr88-post-merge-lifecycle-v1` |
| branch | `docs/m55-pr88-post-merge-lifecycle-v1` |
| branch creation base (`origin/main` at worktree creation) | `060fee287355eb00573d968445fcc374510d185d` — **immutable**; PR #88 merge commit |
| cleanliness | verification-time snapshot only |
| lifecycle | **DOCS_ONLY** — exact phase is gate-time operational authority |
| operational state | **DOCS_ONLY_POST_MERGE_LIFECYCLE_RECONCILIATION** |
| purpose | Docs-only post-merge lifecycle reconciliation worktree |
| related lane / PR | Follows merged PR #88 @ `060fee287355eb00573d968445fcc374510d185d`; not product implementation |
| product implementation authorized | **false** — docs-only; no product/source write authority |
| allowed operations | authorized docs-only SSOT lifecycle maintenance on the three allowlisted SSOT paths |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · `.product-authority/**` edits or regeneration · edits to WT-009 · WT-013 · WT-014 · WT-015 or WT-016 worktrees · Production mutation · Pair implementation |
| removal eligibility | deferred — retirement requires separate authorization |
| next gate | See `M55_CURRENT_STATE.md` → `NEXT SINGLE ACTION` |
| notes | Exact branch/head/PR phase is gate-time operational authority and is not recursively embedded as durable current-tip claim inside this registry snapshot. Do not route product implementation here. |

### WT-018 — Premium public terminology (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-premium-public-terminology-v1` |
| branch | `fix/m55-premium-public-terminology-v1` |
| branch creation base (`origin/main` at worktree creation) | `ada0510c77f73dd992dc6901d1a04389a2cf7e74` — **immutable** |
| feature head | `af33c722e6e585f51f8e51297055d090606fd32e` |
| PR #90 merge commit | `ac71d054556ebec06d6fa107fbe359a88052aca6` — **MERGED** @ `2026-08-05T13:13:10Z` |
| upstream | `origin/fix/m55-premium-public-terminology-v1` @ `af33c722e6e585f51f8e51297055d090606fd32e` |
| cleanliness | **clean** — retained read-only |
| lifecycle | **COMPLETED** — retained read-only |
| operational state | **PREMIUM_PUBLIC_TERMINOLOGY_CLOSED_GREEN** |
| purpose | Remove `保存版` from public surfaces; canonical Premium terminology; stored-snapshot display normalization — **completed** |
| related lane / PR | [PR #90](https://github.com/lexsia228/m55-web/pull/90) **MERGED** @ `ac71d054556ebec06d6fa107fbe359a88052aca6`; feature head `af33c722e6e585f51f8e51297055d090606fd32e`; Production deployment id **5762301638** · Production SHA `ac71d054556ebec06d6fa107fbe359a88052aca6` · public Premium terminology **GREEN** |
| product implementation authorized | **false** — implementation completed; no additional source-write authority |
| write authority | none — retained read-only |
| P0 Premium terminology | **CLOSED GREEN** |
| allowed operations | read-only historical inspection only |
| prohibited operations | further terminology implementation · commit · push · PR · merge · deploy · DB/Stripe/Clerk/env · Pair commerce · edits outside prior allowlist · WT-016 reuse |
| removal eligibility | deferred — retain until separately authorized retirement gate |
| next gate | none for product implementation — see `M55_CURRENT_STATE.md` → `NEXT SINGLE ACTION` |
| notes | Free/Pair `見取り図` unchanged. PR #90 merge does not authorize sales launch, checkout, 4242, or MRQ implementation. |

### WT-019 — Minimum Revenue Quality read-only mapping (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-minimum-revenue-quality-v1` |
| branch | `map/m55-minimum-revenue-quality-v1` |
| branch creation base (`origin/main` at worktree creation) | `ac71d054556ebec06d6fa107fbe359a88052aca6` — **immutable**; PR #90 merge commit |
| mapping base | `ac71d054556ebec06d6fa107fbe359a88052aca6` |
| mapping head | `ac71d054556ebec06d6fa107fbe359a88052aca6` |
| upstream | **absent** — `git ls-remote --heads origin map/m55-minimum-revenue-quality-v1` returned empty |
| cleanliness | **clean** — retained reference/read-only |
| lifecycle | **COMPLETED** — retained reference/read-only |
| operational state | **MINIMUM_REVENUE_QUALITY_MAPPING_READONLY_CLOSED_GREEN** |
| lane | M55 MINIMUM-REVENUE-QUALITY — read-only mapping Revision 1 |
| purpose | MRQ capability classification · reuse matrix · no_op_register — mapping accepted; reference only |
| related lane / PR | Follows PR #90 @ `ac71d054556ebec06d6fa107fbe359a88052aca6`; not product implementation |
| product implementation authorized | **false** |
| MRQ implementation authority | **false** |
| write authority | none — retained reference/read-only |
| allowed operations | read-only historical inspection · mapping reference only |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · MRQ implementation · commit · push · PR creation/update · merge · DB/Stripe/Clerk/env change · Production GET/POST · deployment · patch-scope freeze · sales launch |
| removal eligibility | deferred — retain until separately authorized retirement gate |
| next gate | none for MRQ implementation — see `M55_CURRENT_STATE.md` → `NEXT SINGLE ACTION` |
| notes | Do not designate WT-019 as write authority or MRQ implementation worktree. Future MRQ implementation worktree is **not created** and **not authorized**. |

### WT-020 — MRQ governance docs alignment (DOCS_ONLY)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-mrq-governance-alignment-v1` |
| branch | `docs/m55-mrq-governance-alignment-v1` |
| branch creation base (`origin/main` at worktree creation) | `ac71d054556ebec06d6fa107fbe359a88052aca6` — **immutable**; PR #90 merge commit |
| upstream | `origin/main` — local docs-only branch; no remote branch created in this gate |
| cleanliness | verification-time snapshot only |
| lifecycle | **DOCS_ONLY** |
| operational state | **MRQ_GOVERNANCE_DOCS_ALIGNMENT** |
| purpose | MRQ governance docs alignment only — registry · current state · roadmap · decision log · stale contract correction |
| related lane / PR | Follows PR #90 @ `ac71d054556ebec06d6fa107fbe359a88052aca6`; PR #68 **CLOSED**/superseded/unmerged; not product implementation |
| product implementation authorized | **false** — docs-only; no product/source write authority |
| MRQ implementation authority | **false** |
| write authority | none for product/source — authorized docs-only edits on five-file allowlist only during active gate |
| allowed operations | authorized docs-only SSOT governance alignment on allowlisted paths |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · `.product-authority/**` edits or regeneration · MRQ implementation · commit/push/PR/merge without separate gate · checkout/4242 · sales launch |
| removal eligibility | deferred — retirement requires separate authorization |
| next gate | See `M55_CURRENT_STATE.md` → `NEXT SINGLE ACTION` |
| notes | Governance docs alignment worktree only. Does not receive product implementation authority. |

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
