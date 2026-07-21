# M55 Control Plane — Build Week

## Problem and story

M55 began in October 2025, created by someone with no prior engineering experience. It became a real production product, but multi-AI context drift became the bottleneck: an agent could confuse runtime with target contract, reopen a closed GREEN lane, or operate in the wrong worktree.

The M55 Control Plane is a reusable local developer handoff auditor. It reads a narrow, explicit authority manifest, evaluates Git state and worktree inventory, and produces a portable JSON and HTML report. It is not a consumer product surface and does not call production APIs.

## Use

```bash
npm run audit:m55-handoff -- --repo . --out "$(node -e 'console.log(require("node:path").join(require("node:os").tmpdir(), "m55-handoff-report"))')"
```

The command writes `handoff-report.json`, a self-contained `handoff-report.html`, `handoff.md`,
and `agent-bootstrap.txt`. A HOLD exits nonzero; malformed usage exits with code 2. The default
uses Node's platform temporary directory, so it works on macOS, Windows, and Linux without a
hardcoded `/tmp` path. Native macOS verification and a Windows fresh-clone verification have
both passed. The runtime uses Node built-ins and makes no network or model/API call.

## Windows install and rerun

Use PowerShell with the executable shim and an explicit TEMP-local npm cache:

```powershell
npm.cmd ci --cache "$env:TEMP\m55-npm-cache"
npm.cmd run demo:m55-control-plane
node --test scripts/m55-handoff/audit.test.mjs
```

`npm.ps1` may be blocked by local execution policy; `npm.cmd` is the supported alternative.
Do not weaken PowerShell policy. The package lock must remain unchanged. The final Windows
fresh-clone evidence passed Guardrail 55/55 and Consistency 80/80 on the reviewed implementation
commit. Later documentation- or workflow-only commits do not replace that evidence boundary.

## JSON schema

Every report has `schemaVersion`, `toolVersion`, `status` (`READY`, `READY_WITH_WARNINGS`, or
`HOLD`), sorted `reasonCodes`, sorted `checks`, `repository`, `authority`, and `generatedAt`.
`repository` contains identity, branch, HEAD, `origin/main`, upstream, redacted remote, clean
state, Git operation, and sorted worktrees. `authority` contains active lane, next single
action, completed-GREEN, transition, current-runtime, and target-state evidence. `generatedAt`
is intentionally `null` in deterministic snapshots.

## What existed and what Build Week adds

Before Build Week, M55 had its SSOT, machine contract, and a focused SSOT verifier. During Build Week, this work adds the generic Git/reporting engine, an M55 authority adapter, stable JSON output, an accessible offline HTML report, handoff reason codes, and synthetic unit coverage. Codex/GPT-5.6 contributed implementation and verification under the repository’s Human authority.

More specifically, Codex operated as the repository-aware development agent: it read the declared
authority order, implemented only Human-authorized changes, ran native and fresh-clone checks,
prepared deterministic evidence, and stopped at permission boundaries. GPT-5.6 provided the
reasoning and coding capability used through Codex for contract reconciliation, fail-closed design,
implementation, and review. Human decisions remained authoritative throughout.

The pre-existing M55 application remains the inspected consumer. Build Week did not implement or
change consumer transactions, database migrations, Stripe/payment behavior, authentication, or
Production runtime. The reusable Orbit Field Notes adapter demonstrates that the Consistency layer
is not coupled to M55.

## Demonstrated evidence

- Guardrail: 55/55 passing
- Consistency: 80/80 passing
- Real M55 pilot: fail-closed HOLD with JSON, HTML, Markdown, and agent-bootstrap evidence
- Generic adapter: Orbit Field Notes produces a deterministic `CONSISTENT` result
- Cross-platform: native macOS and Windows fresh-clone verification
- Expected real-M55 Consistency verdict: `REVIEW_REQUIRED`, requiring explicit Human review

## Judge path and sample result

Run the command above, open the generated `handoff-report.html`, and inspect the matching JSON. A clean, fully registered repository reports `READY`; non-blocking cleanliness evidence reports `READY_WITH_WARNINGS`; authority, worktree, Git-operation, or contract failures report `HOLD`.

Synthetic, machine-neutral examples cover clean readiness, documented-transition warning, dirty
hold, unexplained-drift hold, and missing-authority hold in `scripts/m55-handoff/samples/`.

## Judge mode

```bash
npm run demo:m55-control-plane
```

This completes in seconds and creates five synthetic JSON, HTML, and handoff packets in the
platform temporary directory. It does not read M55 Production data or require secrets, a DB,
Clerk, Stripe, or external services.

The distribution-grade zero-install path is equivalent and requires only Node and the committed
Control Plane files (Git is needed for repository auditing, not synthetic generation):

```bash
node scripts/m55-handoff/demo.mjs
```

Full M55 repository validation remains separate and may require `npm ci` plus project
dependencies. This does not claim that the M55 application is zero-install.

## Managed-worktree boundary

A new host checkout is not automatically granted managed-worktree authority: an unregistered
live checkout must HOLD. Judge Mode is deliberately separate synthetic evidence. Future
host-scoped registry support is a limitation, not an ignore-unregistered, bypass, or
auto-registration mechanism.

## Privacy, safety, and limits

The tool never reads `.env` files, prints environment variables, contacts external services, or scans beyond its authority manifest. Git is invoked with argv-based process execution; remote URL credentials are redacted; authority symlinks may not escape the repo; HTML output escapes repository-derived content. Reports use repository metadata only, never user data.

Known limitations: Markdown authority parsing is deliberately narrow, documented current snapshots can become stale, and Human review remains the final authority. Future adapters can reuse the generic engine with their own explicit authority manifests.
