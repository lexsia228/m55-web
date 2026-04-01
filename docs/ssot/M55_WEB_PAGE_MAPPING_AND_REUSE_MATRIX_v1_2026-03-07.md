# M55 Web Page Mapping and Reuse Matrix v1 (2026-03-07)

Status: SSOT
Scope: Web M55 のページマッピング・再利用マトリクス

## 参照元 (Sources)

本 SSOT は以下の Step5 遺物を参照元とする（2026-03-07 ingest）:

- `docs/audit/sources/ingest_2026-03-07/M55_BottomNav_OriginalGlyph_Icon_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_Home_Image_Policy_SSOT_v1_2026-01-26.html`
- `docs/audit/sources/ingest_2026-03-07/M55_PrimeRanking_NoRankUI_SSOT_v1_2026-01-26.html`

## 1. ルートマッピング

| ルート | 用途 | 凍結 |
|--------|------|------|
| / | ホーム | 凍結 |
| /dtr/lp | DTR LP | 凍結 |
| /support | サポート | 凍結 |
| /legal/* | 法務 | 凍結 |
| /prototype/* | 隔離 Hub | token-gated |
| /meter | メーター | — |
| /tarot | タロット | — |
| /ai-chat | AI チャット | — |
| /my | マイページ | — |

## 2. Bottom Nav タブ対応

| タブ | アイコン | 遷移先 |
|------|----------|--------|
| Home | ic_home.svg | / |
| Tarot | ic_tarot.svg | /tarot |
| Chat | ic_chat.svg | /ai-chat |
| Prime | ic_prime.svg | Prime 導線（No-Rank UI） |
| My | ic_my.svg | /my |

## 3. 上位 SSOT

- `M55_WEB_UI_ARCHITECTURE_SSOT_v1_2026-03-07.md` — 構造
- `M55_SYSTEM_SSOT.md` — 公開ページ凍結
