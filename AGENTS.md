# M55 Agent Entrypoint

All AI agents, Cursor sessions, and developers working on M55 commercial funnel work **must read this file first**.

## Mandatory Git-first work-unit entry

Before substantive M55 work, every AI must read and follow:

- `docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md`
- `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`
- `docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`

The non-negotiable order is:

`IDENTIFY_TASK -> GIT_IDENTITY -> RELEVANT_AUTHORITY -> EXISTING_DECISION_CHECK -> WORK`

`NO_M55_WORK_BEFORE_GIT_FIRST_BASELINE = TRUE`

Every work profile requires task-relevant Git identity before substantive reasoning or mutation. The profile changes **depth**, not whether Git is checked.

- Existing bounded lane continuation such as approved UIUX work uses `CONTINUATION_FAST_PATH` and checks only its own branch/worktree/ref, lane authority, touched paths, and relevant shared owners.
- Exact read-only candidate review uses `PINNED_REVIEW_PREFLIGHT` and pins the exact PR/branch/commit/diff.
- New architecture, economics, reward, legal/tax, provider, security, DB/ledger, SSOT/governance, cross-lane, merge/integration, or consequential GREEN/freeze work uses `FULL_REPO_PREFLIGHT`.

If task-relevant Git identity or authority cannot be established, use **`GIT_PREFLIGHT_INCOMPLETE`**. Do not guess and do not issue consequential `PLAN_GREEN`, `DESIGN_GREEN`, `FROZEN`, `AUTHORIZED`, or equivalent.

A full preflight is **not** permission for broad repo archaeology. Read the relevant authority for the identified task. Unrelated active programs must not burden valid continuation lanes.

## Executable state authority — mandatory cold-start rule

The **sole executable authority** for `CURRENT EXECUTION GATE` and `NEXT SINGLE ACTION` is:

`docs/ssot/M55_EXECUTION_STATE.json`

`docs/ssot/M55_CURRENT_STATE.md` remains the broader narrative/history registry. While the execution-state file has `legacyExecutionFieldsSuperseded=true`, any older executable-looking fields in `M55_CURRENT_STATE.md`, `M55_ROADMAP.md`, `M55_WORKTREE_REGISTRY.md`, generated Product Authority observations, or chat history are subordinate and must not be used to advance work.

For a completely new ChatGPT conversation, also read `docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md`. If local repository/runtime access is unavailable, state **`LOCAL_RUNTIME_UNAVAILABLE`** and continue with fresh connected GitHub/Vercel read-only evidence. Never invent local HEAD, dirty/staged paths, worktree existence, or divergence.

A model hallucination or stale recollection never authorizes work. Any contradiction between executable state and required fresh evidence is **STOP**.

## Product Authority Pack — scope-aware requirement

Git-first routing does **not** weaken Product Authority where product authority is relevant, but it also does not force Product Authority ceremony onto an unrelated bounded continuation.

Product Authority verification/header review is mandatory when any of the following is true:

- the selected profile is `FULL_REPO_PREFLIGHT` or this is a cold-start/global integration task;
- the task changes or decides product/commercial semantics owned by Product Authority, including pricing, funnel flow, claims/copy authority, product mapping, provider/runtime authority, protected-worktree identity, or Production observation facts;
- the relevant task-class authority explicitly requires Product Authority;
- a previously accepted Product Authority result has a real invalidating dependency.

When Product Authority is required:

1. Run `npm run verify:product-authority:bootstrap` only on the Authority Pack bootstrap branch (`feat/m55-product-authority-pack-v1`) with provisional sequence-0 history.
2. Run `npm run verify:product-authority` for steady-state reconciliation (requires history sequences 0–2 after bootstrap reconciliation).
3. Read `.product-authority/generated/authority-header.md`.
4. **STOP** on hash drift, authority conflict, protected-worktree violation, or pending Production evidence promoted without verification.

A valid `CONTINUATION_FAST_PATH` that is presentation-only or otherwise outside Product Authority semantics does **not** rerun Product Authority merely because M55 work is occurring. It preserves already-accepted authority/no-replay evidence and checks only task-relevant authority unless an invalidator or semantic expansion enters scope.

A `PINNED_REVIEW_PREFLIGHT` reads Product Authority only when the pinned claim/diff depends on it.

