# M55 Draft-PR-First Review Model SSOT

Status: **ACTIVE / HUMAN-APPROVED / FROZEN OPERATING MODEL**  
Version: **1.0.0**  
Human approval date: **2026-09-13**

This file freezes the default M55 handoff model for moving an implementation candidate from the mutation plane to independent review with the same assurance and less transfer latency.

It is a **cross-lane operating SSOT**. It is intentionally reusable outside UIUX when the owning lane permits the same review boundary.

It does **not** authorize a lane, mutation, merge, deploy, provider action, database action, or Production action by itself.

Authority precedence remains:

1. `AGENTS.md`
2. `docs/ssot/M55_EXECUTION_STATE.json` for executable CURRENT/NEXT
3. task-class / lane-specific normative SSOT
4. `docs/ssot/M55_MULTI_AGENT_PARALLEL_OPERATING_MODEL_SSOT.md`
5. this file for the review-handoff method

If an owning gate or higher authority explicitly requires pre-commit or pre-push review, that stricter requirement wins.

---

## A. Frozen method constants

`M55_DRAFT_PR_FIRST_REVIEW_MODEL_VERSION = 1.0.0`

`DRAFT_PR_FIRST_REVIEW_IS_DEFAULT_WHEN_ELIGIBLE = TRUE`

`GITHUB_PUSHED_EXACT_SHA_IS_REMOTE_REVIEW_HANDOFF_AUTHORITY = TRUE`

`LOCAL_PATCH_MANUAL_RELAY_NOT_REQUIRED_WHEN_DRAFT_PUSH_IS_AUTHORIZED = TRUE`

`IMPLEMENTER_SUMMARY_IS_NOT_A_SUBSTITUTE_FOR_EXACT_DIFF = TRUE`

`INDEPENDENT_REVIEW_PINS_EXACT_PR_HEAD_SHA = TRUE`

`HEAD_CHANGE_INVALIDATES_ONLY_AFFECTED_REVIEW_DELTA = TRUE`

`MAIN_DIRECT_PUSH_PROHIBITED = TRUE`

`FORCE_PUSH_PROHIBITED = TRUE`

`READY_FOR_REVIEW_AND_MERGE_REMAIN_SEPARATE_GATES = TRUE`

`PRODUCTION_DEPLOY_OR_PROVIDER_MUTATION_REMAINS_SEPARATE_HUMAN_GO = TRUE`

`HUMAN_FINAL_ACCEPTANCE_REMAINS_REQUIRED_WHERE_OWNING_CONTRACT_REQUIRES = TRUE`

The assurance model is changed at the **handoff boundary**, not weakened.

---

## B. Problem this SSOT solves

A local-only or Cursor Cloud candidate cannot be directly inspected by a remote Control Tower, Codex task, Grok Bot, or another device unless the candidate is:

- pushed to a remote branch / Draft PR, or
- manually exported as a patch/artifact.

Manual patch export remains valid, but it adds transfer latency and Human relay work without increasing assurance when a safe Draft PR push is already permitted.

Therefore, for eligible work, M55 uses the pushed Draft PR exact SHA as the canonical independent-review handoff artifact.

---

## C. Default eligible workflow

The default high-assurance flow is:

```text
FRESH PREFLIGHT
→ BOUNDED LOCAL IMPLEMENTATION
→ FOCUSED LOCAL VALIDATION
→ COMMIT TO DEDICATED FEATURE BRANCH
→ NON-FORCE PUSH TO THE SAME DRAFT PR BRANCH
→ REMOTE CI ON THE EXACT HEAD
→ INDEPENDENT EXACT-DIFF REVIEW
→ PREVIEW / ACTUAL-BROWSER / HUMAN VISUAL WHEN REQUIRED
→ HUMAN READY-FOR-REVIEW / MERGE DECISION
→ NORMAL MERGE
→ POST-MERGE FRESH MAIN VERIFICATION
```

For an eligible gate, the implementation authorization may bundle:

