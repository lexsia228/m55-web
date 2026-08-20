# M55 Worktree Registry

Status: **Worktree authority (Tier E — operational)**  
Last verified: **2026-08-20 G3-04 CLOSED GREEN self-closing PR** (`git worktree list --porcelain`; branch `feat/m55-g3-04-copy-safety-v1` · implementation head **`03ae78dbd91d63ffc411d389dfd9e276525155f2`** · base `origin/main` **`d33e9d3dc685e733826348b128faa9184a3b0072`** · Preview `https://m55-webv2-hrohtt4ek-m55-official.vercel.app` **READY** · WT-045 **CLOSES_WITH_THIS_PR_MERGE**)
Source command: `git worktree list --porcelain` + per-worktree `git status --porcelain`, `@{upstream}`, `rev-list --left-right --count origin/main...HEAD`

## How to read this registry

### Production main authority (Git remote)

- **Branch:** `origin/main`
- **Current live remote main (2026-08-19 post-PR-#145):** `9ca5b57d72a7c0b31ec96a8448872e73d3e2ab7f` — PR #145 **MERGED** · self-closing PR #144 Tier-E / docs/control-plane settlement only · Production deployment `dpl_7xHKu8cQ1rtARxmSS8JyozA3VNC5` **READY** · Human Sales Launch authority **SELL** (inherited from PR #144 closure)
- **Previous live remote main (2026-08-19 post-PR-#144; historical):** `ecc3e37b43414e2a56941377c35235b965047aff` — PR #144 **MERGED** · feature head `f7ca4d44882e5820afdc3836ee8b7be2c4e30d86` · commercial quality consolidation **CLOSED GREEN** · Production deployment `dpl_8CvJAXiT84GYvU1NUdEds8XnZLpg` **READY** · superseded by PR #145 merge @ `9ca5b57…` — **not** current live remote main
- **Previous live remote main (2026-08-19 post-PR-#142/#143; historical):** `22b00a6bfc9190f713633e694d90d4dbfa2c8a56` — PR #142 **MERGED** @ `32f22da527033a0ca094bb717ab2e160c7006d5e` · PR #143 **MERGED** · feature head `156dd18ea17952b8398e2e2b608abc3f1b605226` · Wave A copy clarity **MERGED** · superseded by PR #144 merge @ `ecc3e37b…`
- **Previous live remote main (2026-08-19 post-PR-#141; historical):** `4edcf631c5bccfba18f16db8767d20f83bc104f0` — PR #141 **MERGED** · G3-02 **CLOSED GREEN** · superseded by PR #142/#143 merges @ `22b00a6…`
- **Previous live remote main (2026-08-18 post-PR-#139; historical):** `183328ade4cbbaf69975bdf33883bdad3caf19ad` — PR #139 **MERGED** · G2 Public Terminology Long-Tail **CLOSED GREEN** · superseded by current `origin/main` @ `39f7f3d…`
- **Previous live remote main (2026-08-18 post-PR-#137; historical):** `773dd67222ba1fe81824c10be6457a33e715650f` — PR #137 **MERGED** · G1 Revenue Outcome Observability **CLOSED GREEN** · superseded by PR #138/#139 merges
- **Production / PR #135 merge baseline (2026-08-18; historical):** `a6ddfd72603c6dc14b7c57df6ab44db2ec604d0c` — PR #135 **MERGED**; Production diagnostics observed @ that SHA during Commercial Acceptance closure — **not** current live remote main
- **Absolute residual-cleanup baseline remote main / Production observation (2026-08-16):** `9d7eb0688dc26a459b87113c70a5c3e2ae2a33ea` — PR #132 **MERGED**; Production diagnostics SHA matched at `2026-08-16T14:26:28.841Z`; `de37b1a..9d7eb06` is docs/evidence/governance only. This residual cleanup is lifecycle/docs-only and does not redefine Product closure.
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
- **Previous live remote main (PR #97 merge gate, 2026-08-10; historical):** `faef130a335ce6e33cfd784d5318f874beeb70ad` — PR #97 merge commit on `origin/main` (parents `4967d963fef3ae832b420e8ff9d71cd732bf66db` · `5f0454ee32159873f58d08624ca49ae858ab714f`) — **not** last verified origin/main
- **Last P2 settlement origin/main (PR #99 merge gate, 2026-08-10; historical):** `2d14404d62ab7b265e07729448d6db602a055cce` — PR #99 merge commit (parents `3cf560691dd11d35b26077ec6c5e4686a571dae5` · `21744e195f08aeda03f23b7972bedcbf227aaaaa`); Last P2 settlement Production deployment **AA99Xfx9uL5ne2tbpQztRkia2eYx** · Production SHA `2d14404d62ab7b265e07729448d6db602a055cce` · state **SETTLED GREEN** — **not** last verified origin/main
- **Last verified origin/main (`2026-08-11T04:45:05Z`):** `286cb1052972e18cdbc5f8c99e6d41c78c3180d4` — verification-time snapshot; last verified Production SHA (diagnostics) `286cb1052972e18cdbc5f8c99e6d41c78c3180d4` · `vercel_env=production` · `vercel_branch=main` · deployment id **not reobserved in this gate**
- **Previous live remote main (pre-PR #97; historical):** `4967d963fef3ae832b420e8ff9d71cd732bf66db` — audit-index refresh on `origin/main` (parent `e1fd76b540f5290c065c1695e59f86394f20b3ba`; immutable PR #96 merge commit) — **not** current live remote main
- **Previous live remote main (PR #93 merge gate, 2026-08-07; historical):** `cb3cb45f17a0d5b5805b98af339517d43924df4a` — immutable PR #93 merge commit (Product Authority post-merge transition; merge tree `494066180e79d9468b81706c4bde02b8a274523a`); historical Production deployment id **5790526469** · Production SHA `cb3cb45f17a0d5b5805b98af339517d43924df4a` · state **success** — **not** current Production SHA
- **Governed Product Authority last observation (OBSERVATION_TIME_SNAPSHOT_VALID):** Production SHA `f3ab98a08e06cef7b16405d1adced387c23a29d2` · deployment **5777052896** · observedAt `2026-08-06T10:02:33.727Z` — **not reobserved in this settlement**; distinct from last verified Production diagnostics above
- **Previous live remote main (PR #90 merge gate, 2026-08-06; historical):** `ac71d054556ebec06d6fa107fbe359a88052aca6` — immutable PR #90 merge commit (parents `6286a745bbcf4ab15c006cc54946a05c4a4dc195` · `af33c722e6e585f51f8e51297055d090606fd32e`); Production deployment id **5762301638** · Production SHA `ac71d054556ebec06d6fa107fbe359a88052aca6` · state **READY** · public Premium terminology **CLOSED GREEN** — **not** current Production SHA
- **Authority Pack bootstrapStartHead (historical lane anchor):** `e6afe67262ebcee3353a3a43713f7ecf8369f26f` — lane creation anchor; **not** current live remote main
- Production code authority follows freshly verified `origin/main` — not conflated with historical baseline, bootstrap-era recorded remote, or local transition-branch identity.
- **Operational SHA note:** SHA values in this registry are **verification-time snapshots**. They are not immutable product contracts.

### PRIMARY_MAIN_HOME vs ACTIVE_BRANCH (do not conflate)

| Concept | Meaning |
|---|---|
| **Production main authority** | `origin/main` — freshly verified live SHA only; see historical baseline and recorded refs above |
| **PRIMARY_MAIN_HOME** | Designated baseline worktree path for post–PR #74 commercial funnel work |
| **ACTIVE_BRANCH** | The branch actively being edited in the current operational gate |

**CURRENT (2026-08-20 G3-04 CLOSED GREEN self-closing PR) — authoritative, read this first:** branch `feat/m55-g3-04-copy-safety-v1` · implementation head **`03ae78dbd91d63ffc411d389dfd9e276525155f2`** · base `origin/main` **`d33e9d3dc685e733826348b128faa9184a3b0072`**. **G3 REVISIT / RETENTION LOOP CLOSED GREEN** on merge of this PR. WT-045 **CLOSES_WITH_THIS_PR_MERGE** — operationally **CLOSED** on merge; physical worktree path **retained**. Preview `https://m55-webv2-hrohtt4ek-m55-official.vercel.app` **READY** @ implementation head. G3-01 **CLOSED GREEN / NO CODE DELTA** · G3-02 **CLOSED GREEN** · G3-03 **CLOSED GREEN** · G3-04 **CLOSED / KEEP_REJECTED**. G4/G5 **planned / not started** · G4 source **NOT YET AUTHORIZED**. Durable **ACTIVE lane after merge:** **G4 ORGANIC DISCOVERY**. **Current phase / NEXT SINGLE ACTION after merge:** **G4 ORGANIC DISCOVERY MAPPING-FIRST**. **No** follow-up docs-only settlement PR required.

**CURRENT (2026-08-20 G3-03 CLOSED GREEN self-closing PR) — historical:** branch `feat/m55-g3-runtime-proof-v1` · implementation head **`ec663849ad0ba755e0e8a002d10d8540e3a94e21`** · base `origin/main` **`9ca5b57d72a7c0b31ec96a8448872e73d3e2ab7f`**. G3-03 **CLOSED GREEN** on merge of this PR. WT-044 **CLOSES_WITH_THIS_PR_MERGE** — operationally **CLOSED** on merge; physical worktree path **retained**. Preview `dpl_6RHww1uMqbuQAka21VA687SPYror` **READY** @ implementation head. Runtime proof **GREEN** (matched identity restore · mismatched identity fail-closed · Safari TP representative). G3-01 **NOT AUTHORIZED** · G3-04 **REJECT_EXPOSURE**. G4/G5 **planned / not started**. Durable **ACTIVE lane after merge:** **G3 REVISIT / RETENTION LOOP**. **Current phase / NEXT SINGLE ACTION after merge:** **WAIT_FOR_HUMAN_G3_REMAINING_AUTHORIZATION**. **No** follow-up docs-only settlement PR required.

**CURRENT (2026-08-19 PR #144 post-merge Tier-E settlement) — historical:** `origin/main` **`ecc3e37b43414e2a56941377c35235b965047aff`**. PR #144 **MERGED** · feature head `f7ca4d44882e5820afdc3836ee8b7be2c4e30d86` · merge commit `ecc3e37b43414e2a56941377c35235b965047aff`. Production deployment `dpl_8CvJAXiT84GYvU1NUdEds8XnZLpg` **READY**. PR-head CI **GREEN**. Safari TP 27.0 representative commercial visual review completed; Human-found P1 defects were corrected before merge. Commercial quality consolidation **CLOSED GREEN**. **USER_VISIBLE_CLOSED_GREEN = YES** for the PR #144 commercial-quality consolidation scope. WT-042 **CLOSED / MERGED** — physical worktree path **retained** (not deleted). WT-043 **SETTLEMENT_ONLY / CLOSES_WITH_PR145_MERGE** — PR #145 docs vehicle; **not** the durable product lane; physical directory may remain; **no** follow-up docs-only PR is required merely to close WT-043; once PR #145 merges, WT-043 is operationally **CLOSED** even if the directory remains. **Do not invent a PR #145 merge SHA.** G1 **CLOSED GREEN** · G2 **CLOSED GREEN** · G3-02 **CLOSED GREEN** · Personal Free **CLOSED GREEN** · **DO NOT REOPEN** absent actual invalidation. **M55_PERSONAL_SALES_LAUNCH = SELL**. **G3 overall not complete** — G3-01 **NOT AUTHORIZED** · G3-03 **HOLD_RUNTIME_PROOF** · G3-04 **REJECT_EXPOSURE** / COPY_SAFETY_GATE_REQUIRED. Durable **ACTIVE lane:** **G3 REVISIT / RETENTION LOOP**. **Current phase / NEXT SINGLE ACTION:** **WAIT_FOR_HUMAN_G3_REMAINING_AUTHORIZATION** — remaining G3 sub-items stay blocked; G4 ORGANIC DISCOVERY remains planned (mapping-first; not started); no additional G3 source implementation; no Personal Free redesign. Settlement checkout path `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` · branch `chore/m55-pr144-post-merge-tier-e-settlement` · base `ecc3e37b43414e2a56941377c35235b965047aff` is **not** an ACTIVE product implementation lane. Pair Premium **NOT** activated · subscription **NOT** introduced · Compatibility PR #119 **OPEN** · commerce **OFF**. **No product source implementation** authorized. Live worktrees: **4** — see **FINAL LIVE WORKTREES** below.

**CURRENT (2026-08-19 commercial quality consolidation Tier-E reconciliation) — historical:** `origin/main` **`22b00a6bfc9190f713633e694d90d4dbfa2c8a56`**. PR #142 **MERGED** @ `32f22da527033a0ca094bb717ab2e160c7006d5e` · PR #143 **MERGED** · feature head `156dd18ea17952b8398e2e2b608abc3f1b605226` · Wave A copy clarity **MERGED** · accepted labels **自分に出やすい傾向** · **自分の基本的な傾向** · **レポートの読み方**. G1 **CLOSED GREEN** · G2 **CLOSED GREEN** · G3-02 **CLOSED GREEN** · Personal Free **CLOSED GREEN**. Production deployment **READY** @ then-current main. **M55_PERSONAL_SALES_LAUNCH = SELL**. **ACTIVE lane (at gate):** **M55_COMMERCIAL_QUALITY_CONSOLIDATION** · phase **READ_ONLY_REPO_WIDE_AUDIT**. **NEXT SINGLE ACTION (at gate):** **M55_COMMERCIAL_QUALITY_CONSOLIDATION_AUDIT**. G3-01 **NOT AUTHORIZED** · G3-03 **HOLD_RUNTIME_PROOF** · G3-04 **REJECT_EXPOSURE**. Superseded by PR #144 merge @ `ecc3e37b…` + this post-merge settlement.

**CURRENT (2026-08-19 PR #141 post-merge Tier-E reconciliation) — historical:** `origin/main` **`4edcf631c5bccfba18f16db8767d20f83bc104f0`**. PR #141 **MERGED** · G3-02 **CLOSED GREEN** · WT-041 docs gate — superseded by PR #142 merge + commercial quality consolidation lane.

**CURRENT (2026-08-18 PR #139 post-merge Tier-E reconciliation) — historical:** `origin/main` **`183328ade4cbbaf69975bdf33883bdad3caf19ad`**. PR #139 **MERGED** · WT-039 docs gate — superseded by G3-02 active lane + WT-040.

**CURRENT (2026-08-18 PR #137 post-merge Tier-E reconciliation) — historical:** `origin/main` **`773dd67222ba1fe81824c10be6457a33e715650f`** · PR #137 **MERGED** · WT-037 docs gate — superseded by PR #138 docs settlement @ `146e2d3…` and PR #139 product merge @ `183328a…`.

**CURRENT (2026-08-18 post-SELL control-plane reconciliation) — historical:** `origin/main` `a6ddfd72603c6dc14b7c57df6ab44db2ec604d0c` · PR #135 **MERGED** · WT-035 docs-only gate — superseded by PR #137 merge and post-merge reconciliation above.

**CURRENT (2026-08-18 post-Codex-review finalization) — historical:** Last Human-audited Production SHA / Commercial Acceptance audit Production baseline `078d9dd3dbd463f91fe8319e4e6a8b48beee05f8`. **M55_PERSONAL_SALES_LAUNCH = HOLD**. Bounded lane **M55_COMMERCIAL_ACCEPTANCE_CORRECTION** · branch `fix/m55-commercial-acceptance-revenue-v1` · PRE-FOLLOW-UP-COMMIT observed HEAD `2124e4fc…` · PR #135 **OPEN** · tracked dirty **51** · merge not authorized — superseded by PR #135 merge and post-SELL reconciliation above.

**CURRENT (2026-08-16 absolute residual-debt closure) — historical:** PR #120–#132 on `main` @ audit baseline `9d7eb0688dc26a459b87113c70a5c3e2ae2a33ea`. Product closure @ `de37b1a`; the post-product delta is docs/evidence/governance only. Personal Free **USER_VISIBLE_CLOSED_GREEN** · lane **SETTLED**. Lifecycle transition **COMPLETE** — Human signoff + personalization eval evidence archived in-repo; four superseded stashes dropped; obsolete local-only retention refs retired; PR #30 and PR #75 closed unmerged with remote branches retained. **ACTIVE implementation lane: none.** **NEXT:** **M55_MRQ_P3_ENTRY_PLANNING** (planning only). PR #119 Compatibility commerce is the sole intended open product/preflight PR. Live worktrees: **3** at that gate — superseded by 2026-08-17 live count **4**. WT-001 / WT-009 / WT-032 / WT-033 **REMOVED**. `M55_LIVE_UPGRADE_RPC_V2_SAME_TRANSACTION_RECOVERY` remains **CLOSED_GREEN** — do not reopen.

**CURRENT (2026-08-16 GPT handoff post-PR-#129) — historical:** PR #120–#129 on `main` @ `4e7d920ba5b41e55e37f2ad0e8c7f01eac7d78f2` (docs settlement). Product closure @ `de37b1a`. Production **GREEN** · canonical `https://m-55.jp`. Personal Free **USER_VISIBLE_CLOSED_GREEN** · lane **SETTLED** — **not ACTIVE**. `M55_LIVE_UPGRADE_RPC_V2_SAME_TRANSACTION_RECOVERY` is **CLOSED_GREEN** (`1e25d17`, 2026-08-13) — **not** next gate. WT-030 / WT-031 retained read-only. WT-033 **COMPLETED_REMOVABLE** — retain until Human archives `docs/evidence/M55_PERSONAL_FREE_HUMAN_SIGNOFF_2026-08-16/`. **NEXT:** **M55_POST_RELEASE_LIFECYCLE_TRANSITION** → **M55_MRQ_P3_ENTRY_PLANNING** (planning only). Independent PR #119 Compatibility commerce open.

**CURRENT (2026-08-16 post-PR-#128 USER_VISIBLE_CLOSED_GREEN) — historical:** PR #120–#128 on `main` @ `de37b1a0f6781cf763621b023af6b6c7617b7e5d`. Production **GREEN** — diagnostics SHA `de37b1a` · canonical `https://m-55.jp`. Personal Free user-visible quality **USER_VISIBLE_CLOSED_GREEN**. Personal Free commercial-quality lane **SETTLED** — **not ACTIVE**. WT-030 / WT-031 retained read-only. WT-033 **COMPLETED_REMOVABLE** after evidence disposition. **NEXT GATE (recorded):** `M55_LIVE_UPGRADE_RPC_V2_SAME_TRANSACTION_RECOVERY` — **stale forward ref**; superseded by GPT handoff @ PR #129+.

**CURRENT (2026-08-16 post-PR-#123-#124) — historical:** PR #120–#124 on `main` @ `743d0fd3fd85b267b759a6b4f3f6de757bc79976`. Production **GREEN** — GitHub deployment @ `743d0fd` · `2026-08-16T06:33:15Z` · canonical `https://m-55.jp`. Personal Free commercial individuality presentation **CLOSED_GREEN**. WT-030 / WT-031 retained read-only. **NEXT GATE:** `M55_LIVE_UPGRADE_RPC_V2_SAME_TRANSACTION_RECOVERY`.

**CURRENT (2026-08-16 post-Production-release) — historical:** PR #120 + PR #121 + PR #122 on `main` @ `9e40f1a8b334e48fcaa99da8ce82a9de88cf218f`. Production release **GREEN** — GitHub deployment `5921961780` @ `2026-08-15T15:38:39Z` · diagnostics SHA `9e40f1a`.

**CURRENT (2026-08-16 post-PR-#120-#121) — historical pre-release:** PR #120 + PR #121 **MERGED** to `main` @ `7bc2503bb3e188a9bc4cd83ff2b09c4964bbc87b`. Production deploy **not executed** in that settlement.

**CURRENT (2026-08-15 personalization-resolution-v2) — historical pre-merge:** ACTIVE implementation worktree `/Users/lexsia/Documents/M55_WORKTREE-personalization-resolution-v2` · branch `feat/m55-personalization-resolution-v2` · merged via PR #120 @ `679debf`.

**CURRENT (2026-08-15 personalization-resolution audit) — evidence frozen:** `/Users/lexsia/Documents/M55_WORKTREE-personalization-resolution-v1` · `audit/m55-personalization-resolution-v1` @ `80f99316b01e05d82c95e92fe4556a89483d4eba`.

**CURRENT (2026-08-14 free-inference-quality) — paused for resolution:** worktree `/Users/lexsia/Documents/M55_WORKTREE-free-inference-quality-v1` · branch `feat/m55-free-inference-quality-v1` · HEAD `d7512c0`. Human reopened **PERSONAL_FREE_INFERENCE_QUALITY** and **COMPATIBILITY_FREE_INFERENCE_QUALITY** only. Visual systems PR #116/#117 remain **CLOSED GREEN**. Compatibility commerce remains **OFF**. Human actual Free surface copy lock is **paused** pending personalization audit.

**CURRENT (2026-08-14 post-PR-#117) — historical:** PR #117 is **MERGED** @ `be6efb4fd7b2994a18fe0f175a536e773ee827ce`. Production SHA `be6efb4fd7b2994a18fe0f175a536e773ee827ce` · GitHub Production deployment `5903998364`. Four-surface visual identity is **CLOSED GREEN**. Personal Free / Personal Premium remain **CLOSED GREEN**. Compatibility Free is **CLOSED GREEN** on Production. Pair Premium remains **READY_BUT_GATED**. Compatibility commerce remains **OFF**. **NEXT GATE:** `M55_LIVE_UPGRADE_RPC_V2_SAME_TRANSACTION_RECOVERY`. Prior snapshots `511b54d` (PR #116) and `286cb105` retained as historical.

**CURRENT (2026-08-11) — historical for P3 entry snapshot:** PA-2A and commercial-surface alias/reuse freeze remain **CLOSED GREEN**. IND-FREE and P0 Premium terminology remain **CLOSED GREEN**. Product Authority main settlement is **COMPLETED** — PR #94 **MERGED** @ `93579b86a4a69ebf555bd089869d541f0c56f4a5`. P1A copy/framing is **CLOSED GREEN** — PR #95 **MERGED** @ `81692dab641aeddf4df625683a97761e8c97cc33`. P1B visual contrast is **CLOSED GREEN** — PR #96 **MERGED** @ `e1fd76b540f5290c065c1695e59f86394f20b3ba`. P1C draft persistence is **CLOSED GREEN** — PR #97 **MERGED** @ `faef130a335ce6e33cfd784d5318f874beeb70ad`. P2 Revenue-Ready is **CLOSED GREEN** — PR #99 **MERGED** @ `2d14404d62ab7b265e07729448d6db602a055cce`. P2 post-merge SSOT transition is **COMPLETE** — PR #100 **MERGED** @ `5e369f3ec1ce6ef4bd8f40a85ff7353cb5a6ca11`. **Last verified origin/main (`2026-08-11T04:45:05Z`):** `286cb1052972e18cdbc5f8c99e6d41c78c3180d4`. **Last verified Production SHA (diagnostics):** `286cb1052972e18cdbc5f8c99e6d41c78c3180d4` · `vercel_env=production` · `vercel_branch=main` · deployment id **not reobserved**. **Last P2 settlement:** deployment **AA99Xfx9uL5ne2tbpQztRkia2eYx** @ `2d14404d62ab7b265e07729448d6db602a055cce` · state **SETTLED GREEN**. WT-024 is **COMPLETED** read-only. WT-025 is **COMPLETED** read-only. WT-026 (`/Users/lexsia/Documents/M55_WORKTREE-mrq-p2-revenue-ready-v1`, `feat/m55-mrq-p2-revenue-ready-v1`) is **COMPLETED** read-only. WT-023 is **COMPLETED** read-only. WT-019 remains mapping reference/read-only. ACTIVE lane is **M55 MINIMUM-REVENUE-QUALITY — P3 entry/planning**. MRQ implementation is **not authorized** — P3 worktree **not created**. P3/checkout/4242/real purchase/sales launch remain **not authorized**.

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
| Product Authority reconciliation | `pa/m55-product-authority-reconciliation-v1` | `1574c13d493ed04f3823448cccaa887d232d4753` | WT-021 — PR #92 **MERGED**; retained read-only reference |
| PR #92 merge | `main` (remote) | `f3ab98a08e06cef7b16405d1adced387c23a29d2` | **MERGED** — Product Authority reconciliation; Production deployment id **5777052896** READY |
| Product Authority post-merge transition | `pa/m55-product-authority-post-merge-transition-v1` | `6625ce01f83890d12d2d3b3e0c31fe8e3f36a460` | WT-022 — **COMPLETED**; PR #93 **MERGED** @ `cb3cb45f17a0d5b5805b98af339517d43924df4a`; retained read-only |
| PR #93 merge | `main` (remote) | `cb3cb45f17a0d5b5805b98af339517d43924df4a` | **MERGED** — Product Authority post-merge transition; merge tree `494066180e79d9468b81706c4bde02b8a274523a`; current live Production deployment id **5790526469** · state **success** |
| PR #94 | `docs/m55-product-authority-post-merge-main-settlement-v1` | first settlement commit `e57e2c7…` | settlement delivery PR · lifecycle **OPEN** before merge / **MERGED** after merge · base `main` @ `cb3cb45f17a0d5b5805b98af339517d43924df4a` · current live PR state **dynamic** — reobserve from GitHub |
| Product Authority main settlement | `docs/m55-product-authority-post-merge-main-settlement-v1` | first settlement commit `e57e2c7…` | WT-023 — first settlement commit committed · pushed · PR #94 settlement delivery (lifecycle **OPEN** before merge / **MERGED** after merge) |
| PR #97 merge | `main` (remote) | `faef130a335ce6e33cfd784d5318f874beeb70ad` | **MERGED** — P1C draft persistence **CLOSED GREEN**; parents `4967d963fef3ae832b420e8ff9d71cd732bf66db` · `5f0454ee32159873f58d08624ca49ae858ab714f`; Production deployment id **5826935452** · Production SHA `faef130a335ce6e33cfd784d5318f874beeb70ad` · state **SETTLED GREEN** |
| P1C post-merge SSOT transition | `feat/m55-mrq-p1c-postmerge-ssot-v1` | `1f391371c9d04146878df40dc8a2499ccce5a76d` | WT-025 — **COMPLETED**; PR #98 **MERGED**; retained read-only |
| PR #99 merge | `main` (remote) | `2d14404d62ab7b265e07729448d6db602a055cce` | **MERGED** — P2 Revenue-Ready **CLOSED GREEN**; parents `3cf560691dd11d35b26077ec6c5e4686a571dae5` · `21744e195f08aeda03f23b7972bedcbf227aaaaa`; Production deployment **AA99Xfx9uL5ne2tbpQztRkia2eYx** · Production SHA `2d14404d62ab7b265e07729448d6db602a055cce` · state **SETTLED GREEN** |
| P2 post-merge SSOT transition | `feat/m55-mrq-p2-postmerge-ssot-v1` | gate-time operational authority | docs-only P2→P3 SSOT transition; **COMPLETED** (PR #100 **MERGED** @ `5e369f3ec1ce6ef4bd8f40a85ff7353cb5a6ca11`); not persistently registered until separate settlement convention requires |
| P3 entry live-binding reconciliation | `docs/m55-mrq-p3-entry-live-binding-reconciliation-v1` | gate-time operational authority | docs-only P3 entry live-binding snapshot refresh; not persistently registered until separate settlement convention requires |

**Drift rule:** unexplained branch/HEAD mismatch → STOP. Documented post-merge transition + freshly verified live remote main → update snapshot and continue (see `AGENTS.md`).

---

## Registered worktrees

### WT-001 — Self funnel merged baseline (REMOVED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1` |
| branch | `feat/m55-self-free-to-premium-funnel-v1` |
| HEAD | `fda934d8f31da715d3a4fb35681c7b3dff3dd41d` |
| baseline | `main` @ `355462b84d4a1a28ba6d8a37a3e6a40346a572d2` |
| current origin/main (2026-07-27 verification-time snapshot; not current as of 2026-08-01 — see `bf5ef09f…` in "Production main authority" above) | `696559009367a6ac445dc7a07876590b16cd8488` |
| upstream | `origin/feat/m55-self-free-to-premium-funnel-v1` @ `fda934d…` |
| cleanliness | **historical pre-removal snapshot: clean** |
| locked / prunable | none |
| lifecycle | **REMOVED** — 2026-08-16 absolute residual-debt cleanup |
| operational state | **OPERATIONAL_BASELINE_MERGED** |
| purpose | Historical Self free→Premium operational baseline; branch/history retained without a live worktree |
| related lane / PR | PR #80 **MERGED** @ `6965590…` · feature tip `fda934d…` · former local backup retention ref retired after supersession proof |
| product implementation authorized | **false** — no new Growth work and no further Self Funnel implementation authorized from this worktree; WT-011 Growth/share is **COMPLETED** (PR #81 MERGED) and must **not** receive new implementation |
| allowed operations | read-only branch/history inspection |
| prohibited operations | worktree recreation without a new explicit gate · append growth commits · Stripe / webhook / DB / Clerk / env / Pair runtime · routing new product work here |
| removal eligibility | **COMPLETE** — Human authorized normal clean removal in the residual-debt gate |
| next gate | none for product implementation — current ACTIVE worktree is **WT-013** for the read-only commercial-surface governance freeze; Pair and commerce remain not authorized |
| notes | PR #80 merged to `main`. Worktree removed normally after clean/ancestor/no-open-PR proof. Historical local and remote feature branches remain. Do **not** restart Growth or Self Funnel implementation here. |

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

### WT-009 — Build Week Control Plane (REMOVED)

| Field | Value |
|---|---|
| id | WT-009 |
| path | `/Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1` |
| branch | `feat/m55-build-week-control-plane-v1` |
| HEAD | `0cba2cb998e07b81c71ea51d69f7ae0fe92b7f75` |
| upstream | `origin/feat/m55-build-week-control-plane-v1` |
| cleanliness | **historical pre-removal snapshot: clean** |
| locked / prunable | none |
| lifecycle | **REMOVED** — 2026-08-16 absolute residual-debt cleanup |
| operational state | **CLOSED_SUPERSEDED_HISTORICAL_REFERENCE** |
| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |
| related lane / PR | PR #75 — **CLOSED** unmerged as superseded historical reference; remote branch retained |
| allowed operations | read-only remote branch/history inspection |
| prohibited operations | merge old Control Plane code to `main` · product/runtime/Production change · worktree recreation without a new explicit gate |
| removal eligibility | **COMPLETE** — Human authorized normal clean removal after PR #75 closure |
| notes | All eight PR #75 commits remain recoverable on `origin/feat/m55-build-week-control-plane-v1`. PR #75 was closed with a superseded-history note and was not merged. No product/runtime/Production changes occurred. |

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

### WT-021 — Product Authority reconciliation (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-reconciliation-v1` |
| branch | `pa/m55-product-authority-reconciliation-v1` |
| HEAD | `1574c13d493ed04f3823448cccaa887d232d4753` |
| branch creation base (`origin/main` at worktree creation) | pre-PR #92 main — **immutable** lane anchor |
| upstream | `origin/pa/m55-product-authority-reconciliation-v1` |
| cleanliness | verification-time snapshot only |
| lifecycle | **COMPLETED** |
| operational state | **PRODUCT_AUTHORITY_RECONCILIATION_MERGED** |
| purpose | Product Authority reconciliation source lane — PR #92 merged to main |
| related lane / PR | PR #92 **MERGED** @ `f3ab98a08e06cef7b16405d1adced387c23a29d2`; merge tree `e492be90919d51214071950b6eef6f3a29e8c020` |
| product implementation authorized | **false** — retained read-only reference only |
| MRQ implementation authority | **false** |
| write authority | **none** — reference-only; do not reuse for writes |
| allowed operations | read-only reference and audit |
| prohibited operations | further edits · commit · push · MRQ implementation · checkout/4242 · sales launch |
| removal eligibility | deferred — retain until separately authorized retirement gate |
| next gate | See `M55_CURRENT_STATE.md` → `NEXT SINGLE ACTION` |
| notes | PR #92 source worktree. Retained read-only per post-merge transition governance. WT-022 holds active transition gate. |

### WT-022 — Product Authority post-merge transition (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-post-merge-transition-v1` |
| branch | `pa/m55-product-authority-post-merge-transition-v1` |
| HEAD | `6625ce01f83890d12d2d3b3e0c31fe8e3f36a460` — PR #93 feature head |
| branch creation base (`origin/main` at worktree creation) | `f3ab98a08e06cef7b16405d1adced387c23a29d2` — **immutable**; PR #92 merge commit |
| PR #93 merge commit | `cb3cb45f17a0d5b5805b98af339517d43924df4a` — **MERGED** |
| PR #93 merge tree | `494066180e79d9468b81706c4bde02b8a274523a` |
| remote branch | `origin/pa/m55-product-authority-post-merge-transition-v1` — retained |
| main merge | **integrated to main** via PR #93 |
| Product Authority main settled | **true** — post-settlement current governance truth |
| cleanliness | verification-time snapshot only |
| lifecycle | **COMPLETED** |
| operational state | **PRODUCT_AUTHORITY_POST_MERGE_TRANSITION_MERGED** |
| purpose | DOCS_ONLY Product Authority post-merge/post-push SSOT transition — **completed** |
| related lane / PR | PR #93 **MERGED** @ `cb3cb45f17a0d5b5805b98af339517d43924df4a`; governed Product Authority last observation @ `2026-08-06T10:02:33.727Z` (Production SHA `f3ab98a08e06cef7b16405d1adced387c23a29d2`; deployment **5777052896**) — not reobserved in this settlement |
| product implementation authorized | **false** — retained read-only historical reference |
| MRQ implementation authority | **false** |
| write authority | **none** — reference-only |
| allowed operations | read-only historical inspection |
| prohibited operations | further edits · commit · push · MRQ implementation · checkout/4242 · sales launch |
| removal eligibility | deferred — retain until separately authorized retirement gate |
| next gate | none — transition complete; WT-023 holds active main settlement |
| notes | Post-merge transition worktree. PR #93 merged transition to main. Retained read-only per post-merge governance. WT-023 holds active Product Authority main settlement gate. |

### WT-023 — Product Authority main settlement (DOCS_ONLY)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-product-authority-post-merge-transition-v1` |
| branch | `docs/m55-product-authority-post-merge-main-settlement-v1` |
| first settlement commit | `e57e2c7cabb06286f4b99884a7bf3f0ee829a3ba` — committed · pushed |
| pre-correction PR-head snapshot | `e57e2c7cabb06286f4b99884a7bf3f0ee829a3ba` — before temporal-correction commit/push |
| current branch / PR head | **dynamic** — reobserve from GitHub; do **not** durably pin in SSOT |
| branch creation base | `cb3cb45f17a0d5b5805b98af339517d43924df4a` — **immutable**; PR #93 merge commit |
| upstream | `origin/docs/m55-product-authority-post-merge-main-settlement-v1` — pushed |
| PR | **#94 MERGED** — https://github.com/lexsia228/m55-web/pull/94 · merge commit `93579b86a4a69ebf555bd089869d541f0c56f4a5` |
| PR candidate (before temporal correction) | 1 commit · 2 SSOT paths @ pre-correction PR-head snapshot `e57e2c7cabb06286f4b99884a7bf3f0ee829a3ba` |
| cleanliness | verification-time snapshot only |
| lifecycle | **COMPLETED** |
| operational state | **PRODUCT_AUTHORITY_MAIN_SETTLEMENT_CLOSED** |
| Product Authority main settled | **true** — PR #94 **MERGED** @ `93579b86a4a69ebf555bd089869d541f0c56f4a5` · settlement completion condition **met** |
| settlement completion condition | PR #94 **MERGED** into `main` **and** final main identity / SSOT verification complete — **met** |
| purpose | DOCS_ONLY Product Authority post-PR93 main settlement — truth delta for `M55_CURRENT_STATE.md` and `M55_WORKTREE_REGISTRY.md` only — **completed** |
| related lane / PR | PR #94 **MERGED** @ `93579b86a4a69ebf555bd089869d541f0c56f4a5`; follows PR #93 @ `cb3cb45f17a0d5b5805b98af339517d43924df4a` · historical Production deployment **5790526469** @ `cb3cb45f17a0d5b5805b98af339517d43924df4a` (PR #93 era); historical Production deployment **5820641847** @ `e1fd76b540f5290c065c1695e59f86394f20b3ba` (P1B era) · **not** current Production SHA; governed Product Authority last observation preserved @ `2026-08-06T10:02:33.727Z` |
| product implementation authorized | **false** — docs-only; retained read-only |
| MRQ implementation authority | **false** |
| write authority | **none** — reference-only |
| allowed operations | read-only historical inspection |
| prohibited operations | application source / tests / workflows / package.json / lockfiles / evidence edits · `.product-authority/**` edits or regeneration · MRQ implementation · commit/push/PR/merge without separate gate · checkout/4242 · sales launch · observer/generator run |
| removal eligibility | deferred — retirement requires separate authorization |
| next gate | none — settlement complete; WT-025 holds active P1C post-merge SSOT transition |
| notes | Main settlement worktree. PR #94 **MERGED** @ `93579b86a4a69ebf555bd089869d541f0c56f4a5`. Retained read-only. WT-025 holds active P1C post-merge SSOT transition gate. |

### WT-024 — MRQ P1C draft persistence (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-mrq-p1c-draft-persistence-v1` |
| branch | `feat/m55-mrq-p1c-draft-persistence-v1` |
| feature head | `5f0454ee32159873f58d08624ca49ae858ab714f` |
| HEAD (entry base) | `5f0454ee32159873f58d08624ca49ae858ab714f` — PR #97 feature head |
| upstream | `origin/main` @ `faef130a335ce6e33cfd784d5318f874beeb70ad` |
| lifecycle | **COMPLETED** |
| operational state | **MRQ_P1C_DRAFT_PERSISTENCE_CLOSED_GREEN** |
| lane | M55 MINIMUM-REVENUE-QUALITY — P1C draft persistence |
| purpose | Logged-in draft sync user-visible reliability — `dtrDraftClientSync` status/retry UX |
| related lane / PR | PR #97 **MERGED** @ `faef130a335ce6e33cfd784d5318f874beeb70ad` · merge parents `4967d963fef3ae832b420e8ff9d71cd732bf66db` · `5f0454ee32159873f58d08624ca49ae858ab714f` · follows PR #96 **MERGED** P1B closure · P1A **MERGED** PR #95 |
| product implementation authorized | **false** — retained read-only |
| MRQ implementation authority | **false** |
| write authority | **none** — reference-only |
| allowed operations | read-only historical inspection |
| prohibited operations | P1C re-implementation · P1A/P1B re-audit · P2/P3 · checkout/4242 · deploy · sales launch · scope expansion |
| removal eligibility | deferred — retain through P1C closure review |
| next gate | none — P1C **CLOSED GREEN**; WT-025 **COMPLETED** |
| notes | Created from exact `origin/main` @ `e1fd76b540f5290c065c1695e59f86394f20b3ba`. PR #97 **MERGED** @ `faef130a335ce6e33cfd784d5318f874beeb70ad`. Production deployment **5826935452** @ `faef130a335ce6e33cfd784d5318f874beeb70ad` · state **SETTLED GREEN**. Retained read-only. |

### WT-025 — MRQ P1C post-merge SSOT transition (DOCS_ONLY)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-mrq-p1c-postmerge-ssot-v1` |
| branch | `feat/m55-mrq-p1c-postmerge-ssot-v1` |
| HEAD (settled) | `1f391371c9d04146878df40dc8a2499ccce5a76d` — PR #98 SSOT transition commit |
| branch creation base | `faef130a335ce6e33cfd784d5318f874beeb70ad` — **immutable** |
| upstream | none — local docs-only branch |
| lifecycle | **COMPLETED** |
| operational state | **DOCS_ONLY_P1C_POST_MERGE_SSOT_TRANSITION** |
| lane | M55 MINIMUM-REVENUE-QUALITY — P1C post-merge SSOT transition |
| purpose | DOCS_ONLY post-PR97 SSOT transition — truth delta for `M55_CURRENT_STATE.md`, `M55_WORKTREE_REGISTRY.md`, `M55_ROADMAP.md`, and `M55_DECISION_LOG.md` only |
| related lane / PR | PR #97 **MERGED** @ `faef130a335ce6e33cfd784d5318f874beeb70ad`; PR #98 **MERGED** @ `3cf560691dd11d35b26077ec6c5e4686a571dae5` |
| product implementation authorized | **false** — docs-only |
| MRQ implementation authority | **false** |
| write authority | **none** — retained read-only |
| allowed operations | none — retained read-only |
| prohibited operations | application source / tests / e2e / proof / Product Authority / package / scripts / migrations / audit index / AGENTS.md / configuration / runtime-env edits · commit/push/PR/merge without separate gate |
| removal eligibility | deferred — retain read-only |
| next gate | none — transition **COMPLETED** |
| notes | Created from exact `origin/main` @ `faef130a335ce6e33cfd784d5318f874beeb70ad`. PR #98 merged P1C→P2 SSOT transition. Retained read-only. |

### WT-026 — MRQ P2 Revenue-Ready (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-mrq-p2-revenue-ready-v1` |
| branch | `feat/m55-mrq-p2-revenue-ready-v1` |
| HEAD (feature) | `21744e195f08aeda03f23b7972bedcbf227aaaaa` |
| branch creation base | `3cf560691dd11d35b26077ec6c5e4686a571dae5` — **immutable** |
| upstream | `origin/feat/m55-mrq-p2-revenue-ready-v1` |
| lifecycle | **COMPLETED** |
| operational state | **P2_REVENUE_READY_CLOSED_GREEN** |
| lane | M55 MINIMUM-REVENUE-QUALITY — P2 Revenue-Ready |
| purpose | P2 Revenue-Ready premium funnel implementation — transparency · personalization · one-time-purchase trust |
| related lane / PR | PR #99 **MERGED** @ `2d14404d62ab7b265e07729448d6db602a055cce`; merge parents `3cf560691dd11d35b26077ec6c5e4686a571dae5` · `21744e195f08aeda03f23b7972bedcbf227aaaaa` |
| product implementation authorized | **false** — lane **COMPLETED** |
| MRQ implementation authority | **false** |
| write authority | **none** — retained read-only |
| allowed operations | none — retained read-only |
| prohibited operations | P2 re-implementation · P1A/P1B/P1C re-audit · P3 · checkout/4242 · deploy · sales launch · scope expansion |
| removal eligibility | deferred — retain read-only |
| next gate | none — P2 **CLOSED GREEN** |
| notes | PR #99 **MERGED** @ `2d14404d62ab7b265e07729448d6db602a055cce`. Production deployment **AA99Xfx9uL5ne2tbpQztRkia2eYx** @ `2d14404d62ab7b265e07729448d6db602a055cce` · state **SETTLED GREEN**. ECP **GREEN** · Premium proof **GREEN**. Retained read-only. |

### WT-027 — Pair surface identity (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-mrq-p3-sales-safety-v1` |
| branch | `fix/m55-pair-surface-identity-v1` (merged via PR #117) |
| feature head | `36094743776bd0b6d641b0b1fbf5f1d5dfb8ab72` |
| merge commit | `be6efb4fd7b2994a18fe0f175a536e773ee827ce` |
| last verified origin/main | `be6efb4fd7b2994a18fe0f175a536e773ee827ce` |
| last verified Production SHA | `be6efb4fd7b2994a18fe0f175a536e773ee827ce` |
| Production deployment | GitHub `5903998364` @ `2026-08-14T09:44:24Z` |
| lifecycle | **COMPLETED** |
| purpose | Pair Free visual signature + privacy-safe entry share; Pair Premium night ownership grammar in source/fixture; Personal Premium 11px label floor |
| product implementation authorized | **false** — lane closed GREEN |
| next gate | **CLOSED_GREEN** — `M55_LIVE_UPGRADE_RPC_V2_SAME_TRANSACTION_RECOVERY` completed @ `1e25d17` (2026-08-13); not active |
| notes | PR #117 **MERGED**. Four-surface visual identity **CLOSED GREEN**. Pair Premium stays READY_BUT_GATED. Commerce remains OFF. |

### WT-028 — Free inference quality v2 (PAUSED merge)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-free-inference-quality-v1` |
| branch | `feat/m55-free-inference-quality-v1` |
| base | `origin/main` @ `0b2b2b349ccf4f0b9549d5a59be5a92be0a99578` |
| HEAD | `d7512c00520b5914778ee3da0b48193f6c0aed1d` |
| lifecycle | **PAUSED** — V6 not rejected; merge/Human lock paused for personalization resolution |
| purpose | Personal Free + Compatibility Free inference quality — fused DOB × answers, observable behavioral surprise |
| product implementation authorized | **false** until resolution wave; no visual/payment rebuild |
| prohibited operations | Stripe / DB / Compatibility commerce / Premium report generation / purchase routes / env / keys / HOME layout |
| next gate | WT-029 audit authority; then consume unused dal-v1 / composite-stem signals |

### WT-029 — Personalization resolution audit (ACTIVE)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-personalization-resolution-v1` |
| branch | `audit/m55-personalization-resolution-v1` |
| base | `feat/m55-free-inference-quality-v1` @ `d7512c00520b5914778ee3da0b48193f6c0aed1d` |
| lifecycle | **ACTIVE** — measurement / SSOT only |
| purpose | All-surface DOB granularity, 1000-user/pair collision, Free+Paid personalization thresholds |
| product implementation authorized | **false** — no engine rebuild in this tree unless Human names the next wave |
| prohibited operations | Production / DB / Stripe / env / keys / checkout / PR119 / second astrology system |
| next gate | Human accepts audit verdict; then smallest consume-existing-signals implementation wave |
| notes | Verdict `PATCH_REQUIRED_EFFECTIVE_DOB_RESOLUTION_27_AND_TEMPLATE_COLLISION`. Authority `docs/audit/M55_ALL_SURFACE_PERSONALIZATION_RESOLUTION_AUDIT.md`. Evidence commit `80f99316b01e05d82c95e92fe4556a89483d4eba`. |

### WT-030 — Personalization resolution v2 (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-personalization-resolution-v2` |
| branch | `feat/m55-personalization-resolution-v2` |
| base | `audit/m55-personalization-resolution-v1` @ `80f99316b01e05d82c95e92fe4556a89483d4eba` |
| lifecycle | **COMPLETED** — PR #120 **MERGED** @ `679debfffa18a6811112b4e1b298653f472658a6` |
| purpose | CanonicalBirthProfileV2 + Personal/Pair Free/Paid resolution without a second calendar |
| product implementation authorized | **false** — lane closed on main; retained read-only |
| lastVerifiedAt | `2026-08-16` |
| lastVerifiedMain | `7bc2503bb3e188a9bc4cd83ff2b09c4964bbc87b` |

### WT-031 — Product narrative + social share v1 (COMPLETED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-product-narrative-share-v1` |
| branch | `feat/m55-product-narrative-share-v1` |
| base | `feat/m55-personalization-resolution-v2` @ `6d53a71df148ed4c0a1016358bc86830086f8732` |
| lifecycle | **COMPLETED** — PR #121 **MERGED** @ `7bc2503bb3e188a9bc4cd83ff2b09c4964bbc87b` |
| purpose | Narrative / ownership / share layer over existing inference (私の取扱説明書 · PublicShareSpecV1 · X/native · viewer landing) |
| product implementation authorized | **false** — lane closed on main; retained read-only |
| lastVerifiedAt | `2026-08-16` |
| lastVerifiedMain | `7bc2503bb3e188a9bc4cd83ff2b09c4964bbc87b` |
| notes | Delight v2 authority `f04550a`. DEFERRED_PREMIUM_SHARE_IDENTITY_PERSISTENCE remains non-blocking. |

### WT-032 — Production release docs settlement (REMOVED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-production-release-v1` |
| lifecycle | **REMOVED** — 2026-08-16 final lifecycle closure |
| purpose | Docs-only settlement delivery (PR #125–#130 + lifecycle archive) |
| removal | `git worktree remove` after evidence commit; worktree no longer live |
| notes | Settlement branches retained on remote |

### WT-033 — Personal Free quality hotfix implementation (REMOVED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-production-free-entry-quality-hotfix-v1` |
| lifecycle | **REMOVED** — 2026-08-16 after evidence archive in-repo |
| purpose | Bounded Personal Free entry + commercial individuality closures (PR #123–#128) |
| related PRs | #123 · #124 · #126 · #127 · #128 |
| evidence | `docs/evidence/M55_PERSONAL_FREE_HUMAN_SIGNOFF_2026-08-16/` — **ARCHIVED** |
| notes | Feature branches retained on remote |

---

### WT-034 — Commercial acceptance correction (CLOSED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` |
| prior branch | `fix/m55-commercial-acceptance-revenue-v1` |
| feature head | `eeaf2f4c474b154453008f50d139479c8948e65c` |
| merge commit / origin/main | `a6ddfd72603c6dc14b7c57df6ab44db2ec604d0c` |
| PR #135 | **MERGED** @ `a6ddfd72603c6dc14b7c57df6ab44db2ec604d0c` |
| Preview acceptance | **OWNED_DTR_CORE** · **PAIR_RESULT_SHARE** — **GREEN** |
| Production acceptance (public affected surfaces) | `/dtr` · `/dtr/lp` — **GREEN** @ `a6ddfd7…` |
| lifecycle | **CLOSED** — bounded pre-SELL correction complete |
| purpose | Bounded pre-SELL correction: DTR shelf Light/Full · LP↔reader identity · paid closing · metadata/フル · LP engine wording · owned DOB · Free sticky CTA |
| exit condition | **met** — merge + Production SHA verification + final Production acceptance + SALES_LAUNCH reassessment → **SELL** recorded 2026-08-18 |

---

### WT-035 — Commercial growth control-plane reconciliation (CLOSED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused from WT-034) |
| branch | `chore/m55-commercial-growth-control-plane-v1` |
| merge / origin/main snapshot | `073de7288d83285a2ae269d23e3fea9fcd4e3603` (post-merge control-plane docs on `main`; ancestor of PR #137 merge) |
| lifecycle | **CLOSED** — post-SELL Tier-E control-plane reconciliation delivered |
| exit condition | **met** — docs merged to `main`; superseded by PR #137 post-merge current state |

---

### WT-036 — G1 revenue outcome observability (CLOSED_GREEN)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused) |
| branch | `feat/m55-g1-revenue-outcome-observability-v1` |
| feature commit | `74bbbc1b92a00fc3b5425889d94cf45e02847964` |
| merge commit / origin/main | `773dd67222ba1fe81824c10be6457a33e715650f` |
| PR #137 | **MERGED** |
| exact source delta | **4 files** — `lib/m55/privacySafeFunnelAnalytics.ts` · `components/dtr/LightToFullUpgradeButton.tsx` · `components/dtr/DtrProcessingClient.tsx` · `lib/m55/g1RevenueOutcomeObservability.test.ts` |
| CI | **GREEN** |
| lifecycle | **CLOSED_GREEN** — **DO NOT REOPEN** absent actual invalidation |
| purpose | G1 P0 privacy-safe revenue outcome observability: Light→Full upgrade intent/redirect · post-payment ready/stuck terminal outcomes |

---

### WT-037 — PR #137 post-merge Tier-E reconciliation (CLOSED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused from WT-036) |
| branch | `chore/m55-pr137-post-merge-tier-e-reconciliation` |
| docs settlement | PR #138 **MERGED** @ `146e2d39b5a79f939bfc0a0dcf21f86c64919c33` |
| lifecycle | **CLOSED** — post-PR-#137 Tier-E docs delivered |
| exit condition | **met** — superseded by PR #139 merge + WT-039 active gate |

---

### WT-038 — G2 public terminology long-tail (CLOSED_GREEN)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused) |
| branch | `feat/m55-g2-public-terminology-long-tail-v1` |
| feature commit | `29594616347963c34a0edb99a8f93db56b47c582` |
| merge commit / origin/main | `183328ade4cbbaf69975bdf33883bdad3caf19ad` |
| PR #139 | **MERGED** |
| exact source delta | **4 files** — `app/api/purchase/checkout/route.ts` · `lib/m55/dtrProductCatalog.ts` · `lib/m55/stripeCheckoutPublicCopy.test.ts` · `lib/m55/myConsultCheckoutPublicCopy.test.ts` |
| lifecycle | **CLOSED_GREEN** — **DO NOT REOPEN** absent actual invalidation |
| purpose | G2 minimal long-tail terminology: Stripe PaymentIntent canonical public names · DTR catalog subtitle dedupe |
| provider mutation | **none** — no Stripe dashboard / env / DB / Clerk change |

---

### WT-039 — PR #139 post-merge Tier-E reconciliation (CLOSED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused from WT-038) |
| branch | `chore/m55-pr139-post-merge-tier-e-reconciliation` |
| HEAD / base origin/main | `183328ade4cbbaf69975bdf33883bdad3caf19ad` |
| lifecycle | **CLOSED** — post-PR-#139 Tier-E docs delivered |
| exit condition | **met** — superseded by G3-02 active lane + WT-040 |

---

### WT-040 — G3-02 owned report deep return (CLOSED_GREEN)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused from WT-039) |
| branch | `feat/m55-g3-owned-report-deep-return-v1` |
| base origin/main | `39f7f3dd654cbd684c7e60830276de2b6c3df5c2` |
| feature head | `522124257780d9e1a2af8dd895e428314a5a6dc5` |
| merge commit / origin/main | `4edcf631c5bccfba18f16db8767d20f83bc104f0` |
| PR #141 | **MERGED** |
| exact source delta | **2 files** — `app/dtr/core/page.tsx` · `lib/m55/dtrCoreOwnedReportDeepReturn.test.ts` |
| lifecycle | **CLOSED_GREEN** — **DO NOT REOPEN** absent actual invalidation |
| USER_VISIBLE_CLOSED_GREEN | **YES** |
| Human Preview owner runtime | **GREEN** — `OWNER_FINAL_PATH=/dtr/core` · `OWNER_REPORT_VISIBLE=YES` |
| Human Preview non-owner runtime | **GREEN** — `NON_OWNER_FINAL_PATH=/dtr/lp` · `NON_OWNER_REPORT_VISIBLE=NO` |
| proof recapture / authenticity | **GREEN** |
| PR-head CI | **GREEN** |
| Production post-merge deployment | **READY** @ merge SHA |
| Production signed-out deep-return preflight | **GREEN** |
| purpose | Signed-out `/dtr/core` → sign-in with safe return to `/dtr/core`; ownership gate after auth unchanged |
| provider mutation | **none** |
| exit condition | **met** — PR #141 merged · Human visual GREEN · proof + CI GREEN · Production preflight GREEN |

---

### WT-041 — PR #141 post-merge Tier-E reconciliation (CLOSED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused from WT-040) |
| branch | `chore/m55-pr141-post-merge-tier-e-reconciliation` |
| base origin/main | `4edcf631c5bccfba18f16db8767d20f83bc104f0` |
| docs settlement | PR #142 **MERGED** @ `32f22da527033a0ca094bb717ab2e160c7006d5e` |
| lifecycle | **CLOSED** — post-PR-#141 Tier-E docs delivered via PR #142 |
| purpose | Docs-only settlement after PR #141 merge — `M55_CURRENT_STATE.md` · `M55_WORKTREE_REGISTRY.md` · `M55_ROADMAP.md` · `M55_DECISION_LOG.md` |
| related lane / PR | PR #141 **MERGED** @ `4edcf631c5bccfba18f16db8767d20f83bc104f0`; G3-02 **CLOSED GREEN** |
| exit condition | **met** — PR #142 merged to `main` |

---

### WT-042 — Commercial quality consolidation (CLOSED / MERGED)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused from WT-041; **not deleted**) |
| branch | `feat/m55-commercial-quality-consolidation-v1` |
| base origin/main | `22b00a6bfc9190f713633e694d90d4dbfa2c8a56` |
| feature head | `f7ca4d44882e5820afdc3836ee8b7be2c4e30d86` |
| merge commit / origin/main | `ecc3e37b43414e2a56941377c35235b965047aff` |
| PR #144 | **MERGED** |
| Production deployment | `dpl_8CvJAXiT84GYvU1NUdEds8XnZLpg` **READY** |
| PR-head CI | **GREEN** |
| Safari Technology Preview | **27.0** representative commercial visual review completed; Human-found P1 defects were corrected before merge |
| lifecycle | **CLOSED / MERGED** — commercial quality consolidation **CLOSED GREEN** |
| USER_VISIBLE_CLOSED_GREEN | **YES** for the PR #144 commercial-quality consolidation scope |
| purpose | **M55_COMMERCIAL_QUALITY_CONSOLIDATION** — meaning integrity + Free visual quality — **completed** |
| product implementation authorized | **false** — lane closed on main; retained path reused by WT-043 docs settlement |
| provider mutation | **none** — Price / Stripe / DB / Clerk / AI provider / Pair / Today-Weekly / subscription **UNCHANGED** |
| exit condition | **met** — PR #144 merged · Human P1 visual defects corrected before merge · CI GREEN · Production READY |
| notes | Physical worktree was **not** deleted. Feature branch retained as merge history. Do not reopen absent actual invalidation. |

---

### WT-043 — PR #144 post-merge Tier-E settlement (SETTLEMENT_ONLY / CLOSES_WITH_PR145_MERGE)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` (reused from WT-042; **not deleted**) |
| branch | `chore/m55-pr144-post-merge-tier-e-settlement` |
| base origin/main | `ecc3e37b43414e2a56941377c35235b965047aff` |
| lastVerifiedAt | `2026-08-19` |
| lastVerifiedMain | `ecc3e37b43414e2a56941377c35235b965047aff` |
| lifecycle | **SETTLEMENT_ONLY / CLOSES_WITH_PR145_MERGE** |
| operational state | **SELF_CLOSING_DOCS_SETTLEMENT** — not the durable ACTIVE product lane |
| purpose | Docs-only settlement after PR #144 merge — `M55_CURRENT_STATE.md` · `M55_WORKTREE_REGISTRY.md` · `M55_ROADMAP.md` — delivered as PR #145 |
| related lane / PR | PR #144 **MERGED** @ `ecc3e37b43414e2a56941377c35235b965047aff`; PR #145 **OPEN** (do **not** invent a merge SHA); commercial quality consolidation **CLOSED GREEN** |
| product implementation authorized | **false** — not an active product implementation lane |
| NEXT SINGLE ACTION | **WAIT_FOR_HUMAN_G3_REMAINING_AUTHORIZATION** (durable G3 hold after this PR merges) |
| allowed operations | none after PR #145 merge — settlement is self-closing |
| prohibited operations | application source / CSS/UI / tests / evidence recapture / DB / Stripe / Clerk / provider / checkout / Pair / Today-Weekly / subscription · follow-up docs-only PR merely to close WT-043 |
| removal eligibility | physical worktree **may remain**; directory presence does **not** keep the lane ACTIVE |
| notes | Once PR #145 merges, WT-043 is operationally **CLOSED** even if the directory remains. **No** follow-up docs-only PR is required merely to close WT-043. Durable ACTIVE lane is **G3 REVISIT / RETENTION LOOP**. |

---

### WT-044 — G3-03 Personal Free cross-device restore (CLOSES_WITH_THIS_PR_MERGE)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-g3-runtime-proof-v1` (**retained** — not deleted) |
| branch | `feat/m55-g3-runtime-proof-v1` |
| base origin/main | `9ca5b57d72a7c0b31ec96a8448872e73d3e2ab7f` |
| implementation head | `ec663849ad0ba755e0e8a002d10d8540e3a94e21` |
| lastVerifiedAt | `2026-08-20` |
| lifecycle | **CLOSES_WITH_THIS_PR_MERGE** — operationally **CLOSED** on G3-03 PR merge |
| purpose | G3-03 signed-in Personal Free cross-device restore from server draft with identity binding + Clerk-auth-only draft ownership |
| Human authorization | **G3-03** |
| G3-03 | **CLOSED GREEN** |
| G3-03 defect classification | **B. REAL_RUNTIME_DEFECT** |
| Preview deployment | `dpl_6RHww1uMqbuQAka21VA687SPYror` **READY** |
| runtime proof | matched identity **GREEN** · mismatched identity **GREEN** · Safari TP representative **GREEN** |
| G3-01 | **NOT AUTHORIZED** |
| G3-04 | **REJECT_EXPOSURE** |
| product implementation authorized | **false** after merge — lane closes with PR |
| Durable ACTIVE lane after merge | **G3 REVISIT / RETENTION LOOP** |
| Current phase after merge | **WAIT_FOR_HUMAN_G3_REMAINING_AUTHORIZATION** |
| NEXT SINGLE ACTION after merge | **WAIT_FOR_HUMAN_G3_REMAINING_AUTHORIZATION** |
| follow-up docs-only PR | **not required** |
| prohibited operations | G3-01 implementation · G3-04 exposure · G4/G5 source · Personal Free redesign · price/Stripe/DB/Clerk config/provider/Pair/subscription change |

---

### WT-045 — G3-04 Today/Weekly KEEP_REJECTED de-exposure (CLOSES_WITH_THIS_PR_MERGE)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-g3-01-revisit-v1` (**retained** — not deleted) |
| branch | `feat/m55-g3-04-copy-safety-v1` |
| base origin/main | `d33e9d3dc685e733826348b128faa9184a3b0072` |
| implementation head | `03ae78dbd91d63ffc411d389dfd9e276525155f2` |
| lastVerifiedAt | `2026-08-20` |
| lifecycle | **CLOSES_WITH_THIS_PR_MERGE** — operationally **CLOSED** on G3-04 PR merge |
| purpose | G3-04 KEEP_REJECTED bounded de-exposure — remove public Today/Weekly promotion · temporary `/today` + `/weekly` redirect to `/core` · legacy engines retained |
| Human authorization | **G3-04** copy-safety mapping · **KEEP_REJECTED** |
| G3 REVISIT / RETENTION LOOP | **CLOSED GREEN** |
| G3-01 | **CLOSED GREEN / NO CODE DELTA** |
| G3-02 | **CLOSED GREEN** |
| G3-03 | **CLOSED GREEN** |
| G3-04 | **CLOSED / KEEP_REJECTED** |
| Preview deployment | `https://m55-webv2-hrohtt4ek-m55-official.vercel.app` **READY** |
| runtime proof | Home Today/Weekly absent · `/today` → `/core` · `/weekly` → `/core` · Safari TP representative **GREEN** |
| product implementation authorized | **false** after merge — lane closes with PR |
| Durable ACTIVE lane after merge | **G4 ORGANIC DISCOVERY** |
| Current phase after merge | **G4 ORGANIC DISCOVERY MAPPING-FIRST** |
| NEXT SINGLE ACTION after merge | **G4 ORGANIC DISCOVERY MAPPING-FIRST** |
| G4 source implementation | **NOT YET AUTHORIZED** |
| follow-up docs-only PR | **not required** |
| prohibited operations | G4 source implementation without later Human gate · Today/Weekly replacement engine · Personal Free redesign · price/Stripe/DB/Clerk config/provider/Pair/subscription change |

---

### WT-046 — G4 Organic Discovery mapping-first (ACTIVE / READ-ONLY PRODUCT MAPPING)

| Field | Value |
|---|---|
| path | `/Users/lexsia/Documents/M55_WORKTREE-g4-organic-discovery-v1` |
| branch | `feat/m55-g4-organic-discovery-v1` |
| base origin/main | `00def3a596655dedceceb85764724ef6070a0c91` |
| HEAD | `00def3a596655dedceceb85764724ef6070a0c91` |
| lastVerifiedAt | `2026-08-20` |
| lifecycle | **ACTIVE** |
| operational state | **G4_ORGANIC_DISCOVERY_MAPPING_FIRST** |
| purpose | Exact repository/runtime mapping of metadata, sitemap, robots, index freshness, share discovery and qualified Free→Premium discovery continuity |
| G3 REVISIT / RETENTION LOOP | **CLOSED GREEN — DO NOT REOPEN** |
| product/source implementation authorized | **false** — mapping-first only |
| allowed operations | read-only product/source/runtime inspection; local Tier-E registry reconciliation for this gate only |
| prohibited operations | product/source/test implementation · commit · push · PR · deploy · Today/Weekly exposure · Personal Free redesign · price/Stripe/DB/Clerk/provider/Pair/subscription change |
| NEXT SINGLE ACTION | **G4 ORGANIC DISCOVERY MAPPING-FIRST** |

---

## FINAL LIVE WORKTREES (2026-08-20 G4 mapping-first) — AUTHORITATIVE

Current `origin/main`: **`00def3a596655dedceceb85764724ef6070a0c91`**

Live count from `git worktree list --porcelain`: **7**

| Path | Branch | HEAD | Registry id | Lifecycle | Why it remains | Exit condition |
|---|---|---|---|---|---|---|
| `/Users/lexsia/Documents/M55_CANONICAL` | `feat/m55-personalization-resolution-v2` | `6d53a71df148ed4c0a1016358bc86830086f8732` | primary git root | **PRIMARY_REPO_ROOT / RETAINED** | Primary repository `.git` root; HEAD is an ancestor of current `origin/main`; not an ACTIVE lane | keep |
| `/Users/lexsia/Documents/M55_WORKTREE-commercial-acceptance-fix-v1` | `chore/m55-pr144-post-merge-tier-e-settlement` | `abfb32bd0ba669f09e1ec7d5c73d06177df0af26` | WT-043 (WT-042 **CLOSED / MERGED**) | **CLOSED / RETAINED** | PR #145 merged via `9ca5b57d72a7c0b31ec96a8448872e73d3e2ab7f`; physical path retained | separate retirement authorization |
| `/Users/lexsia/Documents/M55_WORKTREE-g3-01-revisit-v1` | `feat/m55-g3-04-copy-safety-v1` | `4f895aee9ea10431fcc754d18ac965380cda3600` | WT-045 | **CLOSED GREEN / RETAINED** | G3-04 merged via PR #147 @ `00def3a596655dedceceb85764724ef6070a0c91`; physical path retained | separate retirement authorization |
| `/Users/lexsia/Documents/M55_WORKTREE-g3-runtime-proof-v1` | `feat/m55-g3-runtime-proof-v1` | `1402859d0070f17fd560a83e60ed342892d3e03e` | WT-044 | **CLOSED GREEN / RETAINED** | G3-03 merged via PR #146 @ `d33e9d3dc685e733826348b128faa9184a3b0072`; physical path retained | separate retirement authorization |
| `/Users/lexsia/Documents/M55_WORKTREE-g4-organic-discovery-v1` | `feat/m55-g4-organic-discovery-v1` | `00def3a596655dedceceb85764724ef6070a0c91` | WT-046 | **ACTIVE — G4 ORGANIC DISCOVERY MAPPING-FIRST** | Current authorized read-only G4 mapping lane; equals current `origin/main` | `WAIT_FOR_CHATGPT_G4_MAPPING_REVIEW`; source implementation requires later Human gate |
| `/Users/lexsia/Documents/M55_WORKTREE-mrq-p1c-draft-persistence-v1` | `main` | `aadb6e57a411a6cb03581487f68482dd44788f1e` | WT-024 (control) | **STALE_MAIN_CONTROL_SNAPSHOT** | Physically exists; HEAD is an ancestor of current `origin/main` and is not a recommended current control checkout | replace only by explicit control-checkout synchronization transition |
| `/Users/lexsia/Documents/M55_WORKTREE-mrq-p3-sales-safety-v1` | `fix/m55-compatibility-commerce-preflight-v1` | `769084dd82da25f7cc0f4656f3cdeeff879209c2` | WT-027 | **PENDING_INTEGRATION** | Compatibility commerce preflight branch is not an ancestor of current `origin/main`; commerce remains OFF | PR #119 merge/close + separate commerce gate |

## FINAL LIVE WORKTREES (2026-08-19 commercial quality consolidation) — HISTORICAL

## FINAL LIVE WORKTREES (2026-08-19 PR #141 post-merge) — HISTORICAL

## FINAL LIVE WORKTREES (2026-08-16 absolute residual-debt cleanup) — HISTORICAL

| Path | Branch | Registry id | Lifecycle | Why it remains | Exit condition |
|---|---|---|---|---|---|
| `/Users/lexsia/Documents/M55_CANONICAL` | `feat/m55-personalization-resolution-v2` | primary git root | **PRIMARY_REPO_ROOT** | Primary repository `.git` root; clean; not an ACTIVE implementation lane | keep |
| `/Users/lexsia/Documents/M55_WORKTREE-mrq-p1c-draft-persistence-v1` | `main` (docs-only settlement branch only while its PR is open) | WT-024 (control) | **MAIN_CONTROL** | Clean recommended control checkout for the next GPT thread | replace only by explicit control-checkout transition |
| `/Users/lexsia/Documents/M55_WORKTREE-mrq-p3-sales-safety-v1` | `fix/m55-compatibility-commerce-preflight-v1` | WT-027 | **PENDING_INTEGRATION** | PR #119 OPEN — Compatibility commerce preflight | PR #119 merge/close + separate commerce gate |

All other prior registry worktrees, including WT-001 and WT-009: **REMOVED** from live `git worktree list` (2026-08-16). Historical branches remain; PR #30/#75 remote branches were not deleted. Four superseded stashes and obsolete local retention refs were disposed; `STASH_COUNT=0`, `UNPUSHED_LOCAL_ONLY_COMMITS=0` at the cleanup gate.

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
