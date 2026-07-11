# M55 Personal Semantic Fingerprint Versioned Selector Implementation Plan Rev1

- **Gate ID:** `CATEGORY-2-M55-PERSONAL-SEMANTIC-FINGERPRINT-VERSIONED-SELECTOR-IMPLEMENTATION-PLAN-REV1`
- **Status:** IMPLEMENTATION PLAN FIXED（実装前）
- **Canonical worktree:** `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish`
- **Base SHA:** `c93b28408582cf89fab06ab374aa20a3134da4f1`
- **Upstream contracts:**
  - `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md`
  - `docs/planning/M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md`
  - `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md`（commit `c93b284`）

---

## 1. Decision

### 正式採用

| 項目 | 採用 |
|---|---|
| Architecture B（fingerprint 拡張） | **`EXTEND_EXISTING_BUILD_INDIVIDUALIZATION_V1_WITH_VERSIONED_SELECTORS`**（契約固定・再選択しない） |
| Internal implementation | **B1: Resolver module + fp-v1 extension** |
| Backward compatibility | **A: fp-v1 optional selector bundle** |
| Selector version | **単一 `selectors-v1`**（`INDIVIDUALIZATION_SELECTOR_VERSION_V1`） |
| Output | **selector IDs のみ**（本文・UI・DB・Stripe なし） |
| Final article hundreds | **NOT YET PROVEN** |
| Production connection | **PROHIBITED** |
| Compatibility | **HOLD** |
| Runtime P0 | **`P0_METADATA_PRIVACY_REMEDIATION_REQUIRED`**（未解消） |

### 分類（本 gate — micro-patch 後）

```text
READY_FOR_ACTUAL_DIFF_REVIEW_REV2
SELECTOR_ARCHITECTURE_COMPLETE
OPTIONAL_FP_V1_BUNDLE_VALID
LEGACY_ABSENCE_SEMANTICS_COMPLETE
NULL_SELECTOR_BUNDLE_PROHIBITED
STRAIN_INDEPENDENCE_CONTRACT_COMPLETE
DERIVED_SIGNAL_DOUBLE_COUNT_PROHIBITED
RECOVERY_ZERO_OR_ONE_REQUIRED
UNCONDITIONAL_RECOVERY_FALLBACK_PROHIBITED
OUTPUT_HASH_V2_REQUIRED
SELECTOR_PROVENANCE_VERSION_REQUIRED
SNAPSHOT_HASH_VERSION_BOUNDARY_COMPLETE
CHAPTER_BIAS_LEGACY_SIGNAL
PAID_CHAPTER_EMPHASIS_COMPOSITION_SSOT
DUAL_CHAPTER_AUTHORITY_RESOLVED
PII_BOUNDARY_COMPLETE
INTERNAL_HASH_EXPOSURE_BOUNDARY_REQUIRED
```

**Production 接続・composition 実装・UI/UX 開始を許可しない。**

---

## 2. Scope and Non-Goals

### Scope

- versioned semantic selector IDs 4 系統の exact catalog 固定
- deterministic resolution pipeline 固定
- fp-v1 への optional bundle 統合方式固定
- backward compatibility / snapshot 方針固定
- future file allowlist / test contract / gate split 固定

### Non-Goals

- production code / selector 実装
- composition matrix / 文章本文
- questionnaire UI / onboarding UI
- DB / Stripe / checkout / webhook
- metadata remediation
- compatibility runtime
- random / provider / LLM
- commit / push / deploy
- 実ユーザーデータ参照

---

## 3. Current Repository Authority

### 3.1 `lib/m55/individualization/` ファイル（2026-07-11 inventory）

| ファイル | 役割 | 状態 |
|---|---|---|
| `answerIdMapsV1.ts` | free-v1 / paid-v1 ID maps、`AXIS_PRIORITY` | **実装済み** |
| `types.ts` | `IndividualizationFingerprint` 等 | **実装済み** |
| `versions.ts` | `fp-v1`, `dal-v1`, `free-v1` 等 | **実装済み** |
| `dobAxisLookupV1.ts` | dal-v1 DOB → axes | **実装済み** |
| `freeExpressionV1.ts` | free-v1 projection + `freeExpressionHash` | **実装済み** |
| `primaryThemeReplyMapV1.ts` | ptrm-v1 theme map | **実装済み** |
| `alignDivergeV1.ts` | align/diverge + `pickFreeAlignDivergeItemV1` | **実装済み** |
| `paidDepthV1.ts` | paid-v1 `chapterBias` | **実装済み** |
| `signalsV1.ts` | intensity / hesitation / reactiveContext | **実装済み** |
| `replyAffinityV1.ts` | reply theme ranking（score 非出力） | **実装済み** |
| `outputHashV1.ts` | output hash | **実装済み** |
| `buildIndividualizationV1.ts` | fp-v1 composer | **実装済み** |
| `index.ts` | public exports | **実装済み** |
| `individualizationV1.test.ts` | unit tests | **実装済み** |
| `individualizationV1.variance.test.ts` | variance QA | **実装済み** |

**strain / recovery / free block / paid chapter emphasis selector catalog: 未実装。**

### 3.2 主要 export と入出力

| 関数 | 入力 | 出力 |
|---|---|---|
| `buildIndividualizationFingerprintV1` | `birthDate`, `stemLaneIndex`, `freeAnswerSet`, `paidAnswerSet?` | `IndividualizationFingerprint` + `freePick` + hashes |
| `buildIndividualizationDraftSnapshotV1` | 上記 + engine/catalog/report versions | `IndividualizationDraft` |

### 3.3 Runtime / snapshot 消費者

| 消費者 | 状態 |
|---|---|
| `app/` / `components/` / `lib/`（individualization 外） | **runtime caller なし**（grep 確認） |
| `individualizationV1.test.ts` | tests only |
| `individualizationV1.variance.test.ts` | tests only |
| DB / provenance / Stripe | **consumer なし** |

**fp-v1 は tests-only pure module。Production runtime 未接続。**

### 3.4 現行 `IndividualizationFingerprint`（`types.ts` L118–131）

```text
fingerprintSpecVersion: 'fp-v1'
dobAxisLookupVersion: 'dal-v1'
primaryThemeReplyMapVersion: 'ptrm-v1'
dobBase, freeExpression, paidDepth
alignItems, divergeItems
intensity, hesitation, reactiveContext, replyAffinity
```

**selector bundle field なし。**

---

## 4. Selected Internal Architecture

### 4.1 比較（architecture B の内部方式）

