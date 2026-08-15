# M55_ALL_SURFACE_PERSONALIZATION_RESOLUTION_AUDIT

Status: **measured authority** (not an implementation wave)  
Base: `feat/m55-free-inference-quality-v1@d7512c00520b5914778ee3da0b48193f6c0aed1d`  
Worktree: `/Users/lexsia/Documents/M55_WORKTREE-personalization-resolution-v1`  
Branch: `audit/m55-personalization-resolution-v1`  
Machine metrics: `docs/audit/M55_PERSONALIZATION_RESOLUTION_AUDIT_v1.json`  
Script: `scripts/audit/personalizationResolutionAuditV1.ts` (deterministic seed `0x4d3535`, synthetic DOB/answers only)

**VERDICT: `PATCH_REQUIRED_EFFECTIVE_DOB_RESOLUTION_27_AND_TEMPLATE_COLLISION`**

V6 Free editorial composition is **not** rejected. Merge / Human lock remains **PAUSED** until a later implementation wave consumes unused existing signals (not a second calendar).

---

## CAS

| Field | Value |
|---|---|
| pwd | `/Users/lexsia/Documents/M55_WORKTREE-personalization-resolution-v1` |
| branch | `audit/m55-personalization-resolution-v1` |
| HEAD | `d7512c00520b5914778ee3da0b48193f6c0aed1d` (V6 compose commit; audit files uncommitted) |
| origin/main | `0b2b2b349ccf4f0b9549d5a59be5a92be0a99578` |
| PR119 | independent — not imported |
| Safety | no Production / DB / Stripe / env / keys / checkout / PII |

Continuity:

- `existing_asset_search_performed=true`
- `current_inventory_checked=true`
- `prior_evidence_checked=true` (V2–V6 on `d7512c0`)
- `reusable_asset_found=true` (dal-v1, BirthSignature, 243 answers, pair_fp_v1, paid DTR catalogs, V6 compose)
- `invalidating_dependency=NONE` for engine rebuild
- `action_classification=TRUE_DELTA` for this audit only; product engines classified below

---

## 1. Inventory (current authority)

### DOB

| Signal | Source | Cardinality | Reaches customer Free selection? | Class |
|---|---|---|---|---|
| Calendar range | `CALENDAR_RANGE_START/END` 1900-01-01 … 2100-12-31 | **73,414** valid civil dates | date is validated | REUSE |
| Year | parsed then discarded in `birthSignatureV1` | — | **no** | information loss |
| dayBand | day ≤10 / ≤20 / else | **3** | yes → `start` | REUSE |
| season3 | `(month-1) % 3` | **3** | yes → `recovery`, `decision` | REUSE |
| start | dayBand only | **3** | yes | REUSE |
| decision | dayBand × season3 (tied to start) | **3** | yes | REUSE |
| recovery | season3 only | **3** | weakly (few cells) | REUSE |
| stemLane raw | 10 (product stem `m55-composite-stem-v2`; Free sample also used `essenceStemLaneIndex`) | **10** | **no as 10**; reduced | loss |
| distance | `stemLaneIndex % 3` | **3** | yes | REUSE / quantized |
| change | `(stemLaneIndex + dayBandIndex) % 3` | **3**, determined by distance+dayBand | yes | not independent |
| BirthSignature ID | `dal-v1:${start}-${decision}-${recovery}-${distance}-${change}` | **27** | yes | REUSE |
| tensions | computed on signature | varies | **unused** by Free compose | loss |
| dobFp / pair_fp_v1 | hashes full date+stem | high | **unused** by manifestation pick | loss |
| lunar month / solar term | paid DTR v2.1 / composite pipeline | 12 / catalog | **Free fusion: no**. Personal Premium catalog: yes | REUSE paid only |

Sample n=240: `m55-composite-stem-v2` vs `essenceStemLaneIndex` **matchRate 0**. Product Core/Paid stem and the derived-essence helper are not the same lane. Do not invent a third system; pick **one** existing stem authority (`m55-composite-stem-v2`) for Free fusion.

### Answers

| Signal | Cardinality | Class |
|---|---|---|
| Personal Free five questions × 3 options | **243** | REUSE |
| `free.primary_theme` | 5, post-purchase | REUSE / not Free five |
| Pair body 5×3 | **243** | REUSE |
| Pair focus | **5** | REUSE |
| Pair current-context contract | **1,215** (`3^5 × 5`) | REUSE |
| Independent A/B questionnaires | **absent** | NO_OP (do not fabricate) |

### Pair / Paid

