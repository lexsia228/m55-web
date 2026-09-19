# M55 Commercial Funnel SSOT

Status: **Human authority (Tier B)**  
Machine product facts: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Top principles

1. **個人無料は、解決策を先に渡す場所ではない。**
2. **M55が自分を理解していると実感してもらう場所。**
3. **個人無料はM55全体への信用証明** — 個人PremiumだけでなくPair利用の信頼にも接続する。

## Free vs paid boundary

| Layer | User receives |
|---|---|
| **FREE** | 自分に何が起きやすいかを理解する |
| **PAID** | なぜ起きるか、どの条件で起きるか、どう扱えるかを理解する |

## User psychology (canonical funnel)

```
自分に近い
  → 自分では言葉にできなかったが納得できる
  → なぜそうなるか知りたい
  → 条件・構造・扱い方を知りたい
  → 購入
```

## Prohibited funnel pattern

**禁止:** 結果前にユーザー自身へ結果テーマを選ばせる → 選択内容に沿った文章を返す → M55が本人を理解したように見せる。

**理由:** ユーザーが結果を自分で誘導したと感じ、M55の認識精度・信頼を証明できない。

Current runtime still contains the「今の関心」step — recorded as **legacy debt**, not target behavior. See `M55_SELF_FUNNEL_CONTRACT.md`.

## Self and Pair roles

| Surface | Role |
|---|---|
| Self free | 認識・信頼の証明 |
| Self premium | 背景・条件・構造・扱い方 |
| Pair free | 二人の間に今表れやすい流れの入口 |
| Pair premium | 深い関係読み解き（**NOT_LIVE** — repo authority only） |

## Commercial desire and paid-worthiness

Status: **Human-approved durable doctrine (2026-09-18)** · gate `M55-GLOBAL-COMMERCIAL-INSIGHT-DEMAND-SSOT-V1`

This section is the canonical cross-product authority for **why a user pays**, which commercial topics are eligible, how governed questions are designed, and what makes a paid section worth money. It extends — and does not replace — the Top principles, Free vs paid boundary, User psychology, Prohibited funnel pattern, and Self/Pair roles above.

It applies to Self Free, Self Premium, Pair Free, Pair Premium, questionnaires, free results, Premium bridges, plan/decision surfaces, paid reports, and revisit surfaces.

It does **not** override machine product truth (`lib/m55/contracts/m55CommercialFunnelContract.ts`), `M55_COMMERCIAL_QUALITY_CONTRACT.md` closure rules, `M55_UX_BENCHMARK_STACK.md` presentation mapping, `M55_COPY_AND_CLAIMS.md`, or the executable gate owner `M55_EXECUTION_STATE.json`.

### Global rule

| Layer | User receives |
|---|---|
| **FREE** | recognition — 「自分 / 二人に何が起きやすいか」 |
| **PAID** | explanation + conditions + handling + next step — 「なぜ起きるか」「どの条件で起きるか」「どう扱えるか」「次に何を試せるか」 |

Paid must **not** equal Free text made longer.

All statements remain non-deterministic. No diagnosis, no prediction, no accuracy claim.

### Self primary purchase desire

Primary desire: **「自分をもっと知りたい」**

Self Free should primarily answer:

- 私には何が起きやすいか
- どんな反応や傾向が出やすいか
- 自分では言葉にしづらかった輪郭

Self Paid may deepen, **where Product Truth supports it**:

- なぜ私はそうなりやすいか
- 何があると力が出やすいか
- どこで迷い・摩擦が出るか
- どんな場面で疲れやすいか
- 人とのやりとりで何が起きやすいか
- どうすると戻りやすいか
- 何があると再開しやすいか
- 次に扱える小さな一手

Do **not** create unsupported career-aptitude, medical, diagnostic, prediction, or accuracy claims.

### Pair primary purchase desire

Primary desire: **「二人の相性・関係性をもっと知りたい」**

In M55, compatibility does **NOT** mean:

- 相性スコア
- 合う / 合わない判定
- 相手の本音
- 未来予測
- 復縁 / 結婚 / 改善保証

Pair Free should primarily answer:

- 二人の間に何が表れやすいか
- どこが重なるか
- どこが違うか
- どんなすれ違い / 読み違いが起きやすいか

Pair Paid may deepen, **where Product Truth supports it**:

- なぜその流れになりやすいか
- 違いが摩擦になる条件
- 会話 / 距離 / ペース差
- すれ違いが続く順番
- 違いをどう扱うか
- reset / 戻し方
- usable phrase
- small experiment
- reflection / revisit
- existing six-scene deeper reading

