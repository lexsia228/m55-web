# M55 SSOT Reflection Plan v1

**M55 SSOT反映計画 v1**

| 項目 | 値 |
|------|-----|
| 文書種別 | docs/review 計画アーティファクト |
| 版 | v1 |
| 前提ゲート | CATEGORY_1_M55_IMPLEMENTATION_PRE_INSTRUCTION_SSOT_REFLECTION_PLANNING_GREEN_READONLY_NO_MUTATION |
| HUMAN_MARK | PASS_WITH_CARRYFORWARD |

---

## 0. この文書の位置づけ

本書は **docs/review 専用の計画文書** である。

- 本書は **docs/ssot 本体の反映（body reflection）ではない**。
- 本書は **docs/ssot を変更・上書きしない**（候補の整理のみ）。
- 本書は **実装指示ではない**（app/code・prompt/code・CSS/layout の変更を指示しない）。
- 本書は次を **承認しない**：
  - app/code、prompt/code、CSS/layout の変更
  - DB / API / payment / auth / webhook の変更
  - Stripe / Clerk / Supabase 設定の変更
  - engine / snapshot / result-label の変更
  - checkout / payment / entitlement / route / product_id の変更
- 本書は、**HUMAN_MARK 承認後** に将来 `docs/ssot` へ吸収しうる候補を分類・優先付けする。
- **docs/ssot 本体の編集** は、別途の **明示 GO** がない限り行わない。

---

## 1. 入力ソース

### 1.1 レビュー文書（読み取り専用参照）

| # | パス |
|---|------|
| 1 | `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md` |
| 2 | `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` |
| 3 | `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_SKELETON_v0_1.md` |
| 4 | `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_V0_2_REFINEMENT_REVISED.md` |
| 5 | `docs/review/M55_HUMAN_REVIEW_MARKING_SHEET_v1.md` |

### 1.2 承認済み HUMAN_MARK 結果

| 項目 | 結果 |
|------|------|
| final result | **PASS_WITH_CARRYFORWARD** |
| BLOCK | **なし** |
| Product truth BLOCK | **なし** |
| implementation GO | **なし** |
| docs/ssot immediate reflection GO | **なし** |
| prompt/code GO | **なし** |

### 1.3 承認済み外部コピー構造の解釈（要約）

- 外部クイズ／コピーライティング素材の **文言は採用しない**。
- **構造／フックのみ** M55-safe 変換として候補とする。
- 採用可能な構造：繰り返しの違和感、非責め再定義、構造／パターン説明、保存版接続、小さな一手。
- 採用しない：IQ／才能フレーム、成功・収入・地位比較、「人生を無駄にした」煽り、「心理的防衛を無効化する」操作フレーム、過大claim、依存・羞恥圧力、外部文言直コピー等。

---

## 2. Product truth reflection classification

### 2.1 不変の Product truth（変更しない）

以下はレビュー・将来 SSOT 反映・将来実装のいずれでも **維持する**。

| 区分 | 固定値 |
|------|--------|
| 主名称 | **本質の読み解き** |
| 有料保存レポート | **保存版** |
| レポート構成 | **4章** |
| 相談機能主名称 | **相談返書** |
| 付属回数 | **付属1** |
| 追加回数 | **追加最大4** |
| 合計上限 | **合計5**（レポート単位） |
| 追加料金 | **追加500円** / 件 |
| プロフィール | **購入時点** のプロフィールに基づく |
| 相談の紐づき | **保存版に紐づく相談**（汎用チャットではない） |
| 禁止約束 | 汎用チャット化 / **無制限相談ではない** / **なんでも答える約束をしない** / **通知・メール送付を約束しない** |
| 専門領域 | **医療・治療・法律・投資・転職・退職判断の代替にしない** |
| 絶対助言 | **辞めろ・別れろ等の絶対助言にしない** |
| 技術不変 | **engine / snapshot / result-label は変更しない** |

### 2.2 三層分類