| 方式 | 判定 | 理由 |
|---|---|---|
| **B1** Resolver + catalog 分離 + builder 統合 | **採用** | pure / deterministic / catalog と logic 分離 / builder 肥大化防止 / 既存 test 保護 / fail-closed |
| **B2** `buildIndividualizationV1.ts` 内直実装 | 不採用 | 460 行 composer の責務過多・review risk 高 |
| **B3** post-build enrichment | 不採用 | base fingerprint と selector の生成順序が曖昧・fail-closed 境界が二重化 |

### 4.2 採用構造（B1）

```text
individualizationSelectorCatalogV1.ts   ← pure readonly catalog data
individualizationSelectorTypesV1.ts   ← ID types + bundle type
resolveIndividualizationSelectorsV1.ts ← pure resolver（catalog lookup + rules）
buildIndividualizationV1.ts           ← base fp-v1 構築後に resolver 呼び出し
```

### 4.3 責務分離

| モジュール | 責務 |
|---|---|
| **catalog** | exact selector ID 定義、semantic meaning、required signals 定義（data only） |
| **resolver** | eligibility / suppression / priority / tie-break / dedup / max count / fail-closed |
| **builder** | 既存 fp-v1 構築 → resolver 入力組立 → optional `selectors` bundle 付与 |

**resolver は I/O なし。builder は inputs を mutate しない（現行と同様 clone）。**

---

## 5. Versioning Decision

### 5.1 採用モデル

**単一 integrated selector version**（分割しない）。

| 項目 | 値 |
|---|---|
| constant name | `INDIVIDUALIZATION_SELECTOR_VERSION_V1` |
| literal | `'selectors-v1'` |
| owner module | `lib/m55/individualization/versions.ts` |
| fingerprint output field | `fingerprint.selectors.version`（optional bundle 内） |
| legacy absence | `selectors` **property 省略** = pre-selector fp-v1（正常・後方互換）。`selectors-v1` 空結果と**同義ではない** |
| new-build absence | selector-enabled build では `selectors` 省略 **禁止**（fail-closed） |
| `selectors: null` | **禁止**（validation fail-closed） |
| output hash | legacy: **`gmfn-v1`**（selectors なし）。new: **`gmfn-v2`**（selectors-v1 あり） |
| provenance | `audit.sourceVersions.selectorVersion` — selectors あり時 **`selectors-v1` 必須** |
| unknown version | resolver fail-closed → `unknown_selector_version` |
| snapshot behavior | 旧 snapshot は再生成しない。`selectors` 欠落は legacy として表示のみ |
| version mismatch | `selectors.version` ≠ `audit.sourceVersions.selectorVersion` → fail-closed |

### 5.2 分割 version を採用しない理由

strain / recovery / free / paid は同一 resolution pipeline・同一 provenance 単位で更新される。分割は composition gate の責務過多と snapshot 不整合リスクを増やす。

### 5.3 禁止

- version なし catalog
- mutable catalog
- date / locale / provider model を version に使用
- random seed

---

## 6. Selector Output Schema

### 6.1 Exact Type（repo naming 準拠）

```ts
// individualizationSelectorTypesV1.ts（新規・計画固定）

export type StrainSelectorIdV1 =
  | 'strain__pace_mismatch'
  | 'strain__decision_overload'
  | 'strain__distance_tension'
  | 'strain__recovery_delay'
  | 'strain__change_uncertainty';

export type RecoverySelectorIdV1 =
  | 'recovery__small_start'
  | 'recovery__sort_materials'
  | 'recovery__pause_first'
  | 'recovery__speak_to_trusted_person'
  | 'recovery__reduce_change_scope';

export type FreeBlockSelectorIdV1 =
  | 'free__intro__welcome'
  | 'free__dob_baseline__five_axes'
  | 'free__current_expression__projection'
  | 'free__primary_theme__work'
  | 'free__primary_theme__relation'
  | 'free__primary_theme__fatigue'
  | 'free__primary_theme__tendency'
  | 'free__primary_theme__report_scene'
  | 'free__align_diverge__distance_diverge'
  | 'free__align_diverge__distance_align'
  | 'free__align_diverge__recovery_diverge'
  | 'free__align_diverge__recovery_align'
  | 'free__align_diverge__decision_diverge'
  | 'free__align_diverge__decision_align'
  | 'free__align_diverge__start_diverge'
  | 'free__align_diverge__start_align'
  | 'free__align_diverge__change_diverge'
  | 'free__align_diverge__change_align'
  | 'free__strain__pace_mismatch'
  | 'free__strain__decision_overload'
  | 'free__strain__distance_tension'
  | 'free__strain__recovery_delay'
  | 'free__strain__change_uncertainty'
  | 'free__strain__none'
  | 'free__recovery__small_start'
  | 'free__recovery__sort_materials'
  | 'free__recovery__pause_first'
  | 'free__recovery__speak_to_trusted_person'
  | 'free__recovery__reduce_change_scope'
  | 'free__paid_depth_point__chapter_I'
  | 'free__paid_depth_point__chapter_II'
  | 'free__paid_depth_point__chapter_III'
  | 'free__paid_depth_point__chapter_IV';

export type PaidChapterEmphasisIdV1 =
  | 'paid_ch1__baseline_landscape'
  | 'paid_ch1__expression_mirror'
  | 'paid_ch1__align_diverge_bridge'
  | 'paid_ch2__start_rhythm'
  | 'paid_ch2__decision_flow'
  | 'paid_ch2__change_adaptation'
  | 'paid_ch3__distance_posture'
  | 'paid_ch3__decision_in_relation'
  | 'paid_ch3__recovery_connection'
  | 'paid_ch4__recovery_pace'
  | 'paid_ch4__change_life_load'
  | 'paid_ch4__distance_boundary'
  | 'paid_ch4__strain_life_context';

export type IndividualizationSelectorBundleV1 = {
  version: typeof INDIVIDUALIZATION_SELECTOR_VERSION_V1;
  strainSelectorIds: readonly StrainSelectorIdV1[];
  recoverySelectorIds: readonly RecoverySelectorIdV1[];
  freeBlockSelectorIds: readonly FreeBlockSelectorIdV1[];
  paidChapterEmphasisIds: Readonly<{
    chapter1: readonly PaidChapterEmphasisIdV1[];
    chapter2: readonly PaidChapterEmphasisIdV1[];
    chapter3: readonly PaidChapterEmphasisIdV1[];
    chapter4: readonly PaidChapterEmphasisIdV1[];
  }>;
};
```

