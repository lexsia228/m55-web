# Phase 5-6H-5Z-I-V-AS-B3 — Automated notification implementation planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B3** |
| **Title** | **Automated notification implementation planning** |
| **Classification** | **Category 1 / automated notification implementation planning / docs-only / no-mutation** |
| **Verdict** | **`AUTOMATED_NOTIFICATION_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-B3-AUTOMATED-NOTIFICATION-IMPLEMENTATION-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Environment safe label** | **`m55-soul-core`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Production deployed SHA** | **`4efd4af`**（unchanged by this gate） |

**Methods:** Read-only repo review + **AS-B2** channel decisions concreteized for **AS-B4**.** **No** code, env, deploy, or notification send.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B2** | **`AUTOMATED_NOTIFICATION_CHANNEL_SELECTION_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-B2-AUTOMATED-NOTIFICATION-CHANNEL-SELECTION-PLAN-001`** | **`99f74c2`** |
| **AS-B1-MONITOR** | **`POST_DEPLOY_OPERATIONAL_COUNTS_ONLY_MONITOR_GREEN_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-B1-MONITOR-POST-DEPLOY-OPERATIONAL-COUNTS-ONLY-RESULT-001`** | **`4e15490`** |
| **AS-B1-D4** | **`HISTORICAL_FAILED_FULFILLMENT_CLOSURE_MONITORING_POLICY_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260520-5Z-I-V-AS-B1-D4-…-001`** | — |

**AS-B3 does not implement notification.** Planning only for **AS-B4+**.

---

## C. Implementation objective for future AS-B4

| Objective | Detail |
|-----------|--------|
| **Minimal Slack helper** | Single module **`notifyM55Ops(event)`** — native `fetch` only（**no** new npm deps per **`package.json`** review） |
| **One env var** | **`M55_OPS_SLACK_WEBHOOK_URL`** — Production Vercel only when **AS-B4-E** completes |
| **Safe payloads only** | Schema §E；reject/redact prohibited fields |
| **No raw IDs / secrets** | Never pass Stripe IDs, `user_id`, email, session, raw metadata into Slack body |
| **No DB writes** | Helper is **read/send only**；no migration |
| **No success-path noise** | Do **not** notify on fulfilled checkout, successful consult/reply, or **200** skip paths |
| **Manual fallback preserved** | **AS-B1-MONITOR** remains authoritative when env missing or notify fails |

---

## D. Proposed files for AS-B4（plan only — do not create in AS-B3）

| Path | Role |
|------|------|
| **`lib/m55/ops/m55OpsNotify.ts`** | Types, payload validator, `notifyM55Ops`, Slack POST, result enum |
| **`lib/m55/ops/m55OpsNotify.selfcheck.mjs`** | Static cases（pattern: `m55AiOutputSanitizer.selfcheck.mjs`） |
| **`app/api/stripe/webhook/route.ts`** | Optional **post-`insertFailedFulfillment`** hook（SEV-1/2 only） |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts`** | Optional hook on **`dtr_report_snapshots skipped`** log path（SEV-1, no IDs in payload） |
| **Docs** | Implementation result SSOT only when **AS-B4** / **B5** / **B6** execute |

**Not in v1 file list:** cron route, Supabase poll worker, Discord dual channel, email module.

---

## E. Notification payload schema

### Allowed fields（TypeScript `M55OpsNotifyEvent`）

| Field | Type | Required | Example |
|-------|------|----------|---------|
| **`phase`** | string | yes | `5Z-I-V-AS-B4` |
| **`environmentSafeLabel`** | string | yes | `m55-soul-core` |
| **`severity`** | `'SEV-1' \| 'SEV-2' \| 'SEV-3' \| 'SEV-4'` | yes | `SEV-1` |
| **`triggerCategory`** | string（enum registry） | yes | `failed_fulfillments_24h_gt_0` |
| **`countsOnlySummary`** | string | yes | `failed_total=7 delta_24h=1 categories=internal_processing_failed:1` |
| **`nextRecommendedGate`** | string | yes | `AS-B1-MONITOR` / `investigation` |
| **`timestampSafeLabel`** | string（ISO UTC） | yes | `2026-05-20T09:00:00Z` |
| **`sourceSafeLabel`** | string | yes | `stripe-webhook` / `fulfill-dtr-core` / `ops-monitor` |
| **`dedupeSafeKey`** | string | optional | `webhook:internal_processing_failed:2026-05-20` — **no** raw IDs |

