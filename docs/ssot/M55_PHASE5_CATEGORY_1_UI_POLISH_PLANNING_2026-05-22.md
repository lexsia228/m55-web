# Phase CATEGORY-1-UI-POLISH-PLANNING — Category 1 UI polish planning（2026-05-22）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **CATEGORY-1-UI-POLISH-PLANNING** |
| **Title** | **Post terminal hygiene push — Category 1 UI / copy / page polish planning** |
| **Classification** | **Category 1 / read-only audit / planning only / no-mutation** |
| **Verdict** | **`CATEGORY_1_UI_POLISH_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260522-CATEGORY-1-UI-POLISH-PLANNING-001`** |
| **Date** | **2026-05-22** |
| **Branch** | **`main`** @ **`c08a1f7`**（origin synced） |
| **Terminal hygiene** | **`HYGIENE_PUSH_EXECUTION_COMMIT_PUSH_EXEC_COMMIT_PUSH_EXEC_GREEN_TERMINAL_PUSH_OBSERVED_NO_RUNTIME_MUTATION`** |
| **Release-readiness anchor** | **R7-R** maintained |
| **VERIFY-C** | **HOLD** |
| **Hygiene meta-record chain** | **CLOSED** — no recursive push-result commits |

**Planning only.** **No code edit · commit · push · deploy · DB · env · payment · VERIFY-C · delete.**

---

## B. Inspected files（read-only）

### Pages / routes

| Path | File |
|------|------|
| `/` | `app/page.tsx` |
| `/core` | `app/core/page.tsx` · `components/core/CoreEssencePanel.tsx` |
| `/dtr` | `app/dtr/page.tsx` · `components/dtr/DtrShelfPanel.tsx` |
| `/dtr/lp` | `app/dtr/lp/page.tsx` |
| `/dtr/core` | `app/dtr/core/page.tsx` · `components/dtr/DtrFullReader.tsx` |
| `/my` | `app/my/page.tsx` · `components/my/MyPanel.tsx` |

### Copy / components

| Area | Files |
|------|-------|
| Core public copy | `components/core/corePublicCopy.ts` · `CoreEntryReportCTASection.tsx` · `CoreTypeEaseSection.tsx` · `CoreCompositionMapSection.tsx` · `CoreCurrentFocusSection.tsx` · `CoreRadarSection.tsx` |
| DTR labels | `lib/m55/dtrProductLabels.ts` |
| Reply room | `components/dtr/ConsultRoom.tsx` |
| Delete / soft-hide | `components/my/SavedReportDeleteDialog.tsx` · `lib/m55/dtrSavedReportDeleteCopy.ts` |
| Access | `lib/m55/dtrShelfAccess.ts` · `lib/m55/dtrOwnershipGate.ts` |

### SSOT reference（read-only）

| Doc | Role |
|-----|------|
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_HYGIENE_PUSH_EXECUTION_COMMIT_PUSH_EXEC_COMMIT_PUSH_EXEC_2026-05-22.md` | Terminal push |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_RELEASE_READINESS_OPS_MONITOR_R7_2026-05-22.md` | R7-R anchor |
| `.cursor/rules/m55-ten-qualities.mdc` | Public typography / copy constraints |

**Note:** Uncommitted `M55_PHASE5_6H_5Z_I_V_HYGIENE_PUSH_EXECUTION_COMMIT_PUSH_EXEC_COMMIT_PUSH_EXEC_COMMIT_PUSH_PLANNING_2026-05-22.md` exists locally — **do not treat as restart of meta-record chain**; optional discard or fold into Category 1 work later.

---

## C. Current UX map

| Page | User state | Primary CTA | Next step | Risk / confusion |
|------|------------|-------------|-----------|------------------|
| **`/`** | Public · logged-out | 「商品ページへ（/dtr/lp）」 | LP purchase/legal | **No free `/core` entry** · product name **「DTR Core Static V1」** is technical · journey **free→paid not visible** |
| **`/core`** | Free essence（profile saved） | 「本質の読み解きを見る →」→ `/dtr/lp` | Paid LP | Free layer not labeled **「無料の見取り図」** at hero · paid block says **保存版レポート** — direction OK · section **「このタイプは」** risks type-boxing |
| **`/dtr`** | anon / locked / owned / expired | Card CTA → LP · open · processing | LP or `/dtr/core` | **Entry Report** EN badge when unowned vs **本質の読み解き** JP elsewhere · owned meta **「タイプ」** label |
| **`/dtr/lp`** | signin / purchase / open / pending / recovery / expired | Mode-specific CTA | checkout · sign-in · `/dtr/core` · processing | **保存版** badge + benefits clear · owned hides price — good · recovery copy **再購入不要** — good for soft-hide |
| **`/dtr/core`** | logged-out | **307 → `/dtr/lp`** | LP | Correct fail-closed · no ownership implied |
| **`/dtr/core`** | owned + snapshot | Read + consult room | Reply ticket flow | **03 読み方 / TOC** dense · reply copy mostly grounded · additional reply checkout **in UI**（HOLD on live test） |
| **`/my`** | signed-out | Sign in | auth | OK |
| **`/my`** | signed-in | 「開く」→ `/dtr/core` · delete trigger | reader · soft-hide | Delete UI present（Production delete **HOLD** — UI is user-initiated soft-hide path only） · **「購入済み」** vs shelf **「保存済み」** wording mix |

