# M55 Web UI Architecture SSOT v1 (2026-03-07)

Status: SSOT
Scope: Web M55 の UI アーキテクチャ・構造

## 参照元 (Sources)

本 SSOT は以下の Step5 遺物を参照元とする（2026-03-07 ingest）:

- `docs/audit/sources/ingest_2026-03-07/M55_BottomNav_OriginalGlyph_Icon_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_Home_Image_Policy_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_PrimeRanking_NoRankUI_SSOT_v1_2026-01-26.html`

## 1. Bottom Nav 構造

- 5 タブ: Home / Tarot / Chat / Prime / My
- アイコン資産: `public/assets/nav/` (ic_home.svg, ic_tarot.svg, ic_chat.svg, ic_prime.svg, ic_my.svg)
- 絵文字ナビは実装資産として残さない（Original Glyph を採用）

## 2. ページ階層

- 公開凍結: / , /dtr/lp , /support , /legal/*
- 隔離: /prototype/* (token-gated)
- アプリ内: /meter , /tarot , /ai-chat , /my 等

## 3. 上位 SSOT

- `M55_SYSTEM_SSOT.md` — 全体方針
- `M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md` — Phase2 憲法
- `M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md` — /prototype 隔離
