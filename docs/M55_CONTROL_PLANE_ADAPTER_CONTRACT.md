# Control Plane Adapter Contract

The generic engine owns safe Git collection, stable JSON, status reduction, redaction, HTML
escaping, canonical target-platform path identity, reason codes, CI exit codes, and packet output. An adapter
owns only its repository’s authority manifest, read order, required fields, active-lane and next-
action extraction, prohibited lanes, documented transitions, current/target rules, domain facts,
and allowed warnings. The engine has no repository filename, lane, price, product, or worktree-
name knowledge.

## Platform-explicit path identity

The engine's path identity contract accepts a target platform (`win32`, `darwin`, or `linux`), a
target cwd, optional injected realpath resolver, and whether target-filesystem resolution is
available. It uses `path.win32` for Windows and `path.posix` for macOS and Linux. Windows identity
normalizes slash direction, drive and path case, and trailing separators while preserving spaces;
macOS and Linux preserve POSIX roots and case.

Live calls default to `process.platform`, the native cwd, and native realpath. Foreign-platform
simulation uses target-platform lexical semantics and does not call the host filesystem unless a
test or adapter explicitly supplies a target resolver and marks filesystem resolution available.
Registry and live worktree paths pass through the same identity function. This normalizes genuine
same-host spelling differences only; it does not translate, guess, or authorize a foreign host's
worktree path.

An adapter returns deterministic checks (`id`, `level`, `message`, optional safe details) and an
authority summary. `FAIL` produces `HOLD`; `WARN` is permitted only when the audited worktree is
clean and the adapter explicitly documents why it is nonblocking.

`scripts/m55-handoff/examples/nebula-adapter.mjs` is a fully synthetic non-M55 example. It uses
`GOVERNANCE.md`, `STATE.md`, and `WORKTREES.md` to demonstrate the same generic status reducer
without M55 vocabulary or facts.

## Distribution boundary

M55 is one production adapter; Nebula is the non-M55 proof. A future extraction may provide a
standalone package, `init` command, GitHub Action, adapter template, and versioned report schema.
Those are an extraction path only: this repository does not publish a package, create another
repository, or add speculative dependencies.
