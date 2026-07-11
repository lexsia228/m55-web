# M55 Personal Semantic Fingerprint Contract and Actual-Diff Plan Rev1

- **Gate ID:** `CATEGORY-2-M55-PERSONAL-SEMANTIC-FINGERPRINT-CONTRACT-AND-ACTUAL-DIFF-PLAN-REV1`
- **Status:** CONTRACT FIXED（実装前）
- **Canonical worktree:** `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish`
- **Base SHA:** `a5d349791056a923828a74e1c5686bfe04a3da5f`
- **Upstream contracts:**
  - `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md`
  - `docs/planning/M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md`
  - `docs/planning/M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md`

---

## 1. Decision

### 正式採用

| 項目 | 採用 |
|---|---|
| Personal model | **三層モデル**（Stable DOB Baseline / Current Expression Projection / Integrated Interpretation Selectors） |
| Fingerprint authority | 既存 **fp-v1** `buildIndividualizationFingerprintV1` を基礎とし、**versioned selector 拡張**で完成 |
| Implementation architecture | **候補B `EXTEND_EXISTING_BUILD_INDIVIDUALIZATION_V1_WITH_VERSIONED_SELECTORS`** |
| DOB range | **`DOB_RANGE_AUTHORITY_UNFIXED`** — supported range を repo が固定していない |
| DOB state analysis | **`DOB_STATE_DOMAIN_SAMPLE_ONLY`** + **`SYNTHETIC_GRID_SAMPLE_ONLY`**（1990 grid、本 gate probe） |
| Integrated state-space | **`INTEGRATED_STATE_SPACE_SUPPORTED_BUT_COMPOSITION_UNPROVEN`** |
| State-space upper bounds | axis tuple: **32,805**（`VALID_AXIS_TUPLE_CROSS_PRODUCT_UPPER_BOUND`）。sample complete baseline: **437,400**（`PARTIAL_DOB_SIGNATURE_UPPER_BOUND`）。いずれも final article 数ではない |
| Final article hundreds | **NOT YET PROVEN** — composition matrix 未実装 |
| Compatibility | **HOLD** |
| Production connection | **PROHIBITED** |
| Runtime P0 | **`P0_METADATA_PRIVACY_REMEDIATION_REQUIRED`**（未解消） |

### 分類（本 gate）

```text
READY_FOR_ACTUAL_DIFF_REVIEW
DOB_STATE_AUTHORITY_COMPLETE
DOB_RANGE_AUTHORITY_UNFIXED
DOB_STATE_DOMAIN_SAMPLE_ONLY
SYNTHETIC_GRID_SAMPLE_ONLY
FIXTURE_LEVEL_DOB_STATE_ANALYSIS_ONLY
PARTIAL_DOB_SIGNATURE_UPPER_BOUND
VALID_AXIS_TUPLE_CROSS_PRODUCT_UPPER_BOUND
PARTIAL_SIGNATURE_COLLISIONS_ONLY
SIGNATURE_DEFINITION_DIFFERENCE
INTERNAL_HASH_EXPOSURE_BOUNDARY_REQUIRED
REVERSIBLE_SMALL_DOMAIN_HASH_RISK
INTEGRATED_STATE_SPACE_SUPPORTED_BUT_COMPOSITION_UNPROVEN
EXTEND_EXISTING_BUILD_INDIVIDUALIZATION_V1_WITH_VERSIONED_SELECTORS
```

**Stripe 承認を保証しない。** **Production 接続許可を出さない。**

### Architecture 不採用理由

| 候補 | 判定 | 理由 |
|---|---|---|
| **A** `REUSE_EXISTING_BUILD_INDIVIDUALIZATION_V1_AS_FINGERPRINT` | 不採用 | fp-v1 は DOB/Questionnaire/align-diverge を既に統合するが、**strain/recovery/free block/paid chapter emphasis selector catalog が未実装**。composition 直結には不足 |
| **B** `EXTEND_EXISTING_BUILD_INDIVIDUALIZATION_V1_WITH_VERSIONED_SELECTORS` | **採用** | 基礎 fingerprint は既存 pure module で成立。backward-compatible な versioned selector 層追加で後続 composition に足りる |
| **C** `CREATE_SEPARATE_PERSONAL_SEMANTIC_FINGERPRINT_V1_COMPOSER` | 不採用 | 責務分離は可能だが、現行 `buildIndividualizationV1` が既に composer 相当。重複 authority リスクが高い |
| **D** `PERSONAL_FINGERPRINT_CONTRACT_REDESIGN_REQUIRED` | 不採用 | DOB lookup・Questionnaire projection・align/diverge・versioning・fail-closed は repo 内で成立。再設計不要 |

---

## 2. Scope and Non-Goals

### 本 gate の scope

- 既存 individualization authority の READ-ONLY inventory
- DOB baseline と Questionnaire projection の三層統合契約
- Personal Semantic Fingerprint schema（実装済み / candidate 分離）
- align/diverge・strain/recovery・free/paid selector 境界
- state-space 理論式と fixture-level 実測
- provenance / Commerce evidence 境界
- future file scope・test contract・gate sequence

### Non-Goals（明示禁止）

- production code / runtime 接続
- questionnaire UI / onboarding UI 実装
- free/paid composition matrix 実装
- hundreds-variance QA 実装
- DB / Stripe / checkout / webhook 変更
- metadata remediation
- compatibility runtime 接続
- random / provider / LLM
- 新規相関 score・適合率・性格 score
- 深層心理・潜在意識の測定断定
- 完成文章本文の作成
- commit / push / deploy

---

## 3. Existing Authority Inventory

### 3.1 `lib/m55/individualization/` ファイル一覧