Memory and conversation history are **not** authority. When Product Authority is in scope, the durable sources and generated header supersede recalled facts, but generated observations are not timeless runtime truth.

Bootstrap mode applies **only** on the Authority Pack implementation branch during provisional sequence-0 initialization. Steady-state verification must fail on unreconciled bootstrap tips.

## Control Tower boot sequence

A new/cold-start or FULL_REPO_PREFLIGHT session must establish durable repo memory **before** proposing high-cost or consequential work:

1. `AGENTS.md` (this file)
2. `docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md`
3. `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`
4. `docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`
5. `docs/ssot/M55_EXECUTION_STATE.json` — sole executable lane/gate/NEXT owner
6. `.product-authority/generated/authority-header.md`
7. `docs/ssot/README.md`
8. `docs/ssot/M55_CURRENT_STATE.md` — narrative/history; subordinate executable fields when superseded
9. `docs/ssot/M55_ROADMAP.md`
10. `docs/ssot/M55_WORKTREE_REGISTRY.md`
11. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md`
12. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
13. `docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md` when handoff/cold-start is under test
14. **`npm run m55:context`** after `git fetch origin` when local runtime exists and the selected profile requires fresh main/global context
15. Fresh GitHub/remote facts and Vercel Production identity when required by the task
16. CLOSED GREEN gates relevant to the task — do not re-audit without invalidation
17. Invalidating dependencies — document before any proposed rerun
18. Execute only the authorized **NEXT SINGLE ACTION** from `M55_EXECUTION_STATE.json` when global executable progression is in scope

A valid `CONTINUATION_FAST_PATH` does not replay the unrelated lane-specific parts of this full list. It follows the Git-first entrypoint/manifest, verifies its own lane/ref/workspace/touched authority, reuses still-valid accepted Product Authority evidence when relevant, and escalates to FULL only when a listed trigger or semantic expansion enters scope.

**Critical:** `GATE_LOCAL_UNPROVEN != HISTORICALLY_UNPROVEN`. Missing evidence in the current chat does **not** authorize rerunning real payment, checkout, fulfillment, Preview mutation smoke, DB migration, user deletion, webhook mutation, or real consult consumption. Search SSOT and prior evidence first.

**Static vs dynamic:** durable semantic execution state is repo authority. Volatile Git facts (HEAD, divergence, dirty/staged) come from fresh runtime/remote observation, not stale SHA snapshots in narrative docs.

**Duplicate-gate precheck (before any high-cost or previously executed validation):**

1. Identify capability/gate.
2. Search `M55_HIGH_COST_EVIDENCE_LEDGER.md`.
3. Identify last accepted evidence.
4. Identify exact invalidating dependencies.
5. Compare current diff/dependencies.

If no invalidating dependency changed → **`RERUN_PROHIBITED`**. A new chat/session is **never** an invalidating dependency. A missing local report is **never** by itself an invalidating dependency.

**Completed development-gate replay:** do not replay gates listed as completed in `M55_EXECUTION_STATE.json` or CLOSED / CLOSED GREEN / do-not-replay narrative evidence. A new chat/session is never invalidation.

**Cross-device / multi-agent operating rule:** read `docs/ssot/M55_MULTI_AGENT_PARALLEL_OPERATING_MODEL_SSOT.md` before coordinating Mac/Windows, Cursor, Codex, Codex Replay, Grok Bot, or multiple ChatGPT lanes. Current approved topology uses GitHub as the cross-device handoff authority: local-only Mac work is not visible to Windows/cloud auditors until pushed or explicitly supplied as an artifact. Independent remote review must pin the exact PR/branch SHA. **Ordinary Codex is the direct PR/exact-diff reviewer; Codex Replay is not a direct PR-review surface and is reserved for supported imported historical-thread replay/comparison.** Do not declare Codex/Grok/plugin capability unavailable before checking the capabilities actually available in the current environment.

**Risk-weighted audit depth:** do not run every agent on every change. Ordinary docs/editorial work may use normal CI + Control-Tower review; user-visible/product changes need the lane-required independent quality review; money/tax/provider/security/ledger/idempotency changes require the full independent audit stack defined by the multi-agent SSOT.

**Operator/business-status rule:** read `docs/ssot/M55_OPERATOR_BUSINESS_STATUS_SSOT.md` before tax, Creator payout, Stripe/KYC, seller-identity, staffing/payroll, bookkeeping, invoice, or pre-revenue business-state analysis. Do not infer corporation, employee, salary-payer, revenue, invoice-registration, or business-start facts from generic wording. Re-review only on a registered trigger.

Cursor bootstrap: `.cursor/rules/m55-control-tower.mdc` and `.cursor/rules/m55-scope-aware-repo-preflight.mdc` (always apply). **Do not use legacy `.cursorrules` as authority.**

## Read order

Use `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json` to route the exact task-specific read set. The following is the FULL/cold-start order. Continuation/review profiles intentionally use a narrower task-specific set and include Product Authority only when the task/profile/semantics require it.

1. `AGENTS.md` (this file)
2. `docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md`
3. `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`
4. `docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md`
5. `docs/ssot/M55_EXECUTION_STATE.json`
6. `.product-authority/generated/authority-header.md`
7. `docs/ssot/README.md`
8. `docs/ssot/M55_CURRENT_STATE.md`
9. `docs/ssot/M55_WORKTREE_REGISTRY.md`
10. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md`
11. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
12. relevant active-lane SSOT(s) selected by the manifest
13. `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md`
14. `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` — mandatory before user-visible implementation/review
15. `docs/ssot/M55_UX_BENCHMARK_STACK.md` — mandatory before user-visible implementation/review
16. `docs/ssot/M55_EDITORIAL_COMMERCIAL_AUTOMATION_SSOT.md` — mandatory for editorial automation / automated content construction work
17. `docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md` — mandatory before Safari MCP actual-browser gate or ACTUAL-BROWSER GREEN claim
18. `docs/ssot/M55_DECISION_LOG.md` when decision history is relevant
19. `docs/ssot/M55_ROADMAP.md` when sequence/global integration is relevant
20. `docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md` for handoff acceptance

