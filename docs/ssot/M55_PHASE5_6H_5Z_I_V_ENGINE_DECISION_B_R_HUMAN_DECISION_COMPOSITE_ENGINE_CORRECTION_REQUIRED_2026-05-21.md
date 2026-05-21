# Phase 5-6H-5Z-I-V-ENGINE-DECISION-B-R — Human decision: composite engine correction required before production adequacy（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-DECISION-B-R** |
| **Title** | **Human decision to require corrected composite astrology engine before production adequacy** |
| **Classification** | **Category 2 / Human decision record / docs-only / no-mutation** |
| **Verdict** | **`HUMAN_DECISION_COMPOSITE_ENGINE_CORRECTION_REQUIRED_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-DECISION-B-R-HUMAN-DECISION-COMPOSITE-ENGINE-CORRECTION-REQUIRED-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-AUDIT-A** planning；**ENGINE-AUDIT-B** `ENGINE_READ_ONLY_AUDIT_GREEN`；**ENGINE-AUDIT-C** `ENGINE_DETERMINISTIC_MATRIX_GREEN` |

**Execution:** Human decision recording only.** **No** code / DB / deploy / checkout / env / Stripe / Clerk / Slack.

---

## B. Human decision record（authoritative）

**Human selects Option B** — **複合占術補正を実装してから本番適正判定**（ENGINE-AUDIT-C §H Option B）。

**Rejected for production adequacy（explicit）:** **Option A** — provisional JDN `birthDate`-only stem as **final** Layer2 law without composite corrections.

### B1. Mandatory engineering direction

| # | Human decision | Mandatory |
|---|----------------|-----------|
| **D1** | **Do not** treat provisional JDN civil-date-only stem as production-adequate for **M55 composite astrology** | **yes** |
| **D2** | Connect **節入り / 旧暦 / birthTime / timezone / overseas birthplace** into **stem determination** | **yes** |
| **D3** | Extend **My Page** intake to capture fields required by new stem law | **yes** |
| **D4** | Change **snapshot generation input contract** at fulfillment to match new canonical input | **yes** |
| **D5** | Redesign **`/core`**, **`/dtr`**, **fulfillment**, **`dtr_report_snapshots`**, and **tests** under a **versioned engine contract** | **yes** |
| **D6** | **Existing paid `profile_snapshot` rows — no overwrite** on profile drift or engine migration | **yes** |
| **D7** | New engine ships as **versioned contract**（`engineVersion` / `contractVersion` bump；explicit migration policy） | **yes** |
| **D8** | **Production adequacy verdict** remains **BLOCKED** until corrected engine is implemented and verified | **yes** |

### B2. What remains valid from audit chain

| Finding | Status after this decision |
|---------|---------------------------|
| **Provisional JDN determinism**（same input → same output within `jdn_offset_provisional_v1`） | **Acknowledged GREEN** — does not elevate to composite production adequacy |
| **Free/paid same `essenceStemLaneIndex` today** | **Acknowledged** — label tables still diverge（TL-F7 separate） |
| **ENGINE-AUDIT-C VC-01** | **1983-02-28 → lane 3 丁**；free **ANALYST**；paid **クリエイター** under **current** engine only |
| **癸・アナリスト on 1983-02-28** | **Not expected** under current code；future law TBD in **ENGINE-SPEC-A** |

---

## C. Evidence basis（ENGINE-AUDIT-C summary — no new execution）

| Observation | Source |
|-------------|--------|
| Only **birthDate** affects **stemLaneIndex** | ENGINE-AUDIT-B/C |
| **birthTime / country / birthplace / nickname** do not affect stem | ENGINE-AUDIT-C matrix |
| **節入り / 旧暦** not connected to stem | ENGINE-AUDIT-B `canonicalBoundary` trace |
| **1983-02-28** paid DTR = **クリエイター**（lane 3 丁） | ENGINE-AUDIT-C VC-01 |
| **癸・アナリスト** not produced for that date in current code | ENGINE-AUDIT-C §C |
| **Provisional JDN consistency** | **GREEN**（ENGINE-AUDIT-C） |
| **M55 composite astrology production adequacy** | **BLOCKED**（ENGINE-AUDIT-A/C） |

---

## D. Production adequacy status

| Field | Value |
|-------|--------|
| **Status label** | **`BLOCKED_UNTIL_COMPOSITE_ENGINE_CORRECTION`** |
| **Meaning** | No Human or SSOT may assert **「本番として複合占術適正」** until post-correction verification gate passes |
| **Unblocks when** | Corrected engine implemented + local matrix + read-path audit + Human sign-off（gates TBD after **ENGINE-SPEC-A**） |

**Still allowed without unblock:**

- Provisional-engine **determinism** maintenance
- **CORE-DTR** policy work（mutable `/core` vs immutable snapshot）
- Ops monitors（AS-B1 cadence）
- Docs / planning gates

**Not allowed without unblock:**

- Marketing / LP claims implying full composite stem law is live
- Closing ENGINE production-adequacy checklist
- **CORE-DTR-VERIFY** payment execution under old type expectations（see §E）

---

## E. CORE-DTR-VERIFY status

| Gate | Status | Reason |
|------|--------|--------|
| **CORE-DTR-VERIFY-A** | **Recorded**（plan exists） | — |
| **CORE-DTR-VERIFY-B〜E** | **`HOLD`** | Human decision **D8** + **D6** — purchase E2E must not validate **provisional** engine as final composite contract |
| **Criteria using 癸/アナリスト for 1983-02-28** | **`SUPERSEDED`** | Use ENGINE-AUDIT-C truth until **ENGINE-SPEC-A** defines post-correction golden vector |

**Resume condition for VERIFY chain:** **ENGINE-SPEC-A** + implementation gate GREEN + updated pass/fail matrix for golden dates.

---

## F. No-delete / no-overwrite CONTROL（binding on future implementation）

| CONTROL ID | Rule |
|------------|------|
| **CONTROL-ENGINE-DEC-B-01** | **No DELETE** on `dtr_report_snapshots`, `entitlement_rights`, `entitlements`, `one_time_fulfillments`, Stripe evidence |
| **CONTROL-ENGINE-DEC-B-02** | **No UPDATE** of `profile_snapshot` or `envelope_json` to match **current** profile or **new** engine silently |
| **CONTROL-ENGINE-DEC-B-03** | Engine migration → **new purchase lane** or **versioned read path**；old rows remain readable as **purchase-time contract** |
| **CONTROL-ENGINE-DEC-B-04** | UI **soft-hide** ≠ DB delete（CORE-DTR-A/B preserved） |
| **CONTROL-ENGINE-DEC-B-05** | Repair runners must not strip entitlements on drift |

**Cross-reference:** CORE-DTR-A **CONTROL-CORE-DTR-01〜06** remain in force.

---

## G. Option A vs B — decision log

| Option | Label | Human |
|--------|-------|-------|
| **A** | Formalize provisional JDN as Layer2 law；TL-F7 labels | **Rejected** for production adequacy |
| **B** | Implement composite corrections first | **Selected** |

**Rationale（Human-aligned）:** Product narrative **M55オリジナル複合占術** requires stem inputs beyond civil JDN；audit proved gap；commerce honesty requires **BLOCK** until corrected.

---

## H. Next gates（ordered）

| Priority | Gate | Role |
|----------|------|------|
| **1** | **`5Z-I-V-ENGINE-SPEC-A`** | **Composite astrology stem law specification planning** — 節入り・旧暦・時刻・TZ・海外；golden vectors；versioned contract |
| **2** | **ENGINE-SPEC-B-R**（optional） | Human sign-off on stem law SSOT |
| **3** | **ENGINE-IMPL-A**（TBD name） | My Page intake + pipeline + fulfillment input contract |
| **4** | **ENGINE-IMPL-B** | `/core` / `/dtr` / reader / tests |
| **5** | **ENGINE-VERIFY-A** | Post-correction deterministic matrix + production adequacy review |
| **6** | **CORE-DTR-VERIFY-B〜E** | Resume **HOLD** lifted only after §E resume condition |

**Explicitly deferred:** TL-F7 label parity may proceed in parallel but **does not** satisfy **D2** or unblock production adequacy.

---

## I. No-mutation statement

- **No** code / DB / snapshot / entitlement / checkout / payment / webhook / env / deploy / main push
- **No** Stripe / Clerk / Slack
- **No** raw user_id / email / session / secret in SSOT

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-DECISION-B-R-HUMAN-DECISION-COMPOSITE-ENGINE-CORRECTION-REQUIRED-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-C-M55-ENGINE-DETERMINISTIC-MATRIX-001`** | Matrix basis |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-B-M55-ORIGINAL-COMPOSITE-ASTROLOGY-ENGINE-READ-ONLY-CODE-AUDIT-001`** | Code trace |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-A-M55-ORIGINAL-COMPOSITE-ASTROLOGY-ENGINE-CONSISTENCY-AUDIT-PLAN-001`** | Planning |
