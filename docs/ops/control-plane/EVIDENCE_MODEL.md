# Evidence Model

## Levels

| Level | Source | Use |
|-------|--------|-----|
| **L0** | AI documents, Human memos, unverified claims | Planning input only |
| **L1** | git commands, diagnostics API, GitHub API, sanitized CLI | Automated capture |
| **L2** | Human directly views provider UI (Stripe, Vercel, Supabase, Clerk) | Provider confirmation |
| **L3** | SHA alignment at a defined verification scope (see below) | Release alignment or live observation |
| **L4** | payment, webhook, wallet, ledger, ticket end-to-end | Financial/data truth |

**Rule:** Diagnostics/API results stay L1 until Human L2. Never promote Gemini or chat logs to formal evidence.

## L3 scopes

### Release-scoped L3

At the moment a specific release is **Human-closed**, the following match:

```
verified repo SHA = verified deployment source SHA = diagnostics SHA
```

- Recorded in `ops/releases/<release_id>/` (immutable historical SSOT).
- **Does not expire** when `origin/main` or Production later advances.
- A subsequent commit on `main` does **not** invalidate a finalized release manifest's L3.

### Live L3

At an **observation gate**, READ-ONLY confirmation that:

```
origin/main = current deployment source SHA = diagnostics SHA
```

- Ephemeral observation result for that gate report.
- **Not** written back into `current_state.json` as a live-sync target by default.
- Distinct from Release-scoped L3 frozen in a release manifest.

## Storage

| Artifact | Location |
|----------|----------|
| Draft run | `ops/runs/local/` (Git excluded) |
| Finalized release | `ops/releases/<release_id>/` (immutable historical SSOT) |
| Raw provider proof | Vault via `vault_ref` |
| Verified checkpoint pointer | `ops/state/current_state.json` (verified-at-close snapshots; not live ledger) |

## evidence_ref template

Use `ops/templates/evidence_ref.json`. Include `level`, `kind`, `summary`, optional `vault_ref`, related SHAs. No raw output.

## Promotion

Local run → Human review → copy sanitized bundle to `ops/releases/` → update `current_state` verified checkpoint pointer only.

## Non-recursive administrative records

A sanitized Control Plane administrative record commit does not require a new release manifest solely to record itself when product behavior is unchanged. PR/commit/CI history is the evidence. Fail-closed when product, infra, provider, or L4 scope may be affected.
