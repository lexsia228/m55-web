# M55 PR #81 New-Thread Bootstrap Prompt — 2026-08-01

Status: **Dated bootstrap prompt (Tier E)**
Purpose: a single, self-contained, copy-paste prompt for the **first message** of a new ChatGPT thread continuing M55 work after PR #81.

## DO NOT USE THIS PROMPT YET

**This prompt is NOT authorized for use until all of the following are true:**

1. Product Authority Pack reconciliation has been completed in a **separately authorized** run (not this docs-only patch).
2. Generated authority output (`.product-authority/generated/authority-header.md`, `.product-authority/observations.json`) agrees with committed SSOT — in particular `growthShare.status`, `growthShare.mergeStatus`, `repository.lastObservedOriginMainSha`, and `production.lastObservedSha` must reflect the PR #81 merge and current Production, and WT-012 must be present in generated output.
3. The docs-only transition (WT-012, this branch) has been **merged to `origin/main`**.
4. The actual current docs-transition merge SHA has been inserted into this document (or the operator has deterministically verified it via `git log`/`gh pr view` immediately before copying this prompt) — this document must not be handed to a new thread while it still only describes a **pending local commit**.

**If any of the above is not yet true: STOP. Do not copy the fenced prompt below into a new thread. Report status back to the Human instead.**

Once all four conditions above are met, the eventual first requested action for the new thread remains unchanged: **READ-ONLY CONTEXT IMPORT VERIFICATION** (see the fenced prompt below). Meeting the four conditions does **not** by itself authorize source edits or Pair (二人向け無料→有料) implementation — those require separate, explicit authorization recorded in `docs/ssot/M55_CURRENT_STATE.md`.

---

Copy everything inside the fenced block below as the first message to the new thread — **only after the prerequisites above are satisfied**.

---

