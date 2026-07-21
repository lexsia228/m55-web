# M55 Control Plane — Guardrails & Consistency

Consistency is the read-only companion outcome of the existing Control Plane loop. Guardrails
stop unsafe work; Consistency compares declared repository surfaces with project-defined page,
layout, token, terminology, CTA, responsive-evidence, current/target, current-debt, exclusion, and
Human-review contracts. It does not rewrite source and does not claim visual perfection.

## Judge path

Run the Node-built-in-only demonstration:

```bash
node scripts/m55-handoff/consistency-demo.mjs
```

The command needs no install, secret, database, Clerk, Stripe, production service, or network
access. It writes three synthetic packets and one read-only M55 packet below Node's platform
temporary directory in `m55-consistency-preview`. It does not dirty the repository.

Each packet is generated from one canonical evidence result and contains:

- `consistency-report.json` — stable machine evidence and counts;
- `consistency-handoff.md` — compact AI/CI handoff;
- `consistency-operator.html` — complete evidence for repository operators;
- `consistency-judge.html` — English-first 30-second product explanation;
- `consistency-print.html` — dedicated five-section A4 distribution report.

For print, select A4, 100% scale, default document margins, background graphics, and disable
browser headers and footers. The print report intentionally omits the full PASS record log; use
the operator report or JSON for complete evidence.

## Evidence semantics

Every evidence record has a stable `surfaceId`, `ruleId`, category, outcome, summary, separate
expected and observed values, authority and source references, evidence level, blocking flag,
current/target state, and next action.

The only evidence outcomes are:

- `PASS` — the configured encoded check passed;
- `CURRENT_DEBT` — observed current-state debt proven at its declared evidence level; never target compliance;
- `REVIEW_REQUIRED` — an explicit Human or nonblocking evidence gate;
- `EXCLUDED` — a declared scope boundary, never compliance;
- `FAIL` — blocking contradiction, malformed evidence, or unverifiable required evidence.

Status reduction is fail-closed: any `FAIL` produces `HOLD`; otherwise any `CURRENT_DEBT` or
`REVIEW_REQUIRED` produces `REVIEW_REQUIRED`; only PASS-only covered evidence (with optional
explicit exclusions) produces `CONSISTENT`. Evidence levels are `SOURCE_STATIC`,
`RUNTIME_VERIFIED`, `VISUAL_CAPTURE`, and `HUMAN_APPROVED`. Outcome and evidence level are
independent fields. `SOURCE_STATIC` debt is not runtime-verified; `RUNTIME_VERIFIED` may be used
only after direct execution. A static responsive marker proves only that the marker exists; it
does not prove rendered viewport behavior.

For the canonical M55 report, the complete 15-item debt/review record comprises 13 current-debt
records and 2 Human-review evidence records. Four explicit exclusions remain separate in Coverage,
and the 3 pending Human decisions are decision prompts rather than additional evidence records.

Control Plane release review is separate from consumer-surface review. Human approval of the
Judge, Operator, and print presentation is a tooling-release prerequisite only: it does not resolve
either consumer Human-review evidence record, does not increment consumer `VISUAL_CAPTURE` or
`HUMAN_APPROVED`, and does not make report screenshots evidence for an M55 consumer page. The
actual covered consumer surfaces require review in separately authorized product visual-review
lanes.

Manifest evaluation is fail-closed before nested iteration. Optional collections must be arrays
when present, nested items must provide their required typed fields, and malformed sections produce
stable `MANIFEST_NESTED_SCHEMA_VALID` or `MANIFEST_SURFACE_VALID` diagnostics instead of escaping as
runtime `TypeError`. A `CONSISTENT` result requires at least one covered surface with declared source
and authority evidence. An all-excluded manifest, an evidence-empty covered surface, or an exclusion
whose declared authority cannot be read produces `HOLD`. Negative checks use an explicit read result:
an unreadable source is unverifiable and can never prove that a token or term is absent.
Legacy Human-review string shorthand is no longer accepted: manifest and surface review items must
be objects with non-empty `ruleId` and `summary` fields.

The existing `control-plane-consistency-evidence-v2` output schema is extended additively with the
exact manifest `project` identity. That identity is preserved in the report, handoff, Operator
provenance, artifact manifest, and semantic digest. Canonical evidence, surface, reference, reason,
decision, and artifact ordering uses a code-point comparator rather than the host default locale.
Every non-PASS Markdown handoff item includes structured `sourceRefs` and `authorityRefs`; validated
references remain repository-relative.

## Generic boundary and support

The generic evaluator contains no M55 route, Japanese term, product, price, token, Self Funnel
concept, or worktree name. `m55-consistency-adapter.mjs` owns all M55 facts, including explicitly
recorded current debt and exclusions. `examples/orbit-consistency-adapter.mjs` proves reuse with a
fully synthetic non-M55 project. The Orbit E2E exercises evaluation, canonical JSON, semantic
digest, AI handoff, Operator HTML, Judge HTML, Print HTML, atomic packet publication, and artifact
manifest verification. Its public output uses the Orbit project identity and contains no M55 fact.

The v1 runner requires Node, uses Node built-ins and platform path APIs, and writes to
`os.tmpdir()`. The truthful onboarding boundary is: **Zero-install demo. Adapter-configured
adoption.** The platform evidence boundary is exact: **Guardrail core: native macOS and Windows
verification. Consistency distribution layer: native macOS execution; final Windows rerun
pending.** Linux path semantics remain test-covered, with no native Linux claim. This repository
does not publish an npm package, provide an `npx` install path, generate adapters automatically,
or claim zero-config adoption. Generated public examples contain no local username, absolute
machine path, external font, script, CDN, or telemetry.

## Built with Codex + GPT-5.6

