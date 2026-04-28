# M55_REPLY_WALLET_REPORT_INSTANCE_APP_IMPACT_PLAN_v1

Status: Draft — **design only; no code or DB changes in the PR that introduces this file**  
Date: 2026-04-28  
Related:

- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_SCOPE_ADR_v1.md`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md`
- `scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`

Owner: M55 / Reflect Note by M55

---

## 0. 目的

`reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` に **`report_instance_id`（正規候補: `dtr_report_snapshots.id`）** が入った **後**、既存の **user 単位** 読取・付与・RPC 消費をそのままにすると **DB 制約とアプリ前提が食い違い破綻する**。本書は **アプリ・RPC・付与関数の追従影響**と **安全な PR 順序**を固定する。**本文はコード変更なし**。

---

## 1. report_instance_id の API 取得経路（結論）

| 経路 | 内容 |
|------|------|
| **正規ソース** | **`dtr_report_snapshots.id`**（immutable 实例）。 |
| **現状** | `getDtrReportSnapshot()` は **`id` を select していない**（返却型 `DtrReportSnapshotRow` に `id` 無し）（`lib/m55/dtrDraftDb.ts`）。 |
| **推奨** | **`SELECT` に `id` を追加し、型と返却に `snapshotId` / `reportInstanceId` を載せる**（または専用 `getReportInstanceId(userId, productId)`）。 |
| **ルーム API** | サーバ側のみ。`user_id` + `product_id=DTR_CORE_STATIC_V1` で **スナップショット 1 行**を解決できるなら、その **`id`** を consult の **同一レポートインスタンス**とみなして wallet を引く。**クライアントに生の ID を広げるかは別 SSOT**。 |
| **`/api/reply/generate`** | **ヘッダー / ボディ**で `report_instance_id` を受け取り **サーバ検証が必須**（ユーザー任意値を信じない）。信頼できるのは **`user_id` + DB で解決したスナップショット**との一致のみ。 |

---

## 2. `resolveEntryReportOwnership` は今 `report_instance_id` を返しているか

- **していない**。`DtrOwnershipResult` は `unlockState` / `ownershipType` / `aiConsultIncluded` / `expiresAt` のみ（`lib/m55/dtrOwnershipGate.ts`）。  
- ゲート自体は **`getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1)`** を既に読んでいるが、**返回值に snapshot id が含まれない**。  
- **PR1.8a での追従案:** `unlockState === 'owned'` のうち **`dtr_report_snapshots` 由来の owned** だけ **`reportInstanceId: string`**（= `snapshots.id`）を付与、他経路（entitlements のみ等）は **`null`** または **別途クエリ**。→ **同一関数内で二度クエリしない**よう、`getDtrReportSnapshot` の結果に **`id`** を載せて流用することが望ましい。

---

## 3. 影響範囲表（横断）

| 領域 | 現在の假定 | migration 後に破綻する理由 |
|------|------------|------------------------------|
| **`reply_ticket_wallets` 読取** | `.eq('user_id', userId)` 一意 | **`UNIQUE (user_id, report_instance_id)`** になり **複数行可**。単一結果前提は **未定義の行を読む**。 |
| **`grantInitialIncludedReplyIfNeeded`** | `user_id` のみ | **どの实例に +1 か** が特定できず **誤行更新**の恐れ。**snapshot 経路での `report_instance_id` 必須化**が必要。 |
| **`grantPurchasedReplyTickets`** | 同上 | Stripe 付与 **該当实例だけ**増やすため **実例 id 引数が必要**。 |
| **`readReplyWalletProbe`** | `user_id` のみ | PR1 の **consult と照合**のみ。migration 後は **`(user_id, report_instance)`** で読む必要。 |
| **`/api/reply/generate`** | wallet は `user_id`、RPC は `p_user_id` のみ | 誤って **別实例のウォレット**をロックする可能性。**实例スコープ引数・検証**が必須。 |
| **`m55_reply_generate_commit`（RPC）** | `WHERE user_id = p_user_id` で wallet LOCK | **同一ユーザー複数钱包** と不整合。**`p_report_instance_id` + 複合検索**が必要。 |
| **`dtrCoreCheckoutFulfillment`** | `grantInitialIncludedReplyIfNeeded(db, userId)` のみ | **Fulfillment 完了直後の `dtr_report_snapshots` 行 id** を付与に渡せないと **付与先が曖昧**。 |
| **`consult_threads`** | `report_key` のみ | **wallet 与は `report_instance_id`**。接続は **同一用户 + 同一 ER 产品**の **スナップショット id** で **論理結合**（FK は migration 側で検討）。 |
| **`reply_sessions`** | `report_instance_id` 列なし | **生成単位が实例に紐づかず**監査薄弱。migration + INSERT/UPDATE 変更。 |