### 6.2 `IndividualizationFingerprint` 拡張（方式 A）

```ts
// types.ts 変更計画
export type IndividualizationFingerprint = {
  // ...既存 fp-v1 fields 不変...
  selectors?: IndividualizationSelectorBundleV1;
};
```

`fingerprintSpecVersion` は **`fp-v1` のまま**。selector 追加は optional field のみ。

### 6.2.1 Optional bundle semantics（正式）

| 状態 | 意味 | 判定 |
|---|---|---|
| **property absence** | legacy fingerprint（selectors-v1 導入前） | valid legacy |
| **`undefined`（TS）** | optional property 未設定。serialization 後は **property omission** | valid legacy のみ |
| **`selectors: null`** | 明示 null | **invalid** → fail-closed |
| **present + `version: selectors-v1`** | selector-enabled build | valid new |
| **`strainSelectorIds: []`** | strain 候補なし | valid empty optional category |
| **`recoverySelectorIds: []`** | recovery 候補なし | valid empty optional category |
| **version のみで全カテゴリ空 / required free roles 欠落** | structurally empty bundle | **invalid** → fail-closed |

**新規 selector-enabled build:** `selectors` present + `version: selectors-v1` + required free block roles + paid chapter map 構造 **必須**。

### 6.3 Schema 制約

| 制約 | 値 |
|---|---|
| readonly | 全配列 `readonly` |
| stable ordering | lexicographic sort（ID 文字列）で出力前に固定 |
| duplicate ID | 禁止（dedup 後 0 件なら fail-closed） |
| 本文 / raw values | **含めない** |
| `freeExpressionHash` コピー | **禁止** |

### 6.4 Maximum counts

| カテゴリ | max |
|---|---|
| strain | **0–1** |
| recovery | **0–1**（無条件 fallback **禁止**） |
| free blocks | **8**（role ごと 1、下記 §10。`free__recovery__*` は recovery 0 件時 suppressible） |
| paid chapter emphasis | **各章 1–3** |

---

## 7. Existing Signal Usage Matrix

### 7.0 Root-source lineage taxonomy（strain / recovery 共通）

各 signal は表示名ではなく **root evidence lineage** で分類する。

| lineage | 定義 |
|---|---|
| `DOB_BASELINE_ROOT` | DOB authority 由来の axis / baseline |
| `QUESTIONNAIRE_AXIS_ROOT` | Q1–Q5 の個別回答由来 |
| `QUESTIONNAIRE_THEME_ROOT` | Q6 由来。primaryTheme と secondaryTheme は **同一 root family** |
| `CROSS_AXIS_AGGREGATE_ROOT` | 複数 axis または複数質問を統合した signal |
| `DERIVED_RELATION` | DOB baseline と Questionnaire axis から作る align/diverge |
| `DERIVED_CONTEXT` | reactiveContext 等。元回答の lineage を保持 |
| `DERIVED_FREE_PICK` | align/diverge 選択結果の再表現 |

**二重計数禁止:** 同一質問・同一 axis・同一 root answer・同一 align/diverge relation から派生した複数値は、独立した複数 signal として数えない。

| 禁止例 | 理由 |
|---|---|
| `divergeItems.distance` + `freePick = distance:diverge` | 同一 evidence の再表現 |
| `freeExpression.distance` + `reactiveContext.close_careful`（同 Q4） | 同一質問 lineage |
| `divergeItems.recovery` + `reactiveContext.short_pause`（同 Q3） | 同一質問 lineage |
| `primaryTheme` + `secondaryTheme` | 同一 Q6 root family |

| signal | semantic owner | lineage | selector で許可 | selector で禁止 | minimum supporting | external visibility |
|---|---|---|---|---|---|---|
| `dobBase` | dal-v1 | `DOB_BASELINE_ROOT` | strain/recovery/free_dob/paid_ch1 | DOB 上書き | 1（baseline 参照） | なし（`dobFp` only） |
| `freeExpression` | free-v1 | `QUESTIONNAIRE_AXIS_ROOT` | 全カテゴリ | raw answer IDs | 1（projection） | axes/themes のみ（hash 不可） |
| `alignItems` | fp-v1 implicit | `DERIVED_RELATION` | strain/free_align/paid_ch1 | align 単独で strain | 1 + 他 lineage | relation のみ |
| `divergeItems` | fp-v1 implicit | `DERIVED_RELATION` | strain/free_align/paid | **diverge 単独で strain** | 2 lineage 以上 | relation のみ |
| `intensity` | signalsV1 | `CROSS_AXIS_AGGREGATE_ROOT` | paid chapter 補助 | 診断・score 化 | 0（補助のみ） | level のみ（% 不可） |
| `hesitation` | signalsV1 | `CROSS_AXIS_AGGREGATE_ROOT` | recovery/strain 補助 | 心理問題断定 | 0（補助のみ） | present/drivers |
| `reactiveContext` | signalsV1 | `DERIVED_CONTEXT` | recovery/strain 補助（**同一 axis lineage 追加 evidence 不可**） | 症状推定 | 0（補助のみ） | scenes のみ |
| `replyAffinity` | replyAffinityV1 | `CROSS_AXIS_AGGREGATE_ROOT` | paid chapter 補助 | **単独決定・外部 score** | 0（補助のみ） | ranked themes のみ |
| `paidDepth.chapterBias` | paid-v1 | `CROSS_AXIS_AGGREGATE_ROOT` | resolver 補助 input のみ（§7.1） | composition SSOT | 0（paid path のみ） | bias counts のみ |
| `freePick` | alignDivergeV1 | `DERIVED_FREE_PICK` | free_align のみ | **独立 evidence として strain/recovery に使用禁止** | 0 | axisId+relation |
| `primaryTheme` | free-v1 Q6 | `QUESTIONNAIRE_THEME_ROOT` | theme selectors | **commerce intent** | 1（theme role） | ReplyThemeId |
| `secondaryTheme` | ptrm-v1 | `QUESTIONNAIRE_THEME_ROOT` | paid 補助 | 章全体支配・独立 lineage として数えない | 0（補助のみ） | ReplyThemeId |

### 7.1 `paidDepth.chapterBias` との関係（SSOT 固定）

| 役割 | 定義 |
|---|---|
| `paidDepth.chapterBias` | **legacy / low-level paid signal**（paid-v1 path、変更しない） |
| `paidChapterEmphasisIds` | **selectors-v1 composition-facing canonical output** |

**Precedence（composition authority）:**

