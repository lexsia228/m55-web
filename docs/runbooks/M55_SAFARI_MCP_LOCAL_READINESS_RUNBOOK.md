# M55 Safari MCP Local Readiness Runbook

Status: **SUBORDINATE OPERATIONAL GUIDANCE — NOT AUTHORITY**
Authority: `docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md`

This runbook documents later readiness steps for Safari MCP actual-browser observation. It does **not** authorize product mutation, provider configuration, or gate advancement.

## Purpose

Prove that a local Safari MCP environment is eligible to produce `LATEST_ELIGIBLE_STP` browser evidence for the M55 Commercial Quality Control Plane.

## When to use

- before first Safari MCP audit on a machine
- after STP upgrade when readiness must be re-proven
- when Codex or Cursor reports MCP tool inventory drift

## Prerequisites

- macOS host with Safari Technology Preview installed
- M55 repository worktree at known HEAD
- Codex or Cursor MCP client configured (later gate — not part of this docs-only lane)
- read access to `docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md`

## Readiness checklist

### 1. Identify latest published STP candidate

- confirm latest published STP release from Apple
- record candidate version and build number
- do **not** write the number into durable SSOT — bind per audit run only

### 2. Verify installed version / build

- confirm installed STP matches the intended candidate
- record exact version/build in the audit-run evidence identity

### 3. Developer / external-agent permissions

- confirm Safari automation permissions for the auditing agent
- confirm macOS privacy settings allow browser automation where required
- confirm no blocked automation prompts remain unresolved

### 4. Start Safari MCP transport

```bash
safaridriver --mcp
```

- confirm the MCP server starts without error
- record transport identity for the audit run

### 5. Enumerate Codex / Cursor tools

- list available Safari MCP tools from the auditing client
- compare against required tool inventory for the planned case manifest
- missing required tool → readiness **FAIL** (do not audit)

### 6. Neutral-page smoke

- navigate to a neutral local or `about:blank` page
- confirm screenshot, page content, and console tools respond
- confirm no unexpected mutations occur

### 7. Required tool capability check

Minimum capability set (case manifest may require more):

| Capability | Smoke |
|---|---|
| navigate | open neutral URL |
| screenshot | capture viewport |
| page content | read title / body snippet |
| console | read empty or known-neutral console state |
| viewport resize | set 320 / 390 / desktop widths |

### 8. Read-only mutation guard

Before M55 observation:

- confirm default policy is public read-only
- confirm no checkout, auth, DB, or provider mutation tools will be invoked
- unexpected mutating network request → **STOP** per SSOT

### 9. Evidence capture identity

Before first M55 surface observation, pre-fill evidence identity fields:

- source commit (`git rev-parse HEAD`)
- runtime identity (local / preview / production-read-only)
- STP version/build
- auditor identity (Codex default; must not equal implementer)
- environment and origin

## Failure handling

| Condition | Action |
|---|---|
| STP not installed | install candidate; re-run checklist |
| MCP server unavailable | fix `safaridriver --mcp`; re-run smoke |
| tool inventory incomplete | stop; do not substitute Playwright for Safari closure |
| neutral smoke fails | stop; do not proceed to M55 surfaces |
| mutating request observed | stop; report mutation-safety violation |

## Out of scope for this runbook

- Safari / Codex / Cursor configuration commits
- actual M55 surface audits
- evidence schema implementation
- Human approval
- execution-state updates
- high-cost payment / checkout tests

## Related documents

- `docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md`
- `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md`
- `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
- `docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md`
