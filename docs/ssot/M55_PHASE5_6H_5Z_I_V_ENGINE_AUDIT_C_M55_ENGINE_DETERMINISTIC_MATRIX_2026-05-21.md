# Phase 5-6H-5Z-I-V-ENGINE-AUDIT-C — M55 engine deterministic matrix gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-AUDIT-C** |
| **Title** | **M55 engine deterministic matrix（local only）** |
| **Classification** | **Category 1 / local deterministic verification / no DB / no deploy** |
| **Verdict** | **`ENGINE_DETERMINISTIC_MATRIX_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-C-M55-ENGINE-DETERMINISTIC-MATRIX-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-AUDIT-B** — **`ENGINE_READ_ONLY_AUDIT_GREEN_NO_MUTATION`** |
| **Runner** | `scripts/engine-audit-c-matrix.ts`（`npx tsx scripts/engine-audit-c-matrix.ts`） |

**Execution:** local Node only.** **No** DB / deploy / payment / env change.

---

## B. Global contract（matrix-confirmed）

### B1. Inputs actually used for **stemLaneIndex**

| Field | `/core` stem | `/dtr` + fulfillment | Notes |
|-------|--------------|----------------------|-------|
| **birthDate**（civil `YYYY-MM-DD`） | **yes** | **yes** | Sole stem driver |
| **birthTime** | **no** | **no** | `/core` UI uses `buildCoreResult({ birthDate })` only |
| **country / birthplace** | **no** | **no** | Pipeline API can set boundary；stem unchanged |
| **nickname** | **no** | **copy only** | DTR section text |
| **節入り / 旧暦 tables** | **no** | **no** | Not in codebase |

### B2. Inputs used for **/core boundary metadata only**

| Field | Affects `resolveBoundaryContext` | Affects stem |
|-------|-----------------------------------|--------------|
| **birthTime** | **yes**（`fallbackMode`, `dayBoundary` shift if &lt;04:00 when passed to pipeline） | **no** |
| **country / birthplace** | **yes**（`timezoneUsed`, solar/lunar ISO hours） | **no** |
| **1983-02-28 anchor** | **yes**（fixed `anchor-1983-02-28-fixed`） | **no** |

### B3. Route equivalence（same birthDate）

| Surface | Engine | stem source |
|---------|--------|-------------|
| **`/core`** | `buildCoreResult` | `essenceStemLaneIndex(birthDate)` |
| **`/dtr`** | `runDtrEngine` / shelf derive | same |
| **`/dtr/core`** | SSR `runDtrEngine(profile_snapshot)` | same |
| **fulfillment `envelope_json`** | `upsertDtrReportSnapshotAtFulfillment` → `runDtrEngine` | same — **all cases `fulfillmentSameAsDtr: true`** |

---

## C. Deterministic matrix（16 cases）

| ID | birthDate | Extra inputs | stemLane | stemChar | Free hero EN | Free trait JA | Paid `publicTitle` | Mismatch class |
|----|-----------|--------------|----------|----------|--------------|---------------|-------------------|----------------|
| **VC-01** | 1983-02-28 | — | **3** | **丁** | **ANALYST** | 静観分析 | **クリエイター** | `free_hero_vs_paid_ten_stem_diverge` |
| **VC-02a** | 2024-02-03 | 節入り前日 | **3** | 丁 | ANALYST | 静観分析 | クリエイター | diverge |
| **VC-02b** | 2024-02-04 | 節入り当日 | **4** | 戊 | DESIGNER | 調整均衡 | マネージャー | diverge |
| **VC-02c** | 2024-02-05 | 節入り翌日 | **5** | 己 | PRESIDENT | 直観展開 | プロデューサー | diverge |
| **VC-03a** | 2024-01-11 | 旧暦想定① | **0** | 甲 | PLANNER | 堅実構築 | プレジデント | diverge |
| **VC-03b** | 2024-02-10 | 旧暦想定② | **0** | 甲 | PLANNER | 堅実構築 | プレジデント | diverge |
| **VC-04a** | 1990-06-15 | time なし | **7** | 辛 | INFLUENCER | 熱量先導 | デザイナー | diverge |
| **VC-04b** | 1990-06-15 | 03:30 | **7** | 辛 | INFLUENCER | 熱量先導 | デザイナー | diverge |
| **VC-04c** | 1990-06-15 | 12:00 | **7** | 辛 | INFLUENCER | 熱量先導 | デザイナー | diverge |
| **VC-05a** | 1990-06-15 | country JP | **7** | 辛 | INFLUENCER | 熱量先導 | デザイナー | diverge |
| **VC-05b** | 1990-06-15 | country US | **7** | 辛 | INFLUENCER | 熱量先導 | デザイナー | diverge |
| **VC-06** | 1990-06-15 | US + NYC | **7** | 辛 | INFLUENCER | 熱量先導 | デザイナー | diverge |
| **VC-07a** | 2016-02-29 | leap | **7** | 辛 | INFLUENCER | 熱量先導 | デザイナー | diverge |
| **VC-07b** | 1990-02-30 | invalid | — | — | — | — | — | `invalid_input_rejected` |
| **VC-08** | 1992-12-19 | regression | **5** | 己 | PRESIDENT | 直観展開 | プロデューサー | diverge |
| **VC-09** | 2000-01-01 | Y2K | **4** | 戊 | DESIGNER | 調整均衡 | マネージャー | diverge |

**VC-01 detail（golden）:**

| Field | Value |
|-------|--------|
| **coreType** | `TYPE_04` |
| **coreLabel** | 静観分析型 |
| **boundary** | `anchor-1983-02-28-fixed`；`timezoneUsed: Asia/Tokyo` |
| **dtr engineVersion** | `dtr-v1-jdn-day-stem-provisional` |
| **auditDerivation** | `jdn_offset_provisional_v1` |

---

## D. Cross-case findings

| Test | Result | Interpretation |
|------|--------|----------------|
| **節入り前後（VC-02a–c）** | stem **3 → 4 → 5** | **Civil JDN day change only** — not 立春テーブル |
| **旧暦想定日（VC-03a–b）** | both stem **0** | Coincidence on sample dates；**no lunar conversion in code** |
| **birthTime（VC-04a–c）** | stem **stable 7** | **04b** boundary `explicit-birth-time` but **`/core` build ignores birthTime** |
| **TZ JP vs US（VC-05a–b）** | stem **stable 7** | boundary `Asia/Tokyo` vs `UTC` **differs** |
| **海外（VC-06）** | stem **stable 7** | birthplace does not change stem |
| **invalid（VC-07b）** | `M55_ESSENCE_INVALID_BIRTHDATE` | fail-closed |
| **1990-06-15 variants** | `stemStable1990: true` | **confirmed** |
| **fulfillment ≡ dtr** | `allFulfillmentSameAsDtr: true` | envelope stem = live `runDtrEngine` |

---

## E. Mismatch classification

| Class | Count | Meaning |
|-------|-------|---------|
| **`free_hero_vs_paid_ten_stem_diverge`** | **15 / 15 valid cases** | Same **stemLane**；`HERO_VISUAL_PRESET` EN ≠ `TEN_STEM_DISPLAY.publicTitle` |
| **`invalid_input_rejected`** | **1** | VC-07b |
| **`none`** | **0** | No case with matching free hero EN and paid title |

**Not a stem-engine mismatch:** free and paid share **`essenceStemLaneIndex`** — divergence is **Layer3 label tables only**（TL-F7）.

**Additional free-internal mismatch（matrix note）:** e.g. VC-04* — `coreTypeEnTag` **DRIVER** vs hero **INFLUENCER**（`CORE_TYPE_EN_TAG` vs `HERO_VISUAL_PRESET`）.

---

## F. Per-surface result summary（items 8–11）

| # | Surface | Matrix proxy | stem + labels |
|---|---------|--------------|---------------|
| **8** | `/core` | `buildCoreResult` | §C **core** + **hero** columns |
| **9** | `/dtr` | `runDtrEngine` | §C **dtr.publicTitle** |
| **10** | `/dtr/core` | Same as 9 with `profile_snapshot` fields | Identical to row when birthDate/nickname fixed |
| **11** | fulfillment `envelope_json` | Same engine as 9 | `auditMeta.stemLaneIndex` + `fullSections` from `STEM_BODIES[lane]` |

---

## G. Production adequacy recommendation

| Question | Recommendation |
|----------|----------------|
| **「複合占術（節入り・旧暦・時刻・海外）が鑑定 stem を駆動する」** | **NOT SUPPORTED** — remain **BLOCKED** |
| **「provisional JDN civil-date stem が全経路で一貫」** | **SUPPORTED** — matrix GREEN |
| **「free/paid 同一タイプ名で販売」** | **NOT SUPPORTED** — 15/15 label diverge |
| **購入検証 CORE-DTR-VERIFY** | **保留** — use §C **VC-01** expected values（paid **クリエイター**，not 癸/アナリスト） |

---

## H. Human decision points

### Option A — **provisional JDN stem を正式仕様化**

| Pros | Cons |
|------|------|
| Matches deployed code + determinism | Product copy must **stop implying** full 複合占術 on stem |
| Fast path to VERIFY / CORE-DTR-C | Calendar experts may reject |
| TL-F7 can unify **labels** without changing stem | |

**If A:** Document `STEM_DERIVATION_PROVISIONAL_ID` as Layer2 law；UPDATE marketing；TL-F7 for display parity.

### Option B — **複合占術補正を実装してから本番判定**

| Pros | Cons |
|------|------|
| Aligns with「オリジナル複合占術」 narrative | Large engineering + SSOT + migration |
| May change stem lanes for many birthDates | Re-test all golden vectors + paid snapshots |

**If B:** New gate chain **ENGINE-IMPL-*** before production adequacy GREEN.

**AUDIT-C recommendation:** **Short term → A + TL-F7** for commerce honesty.** **B** as separate product phase with explicit migration policy for existing `profile_snapshot` rows（no silent overwrite — CORE-DTR-A）.

---

## I. AC-EC checklist

| ID | Result |
|----|--------|
| **AC-EC-01** | **PASS** — 16-case matrix executed |
| **AC-EC-02** | **not_run** — `core-regression` HTTP（optional Human）；local spotcheck `runEssenceSpotcheck` includes 1983-02-28 |
| **AC-EC-03** | **PASS** — fulfillment ≡ `runDtrEngine` for all valid rows |
| **AC-EC-04** | **PASS** — VC-03 marked civil-only；no lunar SSOT in repo |
| **AC-EC-05** | **PASS** — no production DB |

---

## J. Reproduce

```bash
npx tsx scripts/engine-audit-c-matrix.ts > /tmp/engine-audit-c.json
```

Machine-readable output: `{ summary, rows }` — **no PII**.

---

## K. No-mutation statement

- **No** production DB / deploy / payment / env
- Script added under `scripts/` for reproducibility only

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-C-M55-ENGINE-DETERMINISTIC-MATRIX-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-B-…`** | Code audit |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-AUDIT-A-…`** | Planning |