```text
LOCAL IMPLEMENTATION
+ REQUIRED FOCUSED VALIDATION
+ ATOMIC COMMIT
+ NON-FORCE PUSH TO DRAFT PR
```

provided the gate explicitly freezes:

- repository / branch ownership;
- mutable path allowlist;
- required tests/checks;
- commit scope;
- non-force push destination;
- explicit prohibition on Ready-for-review, merge, Production deploy, provider/DB/env mutation, and force/history rewrite.

This avoids a separate Human relay step solely to transport an uncommitted diff to the remote reviewer.

---

## D. Quality-equivalence invariants

Moving independent review to the pushed Draft PR boundary MUST NOT reduce quality.

Before commit/push, the mutation owner must still prove all gate-required local invariants, including as applicable:

- correct repo / branch / worktree / HEAD;
- no unrelated dirty or staged work;
- exact mutable-path allowlist;
- focused tests;
- typecheck / lint / build when selected by the gate;
- `git diff --check`;
- secret/sensitive-data scan where relevant;
- no prohibited runtime/provider/DB/env mutation;
- exact commit scope.

After push, the independent reviewer MUST inspect remote evidence for the exact PR head rather than relying on the implementer's narrative report.

The minimum remote review packet is:

```text
REPOSITORY=
PR=
BASE_SHA=
HEAD_SHA=
CHANGED_PATHS=
EXACT_DIFF=
CI_STATUS=
REVIEW_CONTRACT=
KNOWN_LIMITATIONS=
```

If the PR head changes after review, the reviewer re-pins the new exact head and performs delta-only re-review of the affected change. Previously accepted unaffected evidence is not replayed without an invalidator.

---

## E. Draft PR semantics

A pushed Draft PR candidate is:

- **REMOTE DURABLE CANDIDATE EVIDENCE**;
- inspectable by GitHub-connected reviewers;
- not merged;
- not `main`;
- not Production;
- not user-visible merely because it is pushed;
- not authorization for deployment, provider mutation, or runtime activation.

Do not conflate:

`PUSHED_TO_DRAFT_PR`

with:

`REVIEW_GREEN`, `READY_FOR_REVIEW`, `MERGED`, `PRODUCTION_GREEN`, or `CLOSED_GREEN`.

---

## F. Risk-weighted application

This model is reusable across M55 tasks, but eligibility is risk-weighted.

### F1. LOW — docs / editorial / bounded non-runtime changes

Default:

- local validation;
- commit + non-force push to Draft PR;
- normal CI;
- Control-Tower or lane-owner exact-diff review;
- no duplicated independent reviewer unless the owning contract requires one.

### F2. MEDIUM — user-visible / product behavior / non-money runtime code

Default:

- local validation;
- commit + non-force Draft push;
- exact-head CI;
- at least one independent exact-diff reviewer when required by the lane;
- Preview/runtime evidence when behavior depends on deployment/runtime;
- Human visual/product approval when the owning quality contract requires it.

### F3. HIGH — security / auth / money / tax / provider / ledger / idempotency / payout

Draft-PR-first handoff MAY still be used, but it does not reduce the audit stack.

Default before merge/activation:

```text
implementation-owner validation
+ pushed exact SHA
+ GitHub CI
+ independent exact-diff/security review
+ runtime/Preview evidence when material
+ Control-Tower adjudication
+ Human approval where required
```

If the owning gate says `NO_COMMIT`, `NO_PUSH`, or requires pre-push independent review, this SSOT does not override it.

---

## G. Ineligible / exception cases

Do NOT use automatic Draft-PR-first push when any of the following applies:

- the active gate explicitly prohibits commit or push;
- the candidate may contain secrets, credentials, private customer data, protected legal evidence, or other content that must not be placed on GitHub;
- the correct branch/worktree ownership is unresolved;
- unrelated dirty/staged work cannot be separated safely;
- the mutation scope is not frozen;
- the branch destination is ambiguous;
- the requested operation would require force push, rebase, reset, stash, history rewrite, or destructive cleanup without explicit Human authorization;
- the candidate changes Production/provider/DB/env state rather than only repository content;
- an incident-response or security rule requires local-only containment;
- a higher-authority lane contract requires another evidence boundary.

