# M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1

Status: Audit — **no DB apply; no new files under `supabase/migrations` from this doc**  
Date: 2026-04-28  

Related:

- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md`
- `scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_APP_IMPACT_PLAN_v1.md`

Owner: M55 / Reflect Note by M55

---

## 1. Executive summary（判定）

| 質問 | 結論 |
|------|------|
| **ドラフト SQL を無修正のままそのまま本番実行してよいか** | **NO**。トランザクション分割・ロック順・NOT NULL と UNIQUE の順序・**アプリ無停止**要件を事前に確定させる必要がある。**コメントアウト状態で「人手で順に実行」すること自体は開発向けであり、自動 migration ファイルとしてそのまま昇格できない**。 |
| **staging / dev のみ適用できるか** | **条件付き YES**。適用順とメンテ窓・**バックアップ**・**適用後に Reply 生成経路を止めるか**／**ステージング専用 Supabase**の前提があること。**単独 DB だけ先行かつ同一コードで運用続行は不可**（§4参照）。 |
| **本番 migration を `supabase/migrations` に置く GO 条件** | **§8** のゲートをすべて満たすこと。 |

---

## 2.「draft SQL のまま」実行した場合の危険箇所

| リスク | 説明 |
|--------|------|
| **一括コメント解除で流す** | `DROP CONSTRAINT` と `ADD UNIQUE` が **誤制約名**だと失敗または **誤ったオブジェクト DROP**。**STEP 0 の実名確認が必須**。 |
| **`UNIQUE(user_id, report_instance_id)` の前に NULL が残る** | PostgreSQL は **`(user_id, NULL)` を複数行許容** → **意図しない重複行**の温床。ドラフトの注記どおり **NOT NULL か、参加行の隔離**が先。**Phase F を早めに踏むと検証不能**。 |
| **Phase F で `user_id` UNIQUE 削除後** | **`walletGrants` が `INSERT (user_idのみ …)`** のままだと、**新規行が `report_instance_id` なしで挿入可能**になり、**複合 UNIQUE と衝突または曖昧な行**が生じうる（後述 §4.2）。 |
| **RPC は `WHERE user_id`** のまま（`20260417000000_m55_reply_generate_commit_rpc.sql`） | **複数 wallet 行**が可能になった瞬間、**`SELECT … FOR UPDATE` が複数行ロック**または **`.maybeSingle()` 相当の単一行期待が破綻`** → **ランタイム未定義**。 |
| **`CREATE INDEX CONCURRENTLY` 等が混ざる場合** | **`BEGIN` 内で実行不可**の操作があり、ドラフト冒頭は **BEGIN をコメントアウト**している。**手順を分けないと失敗**。 |

---

## 3. ドラフトの順序（nullable → backfill → 検証 → unique → NOT NULL）との整合

`M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md` および `m55_reply_wallet_report_instance_scope_draft.sql` の意図：

| 順序 | ドラフト上の整合 | 備考 |
|------|------------------|------|
| **A 列追加（NULL 可）** | **Phase A** で列のみ。 | ✅ |
| **wallet backfill** | **Phase B**。 | ✅ |
| **ledger 伝播** | **Phase C**（wallet と整合）。 | ✅ |
| **sessions** | **Phase D**（ユーザー＋製品で snapshot 1 件前提）。 | ✅ |
| **検証** | **Phase E**。 | ✅ |
| **UNIQUE 入替** | **Phase F** — ドラフト本文は **NULL 残存時に `(user_id,NULL)` 多重の危険**を明記。**NOT NULL との前後関係は運用方針次第**で、**自動昇格前に「wallet 全行に非 NULL または manual_review 済み」**を明示する必要あり。 | ⚠️ 手順レビュー必須 |
| **NOT NULL** | **Phase G** | ✅（ただし FK `NOT VALID` のバリデーションは別途） |

---

## 4. 制約名の実 DB 確認前提

- ドラフト **STEP 0** に **`pg_constraint`** 照会が記載済み。  
- **`reply_ticket_wallets_user_id_key`** は慣例名で **実環境で必ず確認**（推奨済み）。  
- **判定**: 前提は **文書・ドラフトとも満たしている**が、**昇格 migration には検索結果の貼り付けまたはラッパー関数**を推奨。

---

## 5. snapshot と結合できない既存 wallet の扱い

- **Phase B の UPDATE** は **JOIN 成功行のみ**更新。それ以外は **`manual_review` マーク**（別 UPDATE）。  
- **破壊的に UUID を捏造しない**設計 — **ドラフトと PLAN に整合**。  
- **リスク**: 「`manual_review` 更新を忘れて Phase F へ進む」と **NULL 行が規律なく残る**。**GO 条件で件数 0 を確認**すること。

