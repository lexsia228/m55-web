# M55 Reply Ticket RPC Replacement Result v1

## Scope

Result record for applying the report-scoped RPC replacement for additional reply ticket fulfillment.

## Preconditions

Wallet report-scope DDL result:

- docs/ssot/M55_REPLY_TICKET_WALLET_REPORT_SCOPE_DDL_RESULT_v1.md

RPC candidate:

- scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql

## RPC Applied

Function:

- public.m55_reply_ticket_fulfill_checkout_event

Arguments:

- p_stripe_event_id text
- p_checkout_session_id text
- p_payment_intent_id text DEFAULT NULL::text
- p_product_key text DEFAULT NULL::text
- p_report_instance_id uuid DEFAULT NULL::uuid
- p_wallet_scope_user_id text DEFAULT NULL::text
- p_user_ref_hash text DEFAULT NULL::text
- p_quantity integer DEFAULT 1

Result:

- jsonb

## Post-check Result

wallet_report_scope_condition_present: true

wallet_user_scope_condition_present: true

duplicate_without_ledger_grant_present: true

ledger_insert_present: true

processed_status_present: true

## Interpretation

The RPC replacement is installed and contains the required report-scoped wallet lookup.

The function now verifies wallet scope using both user_id and report_instance_id.

The function also contains duplicate-without-ledger detection, ledger insert, and processed status update logic.

## Decision

RPC replacement applied: GREEN.

## Still Not Proven

- fresh checkout fulfillment has not been run
- wallet purchased_count increment has not yet been proven after this RPC replacement
- ledger purchase_grant creation has not yet been proven after this RPC replacement
- Stripe replay has not been run
- additional payment has not been run

## Next Action

1. Prepare fresh test checkout gate.
2. Run exactly one fresh test checkout for additional_reply_ticket.
3. Confirm:
   - route_response_2xx: true
   - fulfill_status: fulfilled
   - wallet_grant_observed: true
   - ledger_grant_observed: true
   - wallet purchased_count increased by 1
   - ledger purchase_grant increased by 1
4. Record fresh checkout fulfillment result SSOT.
