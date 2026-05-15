# M55 Reply Ticket Fresh Checkout Fulfillment Result v1

## Scope

Result record for one fresh test checkout of additional_reply_ticket after report-scoped wallet DDL and RPC replacement.

## Preconditions

Wallet report-scope DDL result:

- docs/ssot/M55_REPLY_TICKET_WALLET_REPORT_SCOPE_DDL_RESULT_v1.md

RPC replacement result:

- docs/ssot/M55_REPLY_TICKET_RPC_REPLACEMENT_RESULT_v1.md

## Fresh Checkout

product: additional_reply_ticket
amount: JPY 500
checkout_completed: true
additional_test_checkout_count_this_gate: 1
old_event_replay_used: false
manual_db_update_used: false

## Webhook Result

webhook_forward_to_localhost: true
webhook_route_response_2xx: true
webhook_route_status: 200

## DB Result

purchase_grant_total: 2
purchase_grant_last_30min: 1
processed_event_total: 2
processed_count: 2
processed_last_30min: 1
wallet_purchased_count: 2
wallet_available_count: 1
wallet_consumed_count: 2
wallet_initial_included_count: 1
wallet_status: active
wallet_balance_formula_verified: true

## Interpretation

Fresh additional_reply_ticket checkout fulfilled successfully.
The webhook reached /api/stripe/webhook and returned 200.
stripe_processed_events increased for additional_reply_ticket.
reply_wallet_ledgers purchase_grant increased for additional_reply_ticket.
reply_ticket_wallets purchased_count increased and the wallet balance formula remains valid:
initial_included_count + purchased_count - consumed_count = available_count.

## Decision

Additional reply ticket checkout fulfillment: GREEN.

## Still To Verify Separately

- UI purchase CTA placement is not yet complete.
- Product-facing追加購入導線 must be exposed in the report/reply UI.
- Remaining ticket count display must be verified after purchase and after consumption.
- Maximum 5 total reply tickets per report must be verified.
- Raw checkout logs should be redacted before production hardening.

## No Further Test Payment

Do not run another fresh checkout in this gate.
Do not replay old Stripe events.
Do not manually update DB.
