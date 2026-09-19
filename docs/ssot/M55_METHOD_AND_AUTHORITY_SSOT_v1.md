# M55 Method and Authority SSOT v1

Status: ACTIVE
Owner lane: Self funnel growth / commercial trust
Machine authority: `lib/m55/method/m55MethodAuthority.ts`
Canonical public route: `/how-m55-works`
Competitor research evidence: `docs/research/M55_COMPETITOR_INFORMATION_ARCHITECTURE_EVIDENCE_v1.md`

This document governs how M55 explains itself to a reader. It is subordinate to
`lib/m55/contracts/m55CommercialFunnelContract.ts` for product facts and to
`docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` for commercial principles. It does not
change any product fact, price, or funnel step.

## 1. Why this exists

A buyer decides whether to trust M55 before they decide whether to pay. Until
now the product described *what* it outputs but not *how* the output is
composed, which left the reader to guess — and guessing about a birth-date input
tends to land on fortune-telling. The remedy is not stronger language. It is a
truthful, checkable account of the composition, plus a hard ceiling on what may
be claimed.

## 2. Public name

The method is named **M55 複合読み解きモデル** in public copy. No other public
name for the method may be introduced. Internal module names, spec versions and
hashes are not public names.

## 3. Composition authorities

The public explanation is derived only from the nine composition authorities that
exist in `lib/m55/individualization`. Each is translated into daily Japanese by
`M55_METHOD_INPUTS`; the internal identifier is never rendered.

These nine fields are **not** nine independent user observations.

**Three-layer Product Truth**

- Layer 1 is the birth/calendar foundation (`dob_base`). It is not the Free result as a whole.
- Layer 2 is current expression from the five Free answers (`free_expression`), including
  derived align/diverge. The Free result combines Layer 1 + Layer 2.
- Layer 3 is Premium-6 emphasis (`paid_depth`). Premium 6 does not become “current expression”,
  personality, or the calendar stem.

**User-provided information (INPUT)**

- birth date (`dob_base`) — public Self currently uses nickname + date, not birth time/place
- five Free answers (`free_expression`)
- six Premium answers when Premium is used (`paid_depth`)

**Derived reading signals** (DERIVED; computed from the user-provided inputs; computation unchanged)

- calendar foundation (from birth date; current stem uses 十干 from the lunisolar/calendar
  day-stem; 二十四節気 is contextual season information, not the stem assignment)
- current expression / align-diverge
- Premium emphasis / paid contextual selectors
- intensity, hesitation, reactive context, reply affinity

The Method detail list must prefix public labels with 「本人が入力するもの」 or
「読み解きで組み立てる手がかり」 so the flat `itemsJa` renderer stays truthful
without a second renderer.

十干 may be named on the Method page. Commercial LP hero must not name 十干.
Do not claim 十二支, 60干支, 四柱推命, or other named-school fusion as current M55
calculation. A short Method-level “not used” sentence is allowed; do not build an
intimidating exclusion wall.

| Authority | Fingerprint field | Stage | Source | Public label |
|---|---|---|---|---|
| `dob_base` | `dobBase` | free | user-provided | 変わりにくい土台 |
| `free_expression` | `freeExpression` | free | user-provided | 今の回答に表れる傾向 |
| `paid_depth` | `paidDepth` | premium | user-provided | 踏み込んだ状況の手がかり |
| `align` | `alignItems` | free | derived | 近いところ |
| `diverge` | `divergeItems` | free | derived | ずれるところ |
| `intensity` | `intensity` | premium | derived | 重なりの強さ |
| `hesitation` | `hesitation` | free | derived | 止まりやすさ |
| `reactive_context` | `reactiveContext` | free | derived | 表れやすい場面 |
| `reply_affinity` | `replyAffinity` | free | derived | 扱いやすいテーマ |

Never displayed to a reader: internal IDs, hashes, lookup tables, scores,
percentages, ranking, or version strings (`fp-v1`, `dal-v1`, `ptrm-v1`).

## 4. Canonical sentences

These sentences are the load-bearing public statements. Surfaces quote them
from `M55_METHOD_CANONICAL_COPY` rather than restating them, so a wording change
reaches every surface at once.

**Explanation**

> M55は、生年月日だけでも、今の回答だけでも人を決めません。暦に基づく土台と、今表れている反応を別々に見て、近いところとずれるところ、負担が重なりやすい場面を一つの読み解きに組み立てます。

**Reproducibility**

> 中核となる整理は、版管理された固定規則で行われます。同じ入力を同じ版で処理した場合、同じ読み解きの土台が再現されます。

**Boundary**

> 診断、占い、未来予測、相手の気持ちの断定ではありません。

The reproducibility sentence is a statement about processing consistency. It is
not a statement about accuracy, and it must never be presented as one.

**Birth/calendar foundation** (compact; Q1-before strip, Line A)