The existing Human-approved Pair Free/Paid boundary in `M55_PAIR_FUNNEL_CONTRACT.md` remains **frozen**. This doctrine is an overlay on that boundary and does **not** remap it.

### Market evidence filter

```
MARKET DEMAND ∩ M55 PRODUCT TRUTH = ELIGIBLE COMMERCIAL TOPIC
MARKET DEMAND − M55 PRODUCT TRUTH = HOLD / NO_IMPLEMENT
```

Competitor popularity does **not** authorize unsupported M55 claims.

Evidence classes:

| Class | Meaning |
|---|---|
| **A** | hard usage / commercial evidence |
| **B** | vendor product promise |
| **C** | observable UX / question pattern |
| **D** | community / review signal |
| **E** | inference |

**D / E must never become Product Truth.**

Research provenance — durable **patterns only**, never copied wording:

| Source | Recorded pattern |
|---|---|
| **with** | concise natural Japanese · situation / value-based questions · self and relationship framing |
| **The Pattern** | deeper self-pattern understanding · relationship dynamics · non-deterministic editorial framing |
| **Paired** | concrete relationship topics · communication · conflict · strengths / growth areas · actionable and revisit value |
| **Co–Star** | one-time personalized-reading merchandising · premium editorial packaging |
| **16Personalities** | **market evidence only** — paid deeper self-understanding · work environment / energy / burnout / values / strengths themes |

**16Personalities is NOT added to `M55_UX_BENCHMARK_STACK.md`.** The fixed benchmark stack and its surface mapping are unchanged by this section; benchmark reselection remains prohibited.

Do not copy competitor wording. Do not convert astrology or science claims into M55 claims. Do not freeze brittle revenue or conversion claims.

### Question design standard

Every governed commercial question should prefer:

```
CONCRETE SCENE
  → USER-RELEVANT TENSION
  → ONE SEMANTIC AXIS
  → MUTUALLY DISTINCT OPTIONS
  → TRACEABLE REPORT CONSEQUENCE
```

Required:

- natural Japanese
- everyday language before internal taxonomy
- one answerable life scene
- no HR / clinical tone
- no vague abstract noun where a concrete scene works
- no ideal-self answer when runtime stores current tendency
- 1:1 selector semantic fidelity
- user understands why answering matters
- every collected axis must contribute to something the report actually explains

A question should feel like 「これなら自分 / 二人について知りたい」, not 「データ収集に答えさせられている」.

### Paid report worthiness

Paid value is **not** measured by length.

Where Product Truth supports it, a strong paid section should provide a meaningful subset of:

1. specific recognition / pattern
2. why / structure
3. condition / trigger
4. lived-life consequence
5. handling / boundary / adjustment
6. next action / small experiment
7. revisit value

Pair analogue:

1. overlap / difference
2. relationship dynamic
3. friction condition
4. misread / mismatch loop
5. handling the difference
6. reset / repair
7. phrase / experiment / revisit

Do **not** invent any layer that runtime cannot support.

A commercially strong report should not stop at 「あなたにはこういう傾向があります」. Where Product Truth supports it, it should help the user understand 「なぜこうなりやすいのか」「どんな条件なら力が出やすいか」「どんな時に迷い・疲れ・摩擦が出るのか」「人との間で何が起こりやすいか」「どう扱うと楽になるか」「次に何を試せるか」 — and for Pair, the analogous 「どこが似ていてどこが違うか」「なぜそこですれ違いやすいか」「距離・会話・ペースの差はどう表れるか」「何が悪循環を続けるか」「どう戻せるか」「次に二人で何を試せるか」.

### Promise continuity

```
FREE RESULT
  → PREMIUM BRIDGE
  → QUESTION
  → ANSWER REVIEW
  → PLAN
  → PAID REPORT
  → REVISIT
```

Every surface in this chain must express the **same underlying paid value**.

- If a bridge promises 「疲れ方と戻り方」, the paid report must deliver it.
- If a Pair surface promises 「すれ違いの背景と扱い方」, the paid report must deliver it.
- A question axis must not disappear after answering.

**No bait-and-switch.**

### Report content change class

Any proposed change to existing Self or Pair report content must be classified:

| Class | Meaning |
|---|---|
| **A** | `REUSE_AS_IS` |
| **B** | `REFRAME_DISPLAY_ONLY` |
| **C** | `REORDER_EXISTING_VALUE` |
| **D** | `BOUNDED_COPY_REMEDIATION` |
| **E** | `PRODUCT_OR_ENGINE_CHANGE_REQUIRED` / **HOLD** |

Preference order: **A > B > C > D > E**

Existing M55 content must be **preserved** unless a concrete commercial-quality defect proves remediation is necessary. Wording that is merely not ideal is not a deletion reason.

