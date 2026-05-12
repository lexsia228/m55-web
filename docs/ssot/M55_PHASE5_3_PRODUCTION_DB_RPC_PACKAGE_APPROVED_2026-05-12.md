# M55 Phase 5-3 — Production DB/RPC package APPROVED checkpoint (2026-05-12)

Status: **Approval checkpoint evidence** — Phase **5-3B** 再レビュー判定: **APPROVE**。**本証跡はレビュー承認の記録であり、Production DB への適用承認ではない。** **明示 GO・メンテナンス窓なしに Production を変更しない。**

## Work anchor

- **Branch:** `work/home-cluster`
- **Baseline commit（preflight 補強）:** `6e603d9` — `docs: harden production promotion preflight`
- **Environment:** Preview / Shadow 検証済み（本証跡作成時点で Production 未実行）

## GREEN / approval stack（要約）

| Phase | 状態 |
|-------|------|
| Phase 1〜4 | **GREEN**（証跡化済み: `925a9c9`, `2f6fa0e`, `050d384`, `fce13d2` 等） |
| Phase 5-1 | **readiness gate** 証跡（commit **`ffdf078`**） |
| Phase 5-2 | **migration package** repo 整理・レビュー用 SSOT |
| Phase 5-3A | **preflight hardening** — commit **`6e603d9`** |
| Phase 5-3B | **パッケージ再レビュー → APPROVE**（本ドキュメント） |

## 6e603d9 で解消した点（前回 APPROVE_WITH_FIXES のブロッカー）

`scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql` に以下を追加し、**report-scoped wallet 前提**を適用前に検証できるようにした。

- **`reply_ticket_wallets.report_instance_id`** 列の存在（`has_reply_ticket_wallets_report_instance_id`）
- **`reply_ticket_wallets`** の **PK / UNIQUE**（read-only 一覧）
- **`user_id` / `report_instance_id`** に触れる **index 一覧**（read-only）

## APPROVED package paths（将来の Production 適用ゲート用）

適用順・前提は Phase 5-2 SSOT / 5-1 runbook に従う。**実行は別明示 GO のみ。**

- `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql`（**SELECT のみ**・適用前）
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`（**明示承認まで実行禁止**・適用本体候補）
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`（**SELECT のみ**・適用後）

## Production 実行はまだ承認されていない

- **Production DB への適用 GO は本証跡に含まれない。**
- 将来の適用は **別途明示 GO** + **メンテナンス窓**の下で、少なくとも次の順を推奨する:  
  **preflight → migration candidate → postflight → アプリデプロイ整合 → ライブ smoke（別承認）**

## 非ブロッキング運用メモ（適用当日に確認）

- **`REVOKE ALL … FROM PUBLIC`** の組織ポリシー整合（マイグレーション候補内 **REVIEW_REQUIRED**）
- **`stripe_processed_events`** に **重複 `stripe_event_id` が無いこと**（unique index 作成前のデータ確認）
- preflight 出力に基づく **report-scoped wallet の index/constraint** の DBA 解釈

## Shadow 専用 SQL

- **`scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql`** 等の **Shadow 専用 backfill を Production に流用しない。**

## 秘密・生 ID

本証跡に **秘密値・完全な raw ID** は記載しない。

## Related

- `docs/ssot/M55_PHASE5_2_PRODUCTION_DB_RPC_MIGRATION_PACKAGE_REVIEW_2026-05-12.md`
- `docs/ssot/M55_PHASE5_PRODUCTION_PROMOTION_READINESS_GATE_2026-05-12.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`（Phase 5-3B checkpoint）
