# Control Plane Adapter Contract

The generic engine owns safe Git collection, stable JSON, status reduction, redaction, HTML
escaping, and packet output. An adapter owns only its repository’s authority manifest, parsing,
domain facts, and allowed warnings. The engine has no repository filename, lane, price, product,
or worktree-name knowledge.

An adapter returns deterministic checks (`id`, `level`, `message`, optional safe details) and an
authority summary. `FAIL` produces `HOLD`; `WARN` is permitted only when the audited worktree is
clean and the adapter explicitly documents why it is nonblocking.

`scripts/m55-handoff/examples/nebula-adapter.mjs` is a fully synthetic non-M55 example. It uses
`GOVERNANCE.md`, `STATE.md`, and `WORKTREES.md` to demonstrate the same generic status reducer
without M55 vocabulary or facts.