| Surface | Inputs that actually drive copy | Class |
|---|---|---|
| Compatibility Free | A/B civil start (dayBand), `derivePairDifferenceType`, shared answers, 6 `interactionId`s | REUSE |
| Compatibility Paid `buildPaidCompatibilityReportV1` | **`pairAxisId` (4)** + relation/topic/temperature + optional currentContext. **No raw DOB.** `CHAPTER_FOCUS` is a **static six-scene table** + context suffix | P0 architecture |
| Personal Premium DTR v2.1 | stem×band×season-group×lunar-month concatenations | REUSE (**1,440** unique blobs in catalog audit) |
| Personal Free → Premium bridge | `premiumOpenLoopJa` from Free manifestation | 49 unique in 1000-user cohort |

---

## DOB_CARDINALITY

Enumerated: every valid civil date in 1900–2100 × 10 stem lanes = **734,140** inputs.

| Metric | Exact |
|---|---|
| unique BirthSignature IDs | **27** |
| unique customer-relevant DOB vectors (Free fusion) | **27** |
| unique civil cores (dayBand × season3) | **9** |
| dayBand | **3** |
| season3 | **3** |
| stemLane raw | **10** |
| stemLane effective (distance) | **3** |
| bucket min / median / max | **24,120 / 24,267 / 34,572** (over 734,140) |
| entropy | **4.74 bits** (log2(27) ≈ 4.75 — nearly using the full 27-type alphabet, not a hidden finer code) |

Largest buckets (date×stem counts):

1. `dal-v1:ask-wait-pause-close-rebuild` — 34,572  
2. `dal-v1:ask-deadline-scene-close-rebuild` — 33,768  
3. `dal-v1:ask-sort-shrink-close-rebuild` — 32,356  
4–9. six types at 32,160  
10. `dal-v1:ask-wait-pause-middle-observe` — 25,929  

Year sensitivity (same month-day, same stem): **identical signatures** (`1983-02-28` vs `1993-02-28`, etc.).

**EFFECTIVE_DOB_RESOLUTION (Free narrative selection) = 27.**  
Raw calendar resolution is 73,414 dates; that resolution is discarded before result selection.

---

## DOB_INFORMATION_LOSS

```
raw ISO date
  → validate year/month/day
  → DROP year
  → month → season3 (4 months collapse)
  → day → 3 dayBands
  → stem 10 → mod3 distance; change determined
  → BirthSignature 27
  → pickManifestationAxes (15 observed patterns in 1000-user sample)
  → authored cells → opening paragraph
  → customer result
```

Signals calculated but not changing Free opening: **year, full month, full day, full stem 10, dobFp, tensions, composite lunar/solar.**

A DOB that changes only those discarded fields does **not** count as personalization.

---

## PERSONAL_1000

Synthetic n=1000, representative date spread, all 243 answer patterns visited, seed `0x4d3535`.

| Metric | Value | Review target | Result |
|---|---|---|---|
| unique BirthSignatures | 27 | — | architecture ceiling |
| unique answer patterns | 243 | — | full option space |
| distinct (signature, answers) inputs | 938 | — | 62 duplicate input vectors (allowed identical output) |
| unique openings | 268 | — | |
| unique first sentences | **32** | exact opening collision **0** | **FAIL** |
| unique manifestation patterns | **15** | primary-fingerprint collision ≤2% | **FAIL** |
| unique Premium bridges | 49 | — | |
| colliding share (opening, distinct inputs) | **88.1%** | ≤2% | **FAIL** |
| largest opening cluster | **21** distinct inputs | — | |
| first-sentence colliding share | **99.5%** | — | |
| largest first-sentence cluster | **113** | — | |
| DOB materiality (signature actually differs) | **96.4%** (186/193) | ≥90% | **PASS** |
| answer materiality | **100%** (200/200) | ≥90% | **PASS** |
| same input → identical | **100%** | deterministic | **PASS** |

Full 27×243 grid (4,374): **360** unique openings; largest exact opening collision **81**.

Interpretation: when BirthSignature *does* differ, the primary insight usually moves (TEST A PASS). The commercial failure is **coarse buckets + a small cell table**, so many *different* dates and *different* remaining answers still share the same opening paragraph.

---

## PERSONAL_FREE

Evidence, not impression:

- Fusion exists (DOB materiality 96%, answer materiality 100%) — not a pure horoscope and not answer-only **when the authoritative signature/answers differ**.
- Customer still meets a **small archetype set**: 15 patterns, 32 opening sentences, 360 full openings on the entire legal grid.
- Provenance line is present (V6 trust cue). Observable scenes exist.
- Template collision is the dominant commercial defect vs generic web AI / JP diagnosis products.

