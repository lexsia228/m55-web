# M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_REMEDIATION_POLICY_v1

Status: **Policy SSOT** — **no DB writes** from this document; **no automatic remediation**.  

Date: 2026-04-29  

Related:

- Phase0 Lite: `scripts/sql/staging/m55_reply_wallet_report_instance_phase0_lite_counts_only.sql`
- Hash diagnostic: `scripts/sql/staging/m55_reply_wallet_without_snapshot_hash_diagnostic.sql`
- Entitlement-vs-snapshot hash diagnostic PART 1: `scripts/sql/staging/m55_reply_wallet_entitlement_without_snapshot_hash_diagnostic.sql`
- Migration plan: `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md`

Owner: M55 / Reflect Note by M55

---

## 1. 現状（観測に基づく事実）

| 項目 | 内容 |
|------|------|
| **件数** | `wallet_user_without_snapshot_count = 3`（Phase0 Lite / 強い STOP 条件） |
| **entitlement** | **active 相当の entitlement 行がある**が、**`dtr_report_snapshots` に `product_id = DTR_CORE_STATIC_V1` の行がない** |
| **wallet** | `reply_ticket_wallets` はおおむね **active**（監査での値に依拠） |
| **パターン** | **2 件**：`consumed_count > 0` かつ **reply_sessions / reply_documents に行がある**（返書利用の痕跡あり）／**1 件**：**未使用寄り**（例：`available_count > 0` かつ消費・セッション・文書なし に近い形） |
| **監査** | **`user_id` 等の生識別子は SSOT 本文・運用ログの共有に載せず**、`md5('m55_wallet_diag_v1' \|\| user_id)` に相当する **`hashed_user_id` で監査チケットを紐づける**（ソルト値はコードベース前提とせず **診断 SQL ファイル頭の文言に従う**） |

※ 本節は **Phase0 STOP 調査結果の説明**。本番環境での再実行結果で数値が変わる場合はチケットに記録のみ更新すること。

---

## 2. 分類（ラベルの意味と禁止操作）

運用上、次の **ラベル**で 3 件を扱う（**診断 SQL の `likely_reason` と一致させる**。ズレがある場合は診断を再確認してからこの表を優先しない）。

### A — `reply_used_without_snapshot`

| 項目 | 内容 |
|------|------|
| **定義** | `consumed_count > 0` **または** `reply_session_count > 0` **または** `reply_document_count > 0` |
| **含意** | **返書消費・セッション・文書という事実がある**。**データ削除は許可されない**。 |
| **方針** | **削除禁止**。**snapshot の「復元候補」**として検討するが、**自動生成しない**。**返書履歴との整合（レポート本体の有無）**が後続確認の中心。 |

### B — `unused_wallet_with_entitlement_no_snapshot`

| 項目 | 内容 |
|------|------|
| **定義** | `consumed_count = 0` かつセッション・文書とも **0** かつ **wallet がチケット上「未利用」判定**に合う（例：`available_count > 0` 等。**具体閾値は診断列で確定**） |
| **方針** | **削除禁止**。**snapshot の手動復元または `manual_review` キューへの隔離候補**。**自動埋めしない**。 |

### C — `legacy_entitlement_without_snapshot`（概念的ラベル）

| 項目 | 内容 |
|------|------|
| **定義** | **entitlement / rights はあるが**、`one_time_fulfillments` が **無い**等、**Fulfillment と snapshot が揃わない**旧経路・手動付与・途中失敗・スキーマ移行残骸が疑われる状態（**診断の `legacy_entitlement_without_fulfillment` や `likely_reason` の参照**）。 |
| **方針** | **自動判断禁止**。**人間が stripe / ops / メタデータ記録と照らして種別決定**。 |

※ **A と B と C は排他ではなく**、ツール出力の粒度次第で **複数タグが論理的に重なる場合**がある。その場合は **「削除禁止」を最上位**とし、`manual_review` を付す。

---

## 3. 禁止事項（この STOP が解けるまで共通）

以下を **しない**。

| # | 禁止 |
|---|------|
| 1 | **`reply_ticket_wallets` を削除しない** |
| 2 | **`entitlements` を削除しない** |
| 3 | **`reply_wallet_ledgers` を削除しない** |
| 4 | **`reply_sessions` / `reply_documents` を削除しない** |
| 5 | **`dtr_report_snapshots` を自動生成しない**（アプリ・アドホック INSERT 含む**任意の自動化**も含む） |
| 6 | **`report_instance_id` を列に追加したうえでの自動 backfill をしない**（Phase A 以降への意思決定に進まない） |
| 7 | **migration / DDL / DML を本ポリシーだけで適用しない** |
| 8 | **Phase A〜H に進めない**（別 GO） |
| 9 | **Stripe / Webhook / 商品棚 UI の変更や新規チェックアウトに進めない** |

---

## 4. 削除を禁止する理由

