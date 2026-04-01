# PURCHASED_ACCESS_AND_CREDIT_WALLET_SPEC.md
Status: INTERNAL_ONLY
Last Updated: 2026-03-16

目的:
DTR の purchased access と AIチャット往復券の credit wallet を、同じ purchase spine 上でどう可視化するかを定義する。

## Design rule
- purchase truth = webhook + DB write
- visible entitlement surfaces consume DB-confirmed truth
- success page is not a settlement ledger

## Surface split
| surface | shows DTR access | shows chat credit | writes truth | notes |
|---|---|---|---|---|
| success page | status only | status only | no | display/polling only |
| my/account page | yes | yes | no | primary visible wallet/access hub |
| purchased-access page | yes | yes | no | shows owned content + balance |
| internal admin/support tool | yes | yes | no direct settlement | support/debug only |
| webhook/db layer | no UI | no UI | yes | actual truth source |

## State model
| state | meaning | user-facing copy direction |
|---|---|---|
| pending_webhook | checkout completed but settlement not confirmed | purchase received, confirming access |
| entitlement_confirmed | DB-side access/credit written | access/credit ready |
| delayed_confirmation | still waiting beyond normal window | still confirming, support available |
| support_needed | manual intervention required | please contact support |

## Bridge behavior
- DTR access:
  - visible when content access entitlement is confirmed
- Chat credit:
  - visible when wallet increment is confirmed
- Both lanes should be queryable from the same account hub, but rendered as separate blocks

## Anti-drift rule
- never treat HTML success capture as proof of actual entitlement
- never infer wallet balance from frontend state alone
- never collapse DTR rights and chat credits into one ambiguous counter
