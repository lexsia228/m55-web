# M55 DTR Base Preview — Phase 4 additional reply ¥500 E2E GREEN (2026-05-12)

Status: **Checkpoint evidence** — Phase 4（追加返書 **¥500** の Checkout〜Webhook〜wallet〜購入分返書送信〜UI）が **GREEN** であることの記録。**Preview / Supabase Shadow の検証に限定**。**Production / `main` の承認・昇格の根拠単体ではない。** **本ドキュメントではアプリロジックは変更しない。**

## Work anchor

- **Branch:** `work/home-cluster`
- **Environment:** Vercel Preview（M55-Vercel-Preview-HomeCluster）
- **DB:** Supabase Shadow/Test — `m55-soul-shadow` / project ref `jonlynrbfveaprncyrmv`
- **Stripe:** Sandbox
- **Product lane:** additional reply ticket ¥500（論理キー `additional_reply_ticket`）
- **Out of scope:** Production、`main`、Vercel env、`whsec`、秘密値、新 Stripe endpoint、UI polish、コピー調整、**追加購入の繰り返し検証のみを目的とした決済ループ**

## Phase 4 sequence（検証済み）

| Step | Result |
|------|--------|
| 追加返書 Checkout 作成 | `POST /api/reply-tickets/checkout` → **200** |
| 初回 Webhook | `POST /api/stripe/webhook` → **500** |
| Root cause | **`public.m55_reply_ticket_fulfill_checkout_event` RPC が Shadow に未存在** |
| Shadow repair | **RPC を Shadow に作成**、`service_role` に **EXECUTE 確認済み** |
| Stripe delivery | **自動再送**により過去の `checkout.session.completed` が回復配信 |
| Wallet（Webhook 回復後） | **+1 購入相当**が反映 |
| Ledger | **`purchase_grant` / `PURCHASE` / `delta = 1` / `balance_after = 1` / `product_key = additional_reply_ticket`**、Stripe event / session / payment intent 参照あり |
| 購入分返書送信 E2E | `POST /api/room/core/send` → **200** |
| UI | リロード後 **残り 0**、**追加返書 CTA** が再表示 |

本証跡では **生の `user_id` / `wallet_id` / session / event / payment intent / メール / 秘密値**は記録しない（プレースホルダまたはチーム内参照のみ）。

## Verified DB values（wallet — report-scoped lane）

**最終観測（Phase 4 E2E 完了後の期待値）:**

| Field | Value |
|--------|--------|
| `initial_included_count` | **1** |
| `purchased_count` | **1** |
| `consumed_count` | **2** |
| `available_count` | **0** |
| `status` | **`active`** |
| Wallet ↔ snapshot | **`wallet_link_ok`**（`report_instance_id` が `dtr_report_snapshots.id` と整合する運用上の確認） |

## Verified DB values（consult room）

| Check | Value |
|--------|--------|
| `consult_threads.credits_remaining` | **0** |
| `consult_threads.state` | **`read_only`** |
| `consult_messages` 件数 | **4**（**user / assistant / user / assistant** の往復 2 周） |

## Verified ledger values（追加購入 1 件分）

| Field | Value |
|--------|--------|
| `event_type` | **`purchase_grant`** |
| `source_of_grant` | **`PURCHASE`** |
| `delta` | **1** |
| `balance_after` | **1**（Webhook 付与直後のスナップショットとして記録された値） |
| `product_key` | **`additional_reply_ticket`** |
| Stripe 参照 | **event / session / payment intent の参照が存在**（値は証跡に全文記載しない） |

## Scope and promotion

- **検証範囲:** Preview + Shadow の **追加返書 ¥500** レーンおよび **`/api/room/core/send`** による **購入済みチケットの消費**まで。
- **Production / `main`:** 本チェックポイントだけでは **未承認**。昇格は別ゲート。
- **RPC:** 今回 **Shadow 上で欠落を修復**。**本番昇格準備**では、同 RPC（および依存 DDL）を **Production のマイグレーション／適用ゲートに含める必要がある**。

## Read-only 検証 SQL（正本）

- `scripts/sql/staging/m55_phase4_additional_reply_e2e_verification_v1.sql`  
  — `<CLERK_USER_ID>` を置換のうえ **Shadow のみ**で実行。**SELECT のみ**（DML なし）。

## Related

- Phase 3 証跡: `docs/ssot/M55_DTR_BASE_PREVIEW_PHASE3_INCLUDED_REPLY_E2E_GREEN_2026-05-12.md`
- システムログ先頭: `docs/ssot/M55_SYSTEM_SSOT.md`（2026-05-12 Phase 4 checkpoint）
