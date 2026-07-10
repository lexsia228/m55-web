# M55 Free Result 5-View Analysis Contract and UX Design Rev1

- **Gate ID:** `CATEGORY-2-M55-FREE-RESULT-5-VIEW-ANALYSIS-CONTRACT-AND-UX-DESIGN-REV1`
- **Status:** CONTRACT FIXED（実装前）
- **Canonical worktree:** `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish`
- **Base SHA:** `eba18ec73648efd6e8477c4359ef3ec5be29f036`
- **Ownership:** 本ファイルが無料結果5視点の分析契約・UX設計の正本。実装は本契約に従う。Public Truth copy の正本は引き続き `lib/m55/paidDtrProductCopy.ts` / `lib/m55/topFreeEntryPublicCopy.ts` / `lib/m55/m55LogicPublicCopy.ts`（実装完了後に整合）。

---

## 1. Decision

### 正式採用モデル：**候補B（二層分離モデル）**

| レイヤー | 正式名称（契約） | 生成根拠 | 無料結果での役割 |
|---|---|---|---|
| 土台 | **10資質レーン** | `CoreResult.stemLaneIndex`（`buildCoreResultClient` → canonical pipeline） | 比較的変わりにくい入口の地図 |
| 土台（数値） | **DOB baseline radar** | `CoreResult.coreAxisScores`（5 `AxisKey`、0–100） | 生年月日から見る輪郭の土台（**「5つの視点」ではない**） |
| 土台（傾向） | **DOB expression baseline** | `buildDobAxisLookupV1` → `dobBase.axes`（`ExpressionAxes`） | align/diverge の DOB 側。内部比較用。単独の Public ラベル「5つの視点」にはしない |
| 現在層 | **5つの視点（answer projection）** | `buildFreeExpressionV1` → `FreeExpression.axes`（`ExpressionAxes`） | **Public Truth 上の「5つの視点」の正式意味** |
| テーマ | **primary theme** | `free.primary_theme` → `primaryReplyTheme` / `secondaryReplyTheme` | いま一番気になる読みの入口 |
| 重なり | **align / diverge** | `buildAlignDivergeItemsV1` + `pickFreeAlignDivergeItemV1` | DOB baseline と回答 projection の1点要約 |

### 不採用と理由

| 候補 | 判定 | 理由 |
|---|---|---|
| **A**（DOB 5軸レーダーを「5つの視点」とする） | **不採用** | 同じ DOB では回答を変えても `coreAxisScores` が変わらず、visible answer variance が成立しない。`free-v1` pure の価値と analysis authority の「回答差分」説明と矛盾 |
| **C**（DOB + 回答を単一5視点に合成） | **不採用** | repo 内に **canonical single-axis mapping が存在しない**。`AxisKey`（socialEnergy 等・数値 0–100）と `ExpressionAxisId`（start/decision/recovery/distance/change・カテゴリ tendency）は別 schema。新規 mapping/scoring を要し、本 gate の禁止原則に反する |
| **B** | **採用** | 既存 pure output のみで成立。`alignDivergeV1` が DOB `ExpressionAxes` と answer `ExpressionAxes` の比較契約を既に保持。same DOB / different answers の visible difference を `freeExpression` / `freePick` で説明可能 |

### 候補C不成立の根拠（repo 事実）

- **Core DOB 軸:** `lib/m55/coreResult/types.ts` — `AxisKey`: `socialEnergy | stability | openness | cooperation | structure`、score `number`
- **fp-v1 軸:** `lib/m55/individualization/types.ts` — `ExpressionAxisId`: `start | decision | recovery | distance | change`、値は `StartTendency` 等の **カテゴリ**
- 両者を結ぶ import・型・関数・test は **存在しない**（`rg` 確認済み）
- fp-v1 内の DOB/answer 合成は **同一 `ExpressionAxes` schema 上の align/diverge** に限定（`alignDivergeV1.ts`）。Core radar 数値への合成ではない

---

## 2. Current-State Inventory

### 2.1 `/core` 無料結果ランタイム（現状）

