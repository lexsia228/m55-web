# INTERNAL_MONETIZATION_MATRIX.md
Status: INTERNAL_ONLY
Last Updated: 2026-03-16

目的:
- DTR 多SKU、AIチャット往復券、将来カード/会員/コンシェルジュを **internal-only** で同一台帳に載せる
- public truth と future hypothesis を混ぜない
- 収益 primitive（one-time / consumable / future recurring）を明示分離する

## Column guide
- `internal_sku_id`: 内部識別子。変更しない
- `family`: DTR / AI_CHAT / CARD_MODE / MEMBERSHIP / CONCIERGE
- `public_name_candidate`: 外向き候補名。未確定なら TBD
- `lane_type`: one_time / consumable / future_recurring / future_mode / future_license
- `billing_type`: one_time / credits_pack / recurring / bundle
- `current_status`: candidate / internal_only / approved_for_future_spec / not_approved
- `entitlement_type`: content_access / chat_credit / premium_mode / member_tier / concierge_access
- `entitlement_target`: 何が解放・加算されるか
- `delivery_model`: immediate_access / delayed_confirmation / consumption_balance / recurring_access
- `webhook_truth_event`: 例 `checkout.session.completed`
- `success_page_behavior`: display/polling only の具体表示
- `launch_gate_dependency`: 何が通ってから public 化できるか

## Matrix
| internal_sku_id | family | public_name_candidate | internal_name | lane_type | billing_type | current_status | entitlement_type | entitlement_target | webhook_truth_event | delivery_model | success_page_behavior | legal_impact_notes | support_impact_notes | evidence_impact_notes | launch_gate_dependency | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DTR_CORE_STATIC_V1_ENTRY | DTR | DTR Core Static V1 Entry | DTR Entry Candidate | one_time | one_time | internal_only | content_access | DTR entry report access | checkout.session.completed | immediate_access | show processing/confirmed states only | one-time digital content wording needed | refund/support wording must align | public + checkout_e2e + dashboard evidence | evidence hardening complete | low-risk first expansion candidate |
| DTR_CORE_STATIC_V1_STANDARD | DTR | DTR Core Static V1 Standard | DTR Standard Candidate | one_time | one_time | internal_only | content_access | DTR standard report access | checkout.session.completed | immediate_access | show processing/confirmed states only | same as above | same as above | same as above | same as above | likely primary SKU |
| DTR_CORE_STATIC_V1_DEEP | DTR | DTR Core Static V1 Deep | DTR Deep Candidate | one_time | one_time | candidate | content_access | deeper DTR access / extended deliverable | checkout.session.completed | delayed_confirmation | pending / confirmed / support-needed | deeper promise must match legal copy | support handling may rise | stronger fulfillment proof needed | entitlement bridge closure | do not publicize until fulfillment wording is fixed |
| DTR_COMMERCIAL_LICENSE_V1 | DTR | DTR Commercial License | DTR Commercial Candidate | future_license | one_time | candidate | content_access | commercial usage right | checkout.session.completed | delayed_confirmation | pending / manual confirmation | legal/license text required | manual support may be needed | separate evidence lane may be required | legal/license pack | internal only for now |
| CHAT_TICKET_05 | AI_CHAT | AI Chat 5 Turns | 5-turn credit pack | consumable | credits_pack | candidate | chat_credit | +5 turns | checkout.session.completed | consumption_balance | show purchase confirmed / balance sync in progress | must not be misrepresented as report delivery | balance/support policy needed | wallet evidence path needed | credit wallet spec | independent lane from DTR |
| CHAT_TICKET_10 | AI_CHAT | AI Chat 10 Turns | 10-turn credit pack | consumable | credits_pack | candidate | chat_credit | +10 turns | checkout.session.completed | consumption_balance | show purchase confirmed / balance sync in progress | same as above | same as above | same as above | same as above | likely better value tier |
| CHAT_PRIORITY_SESSION_01 | AI_CHAT | Priority Session 1 | priority interaction session | consumable | one_time | candidate | priority_session | one priority session right | checkout.session.completed | delayed_confirmation | confirmed / scheduling pending | service wording may differ from digital content | higher support load | may need separate receipts wording | support / scheduling contract | internal only |
| CARD_MODE_ADDON_V1 | CARD_MODE | Guided Card Mode | Card Mode Candidate | future_mode | bundle | candidate | premium_mode | enables card-guided mode | checkout.session.completed | immediate_access | mode enabled after entitlement sync | avoid divinatory overclaim | support copy must be careful | mode proof required | product semantics review | keep internal |
| MEMBERSHIP_BETA | MEMBERSHIP | M55 Member Beta | recurring member candidate | future_recurring | recurring | not_approved | member_tier | future saved-data/member tier | invoice.paid | recurring_access | status display only | not active under current checkpoint | recurring support burden | separate recurring evidence needed | separate approval gate | roadmap only |
| CONCIERGE_ALPHA | CONCIERGE | M55 Concierge Alpha | concierge continuity candidate | future_recurring | recurring | not_approved | concierge_access | long-memory concierge access | invoice.paid | recurring_access | status display only | not active under current checkpoint | high support/privacy burden | strongest evidence/governance burden | roadmap + architecture maturity | north-star only |

## Open questions to fill
- 価格
- 初期販売本数
- SKU ごとの差分 deliverable
- refund eligibility wording
- support SLA
- purchased-access visible surfaces
