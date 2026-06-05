# M55 Ops Evidence & Recovery Control Plane v1.1

Public repo safe policy for evidence, recovery metadata, and gate operations.

## Scope

This control plane does **not** replace product implementation order (paid LP, My, Consult, etc.). It records how evidence is captured, verified, signed off, and recovered.

## Principles

1. AI does not hold secret values.
2. Git stores metadata only: names, purposes, vault_ref, SHAs, evidence levels.
3. Full secrets and Price IDs live in **Private Evidence Vault** (Human only).
4. Every change links to `release_id` and `run_id`.
5. Human performs privileged provider actions; AI validates sanitized evidence.
6. API output alone does not promote claims to L2.

## Layout

| Path | Role |
|------|------|
| `ops/state/current_state.json` | Last persisted Human-verified closed checkpoint pointer (not live Production ledger) |
| `ops/registries/` | Secret and config ID metadata |
| `ops/templates/` | Sanitized JSON templates |
| `ops/checklists/` | Preflight / postflight |
| `ops/releases/<release_id>/` | Immutable historical SSOT (Git-managed finalized evidence) |
| `ops/runs/local/` | Git-excluded draft runs |
| `scripts/ops/` | Capture, scan, validate, hash, new_run |
| `prompts/ops/` | Cursor / AI review prompts |

## Wave 1

Parse-only JSON validation. No CI integration. No provider automation. No new Deployment/Recovery runbooks (see `EXISTING_RUNBOOK_MAP.md`).

## Evidence levels

L0 (unverified) → L1 (git/API/CLI) → L2 (Human provider UI) → L3 (SHA alignment) → L4 (payment/webhook/wallet).

See `EVIDENCE_MODEL.md` for **Release-scoped L3** vs **Live L3**.

## State responsibilities

### `current_state.json`

- **Not** a live Production ledger.
- **Last persisted Human-verified closed checkpoint** pointer to the most recent release/gate that passed Human review and was saved to Git.
- Fields such as `repo_sha`, `origin_sha`, `deployment_sha`, `deployment_id`, `verification_level`, and `as_of` are **verified-at-close snapshots**, not live provider values.
- Does **not** auto-track the latest Production deployment.

### `ops/releases/<release_id>/`

- **Immutable historical SSOT** after finalize.
- Stores verified repo SHA, verified deployment source SHA, verified deployment ID, verification level, Human sign-off, evidence refs, Vault refs, rollback target, and accepted exceptions.
- Do **not** re-open or overwrite a finalized release.

### Live provider state

- Read at observation time only: `git fetch`, GitHub API, Vercel deployment metadata, `GET /api/diagnostics/build`, root HTTP.
- **Do not** continuously write live state back into `current_state.json`.

## Non-recursive record rule

A sanitized **Control Plane administrative record** commit (docs, checklists, prompts, pointer semantics — no product behavior change) does **not** require another release manifest solely to record itself.

- PR / commit / CI history is sufficient evidence for that administrative change.
- Do **not** create: record commit → deployment → record that deployment → new deployment → another record commit.
- **Fail-closed:** if the change may affect product code, build/runtime config, env, DB/RPC, provider settings, security policy, deployment routing, or L4 scope, treat it as a normal release and do **not** apply this exception.

## Product release separation

Product releases (pricing, legal/support, smoke, purchase/webhook/wallet/ledger/ticket, L4) are separate from Control Plane administrative record commits. Do not classify an administrative record-only change as a product release.