Feels like: **a small set of archetype templates with answer-colored second beats**, not 1000 individual readings.

---

## PERSONAL_PREMIUM

Two different bodies:

1. **Free-surface Premium bridge** (`premiumOpenLoopJa`): 49 unique in the 1000 cohort; largest cluster 99; colliding share **99.3%**. Mostly paraphrases of the Free primary + scene label. Not a second personalization engine.
2. **Paid DTR v2.1 catalog** (`paidDobCivilRhythm` + stem leads): theoretical **10 × 3 × 4 × 12 = 1,440**; audit found **1,440 unique concatenated chapter fingerprints**. That is **finer than Free fusion** and uses lunar month the Free path drops.

Paid report therefore can be more DOB-specific than Free **if** the customer actually receives v2.1 composition. Light/Full entitlement must not invent extra body differences.

Generic boilerplate risk: chapter *structure* is catalog-concatenated (intentional framing). User-to-user identity of the **Free bridge** is weak; identity of **DTR concat** is 1440-state.

---

## PAIR_1000

| Metric | Value | Target | Result |
|---|---|---|---|
| unique raw (A DOB, B DOB, shared answers) | 1000 | — | no duplicate vectors in sample |
| unique birth-pair patterns (manifestation×diff) | 223 | — | |
| unique `interactionId` | **6** | — | ceiling |
| unique Free loops (`betweenThem`) | **29** | collision ≤2% | **FAIL** (99.9% colliding share) |
| largest loop cluster | **191** | — | |
| unique resets | 9 | — | |
| A/B swap correct | **100%** | correct | **PASS** |
| pair DOB materiality where pair signature/differs | **100%** (200/200) | ≥90% | **PASS** |
| paid report fingerprints | 667 / 1000 | — | better than Free loop |
| paid recurringLoop unique | **27** | — | |
| paid chapter scene-label diversity (within report) | **6** | not one scene | labels differ; table is static |

Independent A/B questionnaires: **not in contract**. Not fabricated.

---

## COMPATIBILITY_FREE

- Mechanism is **二人の間** (shared loop + あなた側/相手側), not two solo profiles glued.
- Both DOBs matter **only through civil start / difference type / 6 interactions**.
- Shared answers matter (materiality PASS when inputs differ).
- Generic-couple rate is high because **29 loops / 6 interactions** cannot separate 1000 distinct pairs.
- Strongest commercial collision: 191 pairs share one loop preview about 間 / 拒否.

---

## COMPATIBILITY_PAID

`buildPaidCompatibilityReportV1` does **not** take raw A/B DOB.

| Scene (`CHAPTER_FOCUS`) | A DOB | B DOB | Pair answers | Scene interaction | A/B perspective | Return/action |
|---|---|---|---|---|---|---|
| ch_you_pace | via 4-axis only | via 4-axis only | context suffix | **static** | axis fragments + swap | static resetSteps |
| ch_other_pace | same | same | same | **static** | same | static |
| ch_pair_gap | same | same | same | **static** | same | static |
| ch_topic_deep | same | same | same | **static** | same | static |
| ch_today_clue | same | same | same | **static** | same | static |
| remaining chapter | same | same | same | **static** | same | static |

Six scenes are **six authored foci**, not six independent fused mechanisms. They are not literally one Free loop pasted six times, but they **do not add DOB×answer fusion depth**. Cross-user paid fingerprint collision (largest 4) is mostly **axis + currentContext** reuse, not six-scene uniqueness.

---

## GENERIC_AI_BASELINE_PROTOCOL

Do **not** call external paid AI in this audit (no new credentials/cost). Protocol for a later Human-gated run:

**50 hidden profiles** (deterministic, unpublished seed held by Human): mix of BirthSignature collisions, BirthSignature contrasts, identical answers / different DOB, identical DOB / different answers, pair same/near/gap.

| Condition | Input to rater |
|---|---|
| A | Generic AI: DOB only |
| B | Generic AI: DOB + same questionnaire JSON |
| C | M55 current renderer output (this HEAD) |

Blind scores (1–5): 自分固有 / 「そこまで答えていない」驚き / 日本語の自然さ / 行動の具体性 / 納得感 / Premiumを読みたいか.

Launch bar proposal: M55 wins **≥70%** pairwise on specificity/surprise and Premium curiosity; must not materially lose Japanese naturalness. **No cherry-pick.**

**Expected (not measured):** Condition A already has ~120-type competitors; M55 Free DOB-only is **27**. Condition B is where 243 answers should win if openings stop colliding. Do not fake PASS.

