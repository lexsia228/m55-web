# Initial Adoption Plan

## Completed gates

1. READ-ONLY Planning — GREEN
2. Human Decision Freeze v1.1 (Public repo safe) — GREEN
3. WORKTREE-SETUP — GREEN
4. LOCAL (Wave 1) — this gate

## Next gates

| Order | Gate |
|-------|------|
| 1 | REVIEW-COMMIT (Control Plane only) |
| 2 | Human Bootstrap (Vault refs, L2 verification) |
| 3 | Dry-run: paid LP READ-ONLY Planning |
| 4 | Formal ops on subsequent releases |

## LOCAL scope (Wave 1)

- docs/ops/control-plane/*
- ops/state, registries, templates, checklists
- scripts/ops/* (5 scripts)
- prompts/ops/*
- `.gitignore` + `ops/runs/local/` only

## Excluded

CI changes, schema validation, capture_vercel_readonly.sh, new Deployment/Recovery runbooks, product code.

## Branch strategy

- Control Plane: `chore/ops-control-plane-wave1` @ `origin/main`
- Product UI: `main` @ `4c52a8f` (separate worktree, not merged here)

## Merge policy

Control Plane commit merges independently. Product commits stay separate until explicit release planning.
