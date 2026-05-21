# Phase 5-6H-5Z-I-V-ENGINE-VERIFY-A — Composite v2 verification planning（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-VERIFY-A** |
| **Title** | **Composite astrology v2 verification planning** |
| **Classification** | **Category 1 / verification planning / docs-only / no-mutation** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_VERIFICATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-VERIFY-A-COMPOSITE-V2-VERIFICATION-PLANNING-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Code anchors** | B5 **`1675cf4`** · B6 **`f5f26e2`** on `origin/work/home-cluster` |

**This gate defines the verification matrix and stop conditions only.** No deploy, checkout, payment, Production DB write, env change, or CORE-DTR-VERIFY resume.

---

## B. Prior gate chain（recorded GREEN / NO_DEPLOY）

| Gate | Verdict | Notes |
|------|---------|--------|
| **B1** | Calendar bundle ingest GREEN | `lib/m55/calendar/**` + manifest |
| **B2** | Pipeline + **GOLDEN_1983_02_28_V2** GREEN | GX-01 in unit tests |
| **B3-D-R** | Production DDL GREEN | additive columns only |
| **B4 / B4-R** | Fulfillment write GREEN_NO_DEPLOY | flag **default off** |
| **B5 / B5-R** | Profile + checkout metadata GREEN_NO_DEPLOY | checkout **block** when incomplete |
| **B6 / B6-R** | Stored envelope route GREEN_NO_DEPLOY | SSR `runDtrEngine` rerun **removed** on `/dtr/core` |

| Constraint | Status |
|------------|--------|
| **Runtime** | **未反映** until deploy |
| **Production adequacy** | **BLOCKED** |
| **CORE-DTR-VERIFY** | **HOLD** |

---

## C. Verification matrix（normative catalog）

