# Codex — M55 Git-First FINAL STRUCTURAL REMEDIATION Red-Team

READ-ONLY ONLY. DO NOT PATCH. DO NOT MERGE. DO NOT MUTATE REPO.

Repository: `lexsia228/m55-web`
Target PR: `#194`

Fresh-fetch PR #194 and pin exact current base/head SHA. If the branch moves during review, STOP and mark the result stale. Do not use prior chat, prior Codex/Grok reports, or earlier remediation conclusions as authority.

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
- Cursor alwaysApply rules
- `scripts/m55-git-first-policy.mjs`
- `scripts/m55-git-first-policy.test.mjs`
- structural/diff/legacy verifiers
- `.github/workflows/m55-git-first-preflight.yml`
- `.github/workflows/m55-asset-index.yml`
- exact PR diff

Mission: determine whether the FINAL STRUCTURAL REMEDIATION candidate is safe, internally consistent, and practical enough for external acceptance. Do not reward prose.

Critical boundary to understand:
- security-critical workflow validation now parses YAML using pinned `js-yaml@4.1.1` and compares parsed semantics against canonical fail-closed allowlists;
- benign textual spelling differences may pass when parsed semantics are identical;
- semantic drift such as conditional execution, `continue-on-error`, defaults/custom shell, command wrapping, trigger narrowing, parser-bootstrap drift, extra/reordered steps, env/data-flow changes, or asset-index run-body changes must fail;
- asset-index run bodies are fingerprinted and parsed job/step/env/condition structure is fixed;
- static changed-path matching remains intentionally bounded and AI/Human semantic review remains required outside named paths;
- Lane Lock remains procedural, not atomic;
- the host-required context is candidate-controlled and is explicitly NOT immutable attestation;
- therefore enforcement-critical changes always invalidate prior acceptance and require same-head independent Codex + Grok review plus Human adoption.

Do NOT report the mere fact that the repo can edit its own verifier as a new P0/P1. That is an explicit self-modification boundary. Report a concrete bypass of the reviewed parsed allowlist, host enforcement, authority routing, or external re-review requirement.

Mandatory attacks:
1. quoted/unquoted YAML keys, including quoted `if` / `continue-on-error`;
2. duplicate keys, anchors/aliases, alternate YAML spellings, or type coercion that changes effective Actions semantics while preserving the expected parsed object;
3. job/step `if`, `continue-on-error`, `defaults.run.shell`, per-step shell, failure-transforming wrappers, command substitution or no-op semantics;
4. checkout/full-history/parser-bootstrap version/path tampering;
5. workflow trigger narrowing via paths, branches, `pull_request.types`, or equivalent routing;
6. required job/step rename, reorder, add/remove, env changes, commands outside required job;
7. asset-index `BRANCH=main`, resolver output mutation, shell reassignment, alternate refspec, direct main, `|| :`, custom shell, REST/`gh api`/curl Git-ref mutation, GraphQL merge/ref mutation, auto-approve/auto-merge, or any run-body drift;
8. parser availability/bootstrap chicken-and-egg or module-resolution failure that could produce a false green rather than a hard failure;
9. dangerous task -> FAST, missing required authority/stage, Cursor alwaysApply corruption, continuation-handoff bypass, lane collision, stale candidate, fabricated unmerged-authority search;
10. root/nested/case-varied protected-path classifier behavior and ordinary UIUX FAST false-positive burden;
11. exact self-modification rule: enforcement-critical change without invalidating old acceptance or without requiring same-head dual review;
12. live host ruleset/required check/bypass state and same-head CI.

Run D1-D10 and F1-F8 from the acceptance SSOT. Safe disposable negative-fixture simulation is allowed only outside the candidate and must not push or mutate it.

Use the acceptance SSOT output structure exactly. Any credible unresolved P0/P1 blocks `USABLE`. Bounded non-safety-critical P2/P3 should be reported but should not be promoted into another remediation cycle unless they materially undermine the defined acceptance boundary.

End with:
`END_M55_GIT_FIRST_CODEX_RED_TEAM`
