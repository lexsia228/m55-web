# M55 DTR Base Preview — Phase 1.5 GREEN Checkpoint (2026-05-12)

Status: **Evidence / checkpoint** — not a permanent product or schema contract change.

**Phase 1 is GREEN** for the DTR base report Preview purchase-after flow on Shadow; this file records Phase 1.5 checkpoint evidence（**Phase 1 GREEN の証跡**）。**本チェックポイントではアプリロジックは変更しない。**

## Work anchor

- **Branch:** `work/home-cluster`
- **Environment:** Vercel Preview（M55-Vercel-Preview-HomeCluster）
- **DB:** Supabase Shadow/Test — `m55-soul-shadow` / project ref `jonlynrbfveaprncyrmv`
- **Stripe:** Sandbox
- **Product lane:** DTR base report ¥1,000 / `DTR_CORE_STATIC_V1`
- **Out of scope:** Production、`main`、追加返書チケット ¥500、Vercel env、`whsec`、新 Stripe endpoint、**新規決済**、UI redesign

## Phase 1 GREEN（Preview + Shadow で検証済み）

DTR base report の購入後フローについて、Preview 対 Shadow で以下を **GREEN** と確認した。

- Stripe `checkout.session.completed` → webhook **HTTP 200**
- `entitlements` — `DTR_CORE_STATIC_V1`、active、one-time 経路
- `entitlement_rights`
- `one_time_fulfillments`
- `reply_ticket_wallets`
- `dtr_guest_drafts`
- `dtr_report_snapshots` — 対象製品で `snapshot_rows = 1`
- `/dtr/core` — paid report unlock **GREEN**
- `consult_threads` / `consult_messages` — schema **GREEN**
- `GET /api/room/core` — **HTTP 200**
- Consultation room UI — 残数表示 **「残り1件（合計5件まで）」**（wallet と room 状態の整合後）

## Caveat — Shadow の手動 backfill は恒久修正ではない

`reply_ticket_wallets.report_instance_id` を `dtr_report_snapshots.id` に揃えたのは、**Shadow/Test のみ**で実施した **手動 SQL backfill**（運用者実行）である。**恒久のプロダクト修正・正本 SSOT ではない。**

- 手動 backfill を新規ユーザー・新環境の正としないこと。
- 本スクリプトを **Production では実行しない**こと。

参照スクリプト（プレースホルダ `<CLERK_USER_ID>` のみ。実 ID は git に載せない）:

- `scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql`

## 次に必須のフェーズ（恒久）

**恒久対応:** `reply_ticket_wallets.report_instance_id` を、**正規の fulfillment / migration（または合意した app+DB 契約）**で付与し、Preview や将来環境が **Shadow 手動 backfill に依存しない**状態にすること。

当該フェーズの設計・実装・検証が完了するまで:

- **追加返書 ¥500** のプロダクト作業に進まない。
- 本チェックポイントのみを根拠に **Production / `main` へ昇格・マージしない**。
- **Vercel env / `whsec` のローテ**、新 Stripe endpoint、**新規決済**による追加検証は行わない（別途合意した次ブロッカーでない限り）。

## Related SSOT

- システムログ先頭: `docs/ssot/M55_SYSTEM_SSOT.md`（2026-05-12 checkpoint）
- インシデント文脈: 同ファイルの 2026-05-11 節
