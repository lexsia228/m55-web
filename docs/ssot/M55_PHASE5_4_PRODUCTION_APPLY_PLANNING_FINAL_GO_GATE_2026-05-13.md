# M55 Phase 5-4 — Production apply planning / maintenance window / final GO gate (2026-05-13)

Status: **Planning and final GO gate SSOT** — **実行ではない。** 本ゲートでは **Production DB 適用、`main` merge、Production env 編集、`whsec`/秘密値、ライブ決済に触れない。** 実作業は **別途明示 GO** と **メンテナンス窓** のみ。

## Work anchor

- **Branch:** `work/home-cluster`
- **Product lanes:** `DTR_CORE_STATIC_V1`（¥1,000）, `additional_reply_ticket`（¥500）

## Current GREEN / approval stack

| Item | 状態 |
|------|------|
| Phase 1〜4 | **GREEN**（証跡: `925a9c9`, `2f6fa0e`, `050d384`, `fce13d2` 等） |
| Phase 5-1 | readiness gate（`ffdf078`） |
| Phase 5-2 | migration package 準備（`11f77e8`） |
| Phase 5-3A | preflight hardening（`6e603d9`） |
| Phase 5-3B | package **APPROVE** |
| Phase 5-3C | approval checkpoint 証跡化（`8a382e7`） |

## Hard stop（絶対）

- **Production DB に適用しない**（明示 GO まで）
- **`main` merge しない**（DB/RPC PASS 後の整合まで別 GO）
- **Production Vercel env を編集しない**（別手順・別承認）
- **`whsec` / 秘密値を変更・露出しない**
- **ライブ決済（live payment）を実行しない**（別承認）

## Maintenance window（計画項目）

| 項目 | 内容 |
|------|------|
| **目的** | Production に **Phase 5-2 承認済み SQL パッケージ**を適用し、PostgREST reload 後にアプリと整合させる |
| **影響** | 追加返書 Webhook レーン（`m55_reply_ticket_fulfill_checkout_event`）、`stripe_processed_events`、ledger 拡張列 |
| **ルール** | 窓中は **新規本番決済を打たない**（可能なら Checkout 導線を一時停止または告知） |
| **作業者** | DBA / インフラ担当 + アプリ担当の **二名以上確認**（口頭またはチケット記録） |

## Production apply sequence（GO 後の推奨順）

1. **クリーンな worktree** と **対象 branch / commit** を確認する。  
2. **承認済み SQL パッケージ**がリポジトリ上の正本と一致することを確認する。  
3. **明示 GO** の記録（チケット / SSOT 追記）。  
4. **Production preflight** — `m55_phase5_production_promotion_readiness_preflight_v1.sql`（**PASS のみ**次へ）。  
5. **Migration candidate** — `m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`（**preflight PASS 後のみ**）。  
6. **Postflight** — `m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`。  
7. **アプリ deploy / `main` 整合** — **DB/RPC postflight PASS 後のみ**（別ポリシーに従う）。  
8. **Stripe Production** — webhook URL と `STRIPE_WEBHOOK_SECRET` の **1:1**（レジストリ SSOT）。  
9. **ライブ smoke** — **別承認**（最小額・レーン分離）。

## Observability（本格 Sentry/Datadog は対象外）

| 観測 | 窓中に見るもの |
|------|----------------|
| **Vercel Logs** | `/api/stripe/webhook` の **HTTP ステータス**、`reply-ticket-diagnostic` 系ログの有無（**秘密は貼らない**） |
| **Stripe Dashboard** | Webhook 配信結果、失敗イベントの **種別のみ** |
| **Supabase** | **read-only SQL**（preflight / postflight / ghost check） |
| **UI** | 下記 Health check |

## Kill switch / rollback

| 手段 | 条件 |
|------|------|
| **Vercel rollback** | デプロイ直後の不整合・誤設定が疑われる場合（手順は Vercel 運用に従う） |
| **Checkout 導線の一時停止** | Webhook **4xx/5xx** 継続、二重付与疑い、DB 適用失敗後に課金のみ進む恐れ |
| **ライブ決済の停止** | 上記に加え、**盲再送・一括 replay 禁止**（Stripe 運用 SSOT） |
| **最新検証済み GREEN のフォールバック参照** | Preview/Shadow Phase 4 + commits **`fce13d2`**, **`ffdf078`**, **`11f77e8`**, **`6e603d9`**, **`8a382e7`** |

## Ghost data / test data separation（read-only のみ）

- **Shadow/Test 由来の手動 SQL を Production に流用しない**（`m55_shadow_*` 等）。  
- **DELETE は本ゲートでは行わない** — 疑わしい件数の **COUNT / EXISTS のみ**（`m55_phase5_4_production_ghost_data_readonly_check_v1.sql`）。  
- **テスト専用ユーザー backfill** を Production に入れない。

## Health check（ルート）

| 種別 | パス / 方法 |
|------|-------------|
| **公開面** | `/`, `/dtr`, `/dtr/core`（認証・購入状態に依存する場合あり） |
| **サポート・法務** | `/support`, `/legal/tokushoho`, `/legal/refund`, `/legal/privacy`, `/legal/terms` |
| **Webhook** | Stripe からのイベント経由で **`/api/stripe/webhook`** を確認 |
| **相談室 API** | **ライブ smoke 時**、ログインユーザーで **`GET /api/room/core`** |
| **DB** | preflight / postflight / ghost read-only SQL |

## Compliance

- 上記 **legal / support** が **200 で到達可能**であること。  
- **¥1,000 / ¥500** の表示と **返金・サポート導線**（`/legal/refund`, `/support`）の整合を smoke 前に目視確認。

## Final GO criteria（すべて満たす）

- [ ] 明示 GO が記録されている。  
- [ ] メンテナンス窓と **新規決済停止ルール**が共有されている。  
- [ ] **preflight PASS**、**migration + postflight PASS**。  
- [ ] **REVOKE/GRANT**・**duplicate `stripe_event_id`** の運用確認が済んでいる（非ブロッキング項目の扱い含む）。  
- [ ] **Ghost read-only** に明らかなテストマーカー異常が無い（または説明付きで許容）。  
- [ ] Webhook **URL / `whsec`** が Production 専用である。  

## NO-GO criteria（いずれかで停止）

- preflight **FAIL**（`reply_ticket_wallets.report_instance_id` 欠落、RPC 欠落、列欠落等）。  
- **`stripe_processed_events` に重複 `stripe_event_id`** があり unique index 作成不能。  
- **Webhook 4xx/5xx** が解消しない。  
- **法務・サポート導線**が利用不能。  
- **作業者単独**で危険操作を続ける状況。

## Approved SQL package paths（再掲）

- `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql`  
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`  
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`  
- `scripts/sql/production/m55_phase5_4_production_ghost_data_readonly_check_v1.sql`（本 Phase で追加）  
- `scripts/sql/production/m55_phase5_4_production_live_smoke_readonly_verification_v1.sql`（ライブ smoke 別承認後）

## Next phase

- **Phase 5-5** — **明示 Production apply GO** による実行、またはブロッカー時の **Phase 5-4B** ハードニング。

## Related

- `docs/ssot/M55_PHASE5_3_PRODUCTION_DB_RPC_PACKAGE_APPROVED_2026-05-12.md`  
- `docs/ssot/M55_PHASE5_2_PRODUCTION_DB_RPC_MIGRATION_PACKAGE_REVIEW_2026-05-12.md`  
- `docs/ssot/M55_STRIPE_WEBHOOK_ENDPOINT_REGISTRY.md`  
- `docs/ssot/M55_SYSTEM_SSOT.md`  
