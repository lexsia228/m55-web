# M55 Pair P5 — Preview Apply SSOT Checkpoint

Status: **`PAIR_P5_PREVIEW_3_OF_3_CLOSED_GREEN` / PREVIEW / NO_REPLAY** (docs-only narrative freeze)  
Checkpoint date: **2026-10-26** (final P5-3 closeout revision, same calendar day)  
Lane: Pair P5 owned-state / checkout / fulfill Preview remote apply  
Human lane authorization: **M55 PAIR P5 — Preview SSOT Checkpoint最小反映 GO**; P5-3 apply + independent POST **Human GO** (one-shot, 2026-10-26 JST)

---

## Authority precedence (this document)

1. `docs/ssot/M55_EXECUTION_STATE.json` — **sole executable CURRENT/NEXT**; **not edited** by this checkpoint.
2. `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` — Production Pair real-payment E2E (**CLOSED_GREEN / PRODUCTION / NO_REPLAY**); unchanged by this checkpoint.
3. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md` — high-cost rerun rules; **not edited** by this checkpoint.
4. **This file** — durable **Preview apply** closeout for **P5-1, P5-2, and P5-3**; replay prohibitions; **does not** authorize Production Pair deployment, public capability launch, or `main` merge.

This checkpoint is **not** a substitute for machine contracts, receipt ledgers, or execution-state progression. It records Human-verified Preview facts at the checkpoint date.

**Preview DB closure ≠ Production authorization:** Three-of-three Preview apply + POST green on `sbogwyzldjxxouhqtpnq` does **not** by itself authorize Production Pair runtime deployment, Production migration apply, Stripe live-payment re-test, or global executable gate advancement.

---

## Current Pair Preview status (authoritative for this document)

| Milestone | Status |
|---|---|
| P5-1 Preview identity apply + independent POST | **CLOSED GREEN / NO_REPLAY** |
| P5-2 Preview checkout apply + independent POST | **CLOSED GREEN / NO_REPLAY** |
| P5-3 Preview fulfill apply + independent POST | **CLOSED GREEN / NO_REPLAY** |
| **Pair Preview lane (3/3)** | **`PAIR_P5_PREVIEW_3_OF_3_CLOSED_GREEN`** |

---

## Apply-time source identity (P5-3 one-shot; not a permanent repo pin)

P5-3 authorized apply was executed against the following **apply-time** Git identity. Post-apply docs commits may advance branch `HEAD`; **do not** treat a later docs-only `HEAD` as retroactively changing apply evidence unless a new invalidator requires re-apply.

| Field | Apply-time value (P5-3) |
|---|---|
| Git `HEAD` commit (apply-time source) | `2aceab541faa21f1853f19b49d32a0eba932f412` |
| Git `HEAD^{tree}` (apply-time) | `41d55a9db30f4bb43fd54424bd14577bf0ac91f7` |
| Callable step | `PAIR_P5_FULFILL_20261013` |
| Migration version / file | `20261013110000` — `supabase/migrations/20261013110000_m55_pair_fulfill_tuple_advisory_v1.sql` |
| P5-3 operational receipt | Consumed **once** on Preview dedicated receipt ledger (one-use claim) |
| Human evidence observation time (P5-3 apply + POST) | **2026-10-26 22:20:12 JST** |

Earlier P5-1 / P5-2 apply episodes used their own Human-pinned `HEAD` values at those sessions (including `c47ae83e…` era for P5-2 signing prep); this checkpoint does **not** collapse those pins into a single commit.

---

## Observation snapshot (non-permanent)

Values below are **observed at checkpoint authoring / closeout time** only. They are **not** CURRENT gate pins and **must** be re-observed after any merge, rebase, Preview DB reset, or new Preview session.

| Field | Observed value (2026-10-26 closeout) |
|---|---|
| Git worktree path | `/Users/lexsia/Documents/M55_WORKTREE-pair-p5-owned-state-identity-v1` |
| Git branch | `feat/m55-pair-p5-owned-state-identity-v1` |
| Open PR (observed) | [#251](https://github.com/lexsia228/m55-web/pull/251) — `feat(pair): finalize P5 owned-state identity and checkout safeguards` |
| Supabase Preview organization / project | `m55-preview` / `m55-soul-preview` |
| Supabase Preview project ref | `sbogwyzldjxxouhqtpnq` |
| Apply-time source `HEAD` (P5-3) | `2aceab541faa21f1853f19b49d32a0eba932f412` |

---

## Evidence provenance and judgment scope

### Sources (class)

| Class | Role |
|---|---|
| Human-operated Preview apply sessions | P5-1, P5-2, and P5-3 dedicated-target binding receipts, Human attestations, and authorized one-shot apply paths on Preview only |
| Independent POST verification | Post-apply read-only DB probes on a **distinct** connection from the apply executor; not executor self-report alone |
| Preview catalog / schema observation | `supabase_migrations.schema_migrations` history, RPC `md5(prosrc)`, ACL, advisory-lock presence, P5-1/P5-2 preservation checks |
| Repository pins (read-only) | Frozen step IDs, migration filenames, and executor authority in `lib/m55/previewRemoteApply/*` at apply-time `HEAD` |
| Local prep artifacts (non-repo) | Mac `~/Downloads/00_LATEST_*` Human signing / one-shot runner artifacts — **issuance / transport only**; apply authority is Human GO + operational receipt |

### Checkpoint judgment scope (what this doc claims)

- **In scope:** Preview database state after **exactly one** successful apply each for P5-1, P5-2, and P5-3; independent POST green for each; consolidated migration counts; P5-3 fulfillment RPC fingerprint and security contract; receipt ledger consumption for P5-3 operational binding.
- **Out of scope:** Production runtime mutation; Stripe live payment replay; rewriting historical P5-1 Executor **source** HOLD semantics; advancing `M55_EXECUTION_STATE.json`; implying Production deploy or public launch.

### Evidence time basis

Facts consolidated **2026-10-26 (UTC+9)** from completed Preview apply + POST work on project ref `sbogwyzldjxxouhqtpnq`, including P5-3 closeout evidence through **22:20:12 JST**. Independent ChatGPT read-only Preview confirmation aligned on migration counts, RPC body fingerprint, ACL, advisory lock, `search_path`, and P5-3 receipt-ledger row count. No secrets, connection strings, or receipt private material are stored in this document.

---

## Closed GREEN — P5-1 Preview identity apply

| Item | Record |
|---|---|
| Callable step | `PAIR_P5_IDENTITY_20261009` |
| Migration version / file | `20261009000000` — `supabase/migrations/20261009000000_m55_pair_owned_state_identity_v1.sql` |
| Apply surface | Supabase **Preview** only (`sbogwyzldjxxouhqtpnq`) |
| Apply + independent POST | **CLOSED GREEN** (2026-10-26) |
| Source code note | **Do not alter** historical HOLD outcomes on the original P5-1 Executor paths in source. **Independent Preview DB POST** for P5-1 remains **CLOSED GREEN** and is **not** contradicted by legacy executor HOLD narrative in code. |

**NO_REPLAY:** P5-1 Preview apply, receipt re-consumption for the same operational binding, and Human attestation re-issuance for the same authorization identity are **prohibited** unless a documented invalidator in `M55_HIGH_COST_EVIDENCE_LEDGER.md` or a new Human-authorized migration version requires it.

---

## Closed GREEN — P5-2 Preview checkout apply

| Item | Record |
|---|---|
| Callable step | `PAIR_P5_CHECKOUT_20261010` |
| Migration version / file | `20261010000000` — `supabase/migrations/20261010000000_m55_pair_checkout_reservation_v1.sql` |
| Apply count on Preview | **Exactly one** successful apply recorded for `20261010000000` |
| Apply + independent POST | **CLOSED GREEN** (2026-10-26) |

**NO_REPLAY:** Same prohibitions as P5-1 for re-apply, receipt re-consumption, and signature re-issuance tied to the same operational receipt / authorization.

---

## Closed GREEN — P5-3 Preview fulfill apply

| Item | Record |
|---|---|
| Callable step | `PAIR_P5_FULFILL_20261013` |
| Migration version / file | `20261013110000` — `supabase/migrations/20261013110000_m55_pair_fulfill_tuple_advisory_v1.sql` |
| Apply count on Preview | **Exactly one** successful apply recorded for `20261013110000` |
| Executor launches (authorized one-shot) | **1** |
| CLI exit | **0** |
| COMMIT response class | **DEFINITIVE_COMMIT_ACK** |
| Post-commit classification | **DEFINITELY_COMMITTED** |
| Mutation statements executed | **3** |
| Executor fresh read-only POST | **GREEN** |
| Independent read-only POST (distinct connection) | **GREEN** |
| Apply + independent POST (lane) | **CLOSED GREEN** (2026-10-26 **22:20:12 JST**) |

### P5-3 POST contract (Preview observed)

| Check | Result |
|---|---|
| `schema_migrations` total / distinct / duplicates | **25** / **25** / **0** |
| P5-1 `20261009000000` present | **Once** |
| P5-2 `20261010000000` present | **Once** |
| P5-3 `20261013110000` present | **Once** |
| Fulfillment RPC `public.m55_fulfill_compatibility_report_v1(uuid, text, text)` | Present; `md5(prosrc)` **`18a4736e1db1625712aae5b056c7650c`** |
| Advisory transaction lock in function body | **GREEN** |
| `SECURITY DEFINER` | **GREEN** |
| `search_path` | **GREEN** |
| `service_role`-only EXECUTE ACL (public fulfill RPC) | **GREEN** |
| P5-1 owned-state identity preservation | **GREEN** (pinned POST) |
| P5-2 checkout reservation preservation | **GREEN** (pinned POST) |
| P5-3 operational receipt ledger | **Consumed once** for the authorized binding |

**NO_REPLAY:** P5-3 Preview apply, P5-3 operational receipt re-consumption, P5-3 Human attestation re-issuance for the same authorization identity, and P5-3 executor re-launch are **prohibited** unless a documented invalidator or new Human-authorized migration version requires it.

---

## Preview schema inventory (post P5-1 + P5-2 + P5-3)

Observed on Preview after all three applies (closeout consolidation):

| Check | Observed result |
|---|---|
| `schema_migrations` history rows (Pair P5 lane window) | **25** entries, **25** distinct, **duplicate 0** |
| P5-1 / P5-2 / P5-3 frozen versions | Each present **exactly once** |
| P5-2 checkout columns (verified set) | **4** reservation columns preserved |
| `CHECK` constraints (verified set) | **6** validated |
| Pending-tuple partial unique index | Present as verified |
| Checkout reservation RPCs (verified set) | **5** / **5** |
| Fulfillment RPC + security contract | Per P5-3 POST table above |

Exact object names live in apply-session evidence outside SSOT; this checkpoint records **counts and pass/fail class** only.

---

## Checkpoint revision — superseded narrative (historical only)

An **earlier revision** of this same dated checkpoint (same file path, 2026-10-26) recorded P5-3 as **NOT APPLIED** and **HOLD** while P5-1 and P5-2 were CLOSED GREEN (24 migration rows). That narrative is **superseded** by the current **`PAIR_P5_PREVIEW_3_OF_3_CLOSED_GREEN`** state above after the authorized P5-3 one-shot apply and independent POST episode.

**Do not** treat the superseded HOLD paragraph as current Preview truth. **Do not** replay P5-3 apply to “refresh” evidence absent an invalidator.

---

## Production Pair real payment (unchanged authority)

Production Pair real-payment E2E remains **CLOSED_GREEN / PRODUCTION / NO_REPLAY** per `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md`.

**Prohibited at this checkpoint:** Production Pair real-payment E2E re-test, webhook replay for proof, or treating Preview **3/3** apply green as Production payment authorization, Production migration apply, or deploy GO.

---

## Global prohibitions (checkpoint lane)

Unless a future SSOT names an **exact invalidating dependency**:

1. Re-apply P5-1, P5-2, or P5-3 migrations on Preview (`20261009000000`, `20261010000000`, `20261013110000`).
2. Re-consume dedicated operational receipts or authorization IDs already consumed for apply.
3. Re-issue Human Ed25519 attestations / operational receipts for the same P5-1 / P5-2 / P5-3 authorization binding.
4. Re-launch the P5-3 (or P5-1 / P5-2) authorization-gated real executor for the same receipt / apply episode.
5. `main` merge, Production deploy, or broad repo audit unrelated to an explicit next lane task — **not authorized by this Preview closeout alone**.

---

## Allowed invalidators (re-verification or new episode required)

Re-observation or a **new** bounded verification episode is required when **any** of:

| Trigger | Required action |
|---|---|
| Preview project ref change or Preview DB reset / branch rebuild | Full Preview migration history + POST suite for **all affected** applied steps |
| New commit changes P5-1 / P5-2 / P5-3 migration SQL, step authority, or POST probe contracts | Targeted local tests + **new** Human apply authorization; **no** silent reuse of consumed receipts |
| Dedicated receipt consumption ledger or migration classifier semantics change | Ledger + receipt preflight review before any apply |
| Duplicate or drift in `schema_migrations` for frozen versions | STOP apply; Human triage |
| PR #251 merged to `main` with additional Pair P5 commits | Re-record observation snapshot; **no** automatic Preview re-apply |

A new chat, new agent, or missing local Downloads artifact is **not** by itself an invalidator.

---

## Document maintenance

| Field | Value |
|---|---|
| Document path | `docs/ssot/M55_PAIR_P5_PREVIEW_APPLY_CHECKPOINT_2026-10-26.md` |
| Supersedes | Earlier **same-day** revision holding P5-3 NOT APPLIED (narrative only, same path) |
| Subordinate to | `M55_EXECUTION_STATE.json`, Production E2E closeout 2026-10-07 |
| Pair Preview status token | **`PAIR_P5_PREVIEW_3_OF_3_CLOSED_GREEN`** |

**STOP** — checkpoint narrative only; Preview 3/3 closure does not advance executable state or authorize Production deploy.