**Slack body format（v1）:** Single text block — labeled lines only（no attachments with metadata）.

### Prohibited fields（reject at validator — do not stringify into Slack）

| Forbidden | Notes |
|-----------|--------|
| **`user_id`** | PII |
| **`email`** | PII |
| **`session`** / session token | Secret / PII |
| **`checkout_session_id`** | Payment trace |
| **`payment_intent`** | Payment trace |
| **Stripe event ID** | Payment trace |
| **raw DB row** | Leak |
| **raw `metadata` JSON** | May embed IDs |
| **`webhook secret`** / API key / token | Credential |
| **Stack traces** containing env values | Secret bleed |

**Validator rule:** If any prohibited key appears in input object (including nested), return **`skipped:unsafe_payload`** without network call.

---

## F. Future helper behavior（`notifyM55Ops`）

```text
notifyM55Ops(event: M55OpsNotifyEvent): Promise<M55OpsNotifyResult>

M55OpsNotifyResult = 'sent' | 'skipped' | 'disabled' | 'failed'
```

| Behavior | Spec |
|----------|------|
| **Env missing** | Return **`disabled`**；log **`[m55OpsNotify] disabled=missing_env`**（no URL, no secret length in prod logs beyond optional `configured=no`） |
| **Unsafe payload** | Return **`skipped`** before fetch |
| **Dedupe（optional v1）** | In-memory per-instance cooldown **5 min** per `dedupeSafeKey`（serverless: best-effort only；not durable） |
| **HTTP** | `POST` Slack Incoming Webhook JSON `{ "text": "..." }` |
| **Timeout** | **3000 ms** abort |
| **Throws** | **Never** throw to caller by default — wrap in try/catch → **`failed`** |
| **Payment path** | Call **after** `insertFailedFulfillment` / fulfillment decision — notify failure must **not** change HTTP status to Stripe |
| **DB** | **No** Supabase calls inside helper |
| **Env mutation** | **None** |
| **Network** | Slack webhook only（AS-B4+） |

**Feature flag（AS-B4):** `M55_OPS_NOTIFY_ENABLED=1` optional second guard — default **off** until **AS-B6** if env exists but send not yet authorized.

---

## G. Trigger insertion plan

| # | Trigger | Source（repo） | Severity | Safe `countsOnlySummary` | AS-B4 | Mutation risk | Stop condition |
|---|---------|----------------|----------|--------------------------|-------|---------------|----------------|
| **1** | **`failed_fulfillments_24h > 0`** | Human **AS-B1-MONITOR** poll or future cron | **SEV-1** | `delta_24h=N total=T` | **Defer** to **AS-B7** or manual wrapper script | **None** in webhook | 24h returns **0** |
| **2** | **Webhook fulfillment hard fail** | `handleCheckoutCompletedOneTime` L394–399 → **`internal_processing_failed`** | **SEV-1** | `trigger=internal_processing_failed reason=<enum>` | **yes** — post-insert | **Low** — fire-and-forget | Fulfillment succeeds |
| **3** | **`missing_client_reference_id`** | L238–239 | **SEV-2** | `trigger=missing_client_reference_id` | **yes** — only if **new** vs baseline（dedupe day bucket） | **Low** | Category stable at historical **1** |
| **4** | **Snapshot skip log-only** | `dtrCoreCheckoutFulfillment.ts` L147–161 **`dtr_report_snapshots skipped`** | **SEV-1** | `trigger=snapshot_skip reason=<snap.reason enum>` | **yes** — no session/user in payload | **Low** | Snapshot upsert succeeds |
| **5** | **Wallet / ledger gap** | AS-B1 artifact SQL（not in app today） | **SEV-2** | `wallets=W ledgers=L gap=G` | **Defer** — needs monitor module | **None** v1 | Gap **0** |
| **6** | **AS-B1-MONITOR RED** | Human SSOT gate result | **SEV-1–2** | `monitor=RED checks=...` | **Defer** — manual Human posts or future admin script | **None** | Monitor **GREEN** |
| **7** | **Paid-not-unlocked** | Support + counts corroboration | **SEV-1** | `signal=paid_not_unlocked` | **Defer** v1 — Human-initiated | **None** | User unlocked |
| **8** | **Webhook test failure** | Deploy/test gate logs | **SEV-2** | `trigger=webhook_test_fail` | **Defer** | **None** | Test **GREEN** |
| **9** | **Deploy failure** | Vercel deploy gate | **SEV-2** | `trigger=deploy_not_ready` | **Defer** — use Vercel email first | **None** | Deploy **Ready** |
| **10** | **`fulfill_*` soft reasons** | L385–391（200 response） | **SEV-2** | `trigger=fulfill_user_mismatch` etc. | **optional** v1.1 — noisy | **Low** | Rate limit via dedupe |