---

## BENCHMARK_POSITION

| Benchmark | M55 now |
|---|---|
| DOB-only ~120 meaningful types | Free **27** → **VERY_COARSE** vs that reference. Flag **`P0_REVIEW_DOB_GRANULARITY`**. 120 is a reference, not a license to invent factors. |
| High-dimensional questionnaire | 243 vectors exist and **do** move headlines when they change. Opening *sentences* still collapse to 32. Questionnaire cardinality is **not** reaching first-sentence identity. |
| Continuous trait / context | Pair paid currentContext 1,215 + Personal Premium lunar 12 are the only near-continuous catalogs. Free fusion is discrete 27×243 with a **15-cell** bottleneck. |

---

## AI_RUNTIME_RECOMMENDATION

**`DETERMINISTIC_SUFFICIENT` for personalization identity.**

Collision is combinatorial (27 signatures, 15 patterns, 32 sentences, 6 pair interactions), not a Japanese-prose ceiling. An existing hybrid OpenAI path (`dtrFulfillmentSnapshotGenerationHook`, default `gpt-4.1-mini`) must **not** be enabled in Production for this gap. Random model wording would be **fake individuality**.

`EXISTING_MODEL_RENDERER_RECOMMENDED` **only after** a later wave expands deterministic `FusedInsightSpec` / BirthSignature consumption — renderer must not invent DOB math, evidence, diagnosis, partner mind, or fate.

Rejected: synonym shuffle, scene rotation, 365 handwritten DOB blurbs, occult dimensions for count, invented life history.

---

## TRUE_DELTA

### P0

1. **`P0_REVIEW_DOB_GRANULARITY`** — effective Free DOB states **27** vs ~120-type commercial reference; year unused.
2. **Calculated-but-lost signals** — stem 10, tensions, dobFp, composite lunar/solar never select Free cells.
3. **1000-user opening collision** — 88% of distinct (signature, answers) share an opening; first-sentence collision 99.5%; 32 sentences.
4. **Pair Free loop collision** — 29 loops, 6 interactions, largest cluster 191.
5. **Compatibility Paid** — no raw DOB; four axes; static six-scene table.

### P1

- Free Premium bridge is a 49-template paraphrase of Free.
- Two stem helpers disagree (composite vs essence sample matchRate 0) — unify on `m55-composite-stem-v2`.
- Paid recurringLoop 27 vs six static scenes.

### P2

- Execute generic-AI blind protocol when Human authorizes existing tooling.
- Thresholds ≤2% / 0 opening collision are **unrealistic** until cell table and consumed DOB dimensions grow; do not fake PASS.

### REUSE

- dal-v1 / BirthSignature / V6 paragraphs / 243 answers / pair_fp_v1 / paid 1440 catalog / PR116–117 visuals / questionnaires.

### NO_OP

- Second astrology system  
- Visual/payment rebuild  
- V6 merge until resolution wave  
- Production AI / keys / PR119 SQL  

---

## EXACT_NEXT_IMPLEMENTATION_WAVE

Smallest sound wave (**consume existing product math**, do not add occult):

1. **Unify stem authority** to `m55-composite-stem-v2` for Free fusion (drop essence-helper mismatch).
2. **Stop discarding stem 10** at manifestation pick (civil 9 × stem 10 = **90** DOB-adjacent states before new factors). Still below 120; report honestly; do not pad.
3. **Use already-computed** `tensions` + composite **lunar month** (paid already has this) as *modifiers that change cell/scene selection*, not as flavor text.
4. **Widen authored cell table** so 27×243 (or 90×243) does not collapse to 15 patterns / 32 sentences. Individuality from real input differences only.
5. **Compatibility Paid**: pass A/B BirthSignature (or pair difference + both signatures) into chapter selection so six scenes are interactions on the pair core, not only `pairAxisId` + static `CHAPTER_FOCUS`.
6. Re-run this audit script; then Human Free lock. **Do not merge V6 as the personalization close.**

Sound alternative if 90 is still too coarse: use **existing** composite lunar month (12) on the 9 civil cores → 108, or 9×10×12 if independent — only if those dimensions already change Core/Paid and can change Free cell IDs. No 365 blurbs.

---

## SAFETY

Synthetic local only. No Production mutation, DB, Stripe, env, keys, checkout, commerce, migration, or real user data.

---

## VERDICT

**`PATCH_REQUIRED_EFFECTIVE_DOB_RESOLUTION_27_AND_TEMPLATE_COLLISION`**

Not `PERSONALIZATION_RESOLUTION_GREEN`.