| 段階 | ファイル | 事実 |
|---|---|---|
| 入力 UI | `components/profile/BirthProfileIntakeLayer.tsx` | nickname + birthDate のみ。質問なし |
| プロフィール | `lib/soul/profile`（`ProfileRepository`） | nickname / birthDate 保持。birthTime は optional で core seal 入力に未使用 |
| ページ | `app/core/page.tsx` → `CoreEssencePanel` | client-only。Clerk `useUser` で ownerId |
| ロック | `CoreEssencePanel` | profile 欠落時 `CoreLockedState` |
| 結果生成 | `lib/m55/coreResult/store.ts` `ensureSealedCoreResult` | localStorage `m55_core_result_v3_{ownerId}`。sealedInputs = birthDate + nickname |
| ビルド | `buildCoreResultClient` → `runCanonicalCorePipelineClient` | birthDate のみが解析入力。nickname は表示のみ |
| 10資質 | `CoreResult.stemLaneIndex` | 0–9 |
| DOB 5軸数値 | `CoreResult.coreAxisScores` | 5 `AxisKey`、レーダー描画 |
| UI 順（現状） | `CoreEssencePanel` | Hero → FreeSavedBoundary → **Radar** → HowM55Reads → TendencyLoad → TypeEase → AlignFlow → ObservationList → ClosingSummary → AiChatExplainer → EntryReportCTA |

**未接続:** `lib/m55/individualization/**` は runtime から import されていない。

### 2.2 free-v1 pure layer（現状）

| 項目 | 契約 |
|---|---|
| 質問数 | **6**（5 軸 + primary theme） |
| 質問 ID | `FREE_QUESTION_IDS` in `answerIdMapsV1.ts` |
| 5軸回答 | 各 3 choice → tendency へ map |
| primary theme | 5 choice → `ReplyThemeId` |
| DOB lookup | `buildDobAxisLookupV1`（dal-v1） |
| 回答 projection | `buildFreeExpressionV1`（free-v1） |
| 合成 | `buildAlignDivergeItemsV1`（align/diverge） |
| 1点要約 | `pickFreeAlignDivergeItemV1`（diverge 優先、axis priority: distance > recovery > decision > start > change） |
| フル fingerprint | `buildIndividualizationFingerprintV1`（`paidAnswerSet: null` 可 — `individualizationV1.test.ts`） |
| draft | `buildIndividualizationDraftSnapshotV1` |
| hash | `hashFreeAnswerSet`, `buildIndividualizationOutputHashV1` |
| nickname | 解析入力に **含めない**（型・関数に nickname 引数なし） |
| birth time | individualization 入力に **含めない** |
| random / AI / provider | **不使用**（pure、決定的） |

### 2.3 Public Truth（現状・変更なし）

| 表面 | ソース | 現状文言の要点 |
|---|---|---|
| `/dtr/lp` | `PAID_DTR_LP.freeComparison.bodyJa` / FAQ | 「無料ページは、10資質レーンと5つの視点で輪郭に触れる入口」 |
| `/core` boundary | `TOP_FREE_ENTRY_PUBLIC_COPY.coreBoundary.freeLeadJa` | 同上（10資質 + 5視点） |
| HOME rules | `TOP_FREE_ENTRY_PUBLIC_COPY.home.rulesJa` | 「10資質レーンのみ」（**内部不整合**） |
| M55 logic | `M55_LOGIC_HOME_COPY` / `M55_LOGIC_CORE_COPY` | 10資質 + 5視点（HOME は軸名列挙あり） |
| Authority | `analysisAuthorityReferenceModel.ts` | 生年月日 + **回答差分** の二層説明 |

**現状整合度:** 完全な虚偽ではない（DOB レーダーが「5つの視点」に見える）。ただし **回答差分による 5視点は未接続**。契約確定後、実装完了までに copy 整合が必要（§12）。

---

## 3. Canonical Terminology

| 用語 | 正式定義 |
|---|---|
| **10資質レーン** | 生年月日から決まる `stemLaneIndex`（0–9）。無料・有料共通の入口地図 |
| **DOB baseline** | 生年月日（+ stem）から得られる比較的安定した手がかり。表示は (a) Core 数値レーダー、(b) fp-v1 `dobBase.axes` の二表現があるが、**同一ではない** |
| **DOB baseline radar** | `CoreResult.coreAxisScores` の 5 数値軸レーダー。Public 名「5つの視点」に **使用しない** |
| **5つの視点** | **6問回答から得る `FreeExpression.axes`（`ExpressionAxes`）**。現在の感じ方・行動傾向の表れ方 |
| **answer projection** | `buildFreeExpressionV1` の出力。回答 ID → tendency の決定的 map |
| **primary theme** | 第6問 `free.primary_theme` → `primaryReplyTheme` / `secondaryReplyTheme` |
| **align / diverge** | 同一 `ExpressionAxes` 上で `dobBase.axes` と `freeExpression.axes` を軸ごとに比較した関係 |
| **free result** | `/core` における無料の見取り図。本契約後は questionnaire 完了が必須（legacy 除く） |
| **saved report（保存版）** | 有料4章固定ルール読み物。暦リズム込みの深い展開 |
| **additional reading（追加読み解き）** | 保存版に紐づく1テーマ生成レイヤー。会話継続形式ではない |

