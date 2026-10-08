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

## pairPremium (current authority — three non-overlapping facts)

These facts coexist and must not be collapsed:

| Layer | Status | Meaning |
|---|---|---|
| Product runtime (`M55_COMMERCIAL_PRODUCTS.pairPremium.status`) | **NOT_LIVE** *(stale / reconciliation-required)* | Machine registry value unchanged in this gate; Production runtime proof (2026-10-07) establishes purchasable Pair Paid delivery — see closeout SSOT |
| Production commerce switch / control-plane (`pairPremium` in `M55_EXECUTION_STATE.json`) | **ACTIVATED** | `PAIR-PREMIUM-ACTIVATION-DECISION` is **CLOSED GREEN**; approved control-plane activation only |
| Production real-payment E2E | **CLOSED_GREEN / PRODUCTION / NO_REPLAY** | Proven 2026-10-07 — see `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md`. `M55_EXECUTION_STATE.json` Pair real-payment E2E substate remains **stale / reconciliation-required** (`PAUSED_BEFORE_PAYMENT` equivalent) until separate control-plane reconciliation; this closeout does **not** change executable CURRENT/NEXT. |

Repo-verified product facts only (`lib/m55/compatibility/compatibilityCommerceAuthority.ts`):

- productKey: `compatibility_report_full_v1`
- publicName: 二人の相性レポート
- price: ¥1,480（税込）
- Commerce env-gated (`M55_COMPATIBILITY_COMMERCE_ENABLED`)
- HOME paid CTA: **false**

Control-plane activation alone **does not** establish full `ProductStatus` LIVE in the machine registry. Production real-payment E2E, fulfillment, and owned-report revisit are **CLOSED_GREEN / PRODUCTION / NO_REPLAY** per `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` (durable E2E evidence authority). `M55_EXECUTION_STATE.json` Pair real-payment E2E substate remains **stale / reconciliation-required** until a separate bounded control-plane task; this docs-only freeze does **not** change executable CURRENT/NEXT.

**Target value (Pair Paid content contract — not re-audited by this E2E):**

- なぜその流れになりやすいか
- 二人の違い
- 会話や距離のペース差
- すれ違いが続く順番
- 違いをどう扱えるか
- 次に試せること

The 2026-10-07 Production E2E closeout proves payment → fulfillment → owned-report **delivery and revisit** only. Content semantics for each paid-value bullet remain governed by existing product/content authority; this E2E is **not** an exhaustive semantic/content-quality audit.

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
- `PAIR-PREMIUM-ACTIVATION-DECISION` is **CLOSED GREEN**. The Production commerce switch/control-plane is **ACTIVATED**. Production real-payment E2E is **CLOSED_GREEN / PRODUCTION / NO_REPLAY** (`docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md`). Machine registry `pairPremium.status` remains **NOT_LIVE** until separately reconciled; that machine value is **stale** relative to Production runtime proof.
- **Repurchase policy (Human-approved 2026-10-07, not implemented here):** same already-owned Pair / same paid context must not encourage duplicate purchase; a genuinely different partner / new Pair may legitimately show a fresh purchase CTA. Stable same-Pair vs different-Pair identity is **not** frozen here — do not infer identity from nickname/display label alone. Residual post-purchase UX defects (`/synastry/purchase/success`, `/synastry/purchase/confirm`) are separate open items and do not invalidate the E2E proof.

## Commercial desire binding (2026-09-18)

Canonical owner: `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` §「Commercial desire and paid-worthiness」

## Commercial delight binding (2026-09-19)

Canonical owner: `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` §「Commercial delight and discovery standard」

- All Pair user-visible commercial content inherits the same **Global Commercial Delight Standard**.
- The frozen Pair Free/Paid boundary and non-mind-reading constraints remain **superior** and unchanged.
- Delight must not introduce compatibility score, good/bad verdict, partner mind-reading, or future prediction.

## Commercial desire binding detail (2026-09-18)

- Pair primary commercial desire is **「二人の相性・関係性をもっと知りたい」**.
- M55 compatibility is **non-deterministic**: no 相性スコア, no 合う/合わない判定, no 相手の本音, no 未来予測, no 復縁/結婚/改善保証.
- The existing Human-approved Pair Free/Paid boundary above remains **frozen**.
- Later alignment work against the global doctrine is an **overlay**, **not** a repeat of `PAIR-FREE-TO-PAID-MAPPING-FIRST`; `repeatMapping` remains **PROHIBITED**.
- The user-alone input rule remains: 回答するのはユーザー本人で、相手が回答したものではない.
- Pair Premium **product runtime remains NOT_LIVE**; this binding does not activate or claim it.
- Global paid-worthiness rules, question design standard, promise continuity, and report change classes **A–E** live in `M55_COMMERCIAL_FUNNEL_SSOT.md`. Do not duplicate them here.