| ファイル | 役割 |
|---|---|
| `answerIdMapsV1.ts` | free-v1 / paid-v1 question・answer ID maps、tendency maps、axis priority |
| `types.ts` | fp-v1 型（`ExpressionAxes`, `DobBase`, `FreeExpression`, `IndividualizationFingerprint` 等） |
| `versions.ts` | version 定数（`fp-v1`, `dal-v1`, `free-v1` 等） |
| `dobAxisLookupV1.ts` | **dal-v1** — DOB + stemLaneIndex → `dobBase.axes` |
| `freeExpressionV1.ts` | **free-v1** — answer set → `freeExpression` + `freeExpressionHash` |
| `primaryThemeReplyMapV1.ts` | **ptrm-v1** — primary theme → reply themes |
| `alignDivergeV1.ts` | DOB axes vs free axes → align/diverge items + `pickFreeAlignDivergeItemV1` |
| `paidDepthV1.ts` | paid-v1 → chapterBias（有料 questionnaire 用） |
| `signalsV1.ts` | intensity / hesitation / reactiveContext |
| `replyAffinityV1.ts` | reply theme ranking（**内部 score は出力に含めない**） |
| `outputHashV1.ts` | `buildIndividualizationOutputHashV1` |
| `buildIndividualizationV1.ts` | **fp-v1 composer** — fingerprint + draft snapshot |
| `index.ts` | public exports |
| `individualizationV1.test.ts` | unit tests |
| `individualizationV1.variance.test.ts` | synthetic DOB × answer variance QA |

### 3.2 Exported functions（主要）

| 関数 | 入力 | 出力 |
|---|---|---|
| `buildDobAxisLookupV1` | `birthDate`, `stemLaneIndex` | `dobBase`, `internalSelectors` |
| `buildFreeExpressionV1` | `freeAnswerSet` | `FreeExpression` |
| `buildAlignDivergeItemsV1` | `dobAxes`, `freeAxes`, `freeAnswerSet` | `alignItems`, `divergeItems` |
| `pickFreeAlignDivergeItemV1` | align/diverge items | 1点 `AlignDivergeItem` or null |
| `buildIndividualizationFingerprintV1` | DOB + free answers + optional paid | `IndividualizationFingerprint` |
| `buildIndividualizationDraftSnapshotV1` | 上記 + audit meta | `IndividualizationDraft` |
| `buildIndividualizationOutputHashV1` | dobFp + answer hashes + block IDs + versions | output hash |

### 3.3 Version constants（repo 実態）

| 定数 | 値 |
|---|---|
| `FINGERPRINT_SPEC_VERSION` | `fp-v1` |
| `DOB_AXIS_LOOKUP_VERSION` | `dal-v1` |
| `PRIMARY_THEME_REPLY_MAP_VERSION` | `ptrm-v1` |
| `FREE_QUESTIONNAIRE_VERSION` | `free-v1` |
| `PAID_QUESTIONNAIRE_VERSION` | `paid-v1` |
| `REPLY_QUESTION_CATALOG_VERSION` | `reply-v1` |
| `GENERATION_META_FIELD_NAMING_VERSION` | `gmfn-v1` |

### 3.4 Runtime callers

| 領域 | 状態 |
|---|---|
| `app/**` | **import なし** |
| `components/**` | **import なし** |
| `lib/m55/dtr*.ts` | DTR engine は **別 DOB personalization 系**（v2/v2.1 catalog）。fp-v1 `dobAxisLookupV1` とは別 authority |
| tests | `individualizationV1.test.ts`, `individualizationV1.variance.test.ts` のみ direct import |

**結論:** fp-v1 individualization は **tests-only pure authority**。Production runtime 未接続。

### 3.5 関連 planning 正本

| 文書 | 関係 |
|---|---|
| `M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` | 二層/三層の Public Truth 境界。候補B 採用済み |
| `M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | 6問/20 answer/1215 projection states。四層差分定義 |
| `M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | E6 provenance。P0 metadata remediation |

---

## 4. DOB Calendar-Logic Authority

### 4.1 Input contract（`dobAxisLookupV1.ts`）

| 項目 | 仕様 |
|---|---|
| `birthDate` | `YYYY-MM-DD` 文字列。regex + calendar validity（UTC date-only、leap 含む） |
| `stemLaneIndex` | integer **0–9**（10 lanes） |
| birth time | **不使用** |
| birthplace | **不使用** |
| timezone | **変換しない**。文字列の年月日パーツのみ使用 |
| nickname | **不使用** |

### 4.2 Validation / fail-closed

| 条件 | code |
|---|---|
| 不正日付 / 存在しない日（例: `2001-02-29`） | `invalid_dob` |
| stem 欠落 / NaN / 範囲外（<0 or >9） | `missing_stem` |

random / default 補完なし。

### 4.3 Output contract

| 出力 | 内容 |
|---|---|
| `dobBase.dobFp` | `sha256(dal-v1\|birthDate\|stemLaneIndex)` 先頭32hex — **DOB provenance reference**（raw DOB ではない） |
| `dobBase.axes` | `ExpressionAxes`（start/decision/recovery/distance/change） |
| `internalSelectors` | `dayBand`, `monthBand`, `stemLaneIndex`（draft 用 optional） |

**lane ID:** 明示的 `laneId` 型はない。`stemLaneIndex` 0–9 が **10資質レーン相当**の DOB 側入力。

**trait IDs:** fp-v1 には独立 trait ID 配列なし。出力は **5軸 tendency カテゴリ**のみ。

### 4.4 Lookup tables（dal-v1 実態）

| 軸 | 決定規則 |
|---|---|
| `start` | `dayBand` のみ（early→try, mid→map, late→ask） |
| `decision` | `dayBand` × `season3`（month-1 % 3）— 9 cells |
| `recovery` | `season3` のみ（3 values） |
| `distance` | `stemLaneIndex % 3`（close/middle/solo） |
| `change` | `(stemLaneIndex + dayBandIndex) % 3`（observe/adjust/rebuild） |

`dayBand`: day 1–10 early, 11–20 mid, 21–31 late。

### 4.5 DOB semantic state 分類

| 分類 | 定義 | authority |
|---|---|---|
| `DOB_INPUT_IDENTITY` | `birthDate` + `stemLaneIndex` | `dobFp` |
| `DOB_AXIS_TUPLE` | `dobBase.axes` 5軸 tuple（**27** = grid sample 内の axis tuple 数。complete state ではない） | `ExpressionAxes` |
| `DOB_COMPLETE_BASELINE_SIGNATURE` | axes + `dayBand` + `monthBand` + `stem`（**360** = grid sample 内） | `internalSelectors` + axes |
| `DOB_LANE_STATE` | `stemLaneIndex` 0–9 | `internalSelectors.stemLaneIndex` |
| `DOB_PROVENANCE_REFERENCE` | `dobFp` | hash only、raw DOB 非格納 |