### ExpressionAxisId（5つの視点の内部軸）

| axisId | 質問 ID | tendency 型 |
|---|---|---|
| `start` | `free.start_style` | `map \| try \| ask` |
| `decision` | `free.decision_style` | `sort \| deadline \| wait` |
| `recovery` | `free.recovery_style` | `pause \| shrink \| scene` |
| `distance` | `free.distance_style` | `close \| middle \| solo` |
| `change` | `free.change_style` | `observe \| adjust \| rebuild` |

Public 表示ラベル（日本語）は **実装 gate で新規 copy 定数として追加**する。本契約では tendency カテゴリを **診断スコアとして表示しない**。

### Core AxisKey（DOB baseline radar・別系統）

| key | 短縮ラベル（現行） | score range |
|---|---|---|
| `socialEnergy` | 人との距離 | 0–100（`scoreToBand` で band 化） |
| `stability` | 感受性 | 同上 |
| `openness` | 発想 | 同上 |
| `cooperation` | 協調 | 同上 |
| `structure` | 段取り | 同上 |

---

## 4. Selected Analysis Model

### 候補B：二層分離モデル（正式）

```
[入力]
  nickname（表示のみ）
  birthDate（10資質 + DOB baseline + dal-v1）
  free-v1 6 answers（5つの視点 + primary theme）

[生成 — 既存 pure のみ]
  CoreResult          ← buildCoreResultClient(birthDate)
  dobBase.axes        ← buildDobAxisLookupV1(birthDate, stemLaneIndex)
  freeExpression      ← buildFreeExpressionV1(freeAnswerSet)
  align/diverge       ← buildAlignDivergeItemsV1(dobAxes, freeAxes, freeAnswerSet)
  freePick            ← pickFreeAlignDivergeItemV1(...)
  （任意）fingerprint ← buildIndividualizationFingerprintV1({..., paidAnswerSet: null})

[表示 — 無料結果]
  1. 10資質レーン（hero / stem 表示）
  2. primary theme（テーマカード）
  3. 5つの視点（answer projection：5軸 tendency 一覧）
  4. align/diverge 1点（freePick 要約）
  5. DOB baseline radar（**別名称**で下位または折りたたみ）
  6. 短い narrative ブロック（tendency + theme 由来。template 固定）
  7. 保存版境界 + CTA
```

**同一 DOB・異なる回答**では、手順 2–4・6 が必ず変化しうる。手順 5（DOB radar）は **変化しない**（仕様）。

---

## 5. Input Contract

### 必須入力（新規導線）

| 入力 | 必須 | 解析への影響 |
|---|---|---|
| `nickname` | はい | **なし**（表示・敬称のみ） |
| `birthDate` | はい（`YYYY-MM-DD`） | 10資質、CoreResult、dal-v1 |
| `free.start_style` | はい | `ExpressionAxes.start` |
| `free.decision_style` | はい | `ExpressionAxes.decision` |
| `free.recovery_style` | はい | `ExpressionAxes.recovery` |
| `free.distance_style` | はい | `ExpressionAxes.distance` |
| `free.change_style` | はい | `ExpressionAxes.change` |
| `free.primary_theme` | はい | `primaryReplyTheme` 等 |

### 利用しない入力

| 入力 | 契約 |
|---|---|
| `birthTime` | 無料5視点契約では **使用しない**。表示も復活しない |
| `birthplace` / `country` | 無料5視点契約では **使用しない** |

### 状態機械

| 状態 | 定義 | 無料結果 |
|---|---|---|
| **未プロフィール** | nickname または birthDate 欠落 | `/core` ロック |
| **プロフィールのみ** | birth あり・回答なし | **新規導線では結果表示しない**。questionnaire へ誘導 |
| **回答途中** | 1–5 問のみ保存 | 結果表示しない。途中再開可 |
| **回答完了** | 6 問すべて valid answer ID | 無料結果生成・表示 |
| **再回答** | 最新回答セットで上書き | §10 |

