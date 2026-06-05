# Control Plane Architecture

## Three layers

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
