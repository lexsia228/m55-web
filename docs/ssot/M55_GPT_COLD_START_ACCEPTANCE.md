# M55 GPT Cold-Start Acceptance Contract

Status: **ACCEPTED / RETAINED AS REGRESSION CONTRACT**  
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

## Accepted result

The zero-memory, one-prompt acceptance rerun returned:

`HANDOFF_COLD_START_PASS`

Human accepted that result on 2026-08-22. The accepted run reconstructed the sole executable authority, current main and Production identity, CLOSED GREEN / rerun prohibitions, Pair implementation `NOT_STARTED`, Pair Premium `NOT_ACTIVATED`, governed stale subordinate narrative state, and performed zero mutations.

The Control Tower hardening itself was merged in PR #151 and observed READY in Production at main SHA:

`201c883112e9c0a85ee7689f1d23fa1ee16f570b`

The accepted transition therefore advances product work to:

`PAIR-FREE-TO-PAID-MAPPING-FIRST`

This authorizes **read-only mapping only**. It does not authorize Pair implementation or Pair Premium activation.

## PASS criteria for future regression checks

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
- it does not start implementation or a later roadmap gate merely because the handoff test passed;
- mutation count is zero.

Any authority conflict, unexplained branch movement, unverifiable required identity, attempted high-cost replay, or mutation during the acceptance test is FAIL/STOP.

## Regression rule

A new chat/session is not an invalidating dependency. Do not rerun this acceptance merely because a new conversation was opened. Rerun only if the handoff mechanism, executable-state ownership, cold-start boot rules, or another dependency that can invalidate handoff correctness materially changes.

## Reusable fresh-chat test prompt

Use a completely new GPT conversation and provide only the repository identity plus this instruction:

> Perform the M55 cold-start acceptance from repository authority only. Read `AGENTS.md` first. Do not use prior chat memory. Do not mutate anything. Reobserve GitHub and Vercel when available. If local runtime is unavailable, report `LOCAL_RUNTIME_UNAVAILABLE` instead of inferring local facts. Return PASS only if you can reconstruct the sole executable NEXT, preserve rerun prohibitions, detect stale subordinate snapshots, and remain fail-closed.

There is intentionally no expected gate token in the prompt. A fresh model must discover the current NEXT from repository authority.
