# M55 Final Human Copy Review Packet v1

> 位置づけ: この文書は**レビュー用パケット**です。実装の正本ではありません。

## 1. この資料の使い方

- 各項目を次のいずれかで必ずマークしてください。
  `OK` / `柔らかくする` / `意味がわからない` / `仕事っぽい` / `もっと人間関係へ` / `削る` / `強める`
- あわせて懸念フラグを付けてください。
  `冷たい` / `抽象的` / `営業っぽい` / `決めつけが強い`
- 数値・上限・価格などのプロダクト方針値は、方針変更を意図する場合を除き、この資料上で変更しないでください。
- 迷う文言は「理由」より先に「体感（しっくり来る/来ない）」を記録してください。

## 2. Product truth guardrails

このパケットで必ず守る前提:

- 主名称: **本質の読み解き**
- 有料保存レポートの呼称: **保存版**
- レポート構成: **4章**
- 相談機能の主名称: **相談返書**
- 付属回数: **付属1**
- 追加回数: **追加最大4**
- 合計上限: **合計5**
- 追加料金: **500円**
- 保存版は**購入時点**のプロフィールに基づく
- 相談返書は購入済み保存版に紐づく
- **汎用チャットではない**
- **通知メール約束なし**
- **無制限相談なし**
- **なんでも答える約束なし**
- 治療・医療的な約束はしない
- このパケットで engine/snapshot/result-label を変更しない

## 3. Review checklist table（共通テンプレート）

| ID | 画面/flow | source file | current copy / identifier | user mark | concern flags | note | recommended handling | do not mix with |
|---|---|---|---|---|---|---|---|---|
| 例: REV-XXX | LP / Reader / My など | `path/to/file` | 短い抜粋 or 文言ID | OK など | 冷たい など | 人間レビュー所感 | include / defer など | v0/layout/engine/DB系 |

## 4. A. Free/core entry -> paid bridge

**主な対象**

- `app/dtr/core/page.tsx`
- `lib/m55/dtrReportBridgeCopy.ts`
- （必要に応じて）paid bridge が表示される関連文言

**レビュー観点**

- 抽象すぎないか
- 仕事寄りに偏りすぎていないか
- 保存版への遷移が自然か
- 読後に安心感があるか
- 運命断定に見えないか

## 5. B. LP / product explanation

**主な対象**

- `app/dtr/lp/page.tsx`
- `lib/m55/paidDtrProductCopy.ts`

**レビュー観点**

- 価値説明と導線の明瞭さ
- 日常/人間関係の語彙の自然さ
- 過剰約束がないか
- 旧真実（max3, 700円等）への逆戻りがないか
- 価格/上限の真実が維持されているか

## 6. C. Paid DTR reader / 保存版

**主な対象**

- `components/dtr/DtrFullReader.tsx`

**レビュー観点**

- 「そうそう」「わかってくれた」感があるか
- 仕事/役割語が優位になりすぎていないか
- 近い人・距離・疲れ・回復の生活語へ着地しているか
- result-label 正規化に踏み込んでいないか
- 購入時プロフィール固定の説明が伝わるか
- 運命断定に見えないか

## 7. D. 相談返書ルーム

**主な対象**

- `components/dtr/ConsultRoom.tsx`
- `components/reply/ConsultationRoomInput.tsx`
- `components/reply/consultation-ticket-wallet.tsx`
- `lib/m55/paidDtrProductCopy.ts`（該当文言）

**レビュー観点**

- 温かさと安全境界の両立
- 保存版に紐づく相談であることの明確さ
- 汎用チャット誤認を起こさないか
- 医療的約束に見える表現がないか
- visible 上で旧「返書チケット」主名称が出ていないか
- 送信時注意文のわかりやすさ

## 8. E. My page

**主な対象**

- `components/my/MyPanel.tsx`
- `components/dtr/DtrCatalogStrip.tsx`
- `lib/m55/dtrProductCatalog.ts`
- `lib/m55/dtrProductLabels.ts`

**レビュー観点**

- 次の行動が迷わず選べるか
- 購入時プロフィール注記が不安を煽らないか
- 相談返書ルーム導線が自然か
- `/my` の active 表示で Entry Report 主ラベルが混ざっていないか
- サポート/法務導線の文言が過不足ないか

## 9. F. Backlog risk appendix（非ブロッカー）

- `/my` 以外の public route での Entry Report 表記整合
- `/reply` 単独画面の追加目視確認（任意）
- 仕事/キャリア寄り語彙の段階的ソフト化
- comments/docs/compat constants に残る Entry Report/Premium/Blueprint は、active UI でなければ非ブロッカー
- 内部命名に残る 返書チケット語は、visible 主文言でなければ非ブロッカー
- v0/visual storytelling は後続
- snapshot v2 / legacy inventory は後続
- engine audit trail は後続
- notification/email architecture は後続

## 10. Risk inventory

| ID | screen/flow | source file | current copy or term | risk class | active visible | recommendation | blocks packet draft |
|---|---|---|---|---|---|---|---|
| RISK-P1-001 | LP tone | `app/dtr/lp/page.tsx` | 説明調が硬い箇所 | P1 human softening | yes | packetで重点レビュー | no |
| RISK-P1-002 | Paid reader wording | `components/dtr/DtrFullReader.tsx` | 仕事/役割語の比重 | P1 human softening | yes | packetで重点レビュー | no |
| RISK-P1-003 | Reply UI balance | `components/reply/ConsultationRoomInput.tsx`, `components/reply/consultation-ticket-wallet.tsx` | 温度感と境界の両立 | P1 human softening | yes | packetで重点レビュー | no |
| RISK-P1-004 | Public label consistency outside `/my` | `app/how-m55-works/*`, `app/support/page.tsx`, `app/purchase/success/*` | Entry Report表記混在 | P1 consistency | likely yes | appendixで整理（別実装波） | no |
| RISK-P2-001 | Style rhythm polish | multiple screens | 語尾・リズム調整 | P2 style polish | yes | 後段で実施 | no |
| RISK-DEFER-001 | Historical/internal labels | `docs/ssot/*` + compatibility constants | 旧語彙の履歴残存 | defer/technical | mostly no | 直近は非対応 | no |

## 11. Review note for the user

- このパケットは**実装指示ではありません**。
- 先に人間レビューで印を付け、優先度を決めます。
- その後は「方針反映（必要ならSSOT更新） -> 画面への最小反映」の順で進めます。
- このパケットでは、v0/layout/engine/API/payment/auth/email の実装作業は扱いません。
