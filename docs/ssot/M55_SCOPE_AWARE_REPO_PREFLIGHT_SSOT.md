# M55 Scope-Aware Repository Preflight SSOT

Status: **ACTIVE / HUMAN-APPROVED GOVERNANCE TARGET (2026-09-11)**

This SSOT prevents two opposite failures:

1. consequential M55 design proceeds from chat memory without checking durable Git/SSOT authority; and
2. bounded continuation lanes such as UIUX are repeatedly forced through unrelated Creator Revenue, legal, tax, provider, or global-control reading.

It does **not** change `docs/ssot/M55_EXECUTION_STATE.json`, reorder roadmap stages, authorize provider/Production mutation, or reopen CLOSED GREEN work.

## A. Core rule

`REPO_PREFLIGHT_REQUIRED_BEFORE_CONSEQUENTIAL_M55_DESIGN = TRUE`

`NO_GREEN_WITHOUT_REQUIRED_REPO_PREFLIGHT_EVIDENCE = TRUE`

`SEARCH_EXISTING_SSOT_BEFORE_CREATING_NEW_CONTRACT = TRUE`

`CHAT_MEMORY_IS_NOT_SUFFICIENT_FOR_M55_ARCHITECTURE = TRUE`

`PREFLIGHT_MUST_BE_SCOPE_AWARE = TRUE`

`CONTINUATION_LANES_MUST_NOT_BE_FORCED_THROUGH_UNRELATED_FULL_PREFLIGHT = TRUE`

A preflight is not one universal checklist. The agent must classify the task into exactly one preflight profile before consequential reasoning or mutation.

The machine-readable profile invariants, universal reads, changed-path triggers, semantic-owner paths, and durable continuation-handoff fields are defined by `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`.

## B. Preflight profiles

### B1. FULL_REPO_PREFLIGHT

Required when any of the following is true:

- cold start or new session **without a valid durable CONTINUATION_HANDOFF**;
- a new lane or materially new task is entered;
- Human requests or approves a new architecture, economics, reward, legal, tax, provider, security, DB, ledger, payout, SSOT, governance, or roadmap decision;
- the task can change financial meaning, legal meaning, product truth, provider behavior, data ownership, or cross-lane authority;
- a Control-Tower decision coordinates two or more lanes;
- the agent is about to declare `PLAN_GREEN`, `DESIGN_GREEN`, `FROZEN`, `AUTHORIZED`, or equivalent for a consequential new contract;
- existing SSOT coverage is unknown;
- an authority conflict, stale wording, or supersession question is detected;
- a manifest machine path trigger or mandatory semantic trigger enters scope.

Minimum evidence:

1. `AGENTS.md`;
2. all manifest universal required reads;
3. `docs/ssot/M55_EXECUTION_STATE.json` when global executable state is relevant;
4. fresh `origin/main` / remote-main identity;
5. `docs/ssot/README.md` or equivalent SSOT index;
6. only the **relevant** normative SSOTs for the task;
7. relevant open PR / stacked branch / unmerged authority when it can contain newer Human decisions;
8. CLOSED GREEN / no-replay evidence relevant to the proposed work;
9. local branch/worktree/dirty facts when local mutation is proposed, otherwise declare `LOCAL_RUNTIME_UNAVAILABLE` if not observable;
10. duplication/supersession check before creating a new contract.

A FULL preflight does **not** mean reading every M55 document. Relevance is mandatory; unrelated lane documents are excluded.

### B2. CONTINUATION_FAST_PATH

This is the default for an agent that is already executing an approved bounded lane such as UIUX, including a later/new session only when a durable continuation handoff is valid.

Allowed only when all are true:

- same conversation/session **or valid durable `CONTINUATION_HANDOFF`**;
- same assigned lane;
- same mutation owner;
- same registered/dedicated worktree or pinned remote branch;
- same authorized gate/task family;
- candidate SHA/workspace identity can be freshly re-observed;
- no manifest machine path trigger requires FULL;
- no new architecture/economics/legal/tax/provider/DB/ledger/security/governance decision is being made;
- no cross-lane file/authority collision is detected;
- no relevant Human decision has changed the lane contract.

A valid new-session handoff must contain all fields required by the manifest: lane, owner, workspace/ref, authorized task, candidate SHA, mutable paths, and observation time. Missing/stale/contradictory handoff evidence defaults FULL.

Required evidence is intentionally small:

1. lane identity and current authorized task;
2. lane-specific contract(s) already loaded or re-read only if changed/uncertain;
3. worktree/branch/HEAD/dirty identity before mutation when locally observable;
4. exact mutable-path boundary;
5. relevant shared authority only when the touched surface actually depends on it;
6. hard-trigger/semantic-expansion check before mutation and before consequential GREEN.

