# M55 Commercial Funnel SSOT

Status: **Human authority (Tier B)**  
Machine product facts: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Top principles

1. **個人無料は、解決策を先に渡す場所ではない。**
2. **M55が自分を理解していると実感してもらう場所。**
3. **個人無料はM55全体への信用証明** — 個人PremiumだけでなくPair利用の信頼にも接続する。

## Free vs paid boundary

| Layer | User receives |
|---|---|
| **FREE** | 自分に何が起きやすいかを理解する |
| **PAID** | なぜ起きるか、どの条件で起きるか、どう扱えるかを理解する |

## User psychology (canonical funnel)

```
自分に近い
  → 自分では言葉にできなかったが納得できる
  → なぜそうなるか知りたい
  → 条件・構造・扱い方を知りたい
  → 購入
```

## Prohibited funnel pattern

**禁止:** 結果前にユーザー自身へ結果テーマを選ばせる → 選択内容に沿った文章を返す → M55が本人を理解したように見せる。

**理由:** ユーザーが結果を自分で誘導したと感じ、M55の認識精度・信頼を証明できない。

Current runtime still contains the「今の関心」step — recorded as **legacy debt**, not target behavior. See `M55_SELF_FUNNEL_CONTRACT.md`.

## Self and Pair roles

| Surface | Role |
|---|---|
| Self free | 認識・信頼の証明 |
| Self premium | 背景・条件・構造・扱い方 |
| Pair free | 二人の間に今表れやすい流れの入口 |
| Pair premium | 深い関係読み解き（**NOT_LIVE** — repo authority only） |

## References

- Self flow: `M55_SELF_FUNNEL_CONTRACT.md`
- Pair flow: `M55_PAIR_FUNNEL_CONTRACT.md`
- Copy: `M55_COPY_AND_CLAIMS.md`
- Visual: `M55_VISUAL_SYSTEM.md`
