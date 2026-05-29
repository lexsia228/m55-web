# M55 Human Review Marking Sheet v1

M55 人間レビュー・マーキングシート v1

## 0. この文書の位置づけ

- 本書は、人間レビュー用の **マーキングシート / テンプレート** である。
- 本書は **Product truth を変更しない**。
- 本書は **実装を承認しない**。
- 本書は **docs/ssot 本体反映を承認しない**。
- 本書は **prompt/code 変更を承認しない**。
- 本書は **UI / CSS / layout 変更を承認しない**。
- 本書は **DB / API / payment / auth / webhook / Stripe / Clerk / Supabase / engine / snapshot / result-label 変更を承認しない**。
- 人間印は **レビュー入力** に限り、単独では実装・SSOT・prompt の GO にならない。
- **SSOT reflection planning** は、人間マーキング完了後に行う。

## 1. レビュー対象文書

主対象（4 件）:

1. `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md`
2. `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md`
3. `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_SKELETON_v0_1.md`
4. `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_V0_2_REFINEMENT_REVISED.md`

補助参照（主マーキング対象外）:

- `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_v1.md` — 監査型・リスク inventory 用。明示指示がない限り、本シートの主記入対象にしない。

## 2. 推奨マーキング順序

| 順 | 文書 | 理由（短文） |
|----|------|----------------|
| 1 | Storyflow packet | 画面別の読み心地・起承転結を先に固定する |
| 2 | Anti-sycophancy audit | 返書の安全・別視点・非全肯定を Storyflow と照合する |
| 3 | v0.1 skeleton | 統合骨子・Product truth・禁止範囲の合意を取る |
| 4 | v0.2 refinement revised | 温度感・具体承認が v0.1 と矛盾しないか最終確認する |

## 3. 共通マーキング印

### 一般（フロー / コピー）

- OK
- 修正
- 柔らかくする
- はっきりする
- 意味がわからない
- 仕事っぽい
- もっと人間関係へ
- 削る
- 強める
- 流れが悪い
- お題が弱い
- あるあるが足りない
- 転換が弱い
- 次の一手が弱い
- 後回し

### 返書 / 安全

- 依存感が強い
- 全肯定に見える
- 別視点が足りない
- 保存版との接続が弱い
- 汎用チャットに見える
- 実装に寄りすぎ

### Product truth 違反が疑われる場合

- 通常印ではなく **BLOCK コメント** を使う（価格・回数・上限・付属/追加の変更要求は不可）。

## 4. 共通レビュー優先度

1. **Product truth 維持**
   - 本質の読み解き
   - 保存版
   - 4章
   - 相談返書
   - 付属1
   - 追加最大4
   - 合計5
   - 追加500円
   - 購入時点プロフィール
   - 保存版に紐づく相談
2. 汎用チャット化しない
3. 無制限相談を約束しない
4. なんでも答える約束をしない
5. 通知・メール送付を約束しない
6. 医療・治療・法律・投資・転職判断の代替にしない
7. 「辞めろ」「別れろ」などの絶対助言にしない
8. 性別/性によるロジック分岐を採用しない
9. 男性脳 / 女性脳フレーミングを採用しない
10. 温度感は **出力表現レイヤーのみ**
11. 具体承認は **無条件肯定ではない**
12. 全トーンで **Anti-sycophancy を有効** のまま
13. **My page は機能 UI**（情緒ストーリーコピー主軸にしない）
14. **実装は未着手**（本シートは GO ではない）

## 5. 文書別マーキングガイド

### 5.1 Storyflow packet

**Path:** `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md`

**主に見ること:**

- お題 / あるある / 転換 / 読み解き / 次の一手
- 1画面 = 1シーン
- 長くて読むのが疲れないか
- 仕事・キャリアをデフォルト軸にしていないか
- 日常・近い人・言葉・距離・疲れへの着地
- Product truth
- §14 技法の採否

**PASS:**

- 主要 SF 候補にレビュー印がある
- Product truth を壊していない
- 実装 GO と読める文言がない

**BLOCK:**

- 価格・回数・Product truth の変更要求
- 実装 GO
- 汎用チャット / 無制限の含意

**Carryforward:**

- backlog 項目は `後回し` 印

---

### 5.2 Anti-sycophancy audit

**Path:** `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md`

**主に見ること:**

- 無条件肯定をしない
- 自己正当化の補強だけにしない
- 他者/状況視点を最低1つ（対立テーマ）
- 温かさを保つ
- 保存版への接続
- 医療/治療/法律/投資/転職の代替にしない

**優先印:**

- 全肯定に見える
- 別視点が足りない
- 保存版との接続が弱い
- 依存感が強い

**PASS:**

