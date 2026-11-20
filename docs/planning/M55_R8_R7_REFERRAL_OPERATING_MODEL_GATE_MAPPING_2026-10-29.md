# M55 §8 Operating Model vs deployed R7 referral gate — factual mapping (2026-10-29 JST)

## Question

Can R4 set a Creator profile to `ACTIVE` without completing Operating Model §8 payout-readiness chain
(`TAX_PROFILE_READY` → Stripe hosted onboarding → `PROVIDER_PAYOUT_READINESS_GREEN` → identity dedup →
`FINAL_CREATOR_APPROVAL` → `REFERRAL_URL_ACTIVE`)?

## Observed repo facts (not Production operator logs)

| Step | Mechanism | §8 readiness enforced? |
|------|-----------|------------------------|
| Final approval | `m55_creator_approve_application_v1` creates `m55_creator_profiles` with **`APPROVED_PENDING_ACTIVATION` only** (`20260914000000_m55_creator_distribution_foundation_v1.sql`) | No Stripe/tax gate at approval |
| `ACTIVE` profile | No automated RPC in shipped migrations transitions profile to `ACTIVE`; tests/ops use direct `m55_creator_profiles.status` updates | **Yes — R4 can reach `ACTIVE` without any R8-A table** |
| Referral issue (R7) | `m55_r7_creator_referral_issue_or_get_v1` requires `p.status = 'ACTIVE'` + open R5 compliance clearance only (`20261008000000_m55_r7_creator_dashboard_v1.sql`) | **No provider payout-readiness check** |
| R8-A onboarding plane | Owner APIs require `ACTIVE` + tax profile + compliance; Stripe adapter fail-closed unless test-mode explicitly enabled | Separate from referral RPC |

## Conclusion

**YES — today’s deployed semantics allow referral capability at `ACTIVE` + compliance without §8 Stripe/tax readiness.**
This is a **release safety tension** between Operating Model §8 narrative and R7 runtime, not a hypothetical gap.

R8-A **does not** change R7 referral RPC semantics (no Human authorization in this patch).

## Minimal coordinated fix (proposal only — not implemented here)

Shared server-side gate reused by referral issue/rotate and Creator context:

1. **`lib/m55/creatorProvider/referralOperatingModelGate.ts`** (new) — `async function isOperatingModelReferralGateMetV1(economicIdentityId): Promise<boolean>` reading R8 tax + provider snapshot tables (fail-closed false if migration not applied).
2. **`lib/m55/creatorDashboard/creatorContext.ts`** — set `referralIssuePermitted` = existing R7 check **AND** gate (or expose separate flags; UI already distinguishes deployed R7 vs §8).
3. **`supabase/migrations/<next>_m55_r8_referral_gate_v1.sql`** — add matching checks inside `m55_r7_creator_referral_issue_or_get_v1` / rotate RPCs (authoritative for cross-tenant/idempotency).
4. **Tests** — extend `creatorDashboardSurface.test.ts`, `r5PurchaseLockRpcContract.test.ts` (referral RPC preconditions), R8 readiness tests.

**Compatibility impact:** ACTIVE Creators without completed Stripe onboarding would **lose new referral URL issue** until onboarding green; existing links/history unchanged until rotate policy defined.

## UI honesty (implemented in R8-A portal)

Portal readiness panel states that referral may be available under deployed R7 rules while §8 payout-readiness and settlement remain incomplete.

## Non-claims

- Not authorization to auto-activate Creators.
- Not `M55_CREATOR_REVENUE_READY` or Stripe onboarding GREEN.
