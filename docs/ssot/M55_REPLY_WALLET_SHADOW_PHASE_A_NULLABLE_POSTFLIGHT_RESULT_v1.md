# M55_REPLY_WALLET_SHADOW_PHASE_A_NULLABLE_POSTFLIGHT_RESULT_v1

Status: **Evidence SSOT — human-recorded observational artifact** — **この文書の作成のみ行う。** **DB への接続・実行・変更は、このエディタ側では行わない。**  

Recorded date: **2026-04-30**

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_APPLY_GATE_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_BOOTSTRAP_MIGRATION_FILE_AUDIT_v1.md`
- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1.md`（該当する場合）

**秘密鍵・service role・DB URL は記載しない。**

---

## 1. 実施環境

| 項目 | 内容 |
|------|------|
| **対象** | **m55-soul-shadow**（非本番・shadow プロジェクト） |
| **本番 DB** | **触れていない** — 本番への migration／ALTER／DML は実施していない |
| **本番データ・PII** | **投入していない** |
| **shadow の位置づけ** | **最小スキーマ検証および Phase A nullable の smoke 用** — 本番代替証明の完全置換ではない |

---

## 2. 実施済み内容（記録）

| # | 内容 |
|---|------|
| 1 | **正規 migration の適用（リポジトリ `supabase/migrations` 由来）** · `20260416000000_reply_system_data_layer_v1.sql` · `20260420000000_dtr_drafts_and_report_snapshots.sql` · `20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql` |
| 2 | **Phase A における nullable 列追加**（データ型 uuid、NULL 許容のみ）— 対象：**`reply_ticket_wallets.report_instance_id`**、**`reply_wallet_ledgers.report_instance_id`**、**`reply_sessions.report_instance_id`** |
| 3 | **手書き `CREATE TABLE`／手貼り簡易スキーマは使用していない**（`M55_REPLY_WALLET_SHADOW_PREFLIGHT_OBSERVATION_AND_MANUAL_CREATE_REJECTION_v1.md` と整合） |
| 4 | **`entitlements`／`stripe_events` 系 migration（例: 20260306／20260308 周辺）は今回のスコープ外** |
| 5 | **`20260417000000_m55_reply_generate_commit_rpc.sql` は対象外** |

---

## 3. Postflight 結果（観測値）

| 指標 | 値 |
|------|-----|
| **`reply_ticket_wallets` 行数** | **0** |
| **`reply_wallet_ledgers` 行数** | **0** |
| **`reply_sessions` 行数** | **0** |
| **`reply_ticket_wallets` における `report_instance_id` 非 NULL 件数** | **0** |
| **`reply_wallet_ledgers` における `report_instance_id` 非 NULL 件数** | **0** |
| **`reply_sessions` における `report_instance_id` 非 NULL 件数** | **0** |
| **orphan 相当（ウォレットに対し `DTR_CORE_STATIC_V1` snapshot 非存在件数、`wallet_user_without_snapshot_count`）** | **0** |
| **`reply_ticket_wallets` のユーザー一意（`UNIQUE(user_id)`）** | **維持（観測上）** |
| **`reply_ticket_wallets` の主キー（`PRIMARY KEY (id)`）** | **維持（観測上）** |
| **CHECK 制約** | **維持（観測上）** |

制約名の例（報告ソースに準拠）:

- **`reply_ticket_wallets_user_id_key`** — **UNIQUE(user_id)** 維持
- **`reply_ticket_wallets_pkey`** — **PRIMARY KEY(id)** 維持

---

## 4. 判定

| # | 判定 |
|---|------|
| 1 | **shadow における Phase A nullable DDL（上記追加列のみ）は、この観測の範囲で PASS** と記録する。 |
| 2 | **ベースラインデータはいずれも 0 行のため、`UPDATE`／backfill による「既存行の移動」は発生していない**（論理上）。 |
| 3 | **backfill は実施していない。** |
| 4 | **orphan を新規に増やす操作は、この観測では示されない。**（0 起点） |
| 5 | **`UNIQUE(user_id)` を破る変更にはなっていない**（観測上および件数論理）。 |

---

## 5. 限界（本条が証明しないこと）

| # | 限界 |
|---|------|
| 1 | **shadow が全テーブル 0 行のときの検証のみ**であり、**本番規模データ・競合ワークロードでの挙動は証明しない。** |
| 2 | **実データへの backfill が安全であること／スキーマの意味が業務側で保たれることは証明しない。** |
| 3 | **本条は本番 DDL 適用への GO 票ではない。** |
| 4 | **Phase B 以降（NOT NULL、FK、厳密 UNIQUE、本番 backfill 等）への GO ではない。** |

---

## 6. 次の候補（いずれも別承認・本条単体では実行しない）

| # | 候補 |
|---|------|
| 1 | **本番適用前のレビュー用 SSOT**（チェックリスト・ゲート文言）を新規または既存に追記する。 |
| 2 | **shadow に許可済み最小 seed を入れたうえで、nullable 追加後も既存行が保持されること（列が NULL を維持する等）を検証する** — **seed 作成・投入は別承認**。 |
| 3 | **本番側の `ALTER`** および **`UPDATE`／backfill** は本条の結果をもっても **NO-GO のまま** — インフラ・DBA／プロダクトの順次ゲート。 |

---

## 7. 引き続き NO-GO（本条の適用結果をもって解除されない項目）

以下は **本条の結果だけでは自動的には許可されない**。  

- **本番 DB への ALTER／DML／migration 適用**（Phase A nullable を含む）  
- **Phase B および以降の backfill**  
- **NOT NULL 化、`NOT NULL DEFAULT` を伴う DDL**  
- **新規 FK、`strict` に近い UNIQUE 強化、`DEFERRABLE` ではない競合 DDL** — 本条は **nullable のみ** に限定した実施記録である  
- **`604170` RPC および関連 DML が含まれる migration** の本番級適用  
- **`20260306`／`20260308` 系および `entitlements`／`stripe_events` 前提チェーン**の本番相当適用  
- **Stripe での追加課金・請求側の変更**  
- **商品棚 UI の変更**

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-30 | 初版 — m55-soul-shadow Phase A nullable postflight 記録 |
