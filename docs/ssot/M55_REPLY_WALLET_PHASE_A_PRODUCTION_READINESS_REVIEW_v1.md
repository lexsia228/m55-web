# M55_REPLY_WALLET_PHASE_A_PRODUCTION_READINESS_REVIEW_v1

Status: **Governance SSOT — pre-production decision aid** — **この文書はレビュー基準のみを定める。** **本番 DB に接続しない。** **SQL は実行しない。** **`supabase/migrations` に本番向け DDL を追加しない。**  

Date: **2026-04-30**

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_PHASE_A_NULLABLE_POSTFLIGHT_RESULT_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_ONLY_EXECUTION_PACKET_v1.md`
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`、`docs/ssot/M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1.md`（orphan／quarantine）

**本文に実行可能 DDL（`ALTER TABLE` 全文など）を載せない。** **秘密鍵・service role・DB URL を記載しない。**

---

## 1. 現在の証跡（いま分かっていること）

| # | 証跡 |
|---|------|
| 1 | **m55-soul-shadow に対し、正規 migration 由来の最小 bootstrap（`202604160` / `202604200` / `202604220`）が済んでいる。** |
| 2 | **その上で Phase A の nullable 列追加（下記 §2 の論点名）が shadow で実施済みであり、記録済みの postflight が PASS と判断されている。** （正本：`M55_REPLY_WALLET_SHADOW_PHASE_A_NULLABLE_POSTFLIGHT_RESULT_v1`。） |
| 3 | **postflight：** 対象メトリクスおよび制約維持の観測が記載どおり。** |
| 4 | **限界：** shadow の該当テーブルが **データ 0 行**であったため **本番相当のボリューム・並行性・歴史的バリエーションは検証していない**。 |

---

## 2. 本番適用「候補」とみなされる DDL の論理的形状（ソースは staging packet／レビュー文献）

※ **具体的な 1 行の DDL 文言は本条に転記しない。** 判断のために **許容される操作の形**だけを固定する。

| 論点 | 内容 |
|------|------|
| **対象列** | **`reply_ticket_wallets.report_instance_id`**、**`reply_wallet_ledgers.report_instance_id`**、**`reply_sessions.report_instance_id`** — いずれも **uuid、NULL 許容（nullable）**。 |
| **操作** | **列の追加のみ。** **`IF NOT EXISTS` 相当の冪等性**を満たす書き方（実行パケット側で定義済みの意図と一致）。 |
| **明示的に含まないもの** | **backfill（`UPDATE`／`INSERT`）なし** · **NOT NULL 制約なし** · **新規 FK なし** · **既存 UNIQUE の変更なし**（`UNIQUE(user_id)` 等を壊さない）。 |

**リポジトリへの本番 migration ファイル追記は、本条の承認だけでは行わない** — 別ゲート（§6）。

---

## 3. 本番適用前に確認すべきこと（必須レビュー項目）

| # | 確認 |
|---|------|
| 1 | **本番の 3 テーブル（上記）の行数ベースライン** — 実行前後で **意図しない行変化がない**ことの前提。 |
| 2 | **各テーブルに `report_instance_id` が尚未追加であること、または二重適用しない冪等手順があること。** 再実行・部分失敗の扱いを文書化。 |
| 3 | **orphan／smoke 3 件の扱い** — `M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1` および quarantine 方針に沿い **自動 backfill 対象外**であることの再確認。** nullable 列追加自体は quarantine 排除ロジックと **独立**でよいが、**後続の誤解釈を防ぐためのチーム合意**が要る。 |
| 4 | **「正常」と分類されている行・ウォレットを壊さない** — 既存ビジネス不変条件（例：一意性、CHECK）を **DDL が変更しない**。 |
| 5 | **`user_id` に関するユーザー単位一意性（`reply_ticket_wallets`）維持** — postflight で制約確認の手順を本番側にも合わせる。 |
| 6 | **RPC・アプリが新列を参照しなくても致命的に壊れないこと** — nullable 列追加のみ。PostgREST／型生成／クライアントの論点は別リストで確認。 |
| 7 | **rollback／ロールフォワード方針** — **nullable 列の `DROP COLUMN` は許可リストとバックアップ方針のうえ**で定義。** 本項は計画のみ、実行は別承認。 |

---

## 4. 「本番に適用してもよい可能性がある」論理範囲（narrow）

次を **すべて**満たす場合にのみ、**適用検討の対象になりうる**。  

| # | 範囲 |
|---|------|
| 1 | **nullable な uuid 列追加のみ**。 |
| 2 | **既存行について新列値はすべて NULL のまま**（実行直後、`UPDATE`/`INSERT` は行わない）。 |
| 3 | **データ移行や backfill を伴わない。** |
| 4 | **quarantine／orphan exclusion ポリシーとは独立した DDL** — Phase B との混同禁止。 |

---

## 5. 本番ではまだ適用してはいけない（NO-GO 範囲）

以下は **`M55_REPLY_WALLET_SHADOW_PHASE_A_NULLABLE_POSTFLIGHT_RESULT_v1`** の結果をもっても **自動承認されない**。  

| 区分 | NO-GO |
|------|--------|
| **スキーマ** | Phase B 以降の backfill。**`report_instance_id` への値投入**。**NOT NULL**。**FK**。**厳密化された UNIQUE**。 |
| **データ** | **entitlements archive 一括**など、別 SSOT で REJECT または別承認の操作。**smoke orphan 向けの本番 DML「修正」**。 |
| **プロダクト・課金** | **Stripe 追加課金・請求**。**商品棚 UI の変更**。 |
| **インフラ** | **本条・shadow 証跡のみでの本番 `ALTER`**。 |

---

## 6. 本番適用 GO 条件（すべて満たすまで適用しない）

| # | 条件 |
|---|------|
| 1 | **production 向け「preflight」の `SELECT` のみの実行パケット**がレビュー承認済み（**本番接続用文字列や秘密情報は書かず、実行手順と期待結果だけ**）。 shadow 同等のチェック項目を **本番用に言い換え**たものが存在すること。 |
| 2 | **オーナー承認**（プロダクト＋インフラ／DBA が定めるロール）。 |
| 3 | **バックアップ／ポイントインタイムリカバリー等の復旧経路確認** が文書で YES。 |
| 4 | **`ALTER` はパケット内のロック済み文言を **全文レビュー**（**本条には転記しない**）。 |
| 5 | **実行後 postflight の定義** — 期待する制約名・非 NULL 件数・アプリ影響の確認リスト。 |
| 6 | **監査ログ** — 実行 UTC、担当、**対象プロジェクト（識別子は安全な粒度のみ）**、**git の commit hash**、チケット ID。 |

---

## 7. 現時点の判定（本条の確定 verdict）

| 項目 | 判定 |
|------|------|
| **本番への Phase A nullable DDL の適用** | **現時点 NO-GO**。 |
| **次に欠けているもの** | **production 用として、SELECT のみの preflight と postflight を束ねた実行パケット**（本条 §6 と整合）。**`supabase/migrations` への追加は、そのパケットとオーナー承認の後。** |

Phase B／本番データ backfill／課金・商品棚：**NO-GO 継続**（証跡 SSOT と同一）。

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-30 | 初版 — Phase A nullable 本番適用可否のレビュー基準のみ |
