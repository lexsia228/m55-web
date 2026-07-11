# M55 Free Personal Questionnaire Semantic Coverage Contract and Actual-Diff Plan Rev1

- **Gate ID:** `CATEGORY-2-M55-FREE-PERSONAL-QUESTIONNAIRE-SEMANTIC-COVERAGE-CONTRACT-AND-ACTUAL-DIFF-PLAN-REV1`
- **Status:** CONTRACT DRAFT（実装前・docs-only）
- **Canonical worktree:** `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish`
- **Base SHA:** `2b62d0cffe94946485b5a03f63760210a5c84017`
- **Ownership:** 本ファイルが個人向け無料初回 questionnaire の意味契約正本。実装・UI・runtime 接続は本契約に従う別 gate で行う。

**上位契約（変更しない）:**

- `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` — 候補B 二層分離、5視点、visible variance
- `docs/planning/M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` — HYBRID、provenance、P0 metadata

---

## 1. Decision

### 正式採用

| 項目 | 判定 |
|---|---|
| 質問数 | **6問**（5 `ExpressionAxis` + `primary_theme`）— repo 実態と一致 |
| 質問 schema | **既存 `free-v1` を維持**（`FREE_QUESTION_IDS` / answer ID maps） |
| 投影ロジック | **既存 pure functions を維持**（新規 score / mapping なし） |
| ユーザー向け質問文 | **本契約で新規固定**（repo に display copy 未存在） |
| 実装 architecture | **候補B `REWRITE_QUESTION_COPY_KEEP_STABLE_IDS`** |

### 候補B 採用理由

| 条件 | 実態 |
|---|---|
| 意味信号は妥当 | 各 answer ID → tendency / theme の 1:1 map が `answerIdMapsV1.ts` に凍結済み |
| axis coverage | 5軸それぞれに専用 question が存在（1:1 primary） |
| answer ID stable | `free-v1` ID は immutable（copy polish のみ許可） |
| projection semantic states | **実測 1,215**（raw answer 除外後。§11 Layer B）— 数百種類の**入力空間**として十分 |
| gap | **ユーザー向け question / answer display copy が repo に存在しない** |

### 四層差分定義（本契約の責任境界）

| Layer | 名称 | 現状実測 / 状態 |
|---|---|---|
| **A** | Input identity | **1,215** 有効入力組合せ。`freeExpressionHash` = **`INPUT_IDENTITY_HASH`**（同一入力の決定性・provenance 相関用。**最終文章の意味差分数ではない**） |
| **B** | Projection semantic state | **1,215**（five-view tuple 243 × primary theme 5。secondary theme は primary から決定され独立倍率にしない） |
| **C** | Visible composition state | **未実装・未実証**。確定済み: primary theme / 5視点 / freePick（**11 visible variants**）。narrative・strain・recovery・paid chapter emphasis は後続 gate |
| **D** | Final article output | **数百種類の完成・品質は未証明**。composition matrix 未実装。hundreds-variance QA で実証 |

現行 `free-v1` は、1,215 種類の有効入力組合せと、raw answer IDs を除いた 1,215 種類の projection semantic state を決定的に区別できる。これは数百種類の意味的文章構成を支える十分な入力空間である。ただし、無料 narrative・有料 4章・strain・recovery・chapter block selection の composition matrix は未実装のため、**数百種類の最終文章が完成済みであることはまだ証明していない**。最終文章の意味差分・重複率・自然さ・章間分離は、後続の composition matrix および hundreds-variance QA で実証する。

### 不採用

| 候補 | 判定 | 理由 |
|---|---|---|
| **A** `REUSE_EXISTING_QUESTION_SCHEMA_AND_PROJECTION` のみ | 不採用（本 gate 時点） | display copy が未存在のため「UI 接続のみ」では不十分。copy contract を先に固定する必要あり |
| **C** `VERSIONED_QUESTION_AND_ANSWER_CONTRACT_REVISION` | 不採用 | answer meaning / axis map の変更は不要。ID 意味変更なし |
| **D** `QUESTIONNAIRE_CONTRACT_REDESIGN_REQUIRED` | 不採用 | 6問構成で既存 5-view pure logic が成立（1,215 組合せ実測） |

### 分類（本 gate）

```text
COPY_ONLY_ARCHITECTURE_VALID
DIRECT_MAP_ACCEPTABLE_FOR_FREE_CURRENT_EXPRESSION
COPY_QUALITY_PASS
SEMANTIC_300_SUPPORTED_BUT_COMPOSITION_UNPROVEN
COVERAGE_COMPLETE
```

**Stripe 承認を保証しない。** **Production 接続許可を出さない。**

---

## 2. Scope and Non-Goals

### In scope

- 既存 `free-v1` questionnaire inventory（READ-ONLY）
- 最終 6問・全 answer copy の商品契約固定
- axis coverage / fail-closed / combination-space 契約
- free / paid への意味信号伝播契約（本文は作らない）
- game-like UX 境界（semantic のみ）
- versioning / provenance / analytics PII 除外
- future implementation / test gate sequence

### Out of scope（本 gate 禁止）

- production code / UI / CSS / test 編集
- 既存 answer ID の意味変更
- 新規 canonical mapping / correlation score
- provider / random / 疑似 AI 演出
- Product Truth copy 変更
- paid report 本文作成
- compatibility runtime 接続
- DB migration / Stripe / checkout / metadata remediation
- commit / push / PR / deploy

