# M55 Git-First Host Enforcement SSOT

Status: **ACTIVE CONFIGURATION RECORD / HUMAN-APPROVED (2026-09-11)**

Purpose: preserve the exact GitHub host-side configuration that makes the M55 Git-first repository guard enforceable outside repo-contained CI. Future AI agents must read this record instead of reconstructing host settings from chat history.

This SSOT records the intended and observed configuration. Fresh GitHub observation remains required before consequential merge/acceptance decisions because host settings are mutable outside Git.

`HOST_ENFORCEMENT_FRESH_OBSERVATION_REQUIRED = TRUE`

## A. Repository

- repository: `lexsia228/m55-web`
- protected branch target: `refs/heads/main`
- protection mechanism: GitHub Repository Ruleset
- ruleset name: `M55 Git-first main protection`
- observed ruleset id: `22868284` (diagnostic identity only; name + resolved rules are authority)
- enforcement: `active`
- bypass actors: none
- observed `current_user_can_bypass`: `never`

The classic branch-protection endpoint may report its own legacy settings as disabled. That is not a contradiction when the Repository Ruleset is active. The branch must resolve as protected through the ruleset.

## B. Active ruleset contract

Required rules for `main`:

- deletion protection: ON
- non-fast-forward / force-push protection: ON
- pull request required before merging: ON
- required approving reviews: `0`
- dismiss stale approvals on push: OFF
- Code Owners review required: OFF
- approval of most recent push required: OFF
- review-thread resolution required: OFF
- extra approval for unattributed Copilot changes: OFF
- allowed merge methods: merge, squash, rebase
- required status checks: ON
- required check context: `verify-git-first-preflight`
- required check integration: GitHub Actions
- strict/up-to-date-before-merge policy: OFF
- do-not-enforce-on-create: OFF

`HOST_REQUIRED_CHECK_CONTEXT = verify-git-first-preflight`

`HOST_BYPASS_LIST_MUST_BE_EMPTY = TRUE`

`HOST_MAIN_FORCE_PUSH_MUST_BE_BLOCKED = TRUE`

`HOST_MAIN_DELETION_MUST_BE_BLOCKED = TRUE`

## C. GitHub Actions repository permissions

Repository Settings -> Actions -> General -> Workflow permissions:

- default `GITHUB_TOKEN` permission: **Read repository contents and packages permissions**
- repository-wide default Read/Write: OFF
- `Allow GitHub Actions to create and approve pull requests`: ON

The checkbox permits the capability, but M55 automation must not use it to auto-approve governance or product PRs. A workflow needs its own explicit scoped permissions before it can write.

`DEFAULT_GITHUB_TOKEN_REMAINS_READ_ONLY = TRUE`

`AUTOMATED_PR_APPROVAL_PROHIBITED = TRUE`

`AUTOMATED_GOVERNANCE_MERGE_PROHIBITED = TRUE`

## D. Asset-index automation migration

Historical state on main before PR #194 merge:

- `.github/workflows/m55-asset-index.yml` scheduled workflow writes the generated asset index and directly pushes to `main`.

Target state carried by PR #194:

- direct push to `main` removed;
- workflow uses a dedicated `automation/m55-asset-index-*` branch;
- workflow declares only the scoped write permissions it needs: `contents: write` and `pull-requests: write`;
- workflow creates/updates an asset-index PR instead of bypassing `main`;
- no auto-approval;
- no auto-merge;
- no swallowed push/PR failure;
- Git-first policy tests/structure verifier reject representative direct-main refspecs, swallowed push failure, auto-approval, auto-merge, and REST/`gh api` variants covered by the accepted fixture set.

Transition rule: because the host ruleset became active before PR #194 is merged, the old main-resident direct-push asset-index job may fail safely if it runs during the transition. Do not weaken the ruleset to make that legacy path succeed. After PR #194 merges, the PR-based asset-index workflow becomes the canonical path.

`LEGACY_ASSET_INDEX_DIRECT_MAIN_PUSH_MAY_FAIL_CLOSED_DURING_TRANSITION = TRUE`

`DO_NOT_ADD_ACTIONS_BYPASS_FOR_ASSET_INDEX = TRUE`

## E. Host enforcement boundary

The ruleset is a host-side merge barrier, but the required status context is still produced by workflow code stored in the same repository. Therefore the host requirement proves that a check with the required context succeeded; it does **not** by itself prove that candidate-controlled workflow/verifier code is immutable or semantically equivalent to the previously accepted implementation.

`REQUIRED_STATUS_CONTEXT_IS_NOT_IMMUTABLE_CODE_ATTESTATION = TRUE`

`SELF_MODIFYING_REPO_CANNOT_CLAIM_TAMPER_PROOF_FROM_REQUIRED_CONTEXT_ALONE = TRUE`

For this repository configuration, broad Git-first acceptance therefore uses two distinct controls:

1. host rules prevent direct unreviewed `main` updates and require `verify-git-first-preflight`;
2. any change to enforcement-critical files invalidates prior Git-first acceptance and requires new same-SHA independent external review before Human adoption/merge.

Enforcement-critical paths include at minimum:

- `.github/workflows/m55-git-first-preflight.yml`
- `.github/workflows/m55-asset-index.yml`
- `scripts/m55-git-first-policy.mjs`
- `scripts/m55-git-first-policy.test.mjs`
- `scripts/verify-m55-git-first-structure.mjs`
- `scripts/verify-m55-git-first-diff.mjs`
- `scripts/verify-m55-git-first-preflight.mjs`
- `scripts/verify-m55-git-first-hardening.mjs`
- `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`
- `docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md`
- `docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`
- `docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md`
- this Host Enforcement SSOT
- `docs/ssot/M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md`

`ENFORCEMENT_CRITICAL_CHANGE_INVALIDATES_PRIOR_ACCEPTANCE = TRUE`

`ENFORCEMENT_CRITICAL_CHANGE_REQUIRES_CODEX_AND_GROK_REAUDIT = TRUE`

## F. Verification evidence required before external acceptance

Before claiming host enforcement GREEN, freshly verify through GitHub that:

1. ruleset `M55 Git-first main protection` exists;
2. enforcement is `active`;
3. target includes only `refs/heads/main` for this ruleset;
4. bypass actors are empty;
5. deletion and non-fast-forward protections are present;
6. pull-request rule is present;
7. required status check context is exactly `verify-git-first-preflight`;
8. main resolves as protected;
9. PR exact head has same-SHA Git-first CI success;
10. external reviewers pin the same exact PR head;
11. if enforcement-critical files changed, both required external reviewers re-audited that exact head before Human adoption.

If any required item is unobservable, contradictory, or missing, report `HOST_ENFORCEMENT = UNPROVEN` or `EXTERNAL_ACCEPTANCE = PENDING` as applicable and do not claim broad `USABLE`.

## G. Change control

Any change to this ruleset, workflow-permission policy, required check context, bypass actors, asset-index write path, or enforcement-critical file set is consequential governance work and requires:

- `FULL_REPO_PREFLIGHT`;
- fresh host observation;
- exact Git diff review when repo files change;
- same-head CI;
- independent Codex + Grok exact-head re-review before broad adoption when enforcement-critical files changed materially.

Do not silently create a second ruleset that overlaps or weakens this one. Do not describe the current personal-repository required-context arrangement as immutable workflow attestation.

This SSOT does not authorize merge by itself. Final merge/adoption remains Human-controlled under `M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md`.