### Fail-closed（既存 pure 準拠）

| 条件 | 結果 |
|---|---|
| invalid DOB | `invalid_dob` |
| stem 欠落 | `missing_stem` |
| 回答欠落 | `missing_free_answers` |
| 未知 answer ID | `unknown_answer_id` |

---

## 6. Determinism and Variance Contract

### 決定性

| 条件 | 期待 |
|---|---|
| same DOB + same answers | `freeExpression` 同一、`freeExpressionHash` 同一、`freePick` 同一、`outputHash` 同一（paid null 時） |
| same DOB + different answers | §7 の visible difference **必須** |
| different DOB + same answers | `stemLaneIndex` / `coreAxisScores` / `dobBase` が DOB により異なる。`freeExpression` は同一になりうる |
| nickname のみ異なる | 解析値 **不変** |
| answer 順序 | `Record<string,string>` — key ベース。順序非依存 |
| provider / AI | **不使用** |
| random | **不使用** |

### 根拠テスト（再実行不要・GREEN 再利用）

- `individualizationV1.test.ts` — determinism、fail-closed、paid null
- `individualizationV1.variance.test.ts` — F0 vs F2/F6 same DOB variance、D1 vs D2 DOB variance
- `docs/evidence/M55_FP_V1_INDIVIDUALIZATION_VARIANCE_QA_2026-07-09.md`

---

## 7. Visible Difference Contract

**same DOB + different answers** のとき、ユーザーが画面上で認識できる変化は **最低限以下のいずれか（通常は複数）**。

| 優先 | 変化対象 | 根拠 |
|---|---|---|
| P0 | `freeExpression.axes` の **1軸以上** の tendency 変化 | `buildFreeExpressionV1` |
| P0 | `primaryReplyTheme` / `secondaryReplyTheme` 変化 | theme 回答 |
| P0 | **5つの視点**表示ブロックの文言変化 | projection UI |
| P1 | `freePick`（align/diverge 1点）の `axisId` / `relation` / `freeTendency` 変化 | `pickFreeAlignDivergeItemV1` |
| P1 | align/diverge 要約文の変化 | `alignItems` / `divergeItems` |
| P2 | primary theme カード見出しの変化 | theme map |

**変化してはならない（same DOB）:** `coreAxisScores`、レーダー形状、stemLaneIndex、`dobBase.axes`（birthDate + stem が同じ場合）。

**不可:** `outputHash` / `freeExpressionHash` のみの変化で UI が同一に見える状態。

### variance 証跡（既存）

| Case | 観測 |
|---|---|
| F0 → F2（distance 変更） | `freeAxes.distance` 変化、hash 変化、pick が diverge/distance に |
| F0 → F6（theme のみ） | axes 同一でも `primaryReplyTheme` + hash 変化 |

---

## 8. User Flow

### 正式フロー（新規ユーザー）

```
HOME（または /core ロック）
  → nickname + birthDate 入力（既存 BirthProfileIntakeLayer 再利用候補）
  → free-v1 questionnaire（6問）
  → 無料結果生成（client-side pure）
  → /core 表示
      §4 の表示階層
  → 保存版 CTA（/dtr/lp）
```

### Questionnaire 形式（固定）

| 項目 | 契約 |
|---|---|
| 形式 | **質問形式**。AI chat **禁止** |
| ステップ | 6問。推奨 UX：**2ステップ×3問** または **1問ずつ6画面**（モバイル過密回避） |
| 選択肢 | 既存 answer ID ごとに固定3（theme は5）。**正解・不正解なし** |
| スコア表示 | **禁止**（%・ランク・診断点なし） |
| 途中離脱 | 回答完了前は結果非表示 |
| checkout | 結果表示前の有料要求 **禁止** |

### 結果表示階層（モバイル密度）

| 順 | ブロック | モバイル方針 |
|---|---|---|
| 1 | Hero + 10資質レーン | 既存 hero 維持（凍結ルール遵守） |
| 2 | primary theme | 1カード・短文 |
| 3 | **5つの視点**（answer projection） | 5行リスト（tendency ラベル）。**第2レーダー禁止** |
| 4 | align/diverge 1点 | 1カード（freePick） |
| 5 | DOB baseline radar | **折りたたみ可能**。「生年月日から見る土台」等の **別名称** |
| 6 | 短 narrative | 1–2段落上限 |
| 7 | Free vs 保存版境界 + CTA | 既存 boundary 改修は copy gate 後 |

