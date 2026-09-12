# M55 Git-First External Red-Team Acceptance SSOT

Status: **CLOSED / HUMAN-ADOPTED ACCEPTANCE GATE (2026-09-12)**

This SSOT defines the final independent acceptance gate for the M55 Git-first AI work-routing system.

The system is **not USABLE merely because its authors, static verifiers, CI, or this ChatGPT believe it is correct**.

`GIT_FIRST_SYSTEM_EXTERNAL_RED_TEAM_REQUIRED = TRUE`

`GIT_FIRST_SYSTEM_USE_STATUS = HUMAN_ADOPTED`

`ADOPTED_OPERATIONAL_THREAT_MODEL = docs/ssot/M55_GIT_FIRST_ADOPTION_CLOSURE_SSOT.md`

The closure SSOT (`M55_GIT_FIRST_ADOPTION_CLOSURE_SSOT.md`) is the final authority for operational threat-model scope and stop/reopen rules. Older broader adversarial examples in this document remain historical regression/security evidence but do not expand the adopted threat model beyond the closure SSOT.

`SELF_REVIEW_CANNOT_CLOSE_EXTERNAL_RED_TEAM_GATE = TRUE`

`MERGEABILITY_OR_CI_GREEN_IS_NOT_EXTERNAL_ACCEPTANCE = TRUE`

## A. Audit candidate identity

Every external review must pin repository `lexsia228/m55-web`, PR number, base SHA, head SHA, exact changed-file set/diff, review timestamp, reviewer type, same-head CI state, and live Git-host required-check/ruleset state when observable.

`EXTERNAL_REVIEW_RESULT_BINDS_TO_EXACT_HEAD_SHA = TRUE`

`HEAD_MOVEMENT_INVALIDATES_EXTERNAL_ACCEPTANCE = TRUE`

Any changed bytes after review require re-review unless their non-impact is independently demonstrated and Human explicitly accepts that exception.

**One-time documentation-only closure exception (Human-approved):** the Human-authorized documentation-only closure that changes only `docs/ssot/M55_GIT_FIRST_ADOPTION_CLOSURE_SSOT.md` and `docs/ssot/M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md` does NOT require another Codex/Grok cycle. It requires an exact two-document diff, same-head CI GREEN, fresh host enforcement proof, then merge. See `PR194_DOCUMENTATION_CLOSURE_REAUDIT_EXCEPTION = HUMAN_APPROVED_ONE_TIME` in the closure SSOT.

## B. Independent reviewer requirement

Final high-confidence acceptance requires both independent Codex and independent GrokBOT red-team reviews against the same exact head SHA, without seeing each other's current-cycle report first.

`MINIMUM_EXTERNAL_REVIEWERS_FOR_FINAL_USABLE = 2`

`REVIEWERS_MUST_BE_INDEPENDENT_BEFORE_ADJUDICATION = TRUE`

A material finding from either reviewer cannot be discarded merely because the other passes.

## C. FINAL STRUCTURAL REMEDIATION boundary

The reviewer must distinguish five layers:

1. **bounded machine path enforcement** — exact PR base/head changed paths are classified from manifest `hardTriggerPaths` + `semanticOwnerPaths`;
2. **mandatory semantic review** — meaning outside known paths is not claimed to be completely machine-detectable;
3. **parsed workflow semantic enforcement** — security-critical GitHub Actions YAML is parsed using pinned `js-yaml@4.1.1` and compared against canonical fail-closed allowlists, not line-oriented regex;
4. **host merge enforcement** — GitHub rules prevent direct unreviewed `main` updates and require the `verify-git-first-preflight` context;
5. **self-modification boundary** — because the required context is produced by candidate-controlled repository workflow/verifier code, that context is not immutable code attestation. Any enforcement-critical change invalidates prior acceptance and requires new exact-head same-SHA CI plus independent Codex and Grok review before Human adoption.

