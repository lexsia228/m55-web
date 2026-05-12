# M55 Phase 5-2 — Production DB/RPC migration package (review only) (2026-05-12)

Status: **Review-only package preparation** — Production DB への適用、**`main` merge**、本番インフラ変更、**ライブ決済**は **一切行わない**。成果物は **レビュー可能な SQL パッケージ、Runbook 概念、preflight/postflight 参照**のみ。**Phase 5-3A:** `m55_phase5_production_promotion_readiness_preflight_v1.sql` に **reply_ticket_wallets.report_instance_id** および **wallet スコープ制約/index の read-only 照会**を追記済み（APPROVE_WITH_FIXES の preflight gap 補強）。

## Current GREEN stack（Phase 1〜5-1）

- Phase 1〜4: **GREEN**（証跡化済み: `925a9c9`, `2f6fa0e`, `050d384`, `fce13d2` 等）
- Phase 4 検証済み状態の参照: Preview/Shadow で **追加返書 RPC 修復後**に E2E GREEN（証跡 `M55_DTR_BASE_PREVIEW_PHASE4_ADDITIONAL_REPLY_E2E_GREEN_2026-05-12.md`）
- Phase 5-1: Production readiness gate / runbook 証跡化 commit **`ffdf078`**

## Phase 5-2 hard rule

- **Production DB に適用しない**
- **`main` に merge しない**
- **Vercel Production env を変更しない**
- **Stripe Production webhook を変更しない**
- **`whsec` / 秘密値を出力・変更しない**
- **本番ライブ決済をしない**
- **DB をこのタスクで実行しない**（SQL は **明示承認後の別セッション**用）

## なぜこのパッケージが必要か

Preview/Shadow の Phase 4 は **`public.m55_reply_ticket_fulfill_checkout_event` が欠落していた Shadow を手当てした後**にのみ GREEN となった。**`supabase/migrations/` には当該 RPC と `stripe_processed_events`、ledger の参照列一式がまだ mainline 化されていない**。Production に同状態でデプロイすると、**追加返書 Webhook が再び失敗**しうる。

## Production に必要なオブジェクト（本パッケージのスコープ）

| 対象 | 説明 |
|------|------|
| `public.stripe_processed_events` | RPC 内 idempotency 行 |
| `reply_wallet_ledgers` 列 | `report_instance_id`, `stripe_event_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `product_key` |
| `public.m55_reply_ticket_fulfill_checkout_event` | 追加返書 fulfillment RPC |
| `service_role` | 当該 RPC への **EXECUTE** |
| PostgREST | **schema reload**（`NOTIFY pgrst, 'reload schema'` 等） |
| 冪等性 | **`stripe_processed_events.stripe_event_id`** に対する **UNIQUE または partial UNIQUE**（RPC が `unique_violation` に依存） |

**前提（本パッケージ外で既に満たされていること）:** `reply_ticket_wallets.report_instance_id` 等の **レポートスコープ WALLET** は Phase 2 アプリ／別 DDL で既に Production に存在する想定。未確認なら **preflight で STOP**。

## Shadow 専用 SQL（Production に使わない）

- `scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql` — **手動 backfill**。Production への無裁定適用 **禁止**。

## Repo 内パッケージパス（レビュー用）

| Path | 役割 |
|------|------|
| `docs/ssot/M55_PHASE5_PRODUCTION_PROMOTION_READINESS_GATE_2026-05-12.md` | Phase 5-1 gate / runbook |
| `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql` | 適用 **前** read-only preflight |
| `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql` | **本 Phase 5-2 の統合 DDL+RPC+GRANT+NOTIFY 候補（実行禁止ヘッダ付き）** |
| `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql` | 適用 **後** read-only postflight |
| `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql` | 統合候補の **構成要素元** |
| `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql` | RPC 本文の **ソースオブトゥルース（staging）** |

## Migration order（推奨）

1. **read-only preflight** — `m55_phase5_production_promotion_readiness_preflight_v1.sql` 等  
2. **additive DDL** — `stripe_processed_events`、ledger 列（`report_instance_id` 含む）  
3. **idempotency UNIQUE / partial UNIQUE index** — 既存重複行がないことを preflight で確認後のみ（重複あり → **REVIEW_REQUIRED / STOP**）  
4. **RPC `CREATE OR REPLACE FUNCTION`**  
5. **`REVOKE ALL ... FROM PUBLIC`**（該当する場合）**+ `GRANT EXECUTE ... TO service_role`**  
6. **`NOTIFY pgrst, 'reload schema'`**（または Dashboard 相当）  
7. **read-only postflight** — `m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`  
8. **deploy / app 検証**（Preview ではなく **承認された環境**で）  
9. **Stripe live smoke** — **別承認後のみ**

## Rollback / recovery 概念（非破壊を既定）

- **既定:** 破壊的 rollback（DROP RPC / TRUNCATE）は **デフォルトでは取らない**。  
- **ライブ決済前の失敗:** デプロイ経路の停止・原因修正・再 preflight。  
- **ライブ決済後の失敗:** **Checkout 表面の停止**、Stripe Dashboard / 冪等テーブル / `stripe_events` の照合、**二重付与を増やさない**運用。  
- **最新の検証済み GREEN 参照:** Preview/Shadow Phase 4 証跡（`fce13d2`）+ Phase 5-1（`ffdf078`）。

## Stop conditions

- RPC 未作成 / `service_role` が EXECUTE 不能  
- ledger 必須列欠落  
- **`stripe_processed_events` に stripe_event_id 一意性が無く** RPC の replay 挙動が保証できない  
- Webhook URL と `STRIPE_WEBHOOK_SECRET` の不一致  
- PostgREST schema cache エラー（reload 未実施等）  
- **法務・サポート導線**（`/legal/*`, `/support` 等）が利用不能で Stripe 審査・運用要件を満たせない場合

## Next phase

- **Phase 5-3** — 本マイグレーションパッケージの **レビュー承認**（**明示 GO が無い限り Production 適用しない**）

## Related

- `docs/ssot/M55_STRIPE_WEBHOOK_ENDPOINT_REGISTRY.md`
- `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md`
