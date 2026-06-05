# Control Plane Architecture

## Evidence and state layers

### Layer 1 — Immutable release history

`ops/releases/<release_id>/` is the **immutable historical SSOT** after Human finalize.

- Verified repo SHA, verified deployment source SHA, verified deployment ID
- Verification level, Human sign-off, evidence refs, Vault refs, rollback target
- Finalized releases are not re-opened or overwritten

### Layer 2 — Verified checkpoint pointer

`ops/state/current_state.json` is the **last persisted Human-verified closed checkpoint** pointer.

- Points to the active release/gate that last passed Human review and was saved to Git
- `repo_sha`, `origin_sha`, `deployment_sha`, `deployment_id`, `verification_level`, `as_of` are **verified-at-close snapshots**
- **Not** a live Production ledger; does not auto-track provider state

### Layer 3 — Live provider observation

Runtime truth lives with providers. Observed READ-ONLY at gate time:

- `git fetch` / `origin/main`
- GitHub Deployments API
- Vercel deployment metadata
- `GET /api/diagnostics/build`
- Production root HTTP

Live observations are reported in gate output. They are **not** continuously synced into `current_state.json`.

## Git visibility layers

### 1. Control Plane (Git / AI-visible)

**Allowed:** commit SHA, branch, release/gate status, deployment ID (sanitized), env **names**, migration filenames, test results, checksums, vault_ref, evidence levels, Human/AI sign-off metadata.

**Forbidden:** secret full values, suffix/last4, masked secrets, Price ID full values, `.env`, provider exports, raw CLI output, user payment data.

### 2. Private Evidence Vault (Human only)

Full secrets, Price IDs, Human-verified suffixes, screenshots, exports, raw CLI output, recovery material. Encrypted backup off-site. AI/CI/repo have no access.

### 3. Provider source of truth

Vercel, Stripe, Supabase, Clerk, Git — actual runtime state. Git records pointers and verification levels only.

## IDs

- `release_id`: `M55-REL-YYYYMMDD-NNN`
- `run_id`: `M55-RUN-YYYYMMDD-HHMMSS-JST-<gate-short>`
- `vault_ref`: `VAULT-M55/<provider>/<environment>/<release_id>/<evidence_type>`

## Public repo mode

`public_repo_mode: true` on all templates and registries. No suffix fields. Config IDs split into `config_id_registry.json`.

## Product runbooks

Product-specific deploy, DB, RPC, and recovery steps remain in `docs/ops/` legacy runbooks. This plane adds evidence orchestration only.

## Administrative record vs product release

| Kind | Examples | Release manifest required? |
|------|----------|---------------------------|
| **Control Plane administrative record** | docs/ops/control-plane, checklists, prompts, pointer semantics | No recursive manifest for the record itself when product behavior unchanged (see non-recursive rule in `README.md`) |
| **Product release** | app/components/lib, pricing, legal/support, env, DB/RPC, provider settings, L4 smoke | Yes — normal release process |

Fail-closed: when scope is ambiguous, require Planning and do not apply the non-recursive exception.
