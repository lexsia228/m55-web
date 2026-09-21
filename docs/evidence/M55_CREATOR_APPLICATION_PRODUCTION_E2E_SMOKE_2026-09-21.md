# M55 Creator Application Production E2E Smoke — 2026-09-21

## A. Gate summary

CI preflight profile for this SSOT-touching docs change: `FULL_REPO_PREFLIGHT`.

| Field | Value |
|---|---|
| Gate | `M55-CREATOR-APPLICATION-PRODUCTION-E2E-SMOKE` |
| Date | 2026-09-21 JST |
| Production source commit | `e898f2969649077175a9c8bcba499c545bd74cd6` |
| Vercel deployment | `dpl_CsooHq5jFvpLxnyLZMPKhA2MY86D` |
| Vercel state | `READY` / production |
| Supabase identity | `m55-soul / m55-soul-core / main / PRODUCTION` |
| Test type | Human Production E2E + read-only Production SQL preflight/diagnostic |
| Verdict | **CLOSED GREEN — BOUNDED APPLICATION/REVIEW/REJECT FLOW, WITH UX FINDINGS** |
| Cash activation | **NOT TESTED / NOT AUTHORIZED** |
| Approval activation | **NOT TESTED / INTENTIONALLY AVOIDED** |

This gate proves the bounded public Creator application intake and Human review state flow. It does **not** prove the full Creator Affiliate revenue system.

## B. Scope proved GREEN

Production Human E2E proved:

```text
/creator
→ /creator/apply
→ authenticated application submit
→ SUBMITTED
→ /creator/portal reflects submitted
→ /internal/creator-review receives same application
→ START_REVIEW
→ UNDER_REVIEW
→ applicant portal reflects 審査中
→ NEED_MORE_INFO
→ applicant portal reflects 追加情報が必要です
→ MEDIA_CHALLENGE issued
→ UNDER_REVIEW resumed
→ applicant portal reflects media verification action required
→ MEDIA_VERIFIED
→ applicant portal removes media-verification action-required message
→ REJECT
→ REJECTED
→ review queue count returns to 0
→ applicant portal reflects rejection and reapply date
```

Test application was a dedicated Production E2E smoke application, not a real Creator candidate.

No Creator profile was created. No application was approved. No affiliate URL was activated. No attribution, commission, Stripe onboarding, payout, or cash movement occurred.

## C. Production route / deployment preflight

Fresh Production observations:

- `/creator` → HTTP 200
- `/creator/apply` → HTTP 200
- `/creator/portal` → HTTP 200
- Vercel production deployment `dpl_CsooHq5jFvpLxnyLZMPKhA2MY86D`
- Git commit `e898f2969649077175a9c8bcba499c545bd74cd6`
- deployment state `READY`

Unauthenticated `/creator/apply` correctly required M55 account login before application entry.

## D. Production DB object existence preflight — READ ONLY

Exactly this read-only SQL was executed once in Production before Human mutation:

```sql
WITH required_objects(kind, object_name, object_oid) AS (
  VALUES
    (
      'table',
      'public.m55_creator_invites',
      to_regclass('public.m55_creator_invites')::oid
    ),
    (
      'table',
      'public.m55_creator_applications',
      to_regclass('public.m55_creator_applications')::oid
    ),
    (
      'table',
      'public.m55_creator_application_media',
      to_regclass('public.m55_creator_application_media')::oid
    ),
    (
      'table',
      'public.m55_creator_review_events',
      to_regclass('public.m55_creator_review_events')::oid
    ),
    (
      'table',
      'public.m55_creator_profiles',
      to_regclass('public.m55_creator_profiles')::oid
    ),
    (
      'function',
      'public.m55_creator_submit_application_v1(text,text,text,text,boolean,boolean,text,text,text,text,text,bigint,bigint)',
      to_regprocedure(
        'public.m55_creator_submit_application_v1(text,text,text,text,boolean,boolean,text,text,text,text,text,bigint,bigint)'
      )::oid
    ),
    (
      'function',
      'public.m55_creator_approve_application_v1(uuid,text,text,text,text,text,text,text,text,text,text)',
      to_regprocedure(
        'public.m55_creator_approve_application_v1(uuid,text,text,text,text,text,text,text,text,text,text)'
      )::oid
    ),
    (
      'function',
      'public.m55_creator_review_action_v1(uuid,text,text,text,text,uuid,text,text)',
      to_regprocedure(
        'public.m55_creator_review_action_v1(uuid,text,text,text,text,uuid,text,text)'
      )::oid
    ),
    (
      'function',
      'public.m55_creator_reaccept_terms_v1(uuid,text,text)',
      to_regprocedure(
        'public.m55_creator_reaccept_terms_v1(uuid,text,text)'
      )::oid
    )
)
SELECT
  kind,
  object_name,
  object_oid IS NOT NULL AS exists_in_production
FROM required_objects
ORDER BY kind, object_name;
```

