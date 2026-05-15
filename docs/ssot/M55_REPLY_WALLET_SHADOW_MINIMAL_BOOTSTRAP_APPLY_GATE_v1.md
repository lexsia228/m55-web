# M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_APPLY_GATE_v1

Status: **Pre-apply gate — human checklist** — **この文書は DB を変更しない。** **適用実行はチェックリスト全項目を満たしたオーナーの手操作のみ。**  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_BOOTSTRAP_MIGRATION_FILE_AUDIT_v1.md`（静的監査・正）
- `docs/ssot/M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_RUNBOOK_v1.md`（運用手順）
- `scripts/sql/staging/m55_reply_wallet_shadow_bootstrap_preflight.sql`
- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`

**本文は実行可能 SQL を含まない。** **秘密鍵・service role・DB URL は記載・共有しない。** **本番 DB には一切接続しない。**

---

## 1. 適用対象（正規 migration のみ）

| # | migration ファイル（`supabase/migrations/`） |
|---|------------------------------------------------|
| 1 | `20260416000000_reply_system_data_layer_v1.sql` |
| 2 | `20260420000000_dtr_drafts_and_report_snapshots.sql` |
| 3 | `20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql` |

| 項目 | 扱い |
|------|------|
| **`20260421000000_dtr_postgrest_schema_reload.sql`** | **今回は原則省略。** **`202604220` 末尾に PostgREST 再読込通知が含まれるため。** キャッシュ不整合が疑われるときのみ **任意追加** — `RUNBOOK` の二重 NOTIFY 論点に従う。 |

---

## 2. 適用しないもの

| 区分 | 内容 |
|------|------|
| **RPC・シード混入** | `20260417000000_m55_reply_generate_commit_rpc.sql` |
| **entitlement／Stripe 土台依存** | `20260306000000_phase1_entitlements_ssot.sql`、`20260308000000_one_time_checkout_fulfillment.sql` |
| **`entitlements`／`stripe_events` を狙うチェーンその他** | Phase A minimal のスコープ外にある migration は対象にしない。 |
| **手書き DDL** | **手書き `CREATE TABLE`／手貼り簡易スキーマ** — `docs/ssot/M55_REPLY_WALLET_SHADOW_PREFLIGHT_OBSERVATION_AND_MANUAL_CREATE_REJECTION_v1.md` と同旨。 |

---

## 3. 実行前チェック（すべて YES でないとゲートしない）

| # | チェック項目 | 備考 |
|---|----------------|------|
| 1 | **Supabase ダッシュボード（または許可済みコンソール）が m55-soul-shadow と判断できる状態である** | **project ref／名称を人間が目視照合。** |
| 2 | **本番 project ではない** | **本番用 URL・credential・ラベルと混線していない。** |
| 3 | **Table Editor（または読み取りのみの preflight）で、現状が `entitlements` 中心に限り近い**ことを確認済み | **大幅に既存テーブルが多いときは適用中止し差分確認。** |
| 4 | **失敗時に shadow を捨て直せる** | **許可済みプロジェクト作成／ブランチ再構築等。** |
| 5 | **service role／DB の接続文字列／secrets をチャットやチケットに貼らない** | **自分だけが安全経路から使用。** |
| 6 | **適用順序を守る約束**がオペレータに共有可能 | **順不同・結合テキストでの貼り付けは禁止。** **`RUNBOOK` §5 順。** |

---

## 4. 適用順序（変更禁止）

| 順序 | ファイル |
|------|----------|
| 第1 | `20260416000000_reply_system_data_layer_v1.sql` |
| 第2 | `20260420000000_dtr_drafts_and_report_snapshots.sql` |
| 第3 | `20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql` |

**`20260421000000_dtr_postgrest_schema_reload.sql` は今回ゲートにおいては原則不要**（§1）。任意追加のみ。

---

## 5. 各 migration 適用直後の確認（次ファイルに進む前）

| 段階 | 確認内容 |
|------|-----------|
| **`604160` 後** | **`reply_ticket_wallets`、`reply_wallet_ledgers`、`reply_sessions`、`reply_documents`** が **`public`** に存在する。** |
| **`604200` 後** | **`dtr_guest_drafts`、`dtr_report_snapshots`** が **`public`** に存在する。** |
| **`604220` 後** | **追加列論点が `IF NOT EXISTS` 済みでありエラーなく完走。**（監査済み：**`extra_json`**（guest）／ **`draft_snapshot`**（snapshot）— 詳細は `BOOTSTRAP_MIGRATION_FILE_AUDIT`。） **`NOTIFY`** まで問題なし。** |
| **共通** | **いずれかの段階でエラーが出たら即 STOP。** ログを記録。**続行しない。** |

読み取り手段は Table Editor、`information_schema` 相当、`preflight` スクリプトの該当 `SELECT` 等 — **環境許可に合わせ選択。**

---

## 6. STOP 条件（即中断・適用しない）

| # | STOP |
|---|------|
| 1 | **接続先が本番に見える。** または **確信が持てない。** |
| 2 | **`gen_random_uuid()` 等で実行エラー。**（監査：**明示 `CREATE EXTENSION` は対象ファイルに無し。** DB 側が極端に古いなど。） |
| 3 | **既存 `entitlements` 等との名前・権限・RLS の衝突**で応答できないとき。 |
| 4 | **migration が想定どおり適用終了しない**とき。 |
| 5 | **手書き SQL で穴埋めすることが必要になりそう**とき。 |
| 6 | **リポから migration ファイルを途中で編集／切り詰めたくなる**とき — **しない。** **`RUNBOOK`／監査との齟齬ならゲートしない。** |

---

## 7. 成功後の次工程（論理順）

| # | 工程 |
|---|------|
| 1 | **`m55_reply_wallet_shadow_bootstrap_preflight.sql` を再度実行（読み取りのみ）。** — 状態をログ化。 |
| 2 | **`m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 1 のみ**を **適用可否の評価対象として**実行候補とする。実運用は本条ゲートとは別に、PART 1 が **SELECT のみ**であることを満たしてから実行。**PART 2（nullable 列の追加）は本条のゲート対象に含めない — 別承認。** |

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-29 | 初版 — shadow minimal bootstrap 直前の最終ゲート |
