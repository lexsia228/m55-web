# Phase DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-FIX-IMPLEMENTATION — P-CORE-HERO-HIERARCHY-01（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-FIX-IMPLEMENTATION** |
| **Title** | **Promote TEN_STEM publicTitle as /core hero primary diagnosis** |
| **Classification** | **Category 2 / repo-only / hero lower block reopen** |
| **Verdict** | **`DTR_SNAPSHOT_CORE_LABEL_PARITY_CORE_HERO_HIERARCHY_FIX_IMPLEMENTATION_GREEN_REPO_ONLY_NO_PRODUCTION_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-FIX-IMPLEMENTATION-001`** |
| **Date** | **2026-05-24** |
| **Strategy** | **`P-CORE-HERO-HIERARCHY-01`** |
| **Production baseline** | **`6c7f56a`** (label parity deployed; hierarchy mismatch observed) |
| **Production deploy** | **not in this gate** |

**Repo GREEN.** `/core` hero lower block only · **no DTR read-path change** · **no DB/snapshot mutation**.

---

## B. Files changed

| File | Why |
|------|-----|
| `components/core/CoreHeroSection.tsx` | Primary **`stemDisplay.publicTitle`** · trait secondary · lead **`displayOneLine`** |
| `components/core/CoreExperience.module.css` | Hero lower typography: primary large · trait row smaller |
| `lib/m55/publicStemDisplay.test.ts` | **LH-01–07** hierarchy + parity regression |

---

## C. Visual hierarchy after fix

| Layer | Copy (1992-12-19 example) |
|-------|----------------------------|
| Eyebrow | **分析類型** only |
| Largest JP | **プロデューサー** (`publicTitle`) |
| Secondary | **特質性 / 直観展開** |
| Lead | **人や企画の芽を見つけ、育てて形にする人** (`displayOneLine`) |

**Before (`6c7f56a`):** **直観展開** was largest; **プロデューサー** was small eyebrow suffix.

---

## D. Test results

| Command | Result |
|---------|--------|
| **`npx tsx --test lib/m55/publicStemDisplay.test.ts`** | **14/14 PASS** (LP-01–06 + LH-01–07) |
| **`npx tsc --noEmit`** | **PASS** |
| **`npm run build`** | **compile PASS** · prerender **FAIL** — Clerk key missing locally (pre-existing) |

---

## E. ¥500追加返書 smoke

**HOLD** until **deploy + `DTR-SNAPSHOT-CORE-RESULT-CONSISTENCY-R` re-poll GREEN**.

---

## F. Recommended next gate

**`DTR-SNAPSHOT-CORE-LABEL-PARITY-CORE-HERO-HIERARCHY-COMMIT-DEPLOY-PLANNING`** → **`…-COMMIT-EXEC`** → consistency re-poll.