---

## 4. 関数別変更案（ドラフト）

> **注意:** 以下为 **设计方案**。**PR1.8-pre では実装しない。**

### 4.1 `lib/m55/dtrDraftDb.ts`

- **`getDtrReportSnapshot`**: `.select(..., id)` と **`reportInstanceId: data.id`**（命名は統一）。
- **`DtrReportSnapshotRow`**: 任意で **`report_instance_id: string`** 追加。
- **`upsertDtrReportSnapshotAtFulfillment`**: Upsert **後に `RETURNING id`**、または **`select id` で再読**して **Fulfillment が `grant*` に渡す id** とする。

### 4.2 `resolveEntryReportOwnership`（`lib/m55/dtrOwnershipGate.ts`）

- **選択肢 A**: 戻り型に **`reportInstanceId: string | null`**（owned 時、snapshot が取れた場合のみ）。  
- **選択肢 B**: 変更を最小にし、`getDtrReportSnapshot` 拡張後、**別ヘルパ `resolveStaticEntryReportInstanceId(userId)`** のみ公開。  
- **ロック / 異常経路では `null`** → 呼び出し側は **wallet を触らない**。

### 4.3 `grantInitialIncludedReplyIfNeeded(db, userId)`

- **変更案:** **`(db, params: { userId: string; reportInstanceId: string })`**。  
- **クエリ**: `user_id + report_instance_id` で wallet 取得/作成。**旧 signature を残す場合は deprecation**。

### 4.4 `grantPurchasedReplyTickets(db, userId, ticketCount)`

- **変更案:** **`reportInstanceId: string`** を追加。**単一 Webhook が「どの实例への購入か」**を metadata から解決済みであることが前提。

### 4.5 `readReplyWalletProbe(db, userId)`

- **変更案:** **`reportInstanceId: string`** を追加し **`reply_ticket_wallets` を `(user_id, report_instance_id)` で取得**。  
- **PR 段階的 fallback:** migration 未適用環境のみ旧 `user_id` 単独（read-only）は **フラグ/feature detection で限定的**でも可。

### 4.6 `lib/m55/dtrCoreCheckoutFulfillment.ts`

- **`upsertDtrReportSnapshotAtFulfillment`** 成功後（または並行）、**snapshot `id`** を取得。  
- **`grantInitialIncludedReplyIfNeeded`** に **`reportInstanceId`** を渡す。**失敗時**はログ + **wallet 付与しない**（正本ポリシーに合わせる）。

---

## 5. API 別変更案

### 5.1 `GET /api/room/core`（将来 PR）

- **所有チェック後**、`userId` + **`DTR_CORE_STATIC_V1`** で **`dtr_report_snapshots.id`** を取得。  
- **`readReplyWalletProbe(db, userId, reportInstanceId)`** と **consult thread** と **照合**（PR1 ログの進化）。

### 5.2 `POST /api/room/core/send`（将来）

- **消費はまだ consult ベースでも**、**wallet との整合フェーズでは** **`report_instance_id` 検証が必要**。**いきなり二重消費**に注意し **PR3 と同期**。

### 5.3 `POST /api/reply/generate`

| 項目 | 案 |
|------|-----|
| **入力** | **Body に `report_instance_id` を追加**するとスキーマ拡張。または **`X-M55-Report-Instance-Id`**（サーバのみ信頼は不可 → **サーバ側再検証**）。 |
| **検証** | **`dtr_report_snapshots` で `user_id + id`** が一致する行が存在すること。 |
| **`getReplyWalletState`** | **`eq('user_id')` と `eq('report_instance_id')`**。 |
| **RPC 呼び出し** | **`p_report_instance_id`（uuid）追加**。**既存 RPC シグネチャ変更は DB migration と同じリリース窓**。 |

---

## 6. RPC 変更案（`m55_reply_generate_commit`）

現在の関数は **`WHERE user_id = p_user_id` で `reply_ticket_wallets` をロック**している（`supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql`）。

| 項目 | 案 |
|------|-----|
| **引数** | **`p_report_instance_id uuid`** を追加（または `uuid` と `text` の両対応は避け **uuid に統一**）。 |
| **wallet ロック** | **`WHERE user_id = p_user_id AND report_instance_id = p_report_instance_id` FOR UPDATE**。 |
| **整合** | **`reply_sessions.user_id`** が **`reply_sessions.report_instance_id`（migration 済みなら NOT NULL）** と **`p_report_instance_id` 一致**。 |
| **リプレイ** | 既存 document 分岐での wallet 読取も **同一複合キー**。 |

