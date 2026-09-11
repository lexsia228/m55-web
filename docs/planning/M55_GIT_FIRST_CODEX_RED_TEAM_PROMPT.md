# Codex — M55 Git-First System v4 Exact-Diff Red-Team

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
Determine whether the ACTUAL v4 candidate is safe, internally consistent and practical enough for external acceptance. Do not reward prose. Attack implementation and claimed enforcement boundaries.

Important v4 boundary:
- known protected changed paths are machine-classified from exact base/head diff;
- semantic meaning outside known paths still requires AI/Human review and is NOT claimed as statically complete;
- Lane Lock is a procedural ownership guard, NOT an atomic distributed mutex;
- GitHub required status context enforces that a named check passes, but is NOT immutable attestation of candidate-controlled workflow/verifier code;
- enforcement-critical changes require exact-head same-SHA CI plus independent Codex + Grok re-audit before Human adoption;
- ordinary bounded UIUX continuation must not pay unrelated Product Authority/Creator/legal/provider ceremony unless task-relevant;
- Host Enforcement SSOT is a universal required read and live host state must still be verified independently.

Mandatory attacks:
1. known protected path false-negative, including root-level and case-variant checkout/webhook paths;
2. dangerous task class downgrade to FAST;
3. missing requiredAuthority file;
4. ceremonial/unqueryable requiredUnmergedAuthority;
5. Cursor alwaysApply corruption;
6. no-op required job spoof;
7. required checkout/validation step uses step-level `if:` or equivalent skip condition;
8. required checkout/validation step uses `continue-on-error` or other non-blocking failure semantics;
9. workflow commands/checkout/full-history moved outside the required job;
10. workflow narrowing via paths/paths-ignore/restrictive branches or equivalent routing;
11. negative tests/verifiers gutted while harmless strings survive;
12. new-chat FAST without complete/fresh CONTINUATION_HANDOFF;
13. valid UIUX CSS forced through unrelated Product Authority/Creator/legal/provider work;
14. fabricated `none found` for open/stacked authority;
15. remote-only reviewer validates wrong ref or invents local state;
16. external audit result accepted without exact-condition reproduction;
17. CLOSED GREEN reopened by new session;
18. Product Authority or execution-state authority weakened or over-applied;
19. lane collision overclaimed as atomic prevention;
20. unrelated runtime/provider/DB changes in PR;
21. host required-check/ruleset weaker than Host Enforcement SSOT;
22. fresh AI cannot reconstruct hierarchy from repo alone;
23. static verifier/tests contain false-pass logic;
24. asset-index reaches `main` through alternate refspec, REST/`gh api` Git-ref mutation, GraphQL ref mutation, auto-approve, auto-merge, or swallowed write failure;
25. enforcement-critical change passes without declaration or exact-head dual re-audit requirement.

Run/inspect all D1-D10 and F1-F8 from the acceptance SSOT. Safe negative-fixture simulation is allowed only in an isolated disposable checkout and must not mutate/push the review candidate.

For F1, verify the governance principle rather than re-testing the UI product: an auditor's `2 -> 1 -> 21` sequence cannot disprove an exact `1 -> 12` acceptance contract.

Inspect same-head CI and live GitHub host enforcement separately. CI GREEN or the SSOT record alone is not acceptance.

Required output: exactly the structure in `M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md`, including D1-D10, F1-F8, P0-P3, contradictions, bypasses, false-positive risk, other-AI comprehension, HOST_ENFORCEMENT, SELF_MODIFICATION_BOUNDARY, improvements, final classification and reason.

Be strict. Any credible unresolved P0/P1 blocks `USABLE`.

End with:
`END_M55_GIT_FIRST_CODEX_RED_TEAM`
