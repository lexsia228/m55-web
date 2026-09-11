# M55 Git-First Hardening SSOT

Status: **ACTIVE / HUMAN-APPROVED GOVERNANCE TARGET (2026-09-11)**

Purpose: harden the Git-first preflight so correctness does not depend only on an AI correctly self-classifying its task.

This annex is subordinate to `AGENTS.md` and `M55_EXECUTION_STATE.json` for executable authority and complements `M55_GIT_FIRST_ENTRYPOINT.md` and `M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`.

## A. Bounded machine path triggers + mandatory semantic review

`HARD_TRIGGER_FORCES_FULL_PREFLIGHT = TRUE`

The machine-verifiable subset is defined in `M55_GIT_PREFLIGHT_MANIFEST.json` as `hardTriggerPaths` and `semanticOwnerPaths`.

If an intended or observed changed path matches one of those patterns, the task is forced to `FULL_REPO_PREFLIGHT` and the PR must declare:

`M55_PREFLIGHT_PROFILE: FULL_REPO_PREFLIGHT`

The exact changed-path classifier runs from the PR base/head diff in CI.

This is deliberately called **bounded machine path enforcement**, not complete semantic enforcement.

Semantic hard triggers also force FULL regardless of path: money movement, price/rate/reward definition, legal/tax meaning, identity/KYC, authorization/security, attribution authority, ledger authority, provider behavior, executable gate/NEXT, cross-lane ownership, or a new normative SSOT.

Those semantic triggers require AI/human review because a static path classifier cannot prove all semantic meaning.

`STATIC_PATH_CLASSIFIER_IS_NOT_COMPLETE_SEMANTIC_PROOF = TRUE`

A path trigger is conservative. It may escalate a simple edit, but a false escalation is safer than silently changing money/legal/global authority under FAST.

## B. Lane ownership guard — procedural, not an atomic lock

`LANE_LOCK_REQUIRED_BEFORE_MUTATION = TRUE`

The canonical ownership authority remains `M55_WORKTREE_REGISTRY.md` plus fresh Git/worktree facts. Do not create a competing global authority.

The phrase **Lane Lock** in diagrams means a required procedural ownership guard. It is **not** an OS/file-system mutex and is not claimed to be an atomic distributed lock.

Before mutation the agent must prove:

- registered/dedicated workspace or pinned branch identity;
- one declared mutation owner;
- exact mutable path boundary;
- no known overlapping mutation owner;
- fresh branch/HEAD/dirty state when locally observable;
- relevant open PR/stacked-branch collision check when shared owners may overlap.

If two agents claim overlapping mutable paths, both must stop with `MUTATION_OWNERSHIP_CONFLICT` until Control Tower/Human reconciles ownership.

For new dedicated mutation workspaces, a machine-readable workspace-local lane marker MAY be generated from the registry, e.g. `.m55_lane_state.json`, containing only:

- lane id;
- mutation owner;
- branch/worktree identity;
- allowed path families;
- prohibited path families;
- authority source/version;
- generated/observed timestamp.

The marker is a cache/guard, never authority over the registry. If it disagrees with registry/fresh Git, STOP.

Existing protected UIUX worktrees are grandfathered: do not inject or mutate local lane-marker files merely to adopt this policy. Their existing registered ownership remains valid. Introduce lane markers only through a separately authorized workspace setup or when that lane is next legitimately reconciled.

`LANE_STATE_CACHE_NEVER_OVERRIDES_REGISTRY = TRUE`

`LANE_ALLOWLIST_VIOLATION = STOP`

## C. Durable continuation handoff + context refresh

External audit correctly identifies long-context drift risk, but mandatory new-chat resets are not adopted as a correctness primitive.

`SUBTASK_BOUNDARY_CONTEXT_REFRESH_REQUIRED = TRUE`

A new chat does not invalidate CLOSED GREEN. A new chat also does not automatically qualify for FAST.

A new session may continue on FAST only when a valid `CONTINUATION_HANDOFF` can be reconstructed from durable Git/repo evidence with all fields required by the manifest, followed by fresh Git identity observation.

If the handoff is missing/stale/contradictory, default FULL.

At a material subtask boundary, before starting the next work unit, re-run the compact Git-first entry:

1. identify task/lane;
2. re-observe relevant Git identity;
3. re-read changed/uncertain relevant authority;
4. confirm existing-decision/duplicate status;
5. select FAST/PINNED/FULL again.

Use FULL again when the new subtask changes semantic class or crosses a hard trigger.

## D. Non-human enforcement — repo layer

`CI_FAIL_CLOSED_FOR_GIT_FIRST_GOVERNANCE = TRUE`

Repo-level enforcement layers:

1. legacy compatibility verifiers remain active;
2. structural verifier validates manifest invariants, required authority existence, Cursor `alwaysApply: true`, workflow semantics, and continuation-handoff requirements;
3. security-critical workflow validation parses YAML with pinned `js-yaml@4.1.1` and compares the parsed result to a fail-closed canonical allowlist rather than relying on line-oriented regex;
4. the Git-first required workflow allowlist fixes trigger scope, checkout depth, parser bootstrap, required job/step order, env, commands, and forbids additional conditional/non-blocking/custom-shell/default-shell semantics by exact parsed-structure comparison;
5. the asset-index workflow allowlist fixes job/step structure, branch-source env, conditions, actions, and SHA-256 fingerprints of each shell body so branch redirection, shell wrapping, failure suppression, API mutation, or run-body drift fails structurally;
6. negative policy tests consolidate the v3/v4 adversarial corpus, including quoted YAML keys, `if`, `continue-on-error`, custom/default shells, parser-bootstrap tampering, trigger narrowing, branch env override, branch reassignment, `|| :`, REST/GraphQL mutation, root-level glob, and case-variant path attacks;
7. exact changed-path classifier evaluates PR base/head and requires FULL declaration for known protected paths;
8. GitHub Actions runs on every PR and on pushes to main;
9. protected runtime/provider/DB operations retain their own existing gates;
10. external Codex/Grok red-team remains required before this governance system is adopted as USABLE.

`WORKFLOW_VALIDATION_USES_PARSED_YAML_SEMANTICS = TRUE`

`SECURITY_CRITICAL_WORKFLOWS_USE_FAIL_CLOSED_ALLOWLIST = TRUE`

Important limitation: repo-contained CI cannot make itself cryptographically undeletable or immutably attest a candidate that changes its own workflow/verifier. The parsed allowlist is a strong regression/control layer for the reviewed candidate, not a substitute for the self-modification boundary. Any enforcement-critical change invalidates prior acceptance and requires same-head CI plus independent Codex and Grok review before Human adoption.

`REQUIRED_STATUS_CONTEXT_IS_NOT_IMMUTABLE_CODE_ATTESTATION = TRUE`

`ENFORCEMENT_CRITICAL_CHANGE_REQUIRES_CODEX_AND_GROK_REAUDIT = TRUE`

`REPO_CI_SELF_PROTECTION_REQUIRES_HOST_REQUIRED_CHECK = TRUE`

A local Git hook may improve ergonomics, but it is never the sole authority.

## E. External audit findings must be re-grounded

An external AI report is supporting evidence, not self-authenticating product truth.

`EXTERNAL_AUDIT_OUTPUT_IS_NOT_SELF_AUTHENTICATING_AUTHORITY = TRUE`

Before accepting a blocking audit finding:

1. pin the exact candidate SHA;
2. retrieve the exact acceptance condition/contract;
3. compare the auditor's reproduction sequence/evidence with that contract;
4. reject or downgrade mismatched reproduction rather than reopening product source;
5. preserve unrelated real findings independently.

The UIUX PR #193 month-input incident is preserved in `M55_GIT_FIRST_OPERATIONAL_FIXTURES.md`: `2 -> 1 -> 21` does not disprove the accepted uninterrupted `1 -> 12` sequence.

`AUDIT_REPRODUCTION_MUST_MATCH_EXACT_ACCEPTANCE_CONDITION = TRUE`

## F. Escalation algorithm

```text
TASK ARRIVES
  -> GIT_FIRST_BASELINE
  -> identify intended/read/touched paths + semantics
  -> MACHINE PATH TRIGGER?
       YES -> FULL_REPO_PREFLIGHT
       NO  -> SEMANTIC TRIGGER REVIEW
               YES -> FULL_REPO_PREFLIGHT
               NO  -> evaluate profile
                       valid durable continuation -> CONTINUATION_FAST_PATH
                       exact read-only candidate -> PINNED_REVIEW_PREFLIGHT
                       otherwise -> FULL_REPO_PREFLIGHT
  -> lane ownership/allowlist guard
  -> relevant authority check
  -> existing decision check
  -> work
  -> pre-mutation recheck
  -> exact-diff scope check
  -> pre-GREEN/integration recheck
```

## G. Failure tokens

- `GIT_PREFLIGHT_INCOMPLETE`
- `HARD_TRIGGER_FULL_PREFLIGHT_REQUIRED`
- `LANE_LOCK_UNPROVEN`
- `LANE_ALLOWLIST_VIOLATION`
- `CONTEXT_REFRESH_REQUIRED`
- `MUTATION_OWNERSHIP_CONFLICT`

No failure token authorizes reset/stash/clean/rebase/force push or unrelated mutation.

## H. External audit disposition

Accepted/adapted from the external audit cycles:

- path machine triggers: **ACCEPT / IMPLEMENT bounded diff classifier**;
- semantic triggers: **ACCEPT as mandatory AI review; do not overclaim static completeness**;
- physical lane lock wording: **REJECT overclaim / retain procedural ownership guard unless an atomic mechanism is later introduced**;
- context flush: **ADAPT to durable continuation handoff + mandatory task-boundary context refresh**;
- regex workflow hardening: **RETIRED for security-critical workflow semantics**;
- parsed YAML + canonical allowlist: **ADOPT as repo-layer semantic regression enforcement**;
- self-modification: **repo CI is not immutable attestation; host required check + exact-head independent dual audit + Human adoption remain the final acceptance boundary**;
- external audit: **must be re-grounded against exact acceptance contract before blocker acceptance**.

This annex creates governance only. It does not authorize runtime UI, Stripe, DB, provider, deploy, merge, or Production mutation.
