# M55 Git-First External Red-Team Acceptance SSOT

Status: **ACTIVE / HUMAN-APPROVED ACCEPTANCE GATE (2026-09-11)**

This SSOT defines the final independent acceptance gate for the M55 Git-first AI work-routing system.

The system is **not USABLE merely because its authors, static verifiers, CI, or this ChatGPT believe it is correct**.

`GIT_FIRST_SYSTEM_EXTERNAL_RED_TEAM_REQUIRED = TRUE`

`GIT_FIRST_SYSTEM_USE_STATUS = PENDING_EXTERNAL_RED_TEAM`

`SELF_REVIEW_CANNOT_CLOSE_EXTERNAL_RED_TEAM_GATE = TRUE`

`MERGEABILITY_OR_CI_GREEN_IS_NOT_EXTERNAL_ACCEPTANCE = TRUE`

## A. Audit candidate identity

Every external review must pin:

- repository `lexsia228/m55-web`;
- PR number;
- base SHA;
- head SHA;
- exact changed-file set/diff;
- review timestamp;
- reviewer identity/type;
- same-head CI state;
- Git-host required-check/ruleset state when observable.

`EXTERNAL_REVIEW_RESULT_BINDS_TO_EXACT_HEAD_SHA = TRUE`

`HEAD_MOVEMENT_INVALIDATES_EXTERNAL_ACCEPTANCE = TRUE`

Any changed bytes after review require re-review unless their non-impact is independently demonstrated and Human accepts that exception.

## B. Independent reviewer requirement

Final high-confidence acceptance requires both:

- independent Codex exact-PR/diff red-team;
- independent GrokBOT adversarial/governance red-team;

against the same exact head SHA, without seeing each other's report first.

`MINIMUM_EXTERNAL_REVIEWERS_FOR_FINAL_USABLE = 2`

`REVIEWERS_MUST_BE_INDEPENDENT_BEFORE_ADJUDICATION = TRUE`

The implementer/author must not impersonate the external reviewer. A material finding from either reviewer cannot be discarded merely because the other passed.

## C. v3 implementation boundary the reviewer must understand

The reviewer must distinguish four layers:

1. **bounded machine path enforcement** — exact PR base/head changed paths are classified from manifest `hardTriggerPaths` + `semanticOwnerPaths`;
2. **mandatory semantic review** — meaning outside known paths is not claimed to be completely machine-detectable;
3. **host merge enforcement** — GitHub rules prevent direct unreviewed `main` updates and require the `verify-git-first-preflight` context;
4. **self-modification boundary** — because the required context is produced by candidate-controlled repository workflow/verifier code, that context is not immutable code attestation. Enforcement-critical changes require new same-SHA independent external review before broad adoption.

`STATIC_PATH_CLASSIFIER_IS_NOT_COMPLETE_SEMANTIC_PROOF = TRUE`

`REQUIRED_STATUS_CONTEXT_IS_NOT_IMMUTABLE_CODE_ATTESTATION = TRUE`

`ENFORCEMENT_CRITICAL_CHANGE_INVALIDATES_PRIOR_ACCEPTANCE = TRUE`

`ENFORCEMENT_CRITICAL_CHANGE_REQUIRES_CODEX_AND_GROK_REAUDIT = TRUE`

A report that criticizes v3 for not claiming complete static semantic understanding has misunderstood the contract. A report that finds a real bypass inside a claimed layer is valid.

## D. Mandatory reviewer questions

The reviewer must determine actual usability, not prose quality.

1. Does every M55 work unit encounter Git-first before substantive work?
2. Can a dangerous known changed path remain FAST without CI failure?
3. Can semantic money/legal/provider/identity/security meaning outside known patterns still be silently treated as statically proven safe?
4. Can a valid ordinary UIUX CSS continuation remain FAST without unrelated Creator/legal/provider/Product Authority archaeology?
5. Can a new chat resume FAST only from a valid durable `CONTINUATION_HANDOFF`, while CLOSED GREEN remains non-invalidated?
6. Are lane ownership/worktree/mutation-owner/mutable-path checks honest about being procedural rather than atomic?
7. Is overlapping mutation ownership fail-closed when detected?
8. Is relevant open/unmerged authority discovery a real bounded procedure rather than a ceremonial boolean?
9. Does remote-only review pin remote SHA and avoid inventing local state?
10. Are pre-mutation and pre-GREEN/integration rechecks sufficient to catch relevant drift?
11. Are structural manifest invariants actually validated?
12. Does Cursor `alwaysApply: true` corruption fail?
13. Do representative dangerous task-class downgrades to FAST fail?
14. Do missing mandatory stages/authority files fail?
15. Does the workflow run on every PR and fetch enough history for exact base/head diff?
16. Are checkout/full-history/required commands structurally bound to the exact required job?
17. Are `paths`, `paths-ignore`, restrictive PR branch filters and no-op required-job substitution rejected by the accepted fixture set?
18. Can routine UIUX work be forced into chronic FULL or Product Authority reruns unnecessarily?
19. Can another AI reconstruct the intended workflow from repo authority without chat memory?
20. Are audit-agent findings re-grounded against exact acceptance conditions before becoming blockers?
21. Is any claim stronger than the mechanism actually implemented?
22. If enforcement-critical files changed, was prior acceptance invalidated and was this exact new head reviewed independently by both Codex and Grok?

## E. Mandatory adversarial scenarios D1-D10

### D1 — Valid UIUX continuation

Approved CSS/presentation-only work, valid same-session or durable handoff, dedicated UIUX workspace.

