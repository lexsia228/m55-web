# M55 Reply Generate API Stub 仕様 v1

## 1. 目的

`POST /api/reply/generate` の stub 実装における API 契約、正常系、失敗系、観測項目、将来拡張の前提を固定する。

本仕様の目的は以下の3点である。

1. 返書 JSON を安定して返すための最小 API 契約を確立する
2. 将来の entitlement 消費、wallet row lock、transaction、audit log を壊さない形で stub を組む
3. 高負荷時・同時アクセス時・部分失敗時でも、整合性の正本をサーバー側に残す設計を先に固定する

---

## 2. API 責務

`POST /api/reply/generate` は、最終的には以下を担う command API である。

- 生成可否判定
- ReplySession 作成または再利用
- 返書生成実行
- ReplyDocument 保存
- entitlement / wallet 消費
- WalletLedger 記録
- 最終状態返却

ただし **stub 段階** では責務を以下に限定する。

- リクエスト検証
- idempotency key 契約の導入
- ReplySession の作成または再利用
- JSON Schema v1.1 に準拠した返書 payload の返却
- observability / audit に必要なログ出力
- 将来の wallet / transaction 接続ポイントの確保

stub 段階では、**実際の entitlement 減算はまだ接続しない**。  
ただし、将来の本実装と衝突しないよう、レスポンス・ログ・セッション状態はその前提で設計する。

---

## 3. エンドポイント

### 3.1 Method / Path
- `POST /api/reply/generate`

### 3.2 認証
- 認証必須
- `user_id` はサーバー側セッション / 認証コンテキストから取得する
- body から `user_id` を受け取ってはならない

### 3.3 必須ヘッダ
- `Content-Type: application/json`
- `X-Idempotency-Key: <unique-string>`

### 3.4 リクエスト Body

```json
{
  "theme": "仕事",
  "input_mode": "guided",
  "selected_subquestions": [
    "今いちばん重い場面はどこですか。",
    "急な変更は最近増えていますか。"
  ],
  "free_text": "最近、判断の切り替えが重くなっています。",
  "schema_version": "1.1"
}
```

### 3.5 リクエスト field 定義

#### `theme`
- 型: `string`
- 必須
- 返書テーマ
- 許可値の最終固定は別 SSOT に従う
- 空文字不可

#### `input_mode`
- 型: `string`
- 必須
- 例: `guided`, `free`
- 最終 enum は別 SSOT で固定
- 空文字不可

#### `selected_subquestions`
- 型: `string[]`
- 任意
- guided モード時の補助質問
- 件数制約は既存の入力制約 SSOT に従う

#### `free_text`
- 型: `string`
- 任意
- ユーザー自由入力
- 文字数制約は既存の文字数 SSOT に従う

#### `schema_version`
- 型: `string`
- 必須
- `"1.1"` 固定
- 返書 payload の version と一致すること

---

## 4. レスポンス契約

### 4.1 成功レスポンス

HTTP `200 OK`

```json
{
  "ok": true,
  "stub_mode": true,
  "request_id": "req_01",
  "reply_session_id": "rs_01",
  "idempotency_key": "idem_01",
  "consumption_applied": false,
  "wallet_before": null,
  "wallet_after": null,
  "reply_document": {
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
}
```

### 4.2 成功レスポンス field 定義

#### `ok`
- 型: `boolean`
- 常に `true`

#### `stub_mode`
- 型: `boolean`
- stub 段階では `true` 固定

#### `request_id`
- 型: `string`
- サーバー側で採番
- observability 用

#### `reply_session_id`
- 型: `string`
- ReplySession の識別子

#### `idempotency_key`
- 型: `string`
- リクエストヘッダ由来
- そのまま返してよい

#### `consumption_applied`
- 型: `boolean`
- stub 段階では `false`
- 本実装移行時に `true/false` を実状態に合わせる

#### `wallet_before`
- 型: `number | null`
- stub 段階では `null`
- 本実装で残数 snapshot を返す場合に利用

#### `wallet_after`
- 型: `number | null`
- stub 段階では `null`

#### `reply_document`
- 型: `object`
- `M55_REPLY_JSON_SCHEMA_v1.md` に完全準拠すること

---

## 5. エラーレスポンス契約

### 5.1 共通フォーマット

```json
{
  "ok": false,
  "request_id": "req_01",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "theme is required"
  }
}
```

### 5.2 想定エラーコード

#### `INVALID_REQUEST`
- HTTP `400`
- 必須 field 欠落、型不正、空文字など

