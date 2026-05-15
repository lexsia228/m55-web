# M55 Phase 5 — Production promotion readiness / release hardening gate (2026-05-12)

Status: **Gate artifact** — Phase 5 は **Production への昇格準備とリリース強化のチェックリスト**であり、**Production リリースそのものではない**。本ドキュメント作成時点では **Production / `main` への merge・本番 DB 変更・本番決済は行わない。**

## Current GREEN stack（Phase 1〜4）

- **Phase 1:** DTR base report ¥1,000 Preview 購入後フロー GREEN  
- **Phase 1.5:** 証跡化 commit `925a9c9`  
- **Phase 2:** wallet `report_instance_id` 恒久修正 GREEN — 証跡化 commit `2f6fa0e`  
- **Phase 3:** 付属 1 件返書 E2E GREEN — 証跡化 commit `050d384`  
- **Phase 4:** 追加返書 ¥500 Preview E2E GREEN — 証跡化 commit `fce13d2`  

## Hard rule（絶対）

- **`main` へ merge しない**  
- **Production DB を編集しない**（本ゲートは **明示承認後の preflight のみ**を想定）  
- **Production の Vercel env を編集しない**  
- **`whsec` / 秘密値に触れない・出力しない**  
- **本番ライブ決済（live payment）をまだ走らせない**  

## Critical production gap（Preview/Shadow Phase 4 の教訓）

Preview/Shadow の Phase 4 は、**以下を Shadow 上で後追い修復したことに依存**している。これらは **`supabase/migrations/` にまだ一式として反映されていない**（リポジトリ監査時点）。

| 項目 | 説明 |
|------|------|
| **`public.m55_reply_ticket_fulfill_checkout_event`** | 追加返書 Webhook → RPC。Shadow で欠落時 **500** が再現された。 |
| **`public.stripe_processed_events`** | RPC 内 idempotency 行。additive DDL 候補で **CREATE TABLE**。 |
| **`reply_wallet_ledgers` の Stripe / 参照列** | `stripe_event_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `product_key`, **`report_instance_id`**（RPC INSERT 前提）。 |
| **`service_role` の `EXECUTE`** | PostgREST 経由 RPC 呼び出しに必須。 |
| **PostgREST schema reload** | 新 RPC/テーブル後のキャッシュ更新。 |

**結論:** Production 昇格前に、上記を **mainline のマイグレーション／承認済み適用手順**としてパッケージ化する **Phase 5-2（準備・レビューのみ）** が次工程になる。

## Production に必要な DB オブジェクト（論理一覧）

アプリ契約上、少なくとも以下を **Production DB が満たす**こと。

- `entitlements`, `entitlement_rights`  
- `stripe_events`  
- `one_time_fulfillments`, `failed_fulfillments`  
- `dtr_guest_drafts`, `dtr_report_snapshots`  
- `consult_threads`, `consult_messages`  
- `reply_ticket_wallets`, `reply_wallet_ledgers`  
- **`stripe_processed_events`**（追加返書 RPC レーン）  
- **`public.m55_reply_ticket_fulfill_checkout_event`**（追加返書 fulfillment）  
- **`service_role` の当該 RPC `EXECUTE`**  
- **schema reload**（運用で `NOTIFY pgrst` または Dashboard 相当）

## SQL artifacts（repo 内参照）

| Path | 用途 |
|------|------|
| `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql` | Production 向け **additive DDL 候補**（`stripe_processed_events` + ledger 列）。**ファイル単体での実行承認ではない。** |
| `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql` | **RPC 本体**（Shadow/Staging 由来ドラフト）。Production 適用は **別ゲート**。 |
| `scripts/sql/staging/m55_phase4_additional_reply_e2e_verification_v1.sql` | Phase 4 **read-only 検証**（`<CLERK_USER_ID>`）。 |
| `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql` | **本ゲート付属の Production preflight（SELECT のみ）**。 |

**Shadow 専用 backfill（Production に流してはいけない）:**

- `scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql` — **手動・環境依存**。Production への無裁定適用禁止。

## Env 名のみ（値は書かない）

アプリ／インフラが参照しうる代表名（本リストは網羅を保証しない — デプロイ設定と突合せること）。

- `STRIPE_PRICE_DTR_CORE_STATIC_V1`  
- `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`  
- `STRIPE_SECRET_KEY`  
- `STRIPE_WEBHOOK_SECRET`  
- `NEXT_PUBLIC_SUPABASE_URL`  
- `SUPABASE_SERVICE_ROLE_KEY`  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  
- `CLERK_SECRET_KEY`  
- `OPENAI_API_KEY`  

## Webhook 分離ルール（SSOT 整合）

- **1 URL = 1 Stripe webhook endpoint = 1 `whsec`**。  
- **Preview と Production で `whsec` を共有しない**。  
- 詳細: `docs/ssot/M55_STRIPE_WEBHOOK_ENDPOINT_REGISTRY.md`, `docs/ssot/M55_ENVIRONMENT_MATRIX.md`。

## Production preflight checklist（DB：明示承認後のみ）

- [ ] `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql` を **read-only** で実行し、欠落オブジェクト・列・RPC・権限が無いことを確認する。  
- [ ] 追加返書レーン用 DDL/RPC が **計画どおり適用済み**であること（マイグレーションまたは承認済み手順）。  
- [ ] PostgREST **schema reload** 実施済み。  

## Merge-before checklist（アプリ／ドキュメント）

- [ ] Phase 5 証跡と Phase 1〜4 証跡に矛盾がない。  
- [ ] Shadow 専用 SQL が Production 手順に混入していない。  
- [ ] Production用 DDL/RPC の **レビュー／ゲート文書**が参照可能。  

## Live-smoke checklist（本番決済は別承認後）

- [ ] Production デプロイと **Production 専用** Stripe endpoint / env が対応。  
- [ ] **最小額**で Lane A（DTR）と Lane B（追加返書）を **別タイミングまたは別テスト設計**で検証する計画がある（繰り返し課金で cap のみを叩かない）。  
- [ ] Webhook **200**、wallet/ledger の整合、UI 残数の確認。  

## Rollback / stop conditions

- Webhook **500** が追加返書レーンで継続 → **RPC/DDL 未適用または env 不一致**を疑い、**ライブ追加購入を停止**。  
- 署名検証失敗 → **`STRIPE_WEBHOOK_SECRET` と URL の対応**を是正するまで停止。  
- 二重付与の疑い → **Stripe / DB / `stripe_events` / `stripe_processed_events`** を運用手順で調査。  

## Next phase

- **Phase 5-2:** Production DB/RPC **マイグレーションパッケージの準備・レビューのみ**（適用 GO は別ゲート）。  

## Related

- `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md`  
- `docs/ssot/M55_SYSTEM_SSOT.md`（Phase 5 checkpoint）  