### Commercial delight and discovery standard

Status: **Human-approved durable doctrine (2026-09-19)** · gate `M55-GLOBAL-COMMERCIAL-INSIGHT-DEMAND-SSOT-V1`

**COMMERCIAL VALUE + PRODUCT TRUTH + DELIGHT / DISCOVERY / ANTICIPATION = REQUIRED**

This standard applies to **all** governed user-visible commercial content. It extends the Commercial desire and paid-worthiness doctrine above. It does **not** override machine product truth, `M55_COPY_AND_CLAIMS.md`, `M55_COMMERCIAL_QUALITY_CONTRACT.md`, or the frozen Pair Free/Paid boundary.

M55 must **not** feel like:

- an administrative form
- an HR survey
- a clinical questionnaire
- a long static report wall

The governed experience should create:

```
CURIOSITY
  → RECOGNITION
  → ANTICIPATION
  → REVEAL
  → DEEPER CURIOSITY
  → PAID DEPTH
  → REVISIT VALUE
```

Target reader feeling — without fear, dependency mechanics, fake urgency, fake scarcity, score manipulation, fortune telling, partner mind-reading, diagnostic certainty, exaggerated accuracy, or fake AI processing theatre:

- 「次も見たい」
- 「自分 / 二人のことが少しずつ分かってきた」
- 「結果を見るのが楽しみ」
- 「もっと知りたい」

#### Scope

This applies to **all** user-visible commercial content.

The following sequence is a **non-exhaustive** representative map of governed surfaces — **not** a closed list:

```
HOME / ENTRY
  → INTRO
  → QUESTION
  → ANSWER OPTION
  → PROGRESS
  → TRANSITION
  → FREE RESULT
  → PREMIUM BRIDGE
  → ANSWER REVIEW
  → PLAN / PRODUCT DECISION
  → CTA
  → PURCHASE CONFIRMATION
  → CHECKOUT TRUST
  → PAYMENT / PROCESSING / SUCCESS CONTINUITY
  → PAID REPORT
  → MY PAGE / OWNED REPORT
  → REVISIT
  → SHARED NAVIGATION
  → SUPPORT
  → RELEVANT EMPTY / ERROR / STATUS STATES
```

This does **not** imply every surface must be playful.

**Precedence — trust-critical surfaces:** For legal, privacy, accessibility, security, payment, transactional status, support, and trust-critical content, **clarity / accuracy / safety / trust** remain **superior** to delight.

Delight on these surfaces means:

- low friction
- understandable
- reassuring where truthful
- coherent with the funnel

It does **NOT** mean:

- gamification
- playful ambiguity
- hiding warnings
- weakening legal/payment precision

#### Content quality requirement

Every governed content unit should satisfy, where applicable:

1. **EASY TO UNDERSTAND**
2. **PERSONALLY RECOGNIZABLE**
3. **EASY TO ACT ON / ANSWER**
4. **REVEALS SOMETHING USEFUL**
5. **CREATES REASONABLE ANTICIPATION**
6. **CONNECTS TO THE NEXT SURFACE**
7. **DELIVERS THE PROMISED VALUE**
8. **REMAINS WORTH REVISITING**

#### Question experience

Questions and answer options should feel like **discovery**, not form completion.

Required:

- concrete everyday scene
- natural Japanese
- one clear semantic axis
- distinct answer options
- low cognitive burden
- visible consequence in the report
- progression that makes the next question worth seeing

Avoid:

- repetitive administrative wording
- long Likert batteries
- HR terminology
- clinical language
- abstract taxonomy when a scene works better
- answer options that sound like personality labels
- six screens that feel mechanically identical

This extends — and does not replace — the Question design standard above.

#### Self emotional arc

Self commercial experience should support:

```
「これ、自分に近い」
  → 「なんでそうなるんだろう」
  → 「疲れ方や戻り方まで知りたい」
  → 「自分のことをもっと知りたい」
```

The product must **not** claim deterministic identity or diagnosis.

#### Pair emotional arc

Pair commercial experience should support:

```
「二人っぽい」
  → 「この違い、確かにある」
  → 「なぜここですれ違いやすい？」
  → 「どうすると噛み合いやすくなる？」
  → 「もっと二人のことを知りたい」
```

Without:

- compatibility score
- good/bad verdict
- partner mind-reading
- future prediction

#### Free result reveal

Free result should **not** default to a dense report wall.

Prefer:

1. recognizable lead
2. concise explanation
3. separated insight blocks
4. scene-level examples
5. unanswered deeper curiosity
6. Premium bridge

Free must provide real value while preserving genuine Paid depth.

#### Premium bridge

