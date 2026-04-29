# M55_REPLY_WALLET_SHADOW_PREFLIGHT_OBSERVATION_AND_MANUAL_CREATE_REJECTION_v1

Status: **Observation + policy** — **この文書は DB を変更しない。** **SQL の実行、migration の適用、DDL／DML の提示はしない。**  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_BOOTSTRAP_EXECUTION_PACKET_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_SCHEMA_BOOTSTRAP_PLAN_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_ENV_PHASE_A_READINESS_CHECK_v1.md`
- `scripts/sql/staging/m55_reply_wallet_shadow_bootstrap_preflight.sql`

---

## 1. Preflight 結果（m55-soul-shadow）

`m55-soul-shadow` 上で、shadow bootstrap 用の **テーブル存在確認（読み取りのみ）の `SELECT`** を実行した。その結果、**Phase A の nullable 検証に必要となる前提オブジェクトとして列挙されていた複数テーブルが、当面の状態では存在しなかった。**

確認時点において **存在しなかった**（少なくとも当該 preflight が期待する名前・スキーマ上でいえば **未定義であった**）オブジェクトとして、実務上問題になるものとして以下を記録する。

| オブジェクト種別／論点名 | メモ |
|---------------------------|------|
| `reply_ticket_wallets` | なし |
| `reply_wallet_ledgers` | なし |
| `reply_sessions` | なし |
| `dtr_report_snapshots` | なし |
| `entitlement_rights` | なし |
| `one_time_fulfillments` | なし |
| `reply_documents` | なし |
| `stripe_events` | なし |
| **`supabase_migrations` スキーマ（migration 履歴の格納先としての可視化）** | preflight が期待する意味では欠落／未整備となった |

この状態では **`m55-soul-shadow` は本番準拠のスキーマであると主張できない。** したがって、次のゲート結論となる。

| ゲート | 結論 |
|--------|------|
| **Phase A PART 1（nullable 前提となるスキーマ上の読み取り検証など）** | **NO-GO** — **前提テーブルが揃わない。** |
| **Phase A PART 2（nullable の `ADD COLUMN` など、別承認だった追加 DDL）** | **NO-GO** — PART 1 未達の上、当然 NO-GO。 |

**本報告後も、読み取り以外の変更は行っていない**（migration 未適用、手動 DDL 未実行）。

---

## 2. Gemini 手動 CREATE TABLE 案の扱い（正式 NO-GO）

第三者（Gemini 等）から提示された **`CREATE TABLE` ベースの手動スキーマ案** が共有された。そのうえでの方針を **SSOT** として確定する。

| 評価 | 内容 |
|------|------|
| **妥当な指摘** | **`user_id` を `text` にする**といったレビュー指摘自体は、型と統合境界の議論として **参照に値することがある**。 |
| **採用しない理由（本質）** | 提示された **CREATE ブロック一式は、現行リポジトリに基づく本番側スキーマ定義と列構成・制約セットが一致していない**。特に **`reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` / `dtr_report_snapshots`** については、**本番（および `supabase/migrations` 由来の正規定義）と齟齬がある**とも判断される。**簡略化された手貼り CREATE は、migration チェーンとは無関係に「別の DB」を作る**。 |
| **運用上の帰結** | **その手動 CREATE 案は実行しない。** Gemini 案で shadow を埋めても、**Phase A 本線での「本番準拠に近い」検証 DB にならず、むしろ本番準拠から遠ざかる**。 |

よって：**手動の簡易テーブルを作って shadow をごまかさない。** 否認対象は **「特定ツール由来」ではなく「本番準拠でない貼り付け CREATE 運用」全般**とする。

---

## 3. 正しい bootstrap 方針（再掲・SSOT で固定）

| # | 方針 |
|---|------|
| 1 | **リポジトリに存在する既存 migration を唯一の正として**、非本番（shadow）へ **順序付きで整合する形**で寄せる。 |
| 2 | **本番と同じ列・制約・インデックス・RPC 名を**、**ファイル単位の migration 由来で**揃える。**SQL Editor に断片を無秩序に貼ることはしない**（execution packet と同様）。 |
| 3 | **`public.entitlements` だけは** リポジトリに単体の **`CREATE migration` がない**運用ゆえに **別扱い**。既存 shadow の残骸と本番 DDL のギャップは **BOOTSTRAP_PLAN と entitlements／`stripe_events` の前提議論で先に決める**。 |
| 4 | **`stripe_events` 前提**を満たすか、**対象 migration を適用しないか**などを **`M55_REPLY_WALLET_SHADOW_SCHEMA_BOOTSTRAP_PLAN_v1.md`** と整合させて決めたうえで、チェーンを組む。**前提未達のファイルを単独で流さない**。 |
| 5 | **手動の簡易 `CREATE`** ではなく、**migration 由来での構築**が唯一許容される。**「早いので CREATE」では Phase A は検証にならない。** |

---

## 4. 次の最小作業（まだ DDL を出さない）

| 順序 | 作業 | 備考 |
|------|------|------|
| A | **`supabase/migrations`** を対象に、本番側で期待される順序および **オブジェクト一覧（テーブル・関数・トリガ依存）を表形式で整理した「正規スキーマ差分・依存表」（diff matrix）を新規または既存運用へ追記**する。**本文は一覧・順序・保留理由のみ。実行可能 DDL ブロックは含めない。** | 先頭の論点：`stripe_events` 前提 migration の位置づけ。 |
| B | **上記一覧をもとに**、将来 **shadow に適用可能な最小 bootstrap 手順書**および、必要なら **パッチ相当の論理名（ファイル名のみ）** を準備する。**この段階ではいかなる DDL ファイルもリポジトリに「実行可能な形で」追加しない**（ユーザー承認および BOOTSTRAP_PLAN 更新が先）。 |

**本ファイルの時点では、A が未完了でもゲート状態（PART 1/2 NO-GO）は変わらない。**

---

## 5. 厳守（本 SSOT と合わせた禁止事項）

- **本番 DB** での読み書き、migration、`Phase A`。  
- **手貼りの `CREATE TABLE`（Gemini 案その他）。**  
- **`public.entitlements` の勝手な `DROP` / `RENAME`。**  
- **service role・DB URL・秘密鍵**のログ・チャット・文書への貼り付け（本書にも載せない）。  
- **Stripe / Webhook / 商品棚 UI** のコード変更（本論題の範囲外）。

---

## 6. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-29 | 初版：preflight 観測、手動 CREATE 否認、bootstrap 方針・次ステップ記録 |