### Commerce 境界（未解消・本 gate では触らない）

```text
P0_METADATA_PRIVACY_REMEDIATION_REQUIRED
STRIPE_CLASSIFICATION_REVIEW_REQUIRED
Offer Snapshot: MISSING
Digital Access Evidence: MISSING
Evidence Export: MISSING
retention: 未確定
```

---

## 3. Existing Questionnaire Inventory

### 3.1 関連ファイル（exact paths）

| 分類 | Path |
|---|---|
| answer ID maps | `lib/m55/individualization/answerIdMapsV1.ts` |
| types | `lib/m55/individualization/types.ts` |
| versions | `lib/m55/individualization/versions.ts` |
| free projection | `lib/m55/individualization/freeExpressionV1.ts` |
| DOB baseline | `lib/m55/individualization/dobAxisLookupV1.ts` |
| align/diverge | `lib/m55/individualization/alignDivergeV1.ts` |
| fingerprint compose | `lib/m55/individualization/buildIndividualizationV1.ts` |
| output hash | `lib/m55/individualization/outputHashV1.ts` |
| signals | `lib/m55/individualization/signalsV1.ts` |
| reply affinity | `lib/m55/individualization/replyAffinityV1.ts` |
| primary theme map | `lib/m55/individualization/primaryThemeReplyMapV1.ts` |
| paid depth | `lib/m55/individualization/paidDepthV1.ts` |
| unit tests | `lib/m55/individualization/individualizationV1.test.ts` |
| variance tests | `lib/m55/individualization/individualizationV1.variance.test.ts` |
| variance evidence | `docs/evidence/M55_FP_V1_INDIVIDUALIZATION_VARIANCE_QA_2026-07-09.md` |
| 5-view contract | `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` |
| core runtime（未接続） | `components/core/CoreEssencePanel.tsx`, `lib/m55/coreResult/store.ts` |
| birth intake（質問なし） | `components/profile/BirthProfileIntakeLayer.tsx` |

**questionnaire display copy 定義ファイル:** **repo に存在しない**（answer ID のみ）。

### 3.2 Question / answer inventory

| # | question_id | answer count | answer IDs |
|---|---|---|---|
| Q1 | `free.start_style` | 3 | `free.start_style.map_first`, `free.start_style.try_first`, `free.start_style.ask_first` |
| Q2 | `free.decision_style` | 3 | `free.decision_style.sort_first`, `free.decision_style.deadline_first`, `free.decision_style.wait_first` |
| Q3 | `free.recovery_style` | 3 | `free.recovery_style.pause_short`, `free.recovery_style.shrink_task`, `free.recovery_style.change_scene` |
| Q4 | `free.distance_style` | 3 | `free.distance_style.close_careful`, `free.distance_style.middle_steady`, `free.distance_style.solo_reset` |
| Q5 | `free.change_style` | 3 | `free.change_style.observe_first`, `free.change_style.adjust_fast`, `free.change_style.rebuild_slow` |
| Q6 | `free.primary_theme` | 5 | `free.primary_theme.work`, `.relation`, `.fatigue`, `.tendency`, `.report_preview` |

**schema version:** `free-v1`（`FREE_QUESTIONNAIRE_VERSION`）

**question order（schema）:** `FREE_QUESTION_IDS` 順（start → decision → recovery → distance → change → primary_theme）

### 3.3 Projection / aggregation（既存・変更禁止）

| 項目 | 実装 |
|---|---|
| 5軸 projection | `buildFreeExpressionV1` — 各 question の answer ID → 対応 axis の tendency へ **直接 map**（集計なし） |
| primary theme | `mapPrimaryThemeToReplyThemeV1` — Q6 answer → `primaryReplyTheme` + `secondaryReplyTheme` |
| align/diverge | `buildAlignDivergeItemsV1` — 同一 `ExpressionAxes` 上で `dobBase.axes` vs `freeExpression.axes` を軸ごと比較 |
| freePick tie-break | `pickFreeAlignDivergeItemV1` — diverge 優先。axis priority: distance > recovery > decision > start > change |
| fingerprint | `buildIndividualizationFingerprintV1` |
| output hash | `buildIndividualizationOutputHashV1` |
| invalid answer | `unknown_answer_id` → fail-closed |
| incomplete answer | `missing_free_answers` → fail-closed |
| random / provider | **不使用** |

### 3.4 Runtime 接続状態

| 項目 | 状態 |
|---|---|
| `/core` questionnaire UI | **未実装** |
| `individualization/**` runtime import | **なし**（`CoreEssencePanel` 未接続） |
| free answer 保存 | **未確定**（5-view contract §10 — 意味契約のみ） |
| paid 接続 | fp-v1 は paid-v1 と合成可能。無料 questionnaire は **freeAnswerSet のみ**で fingerprint 生成可（`paidAnswerSet: null`） |
| legacy | 既存 sealed core result の DOB-only 表示は移行期間限定（5-view contract §9） |

---

## 4. Existing Expression-Axis Contract

### ExpressionAxisId（5つの視点の内部軸）

| axisId | question_id | tendency 型 | 値 |
|---|---|---|---|
| `start` | `free.start_style` | `StartTendency` | `map` \| `try` \| `ask` |
| `decision` | `free.decision_style` | `DecisionTendency` | `sort` \| `deadline` \| `wait` |
| `recovery` | `free.recovery_style` | `RecoveryTendency` | `pause` \| `shrink` \| `scene` |
| `distance` | `free.distance_style` | `DistanceTendency` | `close` \| `middle` \| `solo` |
| `change` | `free.change_style` | `ChangeTendency` | `observe` \| `adjust` \| `rebuild` |

