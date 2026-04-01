# M55 Web Behavioral and Data Binding Contract SSOT v1 (2026-03-07)

Status: SSOT
Scope: Web M55 の振る舞い・データバインディング契約

## 参照元 (Sources)

本 SSOT は以下の Step5 遺物を参照元とする（2026-03-07 ingest）:

- `docs/audit/sources/ingest_2026-03-07/M55_BottomNav_OriginalGlyph_Icon_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_Home_Image_Policy_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_PrimeRanking_NoRankUI_SSOT_v1_2026-01-26.html`

## 1. Bottom Nav 振る舞い

- タップ/クリックで該当ルートへ遷移
- アクティブ状態の視覚表現は Original Glyph ベース（絵文字は使用しない）
- 資産: `public/assets/nav/` の SVG

## 2. Home 画像ロード

- 画像ポリシーに従ったロード・フォールバック
- 参照: M55_Home_Image_Policy_SSOT

## 3. Prime / Ranking 振る舞い

- ランキング UI（順位・スコア表示）は表示しない（No-Rank）
- Prime 導線は価値提示に留め、煽り・誤解を招く表現を避ける

## 4. データバインディング原則

- 購入状態 SSOT: DB / PurchaseCache（クライアント永続状態を SSOT にしない）
- URL 文脈注入禁止
- 権利判定: entitlement API を信頼し、クライアント単独判定に依存しない

## 5. 上位 SSOT

- `M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md` — 権利・状態
- `M55_SYSTEM_SSOT.md` — Gate R・禁止事項
