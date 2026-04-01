# PRICING & WALLET SEPARATION — EXTRACT (Desktop Pack 2026-02-01)
Date extracted: 2026-02-26 JST
Source pack: M55__DESKTOP_PACK_2026-02-01
Source file: 10_FROZEN__DO_NOT_TOUCH/M55_MASTER_VAULT/00_CORE_Brand_Definition.txt (mtime: 2025-11-06 UTC)

## Purpose (Web transfer)
This document is a **single, minimal extract** for Web monetization design.
- It exists to prevent "AI drift" by removing the need to reference the large Desktop Pack.
- It defines **wallet separation** (who can spend what) and **credit semantics**.

IMPORTANT:
- This extract is **not** the sole authority for Web launch pricing. Web launch pricing is defined in the **Project B Web SSOT** (see `WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md`).
- If any price conflicts exist between older artifacts, this extract is the **only Desktop-Pack-derived source** allowed to be cited.

---

## Extracted canonical text (edited only for formatting)

### Common Credit System (Unified Count)
- AI chat: 1 round-trip = 1 credit
- Tarot quick add = 1 credit
- Care = 1 credit (additional explanation + 1 round-trip)
- Free keeps a route to grant +1 via ads.

### 6-1. Common Credits (Chat Boost)
- Naming: **"credits"** (do not use "coin/points" to avoid payment-regulation misunderstanding).
- Validity: 30 days from purchase. Non-refundable (aligned to legal disclosure).

SKU (start with 3 packs; discounts are mild)
- 10 uses: ¥480
- 24 uses: ¥1,120
- 40 uses: ¥1,880

Usage scope: **AI chat + Tarot (quick add / care)** share the same wallet.

UI: show clearly:
- "today's credits x/y"
- "Boost remaining n (with expiry)"

### 6-2. DTR (Deep Tailored Reading) — second revenue pillar
Wallet separation is explicit:
- DTR is fully separated into **(A) report text purchase** and **(B) DTR chat (dedicated pass)**.
- Subscription credits **must not** be used for DTR chat.

Two-tier lineup (sold in parallel)
- DTR Base: report text only
  - Solo: ¥2,400
  - Duo: ¥2,900
- DTR Complete: report text + DTR Talk Pass (8 round-trips) bundled
  - ¥3,980 (solo/duo same)

Remainder rule:
- Any remaining DTR Talk Pass is usable **only inside that DTR room**.

DTR Talk Pass (dedicated round-trip pass, 30 days validity)
- 6 round-trips: ¥980
- 10 round-trips: ¥1,480
- 20 round-trips: ¥2,480

Consumption:
- 1 round-trip = 1 pass (solo/duo same)

Separation rationale:
- DTR wallet is separated from common credits to avoid cannibalization and keep price independence.

Sales policy:
- Direct selling/upsell from within AI chat is prohibited. Announce via Home/featured surface.

---

## Implementation constraints for Web
- These items define **wallet semantics** and **SKU shapes**.
- Web launch may start with a reduced subset; however, if introduced later, it must follow this wallet separation model unless SSOT is explicitly revised.
