# M55 Phase 5-6G — Production migration execution + postflight GREEN (2026-05-14)

Status: **Evidence / traceability only** — **本ドキュメントは証跡化のみ。** Phase 5-6G 時点で **Production DB に対する migration candidate の 1 回実行**と **read-only postflight の主要項目 PASS** を記録する。**追加の Production 変更、`main` merge、Production env、`whsec`/秘密、Stripe Production webhook 変更、本番ライブ決済、live smoke は行っていない。**

---

## Production target label

- **m55-soul-core / PRODUCTION**

---

## Work anchor

- **Branch:** `work/home-cluster`
- **Repository HEAD（実行前確認）:** **`9f3c0d0`** — `docs: harden reply ledger lookup index plan`

---

## Pre-execution checks

| Check | Result |
|-------|--------|
| worktree | **clean** |
| HEAD | **`9f3c0d0`** |
| `duplicate_stripe_event_id_groups`（適用前の重複グループ確認） | **0** |

---

## Production migration candidate execution

| Item | Detail |
|------|--------|
| **Approved path** | `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql` |
| **Target** | **m55-soul-core / PRODUCTION** |
| **Runs** | **1 回**のみ |
| **Outcome** | **Success** — クライアントは **行を返さない**（**No rows returned**） |

---

## Postflight（read-only）— 主要項目

| Item | Result |
|------|--------|
| RPC `m55_reply_ticket_fulfill_checkout_event` が存在する | **PASS** |
| `service_role` の当該 RPC への **EXECUTE** | **PASS** |
| `stripe_processed_events` テーブルが存在する | **PASS** |
| `stripe_processed_events` に **`stripe_event_id` の UNIQUE 系インデックス**が存在する | **PASS** |
| `reply_wallet_ledgers` の **必須参照列**が存在する | **PASS** |
| `reply_wallet_ledgers` の **`stripe_event_id` lookup インデックス**が存在する | **PASS** |
| PostgREST / RPC 可視性（期待する routine と **identity args**） | **PASS** |

**解釈:** 上記は **Production の DB / RPC migration と postflight の検証に限定**する。**アプリ全体 E2E や live smoke の合格を意味しない。**

---

## Hard stop（本フェーズ後も維持）

- **`main` merge はしていない。**
- **Production env は変更していない。**
- **`whsec` / 秘密値は参照・変更していない。**
- **Stripe Production webhook 設定は変更していない。**
- **live smoke / 本番ライブ決済は実施していない。**

---

## Next phase

- **Phase 5-6H** — **app deploy / `main` 整合の readiness レビュー**、または **ブロッカー時のハードニング**。

---

## Future Release Hardening（本 migration 結果の範囲外）

- **Supabase Data API** における **`anon` / `authenticated` 向け GRANT 方針**（RPC を **service_role のみ**に閉じる運用との整合など）は、**別リリースの hardening タスク**として扱う。**Phase 5-6G の成否判定には含めない。**

---

## Related

- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`
- `docs/ssot/M55_PHASE5_6D_PRODUCTION_READONLY_PREFLIGHT_RESULT_2026-05-13.md`
- `docs/ssot/M55_PHASE5_6E_LEDGER_LOOKUP_INDEX_REVIEW_2026-05-13.md`
- `docs/ssot/M55_PHASE5_6C_EXECUTION_START_CHECKPOINT_2026-05-13.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
