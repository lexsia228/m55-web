# M55 Reply Ticket Null Wallet Quarantine Result v1

## Scope

Result record for quarantining orphan reply_ticket_wallets with NULL report_instance_id before report_instance-scoped wallet migration.

## Preconditions

Policy SSOT:

- docs/ssot/M55_REPLY_TICKET_NULL_WALLET_POLICY_v1.md

Candidate SQL:

- scripts/sql/staging/m55_reply_ticket_null_wallet_quarantine_candidate.sql

Preflight findings:

- active NULL report_instance_id wallets: 3
- active NULL wallets with no matching dtr_report_snapshots rows for same wallet user_id: 3
- duplicate non-null (user_id, report_instance_id) groups: 0

## Execution Observation

quarantine_update_returned_count: 0

## Post-check Result

wallet_total: 8

null_report_wallet_count: 3

non_null_report_wallet_count: 5

active_null_report_wallet_count: 0

closed_null_report_wallet_count: 3

active_null_wallets_user_has_no_snapshot_rows: 0

duplicate_non_null_scope_group_count: 0

## Interpretation

The visible quarantine UPDATE returned 0 rows, which differs from the preflight expectation of 3.

However, post-checks confirm the desired database state:

- no active wallet rows remain with NULL report_instance_id
- three NULL-scope wallet rows are closed
- five report-scoped wallet rows remain non-null
- no duplicate non-null (user_id, report_instance_id) wallet groups exist

Do not rerun the quarantine UPDATE.

Treat the quarantine state as achieved, with the returned update count recorded as anomalous or previously applied.

## Decision

NULL wallet quarantine state: GREEN

DB mutation should not be repeated.

Proceed to report-scope unique migration final audit.

## Still Not Approved

- Do not drop UNIQUE(user_id) yet.
- Do not create report-scope unique constraint yet.
- Do not set report_instance_id NOT NULL yet.
- Do not apply RPC SQL yet.
- Do not run fresh checkout yet.
- Do not replay Stripe events.

## Next Action

1. Final-audit the report-scope unique migration candidate.
2. Decide whether the next DDL uses:
   - a partial unique index for non-null report_instance_id rows, or
   - a full NOT NULL migration after all NULL rows are resolved.
3. Only after DDL alignment, apply the RPC replacement.
4. Then run one fresh test checkout to prove fulfilled wallet/ledger grant.
