# Control Plane Preflight Checklist

**public_repo_mode:** true — no secret suffix, last4, Price ID, or raw output in Git.

## Identity

- [ ] `release_id` issued (`M55-REL-YYYYMMDD-NNN`)
- [ ] `run_id` issued (`M55-RUN-YYYYMMDD-HHMMSS-JST-<gate>`)
- [ ] `gate_name` recorded
- [ ] `current_state.json` verified checkpoint pointer updated (no history in current_state; not live Production sync)

## Semantics (verified checkpoint vs live)

- [ ] `current_state.json` is **not** treated as always-latest Production
- [ ] `repo_sha` / `deployment_sha` / `deployment_id` in scope are **verified-at-close snapshots**, not live provider truth
- [ ] live state will be obtained READ-ONLY (git fetch, provider API, diagnostics) when needed — not written into `current_state` during this gate unless explicitly scoped
- [ ] gate scope classified: **product release** vs **Control Plane administrative record**
- [ ] non-recursive record exception applies only if product behavior unchanged and scope is unambiguous; otherwise **fail-closed** → Planning
- [ ] no finalized release (`ops/releases/<release_id>/`) will be re-opened

## Repo state (L1)

- [ ] `git rev-parse HEAD`
- [ ] `git rev-parse origin/main`
- [ ] `git rev-list --left-right --count origin/main...HEAD`
- [ ] `git status --short` (untracked names only; no file contents)
- [ ] allowlist confirmed
- [ ] forbidden scope confirmed (no LP / My / Consult / legal / API / DB)
- [ ] matrix doc **not** staged

## Evidence level

- [ ] minimum evidence level for this gate defined (L0–L4)
- [ ] provider claims marked L0 until Human L2 confirmation
- [ ] API/diagnostics alone not promoted to L2

## Security (Public repo)

- [ ] `secret_scan.py` run — no hits in allowlisted paths
- [ ] no secret / Price ID full value / suffix in staged files
- [ ] no env values fetched
- [ ] no provider mutation without explicit Human GO

## Vault

- [ ] `vault_ref` paths defined for any L2+ evidence
- [ ] raw provider evidence stays in Vault only

## Rollback

- [ ] `rollback_target.repo_sha` recorded
- [ ] `rollback_target.deployment_id` recorded (Vault if sensitive)

## Human sign-off (preflight)

- [ ] operator name
- [ ] preflight decision (GO / HOLD / STOP)

## AI review (separate from Human)

- [ ] AI preflight review prompt executed
- [ ] AI decision recorded in gate_record (L1 max without Human L2)
