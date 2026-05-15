# M55_REPLY_WALLET_PHASE_A_PRODUCTION_POSTFLIGHT_RESULT_v1

Status: **Evidence SSOT — DDL 実行記録および読み取りによる検証** — **本条の編集のみ行う。このセッションで DB への接続・変更は行っていない。**  

Recorded date: **2026-05-02**

Execution context (運用側が記録した事実として):

| 項目 | 内容 |
|------|------|
| **環境** | **m55-soul-core** / **`main`**（アプリ運用コンテキスト）/ **PRODUCTION**（DB） |
| **実施済み DDL** | **nullable の `uuid` 列 **`report_instance_id`** を **3 テーブルへのみ**追加 |

Related:

- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_PREFLIGHT_RESULT_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_ALTER_EXECUTION_GATE_v1.md`
- `scripts/sql/production/m55_reply_wallet_phase_a_nullable_production_preflight_postflight.sql`
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1.md`

**秘密鍵・service role・DB URL・生 `user_id` は本章に載せない。** **DDL の全文や `ALTER` のコピペ用ブロックも本章に転記しない。**

---

## 1. 実施内容（スコープの固定）

| # | 内容 |
|---|------|
| 1 | **本番：`reply_ticket_wallets`、`reply_wallet_ledgers`、`reply_sessions` に **`report_instance_id uuid` を NULL 許容で追加**。 |
| 2 | **操作の論理：** **`ADD COLUMN IF NOT EXISTS`** 相当のみ（冪等的なnullable列追加）。 |
| 3 | **含まない：** **DML**（`UPDATE`/`INSERT`/`DELETE`）· **backfill** · **`NOT NULL` 制約追加** · **新規 FK** · **`UNIQUE` の変更**。 |
| 4 | **`entitlements archive` を伴う運用変更なし。** **smoke orphan 向けの修正 DML なし**。 |

---

## 2. Postflight 結果（観測値）

### 2.1 `report_instance_id` 列メタデータ

| テーブル | `data_type` | `is_nullable` |
|----------|--------------|---------------|
| `reply_sessions` | **uuid** | **YES** |
| `reply_ticket_wallets` | **uuid** | **YES** |
| `reply_wallet_ledgers` | **uuid** | **YES** |

### 2.2 行数（preflight ベースラインとの一致）

| テーブル | 観測行数 |
|----------|----------|
| `reply_ticket_wallets` | **8** |
| `reply_wallet_ledgers` | **10** |
| `reply_sessions` | **11** |

### 2.3 `report_instance_id` 非 NULL 件数（Phase A で値は入れない）

| テーブル | 非 NULL 件数 |
|----------|----------------|
| `reply_ticket_wallets` | **0** |
| `reply_wallet_ledgers` | **0** |
| `reply_sessions` | **0** |

### 2.4 既知指標の維持

| メトリクス | 値 |
|------------|-----|
| `wallet_user_without_snapshot_count` | **3** |
| `smoke_orphan_wallet_count` | **3** |
| `wallet_with_dtr_core_snapshot_count` | **5**（**snapshot あり正常コホート** の監視上「5」のまま） |
| `ledger_orphan_count` | **0** |
| `document_orphan_count` | **0** |
| `sessions_without_dtr_core_snapshot_count` | **11** |

### 2.5 制約（観測上）

| 論点 | 結果 |
|------|------|
| **`reply_ticket_wallets`** の **`PRIMARY KEY (id)`** | **維持** |
| **`reply_ticket_wallets`** の **`UNIQUE (user_id)`** | **維持** |
| **CHECK 制約群** | **維持** |

---

## 3. 判定（本条での確定事項のみ）

| # | 判定 |
|---|------|
| 1 | **Production における **Phase A の nullable `report_instance_id` 追加**は、本条の読み取り観点で **PASS** と記録する。** |
| 2 | **DDL のみであり、実行レコード上 **`UPDATE` で既存データを変更した事実はない**（本条の運用ログ前提）。 |
| 3 | **`entitlements` を **archived 等へ一括変更**して権利を止める操作は本条のスコープに含まれない。** **「権利停止を伴う運用」を実施していない**とする（Phase A DDL の単体とは別概念）。 |
| 4 | **orphan 3 件**は **件数上は維持** — **別 SSOT の quarantine／既知 orphan 論点として隔離**。 |
| 5 | **`wallet_with_dtr_core_snapshot_count = 5`** は **保護側コホート件数として変化なく**監査上与えられる（行の内容本文は本条にしない）。 |

---

## 4. 限界（本条が証明しないこと）

| # | 限界 |
|---|------|
| 1 | **Phase B での **`report_instance_id` への backfill が安全であることは未証明**。 |
| 2 | **`report_instance_id` への値投入は実施されていない**。 |
| 3 | **`sessions_without_dtr_core_snapshot_count = 11` は是正済みとは言えず**——**Phase B 以降またはプロダクト設計側の論点**。 |
| 4 | **smoke orphan 3 件**は **manual review／quarantine SSOT と整合して管理**。**本条のみで是正完了とはみなさない**。 |

---

## 5. 引き続き NO-GO（本条の達成だけでは解除しない）

以下は **本条の達成のみをもって GO しない**。  

- **Phase B およびそれ以降の backfill、`report_instance_id` への値投入**  
- **`NOT NULL`、FK、より厳格な UNIQUE** の導入  
- **`entitlements` archive 一括**や **smoke orphan 向け DML「修正」**  
- **`202604170` RPC とそれにひもづく migration の本番相当適用前提の拡張**  
- **`20260306` / `20260308` 系および `stripe_events`/`entitlements` 前提チェーンの本番相当適用**  
- **Stripe での追加課金経路変更**  
- **商品棚 UI の変更**

---

## 6. 次の候補（実行はすべて別ゲート）

| # | 候補 |
|---|------|
| 1 | **Phase A DDL・証跡のリポへコミット**（本条・preflight／postflight と整合する単位のみ）。 |
| 2 | **Phase B を「設計レビューのみ」載せた SSOT 草案**の起案。**実行・backfill はまだ不可**。 |
| 3 | **Stripe 追加課金動線との連携**は **本条の達成のみでは開始しない**。 |

---

## 7. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-05-02 | 初版 — 本番 Phase A nullable 実施後 postflight の証跡 |
