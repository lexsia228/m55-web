# Ingest 2026-03-05: Topic Index

どのトピックがどの資料にあるかを示す索引。

## Prototype 隔離（/prototype Hub）

| トピック | 資料 | 備考 |
|----------|------|------|
| 三層ゲート（A/B/C）・ステータスコード解読 | docs/audit/M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md | **最上位 SSOT** |
| 運用マスター・正史としての活用 | docs/audit/M55_Prototype_Gate_Master_Usage_2026-03-05.md | |
| 実装コード（middleware/layout/page） | ローカル: M55_PROTOTYPE_ISOLATION_BUNDLE_2026-03-04 | repo 非収録（アプリコード） |
| キャッシュ無効化（dynamic/revalidate） | Postmortem セクション 6.3 | /prototype のみに適用 |

## Phase2 移行（Web 移植・Gate R）

| トピック | 資料 | 備考 |
|----------|------|------|
| 統合開発 SSOT（憲法階層・Sensory・Bridge・Tarot） | docs/ssot/M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md | 2026-03-03 版 |
| Gate R 監査チェックリスト | docs/audit/M55_AUDIT_CHECKLIST_FINAL.md | 35 項目 |
| Cursor 実行手順・分岐操作 | docs/audit/M55_IMPLEMENTATION_COMMANDS_FOR_CURSOR.md | PowerShell 含む |
| 保存・リネームガイド | MANIFEST 本資料内参照 | RENAME_AND_SAVE_GUIDE.txt 原本 |

## Review 後 UI 切替

| トピック | 資料 | 備考 |
|----------|------|------|
| Phase 0/1/2 移行戦略・Go/No-Go | docs/ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md | |
| 禁止語彙・価格・返金・サポート導線 | 上記 + M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT | |

## 優先順位ルール

1. **2026-03-05** Prototype Gate Postmortem が最上位。/prototype 関連はこれに従う。
2. 2026-03-03 Phase2 SSOT は補完（Gate R・Sensory・Bridge）。矛盾時は 2026-03-05 を優先。
3. 古い資料で上書き禁止。差分は History/Appendix として追記するのみ。
