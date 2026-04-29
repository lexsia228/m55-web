# M55_REPLY_WALLET_SHADOW_BOOTSTRAP_EXECUTION_PACKET_v1

Status: **Human execution packet** — **この文書は DB を変更しない。** **migration の適用はオーナー／DBA の承認と非本番接続確認のうえ手操作。**  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_SCHEMA_BOOTSTRAP_PLAN_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_ENV_PHASE_A_READINESS_CHECK_v1.md`
- `scripts/sql/staging/m55_reply_wallet_shadow_bootstrap_preflight.sql`
- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`（Phase A、**bootstrap 完了後**）

---

## 1. preflight（`m55_reply_wallet_shadow_bootstrap_preflight.sql` の内容）

**すべて `SELECT` のみ。** ファイルを正。

| ブロック | 内容 |
|----------|------|
| **P0** | `current_database()` — 接続先 DB 名の記録。 |
| **§1** | **`public` のテーブル一覧**（Table Editor 突合用）。 |
| **§2** | **`entitlements` の列一覧**（テーブル無しなら 0 行）。 |
| **§3** | **`stripe_events` / `entitlements` / reply 系 / `dtr_report_snapshots` / `dtr_guest_drafts` / `entitlement_rights` / `one_time_fulfillments` の有無**（真偽フラグ）。 |
| **§4** | **`supabase_migrations` スキーマ内のテーブル一覧**。**`schema_migrations` の中身**はホストにより列名が異なる場合があるため **コメント例のみ** — エラーなら **「N/A」** とチケットに記す。 |
| **§5** | **`entitlements` の行数** — **テーブルが無いときは `NULL`**。**RLS で拒否される環境では別ロール要確認。** |
| **§6** | **`m55_reply_generate_commit` 関数の有無**（任意）。 |

---

## 2. shadow `entitlements` の扱い（意思決定マトリクス）

| 案 | 安全性 | 運用 | 採用目安 |
|----|--------|------|----------|
| **残す** | 速い | **本番 DDL と非一致のまま**なら **Phase A 本線検証 DB にしない**（`READINESS_CHECK`）。 | 一時スモークのみ。 |
| **リネーム** | 衝突回避 | 後から本番型 `entitlements` を作成する余地。**`RENAME` は別承認。** | 本番型を後から入れる場合。 |
| **DROP して再作成** | データ失う | **shadow のみ**で捨て可能なら可。**本番禁止。別承認。** | スキーマを一度きれいにしたいとき。 |
| **プロジェクト作り直し** | 最高の分離 | **新 ref** で `supabase/migrations` を順適用。**コスト大。** | 混乱が大きいとき。 |

**原則:** **本番準拠と証明できない `entitlements` だけの DB は、Phase A の「本番代替証明」には使わない。** bootstrap 完了後に **`m55_reply_wallet_phase_a_nullable_only_staging.sql` PART 1** が通ることは **最低条件**。

---

## 3. bootstrap 候補順序（ファイル参照 — 本文はコマンドを書かない）

**正本:** `M55_REPLY_WALLET_SHADOW_SCHEMA_BOOTSTRAP_PLAN_v1.md` §5。

| 論点 | 内容 |
|------|------|
| **`stripe_events` 前提** | **`20260306000000_phase1_entitlements_ssot.sql` 先頭**は **`stripe_events` に ALTER**。**存在しないと失敗。** — **空の `stripe_events` を本番同形で先に用意**するか、**当該 migration を分割しない限り適用しない**（BOOTSTRAP_PLAN と同じ）。 |
| **推奨チェーンの骨格** | `phase1（前提クリア後）` → invoice / **`one_time_fulfillments`** →（任意 consult）→ **`reply_system_data_layer`** → **`dtr_drafts_and_report_snapshots`** → **`pgrst204` column** → NOTIFY → **`m55_reply_generate_commit` RPC**。 |
| **直接貼れる migration** | **前提テーブルが揃っているものから**のみ。**順不同に SQL Editor で混ぜない。** |

**前提不足で保留:** `stripe_events` 無しのまま **`20260306` を流す**こと。

---

## 4. 実行禁止

- **本番 DB** での preflight / migration / Phase A。  
- **SQL Editor に長文を無秩序に貼る**（**ファイル単位・順序固定**）。  
- **`entitlements` の `DROP` / `RENAME` を承認なしで実行**しない。  
- **service role キー・DB URL・秘密鍵**をチケットやチャットに貼る。  

---

## 5. 成功条件（bootstrap 完了の定義）

| # | 条件 |
|---|------|
| 1 | **§1 preflight** で **`reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` / `dtr_report_snapshots` がすべて `true`**。 |
| 2 | **`m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 1** が **エラーなく完走**（別紙の Phase A packet）。 |
| 3 | **本番データ・PII をインポートしていない**（ダミー／空でよい）。 |
| 4 | **PART 2（nullable `ADD COLUMN`）はまだ別承認** — 本 bootstrap の成功条件に含めない。 |

---

## 6. rollback / 破棄方針

| 状況 | 方針 |
|------|------|
| **shadow 専用 project** | **捨て可能**なら **プロジェクト削除**または **新規作り直し**が最も確実。 |
| **途中失敗** | **PITR／スナップショット**があればリストア。**無ければ**手動 **`DROP`/逆DDL** は依存が逆転しやすい。**オーナー判断で「プロジェクトごと破棄」**も選択肢。 |
| **Branching** を使っている場合 | **ブランチ破棄**で切り離し。**本番親は触らない。** |

---

## 7. 次のステップ（人間）

1. **非本番**で `m55_reply_wallet_shadow_bootstrap_preflight.sql` を実行し、結果をチケット化。  
2. **`stripe_events` / `entitlements` のギャップ**を BOOTSTRAP_PLAN と照合し、`entitlements` の **残す／rename／drop／捨て**を決める。  
3. **承認済み migration** を **順に**適用（**CLI または Dashboard** — 運用統一）。  
4. 再実行 **preflight** → **`phase_a_nullable_only_staging.sql` PART 1** のみ。  

---

## 8. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | shadow bootstrap 実行パケット + preflight SQL 同梱。 |