#### `UNAUTHORIZED`
- HTTP `401`
- 認証なし

#### `FORBIDDEN`
- HTTP `403`
- entitlement 条件未達
- stub 段階では将来予約。必要に応じて未使用でもよい

#### `IDEMPOTENCY_CONFLICT`
- HTTP `409`
- 同一 idempotency key に対して、競合する別リクエストが来た場合

#### `SCHEMA_VALIDATION_FAILED`
- HTTP `422`
- 返書生成結果が JSON schema を満たさない場合

#### `TOO_MANY_REQUESTS`
- HTTP `429`
- 同一ユーザーの短時間多重送信制限

#### `INTERNAL_ERROR`
- HTTP `500`
- 想定外例外

---

## 6. 正常系フロー

stub 段階の正常系は以下とする。

1. 認証確認
2. `X-Idempotency-Key` 存在確認
3. request body バリデーション
4. `schema_version` が `"1.1"` か確認
5. ReplySession を作成または再利用
6. 返書 payload を生成
7. payload を JSON schema v1.1 で検証
8. observability ログを書き出す
9. 成功レスポンスを返却

---

## 7. Transaction / Lock / Idempotency

### 7.1 stub 段階の方針
- stub 段階では実 wallet 減算を行わない
- ただし、将来の transaction / lock を前提に、`idempotency_key` と `reply_session_id` は必須で扱う

### 7.2 idempotency
- 同一 `idempotency_key` + 同一 `user_id` の再送は、同一 session として扱う
- 既に成功済みなら、同等レスポンスを再返却してよい
- 同一 key で異なる payload を送った場合は `409 IDEMPOTENCY_CONFLICT`

### 7.3 transaction / lock（将来接続前提）
本実装時は少なくとも以下を守る。

- wallet 減算と ReplyDocument 保存は同一 transaction 内で実行
- wallet row lock は transaction 内で取得
- partial success を許可しない
- commit 前失敗では消費不成立

---

## 8. Failure Matrix

### 8.1 入力バリデーション失敗
- HTTP `400`
- ReplySession 作成前に終了してよい
- 消費なし
- ledger なし

### 8.2 認証失敗
- HTTP `401`
- 処理中断
- 消費なし

### 8.3 idempotency key 重複（同一 payload）
- HTTP `200`
- 既存成功結果を返却してよい
- 消費なし（stub）
- 同一 `reply_session_id` を返すことが望ましい

### 8.4 idempotency key 重複（異なる payload）
- HTTP `409`
- 処理中断
- 消費なし

### 8.5 JSON schema 検証失敗
- HTTP `422`
- 返書 payload を採用しない
- 失敗ログを残す
- 消費なし

### 8.6 サーバー内部例外
- HTTP `500`
- 失敗ログを残す
- 消費なし

### 8.7 高負荷 / 多重送信
- HTTP `429` または `409`
- 実装方式に応じてどちらかに統一
- 重要なのは二重消費・二重保存を起こさないこと

---

## 9. Observability / Audit

最低限、以下をログに持つ。

- `request_id`
- `user_id` または安全な識別子
- `reply_session_id`
- `idempotency_key`
- `theme`
- `input_mode`
- `selected_subquestion_count`
- `free_text_length`
- `stub_mode`
- `response_status`
- `schema_validation_result`
- `latency_ms`

ログにそのまま残さない方がよいもの:

- `free_text` 原文全文
- 返書全文の生ログ
- 不必要な個人識別情報

監査ログとして最低限残すもの:

- request 受理
- request 失敗
- schema validation 失敗
- success 返却

---

## 10. Non-Goals

この stub 段階では以下をまだやらない。

- 実際の wallet 減算
- 実際の entitlement 変更
- 実際の WalletLedger 永続化
- 本番決済との接続
- 高度なテーマ enum 固定
- 文字数制約の最終 enforcement
- 本番 LLM プロンプト最終版の固定

---

## 11. 実装順序

1. request / response 型を固定
2. `X-Idempotency-Key` を受ける
3. ReplySession 作成または再利用
4. schema v1.1 準拠 payload を返す
5. schema validation を通す
6. observability ログを入れる
7. その後に entitlement / wallet / ledger の本接続へ進む

---

## 12. この文書でまだ確定しないもの

- 実 wallet 減算の接続タイミング
- `429` と `409` の最終運用基準
- `theme` の最終 enum
- `input_mode` の最終 enum
- 本番 LLM 実装の詳細
- rate limit の最終閾値

これらは別 SSOT または次段階仕様で固定し、本仕様では API stub 契約のみを固定する。
