# Phase CATEGORY-1-UI-POLISH-SECOND-PASS-PLANNING — Category 1 UI polish 第2パス planning（2026-05-22）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **CATEGORY-1-UI-POLISH-SECOND-PASS-PLANNING** |
| **Title** | **Post must-fix deploy + R8 stable — Category 1 UI polish second pass planning** |
| **Classification** | **Category 1 / read-only audit / planning only / no-mutation** |
| **Verdict** | **`CATEGORY_1_UI_POLISH_SECOND_PASS_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260522-CATEGORY-1-UI-POLISH-SECOND-PASS-PLANNING-001`** |
| **Date** | **2026-05-22** |
| **Branch / deploy** | **`main`** @ **`6ce7002`** · Production synced |
| **Prior must-fix** | **`CATEGORY_1_UI_POLISH_D_EXEC_GREEN_PUSHED_OBSERVED_NO_PRODUCTION_MUTATION`** @ **`M55-EVID-20260522-CATEGORY-1-UI-POLISH-D-EXEC-001`** |
| **Release-readiness** | **R8-R counts stable vs R7-R**（Human attestation · **no R8-R meta commit in this track**） |
| **VERIFY-C** | **HOLD** |
| **Hygiene / meta-record chain** | **CLOSED** — **do not reopen** push-result / R8 close commit chain |

**Planning only.** **No code edit · commit · push · deploy · DB · env · payment · VERIFY-C · delete.**

**Explicit:** **No R8-R close commit created in this gate.**

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | `git status --short` | **`M55_SYSTEM_SSOT.md` modified** · untracked Category 1 / R8 / hygiene SSOT ×5 · `supabase/.temp/` |
| 2 | `supabase/.temp/` staged | **no** |
| 3 | `.vercel/` · `.cursor-preview-cache/` staged | **no** |
| 4 | Uncommitted prior SSOTs staged | **no** — this gate adds **second-pass planning SSOT only** |
| 5 | R8-R meta commit | **not created** |

---

## C. Must-fix pass 1 — completed（DO NOT DISTURB）

| ID | Fix | File(s) | Deploy |
|----|-----|---------|--------|
| **C1-P0-001** | **「このタイプ」** removed | `CoreTypeEaseSection.tsx` | **`6ce7002`** |
| **C1-P0-002** | **「タイプ」→「資質」** | `DtrShelfPanel.tsx` | **`6ce7002`** |
| **C1-P0-003** | **`/`** JP product + **`/core`** free path | `app/page.tsx` | **`6ce7002`** |
| **C1-P1-002** | Free vs **保存版** boundary band | `CoreFreeSavedBoundarySection.tsx` · `CoreEssencePanel.tsx` · `CoreExperience.module.css` | **`6ce7002`** |
| **C1-P1-004** | Reply **章 grounded / off-topic不可** | `ConsultRoom.tsx` · `ConsultRoom.module.css` | **`6ce7002`** |

**Frozen / do not edit in pass 2 unless Human reopens:**

- `components/core/CoreHeroSection.tsx` + hero CSS block in `CoreExperience.module.css`
- `app/home/**` · `components/home/**`

---

## D. Inspected files（read-only · second pass）

### Live Category 1 surfaces（post-deploy）

| Route | Primary files |
|-------|----------------|
| **`/`** | `app/page.tsx` |
| **`/core`** | `app/core/page.tsx` · `CoreEssencePanel.tsx` · `CoreFreeSavedBoundarySection.tsx` · `CoreRadarSection.tsx` · `CoreHowM55ReadsSection.tsx` · `CoreTendencyLoadSection.tsx` · `CoreTypeEaseSection.tsx` · `CoreEntryReportCTASection.tsx` · `CoreLockedState.tsx` · `corePublicCopy.ts` |
| **`/dtr`** | `DtrShelfPanel.tsx` · `DtrCatalogStrip.tsx` · `lib/m55/dtrProductLabels.ts` |
| **`/dtr/lp`** | `app/dtr/lp/page.tsx`（via LP components） |
| **`/dtr/core`** | `DtrFullReader.tsx` · `ConsultRoom.tsx` |
| **`/my`** | `MyPanel.tsx` · `SavedReportDeleteDialog.tsx` |

