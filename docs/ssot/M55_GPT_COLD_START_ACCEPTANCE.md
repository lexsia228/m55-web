# M55 GPT Cold-Start Acceptance Contract

Status: **ACTIVE / FAIL-CLOSED**  
Owner: `docs/ssot/M55_EXECUTION_STATE.json`

## Purpose

Prove that a completely new ChatGPT conversation can reconstruct M55's current execution state from repository authority and fresh remote evidence without relying on prior chat memory.

This is not a claim that a model can never hallucinate. The acceptance target is stronger operationally: a hallucinated or stale answer must fail authority checks and must not be allowed to advance product work.

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

## Effective current state at this contract revision

The current execution gate and NEXT are intentionally **not** Pair mapping yet.

`CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN`

Product work after a successful cold-start acceptance is:

`PAIR-FREE-TO-PAID-MAPPING-FIRST`

Pair implementation remains `NOT_STARTED`. Pair Premium remains `NOT_ACTIVATED`.

## PASS criteria

A fresh conversation may return `HANDOFF_COLD_START_PASS` only when all of the following are true:

- it identifies `M55_EXECUTION_STATE.json` as the executable-state owner;
- it does not use chat memory as authority;
- it distinguishes durable semantic state from fresh dynamic Git/Vercel observations;
- it observes PR #150 as merged and its feature head as contained in current `main` (or reports UNKNOWN if the connector cannot establish that fact);
- it observes Production at the merged main identity when Vercel is available;
- it detects stale narrative/operational snapshots without promoting them over the execution-state owner;
- it reports local runtime as unavailable rather than fabricating local state when local tools are absent;
- it preserves CLOSED GREEN / high-cost rerun prohibitions;
- it does not start Pair mapping during this acceptance gate;
- it identifies the next action as the cold-start acceptance itself;
- mutation count is zero.

Any authority conflict, unexplained branch movement, unverifiable required identity, attempted high-cost replay, or mutation during the acceptance test is FAIL/STOP.

## After PASS

A PASS does not itself mutate the repository. Human approval is required to advance `M55_EXECUTION_STATE.json` from `CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN` to `PAIR-FREE-TO-PAID-MAPPING-FIRST`.

## Reusable fresh-chat test prompt

Use a completely new GPT conversation and provide only the repository identity plus this instruction:

> Perform the M55 cold-start acceptance from repository authority only. Read `AGENTS.md` first. Do not use prior chat memory. Do not mutate anything. Reobserve GitHub and Vercel when available. If local runtime is unavailable, report `LOCAL_RUNTIME_UNAVAILABLE` instead of inferring local facts. Return PASS only if you can reconstruct the sole executable NEXT, preserve rerun prohibitions, detect stale subordinate snapshots, and remain fail-closed.

Expected gate at this revision: `CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN`.
