# Phase 5-6H-5Z-I-V-ENGINE-IMPL-B5 — Profile + checkout metadata（2026-05-21）

## Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-B5** |
| **Title** | **Composite astrology v2 My Page + checkout metadata / checkout block** |
| **Classification** | **Category 2 / code + local tests / no deploy / no checkout execution** |
| **Human GO** | **ENGINE-IMPL-B5 go** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_PROFILE_CHECKOUT_METADATA_GREEN_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-IMPL-B5-PROFILE-CHECKOUT-001`** |
| **Prior** | **B4-R** GREEN_NO_DEPLOY |

## Changed files

| File | Why |
|------|-----|
| `lib/soul/birthProfileV2.ts` | v2 field validation, timezone from country, draft merge |
| `lib/soul/profile.ts` | Extended `BirthProfile`; save → `extra_json` sync |
| `lib/m55/compositeStem/checkoutProfileGate.ts` | DTR checkout requires v2-complete profile |
| `lib/m55/compositeStem/stripeCheckoutMetadata.ts` | Stripe metadata v2 fields |
| `components/my/MyPanel.tsx` | My Page intake: time / unknown / country / birthplace |
| `components/PurchaseButton.tsx` | Client gate + full profile payload + `/my` redirect |
| `app/api/purchase/checkout/route.ts` | Server gate 400 + v2 metadata (no session in tests) |
| `lib/m55/compositeStem/profileCheckout.test.ts` | B5 scenarios + GX-01 |

## My Page input

| Field | Rule |
|-------|------|
| `birthTime` | Optional (`type="time"`) |
| `birthTimeUnknown` | Required when time empty — checkbox「出生時刻は不明」 |
| `country` | Required; select default **日本 (JP)** |
| `birthplace` | Optional text |
| `timezone` | Derived on save via country or explicit |
| Legacy display | **プロフィール：旧形式** when nickname+date only |

## Profile storage

| Store | Fields in `extra_json` |
|-------|------------------------|
| `localStorage` `m55_profile_{userId}` | Full `BirthProfile` v2 |
| `dtr_guest_drafts.extra_json` | `birthTime`, `birthTimeUnknown`, `country`, `birthplace`, `timezone`, `profileFormat` |
| Excluded | email, userId, secrets |

## Checkout metadata (Stripe session, when gate passes)

| Key | Notes |
|-----|--------|
| `profileBirthDate` / `profileNickname` | Existing |
| `profileBirthTime` | If known |
| `profileBirthTimeUnknown` | `true` \| `false` |
| `profileCountry` / `profileBirthplace` / `profileTimezone` | v2 |
| `inputVersion` | `composite-input-v1` |
| `engineVersionCandidate` | `m55-composite-stem-v2` |
| `calculationMode` | `full` \| `unknown_time_noon` |

## Checkout block

| Layer | Behavior |
|-------|----------|
| `DTR_CORE_STATIC_V1` | `validateDtrCheckoutProfile` → **400** `composite_profile_incomplete` + `redirectMy: /my` |
| `PurchaseButton` | Pre-fetch block; link to **マイページ** |
| This gate | **No** `stripe.checkout.sessions.create` in tests; no live checkout |

## Tests（local）

```text
npx tsx --test lib/m55/compositeStem/pipeline.golden.test.ts lib/m55/compositeStem/fulfillmentWrite.test.ts lib/m55/compositeStem/profileCheckout.test.ts → 21/21 pass
npx tsc --noEmit → exit 0
```

**GX-01:** unchanged — stem **9** / **癸**.

## No-mutation

- No deploy / redeploy / env change
- No checkout / payment / webhook replay
- No Production DB write / SQL
- No snapshot UPDATE/DELETE
- Fulfillment flag remains **default off** (B4)

## Next

- **ENGINE-IMPL-B5-R** — result recording (docs-only)
- **ENGINE-IMPL-B6** — stored envelope route implementation
