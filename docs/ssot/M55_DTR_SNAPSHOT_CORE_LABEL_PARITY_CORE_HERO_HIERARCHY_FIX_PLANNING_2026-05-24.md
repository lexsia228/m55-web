# Phase DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-FIX-PLANNING — /core hero UX hierarchy（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-FIX-PLANNING** |
| **Title** | **Unify perceived primary diagnosis across /core · /dtr · /dtr/core** |
| **Classification** | **Category 2 / read-only planning / no Production mutation** |
| **Verdict** | **`DTR_SNAPSHOT_CORE_LABEL_PARITY_CORE_HERO_HIERARCHY_FIX_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-FIX-PLANNING-001`** |
| **Date** | **2026-05-24** |
| **Production baseline** | **`6c7f56a`** — label parity deployed · hierarchy mismatch remains |
| **Prior exec** | **`DTR_SNAPSHOT_CORE_LABEL_PARITY_COMMIT_EXEC_GREEN`** @ **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-LABEL-PARITY-COMMIT-EXEC-001`** |
| **¥500追加返書 smoke** | **HOLD** until post-fix consistency re-poll **GREEN** |

---

## B. Observed hierarchy failure（Human re-poll @ `6c7f56a`）

| Surface | Perceived primary | Secondary | User verdict |
|---------|-------------------|-----------|--------------|
| **`/dtr` saved card** | **資質 / プロデューサー** | title line + `displayOneLine` | **correct** |
| **`/dtr/core`** | **資質 / プロデューサー** + essence line | meta strip | **correct** · opens **PASS** · ticket **1** |
| **`/core` hero** | **直観展開** (large) | **分析類型 / プロデューサー** (small eyebrow) | **FAIL** — two diagnoses |

**PRESIDENT:** largely cleared by **`6c7f56a`**. Remaining issue is **visual hierarchy**, not missing `publicTitle`.

---

## C. Corrected root cause

| Prior (wrong) | Corrected |
|---------------|-----------|
| Missing `TEN_STEM publicTitle` | **`publicTitle` is rendered but subordinate** |
| Catalog split only | **`TYPE_CATALOG.coreLabel` observation trait promoted as hero “主役”** |
| Needs DB / snapshot fix | **Display-only `/core` hero hierarchy + copy wiring** |

**Mechanism (code):**

1. `resolveCorePublicStemDisplay(result).publicTitle` → **`corePosterHeroEyebrowEn`** (~8.5–11px, muted).
2. `observationTraitNameFromCoreLabel(result.coreLabel)` → **`corePosterMainHeadlineName`** (~22–32px serif) — e.g. **`直観展開`** from **`直観展開型`** (`TYPE_06` @ lane 5 for **1992-12-19**).
3. CSS comment explicitly marks main headline as **主役名（観測特性ラベル由来）** — inverted vs DTR **`資質 / {publicTitle}`** pattern.
4. Semantic **`<h1>`** is English **Blueprint of {nickname}** — not the Japanese diagnosis; users anchor on largest JP text in lower block.

**Data:** `CoreResult` already carries **`stemLaneIndex`** + **`coreLabel`**; no snapshot mutation required.

---

## D. Planning Q&A

### Q1. Largest visible main result node?

**`.corePosterMainHeadlineName`** inside **`.corePosterMainHeadline`** — binds **`observationTraitName`** (e.g. **直観展開**), not `publicTitle`.

### Q2. Is `TYPE_CATALOG.coreLabel` rendered as H1-equivalent primary?

**Indirectly yes** — via **`result.coreLabel`** → **`observationTraitNameFromCoreLabel`** → largest JP hero line. Not the document `<h1>` (that is **Blueprint of**), but **perceived diagnosis H1**.

### Q3. Where is `publicTitle`, why subordinate?

**`stemDisplay.publicTitle`** in **`.corePosterHeroEyebrowEn`** — smallest text in diagnosis stack; uppercase styling; below trait headline visually and semantically.

### Q4. Target hierarchy（selected strategy）

**Strategy ID:** **`P-CORE-HERO-HIERARCHY-01`**

| Layer | Copy | DOM / class (proposed) |
|-------|------|-------------------------|
| **Eyebrow kind** | **分析類型** | `.corePosterHeroEyebrowKind` (unchanged label word) |
| **Eyebrow value** | *(optional slim)* lane hint or omit duplicate | keep **only kind** OR **資質** alignment — see §E |
| **Primary headline (largest JP)** | **`{publicTitle}`** e.g. **プロデューサー** | **`.corePosterMainHeadlineName`** ← **`stemDisplay.publicTitle`** |
| **Secondary badge** | **特質性** | `.corePosterMainHeadlineBadge` |
| **Secondary value** | **`{observationTraitName}`** e.g. **直観展開** | new subordinate span OR swap badge row order + downscale trait typography |
| **Description** | **`stemDisplay.displayOneLine`** | **`.corePosterHeroLead`** — aligns DTR **`displayOneLine`** |

**Safest launch H1 copy:** **`プロデューサー`** alone (no **の本質** suffix) — exact match to DTR **`publicTitle`**.

### Q5. Keep **直観展開** on hero?

**Yes — secondary only** on hero: **`特質性` + `直観展開`** (or **`観測特性：直観展開`** in compact form). **Do not** remove TYPE observation from hero entirely; **do not** promote to primary. Moving below hero is **optional** fallback if secondary still competes after CSS pass — **not preferred** for launch.

### Q6. Tests / grep guarantees（1992-12-19）

| ID | Assertion |
|----|-----------|
| **LH-01** | `buildCoreResult('1992-12-19')` → `resolveCorePublicStemDisplay().publicTitle === 'プロデューサー'` |
| **LH-02** | `observationTraitNameFromCoreLabel(core.coreLabel) === '直観展開'` |
| **LH-03** | **CoreHeroSection.tsx** source: **`corePosterMainHeadlineName`** must reference **`stemDisplay.publicTitle`** (or shared hero primary helper), **not** `observationTraitName` alone |
| **LH-04** | grep: **`corePosterMainHeadlineName`** must **not** bind **`observationTraitName`** as sole primary without `publicTitle` co-primary |
| **LH-05** | grep: no **`PRESIDENT`** / **`HERO_VISUAL_PRESET`** regression |
| **LH-06** | **1983-02-28 v2:** primary **`アナリスト`** · secondary **`静観分析`** preserved |
| **LH-07** | DTR shelf / engine: **`publicTitle`** unchanged (**LP-01 / LP-06** regression) |

### Q7. Scope: components only vs data shape?

| Area | Change? |
|------|---------|
| **`CoreHeroSection.tsx`** | **Yes** — swap primary/secondary bindings |
| **`CoreExperience.module.css`** | **Yes** — hero **lower** typography only (trait demoted; `publicTitle` promoted) |
| **`publicStemDisplay.ts`** | **Optional** — `resolveCoreHeroPrimaryLabel()` / `resolveCoreHeroSecondaryTrait()` helpers |
| **`CoreResult` / `buildCoreResult` / snapshots** | **No** |
| **`DtrShelfPanel` / `DtrFullReader`** | **No** unless eyebrow **資質** alignment chosen (optional) |
| **`typeCatalog.ts`** | **No** — internal axis seed only |

**Freeze note:** `/core` poster hero is **frozen** per **`m55-core-hero-freeze.mdc`**. Implementation requires **explicit hero reopen** scoped to **lower diagnosis block** (not Blueprint-of `<h1>`, not background video).

### Q8. ¥500追加返書 HOLD?

**Yes — HOLD** until **post-fix `DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R` re-poll GREEN**.

---

## E. Exact copy / layout decision（launch packet）

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary large text** | **`stemDisplay.publicTitle`** | Matches DTR **資質 / プロデューサー** |
| **Reject for primary** | **直観展開** · **プロデューサーの本質** · **プロデューサー型の本質** | Avoid second diagnosis · avoid extra words |
| **Eyebrow** | **`分析類型`** (kind only) OR **`分析類型 / プロデューサー`** demoted to single small line above primary | Prevent duplicate **プロデューサー** twice same size — if eyebrow keeps full pair, **remove `publicTitle` from eyebrow** when promoted to main headline |
| **Secondary** | **`特質性`** badge + **`直観展開`** | Satisfies policy §3 |
| **Lead** | **`stemDisplay.displayOneLine`** | Same sentence as DTR card body essence |
| **English `<h1>`** | **Blueprint of {nick}** | Unchanged (brand frame) |
| **DTR surfaces** | **No change** | Already correct |
| **DB / snapshot** | **No change** | Display-only |

**Recommended eyebrow after fix:** **`分析類型`** only (no repeated **プロデューサー** in eyebrow) — primary carries diagnosis name once.

---

## F. Affected files（implementation gate）

| File | Action |
|------|--------|
| `components/core/CoreHeroSection.tsx` | Swap primary/secondary text sources; lead → `displayOneLine` |
| `components/core/CoreExperience.module.css` | Retype sizes: `.corePosterMainHeadlineName` = primary; trait line secondary; optional demote `.corePosterHeroEyebrowEn` |
| `lib/m55/publicStemDisplay.ts` | Optional hero label helpers |
| `lib/m55/publicStemDisplay.test.ts` | Add **LH-03–LH-06** |
| `docs/ssot/M55_SYSTEM_SSOT.md` | Checkpoint on implementation (separate commit) |

**Out of scope:** `typeCatalog.ts`, `buildCoreResult.ts`, DTR components, SQL, env, Stripe.

---

## G. Expected post-fix visual

| Route | Expectation |
|-------|-------------|
| **`/core`** | Large **プロデューサー** · small **特質性 / 直観展開** · lead = **人や企画の芽を…** · **PRESIDENT** absent |
| **`/dtr`** | Unchanged — **資質 / プロデューサー** |
| **`/dtr/core`** | Unchanged — opens · ticket **1** |
| **Consistency** | **PASS** (user-visible) |

---

## H. Hard prohibitions confirmation

checkout retry · second payment · webhook replay · manual grant · repair runner · DB write · snapshot UPDATE · SQL mutation · VERIFY-C · env / Stripe change · Production DELETE · code edit in this gate — **all confirmed no**.

---

## I. Recommended next gate

| Gate | Purpose |
|------|---------|
| **`DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-FIX-IMPLEMENTATION`** | Human GO + **hero reopen** · component/CSS fix |
| **`DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-COMMIT-EXEC`** | isolated commit · deploy |
| **`DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R` re-poll** | signed-in visual **PASS** |
| **`FRESH-ADDITIONAL-REPLY-SMOKE`** | after consistency **GREEN** only |
