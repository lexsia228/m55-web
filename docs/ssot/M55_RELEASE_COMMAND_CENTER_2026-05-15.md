# M55 Release Command Center — Zero-backtracking protocol (2026-05-15)

**Audience:** Any AI or human teammate — **open this file first** before acting on M55 release work.

**Scope:** **Documentation only.** This file does **not** authorize PR merge, `main` merge, deploy, env edits, secrets, webhooks, or live payment.

---

## A. Current Canonical State

| Field | Value |
|-------|--------|
| **Current working branch** | `work/home-cluster` |
| **Current evidence commit** | **`57d7671`** — `docs: prepare main alignment decision gate` |
| **Integration branch** | `integration/main-align-2026-05-14` |
| **Integration merge commit** | **`10b4e33`** — `merge: integrate main public surface into alignment branch` |
| **Next allowed phase** | **Phase 5-6H-5A — Draft PR creation only** |

### Current forbidden actions

- **PR merge**
- **`main` merge**
- **Production deploy**
- **Production env edit**
- **`whsec` / secret / `service_role` / Stripe secret / Clerk secret** — **出力または変更**
- **Stripe Production webhook change**
- **live smoke**
- **live payment**

---

## B. GREEN Stack

- **Phase 1〜4:** Preview / Shadow E2E **GREEN**
- **Phase 5-6G:** Production DB/RPC migration + postflight **GREEN**
- **Phase 5-6H-1:** topology diagnostic **GREEN**
- **Phase 5-6H-2:** integration / main-align branch plan **GREEN**
- **Phase 5-6H-3:** integration branch merge / build / tsc **GREEN**
- **Phase 5-6H-4:** main alignment decision gate **GREEN**

---

## C. Not Yet Done

- **PR creation**（GitHub）
- **PR diff review**
- **GitHub checks / CI / Vercel Preview** review
- **PR merge / `main` merge**
- **Production deploy**
- **Production app runtime smoke**
- **live DTR ¥1,000 smoke**
- **live additional reply ¥500 smoke**
- **refund / support operational test**
- **Data API GRANT / RLS / Security Advisor** — future release hardening

---

## D. Zero-Backtracking Rules

1. **Never** combine in a single gate: **DB migration**, **app deploy**, **PR merge**, **env change**, **webhook change**, and **live payment**.
2. Every risky operation must declare:
   1. **branch / environment / product lane** anchor  
   2. **current commit**  
   3. **allowed action** only  
   4. **explicit non-targets**  
   5. **rollback point**  
   6. **evidence checkpoint** (SSOT path or commit)
3. If an AI **cannot** identify **current phase** and **stop conditions** → **STOP**.
4. If a command touches **`main` / Production / env / `whsec` / live payment** without the **current gate** allowing it → **STOP**.
5. If **unrelated histories**, **conflict markers**, **secrets**, or **raw IDs** appear in output or docs → **STOP** and **escalate to human**.

---

## E. Risk / swamp-avoidance matrix

| # | Risk area | Why it becomes a swamp | Current mitigation | Recovery point | Next allowed action |
|---|-----------|-------------------------|-------------------|----------------|---------------------|
| 1 | Git unrelated histories / `main` alignment | No `merge-base`; blind merge loses one side | Integration branch + manual conflict policy | `integration/main-align-2026-05-14` @ **`10b4e33`** | **5-6H-5A Draft PR** |
| 2 | PR merge triggers Production deploy | Vercel auto-production on `main` | Treat **merge** and **deploy** as **separate gates**; verify Vercel project settings | `main` pre-merge state on remote | **Human:** merge only when deploy gate ready |
| 3 | Vercel Production **source branch** ambiguity | Wrong branch → wrong artifact | SSOT labels: **m55-webv2 / m55-soul.jp**; align branch in Vercel UI | Last known GREEN Preview | **Human:** confirm Production branch mapping |
| 4 | Preview vs Production **env / `whsec`** confusion | Signature / URL mismatch | **Never** paste secrets; **label-only** SSOT; separate Preview vs Prod checklists | Preview GREEN history | **Human:** env pairing checklist |
| 5 | Stripe webhook **endpoint** confusion | Double delivery / wrong secret | Webhook endpoint **registry SSOT**; one endpoint per mode | Stripe Dashboard + SSOT | **Human:** label-only verification |
| 6 | Supabase **Production vs Shadow** | Wrong DB target | **m55-soul-core / PRODUCTION** label; read-only preflight first | **5-6G** postflight evidence | **Human:** re-label before any DDL |
| 7 | Duplicate Stripe replay / duplicate payment | Double grants | **`stripe_processed_events`** uniqueness + RPC idempotency | **5-6G** DB state | **Human:** no blind replay |
| 8 | DTR ¥1,000 vs additional reply ¥500 **lane mixing** | Wrong fulfillment path | Separate metadata / product keys; webhook branch in code | App + DB contract SSOT | **Human:** lane checklist per smoke |
| 9 | **legal / support / public** regression | Review / compliance failure | Preserve **`origin/main`** surface in integration merge | **`10b4e33`** tree | **PR diff** review |
| 10 | **DTR LP** forbidden-keyword regression | Gate failure | Grep / audit in **5-6H-3**; repeat before merge | **`10b4e33`** | **Re-run** grep on LP/root |
| 11 | **Secret / raw ID logging** | Leak / audit failure | Redacted diagnostics; no values in logs | Code review | **Human:** log audit |
| 12 | **Data API GRANT / RLS** future change | Accidental exposure | **Out of scope** for current gates; separate hardening | N/A | **Future release** task only |