The Git-first workflow allowlist fixes trigger scope, checkout/full history, pinned parser bootstrap, required job/step order, env, and exact commands. Quoted/unquoted YAML spelling may differ when parsed semantics are identical, but conditional execution, `continue-on-error`, defaults/custom shell, command wrappers, trigger narrowing, extra steps/keys, parser bootstrap drift, or other semantic additions must fail.

The asset-index allowlist fixes the complete parsed job/step structure, branch-source env, conditions/actions, and SHA-256 fingerprints of shell bodies. Branch redirection, env reassignment, failure swallowing, API/ref mutation, shell/default changes, or any run-body drift must fail the repo-layer semantic check.

`WORKFLOW_VALIDATION_USES_PARSED_YAML_SEMANTICS = TRUE`

`SECURITY_CRITICAL_WORKFLOWS_USE_FAIL_CLOSED_ALLOWLIST = TRUE`

`STATIC_PATH_CLASSIFIER_IS_NOT_COMPLETE_SEMANTIC_PROOF = TRUE`

`REQUIRED_STATUS_CONTEXT_IS_NOT_IMMUTABLE_CODE_ATTESTATION = TRUE`

`ENFORCEMENT_CRITICAL_CHANGE_INVALIDATES_PRIOR_ACCEPTANCE = TRUE`

`ENFORCEMENT_CRITICAL_CHANGE_REQUIRES_CODEX_AND_GROK_REAUDIT = TRUE`

Do not classify the mere fact that a self-modifying repository can edit its own verifier as a new P0/P1; that limitation is explicit and is closed procedurally by exact-head external dual review plus Human adoption. Do report a concrete bypass of the reviewed parsed allowlist, host enforcement, authority routing, or re-review requirement.

## D. Mandatory reviewer questions

The reviewer must determine actual usability, not prose quality.

1. Does every M55 work unit encounter Git-first before substantive work?
2. Can a dangerous known changed path remain FAST without CI failure?
3. Is semantic risk outside known paths honestly bounded rather than machine-proven safe?
4. Can ordinary bounded UIUX continuation remain FAST without unrelated Product Authority/Creator/legal/provider archaeology?
5. Can a new chat resume FAST only from valid durable `CONTINUATION_HANDOFF`, while CLOSED GREEN remains closed?
6. Is Lane Lock represented as procedural rather than atomic?
7. Is overlapping mutation ownership fail-closed when detected?
8. Is relevant open/unmerged authority discovery a real bounded procedure rather than a ceremonial boolean?
9. Does remote-only review pin remote SHA and avoid inventing local state?
10. Do pre-mutation and pre-GREEN/integration rechecks catch relevant drift?
11. Are structural manifest invariants validated?
12. Does Cursor `alwaysApply: true` corruption fail?
13. Do dangerous task-class downgrades to FAST fail?
14. Do missing mandatory stages/authority files fail?
15. Does the Git-first workflow run on every PR and push main without path/branch/type narrowing?
16. Does parsed-YAML validation bind checkout/full history, parser bootstrap, required commands, step order and env to the exact required job?
17. Do quoted `if` / `continue-on-error`, job/step conditions, defaults/custom shells, command wrappers and duplicate keys fail?
18. Does parser-bootstrap version/path tampering fail?
19. Are root and case-variant protected paths conservatively classified?
20. Does asset-index parsed validation reject `BRANCH=main`, resolver/data-flow changes, shell reassignment, `|| :`, custom shells, REST/GraphQL/ref mutation, auto-approval/merge and run-body drift?
21. Can another fresh AI reconstruct the system from repo authority without chat memory?
22. Are audit findings re-grounded against exact acceptance conditions before becoming blockers?
23. Is any claim stronger than the mechanism actually implemented?
24. If enforcement-critical files changed, was prior acceptance invalidated and was this exact new head independently reviewed by both Codex and Grok?

## E. Mandatory adversarial scenarios D1-D10

### D1 — Valid UIUX continuation
Expected: Git identity + relevant UIUX authority + `CONTINUATION_FAST_PATH`; unrelated Creator/Stripe/legal/Product Authority work is not required unless those semantics enter scope.