### DOB baseline（混同禁止）

- **10資質:** `CoreResult.stemLaneIndex`（0–9）
- **DOB baseline radar:** `CoreResult.coreAxisScores`（5 `AxisKey` 数値）— Public「5つの視点」に使用しない
- **DOB expression baseline:** `buildDobAxisLookupV1` → `dobBase.axes`（同一 `ExpressionAxes` schema）— align/diverge の DOB 側

**禁止:** `AxisKey` ↔ `ExpressionAxisId` の新規 mapping。

---

## 5. Product and User-Experience Objective

### 必須 UX 目的

1. 初見ユーザーが答えながら、**いまの反応傾向**に気づける
2. **一問ずつ**進み、ゲーム的な軽い没入感（得点・診断・正解なし）
3. 各回答が **解析結果への有用な意味信号**を与える
4. **同一 DOB・異なる回答**で visible difference
5. DOB 10資質と回答 5視点を **混同しない**
6. 無料文章・有料 4章へ **意味信号を伝播**できる
7. 決定的 pure logic で **数百以上の意味的差分**
8. random / provider / 新規 score **不使用**
9. 将来 compatibility が個人 fingerprint を再利用可能
10. Commerce Evidence provenance へ接続可能

### ユーザー自己理解（6領域 ↔ axis 対応）

| 自己理解領域 | 対応 question / axis |
|---|---|
| 最初に動くか、整理してから動くか | Q1 `start` |
| 迷ったとき何を頼りにするか | Q2 `decision` |
| 負荷が高まったときの反応 | Q3 `recovery` |
| 人との距離の取り方 | Q4 `distance` |
| 変化への向き合い方 | Q5 `change` |
| いま一番気になる読みの入口 | Q6 `primary_theme` |

---

## 6. Final Six-Question Contract

**questionnaireSchemaVersion:** `free-v1`
**questionCopyVersion:** `free-qc-v1`（本契約で新規。answer meaning は不変）

### Q1 — `free.start_style`

| 項目 | 内容 |
|---|---|
| question_version | `free-qc-v1` |
| short_label | はじめの一歩 |
| final_question_ja | 新しいことを始めるとき、いちばん近いのはどれですか。 |
| scene_context_ja | 仕事でも私生活でも、いま目の前に新しいことが来た場面を思い浮かべてください。 |
| answer_ids | `map_first`, `try_first`, `ask_first` |
| axis_contributions | **primary:** `start` |
| free_result_signal | `ExpressionAxes.start` → 5視点リスト・align/diverge |
| paid_result_signal | Ⅰ 輪郭・Ⅱ 着手点の補助 |
| why_this_question_exists | 「動き出し方」は回答で変わる現在層の入口 |
| forbidden_interpretations | 性格の良し悪し、正しい始め方、成功予測 |

### Q2 — `free.decision_style`

| 項目 | 内容 |
|---|---|
| question_version | `free-qc-v1` |
| short_label | 迷ったとき |
| final_question_ja | 選択に迷ったとき、いちばん近いのはどれですか。 |
| scene_context_ja | どちらにするか決めきれない、少し立ち止まった場面を思い浮かべてください。 |
| answer_ids | `sort_first`, `deadline_first`, `wait_first` |
| axis_contributions | **primary:** `decision` |
| secondary_signal | `hesitation`（`wait_first` 時）、`replyAffinity` diverge |
| free_result_signal | `ExpressionAxes.decision`、freePick 候補 |
| paid_result_signal | Ⅱ 進め方・Ⅲ 伝え方の補助 |
| why_this_question_exists | 迷いの処理方法は「いまの表れ方」の核心 |
| forbidden_interpretations | 優柔不断の断定、決断力の点数化 |

### Q3 — `free.recovery_style`

| 項目 | 内容 |
|---|---|
| question_version | `free-qc-v1` |
| short_label | 負荷が高まったとき |
| final_question_ja | 負荷が高まったとき、いちばん近いのはどれですか。 |
| scene_context_ja | 忙しさや気持ちの重さが増えてきた場面を思い浮かべてください。 |
| answer_ids | `pause_short`, `shrink_task`, `change_scene` |
| axis_contributions | **primary:** `recovery` |
| secondary_signal | `reactiveContext.scenes` |
| free_result_signal | `ExpressionAxes.recovery`、無理が出やすい条件・戻り方ブロック候補 |
| paid_result_signal | Ⅳ 疲れ・生活リズム |
| why_this_question_exists | 立て直し方は visible variance の主要因 |
| forbidden_interpretations | うつ・燃え尽き等の病名暗示 |

### Q4 — `free.distance_style`

| 項目 | 内容 |
|---|---|
| question_version | `free-qc-v1` |
| short_label | 人との距離 |
| final_question_ja | 人との距離の取り方で、いちばん近いのはどれですか。 |
| scene_context_ja | 近い人や仕事の相手と接するときの距離感を思い浮かべてください。恋人がいなくても答えられる問いです。 |
| answer_ids | `close_careful`, `middle_steady`, `solo_reset` |
| axis_contributions | **primary:** `distance` |
| secondary_signal | `replyAffinity` diverge（distance 軸）、`hesitation`（ask+close 組合せ時） |
| free_result_signal | `ExpressionAxes.distance`、freePick **最優先軸** |
| paid_result_signal | Ⅲ 恋人・近い人 |
| why_this_question_exists | 関係文脈への信号。freePick priority 首位 |
| forbidden_interpretations | 愛され度、人間関係の良し悪し |

