# M55 Agent Entrypoint

All AI agents, Cursor sessions, and developers working on M55 commercial funnel work **must read this file first**.

## Executable state authority — mandatory cold-start rule

The **sole executable authority** for `CURRENT EXECUTION GATE` and `NEXT SINGLE ACTION` is:

`docs/ssot/M55_EXECUTION_STATE.json`

`docs/ssot/M55_CURRENT_STATE.md` remains the broader narrative/history registry. While the execution-state file has `legacyExecutionFieldsSuperseded=true`, any older executable-looking fields in `M55_CURRENT_STATE.md`, `M55_ROADMAP.md`, `M55_WORKTREE_REGISTRY.md`, generated Product Authority observations, or chat history are subordinate and must not be used to advance work.

For a completely new ChatGPT conversation, also read `docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md`. If local repository/runtime access is unavailable, state **`LOCAL_RUNTIME_UNAVAILABLE`** and continue with fresh connected GitHub/Vercel read-only evidence. Never invent local HEAD, dirty/staged paths, worktree existence, or divergence.

A model hallucination or stale recollection never authorizes work. Any contradiction between executable state and required fresh evidence is **STOP**.

## Product Authority Pack (mandatory before analysis or mutation)

Before any M55 analysis or source mutation:

1. Run `npm run verify:product-authority:bootstrap` when on the Authority Pack bootstrap branch (`feat/m55-product-authority-pack-v1`) with provisional sequence-0 history only.
2. Run `npm run verify:product-authority` for steady-state reconciliation (requires history sequences 0–2 after bootstrap reconciliation).
3. Read `.product-authority/generated/authority-header.md`.
4. **STOP** on hash drift, authority conflict, protected-worktree violation, or pending Production evidence promoted without verification.

Memory and conversation history are **not** authority. The Product Authority Pack durable sources and generated header supersede recalled facts, but generated observations are not timeless runtime truth.

Bootstrap mode applies **only** on the Authority Pack implementation branch during provisional sequence-0 initialization. Steady-state verification must fail on unreconciled bootstrap tips.

## Control Tower boot sequence

Every session must establish durable repo memory **before** proposing high-cost work:

1. `AGENTS.md` (this file)
2. `docs/ssot/M55_EXECUTION_STATE.json` — sole executable lane/gate/NEXT owner
3. `.product-authority/generated/authority-header.md` — generated observation artifact
4. `docs/ssot/README.md`
5. `docs/ssot/M55_CURRENT_STATE.md` — narrative/history; subordinate executable fields when superseded
6. `docs/ssot/M55_ROADMAP.md`
7. `docs/ssot/M55_WORKTREE_REGISTRY.md`
8. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md`
9. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
10. `docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md` when handoff/cold-start is under test
11. **`npm run m55:context`** after `git fetch origin` when local runtime exists
12. Fresh GitHub/remote facts and Vercel Production identity when required
13. CLOSED GREEN gates — do not re-audit without invalidation
14. Invalidating dependencies — document before any proposed rerun
15. Execute only the authorized **NEXT SINGLE ACTION** from `M55_EXECUTION_STATE.json`

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

Cursor bootstrap: `.cursor/rules/m55-control-tower.mdc` (always apply). **Do not use legacy `.cursorrules` as authority.**

## Read order

1. `AGENTS.md` (this file)
2. `docs/ssot/M55_EXECUTION_STATE.json`
3. `.product-authority/generated/authority-header.md`
4. `docs/ssot/README.md`
5. `docs/ssot/M55_CURRENT_STATE.md`
6. `docs/ssot/M55_WORKTREE_REGISTRY.md`
7. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md`
8. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
9. `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md`
10. `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` — **mandatory before any user-visible implementation or review**
11. Active lane contract (`M55_SELF_FUNNEL_CONTRACT.md` or `M55_PAIR_FUNNEL_CONTRACT.md`)
12. `docs/ssot/M55_DECISION_LOG.md`
13. `docs/ssot/M55_ROADMAP.md`
14. `docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md` for handoff acceptance

Machine-verifiable product facts: `lib/m55/contracts/m55CommercialFunnelContract.ts` — subordinate to Product Authority Pack for host/origin/worktree/production observation facts and subordinate to `M55_EXECUTION_STATE.json` for executable gate/NEXT.

## Mandatory rules

- **ACTIVE LANE only** — do not start unrelated lanes without explicit lane change in `M55_EXECUTION_STATE.json`.
- **NEXT SINGLE ACTION** — do not jump ahead in the roadmap.
- **Closed GREEN** — do not re-audit closed GREEN areas without actual invalidation.
- **Prohibited lanes** — no runtime UI, DB, Stripe, Clerk, env, checkout, webhook, or Pair runtime changes unless the active executable gate explicitly requires it.
- **Runtime truth ≠ target contract** — never describe target contracts as already implemented.
- **No unplanned worktrees** — confirm `pwd`, branch, HEAD, `git status`, and `git worktree list` before local editing.
- **Do not infer purpose from folder names** — Git branch, HEAD, and worktree registry are authority for ownership.
- **DO_NOT_USE worktrees** — never edit; never reset / clean / stash dirty trees without explicit Human instruction.
- **Registry drift** — unexplained drift between live `git worktree list` and durable ownership → **STOP and report**.
- **Read authority before source changes** — especially price, copy, and funnel flow.
- **Stop and report** if executable state and required fresh evidence contradict each other.
- **Commercial quality closure** — user-visible surfaces require `USER_VISIBLE_CLOSED_GREEN` per `M55_COMMERCIAL_QUALITY_CONTRACT.md`; technical GREEN alone is insufficient; Human visual approval is mandatory.
- **Cold-start acceptance** — while NEXT is `CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN`, mutation and Pair mapping are prohibited. Human approval is required after PASS to advance the execution state.

## Authority hierarchy (summary)

| Priority | Owner |
|---|---|
| A0 — Executable state | `docs/ssot/M55_EXECUTION_STATE.json` |
| A — Machine product truth | `lib/m55/contracts/m55CommercialFunnelContract.ts` |
| B — Commercial principles | `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` |
| B+ — Global commercial quality | `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` |
| C — Funnel contracts | `M55_SELF_FUNNEL_CONTRACT.md`, `M55_PAIR_FUNNEL_CONTRACT.md` |
| D — Language / visual | `M55_COPY_AND_CLAIMS.md`, `M55_VISUAL_SYSTEM.md` |
| E — Narrative state / roadmap / decisions | `M55_CURRENT_STATE.md`, `M55_WORKTREE_REGISTRY.md`, `M55_ROADMAP.md`, `M55_DECISION_LOG.md` |

Subordinate copies must not silently override primary authority.

## Verification

```bash
npm run verify:product-authority:bootstrap
npm run verify:product-authority
npm run test:product-authority
npm run verify:m55-ssot
npm run verify:m55-control-tower
npm run m55:context
```

Required validation/check commands are **fail-closed**. If a required check returns non-zero: **STOP** — do not commit, do not push, do not classify GREEN. "Cosmetic", "known", or "non-product" does not override a failed required check unless the Human explicitly waives that exact check.

## Superseded / subordinate authorities

These remain in the repo for history and reference. Do not treat them as top-level commercial funnel authority:

- executable-looking legacy fields in `M55_CURRENT_STATE.md`, `M55_ROADMAP.md`, or `M55_WORKTREE_REGISTRY.md` while `legacyExecutionFieldsSuperseded=true`;
- `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` — Web wallet/DTR era pricing; subordinate to machine contract for Self Premium Light/Full prices used on HOME;
- `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` — planning draft;
- `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — superseded by current roadmap/execution authority.