In these cases, fail closed to explicit artifact/local review or the stricter owning-gate process.

---

## H. Mutation-owner contract

When Draft-PR-first is authorized, Cursor or another mutation owner may proceed automatically only through the bounded remote-candidate boundary.

Allowed when explicitly authorized by the gate:

- edit allowlisted files;
- run selected local validation;
- stage only allowlisted files;
- create the atomic candidate commit;
- fetch/revalidate remote divergence;
- perform a non-force push to the dedicated feature/Draft PR branch;
- update Draft PR description with validation evidence when the workflow allows it.

Still prohibited unless separately authorized:

- direct push to `main`;
- force push;
- rebase/history rewrite;
- mark Ready for review;
- merge;
- Production deploy;
- provider/DB/env/Stripe/Clerk/Supabase mutation;
- broad scope expansion;
- changing another lane's files or semantics.

---

## I. Independent reviewer contract

After Draft push, the reviewer should retrieve evidence directly from GitHub whenever possible:

- fresh PR metadata;
- exact base/head SHA;
- changed paths;
- complete actual diff;
- exact-head CI/status checks;
- deployment identity/runtime evidence when relevant.

Manual patch transfer is a fallback, not the default, when GitHub remote evidence already contains the exact candidate.

Independent reviewers remain read-only unless a separate mutation gate assigns ownership.

Implementer self-review may support evidence but does not satisfy an independent-review requirement.

---

## J. Human-interaction target

For a well-bounded eligible task, the target Human interaction is approximately:

```text
GO
→ CONFIRM / REVIEW RESULT
→ MERGE GO
```

Human time should be spent on authorization, product/visual judgment, exceptions, and merge/Production decisions — not on transporting patch files between tools when GitHub can provide the same exact evidence automatically.

This is a latency optimization, not a relaxation of controls.

---

## K. Bot / agent reuse

This model is intentionally reusable for UIUX, editorial, code-quality, bounded auth/security remediation, and other repository-contained work.

A lane-owner Bot may use:

```text
SCAN
→ CLASSIFY
→ BOUNDED IMPLEMENT
→ VALIDATE
→ COMMIT
→ NON-FORCE DRAFT PUSH
→ STOP FOR INDEPENDENT REVIEW
```

only when that lane has explicitly authorized mutation ownership and Draft-PR-first eligibility.

Read-only Grok/Codex auditors do not become writers merely because the handoff is automated.

---

## L. Stop conditions

STOP and report when:

- exact branch/head ownership is not established;
- remote branch moved unexpectedly;
- non-fast-forward push would be required;
- changed paths exceed the allowlist;
- a required local check fails;
- CI fails on the exact pushed head;
- independent review finds a blocking issue;
- Preview/runtime evidence contradicts local assumptions;
- Human actual-use evidence reveals a regression;
- a higher-authority contract requires a stricter boundary.

No control is bypassed merely to preserve speed.

---

## M. Persistence / change rule

This operating model is frozen by explicit Human approval.

Ordinary task progress does not rewrite it.

Change this SSOT only when the Human explicitly changes the handoff/review operating model or a higher-authority security/governance requirement invalidates it.

Dynamic PR numbers, branch names, HEAD SHAs, and current lane facts must not be frozen here.

---

## N. GitHub Actions event-metadata freshness

Some GitHub Actions checks evaluate `pull_request` event payload fields such as the PR body. Re-running an existing workflow job can replay the original event payload rather than freshly reading later PR metadata edits.

Therefore, when a required PR-body marker or other event metadata is corrected after a failed run and the verifier still sees the stale value, trigger a fresh PR `synchronize` event with a bounded non-force commit on the same Draft PR branch instead of treating the rerun as authoritative fresh metadata.

The retrigger commit must not broaden the product/runtime diff. The subsequent review pins the new exact HEAD SHA and remains delta-only.
