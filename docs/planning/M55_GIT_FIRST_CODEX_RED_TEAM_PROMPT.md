# Codex — M55 Git-First System v3 Exact-Diff Red-Team

READ-ONLY ONLY. DO NOT PATCH. DO NOT MERGE. DO NOT MUTATE REPO.

Repository: `lexsia228/m55-web`
Target PR: `#194`

Fresh-fetch PR #194. Pin the exact current base SHA and head SHA. If the branch moves during review, STOP and mark the review stale. Do not rely on chat memory or prior Codex/Grok reports.

Primary acceptance authority:
- `docs/ssot/M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md`

Mandatory system files:
- `AGENTS.md`
- `docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md`
- `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`
- `docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`
- `docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md`
- `docs/ssot/M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`
- `docs/ssot/M55_GIT_FIRST_OPERATIONAL_FIXTURES.md`
- `docs/ssot/M55_GIT_FIRST_MINDMAP.md`
- `docs/ssot/README.md`
- `.cursor/rules/m55-control-tower.mdc`
- `.cursor/rules/m55-scope-aware-repo-preflight.mdc`
- `scripts/m55-git-first-policy.mjs`
- `scripts/m55-git-first-policy.test.mjs`
- `scripts/verify-m55-git-first-structure.mjs`
- `scripts/verify-m55-git-first-diff.mjs`
- legacy compatibility verifiers
- `.github/workflows/m55-git-first-preflight.yml`
- `.github/workflows/m55-asset-index.yml`

Mission:
Determine whether the ACTUAL v3 candidate is safe, internally consistent and practical enough for external acceptance. Do not reward prose. Attack implementation and claimed enforcement boundaries.

Important v3 boundary:
- known protected changed paths are machine-classified from exact base/head diff;
- semantic meaning outside known paths still requires AI/Human review and is NOT claimed as statically complete;
- Lane Lock is a procedural ownership guard, NOT an atomic distributed mutex;
- GitHub required status context enforces that a named check passes, but is NOT an immutable attestation of candidate-controlled workflow/verifier code in this self-modifying repository;
- enforcement-critical changes therefore require exact-head same-SHA CI plus independent Codex + Grok re-audit before Human adoption;
- ordinary bounded UIUX continuation must not pay unrelated Product Authority/Creator/legal/provider ceremony unless those semantics become task-relevant;
- expected GitHub host configuration is recorded in `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`, but consequential acceptance must still verify the live host state independently.

Do not report those explicit limitations as defects merely because stronger mechanisms could exist. Instead identify contradictions, false claims, or bypasses relative to the stated boundary.

Mandatory attacks:
1. exact changed-path classifier can false-negative known protected paths, including zero-directory `**` cases such as root-level checkout/webhook paths;
2. dangerous task classes can be changed to FAST without deterministic failure;
3. manifest requiredAuthority can point to missing local files without failure;
4. `requiredUnmergedAuthority` can become ceremonial or unqueryable;
5. Cursor `alwaysApply: true` can be disabled without failure;
6. required check can be spoofed by moving real validation to another job and leaving `verify-git-first-preflight` as a no-op success job;
7. workflow command/checkout/full-history wiring can be removed or moved outside the required job without failure;
8. workflow can be narrowed with `paths`, `paths-ignore`, restrictive PR branches, or equivalent filters without failure;
9. negative tests/verifier can be gutted while preserving harmless strings;
10. new-chat FAST can occur without complete/fresh CONTINUATION_HANDOFF;
11. valid UIUX CSS continuation is forced through unrelated Creator/legal/provider/Product Authority work;
12. open/stacked authority discovery is vague enough to fabricate `none found`;
13. remote-only reviewer can accidentally validate a different local ref;
14. external audit output can become a blocker without matching exact acceptance reproduction;
15. CLOSED GREEN/no-replay can be reopened by new session;
16. Product Authority requirement or execution-state authority is weakened or over-applied;
17. lane collision is overclaimed as atomically prevented;
18. PR contains unrelated runtime/provider/DB changes;
19. host required-check/ruleset state is missing, stale, weaker than `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`, or unverifiable;
20. another fresh AI cannot reconstruct the system from repo alone;
21. static verifier/tests themselves contain false-pass logic;
22. asset-index automation can still directly push main via alternate refspec/API, auto-approve, auto-merge, or swallow write failures despite the host ruleset;
23. enforcement-critical file changes can pass without the PR declaring the enforcement change and without exact-head external re-audit being required before Human adoption.

Run/inspect all D1-D10 and F1-F8 from the acceptance SSOT. Safe local negative-fixture simulation is allowed only in an isolated disposable checkout and must not mutate the review candidate or push anything.

For F1 specifically, verify the governance principle rather than re-testing the UI product: an auditor's `2 -> 1 -> 21` sequence cannot disprove an exact `1 -> 12` acceptance contract.

Inspect same-head CI and separately inspect GitHub host enforcement (ruleset/required checks) if accessible. Compare the live host state to `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`. CI GREEN or the SSOT record alone is not acceptance.

Required output: exactly the structure in `M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md`, including D1-D10, F1-F8, P0-P3, host_required_check_state, contradictions, bypasses, false-positive risk, other-AI comprehension, HOST_ENFORCEMENT, improvements, final classification and reason.

Be strict. Any credible unresolved P0/P1 blocks `USABLE`.

End with:
`END_M55_GIT_FIRST_CODEX_RED_TEAM`
