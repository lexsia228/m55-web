# WEB PRICING + WALLET SEPARATION SSOT v1 (Web)
Freeze date: 2026-02-26 (JST)
Upstream: Desktop Pack 2026-02-01 / 00_CORE_Brand_Definition.txt (see DESKTOP_PACK_SCAN_REPORT_2026-02-26.md)

## 0) Non-negotiables
- No "おすすめ/最適/成功" language in purchase UI.
- No in-chat upsell. Selling happens on Home/LP/Shelf only.
- Safety/crisis context => hide all monetization UI (copy must not contradict this).

## 1) Wallets (strict separation)
A) Common Credits (Chat Boost)
- Applies to: AI Chat (general), Tarot quick add / care.
- Does NOT apply to: DTR chat.

B) DTR Talk Pass (DTR専用往復券)
- Applies ONLY inside the purchased DTR context (contextKey).
- Cannot be substituted by subscription daily credits or Common Credits.

## 2) Products & pricing (Web initial SKUs)
2.1 Common Credits (Chat Boost) — 30日有効
- BOOST_10: 10 credits / ¥480
- BOOST_24: 24 credits / ¥1,120
- BOOST_40: 40 credits / ¥1,880

2.2 DTR（本文）
- DTR_BASE_SOLO: 本文のみ / ¥2,400
- DTR_BASE_DUO: 本文のみ / ¥2,900
- DTR_COMPLETE: 本文 + DTR Talk Pass 8往復 / ¥3,980

2.3 DTR Talk Pass（DTR専用 / 30日有効）
- DTR_PASS_6: 6往復 / ¥980
- DTR_PASS_10: 10往復 / ¥1,480
- DTR_PASS_20: 20往復 / ¥2,480

## 3) Entitlements + balances (Web)
- entitlements: (user_id, product_id, status='active') for access grants
- stripe_events: idempotency ledger
- balances (phase-gated if not implemented yet):
  - common_credits_balance
  - dtr_talkpass_balance per contextKey
If balances are not implemented at release, UI must not claim they exist.

## 4) Stripe metadata (required)
- user_id (Clerk userId)
- product_id (SKU)
- For DTR products: context_key (CTX_CORE or CTX_SYNASTRY_<hash>)
- checkout_session_id stored; stripe_event_id stored for idempotency

## 5) Disclosure
- Before payment confirmation: show "今回の付与/消費" and expiry for BOOST/PASS.
- Legal pages must include: digital content, refund policy, minors note (as applicable).