### 4.6 Supported date range

**repo に supported range 定数なし。** `DOB_RANGE_AUTHORITY_UNFIXED`。

勝手に 1900–2099 等を採用しない。calendar validity を満たす任意の `YYYY-MM-DD` が形式的には受理される。

### 4.7 DOB と Questionnaire の関係

- Questionnaire は **DOB `ExpressionAxes` を上書きしない**
- 同一 schema 上で **align/diverge 比較**のみ（`alignDivergeV1.ts`）
- Core radar 数値（`AxisKey` 0–100）との canonical mapping は **存在しない**（5-view contract 参照）

---

## 5. Questionnaire Projection Authority

Questionnaire 契約正本: `M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md`（SHA `cfc8f63c...`）。

### 5.1 固定値

| 項目 | 値 |
|---|---|
| questions | 6 |
| answers | 20 |
| combinations | 3×3×3×3×3×5 = **1,215** |
| five-view tuples | **243** |
| primary themes | **5** |
| secondary themes | **4**（primary から決定、独立倍率にしない） |
| projection semantic states | **1,215** |

### 5.2 Hash 分類

| hash | 分類 | 用途 |
|---|---|---|
| `freeExpressionHash` | **`INPUT_IDENTITY_HASH`** | input determinism / provenance correlation |
| | | **not sufficient for:** semantic article uniqueness |

### 5.3 Fingerprint へ渡す実装済み fields

| field | source |
|---|---|
| `questionnaireSchemaVersion` | `free-v1` |
| `freeExpression.axes` | five-view tuple |
| `primaryReplyTheme` / `secondaryReplyTheme` | Q6 mapping |
| `freeExpressionHash` | normalized answer identity ref |
| `primaryThemeAnswerId` | stable ID（内部 draft のみ。Commerce へ raw 露出禁止） |

raw answer IDs は **Commerce evidence / Stripe metadata へ直接渡さない**。

---

## 6. Three-Layer Personal Model

### Layer 1: Stable DOB Baseline

**意味:** 比較的変わりにくい土台。物事の受け取り方、力を出しやすい条件、無理が出やすい背景、判断前の基本姿勢。

**repo 表現:** `dobBase.axes` + `dobFp` + `internalSelectors`（optional）

**禁止解釈:** 運命、未来予測、絶対的性格、不変の人格、医学的特性、成功・恋愛結果の保証。

### Layer 2: Current Expression Projection

**意味:** 現在出やすい反応、動き始め方、迷い時の決め方、負荷時の戻り方、人との距離、変化への向き合い方、現在の関心入口。

**repo 表現:** `freeExpression.axes` + `primaryReplyTheme` / `secondaryReplyTheme`

**禁止解釈:** 深層心理を測定済み、潜在意識を読み取った、固定人格、診断、本人が自覚していない真実。

### Layer 3: Integrated Interpretation Selectors

**意味:** DOB と現在表現の重なり・ずれ、負荷条件候補、戻り方候補、無料/有料で深掘りする重点。

**repo 表現（実装済み）:** `alignItems`, `divergeItems`, `pickFreeAlignDivergeItemV1`, `hesitation`, `reactiveContext`, `intensity`, `replyAffinity`

**repo 表現（candidate）:** `strainSelectorIds`, `recoverySelectorIds`, `freeBlockSelectorIds`, `paidChapterEmphasisIds`

Layer 3 は **本文ではない**。決定的 semantic block selector 群。

---

## 7. Personal Semantic Fingerprint Schema

### 7.1 実装済み schema（fp-v1 `IndividualizationFingerprint`）

| field | version / 値 | 層 |
|---|---|---|
| `fingerprintSpecVersion` | `fp-v1` | meta |
| `dobAxisLookupVersion` | `dal-v1` | meta |
| `primaryThemeReplyMapVersion` | `ptrm-v1` | meta |
| `dobBase.dobFp` | hash | L1 provenance |
| `dobBase.axes` | ExpressionAxes | L1 |
| `freeExpression.axes` | ExpressionAxes | L2 |
| `freeExpression.primaryReplyTheme` | ReplyThemeId | L2 |
| `freeExpression.secondaryReplyTheme` | ReplyThemeId | L2 |
| `freeExpression.freeExpressionHash` | INPUT_IDENTITY_HASH | L2 identity |
| `freeExpression.primaryThemeAnswerId` | stable ID | L2 internal |
| `paidDepth` | null（free-only path） | paid extension |
| `alignItems` | AlignDivergeItem[] | L3 |
| `divergeItems` | AlignDivergeItem[] | L3 |
| `intensity` | Intensity | L3 signal |
| `hesitation` | Hesitation | L3 signal |
| `reactiveContext` | ReactiveContext | L3 signal |
| `replyAffinity.ranked` | ReplyAffinityRankedItem[] | L3 ranking |

`deterministicMode`: implicit **true**（pure functions、random/provider なし）

### 7.2 Candidate future fields

| field | 分類 |
|---|---|
| `personalSemanticFingerprintVersion` | `CANDIDATE_FUTURE_FIELD`（fp-v1 進化時の上位 version） |
| `integratedSelectorVersion` | `CANDIDATE_FUTURE_FIELD` |
| `strainSelectorIds` | `CANDIDATE_FUTURE_FIELD` |
| `recoverySelectorIds` | `CANDIDATE_FUTURE_FIELD` |
| `freeBlockSelectorIds` | `CANDIDATE_FUTURE_FIELD` |
| `paidChapterEmphasisIds` | `CANDIDATE_FUTURE_FIELD` |
| `freeCompositionVersion` | `CANDIDATE_FUTURE_FIELD` |
| `paidCompositionVersion` | `CANDIDATE_FUTURE_FIELD` |
| `providerUsed` | fixed **false**（本 product path） |
| `randomUsed` | fixed **false** |

実装済みと candidate を混同しない。

### 7.3 Draft snapshot との境界

`buildIndividualizationDraftSnapshotV1` は **内部 draft** 用。含む:

- `questionnaire.freeAnswerSet` / `paidAnswerSet`（raw answers）
- `audit.outputHash`, `templateBlockIds`, engine meta

**Commerce evidence へは opaque reference + version のみ。** draft body をそのまま露出しない。

---

## 8. PII and Sensitive-Data Exclusion

