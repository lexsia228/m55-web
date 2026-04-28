# M55_REPLY_WALLET_STAGING_RUNBOOK_HARDENING_REVIEW_v1

Status: Review / hardening checklist — **no DB execution** from this document alone.  

Date: 2026-04-28  

Related:

- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_MIGRATION_RUNBOOK_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE0_PREFLIGHT_EXECUTION_PREP_v1.md`
- `scripts/sql/staging/m55_reply_wallet_report_instance_scope_staging_packet.sql`
- `scripts/sql/staging/m55_reply_wallet_report_instance_phase0_only.sql`（Phase 0 のみ分離）

Owner: M55 / Reflect Note by M55

---

## 1. 目的

`STAGING_MIGRATION_RUNBOOK_v1` と Phase 0 read-only SQL に **実行前に潰せる見落とし**がないか検証し、**文書と Phase 0 の `SELECT` のみ**を補強した。DDL/DML は追加していない。

---

## 2. 追加・反映した監査観点サマリ

| 観点 | 対応 |
|------|------|
| **A 環境取り違え** | Dashboard の **project ref / name / URL host**、**実行者**、与本番 ref **一致・不明なら STOP**、SQL Editor の **人間確認手順**。**`.env` や秘密を文書に載せない**。 |
| **B wallet 残高** | `CHECK` 不一致（理論上 DB では発生しにくいが検出）、負数、`consumed` 上限超過、**status**、`created_at`/`updated_at` の NULL。 |
| **C ledger** | wallet 欠損（既存）、`reply_consume` で `reply_session_id` NULL（理論上 CHECK で抑止）、grant で `source_of_grant` NULL（**追跡弱化**）、**wallet 末尾 `balance_after` と `available_count` の差**（ヒューリスティック）、**ledger 行 0 件のままカウンタ非ゼロ**、**`event_type`/`balance_after` の NULL はスキーマで抑止**（検出クエリは二重確認用）。 |
| **D snapshot / entitlement** | `user_id`/`product_id` NULL（スキーマ NOT NULL）、Entry Report 重複、`wallet`↔`snapshot` 双方向、`entitlement_rights(right_key='m55_p:core_origin')` と snapshot の片方欠け、**`one_time_fulfillments`** と snapshot の `checkout_session_id` 突合。 |
| **E session / document** | document 無し session（設計上許容）、document→session orphan、**session.user_id と document.user_id 不一致**、Entry snapshot 無い user の session 件数、将来 backfill で困りそうなパターンは **コメントで限定**（厳密定義は APP 側）。 |
| **F Phase F/G** | **本番コード接続中の DB では F/G 禁止**、**isolated staging / 捨て dev / リストア可能 DB のみ**、RPC 等なしの本番 DDL 禁止の再掲、**`UNIQUE(user_id)` DROP は最終段階まで禁止**（EXECUTION REVIEW と整合）。 |
| **G Phase0 専用 SQL** | **`m55_reply_wallet_report_instance_phase0_only.sql` を新設**（`SELECT` のみ、Phase A〜H 非含有）。貼り付け事故低減。 |

---

## 3. 本変更で Phase 0 に追加したチェック（SQL 名寄せ）

パケットおよび `phase0_only.sql` に含まれる追加 `SELECT` の要約（**実体は SQL ファイル**）。

- **Wallet**: 残高式不一致、各種負数・論理超過、status 外、`created_at`/`updated_at` NULL。  
- **Ledger**: grant 系で `source_of_grant` NULL、消費で `reply_session_id` NULL（二重チェック）、ウォレット別 **最終 `balance_after` vs `available_count`**。  
- **Snapshot / 権利 / fulfillment**: Entry Report 行の NULL 検査、**`m55_p:core_origin`** と snapshot の相互欠損、**`one_time_fulfillments` vs `dtr_report_snapshots`**。  
- **Session / document**: `document.user_id` vs `session.user_id`、succeeded など **期待どおり文档が無い succeeded session** の件数参考。  

詳細クエリおよび注意書きコメントは **SQL 側**を SSOT とする。

---

## 4. Phase F/G の運用ロック（強化文）

以下は **staging マイグレーション手順**に含める。**本ドキュメントを読んだ実行者は遵守**すること。

| ルール |
|--------|
| **Phase F/G** は **`UNIQUE(user_id)` 削除または `NOT NULL`/FK がアプリ側と整合する直前まで実施しない**。 |
| アプリ/API が **本番向けバックエンドの URL で同じ Postgres** に接続している状態で **Phase F/G を流さない**（**分離した staging DB** または **捨て可能 dev**、または **リストア前提**のみ）。 |
| **RPC / walletGrants / `/api/reply/generate` の新版が無い**状態での **本番 DDL** は **EXECUTION REVIEW の禁止範囲**（変更なし）。 |

---

## 5. residual risk（それでも残るリスク）

| リスク | 説明 |
|--------|------|
| **ヒューリスティック** | **`SUM(delta)` / 最終 `balance_after` と `available_count`** は、インポート履歴・手順外調整があると誤検知しうる。**ゼロ件が安全の十分条件ではなく、非ゼロは人手調査**。 |
| **entitlements テーブル** | **`entitlements`（active）** と **Stripe 状態**は Phase 0 SQL に **全面は載せていない**（スキーマが migration 間で異なる可能性）。**`entitlement_rights` と `one_time_fulfillments`** を中心にした。 |
| **将来の multi-product session** | **同一 user の Entry Report 以外**の返書は、**`report_instance_id` backfill 方針が別途**必要になる可能性。 |
| **CHECK 制約後のデータ** | 多くの検出は **CHECK で既に不可能**な列挙。**スーパーユーザ改ざん・制約前データ**の残存時のみ意味を持つ。 |

---

## 6. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.9c-hardening 初版 |