### Q5 — `free.change_style`

| 項目 | 内容 |
|---|---|
| question_version | `free-qc-v1` |
| short_label | 変化への向き合い方 |
| final_question_ja | 状況が変わったとき、いちばん近いのはどれですか。 |
| scene_context_ja | 予定や環境が変わったときの、最初の反応を思い浮かべてください。 |
| answer_ids | `observe_first`, `adjust_fast`, `rebuild_slow` |
| axis_contributions | **primary:** `change` |
| secondary_signal | `reactiveContext` |
| free_result_signal | `ExpressionAxes.change` |
| paid_result_signal | Ⅰ 自分の形・Ⅱ 進め方の補助 |
| why_this_question_exists | 変化への反応は DOB baseline と独立に差分が出る |
| forbidden_interpretations | 柔軟性の点数、変化への適応力ランク |

### Q6 — `free.primary_theme`

| 項目 | 内容 |
|---|---|
| question_version | `free-qc-v1` |
| short_label | いまの入口 |
| final_question_ja | いま、いちばん読み返してみたいのはどれに近いですか。 |
| scene_context_ja | 正解はありません。いまの関心に近いものを選んでください。まだ保存版を持っていなくても、「あとでじっくり読み返せる形にしたい」という今の関心として選べます。 |
| answer_ids | `work`, `relation`, `fatigue`, `tendency`, `report_preview` |
| axis_contributions | **primary:** `primaryReplyTheme` / `secondaryReplyTheme`（5軸とは別レーン） |
| free_result_signal | primary theme カード、narrative 入口、CTA 文脈 |
| paid_result_signal | 章バイアス入口（購入後 paid-v1 と合成）、追加読み解きテーマ候補 |
| why_this_question_exists | 5軸だけでは決まらない「いまの読み入口」を分離。有料商品の選択ではなく、**いま整理したい関心入口** |
| forbidden_interpretations | 運命のテーマ、最適解、おすすめ診断結果。`report_preview` 選択を購入意欲の断定・commerce segmentation・強い有料 CTA に使用しない。未購入者を除外しない |

---

## 7. Final Answer Contract

各 answer は **stable ID** を維持。表示文言のみ `free-qc-v1` で固定。

### Q1 `free.start_style`

| answer_id | final_answer_label_ja | tendency | answer_semantics |
|---|---|---|---|
| `free.start_style.map_first` | 先に整理してから動く | `map` | 全体像・手順を整えてから着手 |
| `free.start_style.try_first` | 小さく試しながら進める | `try` | 試行で輪郭を掴む |
| `free.start_style.ask_first` | 先に情報や相談を足す | `ask` | 聞く・集めることを先に置く |

### Q2 `free.decision_style`

| answer_id | final_answer_label_ja | tendency | answer_semantics |
|---|---|---|---|
| `free.decision_style.sort_first` | 選択肢を並べて整理する | `sort` | 比較整理で決める |
| `free.decision_style.deadline_first` | 区切りを決めて決める | `deadline` | 期限・区切りで進める |
| `free.decision_style.wait_first` | 少し時間を置いてから決める | `wait` | 保留・熟考を許容 |

### Q3 `free.recovery_style`

| answer_id | final_answer_label_ja | tendency | answer_semantics |
|---|---|---|---|
| `free.recovery_style.pause_short` | 短く立ち止まって休む | `pause` | 短い休息で整える |
| `free.recovery_style.shrink_task` | やることを小さくする | `shrink` | スコープ縮小で負荷を下げる |
| `free.recovery_style.change_scene` | 場所や雰囲気を変える | `scene` | 環境切替で戻す |

### Q4 `free.distance_style`

| answer_id | final_answer_label_ja | tendency | answer_semantics |
|---|---|---|---|
| `free.distance_style.close_careful` | 近い距離でも、配慮して接する | `close` | 近接＋配慮 |
| `free.distance_style.middle_steady` | 一定の距離を保つ | `middle` | 中間距離を維持 |
| `free.distance_style.solo_reset` | 一人の時間で整える | `solo` | 単独時間でリセット |

### Q5 `free.change_style`

| answer_id | final_answer_label_ja | tendency | answer_semantics |
|---|---|---|---|
| `free.change_style.observe_first` | まず様子を見る | `observe` | 観察優先 |
| `free.change_style.adjust_fast` | 早めに微調整する | `adjust` | 小さな修正で合わせる |
| `free.change_style.rebuild_slow` | 一度土台から作り直す | `rebuild` | 再構築志向 |

### Q6 `free.primary_theme`

| answer_id | final_answer_label_ja | ReplyThemeId | answer_semantics |
|---|---|---|---|
| `free.primary_theme.work` | 仕事・進め方 | `work` | 仕事文脈の入口 |
| `free.primary_theme.relation` | 人との関係 | `relation` | 関係文脈の入口 |
| `free.primary_theme.fatigue` | 疲れ・生活のリズム | `fatigue` | 疲労・生活文脈 |
| `free.primary_theme.tendency` | 自分の傾向の読み方 | `tendency` | 読み方・輪郭の入口 |
| `free.primary_theme.report_preview` | あとでじっくり読み返せる形にしたい | `report` | 保存版利用の入口（**未購入でも選べる現在の関心**。購入前提・有料経験不要） |