**過密禁止:** 画面上に「5つの視点」と「DOB 5軸レーダー」を同じ見出しで並置しない。

### CTA

- 無料結果内 CTA は **保存版（/dtr/lp）** のみ
- `CoreEntryReportCTASection` → `CoreCommercialConversionBlock` 経路を維持

---

## 9. No-Answer and Legacy Fallback

### 新規導線（契約）

- **questionnaire 完了は無料結果表示の必須条件**
- birthDate のみでは **新規ユーザーに無料結果を出さない**

### Legacy fallback（移行期間限定）

| 条件 | 挙動 |
|---|---|
| 既存 `m55_core_result_v3_*` sealed envelope あり・回答データなし | **Legacy DOB-only 表示**を許可 |
| 表示要件 | 画面上部に **legacy バナー**（「回答を追加すると、いまの感じ方を含めた見取り図に更新できます」等） |
| 誘導 | questionnaire 完了を促す CTA |
| 移行終了 | **無期限にしない**。恒久的な第二の無料商品契約にしない。sunset の具体期限は、questionnaire/runtime wiring・既存ユーザー影響・Production 移行状況を確認した後、専用 sunset gate で **Human 承認** により確定する（§18） |

### 個別ケース

| ケース | 挙動 |
|---|---|
| URL 直アクセス `/core` | プロフィールなし → ロック。プロフィールあり・回答なし → questionnaire へ（新規）または legacy（既存 seal あり） |
| 保存済み birth profile のみ | questionnaire 未完了なら結果非表示（新規） |
| 回答データ破損 | fail-closed。questionnaire 再入力を要求。DOB-only へのサイレントフォールバック **禁止** |

---

## 10. Retake Contract

| 項目 | 契約 |
|---|---|
| 再回答 | **可能**（無料） |
| 保持 | **最新回答セットのみ**を無料結果の正とする |
| 履歴 | 無料では過去回答の比較 UI **不提供** |
| 回数制限 | **なし**（無料範囲） |
| hash 更新 | 再回答のたび `freeExpressionHash` / 表示を更新 |
| 保存版購入後 | 購入時点の回答スナップショットが保存版 individualization の正。無料側の再回答は **購入済み保存版本文を変更しない**（既存 paid snapshot 契約に従う） |

**storage の実装方式は本契約では定義しない。ここで固定するのは意味契約のみとする。** owner 単位で `freeAnswerSet` + version + hash を保持する（DB 履歴削除を命令しない）。

---

## 11. Free vs Paid Boundary

### 無料に含める

- 10資質レーン（stem）
- **5つの視点**（answer `ExpressionAxes` + primary theme）
- align/diverge **1点**（`freePick`）
- 短い narrative（テンプレート固定、章本文なし）
- DOB baseline radar（**補助・別名称**）
- 保存版 CTA

### 無料に含めない

- 正式4章本文
- 暦リズム込みの深い DOB 展開（保存版章 material）
- `paidDepth` / chapterBias による章寄せ
- 追加読み解き
- 履歴・保存・再購入導線（購入者機能）
- 無料結果の **単純な文字数増加** による疑似保存版

### 保存版に含める

- DOB + answers の **深い展開**（既存 paid individualization / 4章）
- 章構成・関係性整理・追加読み解き
- snapshot 固定・同一入力同一保存版

### non-overlap rule

無料は **「輪郭に触れる入口」**。保存版は **「正式4章で読み返す」**。無料 narrative は保存版章の抜粋・要約・代替にならない。

---

## 12. Public Truth Alignment Plan

**本 gate では copy 変更なし。** 実装完了後の整合 gate で変更。

