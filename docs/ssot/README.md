# M55 Commercial Funnel SSOT Index

Status: **ACTIVE** (Commercial Funnel SSOT lane)  
Machine truth: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Authority hierarchy

| Tier | File | Role |
|---|---|---|
| A | `lib/m55/contracts/m55CommercialFunnelContract.ts` | Prices, counts, status, availability, CTA flags |
| B | `M55_COMMERCIAL_FUNNEL_SSOT.md` | Commercial principles, psychology, free/paid boundary |
| C | `M55_SELF_FUNNEL_CONTRACT.md`, `M55_PAIR_FUNNEL_CONTRACT.md` | Funnel flow contracts |
| D | `M55_COPY_AND_CLAIMS.md`, `M55_VISUAL_SYSTEM.md` | Language and visual rules |
| E | `M55_CURRENT_STATE.md`, `M55_WORKTREE_REGISTRY.md`, `M55_ROADMAP.md`, `M55_DECISION_LOG.md` | State, worktrees, sequence, decisions |
| E+ | `M55_CONTROL_TOWER_OPERATIONS_MAP.md` | GitHub / Vercel / Clerk / Supabase / Stripe ops map · boot cross-reference |
| E++ | `M55_HIGH_COST_EVIDENCE_LEDGER.md` | Closed high-cost test evidence · rerun prohibition · invalidation rules |
| — | `M55_PRODUCT_TRUTH.md` | Human-readable product truth (references machine contract) |
| Entry | `AGENTS.md` | Read order and agent rules |

## Worktree registry

`M55_WORKTREE_REGISTRY.md` is the **human authority** for registered Git worktrees: path, branch, HEAD, lifecycle status, allowed/prohibited operations, and DO_NOT_USE classifications.

- **Production main authority** lives on `origin/main` (SHA recorded in registry and `M55_CURRENT_STATE.md`).
- **PRIMARY_MAIN_HOME** is a post-merge baseline designation — not “currently checked out on `main`”.
- Folder names are not authority; branch + HEAD + registry are.
- CI verifies document contract only; local preflight may compare live `git worktree list` to registry.

## Verification

```bash
npm run verify:m55-ssot
node scripts/verify-m55-commercial-ssot.mjs
```

## Subordinate / superseded authorities

| Path | Relationship |
|---|---|
| `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` | Subordinate for DTR-era wallet catalog; Self Premium Light/Full prices defer to machine contract |
| `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` | Superseded for commercial funnel handoff by `M55_PRODUCT_TRUTH.md` |
| `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` | Superseded for phase order by `M55_ROADMAP.md` |
| `lib/m55/paidDtrProductCopy.ts` | Runtime copy evidence; not normative over machine contract |
| `lib/m55/topFreeEntryPublicCopy.ts` | Runtime copy evidence; contains legacy terms (見取り図 / 保存版) |

## Current vs target

SSOT documents **separate**:

- **Current runtime** — what production/main actually does today
- **Target contract** — what the next implementation lane must achieve

Target items marked `PENDING_SELF_FUNNEL_IMPLEMENTATION` must not be described as live.