Result: **9 / 9 required objects = `true`**.

Confirmed functions:

- `m55_creator_approve_application_v1(...)`
- `m55_creator_reaccept_terms_v1(...)`
- `m55_creator_review_action_v1(...)`
- `m55_creator_submit_application_v1(...)`

Confirmed tables:

- `m55_creator_application_media`
- `m55_creator_applications`
- `m55_creator_invites`
- `m55_creator_profiles`
- `m55_creator_review_events`

## E. Human application submit evidence

Application submit succeeded immediately after pressing the application button.

Observed applicant UI:

- `申請を受け付けました`
- portal link available
- `申請受付済み`
- application date `2026/9/21`
- affiliate URL not displayed
- attribution / commission report / payout features explicitly inactive

The application form had no intermediate confirmation page. Pressing the submit button directly created the Production application.

## F. Human review queue evidence

Internal reviewer route received exactly one application.

Observed:

- source = `PUBLIC_APPLICATION`
- initial status = `SUBMITTED`
- test content and promotion-experience text matched submitted values
- primary media existed
- media status initially `PENDING`
- Human evidence = `0 / 6 PASS`
- approval button remained non-approvable without required evidence
- queue count = 1

The review card's top identity block showed generic `Creator application`, application UUID and submitted time, but did not show a human-friendly applicant identity at card header level.

## G. State transition evidence

### G1. START_REVIEW

Human action:

```text
SUBMITTED → UNDER_REVIEW
reason_code = OTHER
internal note = Production E2E smoke test: START_REVIEW transition verification.
```

Result: GREEN.

Applicant portal reflected:

- `審査中`
- `審査結果をお待ちください。`

### G2. NEED_MORE_INFO

Human action:

```text
UNDER_REVIEW → NEED_MORE_INFO
reason_code = NEED_MORE_INFO
internal note = Production E2E smoke test: NEED_MORE_INFO transition verification.
```

Result: GREEN.

Applicant portal reflected:

- `追加情報が必要です`
- `サポートに連絡してください。`

The internal note / exact requested additional information was **not** exposed to the applicant.

### G3. MEDIA_CHALLENGE

First Human MEDIA_CHALLENGE attempt returned the generic UI error:

```text
Error: 審査操作は適用されませんでした。
```

Read-only Vercel runtime evidence showed that attempt as:

```text
POST /api/internal/creator-review/<application-id> → 404
source = edge-middleware
```

The request did not reach the application route handler / DB mutation path.

After page reload, one bounded retry succeeded. A one-time challenge value was displayed to the Human reviewer.

**The raw challenge value is intentionally not recorded in this evidence document.**

This establishes:

```text
MEDIA_CHALLENGE = FUNCTIONALLY GREEN AFTER ONE RELOAD/RETRY
TRANSIENT_EDGE_404_OBSERVED = TRUE
```

This transient 404 remains a runtime/observability finding and must not be rewritten as “never happened”.

### G4. media action visibility

While application state remained `NEED_MORE_INFO`, applicant portal showed only the generic additional-information/support path. The media action-required instruction was hidden by status precedence.

Human then moved:

```text
NEED_MORE_INFO → UNDER_REVIEW
reason_code = OTHER
internal note = Production E2E smoke test: resume UNDER_REVIEW to verify media action visibility.
```