---

## F. Team status board (AI-readable lanes)

| Lane | Current status | Last GREEN evidence | Next allowed task | STOP line | Owner |
|------|----------------|---------------------|-------------------|-----------|--------|
| **DB/RPC** | **GREEN** | Phase **5-6G** postflight | Read-only diagnostics only unless new DB gate | **No** DDL without DB GO | **lexsia** + human DBA policy |
| **App runtime** | **GREEN** (aligned to Prod RPC) | RPC caller SSOT + integration **build/tsc** | Code review on PR diff | **No** logic change without app gate | **lexsia** |
| **Git / `main` alignment** | **GREEN** through **5-6H-4** | **`10b4e33`** integration merge | **5-6H-5A:** open **Draft PR** only | **No** PR merge / **no** `main` merge | **lexsia** |
| **Public / legal / Stripe review** | **Preserved** on integration | Gate R commits on `origin/main` + merge **`10b4e33`** | Review PR diff for legal/support/dtr-lp | **No** copy meaning drift without review | **lexsia** + reviewer |
| **Vercel / deploy** | **Not started** for this alignment | Prior Preview GREEN (historical) | **Nothing** until post-merge deploy gate | **No** Production deploy | **lexsia** |
| **Stripe / payment** | **DB ready**; **live not run** | **5-6G** | **Nothing** live until live gate | **No** live smoke / **no** live payment | **lexsia** |
| **QA / smoke** | **Not started** | Preview E2E history | **Nothing** until dedicated smoke gate | **No** live checkout without GO | **lexsia** |
| **Recovery / runbook** | **Active** | Command Center + phase SSOTs | Escalation + branch rollback | **No** force-push to `main` without extreme GO | **lexsia** |

---

## G. Recovery points (safe return)

| Label | Pointer |
|-------|---------|
| **Work branch anchor** | `work/home-cluster` @ **`57d7671`** |
| **Integration merge result** | `integration/main-align-2026-05-14` @ **`10b4e33`** |
| **Production DB/RPC postflight GREEN** | Evidence commit **`889f857`**（`docs: record production migration postflight green`） |
| **5-6H-3 integration evidence** | **`19e9989`**（`docs: record integration branch merge build green`） |
| **5-6H-4 decision gate** | **`57d7671`**（`docs: prepare main alignment decision gate`） |

---

## H. Next gate definition — **Phase 5-6H-5A**

### Allowed

- Create **GitHub PR** from **`integration/main-align-2026-05-14`** → **`main`**
- **Prefer Draft PR**
- **No merge** — capture **PR URL** in SSOT or ticket
- **Diff / checks / Preview** review only

### Not allowed

- **PR merge**
- **`main` merge**
- **Production deploy**
- **env / `whsec` / secret** change or output
- **Stripe webhook** change
- **live smoke / live payment**

---

## I. AI team handoff template (copy-paste)

```
Current branch: work/home-cluster
Current commit: 57d7671
Current phase: Phase 5-6H-5A (Draft PR creation ONLY)
Allowed action: Open GitHub Draft PR integration/main-align-2026-05-14 -> main; record PR URL; review diff/checks only.
Explicitly prohibited: PR merge, main merge, Production deploy, env/whsec/secret touch, Stripe webhook change, live smoke, live payment, SQL execution on Production without GO.
Evidence files: docs/ssot/M55_RELEASE_COMMAND_CENTER_2026-05-15.md, docs/ssot/M55_AI_TEAM_STATUS_BOARD.md, docs/ssot/M55_PHASE5_6H_4_MAIN_ALIGNMENT_DECISION_GATE_2026-05-14.md, docs/ssot/M55_PHASE5_6H_3_INTEGRATION_BRANCH_MERGE_BUILD_GREEN_2026-05-14.md
Rollback point: integration/main-align-2026-05-14 @ 10b4e33; work/home-cluster @ 57d7671
Output required: Short report — files touched, PR URL (if created), checks status, stop if any gate violated.
Stop conditions: Cannot name current phase; any forbidden action requested; conflict markers; secrets or raw IDs in chat; unrelated-history merge without human.
```

---

## Related SSOT

- `docs/ssot/M55_AI_TEAM_STATUS_BOARD.md`
- `docs/ssot/M55_PHASE5_6H_4_MAIN_ALIGNMENT_DECISION_GATE_2026-05-14.md`
- `docs/ssot/M55_PHASE5_6H_3_INTEGRATION_BRANCH_MERGE_BUILD_GREEN_2026-05-14.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