| 対象 | 分類 | 方針 |
|---|---|---|
| `PAID_DTR_LP.freeComparison.bodyJa` | **clarify**（実装後） | 「5つの視点」= 回答由来であることを明示しつつ入口定義は維持 |
| DTR LP FAQ（無料との違い） | **clarify**（実装後） | 同上 |
| `TOP_FREE_ENTRY_PUBLIC_COPY.coreBoundary.freeLeadJa` | **clarify**（実装後） | DOB 土台と回答5視点の二層を短文で区別 |
| `TOP_FREE_ENTRY_PUBLIC_COPY.home.rulesJa` | **clarify**（実装後） | 「10資質のみ」→ 10資質 + 5視点（回答）に整合 |
| `M55_LOGIC_HOME_COPY` | **clarify**（実装後） | 5視点 = 回答 projection と明記 |
| `M55_LOGIC_CORE_COPY` | **clarify**（実装後） | 同上 |
| `/how-m55-works` | **unchanged**（当面） | 現行は 10資質/5視点語を意図的除外。実装後に **別 gate** で検討 |
| Core radar ラベル（`CoreRadarSection`） | **rename**（実装後） | 「5つの視点」表記を除去し DOB 土台名称へ |
| `analysisAuthorityReferenceModel` | **unchanged** | 既に回答差分を説明。実装で無料にも適用 |
| Legacy fallback バナー文案 | **implementation 後に追加** | 新規 copy |

**Rule:** Public Truth 修正は **runtime + questionnaire wiring が GREEN の後**。先に copy だけ直さない。

---

## 13. Safety and Positioning Boundary

- 医学的診断・心理検査・性格の確定・将来予測 **ではない**
- 回答に正解・不正解・良し悪し **なし**
- 質問回答は **現在の自己認識の整理材料**
- 生年月日は **日本の暦文化上の参照情報**
- 相性%・運命断定・ランキング **禁止**（既存 SSOT 準拠）
- tendency は **いま出やすい傾向** の語彙で表示し、スコア・% で見せない
- `M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.whatM55IsNotJa` に矛盾する表現を無料結果に入れない

---

## 14. Implementation Architecture

### 想定ファイル（変更候補・**本 gate では未変更**）

| 分類 | 候補パス |
|---|---|
| questionnaire UI | `components/core/CoreFreeQuestionnaireLayer.tsx`（新規候補）、または `components/profile/` 配下 |
| answer types | `lib/m55/freeResult/types.ts`（新規候補）— `freeAnswerSet` wrapper |
| client state/storage | `lib/m55/freeResult/store.ts`（新規候補）— answer + seal 統合 |
| core result builder | `lib/m55/freeResult/buildFreeResultProjection.ts`（新規候補）— pure 呼び出しのみ |
| result projection UI | `components/core/CoreFiveViewProjectionSection.tsx`（新規）、`CoreAlignDivergeHighlightSection.tsx`（新規） |
| Core 組み込み | `components/core/CoreEssencePanel.tsx`（順序変更 — **CoreHero 凍結に注意**） |
| copy | `lib/m55/topFreeEntryPublicCopy.ts`、`lib/m55/m55LogicPublicCopy.ts`（**実装後 gate**） |
| tendency 表示ラベル | `lib/m55/freeResult/expressionAxisPublicLabels.ts`（新規候補） |
| new tests | `lib/m55/freeResult/freeResultFiveViewContract.test.ts`（統合テスト候補） |
| reused tests | `individualizationV1.test.ts`、`individualizationV1.variance.test.ts` |
| prohibited（本フェーズ触らない） | `app/home/**`、`CoreHeroSection.tsx`、paid DTR engine、Stripe、DB、API routes |

### 実装時の pure 呼び出し契約

```typescript
// 疑似 — 新規ロジックなし
const core = buildCoreResultClient(profile);
const fp = buildIndividualizationFingerprintV1({
  birthDate: profile.birthDate,
  stemLaneIndex: core.stemLaneIndex,
  freeAnswerSet,
  paidAnswerSet: null,
});
// fp.value.fingerprint.freeExpression → 5つの視点
// fp.value.freePick → align/diverge 1点
```

**禁止:** `AxisKey` ↔ `ExpressionAxisId` の mapping 関数の新規作成。

---

## 15. Test Contract

### 新規必須（実装 gate・最小統合可）

単一ファイル `lib/m55/freeResult/freeResultFiveViewContract.test.ts` に統合可。

| Case ID | 内容 |
|---|---|
| T1 | same DOB + same answers → projection deterministic |
| T2 | same DOB + different answers → visible projection diff（axes / theme / pick のいずれか） |
| T3 | different DOB + same answers → stem / dobBase / coreAxisScores diff |
| T4 | answer order normalization |
| T5 | invalid answer ID → fail-closed |
| T6 | missing answer → no result / questionnaire redirect contract |
| T7 | nickname change → analysis unchanged |
| T8 | birth time absent → contract unchanged |
| T9 | outputHash / freeExpressionHash react appropriately |
| T10 | no provider / no random |
| T11 | free-only（paid null）— no paid depth leak |
| T12 | forbidden public wording absent in projection copy constants |

