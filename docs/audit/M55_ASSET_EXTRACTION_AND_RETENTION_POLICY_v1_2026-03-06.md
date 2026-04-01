# M55_ASSET_EXTRACTION_AND_RETENTION_POLICY_v1 (2026-03-06 JST)
Status: Audit / Operating Policy

## Purpose
Convert useful work into reusable assets without polluting active law.

## Extraction Rules
Extract only material that satisfies at least one of:
- defines an invariant
- records a decision that affects future implementation
- captures a reproducible incident / fix / runbook
- defines a canonical product / entitlement / routing / gate behavior
- improves automation, verification, or handoff

Do not preserve:
- duplicate drafts
- raw secrets
- noisy terminal history without reusable value
- obsolete implementation details contradicted by newer SSOT

## Retention Classes
### A. Canonical
Store under `docs/ssot/`.
Examples:
- revenue acceleration SSOT
- monetization implementation plan
- post-review UI switch SSOT

### B. Evidence / Audit
Store under `docs/audit/`.
Examples:
- postmortem
- implementation report
- ingest manifest/index/notes
- commit evidence summaries

### C. Frozen external references
Keep outside repo or under archive index only.
Examples:
- desktop packs
- PDFs / ZIPs / binaries
- raw patches from old eras

## Ingest Pattern
Every ingest must create:
- `INDEX.md`
- `MANIFEST.md`
- `NOTES.md`

Use index + sha256 when raw files should not be committed.

## Team Sharing Rule
Anything shared with team must be either:
- an SSOT link
- an audit report link
- a checkpoint summary

Chat summaries without a file are not official.

## AI/Cursor Rule
Cursor may synthesize, reorganize, and draft.
Cursor may not silently redefine canonical law.
All AI output becomes trusted only after classification into SSOT/Audit/Implementation.

(END)
