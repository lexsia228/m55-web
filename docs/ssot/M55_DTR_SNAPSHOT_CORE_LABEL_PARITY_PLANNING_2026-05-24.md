# Phase DTR-SNAPSHOT-CORE-LABEL-PARITY-PLANNING — Free `/core` vs paid DTR public label parity packet（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **DTR-SNAPSHOT-CORE-LABEL-PARITY-PLANNING** |
| **Title** | **Unify public type labels across free `/core` and paid DTR surfaces** |
| **Classification** | **Category 2 / planning only / no-mutation** |
| **Verdict** | **`DTR_SNAPSHOT_CORE_LABEL_PARITY_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-LABEL-PARITY-PLANNING-001`** |
| **Date** | **2026-05-24** |
| **Prior diagnostic** | **`BACKEND_COMMERCE_CONTRACT_C_DTR_SNAPSHOT_CORE_RESULT_CONSISTENCY_R_BLOCKED_RESULT_MISMATCH_NO_MUTATION`** @ **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R-001`** |
| **Cohort context** | **`launch-cohort-primary`** · fulfillment / access **GREEN** · label trust **BLOCKED** |
| **Mutation in this gate** | **no** |

**Planning GREEN.** Taxonomy-only mismatch confirmed · parity strategy **`P-TEN-STEM-PRIMARY-01`** frozen · **display/read-path fix** · **no snapshot DB mutation**.

---

## B. Current position

| Track | State |
|-------|--------|
| **Commerce chain** | Payment · webhook · fulfillment · unlock **GREEN** |
| **Consistency R** | **BLOCKED** — **PRESIDENT / 直観展開** vs **プロデューサー** at **same `stemLaneIndex` 5** |
| **Root class** | **Taxonomy-only** — not engine lane divergence on legacy JDN path |
| **¥500追加返書 smoke** | **HOLD** until parity implementation verified |
| **TL-F7** | **Superseded in scope by this gate** for **Contract-C fresh cohort** priority |

---

## C. Public label parity policy（by surface）

| Surface | Primary public label（after fix） | Stem source | Secondary copy（allowed） |
|---------|-----------------------------------|-------------|---------------------------|
| **Free `/core` hero** | **`TEN_STEM_DISPLAY[L].publicTitle`** | **`essenceStemLaneIndex(birthDate)`** → L | **観測特性：** phrase from **`TYPE_CATALOG[L].coreLabel`** sans **型** suffix · **not** a second diagnosis name |
| **Locked `/dtr` preview card** | **`TEN_STEM_DISPLAY[L].publicTitle`** | v2 complete profile → **`runM55CompositeStemPipeline`** · else generic card | **`displayOneLine`** from **`TEN_STEM_DISPLAY`** |
| **Owned `/dtr` shelf** | **`TEN_STEM_DISPLAY[L].publicTitle`** | **`snapshot.envelope.auditMeta.stemLaneIndex`**（unchanged read path） | Row label **資質 /** retained |
| **`/dtr/core` saved report hero** | **`TEN_STEM_DISPLAY[L].publicTitle`** | **stored envelope**（unchanged） | **資質 /** row · body from **`envelope_json`** |
| **Reply room context** | **No separate type name** | Inherit **`/dtr/core`** snapshot stem · do not re-derive from live profile | Ticket / consult copy only |

**Chrome labels（unchanged）：**

| Label | Surfaces |
|-------|----------|
| **分析類型** | **`/core` hero section chrome only** |
| **資質 /** | **DTR shelf + reader** |
| **特質性** | **`/core` hero** |

**Prohibited after fix:** Two **different primary diagnosis names**（e.g. **PRESIDENT** vs **プロデューサー**）for the same user at the same **`stemLaneIndex`**.

---

## D. Selected parity strategy

**Strategy ID:** **`P-TEN-STEM-PRIMARY-01`**

| Decision | Choice |
|----------|--------|
| **Canonical public label source** | **`TEN_STEM_DISPLAY[stemLaneIndex].publicTitle`** |
| **Canonical stem index SSOT** | **`stemLaneIndex` 0–9**（天干 lane · same as **`essenceStemLaneIndex`** on legacy path） |
| **Paid DTR surfaces** | **No change to read model** — already **`TEN_STEM_DISPLAY`** from snapshot |
| **Free `/core`** | **Change display layer only** — derive **`publicTitle`** from same L as today’s pipeline |
| **Internal analytics engine** | **`TYPE_CATALOG` retained** for axis scores · affinities · section seeds · **`coreType` internal key** |
| **Snapshot DB** | **No UPDATE** — **`envelope_json`** body + **`auditMeta.stemLaneIndex`** remain purchase-time truth |

**Rejected alternatives:**

| Alt | Why rejected |
|-----|--------------|
| **Make DTR use `TYPE_CATALOG` / HERO** | Breaks paid **`tenStemCatalog` SSOT** · **`M55_TEN_STEM_PROFESSIONAL_MAPPING`** · existing snapshots |
| **Store display strings in DB** | Violates immutable snapshot design · unnecessary when L is already stored |
| **Hide type on `/core`** | Does not fix trust at purchase boundary |

---

## E. Planning Q&A

### Q1. Which label source becomes canonical for public display?

**`TEN_STEM_DISPLAY[stemLaneIndex].publicTitle`** — aligns **`TL-FIX-A` §F** · **`ENGINE-SPEC-B-R` §C1** · **`storedEnvelopeRead.ts`** paid SSOT.

### Q2. Does `/core` retain `TYPE_CATALOG` internally while displaying `TEN_STEM_DISPLAY` externally?

**Yes.**

| Layer | Retained? | Role |
|-------|-----------|------|
| **`TYPE_CATALOG[L]`** | **yes** | Axis · composition · affinities · work/love/relationship seeds |
| **`coreType` `TYPE_{L+1}`** | **yes** | Internal key · sealed snapshot compatibility |
| **`HERO_VISUAL_PRESET` EN primary** | **no as diagnosis name** | Demoted or removed from hero primary row |
| **`TEN_STEM_DISPLAY[L].publicTitle`** | **yes — hero primary JP name** | User-visible parity with DTR |

### Q3. What happens to PRESIDENT / PRODUCER-style English labels?

| Rule | Detail |
|------|--------|
| **Primary hero EN slug** | **Must not contradict** **`publicTitle`** as a second diagnosis |
| **Policy** | **Option A（recommended）：** remove primary EN archetype slug from hero · keep **M55** brand chrome only |
| **Policy** | **Option B（ENGINE-SPEC-B-R allowance）：** EN chip **secondary** · **`lang="en"`** · smaller · derived from **`ten-views` romanization table** keyed by **L** — **not** legacy **`HERO_VISUAL_PRESET`** |
| **Fresh cohort fix target** | **1992-12-19 / lane 5:** hero must **not** show **PRESIDENT** while DTR shows **プロデューサー** |

### Q4. What exact files must change?

| Tier | File | Change |
|------|------|--------|
| **P0 — shared SSOT module（new）** | **`lib/m55/publicStemDisplay.ts`**（name frozen at impl） | **`stemLaneIndex → { publicTitle, displayOneLine, imagePath }`** · single **`STEM_LANE_TEN_VIEWS_IMAGE`** map |
| **P0 — free core hero** | **`components/core/CoreHeroSection.tsx`** | Primary type row → **`TEN_STEM_DISPLAY[L].publicTitle`** · secondary **観測特性** from **`TYPE_CATALOG`** · image from shared map |
| **P0 — core result wire** | **`lib/m55/coreResult/buildCoreResult.ts`** and/or **`types.ts`** | Expose **`stemLaneIndex`** on **`CoreResult`** for UI（if not already via pipeline） |
| **P1 — image dedupe** | **`components/dtr/DtrShelfPanel.tsx`** · **`components/dtr/DtrFullReader.tsx`** | Replace local **`DTR_TYPE_IMAGE`** duplicate with **shared map import** |
| **P1 — optional cleanup** | **`components/core/CoreHeroSection.tsx`** | **`HERO_VISUAL_PRESET`** shrink to narrative-only or delete EN primary |
| **P2 — tests** | **`lib/m55/publicStemDisplay.test.ts`** · extend **`scripts/engine-audit-c-matrix.ts`** or new parity runner | Assert **`publicTitle` parity** |
| **Out of scope（this impl）** | **`lib/m55/dtrEngine.ts` body** · **`dtr_report_snapshots`** · webhook · fulfillment | Display-only gate |
| **Already correct（no change）** | **`lib/m55/compositeStem/storedEnvelopeRead.ts`** · **`deriveDtrShelfStemDisplayFromSnapshot`** · **`lib/m55/dtrShelfAccess.ts`** owned path | Paid read path |

### Q5. Can existing purchased snapshots be fixed by read-path/display mapping only?

**Yes — for this taxonomy mismatch.**

| Artifact | Action |
|----------|--------|
| **`dtr_report_snapshots` rows** | **No UPDATE** |
| **Owned `/dtr` + `/dtr/core`** | **Already correct** — read **`auditMeta.stemLaneIndex`** → **`TEN_STEM_DISPLAY`** |
| **Free `/core`** | **Fix live rebuild display** — same L from **`essenceStemLaneIndex(profile.birthDate)`** |
| **Fresh cohort legacy snapshot** | **DTR side already shows プロデューサー** · only **`/core`** needs deploy |
| **Future v2 snapshots** | Parity policy already matches **`ENGINE-SPEC-B-R`** · optional quiet badge per §C3 |

**No manual grant · no repair runner · no envelope rewrite.**

### Q6. What test cases lock this?

| ID | Fixture | Assert |
|----|---------|--------|
| **LP-01** | **`1992-12-19`** · legacy JDN | **`essenceStemLaneIndex` → 5** · **`publicTitle` = プロデューサー** on **`/core` hero AND DTR shelf/reader path helpers |
| **LP-01b** | Same | **`/core` hero must NOT expose PRESIDENT as primary EN diagnosis** |
| **LP-02** | **`1983-02-28` legacy JDN** | lane **3** · **`publicTitle` = クリエイター** on both surfaces（legacy row policy） |
| **LP-03** | **`1983-02-28` v2 golden profile**（full intake） | lane **9** · **`publicTitle` = アナリスト** · secondary **観測特性：静観分析** per **ENGINE-SPEC-B-R §C1** |
| **LP-04** | **`deriveDtrShelfStemDisplayFromSnapshot`** fixture | Owned shelf **`publicTitle`** equals **`resolvePublicStemDisplay(L).publicTitle`** |
| **LP-05** | Image map | **`STEM_LANE_TEN_VIEWS_IMAGE[5]`** same path in **`CoreHeroSection`** and **`DtrFullReader`** |
| **LP-06** | **`labelMismatch`** in audit matrix | Extend **`engine-audit-c-matrix.ts`** — fail if **`core.heroPrimary` ≠ `dtr.publicTitle`** |

**Local repro（planning · no raw profile in SSOT）：** **`1992-12-19` → lane 5 · TEN_STEM プロデューサー · legacy core TYPE_06 直観展開型** — documents today’s bug.

### Q7. Does ¥500追加返書 remain HOLD until parity is GREEN?

**Yes.**

| Gate | Condition |
|------|-----------|
| **¥500追加返書 smoke** | **HOLD** until **`DTR-SNAPSHOT-CORE-LABEL-PARITY-IMPLEMENTATION`** deploy + **`DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R` re-poll GREEN** |
| **Rationale** | Reply flow inherits **`/dtr/core`** trust · user must not see contradictory type names pre-smoke |

---

## F. 1983-02-28 golden anchor policy

| Mode | stemLane | Primary **`publicTitle`** | Secondary 観測特性 | Badge |
|------|----------|---------------------------|-------------------|-------|
| **v2 golden（target）** | **9** | **アナリスト** | **静観分析** | **保存版（複合占術）** when v2 purchased |
| **legacy JDN（today Production rows）** | **3** | **クリエイター** | **静観分析型** derived secondary OK | **保存版（旧計算方式）** when legacy purchased — **no recalc** |
| **Policy** | **Do not conflate** | v2 expectation **does not overwrite** legacy snapshot display | **`/core` live view** may differ from **legacy owned snapshot** — **CORE-DTR-B drift UI** separate track |

**Planning freeze:** Parity fix **must not break** v2 golden **`アナリスト + 静観分析`** when v2 pipeline enabled · legacy rows stay **旧計算方式** only.

---

## G. Image parity plan

**Problem:** **`HERO_VISUAL_PRESET`** keyed by **`TYPE_0N`** · **`DTR_TYPE_IMAGE`** keyed by **`stemLaneIndex`** — **misaligned asset at L=5**（president.webp vs producer.webp）.

**Fix:**

| Item | Policy |
|------|--------|
| **Single map** | **`STEM_LANE_TEN_VIEWS_IMAGE: Record<0..9, string>`** in **`publicStemDisplay.ts`** |
| **Key** | **`stemLaneIndex`** only — **not** **`TYPE_0N`** |
| **Semantics** | Image follows **`TEN_STEM_DISPLAY[L]`** metaphor（L=5 → **`producer.webp`**） |
| **Decouple** | Type **label** and **image** both keyed by **L** — no **`TYPE_06 → president`** shortcut |

---

## H. Rollout plan

| Step | Gate / action | Mutation |
|------|---------------|----------|
| **R-1** | **This gate GREEN** | **no** |
| **R-2** | **`DTR-SNAPSHOT-CORE-LABEL-PARITY-IMPLEMENTATION`** Human GO | code · tests |
| **R-3** | Production deploy **`m55-webv2`** | deploy only |
| **R-4** | **`DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R` re-poll** | read-only UI verify · same cohort |
| **R-5** | **`FRESH-ADDITIONAL-REPLY-SMOKE`** | separate Human GO after R-4 GREEN |

**No checkout retry · no second payment · no webhook replay in rollout.**

---

## I. Hard prohibitions confirmation

| Prohibition | Status |
|-------------|--------|
| code edit in planning gate | **no** |
| DB write / snapshot UPDATE / SQL mutation | **no** |
| webhook replay / manual grant / repair runner | **no** |
| checkout retry / second payment | **no** |
| VERIFY-C / env / Stripe / Production DELETE | **no** |
| raw IDs / secrets in SSOT | **no** |

---

## J. Recommended next gate

| Priority | Gate |
|----------|------|
| **P0** | **`DTR-SNAPSHOT-CORE-LABEL-PARITY-IMPLEMENTATION`** |
| **P1** | **`DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R` re-poll** |
| **P2** | **`FRESH-ADDITIONAL-REPLY-SMOKE`** |

---

## K. Prior evidence chain

| Phase | Evidence |
|-------|----------|
| **CONSISTENCY-R** | **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R-001`** |
| **TL-FIX-A** | **`M55-EVID-20260521-5Z-I-V-TL-FIX-A-TYPE-LABEL-MISMATCH-FIX-PLAN-001`** |
| **ENGINE-SPEC-B-R** | **`M55-EVID-20260521-5Z-I-V-ENGINE-SPEC-B-R-COMPOSITE-ASTROLOGY-STEM-LAW-HUMAN-SIGN-OFF-001`** |
| **This gate** | **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-LABEL-PARITY-PLANNING-001`** |
