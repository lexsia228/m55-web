# M55 Git-First Adoption Closure SSOT

Status: **CLOSED / HUMAN-ADOPTED (2026-09-12)**

This SSOT closes the Git-first governance construction work carried by PR #194 and freezes the operational threat model so the governance system can be used to advance M55 instead of becoming an open-ended repository-security research project.

The latest explicit Human decision is authoritative over prior broader audit wording when they conflict.

## A. Original purpose — frozen

The Git-first system exists to make every consequential M55 work unit start from the correct durable Git/repository authority rather than from chat memory, while keeping already-approved bounded continuation lanes lightweight.

The required operating sequence remains:

`IDENTIFY_TASK -> GIT_IDENTITY -> RELEVANT_AUTHORITY -> EXISTING_DECISION_CHECK -> WORK`

The system must continue to provide:

- fresh repository / branch / PR / commit identity before consequential work;
- scope-aware routing to `CONTINUATION_FAST_PATH`, `PINNED_REVIEW_PREFLIGHT`, or `FULL_REPO_PREFLIGHT`;
- relevant-authority reading rather than unrelated full-repository archaeology;
- durable continuation handoff for a new session that wants FAST;
- known hard-trigger path escalation to FULL;
- mandatory AI/Human semantic escalation for money/legal/tax/provider/security/DB/ledger/cross-lane meaning outside static path proof;
- lane/worktree mutation ownership checks;
- pre-mutation and pre-GREEN/integration Git rechecks;
- host-side main protection and required Git-first status check;
- PR-based asset-index automation rather than direct-main automation writes.

This is the acceptance target. It is not a claim that PR-contained code is a tamper-proof security boundary against a hostile repository author.

## B. Adopted operational threat model

The following are **IN SCOPE** for Git-first adoption and remain blocking if concretely reproducible:

1. an AI begins consequential M55 work from stale chat memory without relevant Git identity/authority;
2. a known hard-trigger path can remain FAST under normal M55 repository pathname conventions;
3. a dangerous task class can be downgraded to FAST;
4. an ordinary workflow/configuration edit can disable or bypass the reviewed required-check semantics without being detected by the reviewed structural controls;
5. normal asset-index automation can write directly to `main`, auto-approve/merge, swallow required failures, or execute branch-controlled repository scripts across the reviewed boundary;
6. a relevant lane/worktree ownership collision can proceed without a fail-closed stop;
7. a stale/missing continuation handoff can be treated as valid FAST;
8. host ruleset / required-check / bypass state materially differs from the recorded required configuration;
9. a concrete authority-routing contradiction causes M55 to use the wrong normative owner;
10. a future enforcement-critical implementation change is adopted without the Human-required change-control process then in force.

The following are **OUT OF SCOPE for the PR #194 adoption gate** and are separate hostile-repository security hardening topics, not blockers for using the Git-first work-routing system:

- an intentionally malicious contributor creating pathological Git filenames specifically to evade a literal enforcement filename glob, including filenames containing literal backslash or other hostile pathname constructions outside normal M55 repository conventions;
- force-adding otherwise ignored `node_modules` content to shadow a tooling dependency or other deliberate dependency/module-resolution poisoning performed by a hostile repository author;
- arbitrary Git-object, module-loader, dependency-poisoning, runner-compromise, supply-chain, or equivalent hostile-contributor attacks that assume the attacker can deliberately author repository bytes solely to subvert the governance verifier;
- theoretical bypasses that require redefining the repository itself as a hostile execution environment rather than testing whether the M55 routing mechanism works under its intended operating model.

These exclusions do not assert the attacks are impossible or false. They define the boundary of this governance product. Security hardening for those attack classes may be undertaken later only in a separate task/PR if the Human explicitly opens it.

`HOSTILE_REPOSITORY_SECURITY_IS_SEPARATE_FROM_GIT_FIRST_ROUTING_ADOPTION = TRUE`

## C. Final disposition of the last Grok findings

On exact reviewed head `b8cfbb37390fe9fa4a4e00239142d8a41b731eb4`, the final GrokBOT cycle reported two concrete hostile-repository findings:

1. a literal-backslash enforcement-filename construction that can miss an enforcement-critical single-segment glob because the reviewed verifier normalizes backslash to slash;
2. a force-added repo-local `node_modules/js-yaml` package that can precede the runner-installed parser in Node resolution.

These findings are **accepted as real residual security risks**, not rejected as false positives.

They are reclassified by explicit Human product-boundary decision as:

`OUT_OF_SCOPE_HOSTILE_REPOSITORY_HARDENING`

They do not invalidate the Git-first routing/adoption target defined in section B.

No patch for these two findings is authorized as part of PR #194 closure.

## D. Stop rule — prevents audit/remediation loops

PR #194 governance hardening is closed when all of the following hold:

- the original routing purpose in section A is implemented;
- same-head CI for the final candidate is GREEN;
- the live main ruleset and required `verify-git-first-preflight` context are proven with no bypass actor;
- no concrete unresolved P0/P1 exists **inside the adopted operational threat model in section B**;
- known out-of-scope hostile-repository residuals are documented rather than recursively patched;
- the Human explicitly adopts/merges the candidate.

After closure, a newly imagined hostile-repository edge case does **not** reopen PR #194.

A new remediation cycle may begin only if at least one of these occurs:

- a concrete failure is reproduced inside the adopted operational threat model;
- the live host enforcement becomes missing/weakened;
- normal M55 repository usage exposes a material governance failure;
- the Human explicitly opens a separate security-hardening task.

`NO_OPEN_ENDED_RED_TEAM_LOOP = TRUE`

`PR194_MUST_NOT_BE_REOPENED_FOR_OUT_OF_SCOPE_SECURITY_HARDENING = TRUE`

## E. Documentation-only closure exception

The independent Codex and Grok reviews were performed against exact head `b8cfbb37390fe9fa4a4e00239142d8a41b731eb4` before this closure decision. Those reviews supplied the evidence used for the Human adjudication above.

This closure changes the **product acceptance boundary**, not the reviewed runtime/product implementation or the enforcement mechanism.

The Human explicitly authorizes the documentation-only closure commit that:
- creates this SSOT; and
- aligns `M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md`;

without starting another external red-team cycle, provided:
- the final diff is limited to exactly those two governance documents;
- same-head CI is GREEN; and
- fresh host enforcement remains proven before merge.

This is a one-time Human closure exception. It must not be generalized into permission for later enforcement-code/workflow changes to skip applicable review.

`PR194_DOCUMENTATION_CLOSURE_REAUDIT_EXCEPTION = HUMAN_APPROVED_ONE_TIME`

## F. Final adoption state

The Human has explicitly approved completion and closure of this governance construction work.

After this documentation-only closure is committed, final same-head CI and host checks are GREEN, and PR #194 is merged:

`GIT_FIRST_SYSTEM_USE_STATUS = HUMAN_ADOPTED`

`GIT_FIRST_GOVERNANCE_CONSTRUCTION = CLOSED`

Future M55 chats must use the Git-first system as infrastructure and return to active M55 product/program work. They must not restart the PR #194 hardening history unless a section-D reopening condition is actually met.