Paid interest must come from **curiosity and deeper understanding**.

Not:

- 「もっと詳しく見られます」

Prefer specific deeper promise such as:

- なぜそうなりやすいか
- どんな条件で強く出るか
- どう戻りやすいか
- 二人の違いがどこですれ違いになるか
- どう扱うと噛み合いやすいか

#### Paid report reading experience

Paid should **not** be one long uninterrupted exposition.

Where compatible with current Product Truth and visual system, structure chapters with:

- strong opening
- specific insight
- scene/example
- deeper explanation
- condition/trigger
- handling
- next action
- memorable takeaway
- anticipation into next section

Target reader reaction:

- 「ここも自分に近い」
- 「そういう理由だったのか」
- 「これは使えそう」

#### Revisit value

Paid content should include durable value worth returning to later.

Revisit must **not** be artificial retention mechanics.

#### Prohibited delight mechanics

Do **not** use:

- fake scarcity
- fake urgency
- streaks as pressure
- arbitrary points/badges
- mystery-box manipulation
- fear-based purchase pressure
- fake AI analysis waiting
- answer praise that biases selection
- exaggerated accuracy
- dependency loops

#### Human actual-screen closure

Machine checks, AI review, copy review, or generated screenshots **cannot by themselves** close delight or commercial quality on affected user-visible surfaces.

Affected surfaces remain subject to `M55_COMMERCIAL_QUALITY_CONTRACT.md` **actual-screen evidence** and **explicit Human commercial approval** before USER_VISIBLE_CLOSED_GREEN or equivalent closure.

### Paid-worthiness review rubric

Before a commercial topic, surface, or paid section is accepted, review:

- 分かりやすいか
- 自分ごと / 二人ごとに感じるか
- 答えやすいか
- 作業ではなく発見になっているか
- 次を見たくなるか
- 進捗が自然に分かるか
- 結果に「自分 / 二人らしい」瞬間があるか
- Paid興味が不安ではなく好奇心から生まれているか
- 約束した価値が次のsurfaceで本当に返ってくるか
- 読み進めるリズムがあるか
- 長文を読むだけになっていないか
- 後でまた見たくなる価値があるか
- ユーザー本人が「これは知りたい」と理解できるか
- Freeですでに十分渡していないか
- 長いだけではなく有料差分があるか
- M55 Product Truthから本当に導けるか
- 実生活の場面に結びつくか
- 理解や扱い方につながるか
- public claimが強すぎないか
- question / bridge / plan / reportで同じ約束か
- Pairなら相手の本音を捏造していないか
- 保存 / 再訪する価値があるか

**No numeric fun score. No numeric commercial score. No invented conversion threshold.** Commercial success still requires observed Production data per `M55_COMMERCIAL_QUALITY_CONTRACT.md`.

### Current report risk / preservation notes

Recorded as **guidance and later mapping input**. These notes do **not** authorize runtime edits.

Self — preserve:

- Free five-axis recognition
- fused life scenes
- six paid questions
- selector-bound Premium emphasis
- Paid IV fatigue / recovery / restart value
- saved / revisit value

Self — watch:

- Free strength/load conditions vs Paid condition value
- Free light-why vs Paid II structure
- Paid I appearing like repeated Free recognition
- abstract headings hiding paid value

Pair — preserve:

- frozen Free/Paid ownership
- overlap / difference
- misread loop recognition
- no-observation path
- immediate actions
- reset / phrase / experiment / revisit concepts

Pair — watch:

- Pair Paid must not merely repeat the Free misread loop
- `ch_topic_deep` may underdeliver against the bridge promise
- `ch_other_pace` must not become partner mind-reading
- Pair Premium remains **NOT_LIVE**

### Remediation sequence

Frozen order:

1. Global Funnel SSOT doctrine (this section)
2. Reconcile the existing Self implementation candidate `fd852677ddf4e0b4678a9bfd5e46f1a66c56ee1f`
3. Self actual-screen / Human commercial review
4. Pair alignment overlay against the frozen Pair boundary
5. Bounded Pair remediation only where proven
6. Cross-surface paid-report promise-continuity review
7. Production conversion observation later

Each later remediation must cite:

- the applicable Funnel SSOT clause
- the report class **A / B / C / D / E**
- the actual Product Truth owner

Per-screen ad-hoc editing without these citations is **prohibited**; this section is the reusable authority for subsequent Self and Pair work.

## References

- Self flow: `M55_SELF_FUNNEL_CONTRACT.md`
- Pair flow: `M55_PAIR_FUNNEL_CONTRACT.md`
- Copy: `M55_COPY_AND_CLAIMS.md`
- Visual: `M55_VISUAL_SYSTEM.md`
