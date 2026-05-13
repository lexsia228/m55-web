# M55 Phase 5-6D — Production read-only preflight result (2026-05-13)

Status: **Evidence / traceability only** — **Production スキーマ・データを変更しない。** 本ドキュメントは **read-only preflight** の結果記録である。**証跡化のみ。**

## Overall verdict

**PASS_WITH_REVIEW_NOTE**

---

## Production target label

- **m55-soul-core / PRODUCTION**

---

## What was run

- **Only** the approved **SELECT / read-only** Production preflight script（`scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql` に相当する手順）。
- **No** migration candidate。
- **No** DDL / DML。
- **No** `main` merge。
- **No** Production env / **`whsec`** / secret の変更・参照出力。
- **No** live payment。

---

## Section results（A〜G）

| Section | Focus | Result |
|---------|--------|--------|
| **A** | Required public tables | **PASS** |
| **B** | `reply_wallet_ledgers` required columns | **PASS** |
| **C** | `reply_ticket_wallets` `report_instance_id` / report-scoped wallet index | **PASS** |
| **D** | `m55_reply_ticket_fulfill_checkout_event` RPC exists | **PASS** |
| **E** | `service_role` EXECUTE on RPC | **PASS** |
| **F** | `stripe_processed_events` `stripe_event_id` unique index | **PASS** |
| **G** | `reply_wallet_ledgers` `stripe_event_id` index | **REVIEW / NON-BLOCKING** |

---

## SECTION G — Review note（非ブロッキング）

- Preflight の **SECTION G** は、`reply_wallet_ledgers` に **`stripe_event_id` 用インデックス**が見つかる想定の検査に対し、**0 行**（該当インデックスなし）を返した。
- **即時ブロッカーではない。** 主キー的な **冪等性**は **`stripe_processed_events.stripe_event_id` の UNIQUE インデックス**でカバーされている。
- **監査・replay 探索の効率**の観点では、`reply_wallet_ledgers` 側の **`stripe_event_id` インデックスの要否**を **Phase 5-6E**（migration candidate 実行前）で **人間が判断**すること。**migration candidate 実行前に決定が必要。**

---

## Hard stop（本結果時点でも維持）

- **migration candidate は未実行**のままとする。
- **DDL / DML を Production に適用しない**（本証跡以降も、別 GO まで）。
- **`main` merge しない。**
- **Production env / `whsec` / secret を変更・露出しない。**
- **本番ライブ決済をしない。**

---

## Next phase

- **Phase 5-6E（完了）** — パッケージ hardening のみ（**Production 未実行**）。詳細: `docs/ssot/M55_PHASE5_6E_LEDGER_LOOKUP_INDEX_REVIEW_2026-05-13.md`。
- **migration candidate 実行**は **別明示 GO** のみ（本証跡では開始しない）。

---

## Resolution（Phase 5-6E / パッケージ正本）

- **判定:** `reply_wallet_ledgers.stripe_event_id` の **非一意 lookup インデックス**を **今回の migration candidate に含める**（`CREATE INDEX IF NOT EXISTS`、データ行は変更しない）。
- **正本:** `scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql` **STEP B2**；postflight **SECTION H** で read-only 確認可能。

---

## Related

- `docs/ssot/M55_PHASE5_6C_EXECUTION_START_CHECKPOINT_2026-05-13.md`
- `docs/ssot/M55_PHASE5_6A_PRODUCTION_EXECUTION_READINESS_INTAKE_2026-05-13.md`
- `docs/ssot/M55_SYSTEM_SSOT.md`