**Primary flow assessment:** **Partially clear** — `/core`→`/dtr/lp`→purchase→`/dtr/core`→reply is implementable, but **`/` storefront bypasses free core** and uses developer product naming.

---

## D. Category 1 issue list

| ID | Page | Sev | Type | Current problem | Proposed direction | Safe without DB/env/payment? |
|----|------|-----|------|-----------------|-------------------|------------------------------|
| **C1-P0-001** | `/core` | **P0** | copy | **`このタイプは、こう出やすい`** (`CoreTypeEaseSection`) | Replace with **傾向・場面** framing（例：「こう出やすい場面」）— no **タイプ** label | **yes** |
| **C1-P0-002** | `/dtr` | **P0** | copy | Owned card meta label **「タイプ」** + stem title | Use **資質** or drop meta row · align with public label rules | **yes** |
| **C1-P0-003** | `/` | **P0** | navigation / copy | Stripe storefront shows **DTR Core Static V1** · only link **`/dtr/lp`** | Add quiet **無料の見取り図（/core）** path · use **本質の読み解き** JP name · keep legal minimal | **yes**（public page — ten-qualities scope） |
| **C1-P1-001** | `/core` | **P1** | copy | **解析軸 · 主軸/副軸 · 本質ラベル** jargon in multiple sections | Replace with **生活語**（距離感・段取り・疲れやすさ等） per ten-qualities rule | **yes**（hero frozen — **avoid hero block**; sections below hero OK per core freeze rule? Hero is frozen — polish **non-hero** sections first) |
| **C1-P1-002** | `/core` | **P1** | hierarchy | Free vs paid boundary: page reads as one continuous product | Add short **free preview vs 保存版（有料）** band before paid CTA strip | **yes** |
| **C1-P1-003** | `/dtr` · `/dtr/lp` | **P1** | consistency | **Entry Report** EN vs **本質の読み解き** JP split | Unify JP-first; EN auxiliary aria-only where needed | **yes** |
| **C1-P1-004** | `/dtr/core` | **P1** | copy | Reply room lacks explicit **off-topic / 別テーマ不可** line in compose | Add one line: **このレポートの章に沿った深掘り** · not general chat | **yes** |
| **C1-P1-005** | `/dtr/core` | **P1** | copy | Wallet line **合計5件** vs legacy thread comment **MAX_CREDITS=3** in code | Audit SSOT vs UI · align user-facing copy to **付属1 + 追加最大4** | **yes**（copy/doc; code comment fix optional） |
| **C1-P1-006** | `/my` | **P1** | consistency | **購入済み** badge vs shelf **保存済み** | Pick one owned-state word for saved report | **yes** |
| **C1-P2-001** | `/dtr/core` | **P2** | layout | **03 読み方** TOC: roman + name + desc per row — visually busy on mobile | Collapse desc on narrow · or stepper-style TOC | **yes** |
| **C1-P2-002** | `/core` | **P2** | mobile / CTA | Paid CTA strip at bottom of long scroll | Sticky quiet CTA or mid-page anchor link to 保存版 section | **yes**（non-hero） |
| **C1-P2-003** | `/dtr` | **P2** | copy | Overline **M55 Reports** (EN) | JP editorial overline | **yes** |
| **C1-P2-004** | `/` | **P2** | consistency | Minimal legal storefront tone vs premium `/dtr/lp` | Accept as Stripe-review surface OR add one line bridging to `/core` | **yes** |

**Not flagged as issues（audit pass）:**

- `/dtr/core` logged-out **307 → `/dtr/lp`** — correct
- LP **recovery / 再購入不要** — soft-hide aligned
- No UI text found implying **VERIFY-C authorized** or **Production delete batch**
- Paid saved report framed as **保存版 / 章立て / durable** in LP + reader intro
- Reply themes are **chapter-grounded life domains**（役割・距離・消耗等）