**Authority:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_ENGINE_SPEC_C_COMPOSITE_ASTROLOGY_GOLDEN_MATRIX_AND_CALENDAR_TABLE_SSOT_2026-05-21.md` §D–F.

**Execution artifact（VERIFY-A execution gate — not this gate）：** `docs/audit/ENGINE_VERIFY_MATRIX_RESULTS_YYYYMMDD.json`

### C1. Local deterministic matrix（pipeline）

| Order | caseId | Scope | Pass criteria | Current automation |
|-------|--------|-------|---------------|-------------------|
| **1** | **GX-01** / **GOLDEN_1983_02_28_V2** | `runM55CompositeStemPipeline` | stem **9** / **癸** / paid **アナリスト** / `calculationMode: full` / `engineVersion: m55-composite-stem-v2` | **`pipeline.golden.test.ts`** — **pass** at B6 commit |
| **2** | **GX-02a–c** | 立春帯（2024-02-03〜05） | Record `stemLaneIndex`/`stemChar` at VERIFY execution；`solarTermKey` in `boundaryMetadata`；**BC-01** | **planned** — `scripts/engine-verify-matrix.ts` or extended test file |
| **3** | **GX-03a–b** | 旧暦月境界 | `lunarMonthKey` visible；stem computed at VERIFY | **planned** |
| **4** | **GX-04a–c** | time / unknown / 23:30 boundary | `unknown_time_noon` / `full` / **M55_DAY_BOUNDARY_V1** (+1 day for 23:30) | **GX-04c partial** — `pipeline.golden.test.ts` day-boundary test |
| **5** | **GX-05a–b** | JP vs US TZ | `tzSource` reflects country；stem may differ from JP baseline | **planned** |
| **6** | **GX-06** | US 23:30 local boundary | Same boundary rule in non-JP TZ | **planned** |
| **7** | **GX-07** | invalid date | `M55_COMPOSITE_INVALID_BIRTHDATE` | **planned** |
| **8** | **GX-08–09** | out of range | `M55_COMPOSITE_DATE_OUT_OF_RANGE` | **partial** — pipeline golden out-of-range test |
| **9** | **GX-10** | legacy snapshot read | **No recompute**；stored bytes；legacy stem **3** / **丁** when `engine_version` NULL | **`storedEnvelopeRead.test.ts`** + static `/dtr/core` source check |
| **10** | **GX-11** | new v2 purchase path | `engine_version: m55-composite-stem-v2` on INSERT only | **staging only** — after flag + deploy + webhook |

**GX-02〜09 numeric expected values:** filled at **ENGINE-VERIFY-A execution** (first run records baseline JSON). Planning gate locks **procedure**, not computed 2024 stems.

---

## D. Route / read-path static verification（B6）

| # | Check | Pass | Fail | Automation |
|---|-------|------|------|------------|
| R1 | `/dtr/core` uses **`resolveStoredEnvelopeRead`** | import present；no `runDtrEngine` in `app/dtr/core/page.tsx` | SSR rerun restored | **`storedEnvelopeRead.test.ts`** reads page source |
| R2 | Display SSOT = **`envelope_json`** from DB | `DtrFullReader` gets `read.envelope` | Re-derive on each request | code review + unit mock |
| R3 | **`getDtrReportSnapshot`** selects `engine_version`, `engine_context_json` | fields on row type | missing columns in select | `dtrDraftDb.ts` + tsc |
| R4 | Legacy fork (`engine_version` **NULL**) | `mode: legacy`；stored envelope returned | v2 validation applied to legacy | **`storedEnvelopeRead.test.ts`** |
| R5 | v2 fork (`m55-composite-stem-v2`) | context stem matches `envelope.auditMeta` | `v2_stem_mismatch` | unit test |
| R6 | Fail-closed redirect | `missing_envelope` / `invalid_envelope` / `v2_context_missing` / `v2_stem_mismatch` → recovery path | silent fallback or JDN display | unit + log event `stored_envelope_read_fail` |
| R7 | Owned **`/dtr` shelf** | `deriveDtrShelfStemDisplayFromSnapshot`；not `ProfileRepository` when owned | client profile overrides purchased stem | `dtrShelfAccess.ts` + `DtrShelfPanel` owned branch |
| R8 | **`/core`** | unchanged profile preview（no stored-envelope swap in this track） | accidental DTR envelope on free core | manual scope check |

---

## E. Fulfillment write verification（B4）

| # | Check | Pass | Fail | Automation |
|---|-------|------|------|------------|
| F1 | Flag **off** (`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED` unset) | legacy `runDtrEngine` JDN path on new INSERT | v2 columns written without flag | **`fulfillmentWrite.test.ts`** |
| F2 | Flag **on** (staging / Human env only) | v2 pipeline → envelope + `engine_context_json` consistent | stem mismatch in builder | **`fulfillmentWrite.test.ts`** + builder asserts |
| F3 | **INSERT only** | `.insert()` on new row | UPDATE/DELETE/backfill in `dtrDraftDb` | source grep test in **`fulfillmentWrite.test.ts`** |
| F4 | Existing snapshot | early return；row untouched | UPDATE of legacy rows | code review `dtrDraftDb.ts` |
| F5 | Incomplete v2 profile | `M55_COMPOSITE_INCOMPLETE_PROFILE`；no silent JDN v2 write | JDN fallback in v2 builder | **`fulfillmentWrite.test.ts`** |

**Staging execution:** requires explicit env GO + deploy — **not VERIFY-A planning**.

---

## F. My Page / checkout metadata verification（B5）

| # | Check | Pass | Fail | Automation |
|---|-------|------|------|------------|
| P1 | `birthTime` optional | saved when set | required incorrectly | **`profileCheckout.test.ts`** |
| P2 | Empty time requires **`birthTimeUnknown`** | gate pass | checkout allowed without unknown | unit |
| P3 | **`country`** required；default **JP** | enrich on save | missing country in metadata | unit |
| P4 | **`timezone`** derived from country | `Asia/Tokyo` for JP | missing TZ in metadata | unit + enrich helper |
| P5 | v2 incomplete → checkout block | **400** `composite_profile_incomplete`；`PurchaseButton` pre-fetch block | checkout starts without v2 fields | unit + route logic |
| P6 | Stripe metadata completeness | `inputVersion`, `engineVersionCandidate`, v2 profile fields | nickname+date only on DTR | **`stripeCheckoutMetadata`** unit |
| P7 | `extra_json` sync | birthTime/country/timezone in draft | email/userId in extra_json | unit asserts exclusion |

---

## G. Pass / fail criteria（VERIFY-A execution verdict）

| Tier | Condition | Verdict |
|------|-----------|---------|
| **P0 RED** | **GX-01** / **GOLDEN_1983_02_28_V2** fail | **`COMPOSITE_ASTROLOGY_V2_VERIFY_RED`** — stop all cutover |
| **P0 RED** | **GX-10** fail（legacy snapshot mutation or recompute） | same |
| **P0 RED** | Stored envelope mismatch on read path（R5/R6） | same |
| **P0 RED** | v2 builder uses JDN-only stem when flag on（F5） | same |
| **P0 RED** | v2 incomplete profile bypasses checkout（P5） | same |
| **P1 AMBER** | GX-02〜09 not yet executed but GX-01 GREEN | planning complete；execution gate pending matrix script |
| **GREEN** | All **P0** checks pass on Human machine + **28/28** (or post-matrix N/N) unit tests + calendar verify | **`COMPOSITE_ASTROLOGY_V2_VERIFY_EXECUTION_GREEN`** |

---

## H. Deploy前 stop conditions（hard）

Do **not** enable fulfillment flag, deploy preview/production cutover, or resume **CORE-DTR-VERIFY** if any:

| ID | Stop condition |
|----|----------------|
| **SC-01** | **GX-01** fail（stem ≠ 9 / 癸 / アナリスト） |
| **SC-02** | **GX-10** fail — existing Production snapshot rows show recompute or stem drift |
| **SC-03** | `/dtr/core` SSR **`runDtrEngine`** rerun detected |
| **SC-04** | v2 read accepts row with **`engine_context_json` ≠ `envelope.auditMeta` stem** |
| **SC-05** | Silent fallback to **`essenceStemLaneIndex(birthDate)`** in v2 pipeline or v2 fulfillment |
| **SC-06** | **`dtrDraftDb`** contains UPDATE/DELETE/backfill on `dtr_report_snapshots` |
| **SC-07** | DTR checkout proceeds without v2-complete profile（metadata gate bypass） |
| **SC-08** | Calendar bundle verify fails or manifest checksum mismatch |
| **SC-09** | Production adequacy still **BLOCKED** without Human sign-off |
| **SC-10** | **CORE-DTR-VERIFY** still **HOLD** |

---

## I. Required commands（local / static — this planning gate)

Run on **`work/home-cluster`** at **`f5f26e2`** or later:

```bash
# 1) Calendar integrity
node scripts/calendar/verify-m55-calendar-bundle.mjs

