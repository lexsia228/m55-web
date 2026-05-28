# M55 Consult Reply Anti-Sycophancy Safety Audit v1

## 1. 目的

- 相談返書がユーザーを無条件肯定しすぎないようにする。
- 自己正当化を助長しない返書方針を明確にする。
- ただし冷たく疑うAIにはしない。
- M55の温かさ、保存版接続、生活語を維持する。
- 本文書は実装指示ではなく、安全監査メモである。

## 2. 監査対象

- `app/api/room/core/send/route.ts`
- `app/api/reply/generate/route.ts`
- `lib/m55/ai/m55AiSafetyPolicy.ts`
- `lib/m55/ai/m55AiOutputSanitizer.ts`
- `lib/m55/reply/stubReplyGenerator.ts`
- `components/dtr/ConsultRoom.tsx`
- `components/reply/ConsultationRoomInput.tsx`
- `components/reply/consultation-ticket-wallet.tsx`
- `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md`

## 3. 現状診断

- **unconditional validation risk: medium**
  - 現在の相談promptは穏やかな受け止めを促しているが、「無条件肯定を避ける」明示が弱い。
- **self-justification risk: medium**
  - 返書が一方向の共感で終わると、自己正当化だけが強まる余地がある。
- **other-perspective absence risk: high**
  - 対立/関係テーマで、相手側または状況側の見え方を最低1つ置く要件が未明示。
- **therapy/medical overreach risk: low**
  - 医療・法律・投資領域は安全ポリシーで拒否が設計されている。
- **generic chat risk: low-medium**
  - 相談返書のスコープ制約はあるが、出力構成上のガードが弱いと汎用会話寄りになる余地がある。
- **product truth risk: low**
  - 保存版接続、相談返書境界、回数仕様の真実は維持されている。

## 4. M55で守る安全方針

- 感情は受け止める。
- ただし正誤判定はしない。
- ユーザーを常に正しいとは扱わない。
- 相手を悪者にしない。
- 保存版の該当章へ接続する。
- 対立/関係テーマでは、相手側または状況側の見え方を最低1つ置く。
- ずれは「言葉・距離・タイミング・疲労・期待」で整理する。
- 最後は小さな一手にする。

## 5. 禁止する返書の型

- 「あなたは悪くない」で終わる。
- 「相手が悪い」と断定する。
- 別れろ/辞めろ/絶対に距離を置け等の絶対助言。
- 医療/治療/法律/投資判断の代替。
- 汎用チャット化。
- なんでも答える含意。
- 無制限相談含意。
- 通知/メール約束。
- ユーザーの自己正当化を綺麗に補強するだけの返書。

## 6. 推奨する返書構造

1. 受け止め
- 感情や疲れを認める。
- ただし「あなたが正しい」とは言わない。

2. 保存版との接続
- 4章のどこに関係するかを示す。

3. 別視点
- 相手側または状況側から見える可能性を1つ置く。
- 非断罪で書く。

4. ずれの整理
- 言葉 / 距離 / タイミング / 疲労 / 期待

5. 小さな一手
- 1つだけ
- 1行だけ
- 今の場面だけ

## 7. M55-safe wording examples

- NG:
  - 「あなたは悪くありません。相手が分かってくれないだけです。」
- OK:
  - 「その場で疲れたこと自体は自然です。ただ、相手から見ると“急に距離ができた”ように見えていた可能性もあります。ここでは、どちらが正しいかより、どこで言葉が足りなくなったかを整理します。」

- NG:
  - 「もう関わらない方がいいです。」
- OK:
  - 「すぐに結論を出すより、次に同じ場面が来たときに“少し整理してから返す”と短く置くのが安全です。」

## 8. Product truth guardrails

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
- 通知メール約束なし
- 無制限相談なし
- なんでも答える約束なし
- 医療・治療の約束なし

## 9. 次に実装へ進む場合の前提

- この文書を先にレビューする。
- 次に implementation planning を行う。
- 実装する場合も、prompt/code変更は最小差分にする。
- DB/API/payment/auth/env/webhook は触らない。
- visual/動作確認は別ゲートで扱う。
