# M55 Reply Ticket Wallet Report Scope DDL Result v1

## Scope

Result record for converting reply_ticket_wallets from user-global uniqueness toward report_instance-scoped uniqueness.

## Preconditions

Preflight SSOT:

- docs/ssot/M55_REPLY_TICKET_WALLET_REPORT_SCOPE_PREFLIGHT_RESULT_v1.md

Null wallet policy:

- docs/ssot/M55_REPLY_TICKET_NULL_WALLET_POLICY_v1.md

Null wallet quarantine result:

- docs/ssot/M55_REPLY_TICKET_NULL_WALLET_QUARANTINE_RESULT_v1.md

## DDL Executed

- Created partial unique index:
  - reply_ticket_wallets_user_report_uidx_nonnull
  - UNIQUE(user_id, report_instance_id)
  - WHERE report_instance_id IS NOT NULL
- Dropped legacy user-global unique constraint:
  - reply_ticket_wallets_user_id_key / UNIQUE(user_id)

## Post-check Result

Index state:

- reply_ticket_wallets_user_report_uidx_nonnull: present
- partial predicate: report_instance_id IS NOT NULL
- reply_ticket_wallets_user_id_key: removed
- reply_ticket_wallets_pkey: present
- idx_reply_ticket_wallets_status: present

Constraint state:

- reply_ticket_wallets_user_id_key: absent
- reply_ticket_wallets_pkey: present
- CHECK constraints: present

Wallet state:

- wallet_total: 8
- null_report_wallet_count: 3
- non_null_report_wallet_count: 5
- active_null_report_wallet_count: 0
- closed_null_report_wallet_count: 3
- duplicate_non_null_scope_group_count: 0

## Decision

Report-scoped wallet uniqueness: GREEN.

Legacy user-global uniqueness has been removed.

Only non-null report_instance_id wallet rows are currently covered by the new partial unique index.

Closed NULL-scope legacy rows remain for audit/retention.

## Still Not Applied

- report_instance_id NOT NULL: not applied
- RPC replacement: not applied
- fresh checkout: not run
- Stripe replay: not run
- additional payment: not run

## Next Action

1. Final-audit the RPC replacement candidate:
   - scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql
2. Apply RPC replacement only after audit.
3. Run one fresh test checkout after RPC replacement.
4. Confirm fulfilled wallet/ledger grant.