> 生年月日から、暦に基づく土台を置いています。

**Premium questionnaire foundation** (compact; Q1-before strip, Line B)

> 無料の5つの回答は、いまの出方です。次の6問では、プレミアムで深く読むところを合わせます。

Primary Pre-Q1 copy explains what the six questions **do** (emphasis / focus). A
boundary may exist secondarily; do not lead with 「この6問だけで人を決めるものではありません」.

Premium's six questions add current-context focus / chapter II–IV emphasis. They
are not a standalone personality diagnosis and they are not the source of current
expression. Expanding what is read is not a claim that accuracy increased.

Purchase-time **inputs** and individualization/outputHash are frozen. Deterministic
`stored_v2` display is recomposed from the current catalog at read-time, so later
catalog/copy normalization **may change displayed wording**. Do not claim that a
purchased report is byte-identical to the purchase-time body. Hybrid AI stored
envelopes are closer to a literal body freeze; public copy must not collapse those
architectures into one immutability promise. Purchase-input reproducibility is not
an immutable-body claim.

Pre-Q1 epistemic trust is owned by `components/dtr/DtrPaidResultContextStrip.tsx`
quoting `questionnaireBirthFoundationJa` then `questionnaireFoundationJa` from
`M55_METHOD_CANONICAL_COPY`. Do not invent a second independent doctrine string
inside that component.

## 5. Authority levels (frozen)

### LEVEL 1 — currently claimable

Runtime copy may use these and nothing else.

- transparent inputs
- deterministic core composition
- versioning
- reproducibility of the reading foundation
- privacy boundaries
- Product Truth
- sample outputs
- QA and visual quality

### LEVEL 2 — future, requires evidence

Permitted only after the named evidence exists, is documented in this repository,
and is referenced from this SSOT. Not permitted in runtime copy today.

- anonymized aggregate outcome studies
- test-retest evaluation
- user comprehension studies
- expert review
- external audit

### LEVEL 3 — prohibited until independently validated

Never permitted, in any surface, including marketing drafts kept in the repo.

- scientifically validated
- clinical validity
- diagnostic accuracy
- psychological measurement authority
- predictive accuracy

### Prohibited constructions

Also prohibited regardless of level: accuracy percentages, hit rates, participant
or user counts presented as evidence, expert supervision that is not documented,
fortune-telling accuracy, "AI understands you", and prediction of the future or
of another person's feelings. `M55_UNSUPPORTED_AUTHORITY_PHRASES` and
`M55_UNSUPPORTED_AUTHORITY_PATTERNS` enumerate the machine-checked forms.

## 6. Required placements

| Placement | Route | Position | Density |
|---|---|---|---|
| HOME four-step model | `/home` | after the general value explanation, before the Premium value comparison | four step |
| Free result composition | `/core` | after the result explanation, before the Premium bridge | compact |
| Free vs Premium difference | `/dtr/lp` | before plan selection | difference |
| Purchased report composition | purchased report | at the start of the report body | compact |
| Checkout preparation | `/dtr/lp` (checkout state) | before the purchase CTA | link only |
| Footer / nav | all public routes | one canonical link | link only |

`/pricing` is retired as a duplicate public decision surface and permanently
redirects to `/dtr/lp`; it is not a method placement. Checkout preparation
remains a distinct `/dtr/lp` runtime-state placement.

`/how-m55-works` is the only detailed method page. Creating a second method route
is a violation, not an addition.

The purchased-report placement must not display internal IDs, the raw date of
birth, or the reader's raw answers.

## 7. Required `/how-m55-works` sections

A reader arrives asking what M55 shows them, not how it is built. Sections are
ordered user value → trust → method detail, and the groups must not interleave.
Method detail is rendered after a 「方法の補足」 divider.

**Value**

1. M55で見えること
2. なぜ生年月日と、今の回答の両方を見るのか
3. 無料で分かること
4. プレミアムレポートで深くなること
5. 二人の関係で見ること

**Trust**

6. M55が行わないこと
7. 保存とプライバシー

**Method detail (方法の補足)**

8. 入力として使うもの
9. 変わりにくい土台
10. 近い点とずれる点
11. 再現性と版管理

Demoting method detail must not delete it: every section above remains required,
and the factual method account stays complete.

## 8. Enforcement

- `npm run verify:m55-method-authority` — static gate: canonical name, single
  method route, section completeness, placement coverage, unsupported claims in
  governed public copy, internal vocabulary leakage, CI wiring.
- `npx tsx --test lib/m55/method/m55MethodAuthority.test.ts` — authority-level
  discipline, canonical sentence integrity, route-consumption contract, and
  negative fixtures proving the claim detector rejects each prohibited form.

## 9. Change control

Adding a public claim requires, in order: the evidence, a LEVEL entry in this
document, the machine authority update, then the copy. Copy first is not
permitted. Removing a claim requires no evidence and may be done immediately.
