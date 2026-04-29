# M55_REPLY_WALLET_SHADOW_SCHEMA_BOOTSTRAP_PLAN_v1

Status: **Bootstrap plan only** — **DB に適用しない・SQL を実行しない。** `m55-soul-shadow` を **Phase A nullable-only 検証**に使えるスキーマへ近づけるための **migration リストと順序・リスクの正本。**  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_ENV_PHASE_A_READINESS_CHECK_v1.md`
- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_ONLY_EXECUTION_PACKET_v1.md`

---

## 1. 現状

| 項目 | 内容 |
|------|------|
| **`m55-soul-shadow`** | Table Editor 上 **`public.entitlements` のみ**。 |
| **`reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` / `reply_documents`** | **確認できない。** |
| **`dtr_report_snapshots` / `entitlement_rights` / `one_time_fulfillments`** | **確認できない。** |
| **Phase A 検証** | **`SHADOW_ENV_PHASE_A_READINESS` で NO-GO** のまま。 |
| **本番 DB** | **代替実行しない**（読み書きとも）。 |

---

## 2. Phase A 検証に「最低限」関わるテーブル／オブジェクト

`m55_reply_wallet_phase_a_nullable_only_staging.sql` の **PART 1** が **直接**触るもの（**存在必須**）：

| オブジェクト |
|--------------|
| `public.reply_ticket_wallets` |
| `public.reply_wallet_ledgers` |
| `public.reply_sessions` |
| `public.dtr_report_snapshots`（**空でもよい**。列があること） |

**PART 2** はこれらへの **`report_instance_id uuid` の nullable `ADD`**（および将来の検証での `reply_documents` を見ること）。

**移行監査として本番準拠に「揃えたい」**対象（PART 1 には **必ずしも出てこない**が、アプリ経路との整合確認に有用）：

| オブジェクト |
|--------------|
| `public.reply_documents` |
| `public.dtr_guest_drafts` |
| `public.entitlement_rights` |
| `public.one_time_fulfillments` |
| `public.entitlements`（アプリ FK／Webhook との関係。**リポジトリに CREATE が無い** — §3 参照） |
| **`CREATE FUNCTION m55_reply_generate_commit`**（smoke で consume を試すとき） |

**任意（アプリ機能の広さ次第）:** `consult_threads` / `consult_messages`、`invoice_dtr_grants`、`purchases` / `subscriptions` 等は **Phase A PART 1 の成否とは独立**でもよいが、本番準拠度を上げるなら順次。

---

## 3. `supabase/migrations/` にあるファイルと、作られるもの／依存／shadow 側 `entitlements` との関係

**時系列（ファイル名）順**。本文は **SQL を転載しない**（ファイルを正）。

| ファイル（リポジトリ） | 主な作成・変更 |
|------------------------|----------------|
| **`20260306000000_phase1_entitlements_ssot.sql`** | `purchases`, `subscriptions`, **`entitlement_rights`**。**冒頭で `stripe_events` に `ALTER`。** **`stripe_events` が無いと失敗する。** |
| **`20260306100000_premium_invoice_dtr_grants.sql`** | `invoice_dtr_grants`。 |
| **`20260308000000_one_time_checkout_fulfillment.sql`** | **`one_time_fulfillments`**、`failed_fulfillments`。 |
| **`20260325000000_consult_room.sql`** | **`consult_threads`**, **`consult_messages`**。 |
| **`20260416000000_reply_system_data_layer_v1.sql`** | **`reply_sessions`**（先）、**`reply_ticket_wallets`**, **`reply_documents`**, **`reply_wallet_ledgers`**（順序・FK はファイル内依存）。 |
| **`20260420000000_dtr_drafts_and_report_snapshots.sql`** | **`dtr_guest_drafts`**, **`dtr_report_snapshots`**（`checkout_session_id` 等）。 |
| **`20260421000000_dtr_postgrest_schema_reload.sql`** | `NOTIFY pgrst, 'reload schema'`（運用環境のみ意味あり）。 |
| **`20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql`** | `dtr_guest_drafts.extra_json`、`dtr_report_snapshots.draft_snapshot` の **追加**。 |
| **`20260417000000_m55_reply_generate_commit_rpc.sql`** | **`m55_reply_generate_commit`**。**`reply_*` と `reply_documents`** が先行で必要。末尾に **`reply_ticket_wallets` の smoke INSERT** が含まれる（本番とは別環境での衝突に注意）。 |

**`CREATE TABLE IF NOT EXISTS public.entitlements` は本リポジトリの migrations には無い。** コメント上は **`stripe_events` / `entitlements` と「併存」** とあるのみ。shadow の **`entitlements` は別経路で作られた簡易定義である可能性が高く**：

