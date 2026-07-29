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

| Authority | Fingerprint field | Stage | Public label |
|---|---|---|---|
| `dob_base` | `dobBase` | free | 変わりにくい土台 |
| `free_expression` | `freeExpression` | free | 今の回答に表れる傾向 |
| `paid_depth` | `paidDepth` | premium | 踏み込んだ状況の手がかり |
| `align` | `alignItems` | free | 近いところ |
| `diverge` | `divergeItems` | free | ずれるところ |
| `intensity` | `intensity` | premium | 重なりの強さ |
| `hesitation` | `hesitation` | free | 止まりやすさ |
| `reactive_context` | `reactiveContext` | free | 表れやすい場面 |
| `reply_affinity` | `replyAffinity` | free | 扱いやすいテーマ |

Never displayed to a reader: internal IDs, hashes, lookup tables, scores,
percentages, ranking, or version strings (`fp-v1`, `dal-v1`, `ptrm-v1`).

## 4. Canonical sentences

These three sentences are the load-bearing public statements. Surfaces quote them
from `M55_METHOD_CANONICAL_COPY` rather than restating them, so a wording change
reaches every surface at once.

**Explanation**

> M55は、生年月日だけでも、今の回答だけでも人を決めません。変わりにくい土台と、今表れている反応を別々に見て、近いところとずれるところ、負担が重なりやすい場面を一つの読み解きに組み立てます。

**Reproducibility**

> 中核となる整理は、版管理された固定規則で行われます。同じ入力を同じ版で処理した場合、同じ読み解きの土台が再現されます。

**Boundary**

> 診断、占い、未来予測、相手の気持ちの断定ではありません。

The reproducibility sentence is a statement about processing consistency. It is
not a statement about accuracy, and it must never be presented as one.

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
| Pricing / checkout prep | `/pricing` | near the price table | link only |
| Footer / nav | all public routes | one canonical link | link only |

`/how-m55-works` is the only detailed method page. Creating a second method route
is a violation, not an addition.

The purchased-report placement must not display internal IDs, the raw date of
birth, or the reader's raw answers.

## 7. Required `/how-m55-works` sections

1. 一つの情報だけで決めない
2. 入力として使うもの
3. 変わりにくい土台
4. 今の回答に表れること
5. 近い点とずれる点
6. Premiumで加わる深さ
7. 生活場面への整理
8. 再現性と版管理
9. 保存とプライバシー
10. M55が行わないこと

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
