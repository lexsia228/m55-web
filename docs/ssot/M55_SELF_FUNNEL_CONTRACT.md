# M55 Self Funnel Contract

Status: **Target contract (Tier C)**
Machine truth: `lib/m55/contracts/m55CommercialFunnelContract.ts`
Global closure standard: `docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md` (Tier B+ — mandatory before user-visible review)

## User-visible closure (global)

Self funnel user-visible surfaces must satisfy `USER_VISIBLE_CLOSED_GREEN` in `M55_COMMERCIAL_QUALITY_CONTRACT.md`:

- implementation validation GREEN
- Product Truth and safety GREEN
- actual diff review GREEN
- local or Preview actual-screen evidence (320 / 390 / desktop where applicable)
- Human commercial-quality approval
- no unresolved material comprehension or conversion defect

Agent self-report alone does not satisfy Human visual approval.

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

## Merged runtime (origin/main)

Recorded in machine contract `M55_CURRENT_RUNTIME_STATE.selfFree` on **`origin/main`**:

- `preResultThemeSelection: true` — legacy debt（結果前「今の関心」step still recorded as current merged runtime）
- public copy の「見取り図」「保存版」legacy 語は **一部残存**（HOME / legal 等）
- 無料結果から「今日の一歩」等の行動提案は target では除去；merged runtime debt は machine contract / deferred assertions を参照

**Enforcement:** `PENDING_SELF_FUNNEL_IMPLEMENTATION` — residual legacy public terms remain deferred until full public-surface cleanup.

## Target contract (normative)

- 結果前「今の関心」step は **廃止**（DOB + 中核5問で無料結果へ）
- `preResultThemeSelection: false`
- engine 互換のため内部 default theme を付与（UI では選択しない）

## Branch-local implementation (outside PR #78)

Self funnel runtime source on WT-001 remains **uncommitted** and is **not** part of PR #78.

- owns `preResultThemeSelection=false` implementation and verification
- inherits `USER_VISIBLE_CLOSED_GREEN` from `M55_COMMERCIAL_QUALITY_CONTRACT.md`
- runtime enforcement deferred to a later Self funnel implementation commit / review

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
