# Phase 5-6H-5Z-I-V-AS-B6-R-HARNESS-A — Human-local fixture harness implementation planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B6-R-HARNESS-A** |
| **Title** | **Human-local fixture harness implementation planning** |
| **Classification** | **Category 1 / docs-only / no send / no secret / no deploy** |
| **Verdict** | **`HUMAN_LOCAL_FIXTURE_HARNESS_IMPLEMENTATION_PLANNING_GREEN_NO_SEND_NO_SECRET`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-B6-R-HARNESS-A-HUMAN-LOCAL-FIXTURE-HARNESS-IMPLEMENTATION-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**Agent role:** Implementation planning only — script path, env file placement, command boundary, cleanup, result template.** **No** script creation, **no** env pull, **no** send.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B6-R-HARNESS** | **`SAFE_FIXTURE_NOTIFICATION_HARNESS_PLANNING_GREEN_NO_SEND_NO_DEPLOY`** | **`M55-EVID-20260520-5Z-I-V-AS-B6-R-HARNESS-SAFE-FIXTURE-NOTIFICATION-HARNESS-PLAN-001`** | **`5686430`** |

| Prior decision | Status |
|----------------|--------|
| **Option A selected** | **Human-local one-shot script** |
| **Production runtime** | **`M55_OPS_NOTIFY_ENABLED=false`** — remains disabled |
| **AS-B6-DISABLE-D** | **GREEN** — Production **`5051cbe`** |
| **AS-B1-MONITOR-R2** | **GREEN** — post-disable counts stable |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_B6_R_HARNESS_SAFE_FIXTURE_NOTIFICATION_HARNESS_PLANNING_2026-05-20.md`

---

## C. Planning decision

| Decision | Value |
|----------|--------|
| **Harness path** | **Human-local one-shot script** |
| **Protected Production fixture route** | **Do not create** |
| **Operational failure hooks** | **Do not use** |
| **Manual Slack post** | **Do not rely on** |
| **Production `M55_OPS_NOTIFY_ENABLED` in Vercel** | **Do not change** |
| **Local shell enable** | **Only during future `AS-B6-R-R`** — `true` in **process env only**；not in this gate |

---

## D. Proposed script path for future AS-B6-R-HARNESS-B

| Candidate | Assessment |
|-----------|------------|
| **`scripts/ops/send-m55-ops-notify-fixture.ts`** | Requires **`tsx`** or compile step — **`tsx` not in `package.json` today** |
| **`scripts/ops/send-m55-ops-notify-fixture.mjs`** | **Recommended** — mirrors **`lib/m55/ops/m55OpsNotify.selfcheck.mjs`**（`node` + dynamic `import('./m55OpsNotify.ts')`） |

| Field | Planned value |
|-------|---------------|
| **Selected path for HARNESS-B** | **`scripts/ops/send-m55-ops-notify-fixture.mjs`** |
| **Directory** | **`scripts/ops/`**（new in HARNESS-B；does not exist today） |
| **Import target** | **`lib/m55/ops/m55OpsNotify.ts`** → **`notifyM55Ops`** |
| **Script creation in HARNESS-A** | **no** |

**Read-only repo note:** `package.json` has **no** `tsx` / `ts-node` script runner；existing ops check uses **`node lib/m55/ops/m55OpsNotify.selfcheck.mjs`**.

---

## E. Temporary env file plan

| Rule | Plan |
|------|------|
| **Preferred path** | **Outside repo:** `~/m55-tmp/.vercel-production-env`（Human creates `~/m55-tmp/` with restrictive permissions） |
| **Alternative（repo-local）** | **Not recommended** — `.gitignore` covers **`.env.local`** / **`.env.*.local`** only；**no** dedicated `.tmp/` ignore today |
| **If repo-local ever used** | Requires **HARNESS-B** to add explicit gitignore entry（e.g. `.tmp/m55-ops-env`）+ Human confirmation — **default: outside repo** |
| **Commit prohibition** | Temp file **must never** be committed |
| **AI/SSOT/Cursor** | Temp file contents **must never** be pasted |
| **Deletion** | **Immediately after send** in **`AS-B6-R-R`**；Human attests deletion |
| **Vercel pull failure** | Stop → record **`BLOCKED`** in **`AS-B6-R-HARNESS-C`** or **`AS-B6-R-R`** |

---

## F. Vercel CLI plan（Human-only；future gates）

| Step | Human action | Agent / SSOT |
|------|--------------|--------------|
| **Auth** | `vercel login` if needed | **no** agent CLI |
| **Link** | `vercel link` — confirm project safe label **`m55-web`** / **`m55-webv2`** only | **no** raw URL in SSOT |
| **Pull** | `vercel env pull <temp-path> --environment=production`（conceptual；exact flags per Human CLI version） | **no** pull in planning gates |
| **Display** | **Do not** `cat` / print temp file to terminal shared with AI | **stop** if secrets would appear in logs |
| **Deploy** | **No** `vercel deploy` / redeploy in this path | **forbidden** |

**Stop if:** env pull prints webhook URL to shared terminal；project target unclear；CLI auth unsafe；URL would need paste to Cursor.

---

## G. Fixture payload plan（v1 — unchanged from HARNESS）

| Field | Value |
|-------|--------|
| **phase** | **`AS-B6-R-R`** |
| **environmentSafeLabel** | **`production`** |
| **severity** | **`SEV-4`** |
| **triggerCategory** | **`notification_verification_test`** |
| **countsOnlySummary** | **`test-only/no-user-impact`** |
| **nextRecommendedGate** | **`AS-B1-MONITOR`** |
| **timestampSafeLabel** | ISO UTC at send time |
| **sourceSafeLabel** | **`m55_ops_notify_harness`** |
| **dedupeSafeKey** | **`as-b6-r-harness-fixture-20260520`** |

| Reason | Detail |
|--------|--------|
| **Severity** | Helper accepts **`SEV-1`…`SEV-4`** only — **`TEST` unsupported** |
| **Schema change** | **None** in this lane |

---

## H. Future script behavior requirements（AS-B6-R-HARNESS-B）

| Requirement | Detail |
|-------------|--------|
| **Import** | **`notifyM55Ops`** from **`lib/m55/ops/m55OpsNotify.ts`** |
| **Payload** | Safe fixture fields only（§G） |
| **Send count** | **At most one** `notifyM55Ops` call per invocation |
| **Env** | Fail closed if **`M55_OPS_SLACK_WEBHOOK_URL`** missing or invalid prefix |
| **Logging** | **Must not** print webhook URL, full `process.env`, or secrets |
| **Scope** | **No** DB / Stripe / Clerk / payment / webhook / auth |
| **IDs** | **No** read of user/session/Stripe IDs |
| **Validation** | Exit **nonzero** on payload validation failure |
| **Stdout** | Safe result label only: **`sent` \| `disabled` \| `failed` \| `blocked`** |
| **Retry** | **No** automatic retry |

**Optional HARNESS-B selfcheck extension:** dry-run mode with **`M55_OPS_NOTIFY_ENABLED` unset** → expect **`disabled`** without network.

---

## I. Future execution command boundary（AS-B6-R-R — conceptual）

**Do not run in this gate.** Planned shape for Human execution + result recording only:

```text
# Conceptual — no real values
1. mkdir -p ~/m55-tmp && chmod 700 ~/m55-tmp
2. vercel env pull ~/m55-tmp/.vercel-production-env --environment=production
3. set -a; source ~/m55-tmp/.vercel-production-env; set +a
4. export M55_OPS_NOTIFY_ENABLED=true   # local process only
5. node scripts/ops/send-m55-ops-notify-fixture.mjs   # exactly once
6. rm -f ~/m55-tmp/.vercel-production-env
7. unset M55_OPS_SLACK_WEBHOOK_URL M55_OPS_NOTIFY_ENABLED  # shell cleanup
```

| Boundary | Rule |
|----------|------|
| **Send attempts** | **1** |
| **Retries** | **0** |
| **Production Vercel env** | **Unchanged**（flag stays **`false`** on Production） |
| **Post-run** | Confirm **`sent`** or **`failed`** once；Slack receipt yes/no in **`AS-B6-R-R`** SSOT |

---

## J. Future gate split

| Order | Gate | Scope | Send |
|-------|------|-------|------|
| **1** | **`AS-B6-R-HARNESS-B`** | Create **`scripts/ops/send-m55-ops-notify-fixture.mjs`**；tests/selfcheck only | **no** |
| **2** | **`AS-B6-R-HARNESS-C`** | Human env pull checkpoint — safe path confirmed；no raw URL in SSOT | **no** |
| **3** | **`AS-B6-R-R`** | One-shot send + result SSOT；temp file deleted | **yes（1 only）** |
| **4** | **`AS-B1-MONITOR`** | Return to counts-only cadence | **no** |

---

## K. AS-B6-R-R result template（for future recording gate）

| Field | Safe label only |
|-------|-----------------|
| **phase** | **`AS-B6-R-R`** |
| **verdict** | **`ONE_SHOT_SAFE_FIXTURE_NOTIFICATION_*`** |
| **send_count** | **`0` \| `1`** |
| **helper_result** | **`sent` \| `disabled` \| `failed` \| `blocked`** |
| **slack_received** | **`yes` \| `no` \| `n/a`** |
| **temp_env_file_deleted** | **`yes` \| `no`** |
| **production_runtime_flag_changed** | **`no`**（required） |
| **raw_secret_exposed** | **`no`**（required） |

**Prohibited in result SSOT:** webhook URL, env file contents, raw IDs, stack traces with secrets.

---

## L. Stop conditions

| # | Condition |
|---|-----------|
| **S1** | Raw Slack webhook URL appears anywhere（terminal, file paste, SSOT） |
| **S2** | Temp env file would be committed |
| **S3** | Repo-local temp path used without gitignore protection |
| **S4** | Vercel CLI cannot authenticate/link safely |
| **S5** | Project target unclear |
| **S6** | Script would need DB/payment/auth |
| **S7** | Payload requires raw IDs |
| **S8** | More than one send could occur |
| **S9** | Send command would auto-retry |
| **S10** | Human GO ambiguous |

---

## M. No-send / no-secret decision

| Item | HARNESS-A |
|------|-----------|
| **Script created** | **no** |
| **Env pulled** | **no** |
| **Slack notification sent** | **no** |
| **Deploy** | **no** |
| **Production runtime enabled** | **no** |

---

## N. No-mutation statement

- **No** Slack webhook URL / secret recording
- **No** env value recording beyond safe labels
- **No** env change（including Vercel Production **`M55_OPS_NOTIFY_ENABLED=true`**）
- **No** real or fixture notification send
- **No** deploy / redeploy / **`main` push**
- **No** Production DB / SQL / DB write
- **No** Stripe / payment / Clerk / auth change
- **No** repair / **AX-PROD** / **AL** / full normal dev flow release
- **No** raw key / secret / user_id / email / session / Stripe ID in this doc
- **No** code change in this gate

---

## O. Next phase

| Priority | Gate |
|----------|------|
| **1（if Human wants code）** | **`AS-B6-R-HARNESS-B`** — local fixture script creation / no send |
| **2（defer）** | **`AS-B1-MONITOR`** — continue cadence |
| **3** | Thread handoff if context heavy |

---

## Read-only repo review summary

| Artifact | Finding |
|----------|---------|
| **`lib/m55/ops/m55OpsNotify.ts`** | **`notifyM55Ops`**；**SEV-1…4**；webhook prefix gate |
| **`lib/m55/ops/m55OpsNotify.selfcheck.mjs`** | Reference runner pattern for HARNESS-B |
| **`package.json`** | **No** `tsx`；**no** harness npm script |
| **`tsconfig.json`** | **`noEmit: true`** — favors `.mjs` runner over standalone `.ts` execute |
| **`.gitignore`** | **`.env.local`** ignored；**no** `.tmp/` — prefer **outside-repo** env file |
| **`scripts/ops/`** | **Does not exist** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-B6-R-HARNESS-A-HUMAN-LOCAL-FIXTURE-HARNESS-IMPLEMENTATION-PLAN-001`** | **本条** |
