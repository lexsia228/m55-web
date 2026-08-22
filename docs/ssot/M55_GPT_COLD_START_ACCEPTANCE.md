# M55 GPT Cold-Start Acceptance Contract

Status: **REVALIDATION REQUIRED / FAIL-CLOSED**  
Owner: `docs/ssot/M55_EXECUTION_STATE.json`

## Purpose

Prove that a completely new ChatGPT conversation can reconstruct M55's current execution state from repository authority and fresh remote evidence without relying on prior chat memory.

This is not a claim that a model can never hallucinate. The operational acceptance target is that stale or hallucinated state cannot authorize work unless repository authority and required fresh evidence agree.

## Mandatory boot order for a fresh GPT conversation

1. Read `AGENTS.md` first.
2. Read `.product-authority/generated/authority-header.md` as a generated observation artifact, not timeless runtime truth.
3. Read `docs/ssot/M55_EXECUTION_STATE.json` — **sole executable gate / NEXT owner**.
4. Read `docs/ssot/M55_CURRENT_STATE.md` for narrative/history only; executable fields there are superseded while `legacyExecutionFieldsSuperseded=true`.
5. Read `docs/ssot/M55_ROADMAP.md` and `docs/ssot/M55_WORKTREE_REGISTRY.md` as sequence/ownership context; stale observation snapshots never override execution state or fresh remote facts.
6. Read `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md` and `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md`.
7. Inspect `scripts/m55-control-tower-context.mjs`, `scripts/m55-control-tower-semantic.mjs`, and `scripts/verify-m55-control-tower.mjs` when validating the handoff mechanism itself.
8. Reobserve GitHub `main`, relevant PR lifecycle, feature containment, and CI.
9. Reobserve Vercel Production identity/state when connected access exists.
10. If local runtime is unavailable, say `LOCAL_RUNTIME_UNAVAILABLE`; never invent local HEAD, dirty/staged paths, worktree existence, or local divergence.

## Previous accepted result

A zero-memory, one-prompt acceptance run previously returned:

`HANDOFF_COLD_START_PASS`

Human accepted that result on 2026-08-22. That run correctly reconstructed the sole executable authority, current main and Production identity, CLOSED GREEN / rerun prohibitions, Pair implementation `NOT_STARTED`, Pair Premium `NOT_ACTIVATED`, governed stale subordinate narrative state, and performed zero mutations.

That evidence remains valid for the exact handoff mechanism that produced it. It is retained as historical accepted evidence and must not be erased or treated as if it never happened.

## Why revalidation is now required

PR #152 changes the handoff mechanism itself: execution-state semantics, semantic validation, context output/containment checks, verifier behavior, and this acceptance contract. Those are direct invalidating dependencies for cold-start handoff correctness.

Therefore the previous PASS cannot by itself authorize Pair mapping under the changed mechanism. The current executable gate remains:

`CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN`

and the current latest result is:

`PENDING_REVALIDATION`

until the changed mechanism is merged to `main`, observed READY in Production, and a completely fresh GPT conversation passes the one-prompt black-box acceptance against that merged revision.

The product work after successful revalidation remains:

`PAIR-FREE-TO-PAID-MAPPING-FIRST`

Pair implementation remains `NOT_STARTED`. Pair Premium remains `NOT_ACTIVATED`. Pair free→paid mapping remains unauthorized while revalidation is pending.

## PASS criteria for the required post-change regression run

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
- it does not start Pair mapping while the execution state says `CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN`;
- it does not start Pair implementation or Pair Premium activation;
- mutation count is zero.

Any authority conflict, unexplained branch movement, unverifiable required identity, attempted high-cost replay, or mutation during the acceptance test is FAIL/STOP.

## After a fresh PASS

A PASS does not mutate repository authority. Human approval is still required.

Only after Human acceptance may a final bounded state-only transition set:

- `currentExecutionGate = PAIR-FREE-TO-PAID-MAPPING-FIRST`
- `nextSingleAction = PAIR-FREE-TO-PAID-MAPPING-FIRST`
- `pairFreeToPaidMappingAuthorizedNow = true`
- `revalidationRequired = false`
- `latestResult = HANDOFF_COLD_START_PASS`
- `latestResultAcceptedByHuman = true`
- add `CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN` to completedSubGates

The final advance must not modify the handoff mechanism again; otherwise that mechanism change is a new invalidating dependency and revalidation is required again.

## Regression rule

A new chat/session alone is not an invalidating dependency. Do not rerun this acceptance merely because a new conversation was opened.

Rerun is required when the handoff mechanism, executable-state ownership, cold-start boot rules, semantic validator, context verifier, acceptance contract, or another dependency that can materially change handoff correctness changes.

## Reusable fresh-chat test prompt

Use a completely new GPT conversation and provide only the repository identity plus this instruction:

> Perform the M55 cold-start acceptance from repository authority only. Read `AGENTS.md` first. Do not use prior chat memory. Do not mutate anything. Reobserve GitHub and Vercel when available. If local runtime is unavailable, report `LOCAL_RUNTIME_UNAVAILABLE` instead of inferring local facts. Return PASS only if you can reconstruct the sole executable NEXT, preserve rerun prohibitions, detect stale subordinate snapshots, and remain fail-closed.

There is intentionally no expected gate token in the prompt. A fresh model must discover the current NEXT from repository authority.
