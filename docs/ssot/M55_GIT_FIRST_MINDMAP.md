# M55 Git-First Governance Mind Map

Status: **HUMAN-READABLE MAP / FINAL STRUCTURAL REMEDIATION / 2026-09-11**

```text
M55 AI WORK
|
+-- 0. WHAT AM I DOING?
|   +-- Control Tower
|   +-- UIUX lane owner / implementer
|   +-- Creator Revenue / legal / tax / Stripe / DB
|   +-- Reviewer (Codex / Grok / ChatGPT)
|   `-- Merge / sync / integration
|
+-- 1. GIT FIRST -- ALWAYS
|   +-- Local available?
|   |   +-- YES -> pwd / branch / HEAD / status / worktree ownership
|   |   `-- NO  -> LOCAL_RUNTIME_UNAVAILABLE + fresh GitHub branch/PR/SHA
|   `-- Never reason from chat memory alone
|
+-- 2. LOAD UNIVERSAL ROUTING
|   +-- Entrypoint
|   +-- Manifest
|   +-- Scope-aware preflight SSOT
|   +-- Hardening SSOT
|   `-- Host Enforcement SSOT
|
+-- 3. WHAT OWNS MY TASK?
|   +-- task-class routing manifest
|   +-- only relevant local authority
|   +-- distinguish requiredUnmergedAuthority
|   +-- fresh bounded open PR / stacked-branch discovery when required
|   `-- search existing contract before inventing a new one
|
+-- 4. HARD TRIGGER?
|   +-- MACHINE PATH MATCH
|   |   +-- hardTriggerPaths
|   |   +-- semanticOwnerPaths
|   |   `-- exact base/head diff ---------------------> FORCE FULL_REPO_PREFLIGHT
|   |
|   `-- SEMANTIC REVIEW
|       +-- money / price / rate / reward
|       +-- legal / tax / provider
|       +-- identity / auth / KYC / security
|       +-- DB / ledger / attribution
|       +-- executable state / cross-lane ownership
|       `-- detected semantic expansion -------------> FORCE FULL_REPO_PREFLIGHT
|
|   NOTE: static path classifier is NOT complete semantic proof
|
+-- 5. PROFILE
|   +-- CONTINUATION_FAST_PATH
|   |   +-- same active session OR valid CONTINUATION_HANDOFF
|   |   +-- same lane / owner / workspace-ref / task
|   |   +-- candidate SHA + mutable paths freshly re-observed
|   |   +-- no machine or semantic hard trigger
|   |   `-- Example: approved UIUX CSS/polish continuation
|   |
|   +-- PINNED_REVIEW_PREFLIGHT
|   |   +-- exact remote PR / branch / SHA
|   |   +-- exact diff/artifact
|   |   +-- relevant authority
|   |   `-- read-only; never invent local facts
|   |
|   `-- FULL_REPO_PREFLIGHT
|       +-- fresh main
|       +-- EXECUTION_STATE when relevant
|       +-- relevant SSOT
|       +-- fresh relevant unmerged authority
|       +-- CLOSED GREEN / no-replay
|       `-- duplicate/supersession check
|
+-- 6. LANE LOCK BEFORE MUTATION
|   |   (procedural ownership guard; NOT atomic distributed mutex)
|   +-- Worktree Registry + fresh Git are authority
|   +-- one mutation owner
|   +-- exact mutable-path allowlist
|   +-- relevant overlap/open-PR collision check
|   +-- optional .m55_lane_state.json = cache only
|   `-- overlap/unknown -> MUTATION_OWNERSHIP_CONFLICT / STOP
|
+-- 7. WORK
|   `-- execute only inside authorized semantic/path boundary
|
+-- 8. BEFORE WRITING / BEFORE GREEN
|   +-- branch/worktree/ref still correct?
|   +-- HEAD/candidate moved?
|   +-- dirty/staged paths expected?
|   +-- hard trigger appeared?
|   +-- mutation ownership changed?
|   +-- exact diff still inside scope?
|   +-- host required-check/ruleset still proven when merge/adoption depends on it?
|   `-- if changed -> refresh / reclassify / STOP
|
+-- 9. SUBTASK / SESSION BOUNDARY
|   +-- CONTEXT REFRESH
|   +-- new chat does NOT invalidate CLOSED GREEN
|   +-- new chat FAST requires durable CONTINUATION_HANDOFF
|   `-- missing/stale/contradictory handoff -> FULL
|
+-- 10. EXTERNAL AUDIT RESULT
|   +-- report is supporting evidence, not authority
|   +-- pin exact candidate
|   +-- retrieve exact acceptance condition
|   +-- reproduction matches contract?
|   |   +-- YES -> adjudicate finding
|   |   `-- NO  -> NEEDS_FRESH_EVIDENCE / REJECT_FALSE_POSITIVE
|   `-- preserve unrelated real findings separately
|
`-- 11. MACHINE ENFORCEMENT
    +-- manifest structural invariants
    +-- Cursor alwaysApply=true verification
    +-- exact changed-path classifier
    +-- GitHub Actions on every PR + push main
    +-- pinned js-yaml parser bootstrap
    +-- parsed canonical allowlist for Git-first workflow
    +-- parsed structure + run-body fingerprints for asset-index workflow
    +-- consolidated adversarial negative matrix
    `-- host required-check/ruleset REQUIRED for final adoption
```

## Enforcement layers

```text
KNOWN PATH RISK
  -> MACHINE classifier
  -> FULL declaration required in PR

UNKNOWN SEMANTIC RISK
  -> AI/Human semantic review
  -> FULL when meaning enters protected family

REPO WORKFLOW SEMANTICS
  -> parse YAML, do not infer security from line regex
  -> canonical fail-closed allowlist
  -> quoted-key/custom-shell/default-shell/data-flow morphs change semantics -> FAIL

HOST LAYER
  -> required verify-git-first-preflight context on main
  -> deletion/non-fast-forward protection
  -> no bypass actor

SELF-MODIFICATION BOUNDARY
  -> host context is not immutable code attestation
  -> enforcement-critical change invalidates prior acceptance
  -> same-head CI + independent Codex + Grok required before Human adoption
```

The repository does not claim that static path matching understands all semantic meaning, that a procedural Lane Lock is an atomic distributed mutex, or that a candidate-controlled required status context is immutable attestation.

## UIUX pause/resume live pilot

```text
PR #193 paused cleanly
 -> later new AI session
 -> reconstruct CONTINUATION_HANDOFF from durable Git/repo evidence
 -> fresh candidate SHA / lane / owner / mutable paths
 -> CLOSED GREEN remains closed
 -> no hard trigger
 -> CONTINUATION_FAST_PATH
 -> exact acceptance contract re-grounding for audit findings
```

## Safety principle

`FAST_PATH = FAST, NOT BLIND`

`FULL_PATH = DEEP, NOT BROAD`

`GIT_FIRST = ALWAYS`

`STATIC_PATH_CLASSIFIER_IS_NOT_COMPLETE_SEMANTIC_PROOF = TRUE`

`WORKFLOW_VALIDATION_USES_PARSED_YAML_SEMANTICS = TRUE`
