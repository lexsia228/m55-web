# Phase 5-6H-5Z-I-V-AS-B6-R-DIAG-B — Safe fixture diagnostic reason-label planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-B6-R-DIAG-B** |
| **Title** | **Safe fixture diagnostic reason-label planning** |
| **Classification** | **Category 1 / docs-only / no send / no secret / no deploy** |
| **Verdict** | **`SAFE_REASON_LABEL_DIAGNOSTIC_PLANNING_GREEN_NO_SEND_NO_SECRET`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-B6-R-DIAG-B-SAFE-REASON-LABEL-DIAGNOSTIC-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Branch** | **`work/home-cluster`** |

**Agent role:** Planning only — whether and how to add **`--diagnose`** reason-label output.** **No** code change, **no** send, **no** env pull in this gate.

---

## B. Prior DIAG-A GREEN reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-B6-R-DIAG-A** | **`SAFE_LOCAL_DIAGNOSTIC_GUARD_MATRIX_GREEN_NO_SEND_NO_SECRET`** | **`M55-EVID-20260520-5Z-I-V-AS-B6-R-DIAG-A-SAFE-LOCAL-DIAGNOSTIC-GUARD-MATRIX-RESULT-001`** | **`56002d0`** |

| DIAG-A conclusion | Status |
|-------------------|--------|
| **Script stdout vocabulary** | **Healthy** — `dry_run` / `blocked` / `disabled` |
| **Guard matrix** | **Blocks safely** without network |
| **Slack send** | **no** |
| **H1 for AS-B6-R-R** | **Still likely** — `terminated_via_exit_command` not in script vocabulary |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_AS_B6_R_DIAG_A_SAFE_LOCAL_DIAGNOSTIC_GUARD_MATRIX_RESULT_2026-05-20.md`

---

## C. What remains unresolved

| Item | Status after DIAG-A |
|------|---------------------|
| **AS-B6-R-R Slack delivery** | **Unverified** — **0** messages；send attempt **1** |
| **Root cause of Human run** | **Not fully classified** — shell wrapper / env source order（**H1/H2**） |
| **Which guard failed on Human full-send attempt** | **Unknown** — stdout was not script vocabulary |
| **`evaluateFixtureMode` internal `reason`** | **Exists in code** but **not printed** to stdout today |
| **`notifyM55Ops` post-guard result** | **Unknown** for Human run — may never have reached helper |
| **Production notify path** | **Still disabled** — correct posture |

**Planning need:** When Human re-attempts with env (future GO), distinguish **`blocked:missing_fixture_confirm`** vs **`disabled:notify_not_enabled`** vs **`failed:network`** without exposing secrets.

---

## D. Whether code addition is needed

| Question | Planning answer |
|----------|-----------------|
| **Required to close AS-B6-R-R?** | **no** — DIAG-A already proved script/guards healthy under no-env matrix |
| **Recommended before next env-sourced attempt?** | **yes（optional Category 2）** — reduces ambiguity when guards fail |
| **Urgency** | **low–medium** — Human may defer and continue **AS-B1-MONITOR** only |
| **Scope** | **Minimal** — expose existing `evaluateFixtureMode().reason` only；optional validator reason on payload failure |

**Decision:** **Optional code addition** in **`AS-B6-R-DIAG-C`** — not mandatory for operational safety；**recommended** if Human wants clearer local diagnosis before any retry planning.

---

## E. Proposed `--diagnose` behavior（plan only — not implemented）

### Invocation（conceptual）

```text
node scripts/ops/send-m55-ops-notify-fixture.mjs --diagnose [--send]
```

### Rules

| Rule | Requirement |
|------|-------------|
| **Default without `--send`** | Print guard evaluation only — **no** `notifyM55Ops` network call |
| **With `--send` + incomplete guards** | Print diagnose lines **before** early exit — still **no** network |
| **With `--send` + all guards** | Unless **`--diagnose` explicitly allows dry-run send preview**, still **no** auto-send in diagnose-only mode |
| **Stdout format** | Single-line safe labels only |

### Allowed stdout examples（plan）

| Line pattern | Meaning |
|--------------|---------|
| `diagnose:mode:dry_run:no_send_flag` | No `--send` |
| `diagnose:mode:blocked:missing_fixture_confirm` | Confirm env missing |
| `diagnose:mode:disabled:notify_not_enabled` | Enable flag off |
| `diagnose:mode:blocked:missing_or_invalid_webhook` | URL missing or bad prefix |
| `diagnose:mode:send:all_guards_pass` | All guards satisfied（still no send unless normal send path + GO） |
| `diagnose:validation:invalid_severity` | From `validateM55OpsNotifyEvent` reason only |
| `diagnose:payload:ok` | Fixture payload validates |

**Mapping to existing `evaluateFixtureMode` reasons:**

| Internal `reason` | Diagnose label |
|------------------|----------------|
| `no_send_flag` | `diagnose:mode:dry_run:no_send_flag` |
| `missing_fixture_confirm` | `diagnose:mode:blocked:missing_fixture_confirm` |
| `notify_not_enabled` | `diagnose:mode:disabled:notify_not_enabled` |
| `missing_or_invalid_webhook` | `diagnose:mode:blocked:missing_or_invalid_webhook` |
| `all_guards_pass` | `diagnose:mode:send:all_guards_pass` |

### Prohibited in `--diagnose` output

| Prohibited | Never print |
|------------|-------------|
| **`process.env`** | **yes** |
| **Webhook URL** | **yes** |
| **Env file contents** | **yes** |
| **Raw IDs / secrets** | **yes** |
| **Slack POST** | **yes** — diagnose mode must not send |
| **DB / Stripe / Clerk** | **yes** — no calls |

### Interaction with normal stdout

| Mode | Behavior |
|------|----------|
| **No flags** | Unchanged — print `dry_run` / `blocked` / etc. only |
| **`--diagnose` only** | Print `diagnose:*` lines；exit **0**；**no** `notifyM55Ops` |
| **`--diagnose --send`** | Print `diagnose:*` then existing status line **without** network if plan keeps diagnose as preflight-only |

**Recommended DIAG-C implementation:** **`--diagnose` never calls `notifyM55Ops`** — preflight only.

---

## F. Future gate split

| Order | Gate | Category | Scope | Send |
|-------|------|----------|-------|------|
| **1** | **`AS-B6-R-DIAG-C`** | **Category 2** | Add `--diagnose` to fixture script + selfcheck update | **no** |
| **2** | **`AS-B6-R-DIAG-D`** | **Category 1** | Human runs diagnose with partial/full env（no env values in SSOT） | **no** |
| **3** | **`AS-B6-R-R2` or retry plan** | **Category 2** | Fixture retry planning + explicit Human GO | **only if approved** |
| **Alt** | **`AS-B1-MONITOR`** | **Category 1** | Continue counts-only cadence | **no** |

**Fixture retry:** **Forbidden** until **DIAG-D** or later gate classifies Human invocation；separate **env pull GO** required.

---

## G. Stop conditions

Stop planning / implementation if **any** of:

| # | Condition |
|---|-----------|
| **S1** | `--diagnose` would print env values or webhook URL |
| **S2** | `--diagnose` would call Slack / `notifyM55Ops` with real webhook |
| **S3** | Temp env file recreation required in planning gate |
| **S4** | Fixture retry proposed without separate GO |
| **S5** | DB / payment / auth / deploy involved |
| **S6** | Human GO for code is ambiguous |

---

## H. No-secret / no-mutation statement

- **No** Slack webhook URL / secret / env value recording
- **No** fixture retry / Slack send / env pull / temp file recreation
- **No** deploy / redeploy / **`main` push**
- **No** Production DB / SQL / DB write
- **No** Stripe / payment / Clerk / auth change
- **No** repair / **AX-PROD** / **AL** / full normal dev flow release
- **No** code change in this gate
- **No** raw key / secret / user_id / email / session / Stripe ID in this doc

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-B6-R-DIAG-B-SAFE-REASON-LABEL-DIAGNOSTIC-PLAN-001`** | **本条** |
