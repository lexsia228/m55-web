# DTR_PRODUCT_FAMILY_MATRIX.md
Status: INTERNAL_ONLY
Last Updated: 2026-03-16

目的:
DTR family を「価格」より先に **deliverable 差分 / entitlement 差分 / support 差分** で定義する。

## Family candidates
| tier_id | public_name_candidate | internal_positioning | deliverable_depth | entitlement_result | support_complexity | public_readiness | notes |
|---|---|---|---|---|---|---|---|
| ENTRY | DTR Core Static V1 Entry | 最低リスク入口 | compact | entry report access | low | internal_only | first expansion candidate |
| STANDARD | DTR Core Static V1 Standard | 基準商品 | standard | standard report access | low | internal_only | likely default |
| DEEP | DTR Core Static V1 Deep | 深掘り版 | deep | deep report access | medium | candidate | wording and proof need more work |
| EXTENDED | DTR Core Static V1 Extended | 長文/拡張版 | extended | expanded report access | medium | candidate | bundle semantics may be needed |
| COMMERCIAL | DTR Commercial License | 商用/利用権差分 | variable | commercial usage right | high | candidate | legal text required |
| BUNDLE | DTR Bundle | 将来束販売 | mixed | bundle entitlement | medium | not_approved | not for immediate rollout |

## Differentiation law
- 同じ family 内でも SKU 差は **内容差** と **権利差** で定義する
- 単なる価格違いだけで SKU を増やさない
- public へ出す前に、tier ごとに以下を埋める
  - exact deliverable
  - exact entitlement target
  - fulfillment timing
  - refund / support wording impact
  - proof/evidence burden

## Pricing worksheet (fill manually)
| tier_id | planned_price_jpy | intro_price_jpy | quantity_cap | launch_notes |
|---|---:|---:|---:|---|
| ENTRY | TBD | TBD | TBD |  |
| STANDARD | TBD | TBD | TBD |  |
| DEEP | TBD | TBD | TBD |  |
| EXTENDED | TBD | TBD | TBD |  |
| COMMERCIAL | TBD | TBD | TBD |  |

## Non-negotiables
- current public review-safe lane is still one-time
- wording must remain non-divinatory on public surfaces unless separately approved
- success page is not fulfillment truth
- checkout_e2e / dashboard / public evidence burden scales with SKU count