### Label SSOT

| File | Role |
|------|------|
| `lib/m55/dtrProductLabels.ts` | **本質の読み解き** · **Entry Report**（EN auxiliary）· **保存版** · **保存済み** |

### Not mounted on live `/core`（audit only · lower priority）

| File | Note |
|------|------|
| `CoreCompositionMapSection.tsx` | **解析軸 / 主軸 / 副軸 / 本質ラベル** jargon · **not in `CoreEssencePanel`** |
| `CoreCurrentFocusSection.tsx` | **スコア {n}** display · **not mounted** |
| `CoreAxisBarsSection.tsx` | Numeric score + **% bar** · **not mounted** |
| `CoreAffinityRankingSection.tsx` | Ranking name + scores · **not mounted** |

---

## E. Remaining issue list（second pass）

| ID | Page | Sev | Type | Problem | Proposed direction |
|----|------|-----|------|---------|-------------------|
| **C1-SP-P1-003** | `/dtr` · `/my` | **P1** | consistency | Unowned card pill **Entry Report** · shelf **M55 Reports** · My **Report** EN mix vs **`dtrProductLabels` JP-first** | Unowned: JP primary visible · EN aria-only · shelf overline JP editorial |
| **C1-SP-P1-005** | `/dtr/core` | **P1** | copy | Wallet UI **「合計5件まで」** vs code **`MAX_CREDITS=3`** vs limit copy **付属1+追加4** | Single user-facing cap story aligned to SSOT wallet model |
| **C1-SP-P1-006** | `/dtr` · `/my` | **P1** | consistency | Shelf hint **購入済み** · My badge **購入済み** vs pill **`保存済み`** | Adopt **`LABEL_STATE_OWNED`（保存済み）** for owned artifact state |
| **C1-SP-P1-001** | `/core` · `/dtr/core` | **P1** | copy | Live **`CoreRadarSection`**: **5つの軸** · reader viz **主軸/副軸** · unmounted sections **解析軸** jargon | **生活語 / 視点** framing · hero-adjacent radar copy only（**not hero block**） |
| **C1-SP-P1-007** | `/core` | **P1** | flow | **`CoreLockedState`** sends users to **`/home`** · free journey from **`/`** points **`/core`** | Quiet copy + link that preserves **無料→保存版** story without `/home` redesign |
| **C1-SP-P2-001** | `/dtr/core` | **P2** | layout | **03 読み方** TOC cards dense on mobile（roman + title + desc） | Collapse desc · tighter tap targets · `@media` in reader CSS |
| **C1-SP-P2-002** | `/core` | **P2** | hierarchy | Long scroll before **`CoreEntryReportCTASection`** | Mid-page anchor or quiet sticky **保存版** jump（**non-hero**） |
| **C1-SP-P2-003** | `/dtr` | **P2** | copy | Overline **M55 Reports** | JP overline（例：**レポート** / **保存版の棚**） |
| **C1-SP-P2-004** | `/` | **P2** | tone | Legal-minimal storefront vs premium LP | One bridging line only · **no** Stripe-review structure change |
| **C1-SP-P2-005** | `/core`（latent） | **P2** | compliance | Unmounted **`CoreAxisBarsSection` / `CoreCurrentFocusSection`** expose scores · **%** bars | If ever mounted: remove numeric score UI per workspace rule · keep band language only |

---

## F. Must-fix before soft release vs after-release

### Must-fix before soft release（second pass wave 1）

Scope: **copy + label consistency only** · **no** payment/webhook/VERIFY-C/DB/env.