---

## 7. `consult_threads` / `consult_messages` との接続点

| 現状 | 影響 |
|------|------|
| `consult_threads.report_key = 'm55_p:core_origin'` | **論理的には Entry Report アンロック**。 |
| **`report_instance_id` 無し** | **wallet と紐付けが弱い**。オプション: **`consult_threads` に optional `report_instance_id` 追加**または **サーバのみ `user_id+product→snapshot`** で統一。**混線回避のため、アプリ側は「同一 snapshot id」でwalletを引く**。 |

---

## 8. PR 順序を間違えると壊れる箇所

| 誤順序 | 結果 |
|--------|------|
| **DB で UNIQUE を先に変更し、アプリが user のみ** | **クエリ が複数行 / 未指定行**で **ランダム行更新**。 |
| **RPC だけ先行** | **`report_instance_id` 列が無い**と失敗。**マイグレーション と RPC が同時リリース**が前提。 |
| **wallet を实例化済み、`grant*` が user のみ** | **新規行別途作成**または **initial 付与漏れ**。 |
| **`reply/generate` だけヘッダ信頼** | **権利昇格**。**必ず DB で user と instance を突合**。 |
| **ConsultRoom だけ表示を変え consume 未定義** | **表示と実残数ずれ**。表示は **wallet read helper と send/RPC と同じ順**で。**PR2 と PR3 の順序は ADR と整合**。 |

---

## 9. 推奨 PR 順序（本リポジトリ用ラベル）

| PR | 内容 | DB |
|----|------|-----|
| **PR1.8-pre** | **本文書のみ**（影響設計）。コードなし。 | なし |
| **PR1.8a** | **`getDtrReportSnapshot` に `id` 返却**／**resolveEntryReportOwnership で `reportInstanceId` を返せるか設計確認と最小実装**。 | 任意で列なし（読取のみ拡張可） |
| **PR1.8b** | **`readReplyWalletProbe` が `report_instance_id` をオプション受け、`UNIQUE(user_id)` 存続時は旧 path fallback**（read-only）。 | 適用 **前** は fallback、**適用後** は複合クエリメイン。**フラグ環境のみ**。 |
| **PR1.8c** | **dev/staging のみ** `scripts/sql/draft` 相当を **適用済み migrations として複製後に実行**（本番 `supabase/migrations` は **別レビューゲート**）。 | **適用** |
| **PR1.8d** | **`walletGrants` を `report_instance_id` 必須へ**。**Fulfillment から id 渡す**。 | 適用済み前提 |
| **PR1.8e** | **`m55_reply_generate_commit` の新 DDL + `/api/reply/generate`**。 | RPC 置換 |
| **PR1.8f** → **PR2** | **ConsultRoom 表示切替**。 | wallet 読取統一済み |

**厳守:** 「**migration 適用 → RPC アプリ両方同一デプロイ**」を満たさない状態を本番に出さない。

---

## 10. DB 適用 **前** に必要な条件

1. **`report_instance_id` の正規定義（`dtr_report_snapshots.id`）が ADR と合意済み**。  
2. **`getDtrReportSnapshot`（または同等）から id が取れる**。  
3. **Fulfillment が付与へ id を渡す設計済み**。  
4. **`/api/reply/generate` の入力検証方針**（偽 instance 防止）確定。  
5. **rollback / staging 検証計画**（`M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md` と整合）。

---

## 11. DB 適用 **後** に必要な条件

1. **`reply_ticket_wallets` に `(user_id, report_instance_id)` UNIQUE** が効いている。  
2. **古い `user_id` のみクエリコードが削除または feature-gate**。  
3. **RPC と Node アプリが新シグネチャでデプロイ済み**。  
4. **E2E**（複数インスタンス非混線、単一ユーザー）計画にあるゲート。**秘密鍵をログに含めない**。  
5. **ConsultRoom が wallet 参照に切替可能**になるまで **表示は旧でも消費は不変**または **両方ロック**のどちらかを明示。

---

## 12. DB 適用可否の判定（本ドキュメントの結論のみ）

| 質問 | 判定 |
|------|------|
| いまこの影響設計のみで DB 適用してよいか | **NO** — **staging migration + アプリ準備ゲート**。 |
| PR1.8a〜b を進められるか（コードあり） | **設計レビュー後 YES**。**本 PR（1.8-pre）は文書のみ**。 |

---

## 13. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.8-pre 初版 |