### 8.1 Fingerprint へ含めないもの

```text
raw DOB
birth time
birthplace
nickname
email
raw user ID
Clerk ID
Stripe customer ID
raw answer IDs（external evidence 向け）
answer combination plain text
question display copy
report body
free result body
paid chapter body
AI/provider response
random seed
session token
webhook payload
replyAffinity internal score
```

### 8.2 許容される opaque reference

- `dobFp`（raw DOB の hash 派生、非可逆参照。semantic baseline signature とは別）
- `outputHash`（gmfn-v1）
- `paidDepthHash`（有料時）

**`freeExpressionHash` は fingerprint 内部の input determinism 確認用。** 外部 evidence reference としてそのまま使わない（§8.4）。

### 8.3 `replyAffinityV1` 内部 score

`replyAffinityV1.ts` は内部 ranking に score を使用するが、**出力型 `ReplyAffinityRankedItem` には score を含めない**（repo コメント明示）。新規 user-facing 相関 score を追加しない。分類: **`EXISTING_INTERNAL_SELECTOR_SIGNAL_ACCEPTABLE`**。

### 8.4 `freeExpressionHash` — small-domain リスク

| 項目 | 仕様 |
|---|---|
| 分類 | **`INPUT_IDENTITY_HASH`** + **`INTERNAL_HASH_EXPOSURE_BOUNDARY_REQUIRED`** + **`REVERSIBLE_SMALL_DOMAIN_HASH_RISK`** |
| 入力 | normalized answer IDs（`free-v1`）からの deterministic hash |
| 回答空間 | **1,215** combinations |

`freeExpressionHash` には raw answer IDs そのものは含まれないが、入力空間が 1,215 通りと小さいため、**辞書生成・総当たりによって回答組合せを推定できる可能性がある**。したがって **匿名化済み identifier とは扱わない**。

**外部露出禁止:** Stripe metadata / `client_reference_id` / analytics payload / public URL / browser-visible identifier / user-facing export / Commerce evidence external reference / support-visible diagnostic ID / third-party logs。

Commerce Evidence で参照が必要な場合は、**別途発行する opaque internal evidence reference** を使用する（実装方式は Commerce implementation gate で固定）。本 docs gate では salt 追加を決定・実装しない。

**許容:** fingerprint 内部の pure determinism / provenance 相関確認。**禁止:** deterministic hash だから匿名という扱い、raw answer IDs の fingerprint body への追加。

---

## 9. Align and Diverge Contract

### 9.1 比較規則（`alignDivergeV1.ts`）

| 項目 | 仕様 |
|---|---|
| 比較対象 | 5軸それぞれ: `dobAxes[axis]` vs `freeAxes[axis]` |
| relation | **exact equality** のみ。`align` or `diverge`。**neutral なし** |
| distance concept | なし（カテゴリ等値のみ） |
| evidence | 当該軸の free answer ID 1件 |
| fail-closed | evidence 欠落 → `missing_free_answers` |

### 9.2 freePick 規則

| 項目 | 仕様 |
|---|---|
| 選択数 | **exactly one** |
| 優先 | **diverge 優先**。なければ align |
| axis priority | distance > recovery > decision > start > change |
| fallback | align も diverge も空 → `null` |

### 9.2.1 freePick signature 定義（6 と 11 の区別）

**`SIGNATURE_DEFINITION_DIFFERENCE`** — 6 と 11 は同一指標の矛盾ではない。

| 種別 | signature fields | 実測（固定 DOB fixture、1,215 answers） |
|---|---|---|
| **Coarse freePick** | `axisId` + `relation` | **6 variants**（例: `distance:diverge`, `recovery:align`） |
| **Detailed freePick semantic** | `axisId` + `relation` + `dobTendency` + `freeTendency` | **11 variants**（questionnaire contract と整合） |

coarse は selector family の粗い粒度。detailed は tendency pair を含む visible semantic variant。いずれも **最終文章数ではない**。

### 9.3 Align の意味（契約）

「もともとの土台と、今選んでいる動きが近い。自然に使いやすい。説明しなくても出やすい可能性がある。」

**禁止:** 正しい、良い、本来の自分、成功しやすい、相性が良い。

### 9.4 Diverge の意味（契約）

「土台とは異なる動きを今選んでいる。環境や役割に合わせている可能性。新しい行動を試している可能性。現在負荷がある可能性。」

**禁止:** 間違っている、本来の自分ではない、無理をしていると断定、心理的問題、性格の矛盾。

**diverge 単独で strain を断定しない。** strain selector は複数 signal の組合せ必須。

---

## 10. Strain Selector Contract

### 10.1 現状

**repo に strain selector catalog 未実装。** 以下は **CANDIDATE_FUTURE_FIELD**。

### 10.2 候補 selector 例

```text
strain__pace_mismatch
strain__decision_overload
strain__distance_tension
strain__recovery_delay
strain__change_uncertainty
```

### 10.3 候補入力 signal

- DOB baseline axis
- Questionnaire expression axis
- align/diverge relation
- primary / secondary theme
- freePick
- cross-axis pattern（複数軸の組合せ）

### 10.4 各 selector に必要な条件（将来 gate）

| 項目 | 要件 |
|---|---|
| minimum supporting signals | 2以上（diverge 単独不可） |
| contradiction guard | align 軸のみで strain 断定不可 |
| suppression rule | primary theme 単独支配不可 |
| fallback | selector なし → strain block 省略 |
| free visibility | 生活語 1 ブロック以内 |
| paid chapter usage | 章固有 emphasis と重複抑制 |

### 10.5 禁止

- 一問だけで strain 断定
- diverge だけで疲労断定
- 医学・診断語
- 不安、抑うつ、発達特性等の推定
- 運命的問題として表示

---

## 11. Recovery Selector Contract

### 11.1 現状

**repo に recovery selector catalog 未実装。** `reactiveContext` / `hesitation` は partial signal。**CANDIDATE_FUTURE_FIELD**。

### 11.2 候補 selector 例

```text
recovery__small_start
recovery__sort_materials
recovery__pause_first
recovery__speak_to_trusted_person
recovery__reduce_change_scope
```

### 11.3 必須原則

- current expression と矛盾しない
- DOB baseline を否定しない
- **一つの行動**に限定
- 医療・専門助言に見せない
- 全員に同一にしない
- primary theme に応じて生活文脈を変えられる