| fingerprint state | composition authority |
|---|---|
| selectors-v1 present | **`paidChapterEmphasisIds`** |
| selectors absent legacy | existing **`paidDepth.chapterBias`** legacy path |
| selectors present + chapterBias present | resolver-produced **`paidChapterEmphasisIds`**。composition は chapterBias を再解釈しない |
| selectors present と chapterBias が内部矛盾 | builder/resolver integration で fail-closed または test failure。composition で仲裁しない |

**Resolver input:** `chapterBias` は candidate 生成の **補助 input** として catalog/resolver 内で一度だけ解釈し、final emphasis IDs へ正規化。composition は raw chapterBias を再参照しない。

**Legacy safety:** old snapshot は chapterBias legacy path を維持。old snapshot へ paidChapterEmphasis を後付けしない。

### 7.2 `replyAffinity`

- internal ranking signal only（`replyAffinityV1.ts` L3–4: score は出力に含めない）
- selector 単独決定禁止
- compatibility percentage 化禁止

### 7.3 `intensity` / `hesitation` / `reactiveContext`

- `signalsV1.ts` 定義どおり生活場面・章ヒント・scene タグ
- 診断・心理状態・深層心理への拡大解釈禁止
- strain 確定の補助のみ（単独不可）

---

## 8. Strain Selector Catalog

**意味:** 負荷が出る可能性のある生活条件を選ぶ内部 ID。**not:** 診断・心理問題・深層心理・疲労確定。

### 8.0 Strain eligibility（全 ID 共通）

選択には以下 **すべて** を満たすこと。

1. 対象 axis に関する candidate condition がある
2. **少なくとも 2 つの独立 root evidence group** がある
3. **少なくとも 1 つは対象の単一質問以外** から来る
4. `freePick` は追加 evidence として数えない
5. 同一 axis 由来 `reactiveContext` は追加 evidence として数えない
6. contradiction guard を通過
7. suppression rule を通過

**分類:** `STRAIN_INDEPENDENCE_CONTRACT_COMPLETE` / `DERIVED_SIGNAL_DOUBLE_COUNT_PROHIBITED`

| ID | target axis | root evidence A | root evidence B | optional C | forbidden duplicate lineage | priority |
|---|---|---|---|---|---|---|
| `strain__pace_mismatch` | `start` | diverge on `start`（`DERIVED_RELATION`） | hesitation aggregate（`CROSS_AXIS_AGGREGATE_ROOT`、Q2 等）**または** cross-axis diverge on `decision`/`change` | — | Q1 + freePick(start); Q1 + reactiveContext from Q1 | 50 |
| `strain__decision_overload` | `decision` | diverge on `decision`（`DERIVED_RELATION`） | hesitation aggregate（別質問 lineage）**または** cross-axis diverge on `change`/`start` | — | Q2 + freePick(decision); Q6 theme alone | 40 |
| `strain__distance_tension` | `distance` | diverge on `distance`（`DERIVED_RELATION`） | `QUESTIONNAIRE_THEME_ROOT` primary `relation`（Q6）**または** cross-axis diverge on `recovery`/`change` | — | Q4 + reactiveContext.close_careful; Q4 + freePick(distance) | 60 |
| `strain__recovery_delay` | `recovery` | diverge on `recovery`（`DERIVED_RELATION`） | cross-axis diverge on `decision`（Q2）**または** hesitation aggregate（別質問） | intensity ≥ mid（補助） | Q3 + reactiveContext.short_pause; Q3 + freePick(recovery) | 55 |
| `strain__change_uncertainty` | `change` | diverge on `change`（`DERIVED_RELATION`） | cross-axis diverge on `decision`（Q2）**または** hesitation aggregate（別質問） | — | Q5 + freePick(change); Q6 primary+secondary alone | 45 |

### 8.1 共通ルール

- **diverge 単独不可**（必ず別 lineage の corroboration）
- **一問単独不可**
- **primary theme 単独支配不可**
- **replyAffinity score 単独不可**
- **freePick を独立 evidence として数えない**
- **同一 axis 由来 reactiveContext を追加 evidence として数えない**
- **0 件許容**（該当なし → `strainSelectorIds: []`、resolver error ではない）
- **複数候補時:** priority 最大 1 件のみ（§16 tie-break）
- **無条件 fallback 禁止**

### 8.2 free / paid ownership

| visibility | 用途 |
|---|---|
| free | `free__strain__<id>` または `free__strain__none` |
| paid ch4 | `paid_ch4__strain_life_context` と重複時は ch4 emphasis を優先、strain ID は suppress |

---

## 9. Recovery Selector Catalog

**意味:** 一つの小さな行動を示す内部 ID。**not:** 医療助言・命令形本文。

**count contract:** **`0–1`**（`recoverySelectorIds`）。無条件 fallback **禁止**（`UNCONDITIONAL_RECOVERY_FALLBACK_PROHIBITED`）。

| ID | semantic meaning | primary axis | secondary lineage（独立） | priority |
|---|---|---|---|---|
| `recovery__small_start` | 小さく始める | `start` tendency | cross-axis diverge（別 axis）**または** hesitation aggregate（別質問） | 10 |
| `recovery__sort_materials` | 整理してから進む | `decision:sort` | hesitation（別質問）**または** decision diverge + 別 axis corroboration | 30 |
| `recovery__pause_first` | 短い休みを挟む | `recovery:pause` | cross-axis diverge on `decision`/`change`（**同一 Q3 reactiveContext 不可**） | 40 |
| `recovery__speak_to_trusted_person` | 信頼できる人に話す | `distance:close` | `QUESTIONNAIRE_THEME_ROOT` primary `relation`（Q6） | 35 |
| `recovery__reduce_change_scope` | 変化の範囲を小さくする | `change:observe` OR `change:adjust` | change diverge + 別 axis corroboration | 25 |

### 9.1 必須ルール

- **0–1 件**（eligible 候補なし → `recoverySelectorIds: []`、**正常** semantic result）
- **`recovery__small_start` は normal eligible candidate のみ**。unconditional fallback / default for every user / resolution failure fallback **ではない**
- DOB baseline を否定しない
- 全員同一禁止（axis/theme 差で ID が変わる）
- primary theme は composition 生活場面のみ（selector ID 単独支配禁止）

### 9.2 No-candidate vs resolver failure

| 状態 | 挙動 |
|---|---|
| valid input、eligible recovery 候補なし | `recoverySelectorIds: []`（**error ではない**） |
| unknown version / unknown ID / invalid shape / duplicate / overflow / catalog inconsistency | **fail-closed**（builder 全体停止） |