### D2 — UIUX disguised known-risk path
Change root/nested/case-varied checkout/webhook or another machine-trigger path. Expected: `FULL_REPO_PREFLIGHT` regardless of label.

### D3 — SSOT mutation disguised as editorial
Normative `docs/ssot/**` change. Expected: machine trigger -> FULL + existing-contract/supersession check.

### D4 — Semantic risk outside named path
Money/DB/security/identity meaning appears in an unexpected file. Expected: no claim of static machine proof; AI/Human semantic review must escalate when detected.

### D5 — Remote-only reviewer
Expected: `LOCAL_RUNTIME_UNAVAILABLE`, exact remote candidate pinned, no invented local facts.

### D6 — Open/unmerged authority
Expected: FULL procedure performs fresh bounded discovery, pins SHA, inspects relevant authority, and distinguishes `requiredAuthority` from `requiredUnmergedAuthority`.

### D7 — Lane collision
Expected: detected overlap -> `MUTATION_OWNERSHIP_CONFLICT`; no atomic-lock overclaim.

### D8 — Context/session transition
Expected: CLOSED GREEN is not invalidated; FAST only from complete fresh durable handoff + re-observed Git identity; otherwise FULL.

### D9 — Candidate moves
Expected: relevant recheck detects movement; old external acceptance becomes stale.

### D10 — Guardrail self-disable
Attack the actual parsed semantic boundary: quoted mapping keys, duplicate keys, aliases/anchors where relevant, job/step `if`, `continue-on-error`, defaults/custom shell, command wrappers, parser bootstrap/version/path, trigger narrowing including `pull_request.types`, step/order/env changes, no-op substitution, asset-index branch/env/data-flow changes, failure suppression, direct-main/ref/API/GraphQL mutation, and enforcement-critical changes after acceptance.

Expected: the reviewed candidate's repo-layer parsed canonical allowlists/negative fixtures reject semantic drift; host required check remains required; any enforcement-critical change still invalidates prior external acceptance and requires new exact-head dual review before Human adoption.

**D10/F5 scope clarification:** D10 and F5 continue to test ordinary semantic self-disable/configuration drift in the reviewed mechanism. They do not redefine PR #194 as a hostile-repository/supply-chain security product. Intentionally force-added dependency shadowing and pathological filename construction are governed by the closure SSOT (`M55_GIT_FIRST_ADOPTION_CLOSURE_SSOT.md`) and are out of scope for this adoption gate.

## F. Operational fixtures F1-F8

Reviewer must read `docs/ssot/M55_GIT_FIRST_OPERATIONAL_FIXTURES.md` and assess whether each failure mechanism is actually closed or honestly bounded.

Especially F1: an auditor testing `2 -> 1 -> 21` cannot be accepted as proof that exact accepted `1 -> 12` fails.

`AUDIT_REPRODUCTION_MUST_MATCH_EXACT_ACCEPTANCE_CONDITION = TRUE`

## G. Severity

- `P0` — dangerous work can be authorized from wrong/stale authority or a core fail-closed boundary is materially bypassed;
- `P1` — likely material governance failure, serious claimed-enforcement bypass, contradictory authority, or cross-lane mutation risk;
- `P2` — meaningful reliability/usability gap that is non-safety-critical and may be conditionally acceptable;
- `P3` — non-blocking clarity/maintainability improvement.

Do not score an explicitly documented limitation as P0/P1 merely because a stronger mechanism is imaginable. Score concrete overclaim or bypass relative to the contract.

**Threat-model interpretation:** P0/P1 blocking severity is evaluated against the adopted operational threat model in `M55_GIT_FIRST_ADOPTION_CLOSURE_SSOT.md`. A concrete finding outside that adopted threat model is NOT called false; it is preserved as residual/security-hardening evidence; it does not recursively reopen PR #194; it may only become a new blocker if Human explicitly expands the threat model or opens a separate hardening task.

## H. Required reviewer output

