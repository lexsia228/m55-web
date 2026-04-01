# PROJECT B SSOT FREEZE (Web-first) — v3
Freeze date: 2026-02-26 JST

## Authority
1. **M55_MONETIZATION_SSOT_FULL_FREEZE_v1_0.md** is the top-level, authoritative monetization SSOT.
2. This Project B pack defines **Web-only implementation addenda** that must not contradict the top-level SSOT.
3. Any monetization / entitlement behavior not explicitly defined is **forbidden** (no speculation).

## Objective (Web)
Ship a Web release that is:
- Monetizable (Stripe), audit-safe, SSOT-compliant
- Minimal legal disclosure pages reachable publicly
- Defense-in-Depth for purchase intent, webhook idempotency, entitlement grants
- Ready to later merge into iOS SSOT without model changes

## Frame Plan (must execute in order)
Frame 1: Legal disclosure minimalization + public reachability
Frame 2: Test E2E payment loop (Stripe Test) + evidence
Frame 3: Stripe Live activation submission (business info + payout) + evidence
Frame 4: Live key switch + Live E2E smoke

## Non-negotiables
- Entitlement grant is **Webhook-only** (client never grants).
- No upsell / no "おすすめ/最適/成功" language.
- No ranking, no scores, no % gauges.
- Legal: use "請求があった場合、遅滞なく開示します" for address/phone if not publicly disclosed.