### 9.3 contradiction guard

| 条件 | 動作 |
|---|---|
| free `recovery:scene` + `recovery__pause_first` 候補 | `recovery__pause_first` suppress → 次候補 |
| `distance:solo` + `recovery__speak_to_trusted_person` | suppress |
| paid `fatigue_signal.before_start` + `recovery__small_start` 同時候補 | `recovery__pause_first` を優先（eligibility 通過時のみ。無条件置換禁止） |

---

## 10. Free-Result Selector Catalog

**role = composition matrix が参照する variant ID（表示文ではない）。**

| role | required | variant ID 規則 | input signals | fallback |
|---|---|---|---|---|
| `free__intro__*` | **required** | 固定 `free__intro__welcome` | なし（常時） | なし |
| `free__dob_baseline__*` | **required** | 固定 `free__dob_baseline__five_axes` | `dobBase.axes` | なし |
| `free__current_expression__*` | **required** | 固定 `free__current_expression__projection` | `freeExpression.axes` | なし |
| `free__primary_theme__*` | **required** | theme 別 5 ID（`report_scene` = `report_preview` の composition 用 neutral 名） | Q6 answer → ReplyThemeId | なし |
| `free__align_diverge__*` | **required** | `freePick` の `axisId` + `relation` から 1 ID | align/diverge items | `free__align_diverge__distance_align` |
| `free__strain__*` | optional | §8 strain ID または `free__strain__none` | strain resolver 結果 | `free__strain__none` |
| `free__recovery__*` | **optional**（recovery 0 件時 **suppress**） | §9 recovery ID と同型 | recovery resolver 結果 | なし（0 件は role 省略可） |
| `free__paid_depth_point__*` | **required** | `hesitation.chapterHint` または `paidDepth.chapterBias` max chapter | chapter hint / bias | `free__paid_depth_point__chapter_I` |

### 10.1 必須挙動

- DOB baseline block は Questionnaire で上書きされない（`free__dob_baseline__*` は DOB のみ）
- 同一 DOB・異回答で **最低 1 つの free block ID が変わる**（Q1–Q5 → axes/align、Q6 → theme）
- `free.primary_theme.report_preview` を **購入意図・conversion score として扱わない**
- `free__paid_depth_point__*` は章の **存在ヒント** のみ（CTA 強度推測禁止）

### 10.2 same-DOB / different-DOB 期待

| 条件 | 期待差分 |
|---|---|
| same DOB, Q1 mutation | `free__current_expression__*`, align/diverge variant, 関連 strain/recovery |
| same DOB, Q6 mutation | `free__primary_theme__*`, paid_depth_point, paid chapter emphasis |
| different DOB, same answers | `free__dob_baseline__*` 不変内容（axes 値変化）, align/diverge variant 変化 |

---

## 11. Paid Chapter I Emphasis Catalog

**章1: 自分の形を知る**

| ID | input axes / signals | max/章 |
|---|---|---|
| `paid_ch1__baseline_landscape` | `dobBase.axes` 全体 | 1–3 |
| `paid_ch1__expression_mirror` | `freeExpression.axes` + align count | |
| `paid_ch1__align_diverge_bridge` | top diverge（`AXIS_PRIORITY`）または top align | |

**主 signal:** DOB baseline, current expression, align/diverge, self-understanding 全体像。

**禁止:** Q6 だけで章1全内容を決定、恋人・収入の推測。

---

## 12. Paid Chapter II Emphasis Catalog

**章2: 仕事・これからの進め方**

| ID | input axes / signals |
|---|---|
| `paid_ch2__start_rhythm` | `start` axis + align/diverge |
| `paid_ch2__decision_flow` | `decision` axis + hesitation |
| `paid_ch2__change_adaptation` | `change` axis + reactiveContext |

**仕事していないユーザー:** `start`/`decision`/`change` は生活全般の進め方として解釈（employment 前提なし）。

**primary theme `work`:** 補助 +1 priority（支配禁止）。

---

## 13. Paid Chapter III Emphasis Catalog

**章3: 恋人・近い人との向き合い方**

| ID | input axes / signals |
|---|---|
| `paid_ch3__distance_posture` | `distance` axis + align/diverge |
| `paid_ch3__decision_in_relation` | `decision` + primary/secondary `relation` |
| `paid_ch3__recovery_connection` | `recovery` + `reactiveContext` close/solo scenes |

**恋人存在を前提にしない。** `distance` / `recovery` は近い人・一人時間の両方に適用。

---

## 14. Paid Chapter IV Emphasis Catalog

**章4: お金・生活・疲れの整え方**

| ID | input axes / signals |
|---|---|
| `paid_ch4__recovery_pace` | `recovery` + intensity |
| `paid_ch4__change_life_load` | `change` + strain 候補 |
| `paid_ch4__distance_boundary` | `distance:solo` OR middle + fatigue theme |
| `paid_ch4__strain_life_context` | strain selector 結果の章4 表現 |

**収入・借金・経済状況を推測しない。** `fatigue` theme は生活負荷の文脈のみ。

### 14.1 cross-chapter exclusion

| ルール | 動作 |
|---|---|
| 同一 emphasis ID を複数章へ配置 | **禁止**（`CROSS_CHAPTER_ID_DEDUP_VALID`） |
| underlying signal の章間再利用 | **許容**（同一生活文脈の別 semantic ID 化） |
| `paid_ch4__strain_life_context` + strain ID 重複 | ch4 emphasis 優先、strain は 0–1 維持 |
| 4章すべて同一 ID | **禁止**（dedup + per-chapter independent resolution） |

---

## 15. Selector Resolution Pipeline

```text
1. input normalization（既存 builder 出力を readonly 参照）
2. root lineage classification（§7.0 taxonomy）
3. catalog lookup（version = selectors-v1）
4. candidate generation（カテゴリ別）
5. eligibility filter（minimum independent root evidence groups）
6. lineage duplicate suppression（§17）
7. contradiction suppression（§17）
8. priority ordering（数値 desc）
9. tie-break（§16）
10. deduplication
11. maximum count trim
12. optional-category empty result（strain/recovery `[]` 許容）
13. stable lexicographic sort
14. bundle assembly
```

**same input → same selectors。** object key order / locale / timezone / provider / random 非依存。

---

## 16. Priority and Tie-Break Rules

### 16.1 Axis priority（repo 実績）

`answerIdMapsV1.ts` `AXIS_PRIORITY`:

```text
distance > recovery > decision > start > change
```

align/diverge / freePick / paid chapter の軸選択 tie-break に使用。

### 16.2 Category priority（strain 複数候補）

数値 priority（§8 表）最大 1 件。同点時:

1. `AXIS_PRIORITY` で軸を比較
2. 仍同点 → strain ID lexicographic 昇順で先頭

### 16.3 Recovery

候補複数時は priority 最大 1 件。同点 → recovery ID lexicographic。

### 16.4 Paid chapter

章ごとに独立 resolution。章内 1–3 件は priority 順。同点 → emphasis ID lexicographic。

---

## 17. Contradiction and Suppression Rules

| rule ID | 条件 | 動作 |
|---|---|---|
| `SUPPRESS_SAME_LINEAGE_DOUBLE_COUNT` | 同一質問・同一 axis・同一 root answer 由来の第2 evidence | strain/recovery 候補から除外 |
| `SUPPRESS_FREE_PICK_AS_EVIDENCE` | freePick を独立 corroboration として使用 | 除外 |
| `SUPPRESS_SAME_AXIS_REACTIVE_CONTEXT` | 対象 axis diverge + 同一 axis 由来 reactiveContext | strain 候補から除外 |
| `SUPPRESS_DIVERGE_ONLY_STRAIN` | diverge 1 lineage のみ | strain 候補から除外 |
| `SUPPRESS_ALIGN_ONLY_STRAIN` | align のみで strain 候補 | 除外 |
| `SUPPRESS_THEME_ONLY` | Q6 theme lineage のみで候補 | 除外 |
| `SUPPRESS_REPLY_AFFINITY_ONLY` | replyAffinity rank 1 のみ | 除外 |
| `SUPPRESS_STRAIN_CH4_DUP` | strain + `paid_ch4__strain_life_context` | strain 抑制または 0 件 |
| `SUPPRESS_RECOVERY_CONTRA` | §9.3 表 | 該当 recovery 候補除外 |
| `SUPPRESS_COMMERCE_INTENT` | `report_preview` answer | purchase intent selector 生成禁止 |
| `SUPPRESS_CROSS_CHAPTER_DUP` | 同一 paid emphasis ID | 先に確定した章を保持 |

---

## 18. Fail-Closed Contract

### 18.1 対象

```text
invalid DOB baseline
missing Questionnaire projection
unknown axis ID / tendency
unknown primary / secondary theme
missing align/diverge
invalid selector version
unknown catalog ID
duplicate selected ID（dedup 後も重複）
contradictory overflow（max count 超過で trim 不可）
legacy fingerprint without declared handling（resolver 呼び出し時のみ）
```

### 18.2 Fail codes（計画）

```text
unknown_selector_version
unknown_selector_id
duplicate_selector_id
selector_count_overflow
contradictory_selector_state
invalid_selector_bundle
selector_version_mismatch
selector_resolution_failed
```

**error ではない（正常 empty category）:**

```text
valid strain candidates なし → strainSelectorIds: []
valid recovery candidates なし → recoverySelectorIds: []
```

### 18.3 必須挙動

- resolver failure（上記 fail codes）→ **builder 全体停止**（`Result<Err>`）
- silent empty bundle 生成 **禁止**
- random / arbitrary default / 他ユーザー流用 **禁止**
- 無条件 `recovery__small_start` **禁止**
- DOB-only への黙って fallback **禁止**
- error / log に raw DOB / raw answers / nickname / email / user ID / `freeExpressionHash` **含めない**

---

## 19. Backward Compatibility

### 19.1 採用: **方式 A — fp-v1 optional selector bundle**

| 項目 | 方針 |
|---|---|
| `fingerprintSpecVersion` | **`fp-v1` 維持** |
| 旧 fingerprint | `selectors` **property 省略** = legacy（`selectors-v1` 空結果と同義ではない） |
| 新 fingerprint | `selectors` present + `version: selectors-v1` |
| `selectors: null` | **禁止** |
| output hash | legacy: `gmfn-v1`。new: `gmfn-v2`（§20.2） |
| type compatibility | optional field で既存 consumer 破壊なし |

### 19.2 不採用

| 方式 | 理由 |
|---|---|
| B: fp-v1.1 | `fingerprintSpecVersion` 変更で既存 type/test 破壊 |
| C: sibling object | provenance / draft 構造の二重化 |

---

## 20. Snapshot and Legacy Handling

| 項目 | 方針 |
|---|---|
| 既存 snapshot | **黙って再生成しない**。`gmfn-v1` を変更・backfill しない |
| stored report 本文 | **変更しない** |
| selector 欠落旧 fingerprint | legacy として扱う（`selectors-v1` 空結果と**誤認しない**） |
| legacy display | `selectors` なし → composition は pre-selector fallback（§7.1 chapterBias path） |
| regeneration policy | selector version bump 時のみ **明示的** 再生成（自動なし） |
| `outputHash` — legacy | **`gmfn-v1`**（selectors absent、`selectorVersion` absent） |
| `outputHash` — new | **`gmfn-v2`**（selectors-v1 present） |
| runtime 接続前 | Production behavior **不変** |

### 20.1 Legacy hash（`gmfn-v1`）

現行 `outputHashV1.ts` 入力を維持:

```text
dobFp
freeAnswerHash
paidAnswerHash
templateBlockIds
engineVersion
catalogVersion
reportLogicVersion
```

**selectors / selectorVersion は含まない。** 既存 snapshot の hash を再計算・書換え **禁止**。

### 20.2 New selector-enabled hash（`gmfn-v2`）

selector bundle を semantic output に利用する新規 snapshot は **`gmfn-v2`** を使用。

**`gmfn-v2` 入力:** 上記 `gmfn-v1` 全入力 **+**

```text
selectorVersion（selectors-v1）
canonical ordered selector IDs
```

**canonical selector serialization order（object insertion order 非依存）:**

1. strain catalog order
2. recovery catalog order
3. free role fixed order（§10 role 表順）
4. paid chapter I → II → III → IV
5. 章内 catalog order

**禁止:** raw DOB / raw answers / `freeExpressionHash` 複製 / selector 本文 / provider / random / time / locale sort。

**同一性比較:** `gmfn-v1` と `gmfn-v2` を直接同一性比較しない。semantic output hash version のまま selector 有無を混在させない。

### 20.3 `audit.sourceVersions.selectorVersion`

