# M55 Copy and Claims

Status: **Language authority (Tier D)**  
Machine prohibited list: `M55_PROHIBITED_CLAIMS` in `lib/m55/contracts/m55CommercialFunnelContract.ts`

## Allowed (preferred)

- 読み解く
- 自分に表れやすい
- 関係に表れやすい流れ
- 決めつけずに見る
- 一つの情報だけで、人を決めない

## Prohibited or limited

| Term / pattern | Rule |
|---|---|
| 相性鑑定 / 占い / 霊視 / 運命 | 禁止 |
| 相手の本音 / 未来予測 | 禁止 |
| 復縁できる / 結婚できる / 必ず改善する | 禁止 |
| 相性スコア / 合う・合わないの断定 | 禁止 |
| 気になる二人 / 親密な相手 | 中心商品語として禁止 |
| 10タイプ / 基本タイプ | 禁止 |
| 保存版 / 見取り図 | Legacy runtime debt — 記録のみ。今回 runtime から削除しない |

## 「読み返す」

購入後の再利用 **のみ**。購入前の商品価値には使わない。

## Legacy runtime debt

Current public copy still contains「保存版」「見取り図」:

- `lib/m55/topFreeEntryPublicCopy.ts`
- `lib/m55/paidDtrProductCopy.ts`
- `lib/m55/freeResult/questionnaireCopyV1.ts`

Resolution: next Self funnel implementation lane. Verifier deferred assertions apply.

## Related authorities

- `docs/ssot/M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md` — public surface ban patterns (audit gate)
- `lib/m55/analysisAuthorityReferenceModel.ts` — analysis positioning copy

Subordinate to this file for **commercial funnel** claim boundaries.