| Priority | ID | Rationale |
|----------|-----|-----------|
| 1 | **C1-SP-P1-005** | Purchaser confusion on reply ticket limits |
| 2 | **C1-SP-P1-006** | Owned state vocabulary split (**購入済み** vs **保存済み**） |
| 3 | **C1-SP-P1-003** | JP product identity on shelf / My / unowned card |

**Cap:** ~**6–8 files** · **`dtrProductLabels.ts` as SSOT anchor** · touch **`ConsultRoom.tsx`** only for wallet lines.

### After soft release（wave 2+）

| ID | Note |
|----|------|
| **C1-SP-P1-001** | Broader **軸→生活語** on live radar + reader viz |
| **C1-SP-P1-007** | Locked-state journey polish |
| **C1-SP-P2-001** · **P2-002** | TOC mobile · CTA stickiness |
| **C1-SP-P2-003** · **P2-004** | Shelf overline · storefront tone |
| **C1-SP-P2-005** | Latent score components — only if remounted |

---

## G. Recommended execution sequence

| Step | Gate | Scope |
|------|------|-------|
| **1** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-B`** | Implement **§F wave 1**（P1-003 · P1-005 · P1-006） |
| **2** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-C`** | `tsc` · copy grep · logged-out smoke · no live checkout |
| **3** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-D`** | Push planning only |
| **4** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-D-EXEC`** | Human GO + push + observation |
| **5** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-E`** | Wave 2 P1/P2（optional · separate Human GO） |
| **—** | **`OPS-MONITOR-R9`** | Cadence after deploy · **not** blocker for B |

**Meta / hygiene rules preserved:**

- **No** R8-R close commit as part of UI polish chain
- **No** push-result meta-record after successful EXEC
- Next **durable commit** = **second-pass B implementation** or optional **this planning SSOT commit**（Human GO · separate gate）

---

## H. Flow clarity assessment（post must-fix）

| Stage | Current | Second-pass target |
|-------|---------|-------------------|
| **Public **`/`** | Free **`/core`** + paid LP visible | Maintain · optional **P2-004** tone bridge |
| **Free **`/core`** | Boundary band + radar sections + bottom CTA | **P2-002** mid-page **保存版** cue |
| **Locked **`/core`** | Profile gate · **/home** link | **P1-007** align with **`/`** free story |
| **Paid **`/dtr/lp`→purchase→`/dtr/core`** | LP + reader OK | **P1-005** wallet clarity |
| **Owned labels **`/dtr` · `/my`** | Mixed EN/JP · **購入済み/保存済み** | **P1-003 · P1-006** harmonize |
| **Reply room** | Chapter-grounded line present（pass 1） | Wallet cap copy only |

---

## I. Guardrails

| Rule | Status |
|------|--------|
| Do not disturb pass-1 fixes（§C） | **confirmed** |
| `/core` hero freeze | **confirmed** |
| `/home` freeze | **confirmed** — not in wave 1 targets |
| No scores / % / ranking UI in new work | **confirmed** · audit **P2-005** if latent components remounted |
| No checkout / webhook / VERIFY-C / DB / env | **confirmed** |
| No R8 / terminal meta commit | **confirmed** |
| Production delete | **HOLD** |

---

## J. No-mutation（this gate）

| Action | Status |
|--------|--------|
| code edit | **no** |
| commit | **no** |
| push / deploy | **no** |
| DB write / env change | **no** |
| live checkout / payment / webhook | **no** |
| VERIFY-C | **HOLD** |
| Production delete | **no** |
| raw ID / secret | **no** |
| R8-R meta commit | **no** |

---

## K. Recommended next gate

| Priority | Gate |
|----------|------|
| **1（推奨）** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-B`** — wave 1 must-fix implementation |
| **2** | **`CATEGORY-1-UI-POLISH-SECOND-PASS-PLANNING-COMMIT`** — optional · stage this SSOT only |
| **3** | **`OPS-MONITOR-R9`** — post-deploy cadence（after future EXEC only） |

---

## L. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-22 | Second-pass planning GREEN — read-only audit complete |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260522-CATEGORY-1-UI-POLISH-SECOND-PASS-PLANNING-001`** | **本条** |
| **`M55-EVID-20260522-CATEGORY-1-UI-POLISH-D-EXEC-001`** | Prior must-fix deploy |
| **`M55-EVID-20260522-CATEGORY-1-UI-POLISH-PLANNING-001`** | Pass 1 planning |
| **`M55-EVID-20260522-5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R8-R-001`** | Cadence anchor（Human · docs uncommitted OK） |
