# Phase 5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R6-RECONCILIATION — Baseline reconciliation（2026-05-22）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R6-RECONCILIATION** |
| **Title** | **R5-R vs R6 aggregate baseline reconciliation** |
| **Classification** | **Category 1 / read-only SSOT inspection / no-mutation** |
| **Verdict** | **`RELEASE_READINESS_OPS_MONITOR_R6_RECONCILIATION_GREEN_R5_BASELINE_CORRECTION_REQUIRED_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260522-5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R6-RECONCILIATION-001`** |
| **Date** | **2026-05-22** |
| **Prior planning** | **`R6_R_BASELINE_CORRECTION_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260522-R6-R-BASELINE-CORRECTION-PLANNING-001`** |

**Read-only reconciliation.** No DB · no push · no deploy.

---

## B. Finding

| Item | R5-R chain | R6 Human poll | Reading |
|------|------------|---------------|---------|
| **failed total / 24h** | **0 / 0** | **7 / 0** | R5-R failed **0** = **incorrect transcription** |
| **DTR snapshots visible** | **104** | **6** | R5-R **104** = **invalid baseline chain** |
| **entitlements / OTF / wallets / ledgers** | **104 / 104 / 103 / 103** | **10 / 10 / 10 / 17** | R6 ≡ **AP-S-R** inventory |
| **cadence STOP** | claimed GREEN | **PASS**（24h **0** · dup **0** · schema **1/1/1**） | R6 valid for ops monitor |
| **data_integrity** | claimed GREEN | **YELLOW** | known historical gap **10 vs 6** · failed **7** backlog |

**Likely cause:** **`stale_ssot_transcription` + `incorrect_baseline_chain`**（R1-R〜R5-R）.** **Not supported:** **`actual_data_loss_signal`**.

---

## C. Authoritative baseline after correction

**Release-readiness ops anchor:** **OPS-MONITOR-R6-R**（not R5-R @ **`879d955`**）.

| Metric | R6 authoritative |
|--------|------------------|
| failed total / 24h | **7 / 0** |
| categories | internal **6** · missing_client_ref **1** |
| entitlements_dtr | **10** |
| snapshots total / visible / hidden | **6 / 6 / 0** |
| OTF / wallets / ledgers | **10 / 10 / 17** |
| dup / schema | **0** · **1/1/1** |
| data_integrity | **YELLOW** |
| active bleeding | **no** |

---

## D. R1-R〜R5-R handling

| Rule | Action |
|------|--------|
| **Delete body** | **no** |
| **Verdict banner** | **`incorrect_baseline_chain_superseded_by_R6`** |
| **Streak** | **5 consecutive GREEN** — **not inherited** by R6-R |
| **Delta use** | **invalid after 2026-05-22 reconciliation** |

---

## E. HOLD（unchanged）

| Item | Status |
|------|--------|
| VERIFY-C | **HOLD** |
| HYGIENE-PUSH | **HOLD** until **R6-R-BASELINE-CORRECTION-EXEC** close + refresh |

---

## F. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-22 | Reconciliation GREEN — correction required |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260522-5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R6-RECONCILIATION-001`** | **本条** |
| **`M55-EVID-20260522-R6-R-BASELINE-CORRECTION-PLANNING-001`** | Planning source |
| **`M55-EVID-20260522-5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R6-R-001`** | R6-R close（EXEC） |
