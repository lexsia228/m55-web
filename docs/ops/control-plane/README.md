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
| `ops/state/current_state.json` | Pointer only (not history ledger) |
| `ops/registries/` | Secret and config ID metadata |
| `ops/templates/` | Sanitized JSON templates |
| `ops/checklists/` | Preflight / postflight |
| `ops/releases/<release_id>/` | Git-managed finalized evidence |
| `ops/runs/local/` | Git-excluded draft runs |
| `scripts/ops/` | Capture, scan, validate, hash, new_run |
| `prompts/ops/` | Cursor / AI review prompts |

## Wave 1

Parse-only JSON validation. No CI integration. No provider automation. No new Deployment/Recovery runbooks (see `EXISTING_RUNBOOK_MAP.md`).

## Evidence levels

L0 (unverified) → L1 (git/API/CLI) → L2 (Human provider UI) → L3 (SHA alignment) → L4 (payment/webhook/wallet).
