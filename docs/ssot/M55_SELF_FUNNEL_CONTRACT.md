# M55 Self Funnel Contract

Status: **Target contract (Tier C)**  
Machine truth: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Target flow

```
HOME
  → 生年月日
  → 中核質問
  → theme selection なし
  → 個人無料結果
  → Premium 価値
  → ライト / フル
  → 購入
  → 追加 theme
```

## Current runtime (NOT target)

Recorded in machine contract `M55_CURRENT_RUNTIME_STATE.selfFree`:

- 「今の関心」step が **存在する** (`lib/m55/freeResult/questionnaireCopyV1.ts`)
- 結果前 theme selection が **ある**
- public copy に「見取り図」「保存版」legacy 語が残る
- 無料結果内に行動提案が含まれる経路がある

**Enforcement:** `PENDING_SELF_FUNNEL_IMPLEMENTATION` — do not assert these are fixed until the Self funnel implementation lane merges.

## Free result center (target)

**含める:**

- 今の自分に出やすい反応
- 考え、動き始める順番
- 人と関わるときの距離
- 負担が表れ始めるサイン
- 表れやすい資質

**含めない:**

- 相手へどう対応するか
- 詳細な解決策
- 仕事 / 恋愛等の theme 深掘り
- 有料追加読み解き相当本文
- 4章相当の背景・構造・扱い方

## Identifiability criteria

- 反対方向の人物像に同じ文章を返さない
- 誰にでも当てはまる褒め言葉を中心にしない
- DOB＋回答の違いで冒頭から文章が変わる
- 強みと負担が同じ特徴から自然につながる
- 断定せず「〜しやすい」「場面では表れやすい」を使う

## Contrast axes

| Axis |
|---|
| 慎重 ↔ 即応 |
| 内向 ↔ 表出 |
| 計画 ↔ 適応 |
| 距離を保つ ↔ 早く近づく |
| 一人で回復 ↔ 人との関わりで回復 |

## Re-run target

- 同じ DOB ＋ 同じ回答 = 同じ正規結果
- 回答変更 = 結果更新
- 無料結果を無制限に増殖させない
- 再訪時は最新結果へ
- 明示的な回答見直しを許可

## Premium boundary

Premium theme 選択は **購入後**。結果前 theme selection は target では廃止。
