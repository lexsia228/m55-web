# M55 Copy and Claims

Status: **Language authority (Tier D)**  
Machine prohibited list: `M55_PROHIBITED_CLAIMS` in `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Allowed (preferred)

- 読み解く
- 自分に表れやすい
- 関係に表れやすい流れ
- 決めつけずに見る
- 一つの情報だけで、人を決めない
- **プレミアムレポート**（generic paid product term）
- **M55 プレミアムレポート ライト** / **M55 プレミアムレポート フル**（formal variant names）
- **追加読み解き**

## Prohibited or limited

| Term / pattern | Rule |
|---|---|
| 相性鑑定 / 占い / 霊視 / 運命 | 禁止 |
| 相手の本音 / 未来予測 | 禁止 |
| 復縁できる / 結婚できる / 必ず改善する | 禁止 |
| 相性スコア / 合う・合わないの断定 | 禁止 |
| 気になる二人 / 親密な相手 | 中心商品語として禁止 |
| 10タイプ / 基本タイプ | 禁止 |
| **保存版** / **保存版ライト** / **保存版FULL** / **保存版レポート** | **PUBLIC_PROHIBITED — INTERNAL_ONLY**（公開 UI・Legal・Support・metadata・aria・購入後画面で使用しない） |
| 見取り図（free tier） | 現行 runtime では無料面比喩として許容。全面置換は別 wave |

## 「読み返す」

購入後の再利用 **のみ**。購入前の商品価値には使わない。

## Internal-only terminology

「保存版」は内部互換・consult prompt 節見出し・legacy snapshot 正規化の入力としてのみ記録する。公開商品名として使用しない。

Machine registry: `M55_LEGACY_RUNTIME_DEBT.internalOnlyTerms` in `lib/m55/contracts/m55CommercialFunnelContract.ts`.

Stored snapshot bodies are normalized at **display time** only (`lib/m55/paidReportPublicDisplayTerminology.ts`); DB rows and schema are unchanged.

## Terminology remediation wave (WT-018)

Terminology-only corrections across completed commercial surfaces do **not** reopen their functional lanes (HOME foundation, IND-FREE closure, Legal/support process semantics).

Broader free/paid **result-copy quality** work remains a later wave (`M55-FREE-PAID-RESULT-COPY-QUALITY-ASSET-MAPPING`).

## Related authorities

- `docs/ssot/M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md` — public surface ban patterns (audit gate)
- `lib/m55/analysisAuthorityReferenceModel.ts` — analysis positioning copy

Subordinate to this file for **commercial funnel** claim boundaries.