- **返書経路には監査ログとユーザー影響**が付く。**DELETE は履歴欠損・課金・表示の根拠喪失**につながる。  
- **entitlements / wallet は請求・権利表示の上流**になりうる。**推測に基づく削除は不可**。  
- **snapshot が無くても** `reply_documents` が存在する場合、**コンテンツ上の約束との整合**を壊さないために **削除より隔離・診断が先**。  

---

## 5. 次に必要な診断（READ-ONLY）

既存の **`m55_reply_wallet_entitlement_without_snapshot_hash_diagnostic.sql` PART 1** で取得できる項目を **必ず一覧に載せてから**運用判断に進む：

| 項目 | 目的 |
|------|------|
| `one_time_fulfillment_count` | Stripe 決済経路があるか |
| `entitlement_grant_type_list` | 典型値と旧値の確認 |
| `entitlement_source_list` | `stripe_checkout` 以外なら手動・旧処理の可能性 |
| `core_right_count` | `m55_p:core_origin` と entitlement の両立 |
| `right_key_list_count`（別名 **`right_key_list_count`**） | 権利表の広がり |
| `likely_reason` | 自動ラベルの一次分類 |
| `entitlement_created_day_min` / `max` | 作成日単位での時系列（個人連絡には使わない） |

**追加（返書利用済み 2 件向け・個人情報を出さない）**

- **`theme` の分布**：`GROUP BY reply_sessions.theme` などの **DISTINCT／件数のみ**（**本文・payload は出さない**）。必要なら **theme 文字列の hash**（`md5('m55_theme_bucket' || theme)`）のみ。  
- **`reply_documents`**：件数のみ、または **payload のキー一覧の有無を boolean 程度**とするような **別紙設計後の追加 SQL**。**生 JSON・本文はログに載せない**。  

運用：**既存の COUNT-only／hash-only 規約に従う**。

---

## 6. 復旧方針候補（コード・DB はまだ変更しない）

### A 案：**snapshot の手動復元（条件付き）**

| 条件 | 内容 |
|------|------|
| **許可されるのは** | **entitlements / wallet が正当とオーナーが判断し**、**`dtr_report_snapshots` に載せる envelope / profile が、別系統バックアップ・Stripe メタ・アプリログから **十分に復元できる**場合に限る。 |
| **不可** | **birth_date / nickname / envelope などのソースが復元できない**場合は **本案では進めない**。 |

### B 案：**manual_review 隔離**

| 項目 | 内容 |
|------|------|
| **対象** | 復元材料が無い／矛盾が残るユーザー行 |
| **`report_instance` backfill（将来）から** | **対象外**とみなす（**quarantine／manual_review とチームが呼ぶフラグ運用**。**DB フラグ追加は別 PR・別 GO**。 |

### C 案：**legacy 互換保持**

| 項目 | 内容 |
|------|------|
| **やること** | **wallet と entitlement は保持**。**移行チェーンだけ後回し**。 |
| **やらないこと** | **「旧仕様だから」という理由だけで追加課金や新 SKU を紐付けない**（**商品・Stripe は本文 SSOT と別ゲート**。） |

※ **実務では A と B と C が併記され**、**3 件単位で「復元可／不可」「隔離」「legacy」を割り振る**。**本ファイルは自動ルーティングしない**。

---

## 7. 次の SQL 方針（READ のみ）

1. **現在の ENTITLEMENT 対象 PART 1 結果から**、`one_time_fulfillment_count`、`grant_type`、`source`、`core_right`、`likely_reason`、`created_day` を **済ませて記録**。  
2. **不足するなら**、**hash-only / count-only の追加 SELECT** を別ファイルで **レビュー付き追加**（UPDATE 禁止継続）。  
3. **UPDATE / INSERT / DELETE / ALTER は出さない**（本ファイルも含む）。  

---

## 8. GO 条件（この REMEDIATION と migration の関係）

次を **すべて**満たすまで：**Phase A〜・DDL・自動 backfill には進まない**。

| # | 条件 |
|---|------|
| 1 | **3 件それぞれ**について **A/B/C（および診断上の細分類）が文書またはチケットで確定**している。 |
| 2 | **snapshot 復元が可能か不可能か**が、**データソースの有無込みで**判定済みである。 |
| 3 | **manual_review 対象**が誰でも追える一覧になっている（**hashed_user_id ベース**）。 |
| 4 | **将来の `report_instance` backfill** の対象／対象外が **オーナー承認済み**。 |
| 5 | **本番 DB に書き込む SQL** は **別ドラフト・別レビュー・別ウィンドウ**のみ。 |

---

## 9. 厳守（本ファイルの適用範囲）

- **文書の作成のみ**で済ませた。**DB 更新なし**。  
- **UPDATE / INSERT / DELETE / ALTER / DROP / CREATE** の文言を **運用手順書として載せない**（**禁止の列挙は §3**）。  
- **Phase A 以降・migration・walletGrants・RPC・`/api/reply/generate`・ConsultRoom・Stripe Checkout 新規・Webhook・商品棚 UI**は **変更しない**。  
- **秘密鍵・Webhook secret は記載しない**。  

---

## 10. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | Phase0 STOP 後の orphan entitlement 復旧／隔離方針として初版 |
