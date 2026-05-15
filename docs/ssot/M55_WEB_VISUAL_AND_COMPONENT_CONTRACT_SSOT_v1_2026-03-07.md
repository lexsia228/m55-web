# M55 Web Visual and Component Contract SSOT v1 (2026-03-07)

Status: SSOT
Scope: Web M55 のビジュアル・コンポーネント契約

## 参照元 (Sources)

本 SSOT は以下の Step5 遺物を参照元とする（2026-03-07 ingest）:

- `docs/audit/sources/ingest_2026-03-07/M55_BottomNav_OriginalGlyph_Icon_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_Home_Image_Policy_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_PrimeRanking_NoRankUI_SSOT_v1_2026-01-26.html`

## 1. Bottom Nav アイコン契約

- 配置: `public/assets/nav/`
- ファイル: ic_home.svg, ic_tarot.svg, ic_chat.svg, ic_prime.svg, ic_my.svg
- 形式: SVG（Original Glyph）。絵文字は使用しない。

## 2. Home 画像ポリシー

- ホーム画面の画像表示・配置・フォールバックは Home Image Policy SSOT に従う
- 参照: ingest_2026-03-07/M55_Home_Image_Policy_SSOT_v1_2026-01-26.html

## 3. Prime / Ranking UI

- Prime 関連 UI ではランキング表示（順位・スコア等）を行わない（No-Rank UI）
- 参照: ingest_2026-03-07/M55_PrimeRanking_NoRankUI_SSOT_v1_2026-01-26.html

## 4. 上位 SSOT

- `M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md` — Sensory / 演出制約
- `M55_SYSTEM_SSOT.md` — 禁止語彙・背景 NoTouch
- `M55_VISUAL_TOKEN_SPEC_v1.md` — 色・タイポ・CTA 階層・ページ内サーフェス幅の正本（2026-03-30）