| 状態 | `selectorVersion` | 判定 |
|---|---|---|
| selectors present | **`selectors-v1` 必須** | valid |
| selectors present + selectorVersion absent | — | **fail-closed** |
| selectors absent legacy | absent | valid legacy |
| selectors absent + selectorVersion present | — | **invalid** |
| `selectors.version` ≠ `audit.sourceVersions.selectorVersion` | — | **fail-closed** |

**`gmfn-v2` も external identity として使用しない**（Stripe metadata / analytics / small-domain anonymization 不可）。Commerce Evidence は opaque internal reference のみ。

---

## 21. PII and Hash Boundary

| データ | selector bundle へ |
|---|---|
| raw DOB | **含めない** |
| raw answers | **含めない** |
| `freeExpressionHash` コピー | **含めない** |
| nickname / email / user ID | **含めない** |
| numeric personality score | **含めない** |
| confidence % | **含めない** |

`freeExpressionHash`: **INPUT_IDENTITY_HASH**、1,215 通り small-domain、**REVERSIBLE_SMALL_DOMAIN_HASH_RISK**。匿名化済み identifier ではない。

**selector resolver 境界:** `freeExpressionHash` を resolution branch condition に使用しない。selector ID へ埋め込まない。output/log/error へコピーしない。

外部露出禁止: Stripe metadata, analytics, public URL, browser-visible ID, Commerce evidence external reference。

---

## 22. Provenance and Commerce Boundary

将来 Commerce Evidence へ渡せるもの（opaque reference 経由）:

```text
opaque fingerprint reference（別 gate で発行）
fingerprintSpecVersion: fp-v1
selector version: selectors-v1
output hash version: gmfn-v1（legacy）または gmfn-v2（new）
composition version（将来）
deterministic: true
provider: false
random: false
```

**`freeExpressionHash` / `dobFp` を evidence reference に使わない。**

本 gate では Commerce runtime 実装しない。Stripe metadata P0 未解消。

---

## 23. Variance Test Plan

### 23.1 Same DOB / different answers

最低 3 synthetic DOB baselines（variance test fixtures 準拠）。

各 DOB で:

```text
Q1–Q6 single mutation
all-answer mutation
```

確認:

- `free__dob_baseline__*` 不変（ID 固定）
- 関連 selector 変化
- strain / recovery **0 件**（`[]`）が正常であること
- lineage double-count が発生しないこと
- recovery 0 件時 `free__recovery__*` role が suppress されること
- 最低 1 free block 差分
- 最低 1 paid chapter emphasis 差分
- **文章本文差分は本 gate で証明しない**

### 23.2 Different DOB / same answers

最低 3 pairs。

確認:

- Questionnaire projection 同一
- DOB-related selector 差分
- complete fingerprint が同一に潰れない

### 23.3 Full answer matrix

```text
1,215 answer states × authority-approved synthetic DOB fixture set
```

指標:

```text
valid combinations
selector bundle uniqueness（≠ final article 数）
zero-effect question mutations
zero-effect DOB fixtures
strain / recovery / free / paid distribution
largest collision group
determinism mismatch count
duplicate ID count
fail-closed count
```

### 23.4 PII assertions

- bundle JSON に raw DOB/answers/hash なし
- external export に selector のみ（hash なし）

---

## 24. Proposed File Allowlist

**Reconciliation（OPTION B / repo 実測 2026-07-12）:** Gate 3 は `index.ts` を変更せず、`individualizationV1.test.ts` を最小更新する。Gate 4 は既存 `individualizationV1.variance.test.ts` を MODIFY し、同名の新規 variance file は作らない。

### 24.1 既存変更（implementation gate）

| path | 変更内容 | gate |
|---|---|---|
| `lib/m55/individualization/versions.ts` | `INDIVIDUALIZATION_SELECTOR_VERSION_V1`（Gate 1）、`GENERATION_META_FIELD_NAMING_VERSION_V2`（Gate 3） | 1, 3 |
| `lib/m55/individualization/types.ts` | `selectors?`、fail codes、`SourceVersions.selectorVersion` | 3 |
| `lib/m55/individualization/buildIndividualizationV1.ts` | resolver 呼び出し、`gmfn-v2` 分岐、`selectorVersion` audit | 3 |
| `lib/m55/individualization/individualizationV1.test.ts` | public builder regression（`gmfn-v2`、`selectors`、provenance 最小 assertion） | 3 |
| `lib/m55/individualization/individualizationV1.variance.test.ts` | selector-enabled / `gmfn-v2` variance expectation 更新 | 4 |

**Gate 3 で変更しない既存 file（explicit excluded）:**

```text
lib/m55/individualization/index.ts
lib/m55/individualization/outputHashV1.ts
lib/m55/individualization/resolveIndividualizationSelectorsV1.ts
lib/m55/individualization/individualizationSelectorTypesV1.ts
lib/m55/individualization/individualizationSelectorCatalogV1.ts
lib/m55/individualization/individualizationV1.variance.test.ts
```

`index.ts` の新 export は **runtime external consumer が存在するまで延期**（現状 barrel consumer 0、direct import で Gate 3 完結）。

### 24.2 新規

| path | 役割 | gate |
|---|---|---|
| `lib/m55/individualization/individualizationSelectorTypesV1.ts` | ID union types + bundle type | 1 |
| `lib/m55/individualization/individualizationSelectorCatalogV1.ts` | catalog data + priority + lineage metadata | 1 |
| `lib/m55/individualization/individualizationSelectorCatalogV1.test.ts` | catalog-focused tests | 1 |
| `lib/m55/individualization/resolveIndividualizationSelectorsV1.ts` | pure resolver（lineage-aware） | 2 |
| `lib/m55/individualization/individualizationSelectorV1.test.ts` | resolver focused tests | 2 |
| `lib/m55/individualization/outputHashV2.ts` | `gmfn-v2` implementation | 3 |
| `lib/m55/individualization/outputHashV2.test.ts` | gmfn-v2 / version matrix / snapshot atomicity tests | 3 |

**Gate 3 exact allowlist（OPTION B）:**

| action | path |
|---|---|
| MODIFY | `versions.ts`, `types.ts`, `buildIndividualizationV1.ts`, `individualizationV1.test.ts` |
| NEW | `outputHashV2.ts`, `outputHashV2.test.ts` |
| Gate 3 totals | modified **4** / new **2** / files **6** |

**Gate 4:** genuinely new files **0**。既存 `individualizationV1.variance.test.ts` のみ MODIFY（rename / delete / 同義 duplicate file 禁止）。

### 24.3 変更しない

