# M55 SSOT Layered Holes-Filled Pack v1.0
FREEZE: 2026-01-31 (JST)

このZIPは「散在していた制限/保存/クールタイム」を Layer 1 の機械可読JSONへ統合し、
Layer 0（憲法）と Layer 1（契約）を分離して“推測実装”を物理的に封鎖します。

## 主要ファイル
- docs/M55_SSOT_LAYERED_INTEGRATION_v1_0.md : 2層モデルの説明と統合ルール
- policies/m55_entitlements_v1_0.json       : プラン別制限・価格・保存期間（唯一の正）
- policies/m55_dtr_cooldowns_v1_0.json      : 週/月のperiod_key と DTR/利用のクールタイム
- policies/m55_retention_v1_0.json          : ログ/DTRの保存・失効ルール
- docs/M55_2GPT_PROMPTS.md                  : Builder/Auditor のコピペ用プロンプト

## 使い方（最短）
1) 新スレッド（Builder）へ docs/M55_2GPT_PROMPTS.md のGPT-Aを貼る
2) Builder出力を貼って別スレッド（Auditor）へGPT-Bを貼る
3) PASSしたら統合完了