Expected: Git identity + relevant UIUX authority + `CONTINUATION_FAST_PATH`; unrelated Creator/Stripe/legal/Product Authority reruns not required unless their semantics are touched or invalidated.

### D2 — UIUX disguised known-risk path

UIUX-labelled work changes a manifest hard-trigger/semantic-owner path, including root-level `app/checkout/**` or `app/webhook/**` cases.

Expected: exact changed-path CI classifier requires `FULL_REPO_PREFLIGHT` regardless of self-label.

### D3 — SSOT mutation disguised as editorial

Normative `docs/ssot/**` change called wording-only.

Expected: machine path trigger -> FULL + existing-contract/supersession check.

### D4 — Semantic risk outside named path

Money/DB/security/identity meaning appears in an unexpected source file not matched by classifier.

Expected: system does **not** claim machine proof of safety; mandatory semantic review must escalate when detected. Reviewer must assess false-negative risk honestly.

### D5 — Remote-only reviewer

No local runtime.

Expected: `LOCAL_RUNTIME_UNAVAILABLE`, exact remote candidate pinned, no local dirty/worktree invention.

### D6 — Open/unmerged authority

Main lacks a relevant Human-approved SSOT that exists in an open PR/stacked branch.

Expected: FULL procedure performs fresh bounded discovery, pins SHA, inspects relevant authority, and distinguishes `requiredAuthority` from `requiredUnmergedAuthority`.

### D7 — Lane collision

Two agents claim overlapping mutable paths.

Expected: detected overlap -> `MUTATION_OWNERSHIP_CONFLICT`. System must not overclaim an atomic distributed lock if none exists.

### D8 — Context/session transition

Paused UIUX task resumes in a new chat.

Expected: CLOSED GREEN is not invalidated; FAST allowed only if durable handoff fields are freshly reconstructed and Git identity matches. Missing/stale handoff -> FULL.

### D9 — Candidate moves

PR/HEAD/main changes after preflight or external review.

Expected: relevant recheck detects movement; external acceptance tied to old head becomes stale.

### D10 — Guardrail self-disable

Attempt representative corruption: alwaysApply=false, dangerous task class -> FAST, required authority missing, mandatory stage removed, workflow command removed, workflow narrowing, required job renamed/no-op substituted, verifier disconnected, or enforcement-critical implementation changed after acceptance.

Expected: repo structural/negative/diff checks reject the representative corruption where mechanically covered; host required check remains required; and any material enforcement-critical change invalidates prior external acceptance and requires exact-head Codex + Grok re-review before Human adoption. Repo CI alone is not called tamper-proof.

## F. Operational fixtures F1-F8

Reviewer must read `docs/ssot/M55_GIT_FIRST_OPERATIONAL_FIXTURES.md` and assess whether each failure mechanism is actually closed or honestly bounded.

Especially F1: an auditor testing `2 -> 1 -> 21` must not be accepted as proof that the exact `1 -> 12` acceptance sequence fails. External audit output is supporting evidence, not self-authenticating product truth.

`AUDIT_REPRODUCTION_MUST_MATCH_EXACT_ACCEPTANCE_CONDITION = TRUE`

## G. Severity

- `P0` — dangerous work can be authorized from wrong/stale authority or a core fail-closed boundary is materially bypassed;
- `P1` — likely material governance failure, serious claimed-enforcement bypass, contradictory authority, or cross-lane mutation risk;
- `P2` — meaningful reliability/usability gap that may be conditionally acceptable if non-safety-critical;
- `P3` — non-blocking clarity/maintainability improvement.

Do not score an explicitly documented limitation as P1 merely because it is not stronger than claimed. Score overclaim or bypass relative to the actual contract.

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
<whether enforcement-critical files changed; whether prior acceptance was invalidated; whether same-head independent re-review is complete>

IMPROVEMENTS
<ranked changes>

FINAL_CLASSIFICATION
USABLE | USABLE_WITH_CONDITIONS | NOT_USABLE

FINAL_REASON
<concise reason>
```

## I. Acceptance rule

Automatic acceptance is prohibited.

Candidate may be proposed as `USABLE` only when:

- Codex and Grok independently pin the same exact head;
- P0=0 and P1=0 in adjudicated result;
- D1-D10 PASS, or any uncertainty is evidenced non-material;
- F1-F8 PASS, or explicitly bounded limitations are correctly represented and non-blocking;
- no unresolved authority contradiction remains;
- same-head CI/static/negative/diff checks are GREEN;
- host-side required merge enforcement for the Git-first check is PROVEN;
- if enforcement-critical files changed, prior acceptance was explicitly invalidated and both external reviewers reviewed the new exact head;
- another AI can reconstruct the system without prior chat memory.

`USABLE_WITH_CONDITIONS` may be considered only for bounded non-safety-critical P2/P3 items. Missing host-side required-check enforcement or missing required re-review after an enforcement-critical change is not sufficient for final broad `USABLE`.

Any P0 or unresolved P1 -> `NOT_USABLE` until patched and re-reviewed.

If a patch changes the head after review, audit the new exact head again.

## J. Final Human authority

External AI provides independent engineering classification. It does not override Human authority.

Final adoption/merge/use remains a Human decision after Control Tower presents:

- exact external results;
- exact candidate SHA;
- same-SHA CI;
- host enforcement state;
- self-modification-boundary status;
- unresolved findings;
- remediation delta if any.

Until then:

`GIT_FIRST_SYSTEM_USE_STATUS = PENDING_EXTERNAL_RED_TEAM`