Machine-verifiable product facts: `lib/m55/contracts/m55CommercialFunnelContract.ts` — subordinate to Product Authority Pack for host/origin/worktree/production observation facts and subordinate to `M55_EXECUTION_STATE.json` for executable gate/NEXT.

## Mandatory rules

- **GIT FIRST** — every M55 work unit establishes task-relevant Git identity before substantive reasoning or mutation; profile depth is task-scoped.
- **TASK-RELEVANT AUTHORITY** — inspect the Git/SSOT/source owners for the actual task before deciding. Unrelated lane scans are prohibited by default.
- **EXISTING CONTRACT FIRST** — search existing SSOT/source and relevant unmerged authority before creating a new contract or architecture.
- **PRE-MUTATION RECHECK** — before mutation, reconfirm correct branch/worktree/HEAD/dirty state/mutable allowlist when locally observable.
- **PRE-GREEN / INTEGRATION RECHECK** — before consequential GREEN/freeze/authorization or commit/push/PR/merge/integration, re-observe relevant Git identity and exact diff; fresh main is required when integration depends on it.
- **FAST PATH IS REAL** — an approved bounded UIUX or other continuation lane does not read unrelated Creator Revenue/legal/tax/provider/Product Authority material and does not fetch main every message unless that authority becomes task-relevant.
- **ESCALATE ON SEMANTIC EXPANSION** — new architecture/economics/reward/legal/tax/provider/DB/ledger/security/governance/cross-lane semantics convert FAST_PATH to FULL_REPO_PREFLIGHT.
- **ACTIVE LANE only** — do not start unrelated lanes without explicit lane change in `M55_EXECUTION_STATE.json` where global executable lane ownership is involved.
- **NEXT SINGLE ACTION** — do not jump ahead in the roadmap when global executable progression is in scope.
- **Closed GREEN** — do not re-audit closed GREEN areas without actual invalidation.
- **Prohibited lanes** — no runtime UI, DB, Stripe, Clerk, env, checkout, webhook, or Pair runtime changes unless the active executable gate explicitly requires it.
- **Runtime truth ≠ target contract** — never describe target contracts as already implemented.
- **No unplanned worktrees** — confirm `pwd`, branch, HEAD, `git status`, and `git worktree list` before local editing.
- **Do not infer purpose from folder names** — Git branch, HEAD, and worktree registry are authority for ownership.
- **DO_NOT_USE worktrees** — never edit; never reset / clean / stash dirty trees without explicit Human instruction.
- **Registry drift** — unexplained drift between live `git worktree list` and durable ownership → **STOP and report**. A **Documented post-merge transition** with fresh merge/containment evidence is not unexplained drift; reconcile the registry snapshot under the authorized transition instead of treating history as live state.
- **Read authority before source changes** — especially price, copy, and funnel flow.
- **Stop and report** if executable state and required fresh evidence contradict each other.
- **Commercial quality closure** — user-visible surfaces require `USER_VISIBLE_CLOSED_GREEN` per `M55_COMMERCIAL_QUALITY_CONTRACT.md`; technical GREEN alone is insufficient; Human visual approval is mandatory.
- **Safari actual-browser gates** — before claiming ACTUAL-BROWSER GREEN or running Safari MCP observation, read `docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md`; SOURCE REVIEW GREEN does not equal ACTUAL-BROWSER GREEN; implementer cannot self-certify independent Safari audit GREEN.
- **Shared public chrome** — before creating or modifying page-local Header, Footer, legal, support, privacy, or refund navigation, inspect `PublicShell` / `PublicHeaderContainer` / `PublicHeader` / `PublicFooter` ownership and reuse or update the shared owner. Duplicate shared chrome is prohibited unless an explicit route-specific contract requires it and the reason is stated before mutation.
- **Cold-start acceptance** — while NEXT is `CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN`, mutation and Pair mapping are prohibited. Human approval is required after PASS to advance the execution state.
- **Creator Revenue program** — when Creator Revenue semantics are actually in the task scope, read `docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md` plus the Creator Revenue task-class authority from `M55_GIT_PREFLIGHT_MANIFEST.json` and reconstruct: R1 `FOUR_SURFACE_CREATOR_READINESS` **CLOSED GREEN** / no-replay; staged R1→R8 sequence; creator referral/ledger/dashboard/payout **NOT_IMPLEMENTED**; direct single-tier anti-MLM; frozen Creator economics and current provider/legal status. Do not force this read onto unrelated valid continuation lanes.