| リスク | 説明 |
|--------|------|
| **名前は同じでも列／制約／FK が本番と非一致** | 後続のアプリまたは将来 migration と **結合しない。** |
| **本番準拠にするには** | 本番の **`information_schema` との差分**か、**承認付きでのテーブル作り替え／別プロジェクト作成** が必要（**本番データのコピペはしない**）。 |

---

## 4. Bootstrap 方針（運用レイヤーの決定事項）

| 論点 | 推奨の考え方（本文は強制しない — オーナー判断） |
|------|--------------------------------------------------|
| **既存 shadow の単体 `entitlements`** | **本番 DDL と完全一致が証明できない限り、「正」にしない。** 選択肢: **(a)** 監査保管したうえ **`DROP`/再作成は別承認のみ**、(b) **名前衝突を避けるため一旦リネーム**してから正規 migration で再構築、**(c)** **捨て shadow を新規**し **`supabase/migrations` を上から順に**適用。 |
| **既存データ** | shadow は **検証・テスト用** とみなす。**保持必須でない**。**本番データ・PII を持ち込まない。** |
| **最小 seed** | **Phase A PART 1 が `SELECT` で終わればよいなら row 無しでも可。** smoke で RPC を叩く場合は **`m55_reply_generate_commit` が期待するような wallet／session が最低限ある程度**（ファイル末尾の smoke ユーザーは **本番と衝突しない名前**に調整する前提が migration コメントにある）。 |

---

## 5. 適用順序案（**本稿は実行命令ではない**）

### 5.1 前提条件（停止条件）

- **`stripe_events` が無い**場合 **`20260306000000` の先頭 `ALTER stripe_events` は失敗する。**  
  - **対応案:** 本番と同形の **`stripe_events` を先に用意する**（**空でよい**）か、**当該 migration を分割適用**（**DBA／オーナー承認**）。**無策のまま流さない。**  
- **`entitlements` が簡易定義のまま**残ると、後から本番型の **FK／アプリ**と食い違う。**「捨てる／作り直す／差分吸収」のいずれかを文書化してから。**

### 5.2 推奨する **ファイル名の順**（ギャップ解消後）

1. **`stripe_events` 等の前提テーブル**（本リポジトリ外の DDL または本番からの **非データ**スキーマエクスポートのみ — **PII 禁止**）  
2. **`20260306000000_phase1_entitlements_ssot.sql`**（前提 OK 時）  
3. **`20260306100000_premium_invoice_dtr_grants.sql`**  
4. **`20260308000000_one_time_checkout_fulfillment.sql`**  
5. **`20260325000000_consult_room.sql`**（不要なら **スキップ可** — Phase A の PART 1 には不要）  
6. **`20260416000000_reply_system_data_layer_v1.sql`** — **reply 系一式**  
7. **`20260420000000_dtr_drafts_and_report_snapshots.sql`** — **DTR スナップショット／guest drafts**  
8. **`20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql`**  
9. **`20260421000000_dtr_postgrest_schema_reload.sql`** および **`202604220`** 末尾の **`NOTIFY`**（ホストが PostgREST を取り込む環境のみ）  
10. **`20260417000000_m55_reply_generate_commit_rpc.sql`**  

**適用単位:** Supabase **`supabase db push`** 運用または **SQL Editor でファイル単位**。**本番とは別プロジェクトのみ。**

### 5.3 Rollback 方針（概念）

- **途中失敗:** スナップショット復元または **プロジェクト放棄**（shadow が捨て可能なとき）。  
- **列／テーブル単位での手動 DROP** は依存順が逆になりうる。**テンプレ DDL は本章に書かない。**

### 5.4 適用後の Table Editor 確認（人間チェックリスト）

| 項目 |
|------|
| `reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` / `reply_documents` が **存在**する。 |
| `dtr_report_snapshots` が **存在**し、**§2 と列が一致する**（`draft_snapshot` 等）。 |
| `entitlement_rights` / `one_time_fulfillments` が **存在**（適用順を踏んだ場合）。 |
| **`m55_reply_generate_commit` が関数一覧に見える。**（適用済み場合） |

---

## 6. Phase A に進める条件（shadow 側）

次をすべて満たすこと。**本番 DB は触らない。**

| # | 条件 |
|---|------|
| 1 | **§2 の必須テーブルがすべて存在**する。 |
| 2 | **`m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 1** が **`SELECT` のみエラーなく**完走できる。 |
| 3 | **PART 2**（nullable **`ADD COLUMN`）は **別承認** — 自動では進めない。 |
| 4 | **project ref が本番と異なる**こと、実行ログが staging/shadow と分かること。 |

---

## 7. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | soul-shadow の schema bootstrap 順序草案。 |