本 gate では display copy を書かない。

---

## 12. Free-Result Selector Contract

### 12.1 実装済み selectors / signals

| ID / signal | 状態 | 入力 |
|---|---|---|
| `freePick`（align/diverge 1点） | **実装済み** | align/diverge items + priority |
| `primaryReplyTheme` | **実装済み** | Q6 |
| `freeExpression.axes`（5視点） | **実装済み** | Q1–Q5 |
| `hesitation` | **実装済み** | free/paid decision patterns |
| `reactiveContext` | **実装済み** | recovery/distance/change/fatigue scenes |
| `replyAffinity.ranked` | **実装済み** | themes + diverge + paid signals |

### 12.2 Candidate free block selectors

```text
free_intro_selector
free_dob_baseline_selector
free_current_expression_selector
free_primary_theme_selector
free_align_diverge_selector
free_strain_selector
free_recovery_selector
free_paid_depth_point_selector
```

各 selector について将来定義: input signals, required signals, selection rule, priority, fallback, suppression, visible difference, duplicate prevention。

### 12.3 必須原則

- DOB だけの結果に戻さない
- Questionnaire 差分を数字だけにしない
- 同一 DOB・異回答で **最低一つの visible selector が変わる**
- 無料結果を有料 CTA だけにしない
- paid 結果の単純短縮にしない
- free 結果単体で自己理解価値を持たせる

### 12.4 Visible granularity（実測参考）

**freePick — `SIGNATURE_DEFINITION_DIFFERENCE`:**

| signature | count | 備考 |
|---|---|---|
| Coarse（`axisId:relation`） | **6** | integrated probe（4 fixture dates × stems `[0,3,7]` × 1,215 answers）でも同型 |
| Detailed（`axisId:relation:dobTendency:freeTendency`） | **11** | questionnaire contract §11（固定 DOB fixture）と整合 |

fixture scope 差だけでなく **signature field 差が主因**。6 を「過少計数」、11 を「誤り」とは読まない。

align/diverge full signatures: integrated probe で **32**（DOB fixture 可変時）。

---

## 13. Paid Four-Chapter Emphasis Contract

### 13.1 正式章

```text
Ⅰ 自分の形を知る
Ⅱ 仕事・これからの進め方
Ⅲ 恋人・近い人との向き合い方
Ⅳ お金・生活・疲れの整え方
```

### 13.2 実装済み（paid-v1 path）

`paidDepthV1.ts` — `chapterBias`（I–IV カウント）。**free-only fingerprint では `paidDepth: null`**。

`hesitation.chapterHint` — free/paid 回答から章ヒント（partial）。

### 13.3 Candidate paid chapter emphasis selectors

各章について将来定義:

| 章 | 主入力（契約） |
|---|---|
| Ⅰ | 安定基礎、現在表現、重なり・ずれ、自己理解全体像 |
| Ⅱ | start, decision, change。仕事していない人にも適用可能な進め方 |
| Ⅲ | distance, decision, recovery。恋人存在を前提にしない |
| Ⅳ | recovery, change, distance。生活負荷。経済状態を推測しない |

### 13.4 禁止

- 4章で同じ結論を反復
- 一回答を深い人格事実として扱う
- primary theme だけで章内容を支配
- free 結果の言い換えだけ
- 未来・成功・恋愛結果を保証
- money theme から収入や経済状態を推測

---

## 14. DOB Semantic-State Analysis

### 14.1 Analysis scope

```text
DOB_RANGE_AUTHORITY_UNFIXED
DOB_STATE_DOMAIN_SAMPLE_ONLY
SYNTHETIC_GRID_SAMPLE_ONLY
FIXTURE_LEVEL_DOB_STATE_ANALYSIS_ONLY
```

全暦日 enumerate は **supported range 未固定のため実施しない**。1990 synthetic grid の結果を全 DOB authority 範囲とみなさない。

### 14.2 DOB state 分類（混同禁止）

| 分類 | 定義 | sample 実測 |
|---|---|---|
| **DOB input identity** | `birthDate` + `stemLaneIndex` → `dobFp` | 840（grid） |
| **DOB axis tuple** | `dobBase.axes` 5軸 tuple | **27**（grid） |
| **Complete baseline signature** | axes + `dayBand` + `monthBand` + `stem` | **360**（grid） |

**必須:** **27 は DOB 5軸 tuple の種類数であり、complete DOB baseline semantic state 数ではない。** `dobFp` は input identity であり、semantic baseline signature と混同しない。

**禁止:** 「27 DOB baseline states」「DOB 意味状態は全部で 27」「全生年月日は 27 種類へ分類される」。

### 14.3 Fixture-level 実測（variance test fixtures × stem 0–9）

| 指標 | 値 |
|---|---|
| fixture dates | 33 |
| valid synthetic inputs | **330** |
| invalid synthetic inputs | **0** |
| unique DOB input identities (`dobFp`) | **330** |
| unique DOB **axis tuples** | **27** |
| unique dayBands | 3 |
| unique stems tested | 10 |

### 14.4 1990 grid synthetic（`SYNTHETIC_GRID_SAMPLE_ONLY`）

**生成式:**

```text
year: 1990
months: 1–12
days: 1, 5, 10, 15, 20, 25, 28
stems: 0–9
total: 12 × 7 × 10 = 840
```

| 指標 | 値 |
|---|---|
| synthetic dates | 84 |
| unique DOB input identities | **840** |
| unique DOB **axis tuples** | **27** |
| unique **complete baseline signatures** | **360** |
| theoretical axis ceiling（5軸各3択） | 243 |
| actual dal-v1 axis tuple states | **27**（lookup table 制約） |

**360** は 1990 synthetic grid sample 内で観測された complete baseline signature 数である。**supported DOB range 全体の complete state 数ではない。**

### 14.5 Collision

grid で **dobFp collision 0**（同一 birthDate+stem → 同一 dobFp）。840 inputs が 27 axis tuples / 360 complete baselines を共有するのは **入力 identity と semantic signature の粒度差**であり、fp-v1 fingerprint 衝突ではない。

### 14.6 Determinism

同一 `birthDate` + `stemLaneIndex` → 同一 `dobBase`（`individualizationV1.test.ts` 実証）。

