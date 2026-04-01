# AI_CHAT_TICKET_ENTITLEMENT_SPEC.md
Status: INTERNAL_ONLY
Last Updated: 2026-03-16

目的:
AIチャット往復券を DTR とは別 primitive の **consumable entitlement** として定義する。

## Core model
- entitlement_type: `chat_credit`
- business truth: webhook + DB write
- visible surface: purchased-access / wallet / account balance view
- success page role: display/polling only

## Candidate packs
| pack_id | public_name_candidate | credits_added | use_model | current_status | notes |
|---|---|---:|---|---|---|
| CHAT_TICKET_05 | AI Chat 5 Turns | 5 | decrement per completed round-trip | candidate | starter pack |
| CHAT_TICKET_10 | AI Chat 10 Turns | 10 | decrement per completed round-trip | candidate | likely value tier |
| CHAT_TICKET_20 | AI Chat 20 Turns | 20 | decrement per completed round-trip | candidate | heavier usage tier |
| CHAT_PRIORITY_SESSION_01 | Priority Session 1 | 1 session | decrement per consumed priority session | candidate | different entitlement than credit pack |

## Credit increment rules
- increment occurs only after successful webhook-confirmed settlement
- increment must be idempotent
- failed payment must not increment credits
- refunded/voided payment requires explicit reversal rule, not implicit UI guess

## Decrement trigger
Default proposal:
- decrement when one paid round-trip is completed and persisted
- do not decrement on page refresh
- do not decrement on partial draft creation
- do not decrement solely because checkout succeeded

## Zero-balance behavior
- show balance = 0 clearly
- allow upsell to new credit pack
- do not silently convert to subscription
- if a grace rule is desired, define it explicitly and log it

## Refund / failed payment handling
| scenario | effect on wallet | support note |
|---|---|---|
| checkout success but webhook not confirmed | no increment yet | show pending state |
| payment failure | no increment | surface retry path |
| refund after increment | explicit debit/reversal workflow required | manual review may be needed |
| duplicate webhook | idempotent no double increment | log and ignore duplicate settlement |

## User-visible balance surfaces
- account / my page wallet
- purchased-access area
- optional lightweight status chip in chat surface
- success page may show "sync in progress / confirmed", but not act as truth

## Support escalation
- wallet mismatch
- credit decrement dispute
- refund reversal mismatch
- duplicate charge concern
