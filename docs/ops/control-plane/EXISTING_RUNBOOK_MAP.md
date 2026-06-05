# Existing Runbook Map

Control Plane does **not** replace these product runbooks. Link only.

| Existing path | Role | Control Plane relationship |
|---------------|------|---------------------------|
| `docs/ops/M55_BASELINE_CAPTURE_RUNBOOK_20260330.md` | Baseline git tag + recovery bundle | Rollback `procedure_ref` may point here |
| `docs/ops/M55_BASELINE_CAPTURE_COMMANDS_20260330.md` | Command reference for baseline | L1 evidence source |
| `docs/ops/M55_RECOVERY_BUNDLE_CHECKLIST_20260330.md` | Recovery bundle checklist | Complement postflight |
| `docs/ops/REPLY_RUNTIME_OPERATIONS_RUNBOOK_v1.md` | Reply system operations | Product lane evidence |
| `docs/ops/REPLY_SYSTEM_FINAL_OPERATIONS_SUMMARY_v1.md` | Reply ops summary | Reference only |
| `docs/ops/REPLY_SYSTEM_RELEASE_GATE_GREEN_2026-04-17.md` | Reply release gate record | Historical L3 example |
| `docs/ops/REPLY_TEST_DATA_CLEANUP_GUIDE_v1.md` | Test data cleanup | Non-prod only |
| `docs/ops/REPLY_NON_PROD_BYPASS_NOTE_v1.md` | Non-prod bypass | Auth testing |
| `docs/ops/PUBLIC_SURFACE_VISUAL_REGRESSION_CHECKLIST_20260403.md` | Visual regression | UI release evidence |
| `scripts/capture-baseline-evidence.js` | Legacy baseline capture | Parallel to `capture_git_state.sh` |
| `scripts/audit_gate.mjs` | Layer0/Layer1 audit | Unchanged by Control Plane |

## Division of labor

| Layer | Responsibility |
|-------|----------------|
| **Existing runbooks** | How to deploy, migrate DB/RPC, recover product |
| **Control Plane** | Evidence levels, manifests, sign-off, vault_ref linking, gate IDs |

## Not added in Wave 1

- New Deployment Runbook
- New Recovery Runbook
- `capture_vercel_readonly.sh`

Provider-specific steps stay in existing docs and Vault; Control Plane records verification metadata only.
