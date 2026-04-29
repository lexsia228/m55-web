# M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1

Status: **Policy SSOT** — **DB 変更なし。** 本章は運用・設計の正本。  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_MINIMAL_BACKFILL_VERIFICATION_OBSERVATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_UNSAFE_ARCHIVE_SQL_REJECTION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_RETURN_TO_MAINLINE_CHECKPOINT_v1.md`
- `scripts/sql/staging/m55_reply_wallet_backfill_minimal_verification_hash.sql`

---

## 1. 観測結果（本番 READ-only SELECT による確認）

以下は **読み取り**に基づく要約。**生 `user_id` は本章に転記しない。**

| 項目 | 観測 |
|------|------|
| **対象 3 件の識別子パターン** | **`smoke_user_*` 系**（テスト用プレフィックスに一致する行）。 |
| **wallet** | **3 件とも存在**（`reply_ticket_wallets` 上の行）。 |
| **`dtr_report_snapshots`（`DTR_CORE_STATIC_V1`）** | **3 件とも無し**（orphan 定義と整合）。 |
| **`entitlements`** | **3 件とも active**。**stripe チェックアウト系／one_time 系の痕跡**（実測上の列・ソース表現に依存）。 |
| **rights / fulfillment / snapshot** | **いずれも欠落**（先行 lineage／minimal 観測と同型）。 |
| **返書** | **2 件は `reply_sessions` / `reply_documents` に履歴あり**、**1 件は未使用寄り**。 |

**解釈:** この 3 件は **実ユーザーの本番購入と同一に扱わない**判断材料が揃っているが、**ledger／返書ログの観点では削除しない**（下記 §3）。

---

## 2. Gemini 等からの「本番 UPDATE 即実行」案の扱い

| 項目 | 方針 |
|------|------|
| **即本番実行** | **NO-GO**（`M55_REPLY_WALLET_UNSAFE_ARCHIVE_SQL_REJECTION_v1` と同根）。 |
| **`entitlements.status` を archived のみ変更** | **`wallet_user_without_snapshot_count = 0` を保証しない可能性**がある。該カウントは **`dtr_report_snapshots` の有無**に基づく定義のため、**権利行のラベルを変えても snapshot が増えない限り orphans は残る**。 |
| **将来 DML を検討する場合** | **別 SSOT**、**別 PR**、**preflight／postflight／rollback 条文**、**別承認**。**広い条件の一括は禁止**のまま実運用側で **対象だけを単独限定**できること。 |

---

## 3. 隔離方針（smoke 系 3 件）

| # | 方針 |
|---|------|
| 1 | **migration の自動 backfill／一括適用対象から除外**（known quarantine と同列の運用。**`report_instance_id` を誤って埋める設計にならない**こと）。 |
| 2 | **実ユーザー課金権利**（別途実測で **snapshot あり**側に属するユーザー群）と **別監査単位**。混同しない。 |
| 3 | **`reply_wallet_ledgers`、`reply_sessions`、`reply_documents`** — **削除しない**（監査・再現性）。 |
| 4 | **返書履歴 2 件** — **削除しない**。 |
| 5 | **未使用 1 件** — **推測削除しない**。 |
| 6 | **必要になったとき** — `entitlements` を **archived 相当へ移す**ことは **「隔離 DML 候補」**として **別レビューのみ**。**本章は実行を許可しない**。 |

---

## 4. DML を将来設計する場合の絶対条件（コピペ用 SQL は本章に書かない）

次を **すべて**満たすプランに限り、**チケット／PR で検討可**。

| # | 条件 |
|---|------|
| 1 | **対象が上記 smoke 系 3 件だけ**であることを **preflight の読み取り**で **行単位**確認（**正常 5 件が含まれない**ことの別クエリ）。 |
| 2 | **実行前後の件数**（該当 wallet／entitlement／snapshot なし件数）を **チケットに記録**。 |
| 3 | **rollback**（逆操作または列復元方針）を **文書化**。 |
| 4 | **影響範囲**（アプリ・RPC・請求表示に触れるか）を **オーナー承認**。 |
| 5 | **`wallet_user_without_snapshot_count` が **0 にならない**可能性**（権利のみ変え snapshot が無い限り）**を説明義務として明示**。 |
| 6 | **本番適用は別承認**。**一括広条件 DML は引き続き禁止**（REJECTION SSOT）。 |

本章は **`UPDATE` 文そのものは記載しない。**

---

## 5. Phase A（nullable migration）との関係

| 項目 | 内容 |
|------|------|
| **Phase A** | **`reply_ticket_wallets`／ledger／sessions** への **`report_instance_id` nullable のみ**。**別系統**（`RETURN_TO_MAINLINE_CHECKPOINT`、`NULLABLE_COLUMNS_REVIEW`）。 |
| **smoke 隔離 DML** | **未実行でも**、migration 側の **`quarantine exclusion` と SSOT が列挙条件で整合していれば**、**nullable 追加の設計判断と両立する**。**同一 PR に混ぜない**。 |
| **Phase B 以降** | **backfill、NOT NULL、FK、strict UNIQUE** — **ゲート済みどおり NO-GO**。**smoke 隔離が進んでも自動解除しない**。 |

---

## 6. 禁止事項

- **許可なく本番へ即時適用する**権利変更系の **一括 `UPDATE`**  
- **`entitlements` の条件だけによる一括 archive**（REJECTION SSOT）  
- **snapshot／rights／fulfillment の推測作成**  
- **`reply_ticket_wallets`、`reply_wallet_ledgers`、`reply_sessions`、`reply_documents` の削除**  
- **Stripe 追加課金**、**商品棚 UI 変更**（本件の隔離と混同しない）  

---

## 7. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | smoke 系 orphan 3 件の隔離方針初版。 |