# 2) Unit matrix (current automation — 28 tests)
npx tsx --test \
  lib/m55/compositeStem/pipeline.golden.test.ts \
  lib/m55/compositeStem/fulfillmentWrite.test.ts \
  lib/m55/compositeStem/profileCheckout.test.ts \
  lib/m55/compositeStem/storedEnvelopeRead.test.ts

# 3) Typecheck
npx tsc --noEmit

# 4) Whitespace
git diff --check
```

**VERIFY-A execution adds:**

```bash
# Planned — not run in VERIFY-A planning gate
npx tsx scripts/engine-verify-matrix.ts
# → docs/audit/ENGINE_VERIFY_MATRIX_RESULTS_YYYYMMDD.json
```

---

## J. Runtime / deploy gate prerequisites

| Prerequisite | Owner gate | Notes |
|--------------|------------|-------|
| **VERIFY-A execution GREEN** | **ENGINE-VERIFY-A-EXEC**（or sub-gate） | GX-01 + GX-10 + route tests + 28/28 |
| **GX-02〜09 baseline JSON** | VERIFY execution | Records expected stems for 2024 fixtures |
| **Preview deploy** | **ENGINE-DEPLOY-PRECHECK** | commit on `work/home-cluster`；no main |
| **Env: fulfillment flag** | Human GO only | `M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED=true` on staging first |
| **Staging purchase** | **ENGINE-VERIFY-B** or **CORE-DTR-VERIFY** resume | webhook + checkout + profile v2 + flag on |
| **Production cutover** | separate Human gate | adequacy unblock + snapshot firewall |

**Order:** planning（本条）→ **VERIFY execution** → **DEPLOY-PRECHECK** → staging deploy → staging E2E → Production planning.

---

## K. No-mutation boundary

| Boundary | VERIFY-A planning |
|----------|-------------------|
| deploy / redeploy | **no** |
| main push | **no** |
| checkout / payment / webhook replay | **no** |
| Production DB write / SQL | **no** |
| snapshot UPDATE/DELETE | **no** |
| env / Stripe / Clerk / Slack | **no** |
| CORE-DTR-VERIFY resume | **no** |

---

## L. Next gate

| Priority | Gate | Scope |
|----------|------|-------|
| **1** | **ENGINE-VERIFY-A-EXEC**（or **ENGINE-VERIFY-A execution**） | Run §I commands + GX-02〜09 matrix script；emit results JSON |
| **2** | **ENGINE-DEPLOY-PRECHECK** | Branch tip, env checklist, flag default, Vercel project isolation |
| **3** | Staging E2E | flag on + checkout + webhook + GX-11（post-deploy） |

**Do not** conflate VERIFY-A planning with staging purchase — **B5/B6 checkout block** remains until profile + deploy + flag align.