| 層 | 内容 | 優先度 |
|----|------|--------|
| **already fixed, not to change** | 数値・権利・商品名称（付属1、追加最大4、合計5、追加500円、名称、4章、紐づき） | — |
| **SSOT clarification candidate** | 境界文言・禁止約束の明文化（汎用チャット誤認防止、通知/メール非約束、専門代替禁止、絶対助言禁止） | **A** |
| **not to change** | engine / snapshot / result-label；entitlement 数値の正本改変；checkout / route / product_id | — |

**正本の扱い:** 回数・価格・権利の数値正本は `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` 等に既存する場合、コピー SSOT は **追従のみ**（逆戻り禁止：max3、700円 等）。

---

## 3. SSOT吸収候補一覧

| # | category | absorb into SSOT candidate | priority | candidate target area | rationale | risk to avoid |
|---|----------|---------------------------|----------|----------------------|-----------|---------------|
| 1 | Product truth boundary clarification | **yes** | **A** | 既存 Product truth / policy SSOT 節（具体ファイルは別 GO 時に確定） | 汎用チャット化・無制限相談・誤った約束を SSOT 境界で一本化 | max3/700円 regression；notification/email promise；medical/therapy/legal/investment/job-change substitute |
| 2 | Storyflow principles | **yes** | **A** | product copy master / copy checklist / review operational rule | 起承転結と画面リズムを operational 化し、LP・保存版・返書でブレを防ぐ | long flat explanation；manual-like copy；work/career default |
| 3 | External copy structure M55-safe transformation | **yes** | **A** | Storyflow / copy transformation rule 節 | 外部素材は構造のみ；M55-safe 変換チェーンを SSOT で固定 | manipulative copy；overclaiming；shame-based pressure；外部文言直コピ |
| 4 | Anti-sycophancy | **yes** | **A** | consult reply quality / safety SSOT appendix（新規節候補） | 返書の安全・非迎合を正史化 | unconditional validation；self-justification reinforcement；harsh doubt；therapy/legal advice |
| 5 | Consultation room boundary | **yes** | **A** | consultation room copy boundary / product copy master | 保存版紐づき・1テーマ・cap 表現を visible 層で固定 | generic chat；unlimited consultation；unclear wallet/cap |
| 6 | 温度感 / 察するUX | **yes** | **B** | expression policy only（出力表現方針） | モード定義と engine 非影響を SSOT に先に書く；実装は別 GO | gender logic branching；UI selector implementation creep；result branching |
| 7 | 具体承認 / 話しやすくするUX | **yes** | **B** | expression / consultation input support policy | 観察ベース承認と操作系承認の区別 | praise-hacking；sycophancy；dependency |
| 8 | My page functional UI | **yes** | **B** | My page / catalog / UI copy policy | 機能 UI のみ；感情ストーリー化を SSOT で抑止 | Entry Report 主ラベル regression；visible 返書チケット主名称；My page emotional story overload |

### 3.1 Storyflow principles（行 2 詳細）

SSOT 候補に含める構造：

- **お題 → あるある → 転換 → 読み解き → 次の一手**
- **one screen = one scene**（1画面 = 1シーン）
- **one heading = one topic**（1見出し = 1トピック）
- **heading 1 line / body 2–3 lines / next action 1 line**
- デフォルト軸：**日常・近い人・言葉・距離・疲れ**（仕事/キャリアをデフォルトにしない）
- **next action**：スマホでできる micro action（1行だけ置く、近い入口を1つ、保存版の1章だけ見る、今の場面だけ送る 等）

### 3.2 External copy structure M55-safe transformation（行 3 詳細）

**吸収するのは構造／フックのみ。文言は採用しない。**

