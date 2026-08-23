# M55 GPT Cold-Start Acceptance Contract

Status: **State-driven / fail-closed**
Owner: `docs/ssot/M55_EXECUTION_STATE.json`

## Purpose

Prove that a completely new ChatGPT conversation can reconstruct M55's current execution state from repository authority and fresh remote evidence without relying on prior chat memory.

This is not a claim that a model can never hallucinate. The operational acceptance target is that stale or hallucinated state cannot authorize work unless repository authority and required fresh evidence agree.

## Where current status lives

The current acceptance and revalidation status is **not** defined by prose in this contract. Read `docs/ssot/M55_EXECUTION_STATE.json` for:

- `currentExecutionGate` / `nextSingleAction`
- `productWorkAfterControlTower`
- `acceptance.revalidationRequired`
- `acceptance.latestResult`
- `acceptance.latestResultAcceptedByHuman`
- `acceptance.revalidationReason`

When `acceptance.revalidationRequired=true`, the control plane is in a cold-start revalidation hold. `CURRENT EXECUTION GATE` and `NEXT SINGLE ACTION` must be `CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN` and `latestResult` must be `PENDING_REVALIDATION` until a fresh run completes and Human accepts it.

When `acceptance.revalidationRequired=false`, cold-start handoff is accepted. `CURRENT EXECUTION GATE` and `NEXT SINGLE ACTION` must equal `productWorkAfterControlTower`.

## Mandatory boot order for a fresh GPT conversation

1. Read `AGENTS.md` first.
2. Read `.product-authority/generated/authority-header.md` as a generated observation artifact, not timeless runtime truth.
3. Read `docs/ssot/M55_EXECUTION_STATE.json` — **sole executable gate / NEXT owner**.
4. Read `docs/ssot/M55_CURRENT_STATE.md` for narrative/history only; executable fields there are superseded while `legacyExecutionFieldsSuperseded=true`.
5. Read `docs/ssot/M55_ROADMAP.md` and `docs/ssot/M55_WORKTREE_REGISTRY.md` as sequence/ownership context; stale observation snapshots never override execution state or fresh remote facts.
6. Read `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md` and `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`.
7. Read `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` and `docs/ssot/M55_UX_BENCHMARK_STACK.md` for user-visible commercial handoff invariants.
8. Inspect `scripts/m55-control-tower-context.mjs`, `scripts/m55-control-tower-semantic.mjs`, and `scripts/verify-m55-control-tower.mjs` when validating the handoff mechanism itself.
9. Reobserve GitHub `main`, relevant PR lifecycle, feature containment, and CI.
10. Reobserve Vercel Production identity/state when connected access exists.
11. If local runtime is unavailable, say `LOCAL_RUNTIME_UNAVAILABLE`; never invent local HEAD, dirty/staged paths, worktree existence, or local divergence.

## Historical accepted evidence

Prior accepted cold-start runs remain historical evidence. They must not be erased or treated as if they never happened. The execution-state `acceptance` history fields (`previousAcceptedResult`, `previousAcceptedAt`, transition records) preserve that evidence.

A previous PASS does **not** by itself authorize work under a changed handoff mechanism.

## When revalidation is required

A new chat/session alone is **never** an invalidating dependency.

Revalidation **is** required when the handoff mechanism itself changes in a way that can materially affect cold-start correctness, including:

- execution-state semantics / validator behavior
- context verifier behavior
- this acceptance contract
- executable-state ownership or boot rules
- commercial UX benchmark stack or shared chrome ownership added to mandatory handoff semantics

Ordinary state-only progression that changes only `M55_EXECUTION_STATE.json` product gate fields **does not** invalidate the handoff mechanism and **does not** require another cold-start run.

## PASS criteria for a cold-start regression run

A fresh conversation may return `HANDOFF_COLD_START_PASS` only when all of the following are true:

- it identifies `M55_EXECUTION_STATE.json` as the executable-state owner;
- it does not use chat memory as authority;
- it reconstructs the **current** `CURRENT EXECUTION GATE` and `NEXT SINGLE ACTION` from that owner rather than relying on an expected token embedded in a prompt;
- it distinguishes durable semantic state from fresh dynamic Git/Vercel observations;
- it reobserves current `main` and relevant completed transition identity, or reports UNKNOWN when a connector genuinely cannot establish a required fact;
- it observes current Production at current main identity when Vercel is available;
- it detects stale narrative/operational snapshots without promoting them over the execution-state owner;
- it reports local runtime as unavailable rather than fabricating local state when local tools are absent;
- it preserves CLOSED GREEN / high-cost rerun prohibitions;
- it does not advance product work while the execution state says revalidation is pending;
- it does not start Pair implementation or Pair Premium activation unless execution state authorizes those gates;
- it reconstructs from repository authority the fixed commercial UX benchmark stack, frozen surface mapping, research/reselection freeze, and valid reselection invalidators from `M55_UX_BENCHMARK_STACK.md`;
- it reconstructs shared shell ownership (`PublicShell`, `PublicHeaderContainer` / `PublicHeader`, `PublicFooter`), site-wide footer legal/support ownership, and the rule that agents must not create duplicate page-local legal/support/header/footer when shared owners already provide the capability;
- it cross-checks `M55_UX_BENCHMARK_STACK.md` shared chrome inventory against actual `PublicShell`, `PublicHeaderContainer`, `PublicHeader`, and `PublicFooter` source owners and STOPs on disagreement between SSOT inventory and live source truth;
- it recognizes that cross-site chrome changes belong in the shared owner, not duplicated components;
- mutation count is zero.

A model that reconstructs CURRENT/NEXT correctly but misses these commercial handoff invariants must **not** return `HANDOFF_COLD_START_PASS`.

Any authority conflict, unexplained branch movement, unverifiable required identity, attempted high-cost replay, or mutation during the acceptance test is FAIL/STOP.

## After a fresh PASS

A PASS does not mutate repository authority. Human approval is still required.

Only after Human acceptance may a final bounded state-only transition set:

- `currentExecutionGate = productWorkAfterControlTower`
- `nextSingleAction = productWorkAfterControlTower`
- `revalidationRequired = false`
- `latestResult = HANDOFF_COLD_START_PASS`
- `latestResultAcceptedByHuman = true`

That ordinary final advance goes directly to `productWorkAfterControlTower` and does **not** require another cold-start run.

The final advance must not modify the handoff mechanism again; otherwise that mechanism change is a new invalidating dependency and revalidation is required again.

`CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN` is a repeatable validation condition, not a permanent completed development gate. It does not need to remain in `completedSubGates` after a successful run.

## Ordinary product gate progression

Future ordinary product gate transitions should change only `docs/ssot/M55_EXECUTION_STATE.json` (and any explicitly authorized narrative evidence files). They must **not** require edits to `scripts/m55-control-tower-semantic.mjs`, `scripts/verify-m55-control-tower.mjs`, or this acceptance contract.

## Regression rule

Do not rerun this acceptance merely because a new conversation was opened.

Rerun is required only when a real handoff-mechanism invalidating dependency changes.

## Reusable fresh-chat test prompt

Use a completely new GPT conversation and provide only the repository identity plus this instruction:

> Perform the M55 cold-start acceptance from repository authority only. Read `AGENTS.md` first. Do not use prior chat memory. Do not mutate anything. Reobserve GitHub and Vercel when available. If local runtime is unavailable, report `LOCAL_RUNTIME_UNAVAILABLE` instead of inferring local facts. Reconstruct the sole executable NEXT, the fixed commercial UX benchmark/reference system and frozen surface mapping, shared Header/Footer/legal ownership and duplication rules, and valid benchmark reselection invalidators. Cross-check shared chrome inventory against actual shell/header/footer source owners. Return PASS only if you can preserve rerun prohibitions, detect stale subordinate snapshots, and remain fail-closed and READ-ONLY.

There is intentionally no expected gate token or benchmark name list in the prompt. A fresh model must discover CURRENT/NEXT and commercial handoff invariants from repository authority.
