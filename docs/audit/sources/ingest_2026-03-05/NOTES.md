# Ingest 2026-03-05: SSOT 矛盾・採用/不採用判断

## 採用した資料

| 資料 | 配置先 | 理由 |
|------|--------|------|
| POST_REVIEW_UI_SWITCH_SSOT_v1.md | docs/ssot/（既存を保持） | 審査後 UI 移行の SSOT。機密なし。先頭に ingest 確認注記を付与。 |
| M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03.md | docs/ssot/（新規） | Phase2 Web 移植の統合憲法。Gate R・Sensory・Bridge・Tarot の階層。2026-03-05 と矛盾せず補完。 |
| M55_AUDIT_CHECKLIST_FINAL.md | docs/audit/（新規） | Gate R 機械チェック 35 項目。緊急復旧時の検証に必須。 |
| M55_IMPLEMENTATION_COMMANDS_FOR_CURSOR.md | docs/audit/（新規） | Cursor への実行手順。分岐操作・Gate R パスガード・禁止語彙スキャン等。 |
| RENAME_AND_SAVE_GUIDE.txt | sources 内 MANIFEST で参照のみ | 保存先・証跡位置のガイド。本文は repo に含めず、原本パスを MANIFEST に記録。 |

## 不採用・参照のみ

| 資料 | 判断 | 理由 |
|------|------|------|
| M55_PROTOTYPE_ISOLATION_BUNDLE（middleware/layout/page） | 収録しない | アプリコード。変更対象は docs/ と .cursorrules のみ。実装時はローカルから一時展開して配置。 |
| Postmortem PDF / DOCX | 収録しない | バイナリ。ZIP/巨大バイナリは原則コミット禁止。MANIFEST に記録のみ。 |
| Postmortem .md | 既存を保持（追加変更なし） | docs/audit/ に既に正史として存在。凍結を守る。 |

## SSOT との整合性

- **2026-03-05 Prototype Gate** が最上位。URL 文脈注入禁止・ヘッダーのみ・Fail-Closed は不変。
- **Phase2 SSOT (2026-03-03)** は Gate R 凍結・Sensory・購入 SSOT 等を規定。/prototype 固有の記述はない。矛盾なし。
- **POST_REVIEW_UI_SWITCH_SSOT** は Phase 0/1/2 の移行戦略。/prototype 配置は Phase 1 と整合。

## 機密混入チェック結果

- 全テキストを簡易スキャン済み（sk_live_/pk_/token値/20文字以上の認証ヘッダ値等）。
- ヒット箇所は全て **変数名の例示**（CLERK_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY）または **置換指示**（「sk_live_... に差し替え」）のみ。**実際の値は含まない。**
- トークン値・鍵・個人情報の記述なし。**OK**。
- チェック日時: 2026-03-05（ingest 実施時）