`CONTINUATION_FAST_PATH_DOES_NOT_REQUIRE_UNRELATED_CREATOR_REVENUE_SSOT = TRUE`

`CONTINUATION_FAST_PATH_DOES_NOT_REQUIRE_UNRELATED_LEGAL_TAX_PROVIDER_SSOT = TRUE`

`CONTINUATION_FAST_PATH_DOES_NOT_REQUIRE_FULL_MAIN_RECONCILIATION_EVERY_TURN = TRUE`

`CONTINUATION_HANDOFF_REQUIRED_FOR_NEW_SESSION_FAST = TRUE`

`NEW_CHAT_ALONE_IS_NOT_INVALIDATION = TRUE`

Fresh `origin/main` reconciliation becomes mandatory before merge/sync/rebase-like planning, cross-lane integration, or when main movement can affect the lane's touched paths/authority. It is not a per-message tax.

### B3. PINNED_REVIEW_PREFLIGHT

For read-only Codex/Grok/independent review of an exact candidate.

Minimum evidence:

- exact PR/branch/commit SHA;
- exact diff or artifact boundary;
- relevant lane SSOT;
- known accepted baselines/CLOSED GREEN evidence;
- mutation prohibition.

The reviewer does not need unrelated global/business SSOT unless the reviewed diff touches those semantics.

A remote-only reviewer must explicitly state `LOCAL_RUNTIME_UNAVAILABLE` for local facts it cannot observe and must not run local-ref verification while claiming it verified the pinned remote candidate.

## C. Scope routing examples

### UIUX continuation

A UIUX lane-owner/Cursor continuing an already-approved visual implementation:

- uses `CONTINUATION_FAST_PATH` when the current session is continuous or a durable handoff is valid;
- reads UIUX/commercial-quality/visual/lane authority as required;
- does **not** read Creator commission, Stripe payout, Japan tax, or affiliate legal SSOT merely because Creator Revenue is active elsewhere;
- does not fetch every open Creator PR;
- escalates only if it touches a manifest hard-trigger path or new Creator/payment/global authority semantics.

### Creator Revenue architecture

A Control-Tower agent deciding attribution, commission, payout, tax, Stripe, or Creator economics:

- uses `FULL_REPO_PREFLIGHT`;
- checks fresh main plus relevant unmerged Creator/legal branches;
- searches existing Creator SSOT before proposing new tokens/contracts;
- cannot freeze architecture from conversation memory alone.

### Simple continuation patch

An implementer fixing CSS inside an already-authorized UIUX allowlist:

- remains on FAST_PATH;
- no global repo archaeology;
- no Creator/Stripe/legal reading;
- exact-diff validation remains lane-specific.

### New chat resuming paused UIUX work

A new ChatGPT/Cursor session resumes a frozen UIUX PR after the governance system is adopted:

- reconstructs `CONTINUATION_HANDOFF` from Git/repo evidence;
- re-observes PR/branch/worktree identity;
- verifies the exact candidate SHA and mutable paths;
- reuses CLOSED GREEN findings unless actually invalidated;
- may then use FAST;
- defaults FULL if any required handoff field is missing or stale.

## D. Escalation from FAST_PATH to FULL

Immediate escalation is required when any of these occurs:

`NEW_HUMAN_ARCHITECTURE_DECISION`

`NEW_ECONOMIC_OR_REWARD_DECISION`

`LEGAL_OR_TAX_SEMANTICS_ENTER_SCOPE`

`STRIPE_OR_OTHER_PROVIDER_SEMANTICS_ENTER_SCOPE`

`DB_LEDGER_SECURITY_OR_MONEY_SEMANTICS_ENTER_SCOPE`

`SSOT_OR_GOVERNANCE_CHANGE_ENTER_SCOPE`

`CROSS_LANE_AUTHORITY_COLLISION`

`OPEN_PR_OR_STACKED_BRANCH_MAY_CONTAIN_NEWER_RELEVANT_AUTHORITY`

`RELEVANT_MAIN_OR_AUTHORITY_DRIFT`

`UNKNOWN_EXISTING_CONTRACT_COVERAGE`

`PLAN_OR_DESIGN_GREEN_FOR_NEW_CONTRACT`

`MACHINE_PATH_TRIGGER_MATCH`

A main SHA change alone does not automatically invalidate an unrelated continuation lane. Determine whether the change intersects the lane's touched paths or authority before escalating.

