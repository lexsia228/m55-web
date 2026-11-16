# M55 Pair P5-1 — Human issuer + atomic receipt ledger (authority freeze v1)

**Status:** Human-approved design freeze for LOCAL implementation only. **Not** migration APPLY, **not** live attestation minting, **not** P5-1 APPLY GO.

## Issuance owner

- **HUMAN** is the sole production issuance authority for independent Preview UI attestations.
- Cursor, in-process test registries, and synthetic keys **cannot** mint operational attestations.
- Machine verification uses **Ed25519** over a canonical JSON payload (`M55_PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_v1`).
- Operational trust anchors are configured only via explicit Human-approved public key fingerprints (`PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS`); empty ⇒ fail-closed.

## UI evidence boundary (2026-10-23)

| Field | Status |
|-------|--------|
| Organization `m55-preview` | OBSERVED_MATCH |
| Project `m55-soul-preview` | OBSERVED_MATCH |
| Project ref `sbogwyzldjxxouhqtpnq` | OBSERVED_MATCH |
| Tier Primary Database | OBSERVED_MATCH |
| Database name `postgres` | **UI_UNOBSERVED** — never witnessed in attestation payload |

`humanUiEvidenceDigestSha256` may be bound only when actual evidence bytes exist; no fabricated digest.

## Durable one-use store owner

- **Pair P5-1 scoped** PostgreSQL ledger in Preview Supabase project (draft migration only).
- Migration: `supabase/migrations/20261008200000_m55_pair_p5_dedicated_receipt_one_use_ledger_v1.sql`
- **Rejected:** reuse of `stripe_processed_events` or payment webhook idempotency for Pair dedicated receipts.
- Ledger bootstrap/apply ordering is a **separate Human approval** from P5-1 identity migration `20261009000000_m55_pair_owned_state_identity_v1.sql` (frozen).

## Transaction boundary note

Atomic `INSERT … ON CONFLICT DO NOTHING RETURNING` models cross-process one-use at the ledger. Pre-credential boundaries must **not** consume the receipt. `runPairP5AuthorizationGatedPgTransactionOrchestration` runs the post-connect claim via `createPairP5PostgresTransactionalLedgerClaimPortFromExecutionPgClient` after prior-probe success and before P5-1 DDL inside the open transaction (offline simulation + future live session). **Live APPLY** still requires Human ledger migration deploy, trust anchors, and P5-1 APPLY GO.

## Preview apply ordering (2026-10-23)

| Fact | Implication |
|------|-------------|
| Ledger migration version `20261008200000` sorts **after** R7 D5 `20261008000000` and **before** frozen P5-1 `20261009000000` | Classifier `ABSENT` => apply ledger once; `PRESENT_EXACT` => skip DDL; `PRESENT_MISMATCH` => STOP. |
| First receipt-gated P5-1 mutation | Requires ledger table + authorized INSERT role **already** present. |
| **Human Preview execution plan** | (1) Apply ledger migration only under explicit GO; run SELECT-only preflight (`PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_*` in source). (2) Then P5-1 identity apply with operational receipt + live executor surface. |
| LIVE entry | `preparePairP5LiveSessionPoolerOrchestrationSurface` requires operational dedicated receipt and derives ledger binding internally; LIVE orchestration cannot skip atomic claim. |

## Live flags (unchanged)

All operational/live authorization flags remain **false** until separate Human GO.