| 区分 | 内容 |
|------|------|
| **Allowed conversion** | 繰り返しの違和感 → 責めない再定義 → 言葉・距離・タイミング・疲れ・期待で整理 → 保存版に戻す → 今の場面に近い入口を1つ |
| **Rejected** | IQ/talent comparison；income/status/success comparison；「人生を無駄にした」pain agitation；「心理的防衛を無効化する」；「本当の理由が必ず分かる」；3-minute life change implication；shame pressure；lock-in/addiction framing；praise-hacking；外部文言直コピ |
| **Required wording principle** | 採用：**警戒心を下げる**、**読み進めやすくする** — 不採用：**心理的防衛を無効化する** |

**対象読者フレーミング（carryforward）:** 現代日本語・人間関係・日常・近い人・言葉・距離・疲れをデフォルト。仕事/キャリア・スピリチュアル・運命・治療・救出・操作系コピーを避ける。

### 3.3 Anti-sycophancy（行 4 詳細）

- 感情には触れるが、**正しさの判定で終わらない**
- **「あなたは悪くない」で終わらない**
- **「相手が悪い」と言わない**
- 対立テーマでは、**非非難の他者／状況視点を1つ**含める
- ズレの整理軸：**言葉 / 距離 / タイミング / 疲れ / 期待**
- **保存版に紐づく相談**へ戻す
- **小さな一手1つ**で閉じる

### 3.4 Consultation room boundary（行 5 詳細）

- **保存版に紐づく相談**（汎用チャットではない）
- **1テーマ**に絞る（長文は narrow）
- 短文入力は受け入れ可能
- cap / remaining の表現は product truth に追従：**付属1 + 追加最大4 = 合計5**、**追加500円**
- 通知・メール・無制限・なんでも答える約束をしない

### 3.5 温度感 / 察するUX（行 6 詳細）

- **性別・sex による logic 分岐なし**（男性脳 / 女性脳 なし）
- ユーザー差は **output-expression 層のみ**
- 許容モード：**そっと整理する** / **はっきり整理する** / **順番にほどく**
- **UI セレクタ実装は本計画では承認しない**
- **prompt/code 実装は本計画では承認しない**
- engine / snapshot / result-label / 保存版結果 / 4章 / product truth に **影響させない**

### 3.6 具体承認 / 話しやすくするUX（行 7 詳細）

- **観察ベースの承認**（ユーザーが書いた・気づいたことの認識）
- 無条件肯定・praise-hacking・操作・依存誘導は **不採用**
- 短文 OK、長文は **1テーマ**に narrow
- **保存版に根ざした構造**へ戻す

### 3.7 My page functional UI（行 8 詳細）

- **機能 UI**（再開・カード・残数・注記）。感情ストーリーコピーではない
- **保存版再開**、**相談返書カード**、**残数表示**、**購入時点プロフィール注記**

### 3.8 v0.1 §17 との対応（参照のみ・docs/ssot は未編集）

将来の SSOT body reflection GO 時に検討する既知候補（本書は変更しない）：

