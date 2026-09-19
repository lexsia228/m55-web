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

## Self Premium three-layer Product Truth (2026-09-19)

Governed commercial surfaces must not imply that Premium is **生年月日 + 6問 only**,
or that the six Premium questions determine personality, 十干, or current expression.

Frozen three-layer model:

- **Layer 1 — Birth / calendar foundation.** Public Self input is nickname + birth date.
  Birth date contributes a calendar-derived foundation. Layer 1 is not the Free result
  as a whole.
- **Layer 2 — Free 5 current expression.** The five Free answers show how the foundation
  is appearing now, including overlap / difference. The Free result combines L1 + L2.
- **Layer 3 — Premium 6 emphasis.** The six Premium questions determine what the paid
  report emphasizes (chapter / topic focus, paidDepth / related routing). They do not
  become “current expression”.

Commercial copy stays natural. Exact DOB / Free-5 / Premium-6 taxonomy and 十干 detail
belong in Method / FAQ, not as a mechanical formula on every commercial surface and
not in the LP hero.

Prohibited public claims: named-school fusion (四柱推命 / 算命学 / 九星 / 紫微 / 宿曜 /
Western astrology), 十二支 or 60干支 as current M55 calculation, scientific or
high-accuracy implication, psychological diagnosis, destiny / future prediction,
public birth-time / place natal-chart claim.

Pre-purchase answer review may name chapter and topic/axis emphasis only. It must
not render paid paragraph text, handling instructions, concrete next actions, or
`PAID_CHAPTER_EMPHASIS_COPY_V1` / `PAID_CHAPTER_EMPHASIS_EXPLANATION_V1` substance.

Prohibited purchased-report wording (public):

- 「購入時の版のまま読み返せます」
- 「購入時の内容をそのまま読み返せます」
- 「購入時点の内容のまま変わりません」

as if they promised literal body freeze for `stored_v2`.

Truthful direction: purchase-time **inputs** remain the basis; later profile edits do
not silently replace those inputs. This is not an immutable-body, immutable-wording,
or byte-freeze claim. Displayed wording may be updated as current catalog/product
wording is normalized.

## Terminology remediation wave (WT-018)

Terminology-only corrections across completed commercial surfaces do **not** reopen their functional lanes (HOME foundation, IND-FREE closure, Legal/support process semantics).

Broader free/paid **result-copy quality** work remains a later wave (`M55-FREE-PAID-RESULT-COPY-QUALITY-ASSET-MAPPING`).

## Related authorities

- `docs/ssot/M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md` — public surface ban patterns (audit gate)
- `lib/m55/analysisAuthorityReferenceModel.ts` — analysis positioning copy

Subordinate to this file for **commercial funnel** claim boundaries.