**secondary theme map（既存・変更禁止）:** `PRIMARY_TO_SECONDARY_REPLY` in `answerIdMapsV1.ts`

### 回答後 acknowledgement contract（全問共通原則）

| 項目 | 契約 |
|---|---|
| 目的 | 受け取り感・次問への接続・リズム。結果の事前漏洩なし |
| 長さ | 1文。最大 40 字目安 |
| 禁止 | 「○○タイプ」「正解」「良い選択」「AI分析中」「深層心理」「珍しい回答」 |
| 許容例 | 「受け取りました。」「次は、迷ったときの動き方を見ます。」 |

| 直後 | acknowledgement_ja |
|---|---|
| Q1 後 | 受け取りました。次は、迷ったときの動き方を見ます。 |
| Q2 後 | 受け取りました。次は、負荷が高まったときの戻し方を見ます。 |
| Q3 後 | 受け取りました。次は、人との距離の取り方を見ます。 |
| Q4 後 | 受け取りました。次は、変化への向き合い方を見ます。 |
| Q5 後 | 受け取りました。最後に、いまの読みの入口を選びます。 |
| Q6 後 | 6つの選択を受け取りました。いまの見取り図を組み立てます。 |

---

## 8. Question-to-Axis Coverage Matrix

| Question | start | decision | recovery | distance | change | primary theme | coverage note |
|---|---|---|---|---|---|---|---|
| Q1 | **P** | — | — | — | — | — | 1:1 primary |
| Q2 | — | **P** | — | — | — | — | 1:1 primary |
| Q3 | — | — | **P** | — | — | — | 1:1 primary |
| Q4 | — | — | — | **P** | — | — | 1:1 primary; freePick 最優先 |
| Q5 | — | — | — | — | **P** | — | 1:1 primary |
| Q6 | — | — | — | — | — | **P** | 5軸とは別レーン |

**分類:** `COVERAGE_COMPLETE`

**設計注記（既存ロジック事実）:**

- 各 5軸 question は **当該 axis を直接決定**する（aggregation なし）。これは `free-v1` の凍結設計。
- **単一 question が全出力を決定しない:** primary theme・align/diverge・freePick・narrative は他信号が必要。
- **単一 answer が primary theme を決定しない:** Q6 のみが theme を決定。
- option position bias: 全問 3択（Q6 は 5択）で中央安全択け設計を避けるため、ラベルは対等な行動記述とする。

**zero-effect question / answer:** 実測なし（§11）。全問・全 answer が出力に寄与。

---

## 9. Aggregation and Tie-Break Contract

| 段階 | 契約 |
|---|---|
| 5軸 aggregation | **なし** — 各 question が 1 answer → 1 tendency へ直接 map |
| primary theme | Q6 answer → `ReplyThemeId` 直接 map + secondary 固定表 |
| align/diverge | DOB `ExpressionAxes` vs answer `ExpressionAxes` 軸ごと等値比較 |
| freePick tie-break | diverge 優先 → align。同種内は axis priority: distance > recovery > decision > start > change |
| replyAffinity tie-break | internal score（**出力に score を露出しない**）→ themeId 辞書順 |
| determinism | same input → same output（`individualizationV1.test.ts` / variance QA） |

**禁止:** 新規 weight / score / random tie-break。

---

## 10. Fail-Closed Contract

| 条件 | fail code | 挙動 |
|---|---|---|
| unknown question ID（set に余分な key のみではなく、必須欠落） | `missing_free_answers` | 結果生成しない |
| unknown answer ID | `unknown_answer_id` | 結果生成しない |
| duplicate answer for one question | （schema 上 Record で最後の値）— **runtime は単一選択 UI で防止** | tamper 時は validation gate で拒否 |
| missing question（6問いずれか欠落） | `missing_free_answers` | 結果生成しない |
| extra question keys only | 無視しない — 必須 6 key のみ評価 | 欠落があれば fail |
| wrong schema version | version mismatch handler（実装 gate） | fail-closed |
| deprecated answer version | legacy map に残すまで fail | 再選択 UI |
| invalid ordering | UI state machine で防止 | 結果生成しない |
| tampered payload | hash / validation 不一致 | 再選択。内部 error に PII なし |
| invalid DOB / stem | `invalid_dob` / `missing_stem` | 結果生成しない |

**禁止:** default 回答補完、ランダム結果、raw answers の analytics 送信。

---

## 11. Combination-Space Analysis

### 理論空間

```text
total_answer_combinations = 3 × 3 × 3 × 3 × 3 × 5 = 1,215
```

### 四層実測サマリー（synthetic DOB `1992-07-15`, stem `3`, `paidAnswerSet: null`）

| Layer | 指標 | 値 | 備考 |
|---|---|---|---|
| **A Input identity** | valid input combinations | **1,215** | normalized answer ID 組合せ |
| **A** | `freeExpressionHash` unique | **1,215** | classification: **`INPUT_IDENTITY_HASH`**。purpose: input determinism / provenance correlation。**not sufficient for:** semantic article uniqueness, visible composition uniqueness, copy-quality proof |
| **B Projection semantic state** | unique five-view tuples | **243**（= 3^5） | raw answer tuple を signature に含めない |
| **B** | unique primary themes | **5** | |
| **B** | unique secondary themes | **4** | primary から決定。独立倍率にしない |
| **B** | five-view + primary + secondary | **1,215** | 現在の表れ方と関心入口の意味状態。**最終文章本文ではない** |
| **C Visible composition** | unique align/diverge signatures | **243** | DOB fixture 固定時 |
| **C** | unique freePick visible signatures | **11** | align/diverge 1点ブロックの visible 粒度は粗い |
| **C** | narrative / strain / recovery / paid chapter blocks | **未実装** | 後続 composition gate で確定・実測 |
| **D Final article** | 無料 narrative + 有料 4章の完成数 | **未証明** | hundreds-variance QA で実証 |
| — | collision count | **0** | |
| — | deterministic | **YES** | |

