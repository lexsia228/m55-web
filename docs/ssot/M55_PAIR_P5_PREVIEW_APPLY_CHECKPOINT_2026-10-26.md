# M55 Pair P5 — Preview Apply SSOT Checkpoint

Status: **CHECKPOINT / PREVIEW / NO_REPLAY** (docs-only narrative freeze)  
Checkpoint date: **2026-10-26**  
Lane: Pair P5 owned-state / checkout Preview remote apply  
Human lane authorization: **M55 PAIR P5 — Preview SSOT Checkpoint最小反映 GO**

---

## Authority precedence (this document)

1. `docs/ssot/M55_EXECUTION_STATE.json` — **sole executable CURRENT/NEXT**; **not edited** by this checkpoint.
2. `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` — Production Pair real-payment E2E (**CLOSED_GREEN / PRODUCTION / NO_REPLAY**); unchanged by this checkpoint.
3. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md` — high-cost rerun rules; **not edited** by this checkpoint.
4. **This file** — durable **Preview apply** closeout for P5-1 and P5-2 only, plus explicit hold on P5-3 and replay prohibitions.

This checkpoint is **not** a substitute for machine contracts, receipt ledgers, or execution-state progression. It records Human-verified Preview facts at the checkpoint date.

---

## Observation snapshot (non-permanent)

Values below are **observed at checkpoint authoring time** only. They are **not** CURRENT gate pins and **must** be re-observed after any merge, rebase, or new Preview session.

| Field | Observed value (2026-10-26) |
|---|---|
| Git worktree path | `/Users/lexsia/Documents/M55_WORKTREE-pair-p5-owned-state-identity-v1` |
| Git branch | `feat/m55-pair-p5-owned-state-identity-v1` |
| Git `HEAD` commit | `c47ae83e4d4fbe553b042e2b46969a827a3351e5` |
| Git `HEAD^{tree}` | `f03ddf243847ac548779a24fe72842a94da34372` |
| Open PR (observed) | [#251](https://github.com/lexsia228/m55-web/pull/251) — `feat(pair): finalize P5 owned-state identity and checkout safeguards` |
| PR `headRefOid` at observation | `c47ae83e4d4fbe553b042e2b46969a827a3351e5` |
| Supabase Preview project ref | `sbogwyzldjxxouhqtpnq` |

---

## Evidence provenance and judgment scope

### Sources (class)

| Class | Role |
|---|---|
| Human-operated Preview apply sessions | P5-1 and P5-2 dedicated-target binding receipts, Human attestations, and authorized apply paths executed on Preview only |
| Independent POST verification | Post-apply HTTP/API probes confirming callable step behavior without re-running apply |
| Preview catalog / schema observation | `supabase_migrations.schema_migrations` history, table/column/index/check/RPC inventory on Preview |
| Repository pins (read-only) | Frozen step IDs, migration filenames, and executor authority in `lib/m55/previewRemoteApply/*` on the observed `HEAD` |
| Local prep artifacts (non-repo) | Mac `~/Downloads/00_LATEST_*` P5-2 Human receipt prep scripts (PATCH1) — **issuance prep only**; not apply authority |

### Checkpoint judgment scope (what this doc claims)

- **In scope:** Preview database state after **one** successful apply each for P5-1 identity migration and P5-2 checkout migration; POST verification green; consolidated schema inventory counts on Preview; explicit **not applied** status for P5-3 successor migration.
- **Out of scope:** Production runtime mutation; Stripe live payment; receipt one-use ledger consumption replay; rewriting historical Executor HOLD semantics in source code; advancing `M55_EXECUTION_STATE.json`.

### Evidence time basis

Facts consolidated **2026-10-26 (UTC+9)** from completed Preview apply + POST verification work on project ref `sbogwyzldjxxouhqtpnq`. No secrets, connection strings, or receipt private material are stored in this document.

---

## Closed GREEN — P5-1 Preview identity apply

| Item | Record |
|---|---|
| Callable step | `PAIR_P5_IDENTITY_20261009` |
| Migration version / file | `20261009000000` — `supabase/migrations/20261009000000_m55_pair_owned_state_identity_v1.sql` |
| Apply surface | Supabase **Preview** only (`sbogwyzldjxxouhqtpnq`) |
| Apply + independent POST | **CLOSED GREEN** (2026-10-26 checkpoint) |
| Source code note | **Do not alter** historical HOLD outcomes on the original P5-1 Executor paths; checkpoint does not authorize retroactive code edits to past HOLD semantics |

**NO_REPLAY:** P5-1 Preview apply, receipt re-consumption for the same operational binding, and Human attestation re-issuance for the same authorization identity are **prohibited** unless a documented invalidator in `M55_HIGH_COST_EVIDENCE_LEDGER.md` or a new Human-authorized migration version requires it.

---

## Closed GREEN — P5-2 Preview checkout apply

| Item | Record |
|---|---|
| Callable step | `PAIR_P5_CHECKOUT_20261010` |
| Migration version / file | `20261010000000` — `supabase/migrations/20261010000000_m55_pair_checkout_reservation_v1.sql` |
| Apply count on Preview | **Exactly one** successful apply recorded for `20261010000000` |
| Apply + independent POST | **CLOSED GREEN** (2026-10-26 checkpoint) |

**NO_REPLAY:** Same prohibitions as P5-1 for re-apply, receipt re-consumption, and signature re-issuance tied to the same operational receipt / authorization.

---

## Preview schema inventory (post P5-1 + P5-2)

Observed on Preview after both applies (checkpoint consolidation):

| Check | Observed result |
|---|---|
| `schema_migrations` history rows (Pair P5 lane relevant window) | **24** entries, **no duplicates** |
| Additional columns (checkout / reservation lane) | **4** columns added per apply verification |
| `CHECK` constraints (verified set) | **6** |
| `UNIQUE` index (verified) | Present as verified |
| RPC functions (verified set) | **5** |

Exact object names live in apply-session evidence outside SSOT; this checkpoint records **counts and pass/fail class** only.

---

## Explicit HOLD — P5-3 successor migration

| Item | Record |
|---|---|
| Migration version / file | `20261013110000` — `supabase/migrations/20261013110000_m55_pair_fulfill_tuple_advisory_v1.sql` |
| Preview apply | **NOT APPLIED** |
| Human apply authorization | **NOT GRANTED** at checkpoint date |
| Callable step / receipt lane | **Not started** — do not infer LIVE from P5-2 green |

---

## Production Pair real payment (unchanged authority)

Production Pair real-payment E2E remains **CLOSED_GREEN / PRODUCTION / NO_REPLAY** per `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md`.

**Prohibited at this checkpoint:** Production Pair real-payment E2E re-test, webhook replay for proof, or treating Preview apply green as Production payment authorization.

---

## Global prohibitions (checkpoint lane)

Unless a future SSOT names an **exact invalidating dependency**:

1. Re-apply P5-1 or P5-2 migrations on Preview (`20261009000000`, `20261010000000`).
2. Re-consume dedicated operational receipts or authorization IDs already consumed for apply.
3. Re-issue Human Ed25519 attestations / operational receipts for the same P5-1/P5-2 authorization binding.
4. Apply P5-3 (`20261013110000`) on Preview or Production without a new Human GO + fresh receipt lane.
5. `main` merge, Production deploy, or broad repo audit unrelated to an explicit next lane task.

---

## Conditions requiring re-verification (not automatic invalidation)

Re-observation or a **new** bounded verification episode is required when **any** of:

| Trigger | Required action |
|---|---|
| Preview project ref change or Preview DB reset / branch rebuild | Full Preview migration history + POST suite for affected steps |
| New commit changes P5-2/P5-3 migration SQL, step authority, or POST probe contracts | Re-run targeted local tests + **new** Human apply authorization; **no** silent reuse of P5-1/P5-2 receipts |
| Dedicated receipt consumption ledger or migration classifier semantics change | Ledger + receipt preflight review before any apply |
| Duplicate or drift in `schema_migrations` for frozen versions | STOP apply; Human triage |
| PR #251 merged to `main` with additional Pair P5 commits | Re-record observation snapshot; P5-3 Human signing only after **new** lane `HEAD` is Human-pinned |

A new chat, new agent, or missing local Downloads artifact is **not** by itself an invalidator.

---

## P5-3 — next single actions (non-executable here)

1. **Code / review lane:** Land P5-3 successor migration and executor wiring on the Pair P5 worktree; independent review on exact diff (Draft PR model).
2. **Human signing:** Issue P5-3 Human attestations and operational receipt only after **new `HEAD` is Human-confirmed** for the P5-3 lane (do not sign against stale `c47ae83e` once P5-3 code advances).
3. **Preview apply:** Separate Human **Preview APPLY GO** with fresh receipt; POST verification episode; then optional docs checkpoint update — **not** this file’s retroactive edit alone.
4. **Execution state:** Any global CURRENT/NEXT change remains a **separate** Human task on `M55_EXECUTION_STATE.json`; this checkpoint does not advance it.

---

## Document maintenance

| Field | Value |
|---|---|
| Document path | `docs/ssot/M55_PAIR_P5_PREVIEW_APPLY_CHECKPOINT_2026-10-26.md` |
| Supersedes | — (first Preview apply checkpoint of this series) |
| Subordinate to | `M55_EXECUTION_STATE.json`, Production E2E closeout 2026-10-07 |

**STOP** — checkpoint narrative only; no apply authority implied beyond recorded CLOSED GREEN / HOLD facts.
