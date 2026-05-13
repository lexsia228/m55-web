# M55 Phase 5-6A — Production execution readiness intake (2026-05-13)

Status: **FINAL GO FIELDS FILLED — NOT YET EXECUTED**
Description: 本シートは **Phase 5-6 Production apply execution 前**の、日時・メンテ窓・担当・停止条件・対象Productionラベルを記入済みにした readiness intake である。
**これはProduction実行ではない。** 本シートを保存しても、Production DB適用、`main` merge、Production env編集、`whsec`/秘密値確認、本番決済は開始しない。

Phase 5-6 Production apply execution は、別ゲートで最終確認を行い、Final GO owner が明示的に開始を承認した場合のみ開始できる。

---

## Work anchor

- **Branch:** `work/home-cluster`
- **Current commit:** `b355dba` — `docs: start production execution readiness intake`
- **Execution package state:** Phase 5-3B APPROVED / Phase 5-4 final GO planning GREEN / Phase 5-5 explicit GO gate GREEN / Phase 5-6A intake GREEN

---

## Current GREEN stack

- Phase 1: DTR本体¥1,000 Preview購入後フロー **GREEN**
- Phase 1.5: GREEN証跡化 **GREEN**
- Phase 2: wallet `report_instance_id` 恒久修正 **GREEN**
- Phase 3: 付属1件返書E2E **GREEN**
- Phase 4: 追加返書¥500 Preview E2E **GREEN**
- Phase 5-1: Production readiness gate **GREEN**
- Phase 5-2: Production DB/RPC package prepared **GREEN**
- Phase 5-3: package review **APPROVED / GREEN**
- Phase 5-4: final GO planning **GREEN**
- Phase 5-5: explicit GO decision gate **GREEN**
- Phase 5-6A: execution readiness intake **GREEN / filled for review**

---

## Hard stop（絶対）

- **Production DB に適用しない**（Phase 5-6 execution開始まで）
- **`main` に merge しない**
- **Production env を編集しない**
- **`whsec` / secret / service_role / Stripe secret / Clerk secret の値を要求・貼付・変更しない**
- **本番ライブ決済をしない**
- **Stripe Production webhook を変更しない**
- **SQL をこのGateで実行しない**
- **Final GO文の正式記録だけで、自動的に実行へ進まない**
- **Phase 5-6 execution は別ゲートで開始確認する**

---

## A. Execution date / maintenance window

| Field | Value |
|---|---|
| Execution date | **2026-05-14 (JST)** |
| Maintenance start | **02:00 AM (JST)** |
| Maintenance end | **04:00 AM (JST)** |
| Expected duration | **120 minutes** |

**Decision:** Tentatively scheduled. Production execution is still **NOT executed** and must not begin until Phase 5-6 execution start is separately confirmed.

---

## B. Human roles / owners

| Role | Owner |
|---|---|
| Final GO owner | **lexsia (Project Lead / Owner)** |
| Production DB executor | **lexsia** |
| SQL reviewer | **lexsia, assisted by Gemini / ChatGPT audit** |
| Vercel deploy / rollback owner | **lexsia** |
| Stripe dashboard / webhook observer | **lexsia** |
| Supabase observer | **lexsia** |
| Live smoke tester | **lexsia** |
| Support / refund responder | **lexsia** |

**Note:** Single-operator mode is accepted for this release. All roles are owned by lexsia, with AI audit used as review support only. Final accountability remains with lexsia.

---

## C. Target Production identifiers（Non-Secret）

| Item | Label / note |
|---|---|
| Production Vercel project / domain | **m55-webv2 / m55-soul.jp (Production / Primary)** |
| Production branch / `main` target | **origin/main** |
| Production Supabase project label / ref | **m55-soul-core / Production DB / ref redacted** |
| Production Stripe mode | **live** — **only after final explicit execution start** |
| Production Stripe webhook endpoint label | **m55-production-webhook-endpoint** |
| Production webhook URL label | **m55-soul.jp /api/stripe/webhook** (`whsec` not recorded) |

**Price lanes**

- DTR base report: **¥1,000**
- additional reply ticket: **¥500**

**Env names only（値は書かない）**

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

---

## D. Approved package paths

The following package paths are approved for future Production apply **only after explicit execution start**:

- `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql`
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`
- `scripts/sql/production/m55_phase5_4_production_ghost_data_readonly_check_v1.sql`
- `scripts/sql/production/m55_phase5_4_production_live_smoke_readonly_verification_v1.sql`

**Do not run in Production**

- `scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql`
- any Shadow/Test manual backfill
- any unreviewed DML
- any SQL not listed in the approved package paths above

---

## E. Explicit stop conditions / NO-GO

Phase 5-6 execution must stop or must not start if any of the following occurs:

- Production DB接続先が特定できない
- Webhook endpoint URL と env上の署名秘密のペアリングがラベル単位でも確認できない
- 秘密値がチャット・ドキュメントに要求または貼付された
- worktree がクリーンでない
- branch / commit が合意と一致しない
- Preflight が失敗する
- Migration candidate がエラーになる
- Postflight が失敗する
- `service_role` EXECUTE が欠ける
- `public.m55_reply_ticket_fulfill_checkout_event` RPC が欠ける
- `reply_wallet_ledgers` 必須列が欠ける
- `reply_ticket_wallets.report_instance_id` が欠ける
- `stripe_processed_events` の unique / index 問題が未解消
- PostgREST schema cache エラー
- Vercel deploy が Ready でない
- legal / support ページが利用不能
- rollback owner が不在
- support / refund responder が不在
- 本番決済後に Webhook が 4xx / 5xx を返す
- Stripeイベントの再送・replay判断が曖昧なまま進行しようとしている

---

## F. Kill switch / rollback posture

### 基本方針

- destructive rollback を既定にしない
- まず停止、観測、read-only確認、原因特定を優先する
- DBへ逆向きSQLを即実行しない
- Stripeイベントを盲目的に replay / 再送しない

### Before live payment

- Stop and do not expose checkout
- Do not run live smoke
- Confirm Vercel deployment status
- Confirm Production DB/RPC/postflight result
- If app deploy is the issue, use Vercel rollback path
- If DB/RPC is the issue, stop before live smoke and inspect preflight/postflight results

### After live payment

- Stop checkout surface
- Inspect Stripe Dashboard
- Avoid duplicate grants
- Confirm `stripe_events` / `stripe_processed_events` idempotency state
- Use support / refund path if needed
- Do not blindly replay Stripe events
- Do not create another live purchase until the incident is closed

### Vercel rollback

- Vercel deploy / rollback owner: **lexsia**
- Rollback target: latest known stable Production deployment, to be confirmed in Vercel Dashboard before execution
- If rollback is used, record the deployment label / commit in the next incident SSOT

### Latest verified safe reference

- `work/home-cluster` Preview/Shadow Phase 4 GREEN
- Phase 5 docs through:
  - `fce13d2` Phase 4 GREEN checkpoint
  - `ffdf078` Phase 5-1 readiness gate
  - `11f77e8` Phase 5-2 package prepared
  - `6e603d9` preflight hardening
  - `8a382e7` package approved
  - `2b237cb` final GO planning
  - `b61af91` explicit GO decision gate
  - `b355dba` execution readiness intake

---

## G. Final authorization record

Status: **NOT YET EXECUTED**

The following exact statement has been prepared as the required final authorization phrase. It must be treated as **not sufficient by itself** to begin execution unless Phase 5-6 execution start is separately confirmed in the next gate.

Required final authorization phrase:

`I approve Phase 5-6 Production apply execution.`

| Field | Value |
|---|---|
| Authorization statement | **PREPARED — NOT EXECUTED** |
| Authorization date | **TBD** |
| Signed by / role | **TBD** |

**Decision:** Phase 5-6 Production apply execution must not begin until a separate Phase 5-6 execution start gate confirms that this authorization is actively invoked.

---

## H. Future execution sequence after explicit Phase 5-6 start

Execution sequence is fixed as follows, but must not be run in this intake gate:

1. Confirm clean worktree
2. Confirm branch / commit / target Production labels
3. Confirm maintenance window is open
4. Confirm rollback owner and support/refund responder are available
5. Confirm Production DB target label
6. Run Production preflight:
   - `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql`
7. If and only if preflight PASS, run migration candidate:
   - `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`
8. Run postflight:
   - `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`
9. Confirm PostgREST schema reload / RPC visibility
10. Align app deploy / `main` separately
11. Confirm Vercel Ready
12. Confirm legal / support routes
13. Live smoke requires separate approval
14. After live smoke, run:
   - `scripts/sql/production/m55_phase5_4_production_live_smoke_readonly_verification_v1.sql`

---

## I. Production live smoke scope（separate approval required）

Live smoke is not approved by this file. If separately approved, it must cover both product lanes:

### Lane A — DTR base report ¥1,000

Expected checks:

- Checkout completes
- `/api/stripe/webhook` returns 200
- `entitlements` / `entitlement_rights` are granted
- `dtr_report_snapshots` is created
- `reply_ticket_wallets.report_instance_id` links to snapshot
- UI shows paid report unlocked
- consultation room shows remaining 1

### Lane B — additional reply ticket ¥500

Expected checks:

- Additional reply checkout completes
- `/api/stripe/webhook` returns 200
- `stripe_processed_events` records idempotency
- `reply_ticket_wallets.purchased_count` increments
- `reply_ticket_wallets.available_count` increments
- `reply_wallet_ledgers` records `purchase_grant`
- UI shows remaining +1
- purchased reply can be sent
- consult messages persist
- remaining count returns to expected value

---

## J. Compliance / support route check

Before live smoke, confirm route availability:

- `/legal/tokushoho`
- `/legal/refund`
- `/legal/privacy`
- `/legal/terms`
- `/support`
- `/dtr/lp`
- `/dtr/core`

Checks:

- price consistency for ¥1,000 and ¥500
- refund/support consistency
- no broken legal/support links
- support/refund responder available

---

## Related

- `docs/ssot/M55_PHASE5_5_FINAL_EXECUTION_READINESS_EXPLICIT_GO_DECISION_2026-05-13.md`
- `docs/ssot/M55_PHASE5_4_PRODUCTION_APPLY_PLANNING_FINAL_GO_GATE_2026-05-13.md`
- `docs/ssot/M55_PHASE5_3_PRODUCTION_DB_RPC_PACKAGE_APPROVED_2026-05-12.md`
- `docs/ssot/M55_PHASE5_2_PRODUCTION_DB_RPC_MIGRATION_PACKAGE_REVIEW_2026-05-12.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`