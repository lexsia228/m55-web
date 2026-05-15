# M55 DTR Base Preview — Phase 3 included reply 1-ticket E2E GREEN (2026-05-12)

Status: **Checkpoint evidence** — Phase 3（同梱返書 **1 チケット**の送信〜消費〜UI 整合）が **GREEN** であることの記録。**本ドキュメントではアプリロジックは変更しない。**

**検証対象は「同梱 1 件」のみ。**追加返書 **¥500** の Checkout・Webhook・台帳ループは **本フェーズでは検証しない**（未 GREEN）。

## Work anchor

- **Branch:** `work/home-cluster`
- **Environment:** Vercel Preview（M55-Vercel-Preview-HomeCluster）
- **DB:** Supabase Shadow/Test — `m55-soul-shadow` / project ref `jonlynrbfveaprncyrmv`
- **Stripe:** Sandbox
- **Product lane:** DTR base report ¥1,000 / 同梱返書チケット 1 件（`DTR_CORE_STATIC_V1`）
- **Out of scope:** Production、`main`、追加返書 ¥500 の **決済実行**、Vercel env、`whsec`、新 Stripe endpoint、UI polish、コピー調整

## Preconditions（Phase 2 GREEN に依存）

- `reply_ticket_wallets.report_instance_id` が `dtr_report_snapshots.id`（`DTR_CORE_STATIC_V1`）と整合していること（恒久リンク `c5b46f0`）。
- `/dtr/core` で有料レポート表示・`GET /api/room/core` **200** が成立していること。

## Verified checklist（送信前後）

| Step | Check |
|------|--------|
| Before send | Remaining **1**（wallet `available_count` = 1 に相当する UI / DB 状態） |
| After send | `reply_ticket_wallets.available_count` = **0** |
| After send | `reply_ticket_wallets.consumed_count` = **1** |
| After send | `consult_threads.credits_remaining` = **0** |
| After send | `consult_threads.state` = **`read_only`** |
| After send | `consult_messages` に **2 行**（user + assistant の往復） |
| UI | リロード後も残り **0** と表示される |
| UI | **「追加相談返書 1件 500円」** の CTA が表示される |

本証跡では **生の `user_id` / session / event / メール全文 / 秘密値**は記録しない（`<CLERK_USER_ID>` プレースホルダまたはチーム内参照のみ）。

## Scope statement

- **GREEN としているのは:** `POST /api/room/core/send` 経由の **同梱 1 件**返書の生成・保存・チケット消費・スレッド状態・再表示まで。
- **まだ GREEN としない:** 追加返書 **¥500** の Preview Checkout・決済・Webhook・wallet 増分の **E2E**。

## Read-only 検証 SQL（正本）

- `scripts/sql/staging/m55_phase3_included_reply_e2e_verification_v1.sql`  
  — `<CLERK_USER_ID>` を置換のうえ **Shadow のみ**で実行。**SELECT のみ**（DML なし）。

## Next phase

- **Phase 4:** 追加返書 **¥500** の **Preview Checkout** 検証（決済〜Webhook〜wallet / UI の別ゲート）。

## Hard stop

- **Production / `main`** を本証跡のみで触らない。
- **env / `whsec` / 新規決済ループ** を Phase 4 以外の目的で増やさない。
- **追加返書 ¥500** の実行検証は **Phase 4 まで保留**（本チェックポイントでは未検証）。

## Related

- Phase 2 証跡: `docs/ssot/M55_DTR_BASE_PREVIEW_PHASE2_WALLET_LINK_GREEN_2026-05-12.md`
- システムログ先頭: `docs/ssot/M55_SYSTEM_SSOT.md`（2026-05-12 Phase 3 checkpoint）
