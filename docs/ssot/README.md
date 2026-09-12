# M55 Commercial Funnel SSOT Index

Status: **ACTIVE** (Commercial Funnel SSOT lane)  
Machine truth: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## AI work entry — Git first

Every M55 AI work unit starts with:

1. `AGENTS.md`
2. `M55_GIT_FIRST_ENTRYPOINT.md`
3. `M55_GIT_PREFLIGHT_MANIFEST.json`
4. `M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`
5. `M55_GIT_FIRST_HARDENING_SSOT.md`

For consequential merge/adoption or governance-host verification, also read `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md` and freshly re-observe the live GitHub ruleset. The host SSOT records the intended/observed configuration but never replaces fresh host evidence.

The AI identifies its task, verifies task-relevant Git identity, loads only the relevant authority, checks for an existing decision/contract, and only then performs substantive work. Continuation lanes use the fast path only from a valid same-session or durable `CONTINUATION_HANDOFF`; consequential/cross-lane/money/legal/provider/SSOT work uses full preflight.

`M55_GIT_FIRST_OPERATIONAL_FIXTURES.md` contains real and synthetic adversarial regression cases. It is mandatory for governance/red-team work but not a per-task reading tax on ordinary bounded UIUX continuation.

## Authority hierarchy

| Tier | File | Role |
|---|---|---|
| A0-preflight | `M55_GIT_FIRST_ENTRYPOINT.md` | Mandatory short entrypoint — identify task → Git identity → relevant authority → existing-decision check → work |
| A0-preflight | `M55_GIT_PREFLIGHT_MANIFEST.json` | Machine-readable task class/profile invariants, universal reads, changed-path triggers, continuation handoff |
| A0-preflight | `M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md` | FULL / CONTINUATION_FAST_PATH / PINNED_REVIEW routing, unmerged-authority discovery and escalation rules |
| A0-preflight | `M55_GIT_FIRST_HARDENING_SSOT.md` | Bounded machine path enforcement, semantic-review boundary, lane ownership guard, CI/adoption limitations |
| A0-host | `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md` | Exact GitHub ruleset / required-check / Actions-permission / asset-index PR-routing configuration; fresh host observation still required |
| A0-test | `M55_GIT_FIRST_OPERATIONAL_FIXTURES.md` | Real/synthetic adversarial regression cases; supporting test evidence, not product authority |
| A | `lib/m55/contracts/m55CommercialFunnelContract.ts` | Prices, counts, status, availability, CTA flags |
| B | `M55_COMMERCIAL_FUNNEL_SSOT.md` | Commercial principles, psychology, free/paid boundary |
| C | `M55_SELF_FUNNEL_CONTRACT.md`, `M55_PAIR_FUNNEL_CONTRACT.md` | Funnel flow contracts |
| D | `M55_COPY_AND_CLAIMS.md`, `M55_VISUAL_SYSTEM.md` | Language and visual rules |
| D+ | `M55_EDITORIAL_COMMERCIAL_AUTOMATION_SSOT.md` | Subordinate editorial automation policy — copy-role metadata, contextual language-risk, golden semantics, automation levels; **not** executable NEXT authority |
| E | `M55_CURRENT_STATE.md`, `M55_WORKTREE_REGISTRY.md`, `M55_ROADMAP.md`, `M55_DECISION_LOG.md` | State, worktrees, sequence, decisions |
| E+ | `M55_CONTROL_TOWER_OPERATIONS_MAP.md` | GitHub / Vercel / Clerk / Supabase / Stripe ops map · boot cross-reference |
| E++ | `M55_HIGH_COST_EVIDENCE_LEDGER.md` | Closed high-cost test evidence · rerun prohibition · invalidation rules |
| E+++ | `M55_CREATOR_REVENUE_E2C2E_SSOT.md` | Creator Revenue / E2C2E staged roadmap contract · anti-MLM · ledger lifecycle · Stripe boundary |
| E+++a | `M55_CREATOR_AFFILIATE_STRIPE_TAX_LEGAL_SSOT.md` | Affiliate-first Creator relationship · Stripe money-flow · payout economics · Japan legal/tax fail-closed contract |
| E+++b | `M55_CREATOR_AFFILIATE_BENCHMARK_TARGET_ARCHITECTURE_SSOT.md` | Frozen six-benchmark pattern map · M55-native affiliate control plane · Stripe money rail · REUSE/ADAPT/REJECT/DEFER authority |
| E++++ | `M55_MULTI_AGENT_PARALLEL_OPERATING_MODEL_SSOT.md` | Human-approved parallel AI operating model · Mac/Windows cross-device topology · GitHub handoff · Cursor/Codex/Codex Replay/Grok roles · risk-weighted audit · fresh-chat recovery |
| — | `M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md` | Safari MCP canonical actual-browser observation adapter · subordinate to commercial quality contract |
| — | `docs/runbooks/M55_SAFARI_MCP_LOCAL_READINESS_RUNBOOK.md` | Subordinate STP/MCP local readiness steps · not authority |
| — | `M55_PRODUCT_TRUTH.md` | Human-readable product truth (references machine contract) |
| Entry | `AGENTS.md` | Read order and agent rules |

## Multi-agent parallel operating model

When two or more ChatGPT/Cursor/Codex/Grok roles operate concurrently, read `M55_MULTI_AGENT_PARALLEL_OPERATING_MODEL_SSOT.md`.

That SSOT is process authority for role separation, one-lane/one-mutation-owner, one-Bot/one-controller, isolated workspaces, **Mac local mutation vs Windows remote control/audit separation, GitHub cross-device handoff, Codex local vs Codex Replay roles, Grok read-only red-team usage, risk-weighted audit depth**, cross-lane sync, and fresh-chat recovery.

It does **not** override `M55_EXECUTION_STATE.json`, does **not** reorder roadmap gates, and does **not** authorize mutation by itself.

## Worktree registry

`M55_WORKTREE_REGISTRY.md` is the **human authority** for registered Git worktrees: path, branch, lifecycle status, allowed/prohibited operations, and DO_NOT_USE classifications. Volatile HEAD/dirty/divergence facts require fresh Git observation.

- **Production main authority** lives on freshly observed `origin/main`.
- **PRIMARY_MAIN_HOME** is a post-merge baseline designation — not “currently checked out on `main`”.
- Folder names are not authority; branch + HEAD + registry are.
- `.m55_lane_state.json`, when present, is cache/guard only and never overrides registry + fresh Git.

## Verification

```bash
node scripts/verify-m55-git-first-preflight.mjs
node scripts/verify-m55-git-first-hardening.mjs
node scripts/verify-m55-git-first-structure.mjs
node --test scripts/m55-git-first-policy.test.mjs
# exact-diff verifier is invoked by GitHub Actions with base/head/PR metadata
node scripts/verify-m55-git-first-diff.mjs
npm run verify:m55-ssot
node scripts/verify-m55-commercial-ssot.mjs
```

The Git-first GitHub Actions workflow runs on every PR. Repo-contained CI is not claimed to be tamper-proof by itself; final governance `USABLE` requires proof of a host-side required merge check (or equivalent immutable external enforcement). Exact expected host configuration is recorded in `M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md`, but acceptance always compares that record with fresh GitHub state.

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
