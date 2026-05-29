# M55 Implementation Pre-Instruction v0.2 Refinement Revised

M55 実装前指示書 v0.2 refinement案 改訂版・補正版

## 0. この文書の位置づけ

- 本書は `docs/review` に置く独立した refinement レイヤーであり、レビュー/計画用の文書である。
- 本書は `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_SKELETON_v0_1.md` を上書きしない。
- 本書は Storyflow / Anti-sycophancy / v1 audit の既存文書を編集しない。
- 本書は実装指示ではない。
- 本書は `docs/ssot` 本体反映文書ではない。
- 本書は SSOT reflection planning と minimal implementation planning の前に、人間レビューするための材料である。
- 本書単体を根拠に、app/code、prompt/code、CSS/layout、DB/API/payment/auth/webhook、Stripe/Clerk/Supabase、engine/snapshot/result-label、checkout/payment の変更を開始してはならない。

## 1. この改訂の目的

- v0.2 は、温度感 / 察するUX と 具体承認 / 話しやすくするUX の refinement を追加する。
- 性別/性に基づくロジック分岐を採用しない。
- 男性脳 / 女性脳フレーミングを採用しない。
- ユーザー差は、受け取り温度・言葉の強さ・説明量・相談スタイル・出力表現の調整として扱う。
- 具体承認は、書き進めやすくするための技法であり、おだてや操作を目的にしない。
- 全トーンで Anti-sycophancy を有効のまま維持する。

## 2. Product truth 固定事項

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
- 汎用チャットではない
- 無制限相談ではない
- なんでも答える約束をしない
- 通知・メール送付を約束しない
- 医療・治療・法律・投資・転職判断の代替にしない
- 退職判断の代替にしない
- 「辞めろ」「別れろ」などの絶対助言にしない
- engine/snapshot/result-label は今回変更しない
- checkout/payment/entitlement/wallet ledger はこの文書では変更しない

## 3. 性別分岐を採用しない理由

- M55 は、性別/性により診断・保存版 results・4章構造・engine・snapshot・result-label を分岐しない。
- 男性脳 / 女性脳という分類を使わない。
- 「男だから攻め」「女だから守り」のような固定パターンを使わない。
- 現在または将来にプロフィール情報が存在しても、別 engine path や別 result truth を作る根拠にしない。
- M55 が扱う差は、温度感・受け取り方・言葉の強さ・相談スタイルであり、性別分岐ではない。

## 4. 温度感 / 察するUX 方針

- 空気を読む。
- 察する。
- ただし、ユーザーの代わりに決めない。
- 柔らかいが、追従的にはしない。
- 明確だが、過度にきつくしない。
- 感情は受け止めるが、正しさ判定はしない。
- 相談は保存版に紐づく範囲へ戻して整理する。
- 最後は小さな次の一手で閉じる。

### 許容する表現モード

- そっと整理する
- はっきり整理する
- 順番にほどく

### 重要な境界

- 上記モードは表現設計の方向であり、UI selector 実装承認ではない。
- 上記モードは prompt/code 実装 GO ではない。
- 上記モードは product logic 変更ではない。

### 影響してよい範囲

- output wording
- explanation amount
- CTA wording
- consult reply tone
- example ordering
- helper question order
- chip explanation softness

### 影響してはいけない範囲

- engine
- snapshot
- result-label
- 保存版 results
- 4章 structure
- product specs
- consult reply count/price
- purchase-time profile
- 保存版に紐づく相談 boundary
- entitlement / checkout / wallet ledger / payment

## 5. 具体承認 / 話しやすくするUX 方針

- 具体承認とは observation-based acknowledgement である。
- ユーザーが「何を書けたか」「何に気づいたか」「どこまで言語化できたか」を具体に認める。
- 否定から入らない。
- ユーザーが書けたことを具体的に認める。
- 迷いを言葉にできたことを入口として扱う。
- 短文でも進める。
- 長文は1テーマに絞る。
- 前の発言を潰さず、次の層を足す。
- 保存版に戻す。
- 保存版に紐づく範囲で整理する。
- 最後は小さな一手にする。

### 具体承認で明確に否定するもの

- concrete acknowledgement は praise-hacking ではない。
- conversion manipulation tactic ではない。
- unconditional validation ではない。
- dependency induction ではない。
- 構造化された保存版に紐づくレビューへ進みやすくするための補助である。

## 6. 採用しない承認パターン

- 全肯定
- おだて
- 褒め殺し
- 報酬系ハック
- 操作的CVR設計
- 課金目的で承認を使う
- 依存誘導
- 自己正当化を補強するだけの返書
- あなたは正しい
- あなたは悪くない
- 相手が悪い
- さすがです
- すごいです
- 完璧です
- その考えで合っています
- もっと何でも話してください
- 私たちに預けてください
- 全部受け止めます
- なんでも相談できます
- 無制限に話せます
- もっと聞かせてください
- 何回でも相談できます
- あなたの味方です
- 相手に分からせましょう
- 相手を動かしましょう
- そのままで大丈夫です
- 入口はこちらで一緒に整理します

## 7. Anti-sycophancyとの整合

