# M55 Agent Entrypoint

All AI agents, Cursor sessions, and developers working on M55 commercial funnel work **must read this file first**.

## Product Authority Pack (mandatory before analysis or mutation)

Before any M55 analysis or source mutation:

1. Run `npm run verify:product-authority:bootstrap` when on the Authority Pack bootstrap branch (`feat/m55-product-authority-pack-v1`) with provisional sequence-0 history only.
2. Run `npm run verify:product-authority` for steady-state reconciliation (requires history sequences 0–2 after bootstrap reconciliation).
3. Read `.product-authority/generated/authority-header.md`.
4. **STOP** on hash drift, authority conflict, protected-worktree violation, or pending Production evidence promoted without verification.

Memory and conversation history are **not** authority. The Product Authority Pack durable sources and generated header supersede recalled facts.

Bootstrap mode applies **only** on the Authority Pack implementation branch during provisional sequence-0 initialization. Steady-state verification must fail on unreconciled bootstrap tips.

## Control Tower boot sequence

Every session must establish durable repo memory **before** proposing high-cost work:

1. `AGENTS.md` (this file)
2. `docs/ssot/M55_CURRENT_STATE.md` — active lane · CLOSED GREEN · **NEXT SINGLE ACTION**
3. `docs/ssot/M55_ROADMAP.md`
4. `docs/ssot/M55_WORKTREE_REGISTRY.md`
5. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md` — GitHub / Vercel / Clerk / Supabase / Stripe separation
6. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md` — closed high-cost tests · rerun prohibition
7. **`npm run m55:context`** — fresh Git runtime + semantic SSOT merge (READ-ONLY); **if this contradicts remembered chat for dynamic facts, fresh context wins**
8. Fresh Git / remote facts — `git fetch origin`, registry drift vs durable ownership (not vs stale SHA snapshots)
9. Current lane from `M55_CURRENT_STATE.md`
10. CLOSED GREEN gates — do not re-audit without invalidation
11. Invalidating dependencies — document before any proposed rerun
12. Execute only the authorized **NEXT SINGLE ACTION**

**Critical:** `GATE_LOCAL_UNPROVEN != HISTORICALLY_UNPROVEN`. Missing evidence in the current chat does **not** authorize rerunning real payment, checkout, fulfillment, Preview mutation smoke, DB migration, user deletion, webhook mutation, or real consult consumption. Search SSOT and prior evidence first.

**Static vs dynamic:** Tier-E SSOT stores semantic/project facts (lane, NEXT SINGLE ACTION, ownership). Volatile Git facts (HEAD, divergence, dirty/staged) come from **`npm run m55:context`**, not manual SHA fields in SSOT.

**Duplicate-gate precheck (before any high-cost or previously executed validation):**

1. Identify capability/gate.
2. Search `M55_HIGH_COST_EVIDENCE_LEDGER.md`.
3. Identify last accepted evidence.
4. Identify exact invalidating dependencies.
5. Compare current diff/dependencies.

If no invalidating dependency changed → **`RERUN_PROHIBITED`**. A new chat/session is **never** an invalidating dependency. A missing local report is **never** by itself an invalidating dependency.

**Completed development-gate replay:** do not replay gates listed as **CLOSED** / **CLOSED GREEN** / **do not replay** in `M55_CURRENT_STATE.md` completed sub-gates. A new chat/session is **never** invalidation for development-gate replay either.

Cursor bootstrap: `.cursor/rules/m55-control-tower.mdc` (always apply). **Do not use legacy `.cursorrules` as authority.**

## Read order

1. `AGENTS.md` (this file)
2. `.product-authority/generated/authority-header.md`
3. `docs/ssot/README.md`
4. `docs/ssot/M55_CURRENT_STATE.md`
5. `docs/ssot/M55_WORKTREE_REGISTRY.md`
6. `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md`
7. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`
8. `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md`
9. `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` — **mandatory before any user-visible implementation or review**
10. Active lane contract (`M55_SELF_FUNNEL_CONTRACT.md` or `M55_PAIR_FUNNEL_CONTRACT.md`)
11. `docs/ssot/M55_DECISION_LOG.md`
12. `docs/ssot/M55_ROADMAP.md`

Machine-verifiable product facts: `lib/m55/contracts/m55CommercialFunnelContract.ts` — subordinate to Product Authority Pack for host/origin/worktree/production observation facts.

## Mandatory rules

- **ACTIVE LANE only** — do not start unrelated lanes without explicit lane change in `M55_CURRENT_STATE.md`.
- **NEXT SINGLE ACTION** — do not jump ahead in the roadmap.
- **Closed GREEN** — do not re-audit closed GREEN areas (e.g. HOME commercial foundation).
- **Prohibited lanes** — no runtime UI, DB, Stripe, Clerk, env, checkout, webhook, or Pair runtime changes unless the active lane explicitly requires it.
- **Runtime truth ≠ target contract** — never describe target contracts as already implemented.
- **No unplanned worktrees** — confirm `pwd`, branch, HEAD, `git status`, and `git worktree list` before editing.
- **Do not infer purpose from folder names** — Git branch, HEAD, and `M55_WORKTREE_REGISTRY.md` are authority.
- **DO_NOT_USE worktrees** — never edit; never reset / clean / stash dirty trees without explicit human instruction.
- **Registry drift** — unexplained drift between live `git worktree list` and `M55_WORKTREE_REGISTRY.md` → **STOP and report**. **Documented post-merge transition** in registry + verified merge SHA on `origin/main` → update registry snapshot (`lastVerifiedAt`, branch, HEAD) and continue.
- **End-of-task registry check** — after lane work, decide whether to update `M55_WORKTREE_REGISTRY.md` and `M55_CURRENT_STATE.md`.
- **Branch vs folder mismatch** — when branch name and folder name disagree, trust Git state + registry over folder naming. **Documented post-merge transition** + verified merge SHA → update snapshot and continue.
- **Read authority before source changes** — especially price, copy, and funnel flow.
- **Update `M55_CURRENT_STATE.md`** after completing a lane milestone.
- **Stop and report** if SSOT and code contradict each other without a documented resolution.
- **Commercial quality closure** — user-visible surfaces require `USER_VISIBLE_CLOSED_GREEN` per `M55_COMMERCIAL_QUALITY_CONTRACT.md`; technical GREEN alone is insufficient; Human visual approval is mandatory.

## Authority hierarchy (summary)

| Priority | Owner |
|---|---|
| A — Machine product truth | `lib/m55/contracts/m55CommercialFunnelContract.ts` |
| B — Commercial principles | `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` |
| B+ — Global commercial quality | `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` |
| C — Funnel contracts | `M55_SELF_FUNNEL_CONTRACT.md`, `M55_PAIR_FUNNEL_CONTRACT.md` |
| D — Language / visual | `M55_COPY_AND_CLAIMS.md`, `M55_VISUAL_SYSTEM.md` |
| E — State / roadmap / decisions | `M55_CURRENT_STATE.md`, `M55_WORKTREE_REGISTRY.md`, `M55_ROADMAP.md`, `M55_DECISION_LOG.md` |

Subordinate copies must reference primary authority and must not silently override it.

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

- `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` — Web wallet/DTR era pricing; **subordinate** to machine contract for Self Premium Light/Full prices used on HOME.
- `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` — planning draft; **subordinate** to this SSOT series for commercial funnel handoff.
- `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — planning draft; **superseded** by `M55_ROADMAP.md` for funnel sequence.
