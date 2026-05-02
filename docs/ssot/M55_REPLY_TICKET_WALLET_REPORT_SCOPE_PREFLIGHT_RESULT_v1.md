# M55 Reply Ticket Wallet Report Scope Preflight Result v1

## Scope
Preflight for converting reply_ticket_wallets from user-scoped wallet to report_instance-scoped wallet.

## Findings
reply_ticket_wallets total: 8
report_instance_id present: 5
report_instance_id null: 3
null wallet status: active 3
duplicate user_id + report_instance_id pairs: 0
users with multiple wallets: 0
null wallets with matching snapshot: 0
null wallets without matching snapshot: 3
null wallets with single matching snapshot: 0
null wallets with multiple matching snapshots: 0

## Constraint State
Current unique constraint:
- reply_ticket_wallets_user_id_key
- UNIQUE(user_id)

Target constraint:
- UNIQUE(user_id, report_instance_id)
- report_instance_id should become NOT NULL only after null wallet policy is resolved.

## Diagnosis
The current DB still has user-scoped uniqueness and is not yet safe for report-scoped additional reply ticket fulfillment.
The schema has report_instance_id columns on wallet and ledger, but the active unique rule is still user-only.
Three active wallet rows have NULL report_instance_id and no matching dtr_report_snapshots, so automatic backfill is not safe.

## Decision
Do not apply DDL yet.
Do not DROP reply_ticket_wallets_user_id_key yet.
Do not SET report_instance_id NOT NULL yet.
Do not UPDATE or DELETE null wallet rows manually in this step.
Commit report-scoped candidate code and migration draft first.

## Next Action
1. Commit report-scoped wallet candidate changes.
2. Create explicit null-wallet policy.
3. Prepare gated migration:
   - resolve or quarantine NULL wallet rows
   - create UNIQUE(user_id, report_instance_id)
   - remove UNIQUE(user_id)
   - update RPC in DB
4. Run one fresh test checkout after DB migration is applied.