- Concrete acknowledgement は unconditional validation ではない。
- 感情を受け止めても正しさ判定はしない。
- ユーザーの書きやすさは高めるが、自己正当化の補強はしない。
- 対立テーマでは、非断罪の他者視点/状況視点を最低1つ含める。
- ずれは次の5軸で整理する。
  - 言葉
  - 距離
  - タイミング
  - 疲れ
  - 期待
- 相談は保存版に紐づく相談へ戻す。
- 最後は1つの小さな次の一手で閉じる。
- 医療/治療/法律/投資/転職判断の代替にしない。
- 「別れろ」「辞めろ」「絶対に距離を置け」は絶対助言として使わない。

## 8. 温度感ごとの使い方

### そっと整理する

- 目的: 入力負荷を下げ、書き始めのハードルを下げる。
- 文体: 穏やかな具体承認 + 短い整理。
- 許容範囲: 短文入力支援、最初の1テーマ抽出、必要時の他者/状況視点。
- 禁止範囲: 正しさ保証、全肯定、汎用チャット拡張。

### はっきり整理する

- 目的: 論点を短く明確化し、次の一手を明瞭にする。
- 文体: 簡潔・明瞭・非攻撃。
- 許容範囲: 要点の再整理、1アクション提案、保存版章への接続。
- 禁止範囲: 断罪、ユーザー/相手の正誤判定、きつい決めつけ。

### 順番にほどく

- 目的: 長文/混在入力を分解し、1テーマへ収束させる。
- 文体: 手順を明示しつつ圧をかけない。
- 許容範囲: テーマ分解、順序化、保存版に紐づく構造へ復帰。
- 禁止範囲: 全テーマ同時処理の約束、なんでも相談化、話題の無制限拡張。

## 9. 相談返書ルームでの使い方

### 入力前

避ける文言:

- 何でも話してください
- どんな悩みでも大丈夫です
- 全部受け止めます
- 私たちに預けてください

採用方向:

- 全部をうまく説明しなくても大丈夫です。
- まずは、今いちばん近い場面を1つだけ選んでください。
- 保存版のどこに近いか分からなくても、今の場面に近い入口から整理できます。
- この相談は、保存版に紐づく範囲で扱います。

### 短文入力後

- 短文を拒否しない。
- 保存版に紐づく範囲で整理する。
- 対立テーマでは他者/状況視点を最低1つ入れる。
- 最後は小さな一手で閉じる。

### 長文入力後

- 長文を拒否しない。
- 1テーマに絞る。
- 他者/状況視点を含める。
- 保存版に紐づく範囲へ戻す。
- 「全部見ます」は使わない。
- 例: 相手側からは、話題が一度に増えて、何に返せばよいか見えにくかった可能性もあります。

### 感情が強い入力後

- 感情を受け止めるが、正しさ判定はしない。
- 「あなたは悪くありません」は使わない。
- 「相手が悪い」は使わない。
- 他者/状況視点を入れる。
- 保存版に戻して整理する。
- 最後は、小さな次の一言/行動を1つ提案する。

## 10. 採用する文言 / 採用しない文言

### 採用する文言方向

- ここまで書けていれば、整理の入口はあります
- この1行だけでも、今の場面は見えます
- まずは、いちばん近い場面を1つだけ見ます
- 全部説明しなくても大丈夫です
- ここでは、誰が悪いかではなく、どこで言葉が止まったかを整理します
- 保存版に戻して見ていきます
- 保存版に紐づく範囲で整理します
- 今の場面に近い入口から整理できます
- 言葉・距離・タイミング・疲れ・期待で分けます
- 今の場面に近い入口を選ぶ
- 必要なら1行だけ足す
- 話を広げる前に、1テーマへ戻す
- 書けたことを入口にする

### 採用しない文言方向

本書 `## 6. 採用しない承認パターン` の全項目をそのまま採用しない。

## 11. 既存v0.1との関係

- v0.1 skeleton は close 済み baseline として維持する。
- 本 v0.2 revised 文書は v0.1 を上書きしない。
- 本文書は後続の SSOT reflection に向けた refinement candidate である。
- この draft では v0.1 / Storyflow / Anti-sycophancy 文書を編集しない。
- 実際に何を吸収するかは、後続 SSOT reflection gate で判断する。

## 12. 実装に入る前の注意

本書は次を承認しない:

- app/code implementation
- prompt changes
- CSS/layout changes
- docs/ssot body reflection
- DB/API/payment/auth/webhook changes
- Stripe/Clerk/Supabase changes
- engine/snapshot/result-label changes
- checkout/payment changes
- entitlement changes
- wallet ledger changes
- product_id/route changes
- push/deploy
- Production mutation
- gender-based diagnosis branching
- 男性脳/女性脳 framing
- UI mode selector implementation
- consult reply prompt implementation

これらは後続 gate:

- SSOT reflection planning
- minimal implementation planning
- behavior/visual confirmation

## 13. 最終判定

- GREEN_AS_V0_2_REFINEMENT_REVISED_CANDIDATE
- docs/review の独立文書として扱うことを推奨
- implementation は未承認
- docs/ssot 本体反映は未承認
- 次 gate は review/commit planning（チェック通過時）