### semantic variance classification

```text
SEMANTIC_300_SUPPORTED_BUT_COMPOSITION_UNPROVEN

minimum 300 projection states: PASS（Layer B = 1,215）
minimum 300 visible article compositions: NOT YET PROVEN
final article hundreds: TO BE PROVEN IN COMPOSITION AND VARIANCE QA GATES
```

**禁止する読み方（本契約で主張しない）:** 1,215 種類の文章が完成している / 1,215 通りの解析本文を生成済み / hash が異なるため文章も異なる / freePick だけで数百文章差分を保証できる。

**注記:** 243 five-view states × 5 primary themes により projection semantic state は 1,215。これは数百種類の意味的文章構成を支える**十分な入力空間**であるが、組合せ数・hash 数だけが最終文章品質保証ではない。

### same-DOB visible variance（既存テスト再利用）

| Case | 観測 |
|---|---|
| F0 → F2（distance 変更） | axes.distance 変化、freePick 変化、hash 変化 |
| F0 → F6（theme のみ） | primaryReplyTheme 変化、hash 変化 |
| one-answer mutation | 対応 axis または theme へ検出可能な差分 |

---

## 12. Semantic Fingerprint Contract

### 四層と fingerprint の対応

| Layer | fingerprint / hash への含め方 |
|---|---|
| A Input identity | `normalized answer IDs` + `questionnaireSchemaVersion` → **`freeExpressionHash`（`INPUT_IDENTITY_HASH`）** |
| B Projection semantic state | `five-view signature`, `primaryReplyTheme`, `secondaryReplyTheme`（raw answer ID は含めない） |
| C Visible composition | `freePick signature`, 将来 `freeCompositionVersion` + block-selection IDs（**未実装**） |
| D Final article | export 対象の redacted body hash（**未実装・未証明**） |

### fingerprint 構成（fp-v1 既存 + 将来 composition）

| 含める | 含めない |
|---|---|
| `questionnaireSchemaVersion` (`free-v1`) | nickname |
| `questionCopyVersion` (`free-qc-v1`) | raw DOB |
| normalized answer IDs（sorted keys） | birthplace |
| `expressionProjectionVersion`（`free-v1`） | email |
| five-view signature（5 tendencies tuple） | raw user ID |
| `primaryReplyTheme` / `secondaryReplyTheme` | report body |
| align/diverge signature | display copy |
| freePick signature | random seed |
| `dobFp` reference（opaque） | provider response |
| `semanticFingerprintVersion`（`sf-v1` 候補） | raw answer text |
| `freeCompositionVersion`（実装 gate） | |

**`freeExpressionHash` 分類:** **`INPUT_IDENTITY_HASH`** — input determinism / provenance correlation に使用。**semantic article uniqueness・visible composition uniqueness・copy-quality proof には不十分**（Layer B–D は別途評価）。

**原則:** 同じ意味入力 → 同じ fingerprint。意味変更時は version を上げる。fingerprint だけで本文を逆算できない設計。

**Stripe / evidence:** raw answers を Stripe metadata に格納しない。evidence 層は opaque snapshot / evidence reference。

---

## 13. Same-DOB Visible-Variance Contract

**固定 DOB + 異なる回答**で、無料結果の visible block に **最低 1 つ以上**の意味差分が必須。

| 優先 | 変化対象 |
|---|---|
| P0 | `freeExpression.axes` 1軸以上 |
| P0 | `primaryReplyTheme` / `secondaryReplyTheme` |
| P0 | 5つの視点表示ブロック |
| P1 | `freePick`（align/diverge 1点） |
| P1 | align/diverge 要約 |
| P2 | primary theme カード |

**変化してはならない（same DOB）:** `coreAxisScores`、DOB radar 形状、stemLaneIndex、`dobBase.axes`。

**不可:** hash のみ変化して UI が同一に見える状態。

---

## 14. Free-Result Signal Propagation

| Block | input signals | selection rule | visible difference |
|---|---|---|---|
| 10資質レーン | birthDate → stem | `buildCoreResultClient` | DOB のみ（回答では変わらない） |
| primary theme | Q6 → ReplyThemeId | direct map | theme 回答で必ず変化しうる |
| 5つの視点 | Q1–Q5 → ExpressionAxes | `buildFreeExpressionV1` | 各軸 tendency 表示 |
| align/diverge 1点 | dobBase + freeAxes | `pickFreeAlignDivergeItemV1` | diverge 優先 1点 |
| 短い narrative | axes + theme + freePick | template matrix（実装 gate） | 複数信号の組合せ |
| 無理が出やすい条件 1点 | recovery + change + reactiveContext | template（実装 gate） | 回答で変化 |
| 短い戻り方 1点 | recovery + distance | template（実装 gate） | 回答で変化 |
| 有料で深くなる point | theme + align/diverge | 境界 copy（既存 boundary） | CTA 文脈のみ |
| DOB 10-trait baseline | birthDate | Core pipeline | 折りたたみ補助（別名称） |

