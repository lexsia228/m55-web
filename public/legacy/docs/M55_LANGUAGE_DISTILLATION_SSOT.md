# M55 Language Distillation SSOT
**Authority:** Constitution Level-0
**Status:** Frozen / Non-negotiable

## Core Principle
Language must not steal attention or decide for the user. No imperatives, no optimization language, no prophecy-style certainty.

## Forbidden Expressions (examples)
- 命令: 「〜しろ」「〜せよ」「すべき」「必ず」
- 最適化: 「改善」「正解」「最適」「成功」「勝ち」「伸ばす」
- 煽り: 「今だけ」「急げ」「損」「ランキング」「人気」
- 医療/診断断言: 「治る」「診断」「確定」

## Allowed Style (examples)
- 余白: 「…」「静かに」「少し」
- 受動: 「現れやすい」「揺らぎやすい」「傾きやすい」
- 非断定: 「〜のようです」「〜かもしれません」

## RED Safety Fixed Text
When Safety=RED is triggered, LLM must be physically skipped and replaced with:
> 今は、言葉を介さない静寂が必要な時間のようです。少し、深呼吸をしてみませんか？

## Data Rendering Guard
If logic data contains imperative endings (e.g., 「せよ」「すると良い」), UI must apply a render-time distillation filter:
- Remove direct commands.
- Rephrase into observational, non-imperative form.
- Or omit the advice field entirely when safe rephrase is not deterministic.