Applicant portal then correctly showed:

```text
運営確認が必要です。
M55から届いた確認案内に従ってください。
```

### G5. MEDIA_VERIFIED

Human marked the primary media verified.

Observed applicant result after refresh:

- application remained `UNDER_REVIEW`
- portal remained `審査中`
- media verification action-required message disappeared
- normal `審査結果をお待ちください。` message returned

Result: GREEN.

### G6. REJECT / cleanup

The test application was intentionally closed without approval:

```text
UNDER_REVIEW → REJECTED
reason_code = OTHER
internal note = Production E2E smoke test completed successfully. Test application closed without approval.
```

Observed:

- internal queue count returned to **0**
- applicant portal displayed `今回は承認されませんでした`
- reapply date displayed as `2026/10/21`
- no Creator profile / affiliate activation was created

Result: GREEN.

## H. MEDIA_CHALLENGE failure diagnostic — READ ONLY

After the first failed MEDIA_CHALLENGE, exactly this read-only SQL was executed:

```sql
WITH target_application AS (
  SELECT
    id,
    status,
    clerk_user_id,
    application_source,
    submitted_at
  FROM public.m55_creator_applications
  WHERE id = '74257e8e-d510-4d74-b01b-ad98fd26f260'::uuid
),
target_media AS (
  SELECT
    id,
    application_id,
    platform,
    canonical_url,
    handle,
    is_primary,
    control_verification_method,
    control_verification_status,
    challenge_hash,
    verified_at,
    created_at,
    updated_at
  FROM public.m55_creator_application_media
  WHERE application_id = '74257e8e-d510-4d74-b01b-ad98fd26f260'::uuid
)
SELECT
  'APPLICATION' AS record_type,
  a.id::text AS record_id,
  a.status AS state,
  a.application_source AS detail_1,
  NULL::text AS detail_2,
  NULL::text AS detail_3
FROM target_application a

UNION ALL

SELECT
  'MEDIA' AS record_type,
  m.id::text AS record_id,
  m.control_verification_status AS state,
  m.platform AS detail_1,
  COALESCE(m.control_verification_method, 'NULL') AS detail_2,
  CASE
    WHEN m.challenge_hash IS NULL THEN 'NO_CHALLENGE_HASH'
    ELSE 'CHALLENGE_HASH_PRESENT'
  END AS detail_3
FROM target_media m

UNION ALL

SELECT
  'FUNCTION' AS record_type,
  p.oid::regprocedure::text AS record_id,
  'EXISTS' AS state,
  pg_get_function_identity_arguments(p.oid) AS detail_1,
  NULL::text AS detail_2,
  NULL::text AS detail_3
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'm55_creator_review_action_v1';
```

Result after the failed attempt:

```text
APPLICATION = NEED_MORE_INFO
MEDIA = PENDING
control_verification_method = NULL
challenge_hash = NO_CHALLENGE_HASH
FUNCTION = EXISTS
```

Conclusion: failed first attempt was fail-closed with **no partial media mutation**.

## I. Production review function definition export — READ ONLY

Exact query:

```sql
SELECT
  pg_get_functiondef(
    'public.m55_creator_review_action_v1(uuid,text,text,text,text,uuid,text,text)'::regprocedure
  ) AS function_definition;
```

Production definition matched the expected repository implementation for the reviewed MEDIA / START_REVIEW / NEED_MORE_INFO / REJECT state behavior.

No function patch was applied during this test.

## J. UX / operations findings

These are concrete findings from Production use, not speculative redesign.