| 候補 SSOT（参照パスのみ） | 反映しうる内容 |
|--------------------------|----------------|
| `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | 商品語彙・章名・相談返書境界 |
| `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` | 回数・価格・権利（正本・追従のみ） |
| `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md` | 1000/500 レーン整合確認 |
| `docs/ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md` | 公開面禁止語（storefront 触る場合） |
| 新規節候補 | Anti-sycophancy 方針；Storyflow / コピー実装チェックリスト |

---

## 4. Implementation-planning candidates

> **本節は実装計画候補の分類のみ。** 実装 GO・prompt GO は別ゲート。

| # | area | planning candidate | priority | reason | required gates before implementation |
|---|------|-------------------|----------|--------|--------------------------------------|
| 1 | 相談返書ルーム | **yes** | **A** | 境界・入力支援・Anti-sycophancy・保存版接続の最大タッチポイント | (1) 本 docs/review 計画の review/commit (2) SSOT body reflection **明示 GO**（必要時） (3) minimal implementation planning (4) **implementation GO** (5) behavior/visual confirmation |
| 2 | My page 相談返書カード | **yes** | **A** | 残数・再開・購入時プロフィール注記の visible product truth | 同上 |
| 3 | LP / 商品説明 | **yes** | **B** | 保存版↔相談返書 bridge、数字 framing、非汎用チャット明確化 | 上記 + storefront/freeze check（frozen `/dtr/lp` 等） |
| 4 | 保存版 reader | **yes** | **B** | 章 intro、next action、長い平坦ブロックの削減 | 上記 + reader 関連 freeze の事前確認 |
| 5 | Free/core bridge | **yes** | **C** | 保存版への自然接続；有料・相談より緊急度低 | 上記 + `/core` ヒーロー freeze 遵守 |

**実装時の想定タッチ（参照のみ・今は変更しない）:** v0.1 §4.2 フロー別ファイル表（`ConsultRoom.tsx`、`MyPanel.tsx`、`paidDtrProductCopy.ts` 等）。

---

## 5. Backlog / later

| 項目 | why not now |
|------|-------------|
| Entry Report public-route consistency outside `/my` | active UI は `/my` 中心；横断整合は SSOT/実装 GO 前の非ブロッカー |
| optional `/reply` standalone wallet visual check | 機能真実は policy SSOT；visual は implementation GO 後 |
| v0 / visual storytelling | HUMAN_MARK・本トラックで v0 redesign 非承認 |
| snapshot v2 / legacy inventory | engine 不変スコープ外 |
| engine audit trail | 本パケット群・本計画の対象外 |
| notification / email architecture | 禁止約束と矛盾しうる；別アーキテクチャ GO が必要 |
| 温度感 UI selector | v0.2 + HUMAN_MARK：UI 実装 GO なし |
| broad CSS/layout redesign | 本ゲート・HUMAN_MARK 対象外 |

---

## 6. Explicit non-GO

本書の作成・承認は、以下を **一切承認しない**。

| 非 GO 項目 | 状態 |
|------------|------|
| implementation approval | **なし** |
| docs/ssot body mutation approval | **なし** |
| prompt/code approval | **なし** |
| CSS/layout approval | **なし** |
| DB / API / payment / auth / webhook approval | **なし** |
| Stripe / Clerk / Supabase approval | **なし** |
| engine / snapshot / result-label approval | **なし** |
| 温度感 UI selector approval | **なし** |
| deploy / production mutation | **なし** |
| checkout / payment / entitlement / wallet ledger mutation | **なし** |
| product_id / route mutation | **なし** |

---

## 7. Proposed next chain

1. **Review / commit** — 本 `docs/review` 計画文書（REVIEW-COMMIT-PLANNING ゲート）
2. **Push** — 計画文書のみ（別 GO）
3. **Closeout** — 本トラックの DRAFT 完了記録
4. **SSOT body reflection planning** — **明示 GO のみ**（`docs/ssot` 編集はこの GO 後）
5. **Minimal implementation planning** — copy-only 候補の最小スコープ化
6. **Implementation GO** — app/code コピー変更（prompt は別 GO）
7. **Behavior / visual confirmation** — 凍結範囲・storefront ルール遵守の確認

---

## 8. Final verdict

| 項目 | 値 |
|------|-----|
| gate verdict | **GREEN_AS_SSOT_REFLECTION_PLAN_DRAFT** |
| artifact scope | **docs/review only**（本ファイル） |
| docs/ssot edited | **no** |
| implementation approved | **no** |
| prompt/code approved | **no** |
| recommended next gate | **CATEGORY-1-M55-IMPLEMENTATION-PRE-INSTRUCTION-SSOT-REFLECTION-REVIEW-COMMIT-PLANNING** |

---

## 付録 A. 変更禁止の明示（本トラック）

本計画文書の作成において、以下は **行っていない／行わない**：

- `docs/ssot` の編集
- 既存 `docs/review` ファイルの編集（v0.1 / v0.2 / Storyflow / Anti-sycophancy / Marking sheet）
- app/code、prompt/code、CSS/layout の変更
- staging / commit / push / deploy
- SQL / DB mutation
- payment / checkout / auth / env / webhook の変更
