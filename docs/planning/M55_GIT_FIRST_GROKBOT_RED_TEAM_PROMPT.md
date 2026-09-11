# GrokBOT — M55 Git-First Governance v3 Adversarial Red-Team

READ-ONLY ONLY. DO NOT PATCH. DO NOT MERGE. DO NOT MUTATE REPO.

Repository: `lexsia228/m55-web`
Target PR: `#194`

Fetch PR #194 fresh and pin exact current base/head SHA. If it moves during review, STOP and mark the result stale. Do not use prior chat, Codex report, or earlier Grok report as authority.

Primary acceptance authority:
- `docs/ssot/M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md`

Mandatory reading:
- `AGENTS.md`
- `docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md`
- `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`
- `docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`
- `docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md`
- `docs/ssot/M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`
- `docs/ssot/M55_GIT_FIRST_OPERATIONAL_FIXTURES.md`
- `docs/ssot/M55_GIT_FIRST_MINDMAP.md`
- `docs/ssot/README.md`
- relevant multi-agent/worktree authority
- Cursor alwaysApply rules
- policy/negative/diff/structural verifiers
- `.github/workflows/m55-git-first-preflight.yml`
- `.github/workflows/m55-asset-index.yml`
- exact PR diff

Role: adversarial operational governance reviewer. Determine how another AI will actually misread, evade, over-apply or under-apply the system.

Important v3 boundary:
- known protected paths have bounded machine changed-path enforcement;
- unknown semantic meaning is not claimed to be completely statically detectable;
- Lane Lock is explicitly procedural, not an atomic distributed mutex;
- GitHub required status context enforces a named successful check but is not immutable attestation of candidate-controlled workflow/verifier code;
- enforcement-critical changes therefore require exact-head same-SHA CI plus independent Codex + Grok re-audit before Human adoption;
- Product Authority is scope-aware: FULL/cold-start/product-semantic work requires it, while unrelated bounded FAST continuation does not rerun it without invalidation;
- expected host configuration is recorded in `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`, but the live GitHub state must still be checked independently.

Do not score an explicitly bounded limitation as a contradiction merely because a stronger system is imaginable. Find places where actual wording/behavior still exceeds or conflicts with that boundary.

Attack these operational failure modes:
1. fresh AI misses Hardening or Host Enforcement despite following the mandatory entry;
2. new chat incorrectly defaults FAST without durable continuation handoff;
3. valid paused UIUX lane incorrectly gets chronic FULL or unrelated Creator/legal/provider/Product Authority reading;
4. hard-trigger path is renamed/varied enough to escape machine matching, including root-level checkout/webhook zero-directory cases;
5. semantic risk outside patterns is mistaken for machine-proven safe;
6. open/unmerged authority search is declared without a real fresh query;
7. `requiredUnmergedAuthority` is confused with a missing local file;
8. lane-state cache is treated as authority over Worktree Registry/fresh Git;
9. procedural Lane Lock is misunderstood as atomic safety;
10. two mutation owners overlap after separate valid-looking preflights;
11. long-running context crosses a task boundary without refresh;
12. external audit statement is accepted without exact acceptance reproduction;
13. CLOSED GREEN is reopened because a new session lacks history;
14. local facts are invented from folder names or remote-only evidence;
15. workflow/verifier strings survive while effective enforcement is gutted;
16. required check is spoofed with a no-op `verify-git-first-preflight` job while real validation moves elsewhere;
17. workflow commands/checkout/full history are moved outside the required job;
18. workflow is narrowed by `paths`, `paths-ignore`, restrictive PR branches, job conditions, or equivalent routing;
19. negative tests test only themselves and fail to cover actual manifest/workflow behavior;
20. routine UIUX CSS becomes impractically ceremonial;
21. Product Authority/global execution-state requirements conflict with scope-aware FAST;
22. another ChatGPT/Codex/Grok cannot reconstruct hierarchy without this chat;
23. host-side required-check is missing/weaker than the host SSOT but the system still claims broad USABLE;
24. asset-index automation can directly push main via alternate refspec/API, auto-approve, auto-merge, or suppress write failures despite the intended protected-main model;
25. enforcement-critical file changes can pass without the PR declaring the enforcement change and without exact-head independent re-audit before Human adoption.

Perform all D1-D10 and F1-F8 from the external acceptance SSOT.

For F1, inspect the governance behavior, not the product itself. The known real incident is: exact accepted month sequence was `1 -> 12`; an auditor used `2 -> 1 -> 21`. Determine whether v3 prevents such mismatched reproduction from becoming a blocker without throwing away unrelated real findings.

Inspect same-head CI separately from GitHub host enforcement. Compare live ruleset/required-check state to `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`. If the live host state cannot be observed, report UNOBSERVABLE rather than assume.

Required output: exactly the acceptance SSOT structure, including PINNED_AUTHORITY, RECONSTRUCTION_TEST, D1-D10, F1-F8, P0/P1/P2/P3, contradictions, bypasses, false-positive risk, other-AI comprehension, HOST_ENFORCEMENT, improvements, final classification and reason.

Be hostile to false confidence and unnecessary complexity. Any credible unresolved P0/P1 blocks `USABLE`.

End with:
`END_M55_GIT_FIRST_GROKBOT_RED_TEAM`