## E. Relevant open/unmerged authority discovery

For FULL work, `checkRelevantOpenPrOrStackedBranch` is not a ceremonial boolean. The agent must actually perform a fresh repository query when newer unmerged Human-approved authority could exist.

Minimum procedure:

1. identify the semantic owner/task class first;
2. inspect open PRs/stacked branches whose title, changed paths, known parent branch, or SSOT owner overlaps that semantic family;
3. pin each relevant result by PR/branch SHA and observation time;
4. inspect the relevant diff/SSOT before freezing a new decision;
5. record `none found` only after a real query, not from memory.

This is a bounded relevance search, not a scan of every open PR.

## F. External audit evidence is supporting evidence

Independent Codex/Grok reports do not become product truth by being repeated.

Before accepting a blocking finding:

- pin exact candidate SHA;
- retrieve the exact acceptance condition;
- verify the auditor reproduced that condition;
- classify mismatched reproduction as `NEEDS_FRESH_EVIDENCE` or `REJECT_FALSE_POSITIVE`;
- keep unrelated real findings separately.

The operational regression case is documented in `M55_GIT_FIRST_OPERATIONAL_FIXTURES.md`.

`EXTERNAL_AUDIT_OUTPUT_IS_NOT_SELF_AUTHENTICATING_AUTHORITY = TRUE`

`AUDIT_REPRODUCTION_MUST_MATCH_EXACT_ACCEPTANCE_CONDITION = TRUE`

## G. No-regression behavior

`FULL_PREFLIGHT_IS_NOT_BROAD_REAUDIT = TRUE`

`FAST_PATH_IS_NOT_PERMISSION_TO_IGNORE_RELEVANT_AUTHORITY = TRUE`

`NEW_CHAT_IS_PREFLIGHT_TRIGGER_NOT_CLOSED_GATE_INVALIDATOR = TRUE`

`MISSING_CURRENT_CHAT_EVIDENCE_DOES_NOT_AUTHORIZE_HIGH_COST_RERUN = TRUE`

`UNRELATED_ACTIVE_PROGRAM_DOES_NOT_FORCE_UNRELATED_LANE_READS = TRUE`

The system must reuse CLOSED GREEN evidence unless a real invalidator affects it.

## H. Observable handshake

For FULL preflight, the agent must be able to reconstruct internally or report when material:

```text
M55_REPO_PREFLIGHT
profile = FULL_REPO_PREFLIGHT
main_sha = <fresh remote main>
execution_gate = <current executable gate if relevant>
relevant_ssot = <bounded set>
unmerged_query = <fresh query/scope>
unmerged_observed_at = <timestamp>
unmerged_relevant_authority = <PR/branch+SHA set or none>
closed_evidence_reused = <bounded set>
local_runtime = AVAILABLE | LOCAL_RUNTIME_UNAVAILABLE
existing_contract_overlap = <summary>
real_delta = <summary>
```

For continuation work:

```text
M55_REPO_PREFLIGHT
profile = CONTINUATION_FAST_PATH
handoff = CONTINUATION_HANDOFF | SAME_SESSION
lane = <lane>
owner = <mutation owner>
workspace/ref = <known identity>
candidate_sha = <fresh SHA>
authorized_task = <task>
mutable_paths = <bounded set>
escalation_trigger = NONE
```

Do not spam these blocks on every message. They are evidence requirements, not user-facing ceremony. Re-emit only when the profile changes, material authority changes, or a consequential GREEN/freeze is being issued.

## I. Multi-agent isolation rule

One agent's FULL preflight must not pause unrelated agents that remain valid FAST_PATH continuations.

Example:

- Control Tower performs Creator Revenue FULL preflight;
- UIUX lane continues in its protected/dedicated worktree under FAST_PATH;
- neither agent changes the other's authority or files;
- a cross-lane conflict escalates to Control Tower only when actual overlap appears.

`FULL_PREFLIGHT_IN_ONE_LANE_DOES_NOT_GLOBALLY_BARRIER_OTHER_VALID_LANES = TRUE`

`ONE_LANE_ONE_MUTATION_OWNER` remains unchanged.

## J. Mutation boundary

This governance policy does not itself authorize source/runtime/provider mutation.

Implementation of this policy may update only governance/agent bootstrap documentation and corresponding verification logic under a separately bounded allowlist.

It must not modify:

- `docs/ssot/M55_EXECUTION_STATE.json` merely to record this policy;
- runtime UI/product code;
- Stripe/Clerk/Supabase/Vercel configuration;
- DB schema/data;
- protected UIUX worktrees;
- frozen Creator evidence worktrees.