```text
PROJECT: M55

STOP-CHECK BEFORE PROCEEDING: This prompt is only valid to act on if the
operator who pasted it has confirmed Product Authority Pack reconciliation is
complete AND the docs-only transition below has been merged to origin/main
(see "DO NOT USE THIS PROMPT YET" in
docs/ssot/M55_PR81_NEW_THREAD_BOOTSTRAP_2026-08-01.md). If you have any doubt
this was confirmed, perform the read-only verification steps below anyway,
but report the gap instead of assuming authorization.

You are continuing work on M55, a commercial funnel product (repository:
lexsia228/m55-web). You have no access to the prior conversation. All
authority comes from the repository, Git, CI, and Production — not from
conversation memory.

REPO / WORKTREE PATHS (exact identities):

- Docs transition worktree (where this handoff/bootstrap was written):
  path: /Users/lexsia/Documents/M55_WORKTREE-pr81-post-merge-transition-v1
  branch: chore/m55-pr81-post-merge-transition-v1
  branch creation base (origin/main at branch creation): bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149
  currently reviewed HEAD (at time this bootstrap was authored): 4552cb23cc01b1f27b0e1d360d8dc6594aa9a3fb
  NOTE: this branch has since advanced past both SHAs above via docs-only
  commits (including a corrective commit). Read the LIVE HEAD yourself via
  `git rev-parse HEAD` in that worktree — do not assume either SHA above is
  the current HEAD.

- Merged feature worktree (retained temporarily, do not implement further):
  path: /Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1
  branch: feat/m55-self-funnel-growth-share-v1
  HEAD: 6770c40ac52ce5e222e4f485b8c9c83aa3814d48 (this is also the PR #81 feature head; this worktree's HEAD should not change)

- Build Week frozen worktree (DO NOT MODIFY, read-only inspection only):
  path: /Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1
  branch: feat/m55-build-week-control-plane-v1
  HEAD: 0cba2cb998e07b81c71ea51d69f7ae0fe92b7f75 (frozen; should not change)

PR #81 MERGE FACTS (product implementation baseline — immutable):
- PR #81: MERGED at 2026-08-01T08:38:25Z
- Feature head: 6770c40ac52ce5e222e4f485b8c9c83aa3814d48
- Pre-merge main: 110fa79fe45ef24481a7fd1fd8e19cebbcb98d39
- Product implementation merge SHA / product implementation baseline: bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149
- Production diagnostics URL: https://m-55.jp/api/diagnostics/build

IMPORTANT DISTINCTION — read carefully:
The product implementation baseline is bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149
and does not change. A LATER docs-only transition merge (the docs transition
branch above, once merged) advances origin/main and Production diagnostics
beyond this SHA WITHOUT changing product runtime behavior. You must:
- read the ACTUAL current origin/main and Production diagnostics yourself,
- distinguish the product implementation baseline (bf5ef09f...) from any later
  docs-only main commits sitting on top of it,
- never assume origin/main must remain bf5ef09f... forever,
- never assume origin/main must still equal the docs transition branch's
  creation base or reviewed HEAD listed above.

GENERATED PRODUCT AUTHORITY STATUS: BLOCKING BEFORE FINAL NEW-THREAD MIGRATION
(as of this prompt's authoring; re-verify live before trusting this line):
- .product-authority/generated/authority-header.md and
  .product-authority/observations.json showed pre-merge values as of their
  last generation (2026-07-27T09:56:00+00:00): stale
  repository.lastObservedOriginMainSha (696559009367a6ac445dc7a07876590b16cd8488),
  production.lastObservedSha = null,
  growthShare.status = ACTIVE (stale), growthShare.mergeStatus =
  OPEN_UNMERGED_BRANCH_LOCAL (stale), and WT-012 absent from generated output.
- Generator execution alone is NOT sufficient to close this gap. It requires a
  separately authorized Product Authority Pack reconciliation run.
- Do NOT manually edit .product-authority/generated/** or
  .product-authority/observations.json.
- If, on your live read in step 2 below, this gap is still open, report it as
  a blocking_context_gap and do not treat Product Authority as reconciled.

REQUIRED READING ORDER (read and obey, in this exact order):
1. AGENTS.md
2. .product-authority/generated/authority-header.md
3. docs/ssot/README.md
4. docs/ssot/M55_CURRENT_STATE.md
5. docs/ssot/M55_WORKTREE_REGISTRY.md
6. docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md
7. docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md
8. docs/ssot/M55_SELF_FUNNEL_CONTRACT.md (explicit — this is the active lane
   contract for the just-completed PR #81 lane; do not infer which contract
   is active). Do NOT read M55_PAIR_FUNNEL_CONTRACT.md or any Pair /
   compatibility contract in this checkpoint — Pair implementation is not
   authorized; read it later only after a separate, explicit lane-change
   authorization.
9. docs/ssot/M55_DECISION_LOG.md
10. docs/ssot/M55_ROADMAP.md
11. docs/ssot/M55_PR81_POST_MERGE_HANDOFF_2026-08-01.md (full dated handoff —
    read this in full, including section M "Generated Product Authority
    status")

CLOSED GATES (do not reopen without new contradictory evidence):
Control Plane; Commit B; HOME responsive continuum; Hero line-break; Hero
overflow; commercial visual quality; Premium proof digest; commercial
gate-summary handoff; PR #81 Preview observation; Production route
observation.

HUMAN COMMERCIAL APPROVAL:
Human commercial-quality approval for PR #81 was FINAL prior to merge
(product value, brand quality, purchase direction, publication direction
approved). This is not agent self-report — it is recorded fact.

CURRENT TRANSITION LANE:
Docs-only post-merge SSOT reconciliation and ChatGPT thread handoff
(worktree above, "chore/m55-pr81-post-merge-transition-v1"). This is not a
product implementation lane.

NEXT PLANNED LANE:
二人向け無料→有料 (Pair free-to-paid funnel). Implementation is NOT YET
AUTHORIZED. Do not design or start it in this checkpoint.

HARD CONSTRAINTS FOR THIS FIRST MESSAGE:
- No implementation authorization is granted by this prompt.
- No source edits of any kind.
- No branch or worktree deletion.
- No manual deployment.
- No POST request or any Production mutation.
- Read-only verification only.

YOUR FIRST REQUESTED ACTION: READ-ONLY CONTEXT IMPORT VERIFICATION

Perform steps 1-11 of the required reading order above. Then independently
verify (read-only):
- your current worktree, branch, HEAD, and git status,
- origin/main (git fetch + rev-parse),
- Production diagnostics (GET https://m-55.jp/api/diagnostics/build),
- that M55_CURRENT_STATE.md, M55_WORKTREE_REGISTRY.md, and M55_ROADMAP.md are
  internally consistent with the PR #81 merge facts above and with each other,
- whether .product-authority/generated/authority-header.md and
  .product-authority/observations.json now agree with committed SSOT
  (growthShare.status, growthShare.mergeStatus, lastObservedOriginMainSha,
  production.lastObservedSha, and WT-012 presence) — if they still show the
  stale values listed above, Product Authority is NOT reconciled and you must
  report this as a blocking_context_gap, not proceed as if it were resolved,
  and NOT manually edit those generated files yourself.

Then return EXACTLY one structured JSON report in this shape (fill every
field; use null/false/[] where genuinely unknown or not yet done — do not
omit fields):

{
  "verdict": "",
  "agents_read": null,
  "ssot_reading_order_completed": null,
  "self_funnel_contract_read": null,
  "pair_contract_read": false,
  "origin_main": "",
  "production_diagnostics_sha": "",
  "product_implementation_baseline": "bf5ef09f4f9c1b8610c9039752f3d4ec93b4b149",
  "docs_transition_branch_head_live": "",
  "current_state_consistent": null,
  "worktree_registry_consistent": null,
  "roadmap_consistent": null,
  "closed_gates_understood": [],
  "current_transition_lane": "",
  "next_product_lane": "",
  "generated_product_authority_reconciled": null,
  "source_changes_performed": false,
  "branch_or_worktree_deleted": false,
  "blocking_context_gaps": [],
  "next_action": ""
}

SUCCESS VERDICT (use this exact string in "verdict" when all checks pass and
no blocking gaps remain):

M55_NEW_THREAD_CONTEXT_IMPORT_COMPLETE_READY_FOR_OLD_WORKTREE_CLOSEOUT_PLANNING

Do NOT start product implementation in this first message or as a result of
this checkpoint. If the verdict above is reached, the correct next step is to
wait for explicit Human instruction on old-worktree closeout or on
authorizing the next lane — not to begin implementation unprompted.
```