---

## 15. Integrated State-Space Analysis

### 15.1 八層区別（責任境界）

| Layer | 名称 | 本 gate |
|---|---|---|
| **A** | DOB input identity | `birthDate` + `stemLaneIndex` → `dobFp` |
| **B** | DOB axis tuple | `dobBase.axes`（grid sample: **27** unique） |
| **C** | Complete DOB baseline signature | axes + dayBand + monthBand + stem（grid sample: **360** unique） |
| **D** | Questionnaire projection state | **1,215**（questionnaire contract） |
| **E** | Simplified integrated signature | probe 分析用（§15.3） |
| **F** | Full `IndividualizationFingerprint` | fp-v1 実体（§15.4） |
| **G** | Visible composition | **未実装** |
| **H** | Final article output | **未証明** |

**Layer B ≠ Layer C。** 27 は axis tuple のみ。complete baseline は sample 内で 360。

### 15.2 理論上限（partial / sample）

#### Axis-tuple cross-product — `VALID_AXIS_TUPLE_CROSS_PRODUCT_UPPER_BOUND` / `PARTIAL_DOB_SIGNATURE_UPPER_BOUND`

```text
27 DOB axis tuples（grid sample）
×
1,215 Questionnaire projection states
=
32,805
```

axis tuple 層だけの理論上限。lane / dayBand / monthBand / stem 等の complete baseline 差分を含まない。full fingerprint 数・visible composition 数・final article 数ではない。

#### Sample complete-baseline cross-product — `PARTIAL_DOB_SIGNATURE_UPPER_BOUND`

```text
360 sample complete baseline signatures（1990 grid）
×
1,215 Questionnaire projection states
=
437,400
```

437,400 は 1990 synthetic grid sample 内の cross-product 上限。**supported DOB range 全体の上限ではない。** 全組合せの runtime 実証・unique full fingerprint 実測・visible composition 数・final article 数ではない。

**禁止する読み方:**

- DOB 日数 × 1,215 = 完成文章数
- 32,805 または 437,400 = 最終文章数
- integrated fingerprints = 最終文章数
- hash uniqueness = copy uniqueness

### 15.3 Simplified integrated signature（probe 分析用）

**Probe 条件:** 4 synthetic fixture dates × stems `[0, 3, 7]` = **12 DOB cases** × **1,215** answers = **14,580** combinations。

**Simplified signature 定義:**

```text
dobAxisTuple :: free five-view axes :: primaryTheme :: secondaryTheme
```

| 指標 | 値 |
|---|---|
| integrated combinations tested | **14,580** |
| unique simplified signatures | **7,290** |
| 収束式 | 12 inputs → **6** unique DOB axis tuples → 6 × 1,215 = 7,290 |

**分類:** **`PARTIAL_SIGNATURE_COLLISIONS_ONLY`**

- 7,290 は **full `IndividualizationFingerprint` の一意数ではない**
- DOB axis tuple 以外（`dobFp`、stem、dayBand 等）を省いた **分析用 partial signature**
- 12→6 は axis tuple 上の収束。**fingerprint 衝突ではない**

### 15.4 Full fp-v1 identity（actual source import 再実測）

| 指標 | 値 |
|---|---|
| full fp-v1 combinations（同一 12×1,215 probe） | **14,580** |
| full fp-v1 unique | **14,580** |
| collision | **0** |

検証対象 14,580 件では、**full `IndividualizationFingerprint` は 14,580 件すべて一意**だった。簡易 signature の 7,290 への収束は、`dobFp` 等を除いた部分 signature 上の収束である。

**禁止:** 「fp-v1 は 7,290 種類」「14,580 入力の半分が fingerprint 衝突」「DOB 情報が fingerprint から失われた」。

### 15.5 Probe 補助指標

| 指標 | 値 |
|---|---|
| unique align/diverge signatures | **32** |
| unique freePick coarse signatures（`axisId:relation`） | **6** |
| unique freeExpressionHashes | **1,215** |
| determinism mismatch | **0** |

### 15.6 Classification

```text
INTEGRATED_STATE_SPACE_SUPPORTED_BUT_COMPOSITION_UNPROVEN
PARTIAL_SIGNATURE_COLLISIONS_ONLY
SIGNATURE_DEFINITION_DIFFERENCE

minimum integrated semantic tuples (simplified): SUPPORTED（probe）
minimum full fp-v1 uniqueness (probe subset): SUPPORTED（14,580/14,580）
minimum visible free compositions: NOT YET PROVEN
minimum visible paid compositions: NOT YET PROVEN
final article hundreds: TO BE PROVEN IN COMPOSITION AND VARIANCE QA GATES
```

---

## 16. Same-DOB Variance Contract

固定 DOB: `1992-07-15`, stem `3`（probe + variance test 準拠）。

### 16.1 One-answer mutation

| 変更 | 必須差分 |
|---|---|
| Q1（start） | free axes 変化、align/diverge 変化し得る、freePick 変化し得る。**dobBase 不変** |
| Q2（decision） | 同上 |
| Q3（recovery） | 同上 |
| Q4（distance） | 同上。freePick priority 高 |
| Q5（change） | 同上 |
| Q6（primary theme） | primary/secondary theme 変化。**five-view tuple 不変**。commerce intent 推測禁止 |

probe 実測: Q1–Q6 すべて mutation で fingerprint 差分 **true**。

### 16.2 必須

- 最低 1 つの visible free selector が変わる（現行: freePick / themes / axes）
- 有料章 emphasis が最低 1 章で変わる（将来 selector 実装後に検証）
- DOB baseline 不変
- 本人同士が読んで違いを認識可能
- 単なる形容詞変更だけにしない

---

## 17. Different-DOB Variance Contract

### 17.1 Different DOB / same answers

probe 実測（`1992-07-15` vs `1990-01-25`, 同一 free answers）:

- `freeExpression` **同一**
- `dobBase` **異なる**
- align/diverge **変わり得る**
- integrated tuple **異なる**

### 17.2 必須

- Questionnaire projection は同一（同一回答時）
- DOB baseline は異なる
- 土台説明が異なる
- 回答結果が DOB 結果に上書きされない
- 完全に同一の人物文章へ収束しない構造

### 17.3 Different DOB / different answers

