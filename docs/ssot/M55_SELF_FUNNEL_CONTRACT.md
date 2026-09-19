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

Recorded in machine contract `M55_CURRENT_RUNTIME_STATE.selfFree` on **`origin/main`** @ PR #90 merge `ac71d054556ebec06d6fa107fbe359a88052aca6`:

- `preResultThemeSelection: false` — current machine contract, current target contract, and current tests all record **false**; UI has no pre-result theme-selection step
- public copy の「見取り図」は free-tier / Pair standalone 比喩として **現行許容**（全面置換は別 wave）
- 「保存版」は **INTERNAL_ONLY** — 公開 UI・metadata・aria・Legal・Support・購入後表示は Premium 系正式表記のみ；`premiumPublicTerminologyGuard` + stored snapshot display normalizer が境界を強制
- 無料結果から「今日の一歩」等の行動提案は target では除去；merged runtime debt は machine contract / deferred assertions を参照

**Documentation correction (2026-08-06):** prior text in this file incorrectly stated `preResultThemeSelection: true` for merged runtime. That was stale documentation only — **not** a runtime change request. Evidence: `lib/m55/contracts/m55CommercialFunnelContract.ts` (`M55_CURRENT_RUNTIME_STATE.selfFree.preResultThemeSelection: false`, `M55_TARGET_COMMERCIAL_CONTRACT.selfFree.preResultThemeSelection: false`), `lib/m55/contracts/m55CommercialFunnelContract.test.ts`, and absence of a pre-result theme-selection UI step.

**Terminology enforcement:** `no_public_hozonban_copy` は **CLOSED_GREEN**（machine contract `M55_ENFORCED_RUNTIME_ASSERTIONS`）。本変更は完了済み functional lane を再開しない。

## Target contract (normative)

- 結果前「今の関心」step は **廃止**（DOB + 中核5問で無料結果へ）
- `preResultThemeSelection: false`
- engine 互換のため内部 default theme を付与（UI では選択しない）

## Branch-local implementation (outside PR #78)

Self funnel runtime source on WT-001 remains **uncommitted** and is **not** part of PR #78.

- `preResultThemeSelection=false` is already merged runtime on `origin/main` — not a pending branch-local delta for this field
- inherits `USER_VISIBLE_CLOSED_GREEN` from `M55_COMMERCIAL_QUALITY_CONTRACT.md`
- other runtime enforcement deferred to later Self funnel implementation commits / reviews where applicable

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

## Commercial desire binding (2026-09-18)

Canonical owner: `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` §「Commercial desire and paid-worthiness」

## Commercial delight binding (2026-09-19)

Canonical owner: `docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md` §「Commercial delight and discovery standard」

- All Self user-visible commercial content inherits the **Global Commercial Delight Standard**.
- Delight / discovery / anticipation requirements apply to intro, questions, answer options, progress, transitions, Free result, Premium bridge, answer review, plan, CTA, paid report, and revisit — not questions alone.
- Product Truth, safety, and non-diagnostic constraints remain superior.

## Commercial desire binding detail (2026-09-18)

- Self primary commercial desire is **「自分をもっと知りたい」**.
- **Free owns recognition** — 何が起きやすいか / 反応・傾向 / 自分では言葉にしづらかった輪郭.
- **Paid owns supported deeper value** — なぜ・条件・力が出る場面・迷いと摩擦・疲れ・戻り方・再開条件・次の小さな一手, only where Product Truth supports it.
- Detailed paid-worthiness rules, question design standard, promise continuity, market evidence filter, and report change classes **A–E** live in `M55_COMMERCIAL_FUNNEL_SSOT.md`. Do not duplicate them here.