Codex implemented and iterated on the Control Plane. GPT-5.6 Sol was used inside Codex for
architecture, adversarial audit, cross-platform root-cause analysis, evidence semantics, and
information design. Independent Windows Codex verification was separated from Mac implementation.

The shipped evaluator remains deterministic and requires no model call, API key, secret, or
network service. GPT-5.6 does not perform hidden runtime classification. Human approval remained
authoritative for scope, repair, commit, and merge decisions.

The primary Codex Session ID is a Human-supplied submission field and is intentionally not emitted
in public reports. Private submission placeholder only:
`PRIMARY_CODEX_SESSION_ID_PENDING_HUMAN_INSERTION`.

## Independent Windows verification case study

An intentionally unmanaged fresh Windows checkout returned `HOLD / WORKTREE_UNREGISTERED`.
Independent Windows testing then exposed cross-platform path-semantics defects before PR creation.
The verifier did not edit or automatically repair the checkout. Human approval authorized the
Mac-side repair, and a Windows rerun verified the repaired deterministic contract. Repository
anchors include `scripts/m55-handoff/samples/hold-report.json` and portability commits `3a09b53`,
`8a6eeb5`, and `c1751c7`. No prevented-incident, money-saved, or percentage-risk claim is made.

## Artifact integrity

The distribution evidence includes `consistency-artifact-manifest.json`, generated outside the
repository after HTML, PDF, and PNG rendering. It records artifact byte sizes and SHA-256 hashes,
plus a reproducible semantic digest over the canonical evidence payload. The semantic digest
excludes timestamps, temporary output locations, artifact hashes, and renderer-local metadata; it
does not exclude evidence, counts, reason codes, status, authority references, source references,
project identity, commit, or branch. It is an integrity digest, not a digital signature or signed
Human attestation.

Both packet writers enforce one fail-closed output-boundary contract. The repository root is
resolved to its real filesystem identity; the requested destination is reconstructed from its
nearest existing, real-resolved ancestor, including any nonexistent suffix. Destinations equal to
or contained by the repository are rejected before directory creation and checked again after
creation, so direct paths, symlink or junction destinations, symlinked parents, and nested new
paths below them cannot redirect artifacts into the repository. Identity failures return
`OUTPUT_PATH_UNVERIFIABLE`; verified repository-contained destinations return
`OUTPUT_INSIDE_REPOSITORY`. Windows identity comparison normalizes case and separators through the
existing Control Plane path contract.

### Atomic packet publication

`writeConsistencyPacket` first canonicalizes the complete report and renders JSON, Markdown,
Operator HTML, Judge HTML, and Print HTML entirely in memory. It validates the fixed target-name
set, rejects normalized duplicates, and requires every rendered value to be a string or buffer
before creating a staging entry.

The requested final directory must be absent and its existing parent must resolve outside the
repository. The writer creates a unique same-parent staging directory, writes an ownership marker,
real-resolves the staging identity, and creates every child with exclusive `O_CREAT | O_EXCL |
O_WRONLY` semantics plus `O_NOFOLLOW` where the host exposes it. Only after every file is complete
and synced does one directory rename publish the packet. A cooperating concurrent writer therefore
cannot replace or merge with a completed packet. `OUTPUT_TARGET_EXISTS`,
`OUTPUT_TARGET_UNVERIFIABLE`, `OUTPUT_WRITE_INCOMPLETE`, and `OUTPUT_PUBLISH_CONFLICT` are stable
failure classifications.

An ordinary failure removes only the staging directory whose exact name and ownership marker match
the current call; the requested final target and unrelated siblings are never removed. Abrupt
termination can leave a uniquely named staging directory, but the final packet remains absent.
Later cleanup is allowed only after the staging-name and ownership-marker contract both verify.
The hidden ownership marker remains part of a published packet so orphan cleanup never depends on
an unmarked transition window.

### Distribution completion

`writeArtifactManifest` is the separate completion step after PDF and PNG generation. It verifies
that every declared artifact is a readable regular file, computes and re-verifies byte size and
SHA-256, renders the complete manifest, and writes a unique sibling file with exclusive creation.
The completed inode is then linked to `consistency-artifact-manifest.json` with an exclusive
no-replace filesystem operation. Existing regular, symbolic-link, hardlink, or reparse-backed
targets are never overwritten. Manifest existence therefore marks a complete manifest file;
consumers must still verify every declared artifact hash before trusting the bundle.

## Unicode and canonical semantic identity

Semantic string values are normalized to Unicode NFC before report storage, evidence identity,
canonical sorting, and semantic digest calculation. Repository-relative references are first
validated as relative, then normalized to `/` separators and NFC while preserving case. Absolute
local machine paths remain prohibited rather than normalized into evidence.

Evidence ordering uses a code-point comparator over a total canonical representation containing
all thirteen stable evidence fields. Reference arrays are normalized and sorted before comparison;
the host locale is never consulted. Stable evidence identity contains `surfaceId`, `category`,
`ruleId`, canonical `sourceRefs`, `currentOrTarget`, `expected`, and `observed`. Repeated identities
fail closed as `EVIDENCE_IDENTITY_COLLISION`, whether the records are exact duplicates or contain
conflicting remaining semantic fields; no record is silently deduplicated.

## NOT IMPLEMENTED — POST-BUILD-WEEK ROADMAP

The following are design questions only. They are not current functionality and do not contribute
to compliance counts:

- protected test/spec mutation detection;
- package and lockfile mutation detection;
- dependency provenance and supply-chain checks;
- a stronger secret-leak rule pack;
- a declarative adapter schema;
- frontend, backend, and infrastructure rule packs;
- optional GPT-5.6-assisted adapter proposals, always subject to Human review;
- Human-approved rollback playbooks;
- signed attestations as a separate future design question.
