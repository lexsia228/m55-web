# M55_REPLY_WALLET_MISSING_FULFILLMENT_REMEDIATION_POLICY_v1

Status: **Policy SSOT** — **no DB writes** declared by this document; **execution is deferred** to separately reviewed artifacts.  

Date: 2026-04-29  

Related:

- Observation: `docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_PART1_OBSERVATION_v1.md`
- Lineage SQL: `scripts/sql/staging/m55_reply_wallet_orphan_fulfillment_lineage_hash_diagnostic.sql`
- Earlier orphan policy: `docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_REMEDIATION_POLICY_v1.md`
- Migration STOP: `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md`

---

## 1. 観測結果（fulfillment lineage 診断に基づく）

対象：**orphan entitlement コホート 3**（`hashed_user_id` で監査。**生 ID は転記しない。**）

共通する診断列（すべての行について一致）：

| 項目 | 観測 |
|------|------|
| `wallet_status` | `active` |
| `entitlement`（論理状態） | `active` と整合 |
| **`has_entitlement_stripe_session_id`** | **`true`**（**Stripe Checkout Session と思われる参照が entitlement 行にある**） |
| **`matching_fulfillment_by_session_hash_count`** | **0**（**session のハッシュで `one_time_fulfillments` にヒットしない**） |
| **`matching_snapshot_by_session_hash_count`** | **0**（**同上で `dtr_report_snapshots` にヒットしない**） |
| **`fulfillment_same_user_product_count`** | **0** |
| **`right_same_user_total_count`** | PART1 と整合し **0**（ユーザー単位の entitlement_rights 総数） |
| **`suspected_lineage_issue`** | **`session_reference_present_but_no_fulfillment`** |

利用パターン（PART1 由来の二分）：

- **返書経路で利用の痕跡あり**：**2 件**。  
- **未使用側に寄るプロファイル**：**1 件**。

---

## 2. 推定原因（断定しない）

運用上許容できる仮説（**いずれも Stripe の `payment_status` を運用側でAPI再取得して確定済みとは限らない**）：

| # | 仮説 |
|---|------|
| 1 | **`entitlements` だけ書かれたが**、同一トランザクションまたは後続チェーンでの **`one_time_fulfillments` 作成が失敗・スキップ**された。 |
| 2 | **`entitlement_rights`** および **`dtr_report_snapshots`** が **Fulfillment アプリ関数の順序のいずれかで失敗または未実行**。 |
| 3 | **Webhook / `/dtr/processing` / 旧処理分岐の不整合**（例：成功ページ経路のみ部分実行）。 |
| 4 | **手動での DB 混入・リストア残骸**。 |

「**支払い完了済みか**」「**チェックアウトが許可状態か**」は **Stripe ダッシュボードおよび API での再検証が別途必要**。本ファイルは **Paid の断定をしない**。

---

## 3. 絶対禁止（復旧ドラフトまたは運用での遵守）

以下を **しない**：

| # | 禁止 |
|---|------|
| 1 | **`entitlements` 行を削除しない。** |
| 2 | **`reply_ticket_wallets` を削除しない。** |
| 3 | **`reply_wallet_ledgers` を削除しない。** |
| 4 | **`reply_sessions` / `reply_documents` を削除しない。** |
| 5 | Stripe Checkout Session が entitlements に紐付いているだけを理由に、`dtr_report_snapshots` を自動生成しない。 |
| 6 | `birth_date` / `nickname` / `profile_snapshot` / `envelope` を再構成できる証拠が無いのに `dtr_report_snapshots` を作らない。 |
| 7 | **`one_time_fulfillments` をテーブル側の「推測」だけで作成しない。** |
| 8 | **`entitlement_rights` を推測で INSERT しない。** |
| 9 | **Phase A 以降（nullable 列〜UNIQUE〜NOT NULL〜RPC 追従）に進めない。** |
| 10 | **`report_instance_id` を前提とした migration backfill に進めない。** |
| 11 | **Stripe の追加 SKU・追加課金・新チェックアウト**は **別ゲート**とする。 |

