# M55 Pair Funnel Contract

Status: **Target contract (Tier C)**  
Machine truth: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Center definition

```
あなた ＋ 関係を知りたい相手
```

## Required inputs

- 二人分の生年月日
- 回答するのは **ユーザー本人**
- 相手が回答したものではない
- 相手の気持ち・未来・結果を断定しない

## Prohibited authority expressions

Do not use as center product language:

- 「親密な相手」
- 「気になる二人」

## Target relationships (repo classification)

| Relationship | Status | Repo mapping |
|---|---|---|
| 好きな人 | SUPPORTED | R1 片思い (`pairReadingCatalog.v1.ts`) |
| 恋人 | SUPPORTED | R3 付き合っている |
| パートナー | SUPPORTED | R3 / R6 |
| 夫婦 | SUPPORTED | R6 長く一緒にいることを考えている |
| 家族 | UNSUPPORTED | RELATION_STATUS_CATALOG に該当なし |
| 友人 | UNSUPPORTED | RELATION_STATUS_CATALOG に該当なし |

**UNPROVEN** items must not appear in public claims.

## pairFree (current: LIVE_PUBLIC)

- Route: `/synastry` (`lib/m55/homePairReadingPublicContract.ts`)
- 二人の間に今表れやすい流れの入口
- Login 不要

## pairPremium (current: NOT_LIVE)

Repo-verified facts only (`lib/m55/compatibility/compatibilityCommerceAuthority.ts`):

- productKey: `compatibility_report_full_v1`
- publicName: 二人の相性レポート
- price: ¥1,480（税込）
- Commerce env-gated (`M55_COMPATIBILITY_COMMERCE_ENABLED`)
- Production E2E 未完了
- HOME paid CTA: **false**

**Target value (not claimed as live):**

- なぜその流れになりやすいか
- 二人の違い
- 会話や距離のペース差
- すれ違いが続く順番
- 違いをどう扱えるか
- 次に試せること

Do not describe unverified repo value as implemented or purchasable in production.

## Pair Free / Paid value boundary (Human-approved — do not re-map)

Status: **HUMAN_APPROVED / COMPLETE** (`PAIR-FREE-TO-PAID-MAPPING-FIRST`)
Repeat mapping: **PROHIBITED**

### Pair Free owns

- two-person stable/base relationship reading
- overlap / difference
- current expression
- mismatch / misread loop recognition
- recognition of what is happening between the two people

### Pair Paid owns

- why / conditions behind the pattern
- how to handle the difference
- return/reset procedure
- concrete actionable steps
- usable phrase
- small experiment
- reflection/revisit question
- six-scene deeper reading
- durable saved/revisit value

### Boundary rules

- Free must not leak paid handling, actionable steps, experiments, or durable revisit value.
- Paid must not re-open the base relationship/overlap/mismatch recognition work that Free already owns.
- Pair Premium activation remains `NOT_ACTIVATED` until `PAIR-PREMIUM-ACTIVATION-DECISION` is explicitly completed.
- Compatibility commerce is not live; do not claim purchasable Pair Paid in production.
