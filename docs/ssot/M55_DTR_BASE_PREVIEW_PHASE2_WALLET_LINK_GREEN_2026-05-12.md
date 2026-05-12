# M55 DTR Base Preview — Phase 2 wallet link GREEN (2026-05-12)

Status: **Checkpoint evidence** — Phase 2（`reply_ticket_wallets.report_instance_id` の恒久リンク）が **GREEN** であることの記録。**本ドキュメントではアプリロジックは変更しない。**

**Phase 2 は、本チェックポイントをコミット・リモートへプッシュしたうえで「クローズ」扱いとする。**（証跡が mainline に乗るまでドラフト扱いとする運用の場合はチーム手順に従う。）

## Work anchor

- **Branch:** `work/home-cluster`
- **Environment:** Vercel Preview（M55-Vercel-Preview-HomeCluster）
- **DB:** Supabase Shadow/Test — `m55-soul-shadow` / project ref `jonlynrbfveaprncyrmv`
- **Stripe:** Sandbox
- **Product lane:** DTR base report ¥1,000 / 同梱返書チケット 1 件（`DTR_CORE_STATIC_V1`）
- **Out of scope:** Production、`main`、追加返書 ¥500、Vercel env、`whsec`、新 Stripe endpoint、UI polish、コピー調整、返書送信・消費の E2E

## Implementation commit（恒久リンク）

- **`c5b46f0`** — `fix: link DTR reply wallet to report snapshot`

## Verified behavior（手動 backfill なし）

**新規**メール／**新規** Clerk ユーザーで、Preview / Sandbox 上で DTR 本体 **¥1,000** を購入した際、**手動 SQL backfill を行わず**に次が成立した:

- `dtr_report_snapshots.id` と `reply_ticket_wallets.report_instance_id` が **一致**（自動リンク）
- 以降の HTTP / ゲートが期待どおり **200 / owned**

本証跡では **生の `user_id` / Checkout `session_id` / Stripe `event_id` / メール全文 / 秘密値**は記録しない（プレースホルダまたは「新規テストユーザー」とのみ記す）。

## Verified checklist（DB + HTTP + ゲート）

- **`snapshot_id`（`dtr_report_snapshots.id`）= `reply_ticket_wallets.report_instance_id`**
- **`product_id` = `DTR_CORE_STATIC_V1`**
- **`initial_included_count` = 1**
- **`purchased_count` = 0**
- **`consumed_count` = 0**
- **`available_count` = 1**
- **`status` = `active`**
- **`POST /api/stripe/webhook`** → **200**
- **`/dtr/processing`** に Stripe session 到達（処理フロー確認）
- **`/dtr/core`** → **200**
- **`GET /api/room/core`** → **200**
- **`dtrOwnershipGate`** — `grantSource` は **`dtr_report_snapshots`**（保存版による owned）

## Read-only 検証 SQL（正本）

- `scripts/sql/staging/m55_phase2_wallet_report_instance_link_verification_v1.sql`  
  — `<CLERK_USER_ID>` を置換のうえ **Shadow のみ**で実行。**SELECT のみ**（DML なし）。

## Next phase

- **Phase 3:** 同梱返書 **1 チケット**の **E2E**（生成〜消費の一連。本チェックポイントの範囲外）。

## Hard stop

- **追加返書 ¥500** にはまだ進めない。
- **Production / `main`** への昇格・マージを本証跡のみで進めない。
- **env / `whsec` / 新規決済ループ** を検証目的で増やさない（別途合意した次ブロッカーでない限り）。
- **UI polish** を本証跡と混同して広げない。

## Related

- Phase 1.5 証跡: `docs/ssot/M55_DTR_BASE_PREVIEW_GREEN_CHECKPOINT_2026-05-12.md`（手動 backfill 前提の記録）
- システムログ先頭: `docs/ssot/M55_SYSTEM_SSOT.md`（2026-05-12 Phase 2 checkpoint）