| ID | Finding | Classification |
|---|---|---|
| UX-01 | Application submit has no confirmation/review screen; button press immediately creates Production application | remediation candidate |
| UX-02 | Review card header does not identify applicant in a Human-friendly way; generic title + UUID is weak for multiple applicants | **pre-scale remediation recommended** |
| UX-03 | Review reason code is typed into browser `window.prompt`, exposing internal enums and allowing typo-prone Human operation | **pre-scale remediation recommended** |
| UX-04 | Media verification method is typed into browser `window.prompt` rather than structured selection | **pre-scale remediation recommended** |
| UX-05 | `NEED_MORE_INFO` does not show the applicant what information is actually required; only a support link is shown | **pre-scale remediation recommended** |
| UX-06 | `NEED_MORE_INFO` status masks a simultaneously pending media-verification action until application returns to `UNDER_REVIEW` | **state-priority remediation recommended** |
| UX-07 | One MEDIA_CHALLENGE attempt was intercepted as edge-middleware 404; page reload + one retry succeeded | runtime observability / resilience finding |
| UX-08 | Rejected portal renders punctuation as `再申請可能日：2026/10/21。 再申請`; the Japanese full stop is visually unnatural | polish |
| UX-09 | Reapply link is visible before the displayed reapply date although backend cooldown remains authoritative | UX correctness / affordance finding |

Additional identity note:

- Current application form intentionally does not collect legal name.
- Applicant identity is currently anchored by authenticated M55/Clerk user + public media.
- Internal review API has `clerk_user_id`, while the review card does not surface it.
- For Human review at initial cohort scale, card header should at minimum surface primary platform + handle + canonical media URL; legal-name collection is a separate privacy/product decision and is **not** implied by this finding.

## K. Bounded test limits — NOT TESTED

This gate is **not “the entire Affiliate system is perfect.”**

The following were intentionally not tested or remain separate gates:

- `APPROVE` / `APPROVED_PENDING_ACTIVATION`
- Creator profile creation
- six-dimension all-PASS approval path
- terms reacceptance path
- `BLOCKED` path
- `MEDIA_FAILED` path
- scout invite issue / accept / revoke flow
- simultaneous multi-applicant queue behavior
- R5 attribution correctness
- commission ledger / R6
- Creator earnings dashboard / R7
- Stripe hosted onboarding / KYC / payout / R8
- affiliate cash activation
- real Creator referral / real purchase / payout

These must remain separate gated validations and must not be inferred GREEN from this smoke.

## L. No-retest / delta-only freeze

Canonical checkpoint:

```text
M55_CREATOR_APPLICATION_PRODUCTION_E2E_SMOKE_2026_09_21 =
  CLOSED_GREEN_BOUNDED_WITH_FINDINGS

PROVED_GREEN =
  PUBLIC_APPLICATION_SUBMIT
  PORTAL_SUBMITTED
  INTERNAL_QUEUE_RECEIPT
  START_REVIEW
  PORTAL_UNDER_REVIEW
  NEED_MORE_INFO
  PORTAL_NEED_MORE_INFO
  MEDIA_CHALLENGE_AFTER_SINGLE_RETRY
  MEDIA_ACTION_REQUIRED_VISIBILITY_WHEN_UNDER_REVIEW
  MEDIA_VERIFIED
  REJECTED_CLEANUP
  REVIEW_QUEUE_ZERO
  PORTAL_REJECTED

DO_NOT_RERUN_PASSED_STEPS_WITHOUT_INVALIDATOR = TRUE
```

A passed step may be reopened only if a concrete invalidator affects its dependency, including:

- relevant code change in Creator application/portal/review routes or repository/service logic;
- relevant middleware / auth-routing change;
- Creator distribution DB migration / RPC change;
- Production environment/reviewer-auth contract change;
- a new Production incident contradicting this evidence;
- an approved remediation that deliberately changes one of the tested UX/state contracts.

A future fix should run **delta-only validation** against the affected finding. Do not replay this full Production E2E merely because adjacent Creator revenue work advances.

## M. Recruitment-readiness interpretation

The bounded application/review/reject workflow is operational in Production.

However, broad Creator recruitment should treat UX-02 through UX-06 and UX-09 as a bounded Creator Operations remediation packet, especially before multiple simultaneous applicants are expected.

This evidence does not activate cash, attribution, commission, or payout capability.

## N. Privacy / secret discipline

Not recorded in this file:

- test account email
- Clerk user ID
- raw one-time media challenge value
- authentication cookies/tokens
- bank/KYC data
- secrets or API keys

The one-time media challenge was observed only to prove issuance and is intentionally omitted from durable evidence.
