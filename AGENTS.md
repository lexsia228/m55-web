# M55 Agent Entrypoint

All AI agents, Cursor sessions, and developers working on M55 commercial funnel work **must read this file first**.

## Read order

1. `AGENTS.md` (this file)
2. `docs/ssot/README.md`
3. `docs/ssot/M55_CURRENT_STATE.md`
4. `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md`
5. Active lane contract (`M55_SELF_FUNNEL_CONTRACT.md` or `M55_PAIR_FUNNEL_CONTRACT.md`)
6. `docs/ssot/M55_DECISION_LOG.md`
7. `docs/ssot/M55_ROADMAP.md`

Machine-verifiable product facts: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Mandatory rules

- **ACTIVE LANE only** — do not start unrelated lanes without explicit lane change in `M55_CURRENT_STATE.md`.
- **NEXT SINGLE ACTION** — do not jump ahead in the roadmap.
- **Closed GREEN** — do not re-audit closed GREEN areas (e.g. HOME commercial foundation).
- **Prohibited lanes** — no runtime UI, DB, Stripe, Clerk, env, checkout, webhook, or Pair runtime changes unless the active lane explicitly requires it.
- **Runtime truth ≠ target contract** — never describe target contracts as already implemented.
- **No unplanned worktrees** — confirm current worktree, branch, HEAD, and status before editing.
- **Read authority before source changes** — especially price, copy, and funnel flow.
- **Update `M55_CURRENT_STATE.md`** after completing a lane milestone.
- **Stop and report** if SSOT and code contradict each other without a documented resolution.

## Authority hierarchy (summary)

| Priority | Owner |
|---|---|
| A — Machine product truth | `lib/m55/contracts/m55CommercialFunnelContract.ts` |
| B — Commercial principles | `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` |
| C — Funnel contracts | `M55_SELF_FUNNEL_CONTRACT.md`, `M55_PAIR_FUNNEL_CONTRACT.md` |
| D — Language / visual | `M55_COPY_AND_CLAIMS.md`, `M55_VISUAL_SYSTEM.md` |
| E — State / roadmap / decisions | `M55_CURRENT_STATE.md`, `M55_ROADMAP.md`, `M55_DECISION_LOG.md` |

Subordinate copies must reference primary authority and must not silently override it.

## Verification

```bash
npm run verify:m55-ssot
```

## Superseded / subordinate authorities

These remain in the repo for history and reference. Do not treat them as top-level commercial funnel authority:

- `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` — Web wallet/DTR era pricing; **subordinate** to machine contract for Self Premium Light/Full prices used on HOME.
- `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` — planning draft; **subordinate** to this SSOT series for commercial funnel handoff.
- `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` — planning draft; **superseded** by `M55_ROADMAP.md` for funnel sequence.
