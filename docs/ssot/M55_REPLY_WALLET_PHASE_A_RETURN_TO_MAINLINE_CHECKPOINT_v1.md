# M55_REPLY_WALLET_PHASE_A_RETURN_TO_MAINLINE_CHECKPOINT_v1

Status: **Checkpoint SSOT** — **DB 変更なし・SQL 実行なし**。混線の整理と本線の再開条件の正本。  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_UNSAFE_ARCHIVE_SQL_REJECTION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_MINIMAL_BACKFILL_VERIFICATION_OBSERVATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_ONLY_EXECUTION_PACKET_v1.md`
- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`
- `docs/ssot/M55_SUPABASE_NON_PROD_DB_STRATEGY_FOR_REPLY_WALLET_MIGRATION_v1.md`

---

## 1. 現在の確定事項

| 項目 | 状態 |
|------|------|
| **一括 `entitlements` archived 等の広条件案** | **`M55_REPLY_WALLET_UNSAFE_ARCHIVE_SQL_REJECTION_v1` で正式 REJECT**。 |
| **orphan 3 件** | **`manual_review_quarantine` / `legacy_protected`**。**migration の自動 backfill から除外**。 |
| **「正常」とみなすべき購入済み側** | **保護対象**（本番実測における **snapshot あり**の stripe 系ユーザー群）。 |
| **`wallet_user_without_snapshot_count`** | **3 が観測済み**（minimal verification と整合）。 |
| **Gemini「1 件 Backfill 成功」報告** | **M55 正本では未採用**（現 DB 実測との整合取りを優先）。 |
| **`entitlements` を本番で一括 archived** | **禁止**（上記 REJECTION SSOT）。 |

**Phase A（nullable 列追加）と entitlements archive 論は別系統** — 混同しない。

---

## 2. 本線として残る作業（reply wallet migration / Phase A）

| 順 | 内容 |
|:--:|------|
| 1 | **非本番 Supabase** の確保（**Branching／Preview／shadow staging** のいずれか。方針: `M55_SUPABASE_NON_PROD_DB_STRATEGY_*`）。 |
| 2 | **`m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 1**（preflight、**読み取りのみ**）を **非本番**で実行可能にする準備。**本番では実行しない。** |
| 3 | PART 2（nullable **`ADD COLUMN`**）は **非本番**かつ **`PHASE_A_NULLABLE_ONLY_EXECUTION_PACKET` と別承認**後のみ。 |
| 4 | **Phase B 以降**（backfill、NOT NULL、FK、UNIQUE 置換、`report_instance_id` を埋める処理等）は **`MIGRATION_PLAN` と orphan ゲートに従い NO-GO**（現時点）。 |

---

## 3. 本線から外す作業（混線していたもの）

以下は **この checkpoint の後も本線の一部としない**。必要なら **別監査チケット・別承認**。  

| 項目 |
|------|
| **`entitlements` の一括 archive**（広条件での権利状態変更）。 |
| **orphan 3 件の推測に基づく削除**。 |
| **snapshot / entitlement_rights / one_time_fulfillments を推測で作成**。 |
| **本番の SQL Editor** で Phase A（PART 1〜4 を含む）を **検証環境確認なしで**実行すること。 |
| **Stripe の追加課金**、**商品棚 UI 変更**。 |

---

## 4. 非本番環境ゲート（「ここが無いと進まない」）

| # | 条件 |
|---|------|
| 1 | **Supabase Branching / Preview Branch**、または **shadow／staging の独立 project** が存在し、運用として **本番と区別できる**こと。**`main`/PRODUCTION 単独を検証環境として使わない。** |
| 2 | **project ref が本番と異なる**こと（文字列レベルで突合済み）。 |
| 3 | **スキーマは本番に準じる**こと — **簡易テーブルだけの shadow** は **構文試験に留め、本番安全性の証明には使わない**（`UNSAFE_ARCHIVE` 否認理由と同旨）。 |
| 4 | **バックアップ／破棄方針**がチームで一言でもよいので存在すること。 |

---

## 5. Phase A 再開条件（本線の GO ライン）

次を **すべて満たす**と、**「Phase A 本線に戻した」**とみなす（**DDL の実行命令ではない** — 条件の列挙）。

| # | 条件 |
|---|------|
| 1 | **非本番 DB** が **Dashboard／許可リストで確認済み**。 |
| 2 | **本番 project ref と一致しない**ことが記録されている。 |
| 3 | **`m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 1** が **その非本番**で **実行可能**（接続・権限・スキーマが揃う）。 |
| 4 | **PART 2** は **PART 1 記録直後に自動では走らせない**。**別承認**が付くまで NO-GO。 |
| 5 | **PART 3** は **PART 2 適用後**にのみ（列が存在する前提）。 |
| 6 | **PART 4（rollback 案）** は **別承認**。 |

**Phase B 以降**は **従前の migration SSOT の NO-GO のまま** — 本 checkpoint で解除しない。

---

## 6. 次の最小作業（人間アクション）

1. **Supabase Dashboard** で **Branching（または同等）が利用可能か**を確認する（オーナー権限）。  
2. **可能なら** — **Preview Branch** を **手順書どおり**作成（**本章はボタン操作を代替しない**）。  
3. **不可能なら** — **shadow／staging project** の **本番準拠スキーマ構築**を `M55_SUPABASE_NON_PROD_DB_STRATEGY_*` に沿って起票。  
4. 上記が整い次第 — **非本番で PART 1 のみ**（**PART 2 コメントは触らない**）。  

---

## 7. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | Phase A 本線復帰 checkpoint；混線整理。 |