**v1 AS-B4 wiring（minimal):** **#2, #3, #4** only.** **#1, #5–9** remain **AS-B1-MONITOR** or later gates.

**Critical:** Existing `console.error` lines include `event_id`, `checkout_session_id`, `user_id` — **do not** copy those log args into `notifyM55Ops`. Notify uses **enum labels only**.

---

## H. Recommended AS-B4 v1 implementation scope

| In scope | Out of scope |
|----------|--------------|
| **`m55OpsNotify.ts`** + **`.selfcheck.mjs`** | Discord, email, LINE |
| Payload validator + Slack POST | Production env add（→ **AS-B4-E**） |
| Webhook hooks **#2–#4** behind **`M55_OPS_NOTIFY_ENABLED`** | Live Slack send in **AS-B4** without **AS-B5/B6** GO |
| **`disabled` when env missing** | DB migration / cron / Supabase poll worker |
| Typecheck + selfcheck in CI/local | Deploy to Production |
| Integration **compiled but no send** unless env **and** flag **and** verification GO | consult/reply safety alerts |

**AS-B4 default posture:** Code merged to **`work/home-cluster`** first；**no Production notification** until **AS-B4-E** + **AS-B5** + **AS-B6** sequence.

---

## I. Env / secret handling plan

| Rule | Detail |
|------|--------|
| **Secret class** | Slack Incoming Webhook URL = **full secret** |
| **SSOT** | **Never** paste URL, token, or length+prefix into SSOT or chat |
| **Human only** | Vercel Production env UI — **AS-B4-E** gate |
| **Env name** | **`M55_OPS_SLACK_WEBHOOK_URL`** only（v1） |
| **Optional flag** | **`M55_OPS_NOTIFY_ENABLED=1`** — separate from URL presence |
| **Preview / local** | May use **dedicated test channel** URL in **local `.env.local` only** — never commit |
| **AI constraint** | Human rotates webhook in Slack admin if leaked — SSOT records **`webhook_rotated_safe_label`** only |

### AS-B4-E（separate gate — not AS-B3 or AS-B4 code alone）

| Step | Owner |
|------|-------|
| Create Slack Incoming Webhook in private ops channel | **Human** |
| Add **`M55_OPS_SLACK_WEBHOOK_URL`** to Vercel Production | **Human** |
| Set **`M55_OPS_NOTIFY_ENABLED=0`** until **AS-B6** | **Human** |
| Record **AS-B4-E** SSOT（env configured yes/no only） | **Agent Category 1** |

Until **AS-B4-E:** helper returns **`disabled`** everywhere.

---

## J. Local test plan（AS-B4 / AS-B5）