---

## 4. 復旧候補（抽象方針 — コード・SQL は別紙 REVIEW）。

### A. **完全復元（条件をすべて満たす場合のみ検討）**

| 条件 | 内容 |
|------|------|
| Paid 確認 | Stripe が当該 session を Paid と明示すること（監査ログ付き。本書では API を叩かない）。 |
| 入力再現 | 購入時入力およびレポート入力のデータが DB／アプリ両面で再現可能。 |
| Snapshot 許容 | `dtr_report_snapshots` に載せよい、`birth_date` / `nickname` / プロファイル・`envelope` の根拠が揃う。 |

**候補操作（将来）**：`one_time_fulfillments` と `entitlement_rights` と `dtr_report_snapshots` の順序および冪等性は `lib/m55/dtrCoreCheckoutFulfillment.ts` のモデルと整合すること。実装・SQL は別 PR・別 SECURITY レビュー・別メンテナンス窓のみ。

### B. **権利維持 + `manual_review` 隔離**

| | |
|---|---|
| **対象** | 復元根拠が不足する、または矛盾が残すユーザー行。 |
| **やること** | wallet・entitlements・履歴テーブルを保持。**将来の migration の report_instance backfill は一時対象外**（フラグ列の追加そのものは **別 DDL PR・別 GO**）。 |
| **やらない** | 「権利があるだけ」を理由とした Stripe 側の追加課金・新 SKU の紐付け。 |

### C. **返書履歴保護モード（返書利用済み向け強調）**

| | |
|---|---|
| **原則** | 返書利用済みユーザーは、`reply_sessions` / `reply_documents` に対する **DELETE と上書き破壊をしない**。 |
| **備考** | **`report_instance` が後から付けられない状態でも**、既存入力は **読み取り・移行設計のみ** で扱う。 |

---

## 5. 次の診断方針（READ 系のみ・Stripe API は別オーナー）。

| # | 方針 |
|---|------|
| 1 | この SSOT では Stripe API を実行しない。支払い状態は別チケット・別オーナーで Stripe 監査。 |
| 2 | DB において checkout と同一セッション候補の入力が他テーブルに残るかを、`user_id`/session のハッシュまたは件数のみで確認（生の session id は結果に載せない）。 |
| 3 | `dtr_guest_drafts` と `dtr_report_snapshots` 以外のドラフト／プロファイル系に、同一ユーザーコンテキストの行が残るか（件数のみ）。 |
| 4 | payload 本文・nickname 平文は監査コピーしない。ハッシュまたは列挙のみ。 |

（具体 SQL は **別ファイル・別レビューの SELECT-only**。）

---

## 6. Phase A 再開条件（すべて満たすまで GO しない）。

| # | Gate |
|---|------|
| 1 | 3 ユーザーそれぞれについて復旧案 A／隔離 B／履歴保持 C のいずれかが文書化・オーナー合意済み。 |
| 2 | migration backfill の対象に含める／含めない／quarantine が確定。 |
| 3 | 本番での INSERT/UPDATE は docs または PR の別ドラフトでレビューサインオフ済み。 |
| 4 | 返書利用済み 2 件の削除禁止・読み取り優先の結論が監査ログに残っている。 |
| 5 | Stripe 追加 SKU／商品棚変更とは意思決定トリガーを切り離した。 |

※ すべて満たすまで **`report_instance_id` の DDL と Phase A 以降は開始しない**。**

---

## 7. 厳守（本ファイルの適用）。

- **Markdown のみ**。**DB 状態を変える文は載せない**（**DDL/DML 例は禁止**。**§3 と矛盾する指示を書かない。**）。  
- **Stripe・Webhook の実変更は別ゲート**。  
- **秘密鍵・Webhook secret は記載しない**。  

---

## 8. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | `session_reference_present_but_no_fulfillment` 収束後の remediation ポリシーとして初版 |
