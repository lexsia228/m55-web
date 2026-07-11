# M55 2027 QA Master Matrix Rev1

## Document status

DRAFT（docs-only。test dimensions・evidence levels・threshold・Human review・release evidence・STOP rules の normative owner）

## Revision

Rev1（2026-07-12）

## Authority domain

**QA 次元、coverage class、evidence level、pass/fail threshold、Human review protocol、release evidence、failure routing** の唯一 owner。

## Current implementation base

- base SHA: `ab7988ebe6f6f871933c42e057615b2c4771dc2b`
- existing tests: Inventory snapshot at base SHA `ab7988e` — repository search により約 110–112 test files/assets。件数は snapshot evidence であり release threshold ではない
- selector catalog: 13/13 PASS observed
- consult: 20-combo DOB matrix
- compatibility: quality matrix only

## Owns

- evidence level taxonomy
- personal logic matrix dimensions
- 1,215 / DOB stratified coverage intent
- copy QA dimensions
- Human editorial protocol
- UX / commerce / Production / compatibility QA minimums
- phase release thresholds
- failure routing

## Does not own

- business claims（Product Truth）
- 価格（Product Truth）
- UI layout（UX Journey）
- algorithm definitions（technical SSOT）
- exact production code

## References only

| path | purpose |
|---|---|
| `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` | phase gates |
| `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` | claim boundary |
| `docs/planning/M55_2027_END_TO_END_UX_JOURNEY_REV1.md` | UX states |
| `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_VERSIONED_SELECTOR_IMPLEMENTATION_PLAN_REV1.md` | selector tests |
| `docs/planning/M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | commerce evidence |
| `lib/m55/compatibility/**` | compatibility quality matrix |

## Change-control rule

- assertion 本文は既存 test source を複製しない
- threshold 変更は本ファイル + 該当 test gate で同期
- 「tests pass」のみで Production ready としない

---

## 1. QA authority model

### 1.1 Evidence levels（下位を上位に昇格させない）

| level | meaning |
|---|---|
| SOURCE_REVIEWED | 文書・コード review のみ |
| TYPECHECKED | tsc / type pass |
| UNIT_RUNTIME_PASS | 単体 runtime test pass |
| MATRIX_RUNTIME_PASS | 組合せ matrix pass |
| INTEGRATION_PASS | multi-module integration pass |
| PRODUCTION_READ_ONLY_PASS | Production read-only smoke |
| CONTROLLED_LIVE_PASS | controlled purchase / mutation |
| HUMAN_VISUAL_PASS | visual QA |
| HUMAN_EDITORIAL_PASS | copy naturalness review |

**MUST NOT:** UNIT_RUNTIME_PASS を PRODUCTION_READY の唯一根拠にしない。

---

## 2. Current evidence inventory

| asset | status | evidence level |
|---|---|---|
| test files under `lib/m55/**`（inventory snapshot @ ab7988e） | exists（約110–112、検索方法依存） | UNIT_RUNTIME_PASS（個別）。**release threshold ではない** |
| `individualizationSelectorCatalogV1.test.ts` | 13/13 PASS | MATRIX_RUNTIME_PASS |
| fp-v1 variance tests | exists | MATRIX_RUNTIME_PASS |
| consult 20-combo DOB matrix | exists | MATRIX_RUNTIME_PASS |
| `lib/m55/compatibility/**` quality matrix | exists | MATRIX_RUNTIME_PASS（design-only scope） |
| public-copy tests（legal/support） | exists | UNIT_RUNTIME_PASS |
| Production runbooks | docs | SOURCE_REVIEWED |
| resolver runtime tests | ABSENT | gap |
| builder integration tests | ABSENT | gap |
| gmfn-v2 tests | ABSENT | gap |
| free/paid composition matrix | ABSENT | gap |
| 1,215 full matrix | ABSENT | gap |
| Human editorial 100+100 | ABSENT | gap |
| Stripe metadata PII remediation evidence | ABSENT | gap |
| compatibility Production QA | ABSENT | gap |

---

## 3. Personal logic matrix

### 3.1 Required dimensions

| dimension | requirement |
|---|---|
| all 1,215 questionnaire states | reachable + deterministic output |
| all 20 answers effective | each answer changes projection where designed |
| same input deterministic | identical output hash |
| same DOB + different answers | visibly differ |
| same answers + different DOB | baseline difference preserved |
| strain 0–1 | optional category correctness |
| recovery 0–1 | optional category correctness |
| no false fallback | unknown → fail-closed |
| no same-question double count | answer immutability |
| unknown version fail-closed | reject |
| unknown lineage fail-closed | reject |
| input immutability | sealed input |
| catalog immutability | versioned bundle |
| stable ordering | deterministic sort |
| stable hash/version | reproducible |

### 3.2 1,215 coverage clarification

**MUST:** 全 1,215 questionnaire state の matrix runtime pass。

**MUST NOT:** 全生年月日 × 1,215 の完全直積を必須と誤記する。

### 3.3 DOB coverage（stratified）

| axis | requirement |
|---|---|
| representative baseline signatures | stratified sample |
| month/day boundaries | edge cases |
| leap-day handling | explicit cases |
| stem coverage | 10 stems represented |
| dayBand/monthBand coverage | band edges |
| supported-range boundaries | after Human decision on DOB range |

---

## 4. Selector and composition matrix

| dimension | requirement |
|---|---|
| selector distribution | no unreachable dominant gap |
| unreachable selector detection | zero unreachable in catalog |
| dominant-selector concentration | monitored, not verdict |
| contradictory combination detection | fail test |
| free role completeness | all free roles populated |
| paid chapter ownership | 4 chapters distinct roles |
| chapter selector count | per contract |
| free/paid consistency | no contradiction |
| output version consistency | version tag matches bundle |

algorithm 詳細は selector implementation plan 参照。本ファイルは threshold のみ。

---

## 5. Free/paid content differentiation

**MUST:**

- free useful standalone
- paid materially deeper（構造差）
- four chapters structurally distinct
- no repeated paragraph across chapters
- no excessive semantic repetition
- no answer contradiction
- no unsupported life-context inference
- no internal ID exposure
- no truncated output

---

## 6. Automated Japanese copy QA

| check | action |
|---|---|
| exact duplicate sentence | fail |
| near-duplicate paragraph | fail / review |
| repeated sentence ending | flag |
| repeated connective pattern | flag |
| broken particle sequence | fail |
| unfinished sentence | fail |
| chapter heading mismatch | fail |
| internal technical token | fail |
| diagnosis/prediction/guarantee language | fail |
| income/health/job/relationship speculation | fail |
| free/paid semantic overlap | threshold review |
| cross-chapter overlap | fail |
| strain/recovery contradiction | fail |

**MUST NOT:** 自動評価のみで Human editorial を代替する。

---

## 7. Human editorial protocol

### 7.1 Initial minimum review set

| product | cases |
|---|---|
| Free | 100 stratified |
| Paid | 100 stratified |

これは商用前の **initial minimum** であり、全品質保証を意味しない。

### 7.2 Stratification axes

- DOB baseline
- primary theme
- align/diverge
- strain selected/none
- recovery selected/none
- paid chapter emphasis
- extreme/neutral answer patterns

### 7.3 Evaluation criteria

- naturalness
- specificity
- answer reflection
- DOB/answer separation
- non-repetition
- readability
- commercial depth
- claim safety
- price-worth perception（価格は Product Truth 参照）

### 7.4 Paid blind comparison

- free/paid label を伏せる
- paid が明確に深いと判断されるか
- 文章量ではなく **構造差** を評価

evidence level: HUMAN_EDITORIAL_PASS

---

## 8. UX QA

| area | minimum |
|---|---|
| questionnaire completion | end-to-end |
| back/resume | state preserved |
| reload | same result |
| mobile widths | 320px+ |
| keyboard | focus safe |
| screen reader | critical paths |
| reduced motion | no infinite animation |
| loading truth | no false AI claim |
| error recovery | retry where idempotent |
| CTA clarity | not disguised |
| checkout transition | price visible（Product Truth） |
| support access | reachable |

詳細 state は UX Journey 参照。

---

## 9. Commerce/privacy QA

| area | minimum |
|---|---|
| Stripe metadata PII absence | post-remediation |
| opaque commerce reference | no raw DOB/nickname |
| offer snapshot | versioned |
| price/product/version provenance | traceable |
| idempotent fulfillment | webhook replay safe |
| no duplicate entitlement | single grant |
| ticket consume after success only | partial fail safe |
| refund/support linkage | route works |
| evidence export | ledger exportable |
| controlled purchase QA | CONTROLLED_LIVE_PASS |

Commerce Evidence contract 参照。

---

## 10. Production QA

### 10.1 Modes

| mode | scope |
|---|---|
| READ_ONLY | route smoke, diagnostics, no mutation |
| CONTROLLED_LIVE | test purchase, entitlement |
| HUMAN_VISUAL | screenshot / visual pass |

### 10.2 Minimum evidence

- exact Production SHA
- deployment Ready
- public route health
- diagnostics endpoint
- no 5xx on critical routes
- expected redirects
- snapshot persistence
- reload
- entitlement correctness
- no unauthorized mutation

---

## 11. Compatibility QA

**開始条件:** personal Phase P8 GREEN。

| area | minimum |
|---|---|
| A/B swap behavior | symmetric |
| same-person case | bounded output |
| near-identical patterns | no false drama |
| highly divergent patterns | no verdict |
| missing consent | blocked |
| one-person mode boundary | no partner inner claim |
| mutual mode boundary | both consents required |
| no score/verdict | automated + Human |
| no unauthorized inference | fail |
| no person identity leakage | privacy |
| pair output persistence | reload |
| compatibility commerce evidence | CONTROLLED_LIVE_PASS |

---

## 12. Release thresholds by phase

| phase | required evidence | pass | HOLD | Human approval | Production |
|---|---|---|---|---|---|
| P0 docs | SOURCE_REVIEWED | 4 docs frozen | collision unresolved | collision map | no |
| P1 resolver | UNIT_RUNTIME_PASS + focused runtime | resolver GREEN | fail-closed broken | no | no |
| P2 builder/gmfn | INTEGRATION_PASS | snapshot versioned | builder partial | no | no |
| P3 free composition | MATRIX_RUNTIME_PASS | free matrix | overlap fail | no | no |
| P4 paid composition | MATRIX_RUNTIME_PASS | paid matrix | chapter dup | no | no |
| P5 logic/copy QA | MATRIX + copy auto | 1,215 + copy checks | editorial fail | editorial sample | no |
| P6 UX wiring | INTEGRATION + UX QA | journey pass | loading lie | no | no |
| P7 commerce | commerce evidence | metadata clean | PII present | Stripe class | no |
| P8 personal prod | PRODUCTION_READ_ONLY + CONTROLLED | personal GREEN | 5xx | yes | yes |
| P9–12 compatibility | compatibility matrix + prod | compat GREEN | consent gap | yes | after P8 |
| P13 analytics | privacy contract | events clean | PII leak | yes | after baseline |
| P14 membership | retention baseline | HUMAN_DECISION | no evidence | yes | optional |

**MUST NOT:** 「tests pass」のみで Production ready と判定する。

---

## 13. Failure routing

| failure type | owner lane | MUST NOT edit |
|---|---|---|
| logic failure | Lane A Personal engine | UX/CSS unrelated |
| copy failure | Lane A + editorial | commerce unrelated |
| UX failure | Lane C UX | algorithm unrelated |
| commerce failure | Lane B Commerce/privacy | selector unrelated |
| Production failure | Lane A + ops | compatibility unrelated |
| compatibility failure | Lane D Compatibility | personal engine unrelated |

---

## 14. STOP rules

**MUST STOP release when:**

- unknown version accepts input
- partial generation marked complete
- ticket consumed before success
- Stripe metadata contains raw DOB/nickname（post-remediation gate）
- compatibility runtime before personal P8 GREEN
- prohibited claim in public HTML
- evidence level misrepresented（下位を上位と claim）

---

## 15. Gap summary（current）

| gap | blocks |
|---|---|
| resolver ABSENT | P1+ |
| builder ABSENT | P2+ |
| composition ABSENT | P3–P4 |
| 1,215 matrix ABSENT | P5 |
| Human 100+100 ABSENT | P5 editorial |
| UX fp-v1 wiring ABSENT | P6 |
| Stripe PII remediation ABSENT | P7 |
| compatibility runtime HOLD | P9–P12 |

---

## 16. Authority reference registry

| path | status | referenced by |
|---|---|---|
| `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` | CONTRACT | §3, §5 |
| `docs/planning/M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | CONTRACT | §3 |
| `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | CONTRACT | §3 |
| `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_VERSIONED_SELECTOR_IMPLEMENTATION_PLAN_REV1.md` | Gate 1 merged | §4 |
| `docs/planning/M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | CONTRACT | §9 |
| `lib/m55/compatibility/pairReadingCatalog.v1.ts` | DESIGN_ONLY | §11 |

test assertion 本文は上記 paths の test files が所有。本ファイルは意図と threshold のみ。
