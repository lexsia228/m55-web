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
hardcoded `/tmp` path. macOS is locally exercised here; Windows and Linux support is based on
Node's `os.tmpdir()` / `path.join()` APIs and is not claimed as executed.

## JSON schema

Every report has `schemaVersion`, `toolVersion`, `status` (`READY`, `READY_WITH_WARNINGS`, or
`HOLD`), sorted `reasonCodes`, sorted `checks`, `repository`, `authority`, and `generatedAt`.
`repository` contains identity, branch, HEAD, `origin/main`, upstream, redacted remote, clean
state, Git operation, and sorted worktrees. `authority` contains active lane, next single
action, completed-GREEN, transition, current-runtime, and target-state evidence. `generatedAt`
is intentionally `null` in deterministic snapshots.

## What existed and what Build Week adds

Before Build Week, M55 had its SSOT, machine contract, and a focused SSOT verifier. During Build Week, this work adds the generic Git/reporting engine, an M55 authority adapter, stable JSON output, an accessible offline HTML report, handoff reason codes, and synthetic unit coverage. Codex/GPT-5.6 contributed implementation and verification under the repository’s Human authority.

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

## Privacy, safety, and limits

The tool never reads `.env` files, prints environment variables, contacts external services, or scans beyond its authority manifest. Git is invoked with argv-based process execution; remote URL credentials are redacted; authority symlinks may not escape the repo; HTML output escapes repository-derived content. Reports use repository metadata only, never user data.

Known limitations: Markdown authority parsing is deliberately narrow, documented current snapshots can become stale, and Human review remains the final authority. Future adapters can reuse the generic engine with their own explicit authority manifests.
