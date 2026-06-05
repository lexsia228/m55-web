# Evidence Model

## Levels

| Level | Source | Use |
|-------|--------|-----|
| **L0** | AI documents, Human memos, unverified claims | Planning input only |
| **L1** | git commands, diagnostics API, GitHub API, sanitized CLI | Automated capture |
| **L2** | Human directly views provider UI (Stripe, Vercel, Supabase, Clerk) | Provider confirmation |
| **L3** | repo SHA + deployment SHA + Production display mutual match | Release alignment |
| **L4** | payment, webhook, wallet, ledger, ticket end-to-end | Financial/data truth |

**Rule:** Diagnostics/API results stay L1 until Human L2. Never promote Gemini or chat logs to formal evidence.

## Storage

| Artifact | Location |
|----------|----------|
| Draft run | `ops/runs/local/` (Git excluded) |
| Finalized release | `ops/releases/<release_id>/` (Git managed) |
| Raw provider proof | Vault via `vault_ref` |
| Current pointer | `ops/state/current_state.json` |

## evidence_ref template

Use `ops/templates/evidence_ref.json`. Include `level`, `kind`, `summary`, optional `vault_ref`, related SHAs. No raw output.

## Promotion

Local run → Human review → copy sanitized bundle to `ops/releases/` → update `current_state` pointer only.