- NG/OK 例が明確
- 「あなたは悪くない」で終わる型が拒否されている
- prompt/code の即時実装指示がない

**BLOCK:**

- 即時 prompt/code 変更指示
- 「相手が悪い」を推奨パターン化
- 絶対助言（別れろ/辞めろ等）の推奨

---

### 5.3 v0.1 skeleton

**Path:** `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_SKELETON_v0_1.md`

**主に見ること:**

- 統合 Product truth
- Storyflow 方向
- My page 機能 UI
- 相談返書ルーム境界
- §12 実装候補は候補のまま
- §13 変更禁止が明確
- §18 後回しが分離されている

**優先印:**

- 実装に寄りすぎ
- 汎用チャットに見える
- 修正
- 後回し

**PASS:**

- v0.1 は実装前指示の骨子であり、実装 GO ではない
- Product truth を受理できる
- 禁止スコープが維持されている

**BLOCK:**

- v0.1 を実装承認と解釈する合意
- docs/ssot の即時変更
- payment / auth / DB / engine 変更の含意

---

### 5.4 v0.2 refinement revised

**Path:** `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_V0_2_REFINEMENT_REVISED.md`

**主に見ること:**

- 性別/性ロジック分岐なし
- 男性脳 / 女性脳 なし
- 温度感 / 察するUX = 出力表現層のみ
- 具体承認 / 話しやすくするUX
- 具体承認 ≠ 無条件肯定
- praise-hacking / 操作 / 依存誘導の拒否
- 全トーンで Anti-sycophancy 有効
- UI mode selector 未承認
- prompt/code 未承認

**優先印:**

- 依存感が強い
- 全肯定に見える
- 別視点が足りない
- 保存版との接続が弱い
- 実装に寄りすぎ

**PASS:**

- 表現層の境界が明確
- 性別分岐なし
- 実装未承認
- SSOT 本体反映未承認

**BLOCK:**

- v0.1 上書き
- 性別による engine / snapshot / result-label 分岐の容認
- 現時点での UI selector 実装承認
- 現時点での prompt/code 変更承認

## 6. マーキング記入フォーマット

```text
document: <path>
section: <§番号 / heading / SF-ID>
mark: <allowed mark or BLOCK>
concern_flags: <optional short flags>
note: <one-line reason>
product_truth_touch: no | comment-only | BLOCK
carryforward: none | SSOT | impl-planning | 後回し
```

### 記入例

```text
document: docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md
section: SF-D / 相談返書ルーム
mark: OK
concern_flags: none
note: 保存版に紐づく相談として読める。
product_truth_touch: no
carryforward: none
```

```text
document: docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_V0_2_REFINEMENT_REVISED.md
section: §5 具体承認
mark: 全肯定に見える
concern_flags: praise-risk
note: 書けたことの承認と、正しさの保証が近く見える箇所がある。
product_truth_touch: no
carryforward: SSOT
```

```text
document: docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_SKELETON_v0_1.md
section: §12 実装対象画面候補
mark: 後回し
concern_flags: scope
note: 実装候補としては残すが、今回のSSOT reflectionでは扱わない。
product_truth_touch: comment-only
carryforward: 後回し
```

## 7. ドキュメント単位の合否

| 結果 | 定義 |
|------|------|
| **PASS** | BLOCK なし。Product truth 懸念なし。 |
| **PASS_WITH_CARRYFORWARD** | BLOCK なし。未解決は SSOT / impl-planning / 後回し に明示。 |
| **BLOCK** | Product truth 変更要求、実装 GO、prompt/code GO、docs/ssot 即時変更、性別分岐容認、汎用チャット/無制限容認 |

### 記入欄（人間が記入）

| 文書 | 合否 | 未解決メモ |
|------|------|------------|
| Storyflow | | |
| Anti-sycophancy | | |
| v0.1 skeleton | | |
| v0.2 refinement revised | | |

## 8. HUMAN_MARK 完了後の流れ

- マーキング後も **実装しない**。
- 次は **SSOT reflection planning**。
- SSOT reflection は **吸収範囲の選定のみ**（本体変更は別 gate）。
- **docs/ssot 本体の変更** には、別途明示 gate が必要。
- **minimal implementation planning** は SSOT reflection の後。
- **実装** は明示 GO の後のみ。
- **behavior / visual confirmation** は implementation planning / 実装の後。

## 9. 変更禁止範囲

本シートおよびマーキング作業では、次を変更・承認しない:

- app/code
- prompt/code
- CSS/layout
- docs/ssot（本体）
- DB / API / payment / auth / webhook
- Stripe / Clerk / Supabase
- checkout / payment
- entitlement
- wallet ledger
- product_id / route
- engine / snapshot / result-label
- v0 redesign
- deploy
- push
- Production mutation