**禁止:** DOB 説明だけ、数字だけの差分、全員同一文章、有料本文の短縮転載、CTA だけの個別化。

---

## 15. Paid Four-Chapter Signal Propagation

**本 gate では章本文を作らない。** questionnaire から各章が受け取る信号のみ固定。

| Chapter | primary signals | secondary signals | forbidden duplication |
|---|---|---|---|
| Ⅰ 自分の形を知る | `start`, `change`, theme=`tendency` | align/diverge on start/change | Ⅱ と同じ primary theme 説明の繰返し |
| Ⅱ 仕事・これからの進め方 | `decision`, `start`, theme=`work` | hesitation, paid depth（購入後） | Ⅰ の輪郭説明の言い換えのみ |
| Ⅲ 恋人・近い人との向き合い方 | `distance`, theme=`relation` | recovery+close 組合せ、reactiveContext | Ⅱ の仕事助言の転用 |
| Ⅳ お金・生活・疲れの整え方 | `recovery`, theme=`fatigue` | change, paid fatigue（購入後） | Ⅲ の関係助言の転用 |

**DOB baseline usage:** 各章の土台説明は DOB 個別化層（`dtrPaidIndividualization` 等）。**回答 projection は章ごとに異なる生活文脈へ分配。**

**free-result carry-forward:** 無料で確定した 5視点 + theme は購入時 snapshot の入力。無料再回答は購入済み本文を変更しない（5-view contract §10）。

---

## 16. Game-Like Interaction Boundary

### 採用（semantic）

- 一画面一問
- 短い scene prompt（§6 `scene_context_ja`）
- 選択時の触覚的反応（実装 gate）
- `n / 6` または progress dots
- §7 acknowledgement
- 次問の静かな遷移
- 最後に 6 選択の組み上げ開示
- 戻って変更可能 → 変更時 cache 無効化
- 短時間完了（6問）
- reduced-motion / keyboard / focus / aria-live（実装 gate）

### 不採用

点数、ランキング、レア度、正答、streak、countdown、虚偽 loading、疑似 AI typing、運勢、勝敗、良い/悪い人格、購入しないと不利益の演出。

---

## 17. Versioning and Legacy Contract

| Version key | 現値 | 変更トリガー |
|---|---|---|
| `questionnaireSchemaVersion` | `free-v1` | question 追加・削除、answer ID 変更 |
| `questionCopyVersion` | `free-qc-v1` | 表示文言のみ（meaning 不変） |
| `answerContractVersion` | `free-v1` | answer meaning 変更 |
| `expressionProjectionVersion` | `free-v1` | map / projection 変更 |
| `semanticFingerprintVersion` | `sf-v1`（候補） | fingerprint 構成変更 |
| `freeCompositionVersion` | 未実装 | narrative matrix 変更 |
| `paidCompositionVersion` | 未実装 | 有料合成変更 |

| 変更種別 | snapshot 再生成 |
|---|---|
| copy のみ | 不要（表示のみ） |
| answer meaning | 要（version bump + migration） |
| projection 変更 | 要 |
| legacy answer | deprecated map で fail-closed または移行 UI |

**legacy:** 既存 DOB-only sealed result は移行期間限定表示（5-view contract §9）。恒久的第二商品にしない。

---

## 18. Provenance and Commerce-Evidence Integration

Commerce Evidence 契約（E6）へ接続する将来フィールド:

```text
questionnaire_schema_version: free-v1
question_copy_version: free-qc-v1
answer_contract_version: free-v1
expression_projection_version: free-v1
individualization_version: fp-v1
dob_axis_lookup_version: dal-v1
primary_theme_reply_map_version: ptrm-v1
semantic_fingerprint_version: sf-v1
free_composition_version: (implementation gate)
output_hash: buildIndividualizationOutputHashV1
provider_used: false
deterministic_mode: true
```

**接続条件（Production 前必須）:**

- provenance registry / generation_meta 接続
- offer snapshot
- raw answers を Stripe metadata / analytics に載せない
- P0 metadata remediation 完了または並行計画が SSOT 化

**本 gate:** DB 追加なし。契約フィールドのみ固定。

---

## 19. Analytics and PII Exclusion

### 許可 event（候補・実装なし）

`free_questionnaire_started`, `free_birth_profile_completed`, `free_question_presented`, `free_question_answered`, `free_question_back`, `free_questionnaire_completed`, `free_result_presented`, `paid_hook_presented`, `paid_hook_clicked`

### 許可 payload（候補）

`schema_version`, `question_index`, `elapsed_time_bucket`, `device_class`, `reduced_motion_enabled`, `completion_state`, `error_code`, `anonymous_session_reference`

### 禁止 payload

`raw DOB`, `nickname`, `email`, `raw user ID`, `answer ID`, `answer combination`, `axis result`, `primary theme`, `report body`, `consultation text`

---

## 20. Bias, Accessibility, and Safety Review

| 観点 | 評価 |
|---|---|
| social desirability | 各 option は行動記述で対等。正解・良い人格なし |
| gender / age stereotype | 質問文に性別・年齢前提なし |
| employment assumption | Q6 work は「仕事に限らない進め方」文脈で表示（scene で補足） |
| relationship assumption | Q4「恋人がいなくても答えられる」scene 明記 |
| family / living arrangement | 前提なし |
| medical / diagnostic | 疲れを病名に結びつけない。診断・検査表現なし |
| leading / shame / fear | 禁止語なし。極端語なし |
| duplicate semantics | 6問は領域分離済み |