## Authority hierarchy (summary)

| Priority | Owner |
|---|---|
| A0 — Executable state | `docs/ssot/M55_EXECUTION_STATE.json` |
| A0-preflight — AI work routing | `docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md`, `docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json`, `docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md` |
| A — Machine product truth | `lib/m55/contracts/m55CommercialFunnelContract.ts` |
| B — Commercial principles | `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` |
| B+ — Global commercial quality | `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` |
| B++ — Safari MCP actual-browser | `docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md` |
| C — Funnel contracts | `M55_SELF_FUNNEL_CONTRACT.md`, `M55_PAIR_FUNNEL_CONTRACT.md` |
| D — Language / visual | `M55_COPY_AND_CLAIMS.md`, `M55_VISUAL_SYSTEM.md` |
| E — Narrative state / roadmap / decisions | `M55_CURRENT_STATE.md`, `M55_WORKTREE_REGISTRY.md`, `M55_ROADMAP.md`, `M55_DECISION_LOG.md` |

Subordinate copies must not silently override primary authority.

## Verification

```bash
node scripts/verify-m55-git-first-preflight.mjs
node scripts/verify-m55-git-first-hardening.mjs
npm run verify:product-authority:bootstrap
npm run verify:product-authority
npm run test:product-authority
npm run verify:m55-ssot
npm run verify:m55-control-tower
npm run m55:context
```

Run only the verification commands required by the selected profile/task and current invalidation set. Product Authority commands above are mandatory when Product Authority is in scope as defined in this file; they are not a per-message or unrelated FAST-path tax.

Required validation/check commands that are selected for the task are **fail-closed**. If a required check returns non-zero: **STOP** — do not commit, do not push, do not classify GREEN. "Cosmetic", "known", or "non-product" does not override a failed required check unless the Human explicitly waives that exact check.

## Superseded / subordinate authorities

These remain in the repo for history and reference. Do not treat them as top-level commercial funnel authority:

- executable-looking legacy fields in `M55_CURRENT_STATE.md`, `M55_ROADMAP.md`, or `M55_WORKTREE_REGISTRY.md` while `legacyExecutionFieldsSuperseded=true`;
- `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` — Web wallet/DTR era pricing; subordinate to machine contract for Self Premium Light/Full prices used on HOME;
- `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` — planning draft;
- `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — superseded by current roadmap/execution authority.