---

## 6. `reply_sessions` / `reply_wallet_ledgers` の `report_instance_id` の順序

| 順序 | 安全理由 |
|------|----------|
| **先 wallet、次 ledger（wallet から伝播）** | **wallet_id FK** があるため **親の `report_instance_id` が先**が自然。 |
| **sessions は user + product で snapshot と突合** | **同一 user の全 session に同じ实例**を当ててよい **現在の UNIQUE 前提**。将来 **session が別产品**なら **JOIN 条件の見直し**が必要 — **APP_IMPACT_PLAN に依存**。 |
| **documents** | ドラフトは **直接 touch なし**。**session 経由**で十分なら後追い可。 |

---

## 7. RPC が `user_id` の wallet を FOR UPDATE している状態で **DB だけ先**に変えると何が壊れるか

参照: `m55_reply_generate_commit` は `FROM reply_ticket_wallets WHERE user_id = p_user_id FOR UPDATE`（単一行前提）。

| 事象 | 内容 |
|------|------|
| **複数 wallet 行**が存在可能になった後 | **同一関数は一行を期待した実装**と齟齬。**不定の行ロック**／**PostgreSQL が複数返す** と **Rpc 失敗**。 |
| **複合 UNIQUE が先にだけ入り、コードが旧のまま** | **単一行 INSERT が失敗**（制約変更）または **誤 INSERT**。 |

**結論**: **DDL を先に適用しただけで RPC / Node を変えずに運用することは NG**。

---

## 8. `walletGrants` が user_id のみで upsert している状態で **DB だけ先**だとどうなるか

参照: `.eq('user_id', userId).maybeSingle()` と **無い場合 `INSERT(user_idのみ, …)`**。

| 事象 | 内容 |
|------|------|
| **`report_instance_id` が NOT NULL 制約のみ先に効くと** | **INSERT が全て失敗**（Fulfillment / Webhook が壊れる）。 |
| **NULL 許容のまま UNIQUE を先に変更** | **`INSERT` が `report_instance_id` なしの行を追加**できると **複数 `(user_id, NULL)`** — **論理バグ**。 |
| **Fulfillment が snapshot 後に grant** | **コードが instance を渡していないままだと**、**別の行に付与される**リスクを残す可能性。 |

**結論**: **walletGrants と Fulfillment に `report_instance_id` が渡らない状態でスキーマだけ進めるべきではない**。最低限 **`INSERT` が `report_instance_id` と整合**するコードと **同日デプロイ**。

---

## 9. staging / dev で試す場合の前提条件

1. **専用 DB** または **書き換え復元が可能なスナップショット**（staging）。  
2. **STEP 0 の実制約名**取得済み。  
3. **wallet / snapshot の件数クエリと orphan リスト**済み（PRE-MIGRATION QA）。  
4. **Reply `/api/reply/generate` を一時無効化**または **テスターのみ許可** — **運用はチーム規約**。  
5. **`smoke_user_reply_generate` の seed**（RPC migration 末尾）が **staging に存在する場合**—— **テストユーザーと衝突しない手順**。  
6. **PR1.8b のログ**だけでは **運用ユーザー影響は限定的**：**wallet 側は依然 user で SELECT**。  

---

## 10. 本番適用前に必要なアプリ / RPC 追従 PR（同時または先に準備済み）

`M55_REPLY_WALLET_REPORT_INSTANCE_APP_IMPACT_PLAN_v1.md` と整合させ、**最低限**:

| 領域 | 内容 |
|------|------|
| **`grantInitialIncludedReplyIfNeeded` / `grantPurchasedReplyTickets`** | **`report_instance_id` を引数・WHERE に**。 |
| **`m55_reply_generate_commit`** | **`p_report_instance_id`**（または複合ロック）**。 |
| **`POST /api/reply/generate`** | wallet ロックと RPC 引数の整合、**入力検証**（捏造防止）。 |
| **`fulfillDtrCoreFromCheckoutSessionId`** | **snapshot の id を grant に**。 |
| **`readReplyWalletProbe`**（既に準備済みフラグあり） | **scoped SELECT** への切替（migration 適用後）。 |
| **`GET /api/room/core`**（任意の段） | probe の **複合ロックと一致**。 |

**絶対に同じリリース列に乗せるべきセット（論理セット）**:

1. **DDL 本体**（複合 UNIQUE + `report_instance_id` NOT NULL 方針）  
2. **RPC 新版本**  
3. **walletGrants と Fulfillment と reply/generate の Node**

**コンサル_room（consult_threads）だけ**先行とするなら—— **wallet と二重カウントを生まない運用規約がなければ**非推奨（設計済み）。

---

## 11. Rollback 可能性

| 到達フェーズ | 手段 |
|----------------|------|
| **Phase A のみ** | **`DROP COLUMN`** で戻せることが多い。 |
| **Phase F 済み** | **`DROP CONSTRAINT`** / **再作成** で **ユーザーロック要**。複数 **`(user_id, NULL)`** があれば **`user_id` UNIQUE に戻れない**。 |
| **致命的** | **PITR / スナップショットからのリストア**。 |

---

## 12. 危険 SQL 一覧（概念的・ドラフト準拠）

| 種別 | 例 | リスク |
|------|-----|--------|
| **不正な `DROP CONSTRAINT …`** | 名前誤認 | **他制約削除**または **実行失敗で半端状態**。 |
| **`DROP UNIQUE(user_id)` 後に旧コードの `INSERT`** | — | **整合性崩壊**。 |
| **`UNIQUE(user_id, report_instance_id)` 前に未整理 NULL** | — | **`(uid, NULL)` 多重**。 |
| **大規模 `UPDATE … FROM` （ledger/sessions）** | ロック時間 | **本番タイムアウト**。**staging で EXPLAIN とバッチ**。 |
| **`ALTER … SET NOT NULL`（前提未達）** | — | **失敗または誤認**。 |

※ **秘密鍵・Webhook secret を SQL に書かない**（ドラフト済み順守）。

---

## 13. 安全化した staging 専用 migration 案が **追加で必要か**

| 判定 | 内容 |
|------|------|
| **YES（推奨）** | 現在のドラフトは **ひとつの `.sql` に工程が縦並び**であり、**部分実行・手動ゲート・ロールバック手順書**への分割が明示されていない。  
| **staging 用として**は、次が望ましい：  
| ① **ファイル分割**（`01_add_columns.sql` / `02_backfill_wallet.sql` …）または **チェックリスト付き**。  
| ② **`IF NOT EXISTS` / precondition `SELECT`** の **読み取りのみの前提検証**。  
| ③ **Supabase 向け**：`BEGIN` と **`CONCURRENTLY` 非両立**の注記の明文化。 |

**本番用 `supabase/migrations`** には — **staging で全ゲート済み後**にのみ置くこと。

---

## 14. 本番適用 GO 条件（一覧）

1. staging で **全 Phase が成功**し、件数クエリ OK。  
2. **ADR / 本レビューの承認**と **Rollback 実行演習**。  
3. **`m55_reply_generate_commit`** の REPLACE migration が **staging で検証済み**。  
4. **walletGrants / Fulfillment** が **実例 UUID を前提**になっている。  
5. **Smoke / E2E**（consume / replay）通過。  
6. **運用：** メンテ窓または **フェーチャーフラグで Reply 機能を縮退可能**。  

---

## 15. 次に進むべき **最小 PR**（順）

| 順 | PR |
|----|-----|
| 1 | **`M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md` の承認**（本書）。 |
| 2 | **staging 用手順**：ドラフト SQL を **`scripts/sql/staging/`**（例）へ **フェーズ別に分割**。 |
| 3 | **`supabase/migrations`** には **`YYYYMMDDHHMMstaging_...`** ではなく、**運用規約で決める命名**のみ — **本番 GATE 前は置かない**方針の明文化。 |
| 4 | **アプリ側**: `APP_IMPACT_PLAN` の **walletGrants → RPC → generate** の **実装順**どおりブランチ。 |

---

## 16. 「DBだけ先行適用」の最終判定

**不可（NO）。**  
**例外**: **Phase A（NULL 追加のみ）のみ**適用かつ **`INSERT` が新列なしでも失敗しない**ことを DB 側で確認したうえでの **メンテ窓**。それでも **`walletGrants` が新規 INSERT で `DEFAULT` が無い場合**、`report_instance_id` に **DEFAULT は置けないため**、`INSERT` が失敗しないことの検証が要る。**実務では「DDL はアプリ準備済みまたは同一リリース列」**。  

---

## 17. 「staging/dev のみ」の最終判定

**可能（YES）、条件あり**: 専用プロジェクトまたは **リストア前提**。**同一コードベース × 変更後 DB が先行しない**運用規約または **フラグ**。  

---

## 18. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.9-pre 監査として初版 |