**全 question:** `rewrite_required` for copy = **NO**（本契約で `free-qc-v1` として新規作成）。**meaning retained = YES**。

---

## 21. Selected Implementation Architecture

**正式採用: 候補B `REWRITE_QUESTION_COPY_KEEP_STABLE_IDS`**

| レイヤー | 方針 |
|---|---|
| schema / answer IDs | **変更しない** |
| projection / maps | **変更しない** |
| question / answer display copy | **本契約 `free-qc-v1` を実装** |
| UI / state / storage | 新規（別 gate） |
| free result composition | 新規 matrix（別 gate） |

---

## 22. Proposed File Scope

### 既存（変更候補・copy のみ）

| Path | 変更内容 |
|---|---|
| `lib/m55/individualization/answerIdMapsV1.ts` | **変更しない**（ID freeze） |
| 新規候補 `lib/m55/freeQuestionnaire/freeQuestionCopyV1.ts` | question/answer display copy + acknowledgement |
| 新規候補 `lib/m55/freeQuestionnaire/types.ts` | wrapper types |
| 新規候補 `lib/m55/freeResult/store.ts` | answer + seal 統合 |
| 新規候補 `lib/m55/freeResult/buildFreeResultProjection.ts` | pure 呼び出し |
| 新規候補 `components/core/CoreFreeQuestionnaireLayer.tsx` | 一問ずつ UI |
| 新規候補 `lib/m55/freeResult/expressionAxisPublicLabels.ts` | tendency 公開ラベル |
| 既存 `components/core/CoreEssencePanel.tsx` | 組み込み（Hero 凍結遵守） |

### 禁止（本フェーズ）

`app/home/**`, `CoreHeroSection.tsx`, Stripe, DB, API routes, compatibility, paid engine 本体

---

## 23. Test Contract

### Schema tests（future）

- 6 question IDs unique / stable order
- answer IDs unique per question
- option counts 3/3/3/3/3/5
- version fields present
- unknown / incomplete / duplicate fail-closed

### Semantic coverage tests（future）

- all 5 axes covered
- every question / answer has output effect（実測済み §11）
- no single question determines full output
- deterministic / same input same fingerprint

### Combination tests（future / 実測済み probe 再利用）

- enumerate 1,215 combinations
- `uniqueProjectionSemanticStates >= 300`（Layer B 実測 1,215）
- collision groups bounded（実測 largest=1）

### Same-DOB variance（既存 `individualizationV1.variance.test.ts` 再利用）

### Copy quality tests（future）

- no diagnosis / fortune / score / shame / raw IDs in public HTML

### Provenance tests（future）

- versions in audit object
- raw PII excluded
- `provider_used: false`, `deterministic_mode: true`

---

## 24. Gate Sequence

```text
1. questionnaire contract actual-diff review  ← 次 gate
2. questionnaire contract document commit
3. questionnaire contract push / Production observation
4. questionnaire schema + pure projection implementation（copy + UI）
5. questionnaire implementation actual-diff review
6. semantic fingerprint contract/implementation
7. free result composition matrix
8. paid four-chapter composition matrix
9. hundreds-variance QA corpus
10. conversational onboarding architecture
11. conversational onboarding implementation
12. Commerce metadata P0 remediation
13. Offer Snapshot / provenance / evidence hooks
14. Product Truth / checkout alignment
15. local integration QA
16. Production deploy
17. controlled Production observation
18. compatibility connection planning
```

**並行可能:** Commerce metadata P0 planning、Offer Snapshot migration planning、Evidence schema planning

**禁止順序:** 質問 UI だけ先 Production、contract なし paid copy 変更、P0 前 checkout、個人完成前 compatibility

---

## 25. Explicit Non-Goals

- production code / runtime 接続（本 gate）
- questionnaire UI 実装
- free/paid narrative 本文
- Product Truth / Public copy 変更
- compatibility 接続
- Stripe 承認保証
- metadata P0 解消の宣言
- 新規 score / mapping / provider / random
- commit / push / deploy

---

## 26. Open Risks

| Risk | Severity | Mitigation gate |
|---|---|---|
| display copy が repo に無かった | Medium | 本契約 `free-qc-v1` で固定。actual-diff review |
| 5軸 1:1 question 設計（aggregation なし） | Low | 既存 freeze。visible variance は実測で成立 |
| freePick 11 visible variants のみ | Low | Layer B（1,215 projection states）は維持。freePick 1点は 11 種。UI は 5視点+theme で差分化。最終文章 hundreds は composition QA 待ち |
| runtime 未接続 | High | implementation gate sequence |
| provenance / offer snapshot 未接続 | High | Commerce evidence gates |
| P0 metadata 未解消 | High | remediation planning gate |
| storage 方式未確定 | Medium | free result store gate |
| legacy sunset 未確定 | Medium | Human 承認 gate（5-view contract §9） |
| Public copy 不整合（HOME rules 等） | Medium | copy alignment gate（runtime 後） |

---

**Document artifact**

- **File:** `docs/planning/M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md`
- **Headings:** 26（§1–§26）
- **Enumeration:** `/tmp/m55_questionnaire_coverage_probe.ts`（repo 外・削除可）
