# GrokBOT — M55 Git-First Governance v4 Adversarial Red-Team

READ-ONLY ONLY. DO NOT PATCH. DO NOT MERGE. DO NOT MUTATE REPO.

Repository: `lexsia228/m55-web`
Target PR: `#194`

Fresh-fetch PR #194 and pin exact current base/head SHA. If it moves during review, STOP and mark the result stale. Do not use prior chat, Codex report, or earlier Grok report as authority.

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

Important v4 boundary:
- known protected paths have bounded machine changed-path enforcement;
- unknown semantic meaning is not claimed to be completely statically detectable;
- Lane Lock is procedural, not an atomic distributed mutex;
- GitHub required status context enforces a named successful check but is not immutable attestation of candidate-controlled workflow/verifier code;
- enforcement-critical changes require exact-head same-SHA CI plus independent Codex + Grok re-audit before Human adoption;
- Product Authority is scope-aware and does not become chronic FAST-path ceremony;
- Host Enforcement SSOT is universal authority, while live GitHub state must still be checked independently.

Attack these operational failure modes:
1. fresh AI misses Hardening or Host Enforcement despite following mandatory entry;
2. new chat incorrectly defaults FAST without durable continuation handoff;
3. valid paused UIUX lane gets chronic FULL or unrelated Product Authority/Creator/legal/provider reading;
4. hard-trigger path escapes through root-level or case-variant path spelling;
5. semantic risk outside patterns is mistaken for machine-proven safe;
6. open/unmerged authority search is declared without a real fresh query;
7. requiredUnmergedAuthority is confused with a missing local file;
8. lane-state cache overrides Worktree Registry/fresh Git;
9. procedural Lane Lock is misunderstood as atomic safety;
10. two mutation owners overlap after separate valid-looking preflights;
11. long-running context crosses a task boundary without refresh;
12. external audit statement is accepted without exact acceptance reproduction;
13. CLOSED GREEN is reopened because a new session lacks history;
14. local facts are invented from folder names or remote-only evidence;
15. workflow/verifier strings survive while effective enforcement is gutted;
16. required check is spoofed with a no-op required job while real validation moves elsewhere;
17. required checkout/validation step uses step-level `if:` or equivalent skip logic;
18. required checkout/validation step uses `continue-on-error` or other non-blocking failure behavior;
19. workflow commands/checkout/full history are moved outside the required job;
20. workflow is narrowed by paths/paths-ignore/restrictive branches or equivalent routing;
21. negative tests test only themselves and fail to cover actual workflow behavior;
22. routine UIUX CSS becomes impractically ceremonial;
23. Product Authority/global execution-state requirements conflict with scope-aware FAST;
24. another fresh AI cannot reconstruct hierarchy without chat history;
25. host-side required-check is missing/weaker than Host Enforcement SSOT but broad USABLE is still claimed;
26. asset-index reaches main through alternate refspec, REST/`gh api` Git-ref mutation, GraphQL ref mutation, auto-approve, auto-merge, or swallowed write failure;
27. enforcement-critical file changes pass without declaration or exact-head independent re-audit before Human adoption.

Perform all D1-D10 and F1-F8 from the external acceptance SSOT.

For F1, inspect the governance behavior, not the product itself. The accepted sequence was `1 -> 12`; an auditor using `2 -> 1 -> 21` cannot disprove it.

Inspect same-head CI separately from GitHub host enforcement. If live host state cannot be observed, report UNOBSERVABLE rather than assume.

Required output: exactly the acceptance SSOT structure, including PINNED_AUTHORITY, RECONSTRUCTION_TEST, D1-D10, F1-F8, P0/P1/P2/P3, contradictions, bypasses, false-positive risk, other-AI comprehension, HOST_ENFORCEMENT, SELF_MODIFICATION_BOUNDARY, improvements, final classification and reason.

Be hostile to false confidence and unnecessary complexity. Any credible unresolved P0/P1 blocks `USABLE`.

End with:
`END_M55_GIT_FIRST_GROKBOT_RED_TEAM`
