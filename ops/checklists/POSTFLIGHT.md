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

- [ ] `repo_sha` matches intended commit
- [ ] `deployment_sha` matches Production diagnostics (L1) + Human L2 if needed
- [ ] `deployment_id` recorded (sanitized; full export in Vault)
- [ ] rollback target updated in release manifest

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
- [ ] `current_state.json` pointer updated (not used as history ledger)
- [ ] `next_gate` recorded

## Restore readiness

- [ ] Vault refs complete for any rotated secrets
- [ ] recovery procedure ref points to existing product runbook where applicable
