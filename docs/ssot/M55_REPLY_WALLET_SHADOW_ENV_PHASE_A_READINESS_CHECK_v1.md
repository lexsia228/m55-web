# M55_REPLY_WALLET_SHADOW_ENV_PHASE_A_READINESS_CHECK_v1

Status: **Readiness checklist (human verification)** — **リポジトリからは `m55-soul-shadow` の実スキーマを自動検証できない。** Dashboard／メンバーが確認する。**DB への接続・SQL 実行は本章では行わない。**  

Date: 2026-04-29  

Related:

- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`（PART 1 が参照するオブジェクト）
- `docs/ssot/M55_SUPABASE_NON_PROD_DB_STRATEGY_FOR_REPLY_WALLET_MIGRATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_UNSAFE_ARCHIVE_SQL_REJECTION_v1.md`（簡易スキーマ検証の限界）

---

## 1. 「m55-soul-shadow」の現状仮説（要確認）

| 前提 | 内容 |
|------|------|
| **リポジトリ** | プロジェクト名 **`m55-soul-shadow`** の **存在・内容はコミットされていない**（社内／Supabase 側のラベル）。 |
| **過去スクリーンショット** | **単体の簡略 `entitlements` だけ** が見えているとの報告。**本番同名の複合スキーマ**とは見なせない可能性が高い。 |
| **結論の置き場** | **下記確認が済むまで**、このプロジェクトは **Phase A の「本線検証環境」とみなさない**。 |

---

## 2. Phase A（`m55_reply_wallet_phase_a_nullable_only_staging.sql` PART 1）が **直接的に参照**するもの

PART 1 は **`information_schema`** と **`reply_*`**、**`dtr_report_snapshots`** に依存する。**本文は SQL を転載しない**（実行ファイルを正）。

| # | 必要なオブジェクト／理由 |
|---|---------------------------|
| A | **`public.reply_ticket_wallets`** — EXISTS チェック、`COUNT`、`UNIQUE` 制約照会対象。**無ければ PART 1 の 1.1 / 1.3 / 1.5 が成立しない。** |
| B | **`public.reply_wallet_ledgers`** |
| C | **`public.reply_sessions`** |
| D | **`public.dtr_report_snapshots`** — orphan 件数（1.4）の **相関副問合せ**に必須。**空テーブルでも可**（列定義が本番と整合していればよい）。 |
| E | **`reply_ticket_wallets` の `user_id` 上の UNIQUE**（典型的な制約名はプランで確認、**PG のカタログ照会**）。 |

**PART 1 は次を直接 SELECT しない**が、**本番同等の意味付けの検証**では把握しておく価値がある：

| 参考（間接） | 用途 |
|--------------|------|
| **`entitlements`** | 権利・購入の文脈（smoke 隔離方針と別）。 |
| **`entitlement_rights`** | rights 欠落の監査ライン。 |
| **`one_time_fulfillments`** | fulfillment 欠落の監査ライン。 |

---

## 3. 「簡易 `entitlements` だけ」では不十分な理由

| # | 理由 |
|---|------|
| 1 | **Phase A nullable packet の PART 1** は **`reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions`** を前提とする。**これらが無い DB では PART 1 が最初から失敗する。** |
| 2 | **orphan 件数**は **`dtr_report_snapshots` と `reply_ticket_wallets` の欠損結合**で定義される。**snapshot テーブル自体が無い**と **定義を再現できない。** |
| 3 | **簡易テーブルは「UPDATE が通る」検証**には足りても、**本番安全性・migration 影響の証明にはならない**（`UNSAFE_ARCHIVE`・`NON_PROD_STRATEGY` と同旨）。 |

---

## 4. shadow（`m55-soul-shadow`）が「Phase A 検証に使える」と言える条件

次を **すべて**満たすこと。

| # | 条件 |
|---|------|
| 1 | **§2 の A〜E** が **Dashboard／SQL で実在確認**済み。**3 つの `reply_*` と `dtr_report_snapshots` がすべて `public` にある。** |
| 2 | 各テーブルの **列・型・制約が** リポジトリの **`supabase/migrations` 由来の本番系**と **意図的に差分がない**（少なくとも **`ADD COLUMN uuid` が付与可能**な行構造）。 |
| 3 | **project ref が本番と異なる**こと、**ラベルで非本番と分かる**こと。 |
| 4 | **バックアップ／破棄方針**がチームで共有されていること。 |
| 5 | **RLS／ポリシー**が **DDL を阻害しない**、または **メンテロールで実行できる**こと（手動確認）。 |

**上記が揃うまで** — **「Phase A 本線の検証 DB」として採用しない。**

---

## 5. 使えない（または未確定）場合の選択肢

| 案 | 内容 |
|----|------|
| **本番準拠 migration を shadow に適用** | リポジトリの **`supabase/migrations` を対象 DB に追従**させ、`reply_*` と DTR 系テーブルを揃える。**別タスク・別承認。** |
| **Supabase Branching / Preview** | 本番に近い分岐 DB。**`NON_PROD_STRATEGY`** 参照。 |
| **新規 shadow / staging project** | **本番と ref を分離**し、上と同様に **マイグレーションでスキーマ構築**。 |
| **Local Supabase** | **DDL 構文・順序**の確認のみ。**件数・RLS・本番同等性は別。** |

---

## 6. 次に人間が Supabase Dashboard で確認すべきこと（チェックリスト）

**秘密鍵・service role・接続 URL はチケット外に出さない。**

- [ ] ログイン先が **`m55-soul-shadow`**（名称が一致）である。  
- [ ] **Settings → General** の **project ref** を **本番 ref と照合し、一致しない**ことを記録。  
- [ ] **Table editor** または **SQL** で **`public.reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` / `dtr_report_snapshots`** の **有無**（§2）。  
- [ ] **`entitlements` / `entitlement_rights` / `one_time_fulfillments`** の有無（**PART 1 自体は不要だが、本番差分把握用**）。  
- [ ] スクリーンショットと **現在**の状態が同一か—**過去の簡易テーブルのみ**であれば **§4 が満たされない**。  
- [ ] **Branching が使える**なら、**shadow と Branch のどちらを正とするか**オーナーに一つに絞る。  

---

## 7. Phase A PART 1 を実行してよいか（判定）

| 状態 | PART 1（読み取りのみ） |
|------|-------------------------|
| **§4 の条件がすべて YES** で、対象 DB が **`m55-soul-shadow`** と証明できる | **条件付き GO** — **EXECUTION PACKET のチェックリスト**に従い、**本番では実行しない**。 |
| **reply_* のいずれかが無い**、または **dtr_report_snapshots が無い** | **NO-GO** — 先に **§5 でスキーマを本番準拠に**。 |
| **project が本番と同一・または判断不能** | **NO-GO** |
| **未確認**（スクリーンショットのみ） | **NO-GO** — **§6 を完了**。 |

---

## 8. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | shadow（m55-soul-shadow）の Phase A 準備確認 SSOT。 |