---

## E. Must-fix before soft release（minimal）

| Priority | ID | Action |
|----------|-----|--------|
| 1 | **C1-P0-001** | Remove **「このタイプ」** heading on `/core` |
| 2 | **C1-P0-002** | Remove **「タイプ」** meta label on `/dtr` owned card |
| 3 | **C1-P0-003** | **`/`** storefront: JP product name + optional **`/core`** free entry link |
| 4 | **C1-P1-002** | Explicit **free preview vs 保存版** band on `/core`（non-hero） |
| 5 | **C1-P1-004** | Reply compose: **章に沿った深掘り · off-topic不可** one-liner |

**Scope cap:** **copy + light layout only** · **no** checkout/webhook/VERIFY-C/DB/env changes in first implementation wave.

---

## F. Can follow after release

| ID | Note |
|----|------|
| **C1-P1-001** | Broader **解析軸→生活語** pass on `/core` sections（respect hero freeze） |
| **C1-P1-003** · **C1-P1-006** | Label harmonization **Entry Report / 保存済み / 購入済み** |
| **C1-P2-001** · **C1-P2-002** | TOC mobile simplification · CTA stickiness |
| **C1-P2-003** · **C1-P2-004** | Shelf overline · storefront tone polish |
| Deeper paid/reply UX | Additional reply purchase UX refinement（**live checkout still Human GO**） |

---

## G. Proposed execution gates

| Gate | Scope | Authorized in gate? |
|------|-------|---------------------|
| **CATEGORY-1-UI-POLISH-A** | This planning SSOT + issue registry commit（docs-only） | commit docs only · **no push** unless separate GO |
| **CATEGORY-1-UI-POLISH-B** | **P0 + must-fix P1** UI/copy implementation（target files above） | code edit · **no** payment/webhook/VERIFY-C/DB |
| **CATEGORY-1-UI-POLISH-C** | Local / preview smoke · logged-out routes · copy regression grep | read-only + local dev · **no** live checkout |
| **CATEGORY-1-UI-POLISH-D** | Production push **planning only** | planning · **no push** in D |
| **OPS-MONITOR-R8** | Parallel cadence track · not blocker for B | Human counts · separate |

**Hygiene terminal rule preserved:** Successful **CATEGORY-1-UI-POLISH-D EXEC** does **not** require another meta-record-of-push commit if observation PASS.

---

## H. Guardrails

| Rule | Status |
|------|--------|
| No checkout/payment/webhook in planning gate | **confirmed** |
| No DB write | **confirmed** |
| No env change | **confirmed** |
| VERIFY-C HOLD | **confirmed** |
| Do not mutate/delete paid snapshots in polish | **confirmed** — delete UI is existing soft-hide; **Production delete HOLD** |
| `/home` frozen | **not in Category 1 target list** — do not edit home cluster for this track |
| `/core` hero frozen | **Polish B must skip `CoreHeroSection` + hero CSS block** |
| No ranking/scores/%/notification UI | **audit: none added in plan** |
| Hygiene meta-record recursion | **STOP** |

---

## I. No-mutation（this gate）

| Action | Status |
|--------|--------|
| code edit | **no** |
| commit | **no**（unless separate COMMIT gate） |
| push / deploy | **no** |
| DB write | **no** |
| env change | **no** |
| live checkout / payment / webhook | **no** |
| VERIFY-C | **no** |
| Production delete | **no** |
| raw ID / secret | **no** |

---

## J. Recommended next gate

| Priority | Gate |
|----------|------|
| **1（推奨）** | **`CATEGORY-1-UI-POLISH-A-COMMIT`** — stage this planning SSOT（optional: fold or discard uncommitted hygiene planning doc） |
| **2** | **`CATEGORY-1-UI-POLISH-B`** — implement **§E must-fix** |
| **3** | **`OPS-MONITOR-R8`** — parallel cadence（not blocker） |

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-22 | Planning GREEN — read-only audit complete |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260522-CATEGORY-1-UI-POLISH-PLANNING-001`** | **本条** |
| **`M55-EVID-20260522-HYGIENE-PUSH-EXECUTION-COMMIT-PUSH-EXEC-COMMIT-PUSH-EXEC-COMMIT-PUSH-EXEC-001`** | Terminal hygiene handoff |
| **`M55-EVID-20260522-5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R7-R-001`** | Release-readiness anchor |
