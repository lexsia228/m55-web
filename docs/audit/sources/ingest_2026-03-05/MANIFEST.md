# Ingest 2026-03-05: Local Bundle Manifest

Created: 2026-03-05
Source: C:\Users\x_ren\Downloads (Windows local)

## 1. M55_PROTOTYPE_ISOLATION_BUNDLE_2026-03-04
- **Path**: `C:\Users\x_ren\Downloads\M55_PROTOTYPE_ISOLATION_BUNDLE_2026-03-04`
- **Contents**: middleware.ts (829B), app/prototype/layout.tsx (13423B), app/prototype/page.tsx (10963B)
- **Type**: Application code (TS/TSX)
- **収録**: しない（変更対象は docs/ と .cursorrules のみ。アプリコードは参照のみ）
- **要約**: /prototype 隔離用 middleware・layout・page。実装時は本バンドルを一時展開して所定位置へ配置する。repo には含めない。
- **機密チェック**: OK（コード内に秘密値の記述なし。token は env 参照のみ）

## 2. M55_PHASE2_TRANSITION_PACK_2026-03-03
- **Path**: `C:\Users\x_ren\Downloads\M55_PHASE2_TRANSITION_PACK_2026-03-03`
- **Contents**:
  - M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md (7469B)
  - M55_AUDIT_CHECKLIST_FINAL.md (3477B)
  - M55_IMPLEMENTATION_COMMANDS_FOR_CURSOR.md (5056B)
  - RENAME_AND_SAVE_GUIDE.txt (1574B)
- **Type**: Markdown / Text
- **収録**: docs/ssot/ に SSOT を追加。docs/audit/ に checklist・commands を追加。sources に RENAME_AND_SAVE_GUIDE を参照として記録。
- **要約**: Phase2 Web 移植＋Gate R 防衛の統合憲法・監査チェックリスト・Cursor 実行手順。2026-03-03 版。2026-03-05 Prototype Gate 正史の「下位」として参照。
- **機密チェック**: OK（秘密鍵名の例示のみ。値は含まない）

## 3. POST_REVIEW_UI_SWITCH_SSOT_v1_bundle
- **Path**: `C:\Users\x_ren\Downloads\POST_REVIEW_UI_SWITCH_SSOT_v1_bundle`
- **Contents**: POST_REVIEW_UI_SWITCH_SSOT_v1.md (3227B)
- **Type**: Markdown
- **収録**: docs/ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md（既存と同一。機密除去注記を付与）
- **要約**: Stripe 審査通過後の UI 段階移行戦略。Phase 0/1/2 と Go/No-Go 判定。
- **機密チェック**: OK

## 4. POST_REVIEW_UI_SWITCH_SSOT_v1.md（単体）
- **Path**: `C:\Users\x_ren\Downloads\POST_REVIEW_UI_SWITCH_SSOT_v1.md`
- **Size**: 3227B
- **収録**: bundle と同一。docs/ssot/ に統合済み。
- **機密チェック**: OK

## 5. M55_Prototype_Gate_Postmortem_2026-03-05_v1.0
- **Path**: `C:\Users\x_ren\Downloads\M55_Prototype_Gate_Postmortem_2026-03-05_v1.0`
- **Contents**: M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md (9667B), .pdf (13504B), .docx (41736B), README.txt (327B)
- **Type**: Markdown（テキスト）, PDF/DOCX（バイナリ・コミット禁止）
- **収録**: .md は docs/audit/ に既に正史として存在。本次 ingest では追加変更なし（凍結保持）。
- **要約**: 隔離 Hub 事後分析・三層ゲート・ステータスコード解読・運用資産。最上位 SSOT。
- **機密チェック**: OK（README に "Contains NO secrets" 明記済み）
