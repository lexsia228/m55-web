# M55 Control Tower Operations Map

Status: **ACTIVE** (durable memory for AI + operators)
Last updated: **2026-08-22**
Companion: `M55_HIGH_COST_EVIDENCE_LEDGER.md` · `AGENTS.md`

## Purpose

This map is **Context-as-Code**: repo-local durable memory for where M55 runs, how environments separate, and what must not be rerun without invalidation. It stores **no secrets** (no keys, tokens, emails, payment IDs, or customer IDs).

## Permanent control rule

`GATE_LOCAL_UNPROVEN != HISTORICALLY_UNPROVEN`

Missing evidence in the current chat or gate report does **not** authorize rerunning a high-cost test. Search SSOT, Git history, prior gate reports, and the high-cost ledger first.

---

## GitHub

| Field | Value |
|---|---|
| Repository | `lexsia228/m55-web` (public Git remote for `m55-webv2` Vercel project) |
| Production source branch | `main` |
| Feature / Preview source | feature branches (e.g. `feat/m55-pair-funnel-v1`) |
| Worktree authority | `docs/ssot/M55_WORKTREE_REGISTRY.md` — folder names are not authority |
| Local vs remote | `git rev-parse HEAD`, `origin/<branch>`, and registry must agree before mutation |
| Force push | **Human-authorized only** — never force-push `main` without explicit instruction |

Evidence in Git commits and SSOT docs is durable. Chat memory is not.

---

## Vercel

| Field | Value |
|---|---|
| Team | `m55-official` |
| Project | `m55-webv2` |
| Production URL | `https://m55-webv2.vercel.app` |
| Production deployment source | `main` @ merged commit SHA |
| Preview deployment model | one Preview deployment per Git branch push; branch alias pattern `m55-webv2-git-<branch-slug>-m55-official.vercel.app` |
| Binding rule | Preview runtime SHA must match intended feature HEAD before high-cost Preview work; verify via `GET /api/diagnostics/build` → `vercel_env`, `vercel_git_sha`, `vercel_branch` |
| Redeploy policy | do not redeploy to “fix” evidence gaps; fix source or obtain Human GO |

Production diagnostics on Vercel return **404** for sensitive env routes by design.

---

## Clerk

| Namespace | Role |
|---|---|
| **M55-core / Development** | fresh checkout / launch-validation cohort (`launch-cohort-primary`); test users for payment experiments |
| **M55-Official / Production** | live customer-facing auth (`pk_live_*` on Production host) |
| Preview hosts | Development Clerk instance (e.g. `*.clerk.accounts.dev`, `pk_test_*`) — not Production |

Rules:

- Development and Production are **separate namespaces** — do not infer one from the other.
- Synthetic test users belong to **Development / Preview** workflows only.
- **Never reuse Production customer identities** for Preview payment or consult smokes.
- Do not delete users or mutate Production Clerk without explicit Human scope.

---

## Supabase

| Plane | Organization | Project | Notes |
|---|---|---|---|
| **Preview** | `m55-preview` | `m55-soul-preview` | approved preview project ref pinned in `lib/m55/previewRemoteApply/` |
| **Production** | `m55-soul` | `m55-soul-core` | live customer data plane |

Rules:

- Preview and Production are **separate projects** — never infer connection strings across environments.
- **No cross-environment mutation** (no Production writes while proving Preview, and vice versa).
- Read-only SQL attestation uses operator-local credentials only; never paste secrets into SSOT or chat.
- Forbidden Production identity labels are enforced in preview remote-apply authority code.

---

## Stripe

| Topic | Policy |
|---|---|
| Commercial SKU keys (Product Truth) | `dtr_core_light_v1` (¥1,000 · 追加読み解き 1) · `dtr_core_full_v1` (¥1,480 · 合計5) · `dtr_core_light_to_full_upgrade_v1` (¥600 top-up) |
| Machine contract | `lib/m55/contracts/m55CommercialFunnelContract.ts` |
| Historical payment evidence | documented in `M55_HIGH_COST_EVIDENCE_LEDGER.md` and Phase-5/Contract-C SSOT series |
| High-cost payment tests | **CLOSED GREEN** unless an invalidating dependency changed (checkout, webhook, fulfillment, wallet grant/consume) |
| Test vs real customer ops | Stripe TEST mode / Development cohort evidence ≠ Production customer operations — classify separately |
| Rerun | **prohibited** for Phase-B and closed lanes without documented invalidation |

Do not store PaymentIntent IDs, customer IDs, price secret values, or webhook signing secrets in this map.

---

## Boot cross-reference

Every AI session boot must read, in order:

1. `AGENTS.md`
2. `docs/ssot/M55_CURRENT_STATE.md`
3. `docs/ssot/M55_ROADMAP.md`
4. `docs/ssot/M55_WORKTREE_REGISTRY.md`
5. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md` (this file)
6. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
7. Fresh Git / remote facts (`pwd`, branch, HEAD, `git status`, registry drift)
8. **`npm run m55:context`** — fresh runtime authority for volatile facts
9. Current lane + **NEXT SINGLE ACTION** from `M55_CURRENT_STATE.md`
10. CLOSED GREEN gates (do not re-audit)
11. Invalidating dependencies for any proposed rerun
12. Execute only the authorized **NEXT SINGLE ACTION**

Verification: `npm run m55:context` · `npm run verify:m55-control-tower`