DOB baseline、current expression、align/diverge、primary theme、free selector、paid emphasis の複数層で差分。差分量は**点数化しない**。

---

## 18. User-Facing Language Boundary

### 18.1 本 gate で本文を作らない

後続 composition gate で生活語へ変換。

### 18.2 内部 terminology（ユーザー向け非表示）

```text
axis, lane, trait, align, diverge, selector, fingerprint, primary theme,
stemLaneIndex, dayBand, season3, replyAffinity, chapterBias
```

### 18.3 変換順

```text
内部 signal → 意味 → 日常場面 → 本人が自分に当てはめられる日本語
```

### 18.4 望ましい文章構造（composition 原則）

1. もともとの土台
2. 今の表れ方
3. 両者が重なる点
4. ずれが出る時の生活場面
5. 小さく試せる戻り方

### 18.5 禁止表現

```text
深層心理を解析しました
潜在意識を読み取りました
本当の性格
あなたは必ず
運命
相性率
成功率
危険度
レアタイプ
AIが見抜いた
```

### 18.6 許容表現の性質

「出やすい」「選びやすい」「整理しやすい」「負荷が強い時には」「いったん止まると戻りやすい」「現在は〜を選んでいるようです」— 断定ではなく生活接続。

---

## 19. Versioning and Legacy Contract

### 19.1 Version 候補

| version | 現状 |
|---|---|
| `personalSemanticFingerprintVersion` | candidate（fp-v1 進化時） |
| `dobAuthorityVersion` | **`dal-v1`** 実装済み |
| `dobBaselineVersion` | dal-v1 と同義 |
| `questionnaireSchemaVersion` | **`free-v1`** |
| `questionCopyVersion` | **`free-qc-v1`**（契約固定、repo display copy 未実装） |
| `answerContractVersion` | **`free-v1`** |
| `expressionProjectionVersion` | **`free-v1`** |
| `alignDivergeVersion` | implicit fp-v1（明示定数なし — candidate `ad-v1`） |
| `integratedSelectorVersion` | candidate |
| `freeCompositionVersion` | candidate |
| `paidCompositionVersion` | candidate |

### 19.2 変更トリガー

| 変更種別 | version bump |
|---|---|
| copy-only（meaning 不変） | `questionCopyVersion` |
| DOB lookup table 変更 | `dobAxisLookupVersion` |
| answer meaning 変更 | `answerContractVersion` |
| projection map 変更 | `expressionProjectionVersion` |
| align/diverge 規則変更 | `alignDivergeVersion` |
| selector catalog 変更 | `integratedSelectorVersion` |
| composition matrix 変更 | `freeCompositionVersion` / `paidCompositionVersion` |
| 意味変更時 | snapshot 再生成必須 |

---

## 20. Provenance and Commerce-Evidence Integration

### 20.1 将来 Evidence E6 へ渡す候補

```text
opaque internal evidence reference（Commerce implementation gate で別途発行）
fingerprint version（fp-v1）
DOB authority version（dal-v1）
questionnaire schema version（free-v1）
projection version（free-v1）
selector version（将来）
composition version（将来）
output hash（gmfn-v1）
deterministic mode: true
provider used: false
random used: false
```

**`freeExpressionHash` / `dobFp` をそのまま external evidence reference に使わない**（§8.4 small-domain / reversibility リスク）。

### 20.2 渡さない

```text
raw DOB, nickname, birthplace, birth time, email, raw user ID,
raw answers, answer combination, fingerprint raw material, report body,
freeExpressionHash（external reference として）,
dobFp（anonymous user ID として）
```

### 20.3 Runtime P0

```text
P0_METADATA_PRIVACY_REMEDIATION_REQUIRED
```

Commerce runtime は本 gate では実装しない。Stripe 承認を保証しない。

---

## 21. Compatibility Reuse Boundary

Personal Semantic Fingerprint は **一人分の authority**。

将来 compatibility 入力候補:

```text
personA fingerprint reference
personB fingerprint reference
A stable baseline / B stable baseline
A current expression / B current expression
pair-axis selectors
topic, relationship status, temperature
```

禁止:

- 本 gate で pair score を作る
- compatibility percentage
- relationship success prediction
- A/B 回答を混ぜて個人 fingerprint を再計算
- compatibility 側で DOB/Questionnaire logic を複製
- runtime 接続

```text
compatibility: HOLD
```

---

## 22. Fail-Closed Contract

### 22.1 停止条件

```text
invalid DOB
unsupported DOB range（将来定義時）
missing stem
unknown questionnaire schema
missing answer
unknown answer ID
duplicate question answer（将来 UI 層）
invalid projection version
missing DOB baseline
missing five-view tuple
unknown primary theme
unknown align/diverge version
unknown selector version
version mismatch
tampered fingerprint input
incomplete provenance
```

### 22.2 必須挙動

- fingerprint 生成を停止
- random / default で補完しない
- 別人の結果を流用しない
- DOB-only へ黙って fallback しない
- legacy fallback は明示 version + 表示境界
- user-facing error に PII を含めない
- analytics へ raw values を送らない

現行 fail codes: `invalid_dob`, `missing_stem`, `missing_free_answers`, `unknown_answer_id`, `missing_paid_answers`。

---

## 23. Selected Implementation Architecture

### 正式採用: **候補B `EXTEND_EXISTING_BUILD_INDIVIDUALIZATION_V1_WITH_VERSIONED_SELECTORS`**

### 実装方針

1. **維持:** `buildIndividualizationFingerprintV1` を Personal Semantic Fingerprint の core composer とする
2. **追加:** versioned selector resolver（strain / recovery / free block / paid chapter emphasis）
3. **分離:** selector catalog を pure data module として追加（candidate path）
4. **不変:** DOB lookup、answer maps、projection、align/diverge の既存 authority
5. **後続:** free composition matrix → paid chapter matrix → hundreds-variance QA → onboarding UIUX

### 不採用 architecture の再確認

- **A:** selector 不足のため不十分
- **C:** 重複 composer リスク
- **D:** 再設計不要

---

## 24. Proposed File Scope

### 24.1 Existing authority — ideally unchanged

