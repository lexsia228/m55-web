# Control Plane Postflight Checklist

**public_repo_mode:** true — sanitized artifacts only in `ops/releases/<release_id>/`.

## Closeout

- [ ] gate result: GREEN / YELLOW / RED
- [ ] `gate_record.json` completed
- [ ] evidence_refs attached (L0–L4 labeled)
- [ ] checksums generated (`hash_evidence.py`) for sanitized bundle
- [ ] Human sign-off recorded (`human_signoff.json`)
- [ ] AI review recorded separately (`ai_review` block)

## Repo / deployment (L3 when aligned)

- [ ] Release-scoped L3 recorded in release manifest when Human-closing a release (verified-at-close SHAs)
- [ ] Live L3 observed READ-ONLY at observation gates when required (not auto-synced into `current_state`)
- [ ] `repo_sha` / `deployment_sha` / `deployment_id` in manifest or checkpoint pointer are **verified-at-close**, not live Production sync
- [ ] rollback target updated in release manifest when applicable

## Forbidden confirmations

- [ ] no secret full value / suffix / last4 in Git
- [ ] no Price ID full value / suffix in Git
- [ ] no raw CLI output in Git
- [ ] no provider export in Git
- [ ] `ops/runs/local/` not staged
- [ ] matrix doc not added

## Provider / Production

- [ ] provider mutations: none (or explicitly logged with separate gate)
- [ ] Production purchase smoke: only if dedicated gate GO

## Promotion

- [ ] finalized release moved to `ops/releases/<release_id>/` **only after Human review**
- [ ] `current_state.json` verified checkpoint pointer updated (not used as history ledger; not live Production sync)
- [ ] `next_gate` recorded

## Semantics closeout

- [ ] Release-scoped L3 and Live L3 distinguished in gate output
- [ ] `current_state.json` was **not** updated solely to match live Production
- [ ] no recursive administrative record commit created solely to record another administrative record
- [ ] product behavior unchanged / changed stated explicitly
- [ ] accepted exceptions not falsely closed (deferred items remain deferred)

## Restore readiness

- [ ] Vault refs complete for any rotated secrets
- [ ] recovery procedure ref points to existing product runbook where applicable
