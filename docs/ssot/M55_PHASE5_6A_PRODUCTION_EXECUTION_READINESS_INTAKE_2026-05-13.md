# M55 Phase 5-6A — Production execution readiness intake (2026-05-13)

Status: **Execution readiness intake only** — **実行ではない。** 本シートは **Phase 5-6 Production apply 実行前**の、日時・窓・担当・停止条件・対象ラベルの **記入用テンプレート**である。**Production DB 適用、`main` merge、Production env、`whsec`/秘密、本番決済には触れない。**

## Work anchor

- **Branch:** `work/home-cluster`
- **Current commit（SSOT 定義時点）:** **`b61af91`** — `docs: define production apply explicit GO gate`

## Current GREEN stack

- Phase 1〜4 **GREEN**
- Phase 5-1 readiness **GREEN**
- Phase 5-2 package prepared **GREEN**
- Phase 5-3 package **APPROVED** **GREEN**
- Phase 5-4 final GO planning **GREEN**
- Phase 5-5 explicit GO decision gate **GREEN**

## Hard stop（絶対）

- **Production DB に適用しない**（明示最終 GO まで）
- **`main` に merge しない**
- **Production env を編集しない**
- **`whsec` / 秘密値を要求・貼付・変更しない**
- **本番ライブ決済をしない**
- **Stripe Production webhook を変更しない**（別承認）
- **SQL をこのゲートで実行しない**

---

## A. Execution date / maintenance window

| Field | Value |
|--------|--------|
| Execution date | **TBD** |
| Maintenance start | **TBD** |
| Maintenance end | **TBD** |
| Expected duration | **TBD** |

**Decision:** 上記が **記入・承認されるまで実行しない。**

---

## B. Human roles / owners

| Role | Owner |
|------|--------|
| Final GO owner | **TBD** |
| Production DB executor | **TBD** |
| SQL reviewer | **TBD** |
| Vercel deploy / rollback owner | **TBD** |
| Stripe dashboard / webhook observer | **TBD** |
| Supabase observer | **TBD** |
| Live smoke tester | **TBD** |
| Support / refund responder | **TBD** |

---

## C. Target Production identifiers（ラベルのみ — 秘密値・URL 全文は書かない）

| Item | Label / note |
|------|----------------|
| Production Vercel project / domain | **TBD** |
| Production branch / `main` target | **TBD** |
| Production Supabase project label / ref | **TBD** |
| Production Stripe mode | **live** — **最終 GO 後のみ** |
| Production Stripe webhook endpoint label | **TBD** |
| Production webhook URL | **TBD**（または **ラベル・ホスト名のみ**。全文を SSOT に貼らない） |

**Price lanes**

- DTR base report **¥1,000**
- additional reply ticket **¥500**

**Env 名のみ（値は書かない）**

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

- `scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql`
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`
- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`
- `scripts/sql/production/m55_phase5_4_production_ghost_data_readonly_check_v1.sql`
- `scripts/sql/production/m55_phase5_4_production_live_smoke_readonly_verification_v1.sql`

---

## E. Explicit stop conditions / NO-GO

- Production DB **接続先が特定できない**
- Webhook **endpoint URL** と **env の署名秘密**の **ペアリング**がラベル単位でも確認できない
- **秘密値**がチャット・ドキュメントに **要求または貼付**された
- **worktree がクリーンでない**
- **branch / commit** が合意と一致しない
- **Preflight** が失敗する
- **Migration candidate** がエラーになる
- **Postflight** が失敗する
- **`service_role` EXECUTE** が欠ける
- **RPC** が欠ける
- **ledger 必須列**が欠ける
- **`stripe_processed_events` の unique / index** 問題が未解消
- **PostgREST schema cache** エラー
- **Vercel deploy** が Ready でない
- **legal / support** ページが利用不能
- **rollback オーナー**が不在
- **support / refund 対応者**が不在

---

## F. Kill switch / rollback posture

- **ライブ決済前:** 停止し、**Checkout を露出しない**、**ライブ smoke を走らせない**
- **ライブ決済後:** **Checkout 表面を止める**、Stripe Dashboard を確認、**二重付与を避ける**、必要時 **support / refund 導線**
- **Stripe イベントの盲再送・一括 replay は禁止**
- **Vercel rollback オーナー**は実行前に **必ず指名**
- **最新の検証済み安全参照:** `work/home-cluster` Preview/Shadow Phase 4 **GREEN** および Phase 5 系ドキュメント（**`b61af91`** まで）

---

## G. Final GO statement（人間が手書き・記名）

**以下の文を、Final GO owner がこのセクションにそのまま記載すること。記載がない限り Phase 5-6 を開始してはならない。**

```
I approve Phase 5-6 Production apply execution.
```

- 記載日時: **TBD**
- 署名 / 役割: **TBD**

---

## Related

- `docs/ssot/M55_PHASE5_5_FINAL_EXECUTION_READINESS_EXPLICIT_GO_DECISION_2026-05-13.md`
- `docs/ssot/M55_PHASE5_4_PRODUCTION_APPLY_PLANNING_FINAL_GO_GATE_2026-05-13.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