| # | Test | Expected |
|---|------|----------|
| **J1** | Payload with allowed fields only | **`sent`** when mock fetch OK |
| **J2** | Payload with `user_id` / email / `checkout_session_id` | **`skipped`** — no fetch |
| **J3** | Missing `M55_OPS_SLACK_WEBHOOK_URL` | **`disabled`** |
| **J4** | Mock fetch timeout / 500 | **`failed`** — caller still returns 200/500 per business logic |
| **J5** | Caller throws simulation | Webhook handler still returns Stripe-correct status |
| **J6** | Severity mapping table | SEV-1 triggers use urgent prefix in Slack text |
| **J7** | Selfcheck stdout | No secret strings；**PASS/FAIL** counts |
| **J8** | `npm run typecheck` | **PASS** with new files |
| **J9** | Dedupe same `dedupeSafeKey` within 5 min | Second call **`skipped`** |

**AS-B5 gate:** Execute **J1–J9** with mock only — **no** Production POST.

**AS-B6 gate:** One intentional test message to ops channel with **safe fixture payload** — then disable or confirm receipt.

---

## K. Rollback / disable plan

| Scenario | Action |
|----------|--------|
| **Disable notifications** | Unset **`M55_OPS_NOTIFY_ENABLED`** or remove **`M55_OPS_SLACK_WEBHOOK_URL`** in Vercel |
| **Revert code** | Single revert commit removing hooks + `lib/m55/ops/*` |
| **DB** | **No migration** — **no DB rollback** |
| **Noisy alerts** | Tighten trigger list；extend dedupe window |
| **Webhook URL leak** | Rotate in Slack UI；update Vercel env；record **AS-B4-E-R** safe label only |
| **Stripe impact** | If notify ever blocked webhook（must not）, revert hooks first |

---

## L. Future gate split

| Gate | Title | Category |
|------|-------|----------|
| **AS-B4** | Automated notification **implementation execution** | **2** — code；**Human GO** required |
| **AS-B4-E** | Slack webhook env addition / **Human checkpoint** | **1** doc + Human env |
| **AS-B5** | Notification static/local verification | **2** mock-only |
| **AS-B6** | Notification production-safe verification | **1/2** — one safe test send |
| **AS-B7** | Post-notification monitor policy update | **1** — cadence + **T1** automation decision |
| **AS-B1-MONITOR** | Permanent manual fallback | **1** ongoing |

**Order:** **AS-B3** → **AS-B4**（code）→ **AS-B5** → **AS-B4-E** → **AS-B6** → **AS-B7**  
（**AS-B4-E** may parallel **AS-B5** if env added to Preview only first）

---

## M. Decision boundaries

| Boundary | Status |
|----------|--------|
| **AS-B3 authorizes AS-B4?** | **no** — explicit **Human GO for code change** required |
| **Env addition** | **AS-B4-E** separate **Human GO** |
| **Deploy** | Separate **Human GO**（not bundled with B4） |
| **AS-B1-MONITOR** | **Remains fallback** — automation supplements, does not replace |
| **AS-B1-REPAIR** | **Closed** — notify does not imply repair |
| **TL-FIX / CONTROL-113** | **Separate** — no type-label work in ops notify track |
| **Payment / Stripe** | B4 hooks observe failures only — **no** webhook replay, **no** live payment test in notify gates |

---

## N. No-mutation statement

- **No** code change
- **No** notification implementation
- **No** Slack / Discord webhook creation
- **No** env / secret addition
- **No** deploy / redeploy
- **No** Production DB connection / SQL / DB write
- **No** Stripe / checkout / payment / webhook execution
- **No** Clerk / auth change
- **No** repair / repair runner
- **No** AX-PROD / AL / AL-PRE
- **No** full normal dev flow release
- **No** raw key / secret / user_id / email / session / Stripe ID in this doc
- **No** push to **`main`**

---

## O. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AS-B4`** — implementation execution — **only with explicit Human GO for code** |
| **2** | **`AS-B1-MONITOR`** — continue before paid-test / traffic |
| **3** | **`TL-FIX` planning** — if Human prioritizes CONTROL-113 |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-B3-AUTOMATED-NOTIFICATION-IMPLEMENTATION-PLAN-001`** | **本条** |
