# M55 Phase 5-6E — `reply_wallet_ledgers.stripe_event_id` lookup index review (2026-05-13)

Status: **Hardening review / package amendment only** — **Production には未適用。** **migration candidate は実行していない。** DDL は **リポジトリ正本への追記のみ**。

## Trigger（Phase 5-6D）

- Production read-only preflight **PASS_WITH_REVIEW_NOTE**。
- **SECTION G**: `reply_wallet_ledgers` に **`stripe_event_id` を含むインデックス**が **0 件**（**REVIEW / NON-BLOCKING**）。

## Primary idempotency（変更なし）

- **二重付与防止の本命**は **`stripe_processed_events.stripe_event_id` の UNIQUE（partial UNIQUE 含む）**であり、Phase 5-6D **SECTION F は PASS 済み**。
- 本レビューで追加するインデックスは **UNIQUE ではない** **lookup 用**であり、**primary idempotency の代替にはならない**。

## Ledger index の役割（NON-BLOCKING）

- **`reply_wallet_ledgers.stripe_event_id` 上の非一意インデックス**は、**監査・検索・replay 調査の効率化**向け。
- **SECTION G が 0 行でも即時 STOP にはしない**（6D SSOT と整合）。

## Decision

**今回の Production migration candidate（`m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql`）に、add-only / idempotent な `CREATE INDEX IF NOT EXISTS` を含める。**

- **後続改善に回さない**（同一メンテ窓・同一パッケージ内で DDL 候補を固定する）。
- 実行タイミングは **別 GO の migration 実行手順**に従う（本ドキュメントでは **実行しない**）。

## SQL 正本（候補）

- `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql` 内 **STEP B2**（`m55_idx_reply_wallet_ledgers_stripe_event_id_lookup`）。

## Postflight / preflight

- **preflight** `m55_phase5_production_promotion_readiness_preflight_v1.sql` — **SECTION G** により、適用 **後**の再実行でインデックス検出が可能（適用前の 0 行は許容）。
- **postflight** `m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql` — **SECTION H** を追加し、適用後の **lookup index 存在**を read-only で確認可能。

## Hard stop（維持）

- **Production DB への DDL/DML 実行なし**（本記録時点）。
- **`main` merge なし** / **env・`whsec`・secret なし** / **本番決済なし** / **webhook・RPC 本体の仕様変更なし**（インデックス DDL のみパッケージ追記）。

## Related

- `docs/ssot/M55_PHASE5_6D_PRODUCTION_READONLY_PREFLIGHT_RESULT_2026-05-13.md`
- `docs/ssot/M55_PHASE5_3_PRODUCTION_DB_RPC_PACKAGE_APPROVED_2026-05-12.md`
- `docs/ssot/M55_PHASE5_2_PRODUCTION_DB_RPC_MIGRATION_PACKAGE_REVIEW_2026-05-12.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
