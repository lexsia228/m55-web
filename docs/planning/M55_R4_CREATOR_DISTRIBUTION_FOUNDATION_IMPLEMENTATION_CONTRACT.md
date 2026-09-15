# M55 R4 Creator Distribution Foundation — Implementation Contract

Status: Human-approved local implementation contract. This document records the accepted R4 boundary so later AI, Codex, or Grok sessions do not redesign or re-audit it absent a real dependency invalidator. It does not advance global SSOT and does not authorize deployment.

## Frozen architecture and operating model

- `WEB_FIRST / SAME_ORIGIN / ROLE_AWARE_CREATOR_PORTAL`: general users and Creators use the same M55 web application, identity, and backend. No separate native Creator app is created in R4.
- Recruitment is `PUBLIC_APPLICATION + M55_SCOUT`. A scout invitation routes into the same application process and never implies approval.
- Admission is Human review with structured evidence. Follower count alone can never approve an application; actual media activity, engagement evidence, content quality, disclosure readiness, and brand safety are considered.
- Final approval requires explicit Human `PASS` ratings on `ACTIVITY_CONTINUITY`, `CREATOR_TRACK_RECORD`, `ENGAGEMENT_QUALITY`, `AUDIENCE_AUTHENTICITY`, `CONTENT_FIT`, and `DISCLOSURE_READINESS`. `CONCERN` or `FAIL` on any dimension blocks approval. The six ratings are retained in the append-only approval event; there is no follower minimum, numerical score, or automated admission decision.
- Primary optimization is time to revenue without weakening terms, identity, or review controls.

## Accepted benchmark corrections

1. At least one primary public promotional media property must be manually verified before approval. R4 supports `DM_CHALLENGE`, `BIO_CHALLENGE`, `EXISTING_SCOUT_THREAD`, and `MANUAL_OTHER`; it adds no social API automation.
2. `/internal/creator-review` is the fail-closed, reviewer-only operating queue. Decisions and media verification append auditable review events.
3. The application lifecycle is `SUBMITTED`, `UNDER_REVIEW`, `NEED_MORE_INFO`, `TERMS_REACCEPT_REQUIRED`, `APPROVED_PENDING_ACTIVATION`, `REJECTED`, or `BLOCKED`. Ordinary rejection has a deterministic 30-day cooldown; blocked applicants need operator action.
4. Acceptance pins Creator Affiliate Terms version `2026-09-13-v1` and timestamp. Approval fails closed to `TERMS_REACCEPT_REQUIRED` if the version is stale.
5. Scout tokens are random, hashed before persistence, expire after 14 days, are revocable and single-use. Application source and optional source campaign remain durable.
6. Approval atomically creates one stable Creator profile with a durable `economic_identity_id`, `creator_code`, and immutable founding timestamp `first_final_approved_at`. R4 creates only `APPROVED_PENDING_ACTIVATION` while representing later `ACTIVE`, `SUSPENDED`, and `REVOKED` enforcement states.

## R4 state and surface contract

Public surfaces are `/creator`, `/creator/apply`, `/creator/portal`, and `/creator/invite/[token]`. The authenticated portal shows application status and next action before approval. After approval it shows the Creator code, first final approval time, accepted terms version, activation status, and support route. It expressly states that referral tracking and commission reporting are not active.

Both token-bearing invite/application pages declare a `no-referrer` document policy so navigation does not disclose the bearer invite URL through a same-origin `Referer` header.

Internal reviewer actions are authorized by authenticated Clerk identity plus the server-only comma-separated `M55_CREATOR_REVIEWER_USER_IDS` allowlist. Missing, empty, or unmatched configuration denies access. Production configuration of that variable and application of the migration are deployment work, not completed by this local gate.

## Explicit stage boundary

- R4 owns Creator identity, application/review, terms evidence, media-control verification, scout invitation lifecycle, and distribution readiness.
- R5 owns live referral attribution, cookies/touch selection, conversion tracking, ongoing compliance monitoring, and correction/appeal machinery.
- R6 owns commission calculation and ledger.
- R7 owns the full Creator Dashboard and earnings reporting.
- R8 owns payout/provider selection, onboarding, KYC/tax collection, bank details, and payout execution.

R4 therefore includes no live attribution, affiliate URL, conversion tracking, commission or earnings values, ledger, full Creator Dashboard, Stripe Connect/provider integration, payout, bank collection, tax/KYC workflow, automated fraud engine, periodic social rescan, production database apply, environment mutation, or deployment.
