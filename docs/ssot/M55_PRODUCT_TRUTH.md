# M55 Product Truth

Status: **Human-readable product truth (references machine contract)**  
Primary authority for verifiable facts: `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Self Premium — verified live products

| Product | Public name (SSOT) | Price | Chapters | Additional themes |
|---|---|---|---|---|
| Light | M55 プレミアムレポート ライト | ¥1,000（税込） | 4（同一レポート） | 1（追加読み解き1件） |
| Full | M55 プレミアムレポート フル | ¥1,480（税込） | 4（同一レポート） | 5（追加読み解き合計5件） |

- 買い切り / 自動更新なし
- 購入・閲覧はログイン必要
- レポート本体の品質・長さに差があると記載しない

### Plan fit (copy-safe)

| Plan | Fit |
|---|---|
| Light | 全体像＋最も気になる一つ |
| Full | 複数の関心をまとめて深める |

### Four chapters (identical report body)

1. Ⅰ 輪郭を見る
2. Ⅱ 構造を読む
3. Ⅲ 無理を知る
4. Ⅳ 楽に扱う

Runtime product keys: `dtr_core_light_v1`, `dtr_core_full_v1`  
Runtime legacy names still present: 保存版ライト, 保存版FULL (`paidDtrProductCopy.ts`) — **legacy debt**, target public names above.

## Self free

- Status: LIVE, login 不要
- Purpose: RECOGNITION_AND_TRUST
- Current runtime gap: 結果前「今の関心」step — see `M55_SELF_FUNNEL_CONTRACT.md`

## Pair free

- Status: LIVE_PUBLIC at `/synastry`
- Public name: 2人の距離の読み解き
- 二人分 DOB、ユーザー本人が回答

## Pair premium

- Status: **NOT_LIVE**
- Repo authority: `compatibility_report_full_v1`, ¥1,480, 二人の相性レポート
- Sandbox / env-gated only — not production E2E complete
- HOME paid CTA: false

## Superseded references

| Document | Note |
|---|---|
| `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` | DTR wallet era; Self Premium prices defer to machine contract |
| `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` | Planning draft; superseded by this file for funnel handoff |
