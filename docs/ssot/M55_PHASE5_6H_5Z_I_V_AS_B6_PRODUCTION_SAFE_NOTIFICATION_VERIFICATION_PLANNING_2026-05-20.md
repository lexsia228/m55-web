# Phase 5-6H-5Z-I-V-AS-B6 — Production-safe notification verification planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B6** |
| **Title** | **Production-safe notification verification planning** |
| **Classification** | **Category 1 / verification planning / docs-only / no deploy / no real send** |
| **Verdict** | **`PRODUCTION_SAFE_NOTIFICATION_VERIFICATION_PLANNING_GREEN_NO_SEND_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-B6-PRODUCTION-SAFE-NOTIFICATION-VERIFICATION-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Production deployed SHA（notify code）** | **`4efd4af`** — **does not include** `m55OpsNotify`（**`7c0fedc`** on `work/home-cluster` only） |

**AS-B6 plans verification only.** No enable-flag flip, no deploy, no Slack send in this gate.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B4-E** | **`SLACK_WEBHOOK_ENV_HUMAN_CHECKPOINT_GREEN_NO_DEPLOY_NO_SEND`** | **`M55-EVID-20260520-5Z-I-V-AS-B4-E-SLACK-WEBHOOK-ENV-HUMAN-CHECKPOINT-001`** | **`0307d8b`**（**do not re-run**） |
| **AS-B5** | **`NOTIFICATION_STATIC_LOCAL_VERIFICATION_GREEN_NO_ENV_NO_DEPLOY`** | **`M55-EVID-20260520-5Z-I-V-AS-B5-…-001`** | **`95810f5`** |
| **AS-B4** | **`AUTOMATED_NOTIFICATION_IMPLEMENTATION_EXECUTION_GREEN_NO_ENV_NO_DEPLOY`** | **`M55-EVID-20260520-5Z-I-V-AS-B4-…-001`** | **`7c0fedc`** |

---

## C. Current operational posture

| Item | Status |
|------|--------|
| **`M55_OPS_SLACK_WEBHOOK_URL` in Production** | **yes**（AS-B4-E Human attestation；value **not** in SSOT） |
| **`M55_OPS_NOTIFY_ENABLED` in Production** | **`false`** |
| **`notifyM55Ops` runtime on Production** | **not present** until deploy includes **`7c0fedc+`** |
| **Automated notification active** | **no** |
| **Real Slack send to date** | **no** |
| **AS-B1-MONITOR** | **Active fallback** |

---

## D. Verification objective

Prove on **Production**（after prerequisites）that:

1. One **intentional** safe test message reaches the **private ops Slack channel** only.
2. Payload contains **no** raw IDs, Stripe IDs, emails, sessions, secrets, or raw metadata.
3. **`notifyM55Ops`** returns **`sent`** for the fixture and **`disabled`** when flag is **`false`**.
4. Webhook/fulfillment paths still **do not throw** and **do not change** Stripe HTTP semantics on failure paths.
5. Flag can be set back to **`false`** immediately after test（**AS-B6-DISABLE** or Human Vercel UI）.

---

## E. Prerequisite chain（ordered — separate Human GO each）

| Step | Gate / action | Category | Delivers |
|------|---------------|----------|----------|
| **P0** | **AS-B6**（this doc） | **1** | Plan only — **done** |
| **P1** | **AS-B6-D** Deploy notify code to Production | **2** | Production SHA includes `lib/m55/ops/m55OpsNotify.ts` + hooks |
| **P2** | Confirm Production env still has URL + flag **`false`** | **Human** | No secret paste to AI |
| **P3** | **AS-B6-ENABLE** Enable flag Human checkpoint | **Human** | Vercel: `M55_OPS_NOTIFY_ENABLED` → **`true`**（requires **P1** redeploy or env-only hot reload per Vercel behavior） |
| **P4** | **AS-B6-R** One safe test send + result recording | **1/2** | Single fixture message；record **sent/disabled** safe labels only |
| **P5** | **AS-B6-DISABLE** or leave enabled with cadence policy | **Human** | Default: revert flag to **`false`** after P4 unless Human adopts always-on SEV-1 |

**AS-B6 does not authorize P1–P5 automatically.**

---

## F. Production-safe test procedure（planned for AS-B6-R）

### F1. Preconditions（Human checklist）

| # | Check |
|---|--------|
| 1 | Production deploy includes notify module（post **AS-B6-D**） |
| 2 | `M55_OPS_SLACK_WEBHOOK_URL` configured（already **yes** per AS-B4-E） |
| 3 | Ops Slack channel is **private**；webhook posts only to that channel |
| 4 | **No** paid checkout / webhook replay / live payment test in same window |
| 5 | **No** production DB polling required for this test |
| 6 | **AS-B1-MONITOR** counts-only poll optional baseline before/after |

### F2. Enable sequence（AS-B6-ENABLE — not in AS-B6）

| Step | Action |
|------|--------|
| 1 | Human sets **`M55_OPS_NOTIFY_ENABLED`** to **`true`** in Vercel Production |
| 2 | If required by platform: trigger **redeploy** only under **AS-B6-D** GO — **not** bundled with AS-B6 planning |
| 3 | Record **AS-B6-ENABLE** SSOT（flag safe label only） |

### F3. Safe fixture payload（only allowed fields）

Use a **manual invoke** path（preferred order）:

| Option | Path | Notes |
|--------|------|-------|
| **A（preferred）** | Temporary **admin-only** route or one-off script on Preview with Production env **not recommended** | Defer unless Human GO |
| **B** | Wait for **natural SEV-2** `missing_client_reference_id` in test | **Not** for first proof — uncontrolled |
| **C（recommended for first proof）** | **AS-B6-R**: Human triggers **one** controlled failure in **Stripe test mode** sandbox **only if** separate payment GO — **default: skip** |
| **D（recommended default）** | **Local/staging** with Production env mirror **not allowed** — secrets must not leave Vercel |

**Default first Production proof（AS-B6-R plan):**

1. Deploy notify code（**AS-B6-D**）.
2. Human enables flag（**AS-B6-ENABLE**）.
3. Human executes **one** internal test via **future** `AS-B6-T` gate: optional read-only admin endpoint `POST /api/internal/ops-notify-test` behind **secret header** — **Category 2, not built in AS-B6**; if rejected, use **simulated hook** by calling `notifyM55Ops` from a **one-off Vercel CLI function** or manual **Stripe CLI test event** without real payment.

**Pragmatic v1 without new route:**

- After **AS-B6-D** deploy, Human sets flag **`true`**.
- Human uses **Stripe Dashboard test webhook** or **test checkout** in **test mode only** with explicit **payment GO** — **out of scope for AS-B6 planning default**.
- **Safer alternative documented:** add **`AS-B6-T`** minimal internal test route in Category 2 with:
  - `runtime = 'nodejs'`
  - Requires `Authorization: Bearer` from env `M55_OPS_TEST_TOKEN`（separate secret, not Slack URL）
  - Body ignored；sends fixed fixture from `m55OpsNotify` builders
  - **Not implemented in AS-B6**

**Fixture content（safe labels only）:**

```text
phase: 5Z-I-V-AS-B6-R
environment: m55-soul-core
severity: SEV-4
trigger: ops_notify_verification_fixture
summary: verification_fixture=1
next: AS-B6-DISABLE
source: as-b6-r-fixture
```

### F4. Success criteria（AS-B6-R）

| Criterion | Pass |
|-----------|------|
| Exactly **one** Slack message in ops channel | **yes** |
| Message matches fixture labels | **yes** |
| No raw IDs in message body | **yes** |
| `failed_fulfillments_24h` unchanged by test | **yes**（no DB mutation） |
| No user-facing product impact | **yes** |

### F5. Stop / rollback

| Trigger | Action |
|---------|--------|
| Wrong channel / duplicate spam | Set **`M55_OPS_NOTIFY_ENABLED=false`** immediately |
| Payload contained forbidden pattern | **RED** AS-B6-R；disable flag；open investigation |
| Stripe webhook returned wrong status | Revert deploy；disable flag |
| Test sent >1 message in 5 min without cause | Disable flag；review dedupe |

---

## G. Activation & ongoing policy（post-verification）

| Mode | `M55_OPS_NOTIFY_ENABLED` | When |
|------|--------------------------|------|
| **Verification** | **`true`** | Only during **AS-B6-R** window |
| **Default ops** | **`false`** | Until Human explicitly adopts always-on |
| **Always-on SEV-1** | **`true`** | Optional after **AS-B7** policy gate |

**Triggers that may fire when enabled（from AS-B4 hooks）:**

| Trigger | Severity | Notes |
|---------|----------|-------|
| `internal_processing_failed` | SEV-1 | Real payment path — only after traffic GO |
| `missing_client_reference_id` | SEV-2 | Deduped per day |
| `snapshot_skip` | SEV-1 | Log-only gap |

**Do not enable for consult/reply safety or type-label（deferred per AS-B2/B3）.**

---

## H. Future gate split

| Gate | Title | Type |
|------|-------|------|
| **AS-B6** | Production-safe verification **planning** | **1** — **this gate** |
| **AS-B6-D** | Deploy notify code to Production | **2** |
| **AS-B6-ENABLE** | Human enable-flag checkpoint | **Human + docs** |
| **AS-B6-R** | Verification **result** recording | **1** |
| **AS-B6-DISABLE** | Post-test flag revert checkpoint | **Human + docs** |
| **AS-B6-T**（optional） | Internal fixture test route | **2** — only if Human GO |
| **AS-B7** | Post-notification monitor policy | **1** |

---

## I. Decision boundaries

| Boundary | AS-B6 decision |
|----------|----------------|
| Authorize deploy | **no** — **AS-B6-D** separate |
| Authorize `M55_OPS_NOTIFY_ENABLED=true` | **no** — **AS-B6-ENABLE** separate |
| Authorize real Slack send | **no** — **AS-B6-R** only |
| Authorize payment/webhook test | **no** |
| AS-B4-E re-run | **no** — closed **`0307d8b`** |
| AS-B1-MONITOR | **continues** |

---

## J. No-mutation statement

- **No** real Slack notification send
- **No** `M55_OPS_NOTIFY_ENABLED=true` change
- **No** webhook URL / secret / env value in SSOT
- **No** deploy / redeploy
- **No** `main` push
- **No** Production DB / SQL / DB write
- **No** Stripe / payment / Clerk / auth change
- **No** repair / AX-PROD / AL
- **No** full normal dev flow release
- **No** code change in this gate

---

## K. Next phase

| Priority | Gate |
|----------|------|
| **1** | **`5Z-I-V-AS-B6-D`** — Deploy notify code to Production（explicit Human GO） |
| **2** | **`AS-B6-ENABLE`** + **`AS-B6-R`** — one safe test + result |
| **3** | **`AS-B6-DISABLE`** — revert flag unless always-on approved |
| **Alt** | **`AS-B1-MONITOR`** — continue while deploy deferred |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-B6-PRODUCTION-SAFE-NOTIFICATION-VERIFICATION-PLAN-001`** | **本条** |
