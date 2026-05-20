# Phase 5-6H-5Z-I-V-AS-B2 — Automated notification channel selection planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B2** |
| **Title** | **Automated notification channel selection planning** |
| **Classification** | **Category 1 / automated notification channel selection planning / docs-only / no-mutation** |
| **Verdict** | **`AUTOMATED_NOTIFICATION_CHANNEL_SELECTION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-B2-AUTOMATED-NOTIFICATION-CHANNEL-SELECTION-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Environment safe label** | **`m55-soul-core`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Production deployed SHA** | **`4efd4af`**（safety baseline；unchanged by this gate） |

**Methods:** Read-only repo review + prior SSOT crosswalk.** **No** notification send, **no** env, **no** deploy.

---

## B. Prior gate reference

| Phase | Verdict | Role in AS-B2 |
|-------|---------|---------------|
| **AS-B1-MONITOR** | **`POST_DEPLOY_OPERATIONAL_COUNTS_ONLY_MONITOR_GREEN_NO_MUTATION`** | Operational baseline **GREEN**；manual counts-only remains **authoritative interim** |
| **AS-B1-D4** | **`HISTORICAL_FAILED_FULFILLMENT_CLOSURE_MONITORING_POLICY_PLANNING_GREEN_NO_MUTATION`** | **`failed_fulfillments` (7)** = monitored historical；**24h = 0** expected |
| **TL-A-R** | **`TYPE_LABEL_MISMATCH_READONLY_DIAGNOSTIC_RESULT_GREEN_NO_MUTATION`** | **CONTROL-113** separate track — **not** notification scope |
| **AS-B** | **`MINIMAL_ERROR_NOTIFICATION_PLANNING_GREEN_NO_MUTATION`** | Failure sources + manual runbook — **superseded for channel choice by AS-B2 §H** |

**AS-B2 does not implement notification.** Channel choice only.

---

## C. Why this gate exists

| Driver | Detail |
|--------|--------|
| **Manual monitor GREEN** | **AS-B1-MONITOR** — no active bleeding；depends on **Human polling** cadence |
| **Paid-test / traffic risk** | Faster awareness needed when **`failed_fulfillments_24h > 0`** or post-checkout window |
| **Privacy / SSOT** | Automation must **not** ship raw IDs, emails, sessions, Stripe IDs, or secrets in payloads |
| **Env discipline** | Any webhook URL / SMTP credential requires **separate Human GO** gate — **not** AS-B2 |
| **Sequencing** | **Channel selection** must precede **AS-B3–B6** implementation chain |

**Repo signals reviewed（read-only）:**

| Path | Signal |
|------|--------|
| `app/api/stripe/webhook/route.ts` | **`insertFailedFulfillment`** on hard paths；**500** to Stripe on core failures |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | Some snapshot skips **log-only**（gap vs table trigger） |
| `lib/m55/stripe/replyTicketWebhookLane.ts` | Reply lane outcomes（table/log — dual track in AS-B） |
| `app/api/room/core/send/route.ts` | Safety block + **503** on AI failure |
| `app/api/reply/generate/route.ts` | Output sanitizer path（post-**`4efd4af`**） |
| `package.json` | **No** Slack/Discord/LINE/email SDK — automation is **greenfield** |

---

## D. Candidate channels

| # | Channel | Setup burden | Env / secret | Reliability | Mobile visibility | Noise risk | Privacy risk | Cost | Solo-operator fit | Impl gate |
|---|---------|--------------|--------------|-------------|-------------------|------------|--------------|------|-------------------|-----------|
| **1** | **Email** | **Medium–High**（SMTP/API, from-domain, deliverability） | **yes** — API key + from address | High if configured | Good（inbox） | Medium（inbox clutter） | Medium（mis-addressed mail） | Low–med | Good if provider exists | **AS-B4** + env GO |
| **2** | **Slack Incoming Webhook** | **Low** | **yes** — **one** webhook URL | High | **Excellent**（mobile app） | Medium（channel noise if over-alert） | **Low** if payload redacted | **Free** workspace | **Excellent** | **AS-B4** + env GO |
| **3** | **Discord Webhook** | **Low** | **yes** — **one** webhook URL | High | **Excellent** | Medium | **Low** if redacted | **Free** | **Excellent**（Slack equivalent） | **AS-B4** + env GO |
| **4** | **LINE Notify / LINE channel** | **Medium–High** | **yes** — token / channel creds | High | **Excellent**（JP mobile） | Medium | Medium | Low | Good for JP solo | **Defer** — LINE Notify **sunset 2024**；Messaging API heavier | **AS-B4+** |
| **5** | **Vercel log / manual polling** | **Lowest** | **no** | Depends on Human | Poor（browser) | **Lowest** | **Lowest** | **Free** | **Current interim default** | **None**（active today） |
| **6** | **Supabase dashboard / manual SQL** | **Low** | **no**（dashboard login only） | Depends on Human | Poor | **Lowest** | **Low** if counts-only | **Free** | **Current interim**（AS-B1 §F） | **None**（active today） |

**Comparison notes:**

- **5 + 6** are **already operational** via **AS-B1-MONITOR** — zero new secrets；**cannot** push mobile alerts without Human action.
- **2 vs 3:** Functionally equivalent for M55 v1；pick **one** webhook to avoid secret sprawl.
- **1:** Viable **second** channel for archival/forwarding — not preferred **first** automation（more moving parts).
- **4:** Not recommended **first** due to API churn and setup cost vs webhook.
- **Vercel Log Drains** to external sinks = **hidden channel #7** — still needs integration secrets → treat as **AS-B4** scope, not interim.

---

## E. Trigger candidates（safe — planning only）

| Trigger ID | Condition | Default severity | Source | Automate in B4? |
|------------|-----------|------------------|--------|----------------|
| **T1** | **`failed_fulfillments_24h > 0`** | **SEV-1** | AS-B1 SQL counts | **yes** |
| **T2** | **New `failure_reason` category** vs D4 baseline | **SEV-1–2** | Category GROUP BY | **yes** |
| **T3** | **Current paid-not-unlocked**（Human/support report + counts corroboration） | **SEV-1** | Support + artifact probes | **partial**（Human-initiated poll） |
| **T4** | **Support-visible issue opens** | **SEV-2** | Human flag | **no**（manual label in message） |
| **T5** | **Wallet / ledger gap**（counts-only mismatch） | **SEV-2** | AS-B1 artifact queries | **yes** |
| **T6** | **Checkout / payment / webhook test failure** | **SEV-2** | Vercel `[webhook]` + test gate | **yes**（log pattern + T1） |
| **T7** | **Consult / reply safety RED**（blocked-unsafe spike or sanitizer fail rate） | **SEV-3** | Routes + logs | **defer** v1 |
| **T8** | **Deploy failure**（Vercel build not Ready） | **SEV-2** | Deploy gate SSOT | **optional**（Vercel native email exists） |
| **T9** | **AS-B1-MONITOR RED**（bleeding / new category / 24h>0） | **SEV-1–2** | Monitor result gate | **yes**（rollup of T1–T5） |
| **T10** | **DTR snapshot skip log-only**（no `failed_fulfillments` row） | **SEV-1** | `dtrCoreCheckoutFulfillment` logs | **AS-B4** dual trigger |

**v1 automation scope:** **T1, T2, T5, T6, T9** only.** **T3, T4** remain Human-in-the-loop.** **T7** post-launch optional.

---

## F. Severity mapping

| Level | Definition | Example triggers | Notify? |
|-------|------------|------------------|---------|
| **SEV-1** | Paid user blocked after successful payment **or** new **24h** fulfillment failure | **T1**, **T3**, **T10** | **Immediate** |
| **SEV-2** | Historical trend / webhook repeat without active user report；deploy fail；wallet gap | **T2**（trend only）, **T5**, **T6**, **T8** | **Same day** |
| **SEV-3** | Consult/reply safety or generation issue **without** payment impact | **T7** | **Daily digest or defer** |
| **SEV-4** | UI/copy/log-only；type-label（CONTROL-113） | TL track | **No automated ops alert** |

**Escalation:** **SEV-1** → stop paid tests → **investigation gate**（not repair unless separate Human GO）.** **SEV-2** → **AS-B1-MONITOR** within 15m.** **SEV-3–4** → backlog / TL-FIX.

---

## G. Notification payload policy

### Must include（safe）

| Field | Example |
|-------|---------|
| **phase label** | `5Z-I-V-AS-B1-MONITOR` / `webhook-fulfillment` |
| **environment safe label** | `m55-soul-core` |
| **severity** | `SEV-1` |
| **trigger category** | `failed_fulfillments_24h_gt_0` |
| **counts-only summary** | `total=7 delta_24h=1 categories=internal_processing_failed:1` |
| **next recommended gate** | `AS-B1-D-R` or `investigation` |
| **timestamp safe label** | `2026-05-20T09:00Z`（UTC ISO, no user locale PII） |

### Must not include

| Forbidden | Reason |
|-----------|--------|
| **raw `user_id`** | PII |
| **email** | PII |
| **session** | Secret / PII |
| **Stripe ID**（customer, PI, CS, event） | Payment PII |
| **checkout session id** | Payment trace |
| **webhook secret** | Credential |
| **raw DB row** | Leak surface |
| **raw `metadata` JSON** | May embed IDs |

**Product UI rule unchanged:** No in-app bell / badge / notification UI（workspace SSOT）— ops alerts are **out-of-band only**.

---

## H. Recommended channel decision

### Current stage（through AS-B3 — no new env）

| Role | Channel |
|------|---------|
| **Operational default** | **AS-B1-MONITOR** manual counts-only + **Supabase dashboard** |
| **Supplement** | **Vercel log** search（`[webhook]`, `[fulfillDtrCore]`） |
| **Cadence** | **AS-B1-D4** §D（paid-test daily；low traffic weekly；post-payment 15m） |

### First automated channel（AS-B4 — requires separate env Human GO）

| Decision | Value |
|----------|-------|
| **Recommended default** | **Slack Incoming Webhook** |
| **Env name（planned）** | **`M55_OPS_SLACK_WEBHOOK_URL`**（single secret；Vercel Production only） |
| **Alternate（equivalent）** | **Discord Webhook** — **`M55_OPS_DISCORD_WEBHOOK_URL`** — use **only if** operator standardizes on Discord；**not both** in v1 |
| **Not recommended first** | **Email**（higher setup）；**LINE**（API sunset / complexity） |
| **Paid SaaS** | **Avoid** for v1 — Slack/Discord free tier sufficient |

**Rationale:** One URL secret, no new npm dependency, strong mobile push, redacted POST body, easy manual fallback to **AS-B1-MONITOR** if webhook fails.

**If env/secret addition is declined:** **AS-B2** remains **GREEN**；continue **AS-B1-MONITOR** only until Human GO for **AS-B4**.

---

## I. Future gate split

| Gate | Title | Category | Delivers |
|------|-------|----------|----------|
| **AS-B3** | Automated notification **implementation planning** | **1** docs | Architecture: cron vs webhook-hook vs post-poll worker；module layout；idempotency |
| **AS-B4** | Minimal notification **implementation execution** | **2** code + **env GO** | Server-side POST to Slack/Discord；redacted payload builder |
| **AS-B5** | Notification static/local verification | **2** | Unit/selfcheck；no Production send |
| **AS-B6** | Notification production-safe **no-payment** verification | **1/2** | Test webhook to **staging channel** or dry-run flag — **no** paid checkout |
| **AS-B1-MONITOR** | **Permanent fallback** | **1** | Human counts-only；overrides automation silence |

**Dependency chain:** **AS-B2** → **AS-B3** → **AS-B4** → **AS-B5** → **AS-B6**；**MONITOR** parallel forever.

---

## J. No-implementation decision

| Item | AS-B2 action |
|------|----------------|
| Notification integration | **not created** |
| Webhook URL / SMTP | **not added** |
| Env / secrets | **not added** |
| Deploy / redeploy | **not performed** |
| Production DB connection | **not performed** |
| Test notification send | **not performed** |
| Stripe / payment / Clerk / repair / AX-PROD / AL | **not touched** |

---

## K. No-mutation statement

- **No** code change
- **No** notification implementation
- **No** webhook setup（Slack / Discord / LINE / email）
- **No** env / secret addition
- **No** deploy / redeploy
- **No** Production DB connection / SQL / DB write
- **No** Stripe / checkout / payment / webhook config change
- **No** Clerk / auth change
- **No** repair / AX-PROD / AL / AL-PRE
- **No** full normal dev flow release
- **No** raw key / secret / user_id / email / session / Stripe ID in this doc
- **No** push to **`main`**

---

## L. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AS-B3`** — Automated notification implementation planning |
| **2** | **`AS-B1-MONITOR`** — continue D4 cadence（especially before paid-test） |
| **3** | **`TL-FIX` planning** — only if Human GO prioritizes CONTROL-113 over ops automation |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-B2-AUTOMATED-NOTIFICATION-CHANNEL-SELECTION-PLAN-001`** | **本条** |