### 再利用（変更なければ再実行不要）

- `individualizationV1.test.ts`
- `individualizationV1.variance.test.ts`
- storefront authority 67/67
- `paidDtrPaidLpCopy.test.ts`
- `topFreeEntryPublicCopy.test.ts`
- `corePublicCopyAlignment.test.ts`
- `m55LogicPublicCopy.test.ts`

### delta-only

- pure 変更なし → individualization tests 再実行不要
- copy 変更なし → copy tests 再実行不要
- 新規 wiring のみ → 新規 test + typecheck 1回

---

## 16. Gate Sequence

| # | Gate | 成果物 |
|---|---|---|
| 1 | **本 gate（完了）** | 本契約文書 |
| 2 | `CATEGORY-2-M55-FREE-RESULT-5-VIEW-ANALYSIS-CONTRACT-AND-UX-DESIGN-ACTUAL-DIFF-REVIEW-REV1` | 文書レビュー |
| 3 | contract document **commit**（専用 gate） | git commit のみ |
| 4 | questionnaire data contract actual-diff plan | storage schema 意味確定 |
| 5 | free-result wiring tests 実装 | §15 tests |
| 6 | questionnaire UI 実装 | 6問フォーム |
| 7 | `buildFreeExpressionV1` wiring | projection builder |
| 8 | result UI projection | §8 階層 |
| 9 | Public Truth copy alignment | §12 |
| 10 | visual/mobile QA | screenshots gate |
| 11 | commit / push 判断 | CI GREEN 後 |
| 12 | Production observation | GET-only |

**禁止:** 1 gate に UI + runtime + copy + commit + push を混在させない。

---

## 17. Explicit Non-Goals

- 新規 scoring / mapping / ML / AI 生成
- `AxisKey` と `ExpressionAxisId` の統合
- birth time の復活
- 心理診断・適性検査 UI
- 無料での保存版章プレビュー代替
- HOME / CoreHero の本 gate での変更
- DB migration / API route / Stripe / Clerk 変更
- 他 worktree の untracked 操作
- Public Truth の先行修正

---

## 18. Open Risks

| Risk | 緩和 |
|---|---|
| DOB レーダーと answer 5視点の **二系統表示** がユーザーに混乱 | §8 の名称分離・折りたたみ・表示順。Core radar から「5つの視点」語を除去（実装後 copy/UI gate） |
| Legacy DOB-only ユーザーが二重 Product Truth に遭遇 | §9 legacy バナー。sunset 期限は未確定だが移行終了は必須。具体期限は専用 sunset gate で既存ユーザー影響と Production 移行状況を確認し **Human 承認** する |
| `CoreHeroSection` 凍結と `/core` セクション順変更の衝突 | Hero は触らず、その下に questionnaire / projection を挿入 |
| tendency 公開ラベル未整備 | 実装 gate で `expressionAxisPublicLabels` を SSOT 化。診断語彙禁止テストを含める |
| storage schema 未実装 | gate 4 で actual-diff。本契約の意味（latest-only / owner-bound）は固定済み |
| HOME frozen | questionnaire 導線は `/core` ロックまたは post-intake redirect から開始。HOME 変更は別途 reopen が必要 |

---

## Appendix A: Source File Index

| 領域 | パス |
|---|---|
| Core runtime | `app/core/page.tsx`, `components/core/CoreEssencePanel.tsx` |
| DOB result | `lib/m55/coreResult/buildCoreResult.client.ts`, `store.ts`, `types.ts`, `axisMeta.ts` |
| Radar UI | `components/core/CoreRadarSection.tsx` |
| Boundary | `components/core/CoreFreeSavedBoundarySection.tsx` |
| CTA | `components/core/CoreEntryReportCTASection.tsx`, `CoreCommercialConversionBlock.tsx` |
| Intake | `components/profile/BirthProfileIntakeLayer.tsx` |
| fp-v1 pure | `lib/m55/individualization/*` |
| Public copy | `lib/m55/paidDtrProductCopy.ts`, `topFreeEntryPublicCopy.ts`, `m55LogicPublicCopy.ts` |
| Authority | `lib/m55/analysisAuthorityReferenceModel.ts` |
| Evidence | `docs/evidence/M55_FP_V1_INDIVIDUALIZATION_VARIANCE_QA_2026-07-09.md` |

---

*End of contract — Rev1*