```text
app/**, components/**, scripts/**, supabase/**
answerIdMapsV1.ts（ID 不変）
dobAxisLookupV1.ts, freeExpressionV1.ts（authority 不変）
outputHashV1.ts（gmfn-v1 immutable）
index.ts（Gate 3 mutable scope 外）
UI / route / DB / Stripe / compatibility
```

### 24.4 見積と file-count contract

| 項目 | 値 |
|---|---|
| Gate 3 files | modified **4** + new **2** = **6** |
| cumulative after Gate 3 | modified existing unique **4** + new unique **7** = overall **11** |
| Gate 4 | MODIFY `individualizationV1.variance.test.ts` only; new **0** |
| final selector implementation | modified existing unique **5** + new unique **7** = overall unique paths **12** |
| estimated diff（Gate 3） | **~600–850 lines**（builder + gmfn-v2 + focused tests） |

**Modified existing unique — 5:**

```text
lib/m55/individualization/versions.ts
lib/m55/individualization/types.ts
lib/m55/individualization/buildIndividualizationV1.ts
lib/m55/individualization/individualizationV1.test.ts
lib/m55/individualization/individualizationV1.variance.test.ts
```

**New unique — 7:**

```text
lib/m55/individualization/individualizationSelectorTypesV1.ts
lib/m55/individualization/individualizationSelectorCatalogV1.ts
lib/m55/individualization/individualizationSelectorCatalogV1.test.ts
lib/m55/individualization/resolveIndividualizationSelectorsV1.ts
lib/m55/individualization/individualizationSelectorV1.test.ts
lib/m55/individualization/outputHashV2.ts
lib/m55/individualization/outputHashV2.test.ts
```

**Arithmetic:** `5 + 7 = 12`（modified / new の path 重複なし）。

### 24.5 Test ownership

| file | gate | owner scope |
|---|---|---|
| `individualizationV1.test.ts` | 3 MODIFY | legacy `gmfn-v1` direct fixture 維持；new builder で `selectors` present、`sourceVersions.selectorVersion = selectors-v1`、`fieldNamingVersion = gmfn-v2`；public builder regression |
| `outputHashV2.test.ts` | 3 NEW | gmfn-v2 serialization、selector sensitivity、empty category、legacy/new version matrix、snapshot atomicity、resolver failure propagation |
| `individualizationV1.variance.test.ts` | 4 MODIFY | selector-enabled variance、`gmfn-v2` variance、output collapse checks |

同一 behavior を `individualizationV1.test.ts` と `outputHashV2.test.ts` で重複所有しない。

---

## 25. Implementation Gate Split

推奨 **5 gate 分割**:

| # | Gate | scope |
|---|---|---|
| 1 | selector types + version + catalog | NEW types/catalog + catalog tests；`versions.ts` initial selector version。**builder 非接触** |
| 2 | pure resolver | `resolveIndividualizationSelectorsV1.ts` + focused resolver tests |
| 3 | fp-v1 integration（OPTION B） | MODIFY `versions.ts` / `types.ts` / `buildIndividualizationV1.ts` / `individualizationV1.test.ts`；NEW `outputHashV2.ts` / `outputHashV2.test.ts`；optional bundle、provenance、`gmfn-v2`、hash/snapshot tests。**`index.ts` 非変更** |
| 4 | variance QA extension | MODIFY existing `individualizationV1.variance.test.ts` only；genuinely new files **0** |
| 5 | actual-diff review / commit / push | — |

**Gate 1 に含めない:** builder integration / gmfn-v2 runtime connection / snapshot mutation / composition / UI / DB / Stripe。

---

## 26. UIUX Boundary

| 項目 | 状態 |
|---|---|
| UI/UX 実装 | **本 gate では行わない** |
| 設計許可 | **未許可** |

専用 gate 開始条件:

```text
selector implementation GREEN
free composition matrix GREEN
paid four-chapter composition GREEN
hundreds variance QA GREEN
```

後続: `CATEGORY-2-M55-FREE-PERSONAL-ONBOARDING-ACQUISITION-CONVERSION-UIUX-DESIGN-REV1`

方向: mobile-first, one-screen-one-question, reduced motion, ethical conversion, Human visual review。

禁止: fake AI/loading, dark patterns, fake urgency, answer ranking, conversion-only withholding。

---

## 27. Risks and Open Questions

| risk | severity | mitigation |
|---|---|---|
| selector 数を文章数と誤読 | High | bundle uniqueness ≠ article count を明記 |
| `freeExpressionHash` 外部露出 | Medium | §21 固定、Commerce opaque ref |
| lineage double-count | High | §7.0 / §8 taxonomy + suppression rules |
| recovery 0 件の composition 扱い | Low | `free__recovery__*` suppressible を §10 固定 |
| runtime P0 未解消 | High | Production 接続禁止維持 |

**Open questions（composition gate で解消）:**

- paid path 同時入力時の free vs paid emphasis 生活文脈の優先（SSOT は `paidChapterEmphasisIds` 固定済み）

---

## 28. Final Readiness Classification

```text
plan readiness: READY_FOR_ACTUAL_DIFF_REVIEW_REV2
selector architecture: SELECTOR_ARCHITECTURE_COMPLETE
versioning: OPTIONAL_FP_V1_BUNDLE_VALID / selectors-v1 / gmfn-v2
strain: STRAIN_INDEPENDENCE_CONTRACT_COMPLETE
recovery: RECOVERY_ZERO_OR_ONE_REQUIRED
snapshot/hash: SNAPSHOT_HASH_VERSION_BOUNDARY_COMPLETE
paid authority: DUAL_CHAPTER_AUTHORITY_RESOLVED
privacy: PII_BOUNDARY_COMPLETE + INTERNAL_HASH_EXPOSURE_BOUNDARY_REQUIRED

implementation allowed: NO（次 gate まで）
composition allowed: NO
UIUX allowed: NO
Production connection allowed: PROHIBITED
compatibility: HOLD

blockers:
- selector pure implementation 未着手
- composition matrix 未実装
- runtime P0 未解消

residual risks:
- final article hundreds NOT YET PROVEN
- freeExpressionHash small-domain reversibility
```

**次 gate:** `CATEGORY-2-M55-PERSONAL-SEMANTIC-FINGERPRINT-VERSIONED-SELECTOR-IMPLEMENTATION-PLAN-ACTUAL-DIFF-REVIEW-REV2`

---

*本計画は selector ID と resolution 契約のみを固定する。文章 composition・UI・Production 接続は後続 gate。*
