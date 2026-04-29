# M55_REPLY_WALLET_DB_REACH_POINT_BEFORE_STRIPE_EXPANSION_v1

Status: **SSOT — DB 到達点の固定（文書のみ）。** **本条は本番 SQL／Stripe／Webhook／商品棚コードを実行・変更しない。**  

Recorded date: **2026-04-28**

Prerequisite（B3 方針確定）:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B3_SESSION_QUARANTINE_CONTINUATION_v1.md`**（コミット済み）

Evidence（Phase A / B1 / B2）:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_POSTFLIGHT_RESULT_v1.md`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B2_LEDGER_PRODUCTION_UPDATE_RESULT_v1.md`**

Related（設計の土台）:

- **`docs/ssot/M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1.md`**
- **`docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md`**（付与・上限の語彙確認用）
- **`docs/ssot/M55_REPLY_CREDIT_LEDGER_ARCHITECTURE_ADR_v1.md`**

**秘密鍵・service role・Webhook secret・DB URL は記載しない。**

---

## 1. 完了済みフェーズ

| フェーズ | 内容 | 証跡／SSOT（代表） |
|-----------|------|----------------------|
| **Phase A** | **`report_instance_id`（uuid、nullable）を wallet／ledger／session に追加** | **`M55_REPLY_WALLET_PHASE_A_PRODUCTION_*`** 系 |
| **B1** | **wallet のみ **5** 行へ `report_instance_id` 投入** | **`M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`** |
| **B2** | **ledger のみ **5** 行へ親 wallet から継承** | **`M55_REPLY_WALLET_PHASE_B2_LEDGER_PRODUCTION_UPDATE_RESULT_v1.md`** |
| **B3** | **session は backfill せず **quarantine 継続** | **`M55_REPLY_WALLET_PHASE_B3_SESSION_QUARANTINE_CONTINUATION_v1.md`** |

---

## 2. 現在の DB 状態（本番到達点）

| 観点 | 状態 |
|------|------|
| **`reply_ticket_wallets.report_instance_id` 非 NULL** | **5** |
| **`reply_wallet_ledgers.report_instance_id` 非 NULL** | **5** |
| **`reply_sessions.report_instance_id` 非 NULL** | **0** |
| **Wallet 総行** | **8** |
| **Ledger 総行** | **10** |
| **Quarantine 側 wallet／ledger** | **`report_instance_id` は **`NULL`** 維持** |
| **Session（約 **11** 件規模は既存履歴）** | **`NULL`** として保全 — **§3 と B3 で推測紐づけ禁止を維持** |
| **Smoke／orphan（**3** 件規模）** | **quarantine で隔離**（先行 SSOT の語彙に整合） |
| **`entitlements` archive** | **実施しない（本条時点）。** |
| **`NOT NULL`／FK／厳格 UNIQUE** | **未実施（本条時点）。** |
| **Stripe／Webhook／商品棚 UI** | **本条作成時点では未着手** |

---

## 3. 設計上の意味（Stripe 前の読み）

| # | 意味 |
|---|------|
| 1 | **追加相談返書・課金の境界は **`wallet`／`ledger` の `report_instance_id`** を **正とする設計が可能**（B1／B2 完了）。** |
| 2 | **既存 **`reply_sessions`** の無理な **`report_instance_id` backfill**には依存しない**（B3）。** |
| 3 | **新規生成される **`reply_session`** は、上流で **`report_instance_id` をどう載せるか**を **生成時点で設計**する方向を優先**（既存は追いつかない前提）。** |
| 4 | **既存 session は履歴保全として **`NULL` 許容**。** |

---

## 4. まだやらないこと（NO-GO 継続）

| # | 項目 |
|---|------|
| 1 | **`NOT NULL`／FK／厳格 UNIQUE** |
| 2 | **「Phase C」相当の未承認スキーマ強化**（呼称はプロジェクト内で定義されたものに従う） |
| 3 | **`entitlements` archive 一括** |
| 4 | **smoke／orphan 向けの安易 **DML**** |
| 5 | **Session の `report_instance_id` **backfill**／一括 **`UPDATE`**** |
| 6 | **既存 session の一括 UPDATE** |

---

## 5. Stripe へ進む前の条件（チェックリスト）

**本条は実装を承認しない。** **次工程の入口条件として列挙する。** **金額・商品 ID 等の具体値は別 SSOT／チケットで確定し、本条に秘密を書かない。**

| # | 条件 |
|---|------|
| 1 | **追加相談返書「チケット」の所有権・スコープ・境界が書かれた SSOT／ポリシー文書を再確認**（例：**`M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md`** ほか、チーム合意の所有権メモ）。** |
| 2 | **`report_instance_id` 単位の **購入上限**、**付属 1 件＋追加 4 件**等の **クレジット／付与ルール**を **数と言葉で再確認**。** |
| 3 | **追加課金 **500 円**（税区分・表示は別定義）**の商流と **Stripe product／price** の対応** |
| 4 | **Stripe **product／price／webhook** の設計**（イベント種別、署名、capture 方針）** |
| 5 | **Webhook の **idempotency**（重複イベントで二重付与しない）** |
| 6 | **Ledger の **二重付与防止**（同一支払い・同一 idempotency key の扱い）** |
| 7 | **Refund／cancel／二重請求時の方針**（DB と Stripe の整合）** |
| 8 | **支払い後の smoke test**（少額・限定環境の手順）** |
| 9 | **Rollback／disable switch**（feature flag または運用スイッチ）** |

---

## 6. 次の候補（成果物の順）

| 順 | 候補 |
|----|------|
| 1 | **追加相談返書の **Stripe 設計レビュー SSOT**（上記 §5 を満たす）。** |
| 2 | **追加チケットの **wallet／ledger 境界**の設計レビュー（**`report_instance_id` 軸**）。** |
| 3 | **Webhook fulfillment 設計**（fulfillment が ledger／entitlements に触れる境界）。** |
| 4 | **商品棚 UI**は **DB・決済・Webhook の到達点が揃った後** |

---

## 7. 現時点の判定

| 判定 | Verdict |
|------|---------|
| **本文が固定するもの** | **Phase A／B1／B2／B3 までの **DB 到達点**（§1–2）。** |
| **本条が進めないもの** | **Stripe／Webhook／商品棚 UI の実装・本番キー配置・DDL 強制** |
| **次** | **§5 の条件を満たす設計 SSOT** → **§6 の順で進む** |

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — Reply Wallet DB 到達点（Stripe 拡張前ゲート） |
