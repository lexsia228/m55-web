# M55 返書 JSON Schema 仕様 v1

## 1. 目的

AI（LLM）が生成する返書データの構造を厳格に定義し、UIとの契約を固定する。  
本仕様は、返書の field 構造、必須性、バリデーション責務、UI マッピング、フォールバック挙動を定義する SSOT である。

---

## 2. 基本方針

- AI は自由文ではなく、**必ず 1 個の JSON オブジェクト**を返す。
- UI はこの JSON を **4〜6 枚のカード**に展開する。
- 文字数や補助質問数の厳密値は、**既存の文字数SSOTおよび入力制約SSOTに従う**。
- 本文フィールドは **平文（plain text）** とし、Markdown、HTML、コードフェンスを含めてはならない。
- 本仕様は field 構造・必須性・バリデーション責務を固定する。
- schema の breaking change は別版として切り、同一ファイルを上書き凍結しない。

---

## 3. ルートオブジェクト契約

返書 JSON は、以下の条件を満たさなければならない。

- ルートは **object**
- 返却値は **配列ではない**
- 返却値は **文字列ラップではない**
- コードブロック（```json など）で囲ってはならない
- `null` を top-level field に入れてはならない
- 未定義 field を追加してはならない（`additionalProperties: false` 相当で扱う）

---

## 4. JSON 構造定義（Core Required Fields）

AI は以下のスキーマを遵守して JSON を出力しなければならない。

### `theme`
- 型: `string`
- 意味: 選択された悩みテーマ
- ルール:
  - 必須
  - 空文字不可
  - リクエストで選択されたテーマと一致すること

### `issue_summary`
- 型: `string`
- 意味: ユーザー入力を踏まえた現状の整理
- ルール:
  - 必須
  - 空文字不可
  - 平文のみ

### `current_flow`
- 型: `string`
- 意味: いま起きている流れの読み解き
- ルール:
  - 必須
  - 空文字不可
  - 平文のみ

### `background_tendency`
- 型: `string`
- 意味: 5軸の傾向から見た背景
- ルール:
  - 必須
  - 空文字不可
  - 平文のみ

### `load_point`
- 型: `string`
- 意味: どこに負荷が集まっているか
- ルール:
  - 必須
  - 空文字不可
  - 平文のみ

### `first_step`
- 型: `string`
- 意味: 最初の一歩、具体的な整え方
- ルール:
  - 必須
  - 空文字不可
  - 平文のみ

### `next_question`
- 型: `string`
- 意味: 次に深掘りすべき問い
- ルール:
  - 必須
  - 空文字不可
  - 平文のみ

### `version`
- 型: `string`
- 意味: 返書スキーマ版
- ルール:
  - 必須
  - `"1.1"` 固定

---

## 5. 拡張フィールド（Optional Metadata）

### `supporting_axes`
- 型: `number[]`
- 意味: 判定の根拠となった 5 軸インデックス
- ルール:
  - 任意
  - 各値は `0`〜`4`
  - 重複不可
  - 最大 3 件
  - 順序は重要度順でよい

### `caution_note`
- 型: `string`
- 意味: 補足の注意点
- ルール:
  - 任意
  - 入れる場合は空文字不可
  - 平文のみ

### `tone_label`
- 型: `string`
- 意味: 返書トーン識別子
- ルール:
  - 任意
  - 入れる場合は空文字不可
  - UI の演出補助にのみ使う

### `followup_prompts`
- 型: `string[]`
- 意味: 次に提示する補助質問候補
- ルール:
  - 任意
  - 各要素は空文字不可
  - 最大 3 件
  - 平文のみ

---

## 6. 正規 JSON 例

```json
{
  "theme": "仕事",
  "issue_summary": "いまは進め方そのものより、判断の重さと疲れが先に積み上がっている状態です。",
  "current_flow": "やるべきことは見えていても、急な変化や人との調整が重なるほど、手元の整理より先に負荷が高まりやすい流れです。",
  "background_tendency": "もともと深く考えてから動く傾向があるため、見通しが切れる場面では本来の判断力が使いにくくなりやすいです。",
  "load_point": "負荷は、急な変更と判断の詰まりが同時に起きる場所に集まりやすいです。",
  "first_step": "まずは今日動かす範囲を一段だけに絞り、見通しを回復させることを優先してください。",
  "next_question": "いま一番止まりやすいのは、対人調整ですか、それとも自分の判断ですか。",
  "supporting_axes": [4, 0],
  "caution_note": "余力が浅い日に結論を急ぎすぎると、あとで整え直しの負荷が大きくなりやすいです。",
  "tone_label": "steady",
  "followup_prompts": [
    "今いちばん重い場面はどこですか。",
    "急な変更は最近増えていますか。"
  ],
  "version": "1.1"
}
```

---

## 7. バリデーションルール

- Top-level required fields は  
  `theme`, `issue_summary`, `current_flow`, `background_tendency`, `load_point`, `first_step`, `next_question`, `version`
- required fields は、trim 後に空文字であってはならない
- `null` は不可
- `supporting_axes` は 0〜4 の整数のみ
- `supporting_axes` の最大件数は 3
- `supporting_axes` は重複不可
- `followup_prompts` の最大件数は 3
- 文字数上限は既存の文字数SSOTに従う
- 上限超過時は、生成側または整形側で既存ルールに従って調整する
- JSON parse 不可の出力は失敗として扱う
- `theme` が入力テーマと不一致の場合は失敗として扱う
- `version` が `"1.1"` 以外の場合は互換性未確認として失敗扱いにできる

---

## 8. UI マッピング

返書 UI の基本マッピングは以下とする。

- `issue_summary` → 「今回の論点」
- `current_flow` → 「今起きている流れ」
- `background_tendency` → 「背景にある傾向」
- `load_point` → 「負荷が集まる場所」
- `first_step` → 「先に整えること」
- `next_question` → 「次に深掘りできる問い」

拡張フィールドの扱い:

- `supporting_axes` → 補助表示または根拠表示
- `caution_note` → 補足カードまたは注意書き
- `followup_prompts` → 次の入力候補
- `tone_label` → UI 演出補助（本文の意味を変えてはならない）

---

## 9. フォールバックルール

- `supporting_axes` が空でも core required fields が揃っていれば表示可能
- optional fields が欠けていても UI は描画可能
- `caution_note` と `followup_prompts` は欠けても失敗にしない
- required fields が欠けた場合は返書生成失敗として扱う
- required fields が空文字の場合も返書生成失敗として扱う
- parse 失敗時は UI で無理に描画せず、生成失敗として再試行可能状態へ戻す

---

## 10. 生成制約（LLM Output Contract）

LLM は以下を守ること。

- JSON 以外の文を前後に付けない
- Markdown 見出し、箇条書き、コードフェンスを出さない
- HTML タグを出さない
- 絵文字を出さない
- `theme` は入力テーマをそのまま使う
- 本文は M55 の返書として、一般論ではなく見えている傾向を前提に整理する
- field 名を変更しない
- 追加 field を勝手に増やさない

---

## 11. バージョニング

- `version` は schema バージョンを表す
- v1 系では `"1.1"` を固定値とする
- field の追加・削除・意味変更などの breaking change は v2 文書として新規作成する
- minor な追記でも、既存 UI 契約を壊す場合は同一ファイルを上書きしない

---

## 12. この文書でまだ確定しないもの

- 各 field の厳密文字数上限
- 補助質問数の最終固定値
- テーマ数の最終固定
- プロンプト本文の最終 wording
- UI デザインの最終見た目

これらは別 SSOT で管理し、本仕様では JSON 構造・必須性・バリデーション・UI 契約のみを固定する。