```text
PINNED_AUTHORITY
repository = lexsia228/m55-web
pr = <number>
base_sha = <sha>
head_sha = <sha>
changed_files = <exact count/list or diff reference>
reviewer = CODEX | GROKBOT
ci_state = <same-head state>
host_required_check_state = PROVEN | MISSING | UNOBSERVABLE

RECONSTRUCTION_TEST
<workflow reconstructed only from repo authority>

ADVERSARIAL_RESULTS
D1 = PASS | FAIL | UNCERTAIN
...
D10 = PASS | FAIL | UNCERTAIN

OPERATIONAL_FIXTURES
F1 = PASS | FAIL | UNCERTAIN
...
F8 = PASS | FAIL | UNCERTAIN

FINDINGS
P0 = <count + findings>
P1 = <count + findings>
P2 = <count + findings>
P3 = <count + findings>

CONTRADICTIONS
<none or exact contradictions>

BYPASS_PATHS
<none or exact bypasses>

FALSE_POSITIVE_RISK
<especially ordinary UIUX burden>

OTHER_AI_COMPREHENSION
ChatGPT = PASS | FAIL | UNCERTAIN
Cursor = PASS | FAIL | UNCERTAIN
Codex = PASS | FAIL | UNCERTAIN
Grok = PASS | FAIL | UNCERTAIN

HOST_ENFORCEMENT
<required-check/ruleset evidence and limitation>

SELF_MODIFICATION_BOUNDARY
<whether enforcement-critical files changed; prior acceptance invalidation; same-head dual re-review status>

IMPROVEMENTS
<ranked changes; do not block USABLE on bounded P2/P3 unless materially safety-critical>

FINAL_CLASSIFICATION
USABLE | USABLE_WITH_CONDITIONS | NOT_USABLE

FINAL_REASON
<concise reason>
```

## I. Acceptance rule

Automatic acceptance is prohibited.

Candidate may be proposed as `USABLE` only when:

- Codex and Grok independently pin the same exact head;
- adjudicated P0=0 and P1=0;
- D1-D10 PASS, or any uncertainty is evidenced non-material;
- F1-F8 PASS, or explicitly bounded limitations are correctly represented and non-blocking;
- no unresolved authority contradiction remains;
- same-head CI/static/negative/diff checks are GREEN;
- host-side required merge enforcement is PROVEN;
- enforcement-critical changes explicitly invalidated prior acceptance and both external reviewers reviewed the new exact head;
- another AI can reconstruct the system without prior chat memory.

`USABLE_WITH_CONDITIONS` may be considered for bounded non-safety-critical P2/P3 items. P2/P3 alone do not trigger another remediation cycle unless Human/Control Tower determines they materially undermine the acceptance boundary.

Any concrete P0 or unresolved P1 **inside the adopted operational threat model** -> `NOT_USABLE` until resolved or explicitly re-adjudicated by Human authority.

Findings classified by the closure SSOT as `OUT_OF_SCOPE_HOSTILE_REPOSITORY_HARDENING` are documented residual risks and do not block PR #194 adoption.

## J. Final Human authority

External AI provides independent engineering classification. It does not override Human authority.

Final adoption/merge/use remains a Human decision after Control Tower presents exact external results, exact candidate SHA, same-SHA CI, host enforcement state, self-modification-boundary status, and unresolved findings.

Independent Codex and Grok exact-head reviews completed on `b8cfbb37390fe9fa4a4e00239142d8a41b731eb4`. The last Grok hostile-repository findings (literal-backslash enforcement-filename construction and force-added repo-local `node_modules/js-yaml` dependency shadowing) were explicitly preserved but bounded out of the operational adoption threat model by Human decision.

Human adoption is **APPROVED**. After exact two-document closure diff + same-head CI GREEN + fresh host ruleset proof, PR #194 is merge-authorized. No further external audit cycle is required for this one-time documentation closure.

`GIT_FIRST_SYSTEM_USE_STATUS = HUMAN_ADOPTED`