```text
lib/m55/individualization/answerIdMapsV1.ts
lib/m55/individualization/dobAxisLookupV1.ts
lib/m55/individualization/freeExpressionV1.ts
lib/m55/individualization/alignDivergeV1.ts
lib/m55/individualization/primaryThemeReplyMapV1.ts
lib/m55/individualization/buildIndividualizationV1.ts
lib/m55/individualization/types.ts
lib/m55/individualization/versions.ts
```

### 24.2 Candidate new files（実装 gate で確定）

| path | 分類 |
|---|---|
| `lib/m55/individualization/strainSelectorsV1.ts` | candidate |
| `lib/m55/individualization/recoverySelectorsV1.ts` | candidate |
| `lib/m55/individualization/freeBlockSelectorsV1.ts` | candidate |
| `lib/m55/individualization/paidChapterEmphasisV1.ts` | candidate |
| `lib/m55/individualization/resolveIntegratedSelectorsV1.ts` | candidate |
| `lib/m55/individualization/integratedSelectorsV1.test.ts` | candidate |

### 24.3 推奨 gate 分割（巨大一括 implementation 禁止）

```text
1. fingerprint pure schema / selector catalog
2. selector resolution
3. free composition matrix
4. paid chapter matrix
5. hundreds-variance QA
6. onboarding UIUX design
7. runtime integration（Production 接続は別 gate、禁止解除後のみ）
```

---

## 25. Test Contract

### 25.1 Authority tests

- DOB authority version 存在
- Questionnaire authority version 存在
- exact axis IDs / tendency values
- unknown values fail closed

### 25.2 Determinism tests

- same inputs → same fingerprint
- output ordering stable
- no random / no provider / no time-dependent result
- timezone: YYYY-MM-DD parts only（既存 test 準拠）

### 25.3 Same-DOB variance

- Q1–Q6 single mutation
- DOB baseline unchanged
- projection / align-diverge / pick 変化
- unrelated fields stable

### 25.4 Different-DOB same-answer

- projection identical
- DOB baseline differs
- align/diverge may differ
- integrated selector differs（実装後）

### 25.5 Collision tests

- integrated tuple collisions 分類
- same meaning collision 許容 / accidental collision 拒否
- largest collision bounded

### 25.6 PII exclusion

- no raw DOB / nickname / email / raw user ID / raw answer tuple / body copy
- `individualizationV1.variance.test.ts` `assertNoLeakage` パターン継承

### 25.7 Copy boundary tests（後続 composition）

- no internal IDs / diagnosis / future prediction / fortune-telling
- no guaranteed outcome / deep-psychology claim
- 生活語 / 文章終端完整 / 章間重複抑制

---

## 26. UIUX Boundary

### 26.1 本 gate では UI 実装しない

後続専用 gate:

```text
CATEGORY-2-M55-FREE-PERSONAL-ONBOARDING-ACQUISITION-CONVERSION-UIUX-DESIGN-REV1
```

### 26.2 開始条件

```text
Personal Semantic Fingerprint GREEN
Free Composition Matrix GREEN
Paid Four-Chapter Matrix GREEN
Hundreds Variance QA GREEN
```

### 26.3 必須要件

mobile-first, one-screen-one-question, first-use comprehension, high-end contemporary visual system, meaningful motion, reduced-motion, keyboard, focus, aria, contrast, Core Web Vitals, completion funnel, ethical paid conversion, Human visual review, PC/mobile/narrow-width QA。

### 26.4 禁止

dark patterns, false countdown, fake rarity, fake AI, fake analysis loading, purchase urgency, answer-value judgment, result withholding solely for conversion。

---

## 27. Gate Sequence

```text
1. CATEGORY-2-M55-PERSONAL-SEMANTIC-FINGERPRINT-CONTRACT-ACTUAL-DIFF-REVIEW-REV1（本契約レビュー）
2. DOC MICRO-PATCH（必要時）
3. COMMIT → PUSH → PRODUCTION OBSERVE
4. fingerprint selector catalog pure implementation
5. selector resolution implementation
6. free composition matrix contract + implementation
7. paid four-chapter matrix contract + implementation
8. hundreds-variance QA
9. onboarding UIUX design
10. runtime integration（Production 接続禁止解除前は HOLD）
11. metadata P0 remediation（Commerce 並行必須）
```

Questionnaire runtime Production 接続前に provenance contract 実装必須。

---

## 28. Explicit Non-Goals

- production code edit（本 gate）
- questionnaire runtime 接続
- free/paid composition 実装
- UI/CSS / animation
- DB / Stripe / checkout / webhook
- metadata remediation 実装
- compatibility 接続
- random / provider / LLM
- 新規相関 score
- 深層心理測定の断定
- 完成文章 hundreds の証明（本 gate では未証明のまま）
- commit / push / deploy

---

## 29. Open Risks

| Risk | Severity | Mitigation |
|---|---|---|
| DOB supported range 未固定 | Medium | 将来 dal-v2 で range contract。本 gate は `SYNTHETIC_GRID_SAMPLE_ONLY` |
| 27 axis tuples を complete state と誤読 | Medium | §14–§15 で B/C 層分離。360 complete baseline は sample 内のみ |
| simplified signature 7,290 を fp-v1 衝突と誤読 | Medium | §15.3–§15.4 で partial vs full fp-v1（14,580/14,580）を分離 |
| freePick 6/11 の混同 | Low | `SIGNATURE_DEFINITION_DIFFERENCE`（coarse vs detailed）を §9/§12/§15 で固定 |
| `freeExpressionHash` small-domain reversibility | Medium | `REVERSIBLE_SMALL_DOMAIN_HASH_RISK`。外部 evidence 禁止、opaque ref は Commerce gate |
| dal-v1 axis tuple states 27 のみ（理論 243 未満） | Low | lookup table 設計意図。入力 identity（dobFp）で区別 |
| strain/recovery/free/paid selectors 未実装 | High | 候補B 拡張 gate で catalog + resolver |
| `IndividualizationDraft` に raw answers 含む | Medium | Commerce へ opaque ref のみ。draft は内部境界 |
| DTR engine DOB（v2/v2.1）と fp-v1 dal-v1 の二系統 | Medium | 契約で authority 分離を維持。統合は将来 gate |
| metadata P0 未解消 | High | remediation gate 必須 |
| final article hundreds 未証明 | High | composition + variance QA |
| runtime 未接続 | Expected | Production PROHIBITED 維持 |

---

**END OF CONTRACT**
