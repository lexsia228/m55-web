# M55_REPLY_WALLET_PHASE_B3_SESSION_QUARANTINE_CONTINUATION_v1

Status: **Policy／設計境界 SSOT — 文書のみ。** **`UPDATE`／backfill／本番 DDL は本条に含めず、本条単体でも実施しない。**  

Scope: **Phase B3 — `reply_sessions`** — **本条は「実行しない」を公式に固定し、経緯・理由・禁止・今後を記録する。**

Evidence（前置フェーズ PASS）:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B2_LEDGER_PRODUCTION_UPDATE_RESULT_v1.md`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`**

Candidate／診断の参照（session 分類の語彙）:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_PACKET_v1.md`**

**秘密鍵・service role・DB URL・生 `user_id`／snapshot 本文・payload を記載しない。**

Policy revision **v1** · Last updated: **2026-04-28**

---

## 1. 現在の到達点（本番観測に基づく固定）

| # | 到達点 |
|---|--------|
| 1 | **Phase A — `report_instance_id`（uuid、nullable）を wallet／ledger／session に追加した運用は **PASS**。** |
| 2 | **Phase B1 — **wallet **5** 行に `report_instance_id` を投入した運用は **PASS**。** |
| 3 | **Phase B2 — **ledger **5** 行に親 wallet から継承した運用は **PASS**。** |
| 4 | **`reply_sessions` の `report_instance_id` 非 NULL 件数 = **0**。** |
| 5 | **Session の未紐づけコホート（運用上 **11** 件規模 — 診断の **session quarantine 合算**と整合）**は **まだ `report_instance_id` を持たない**。** |
| 6 | **Wallet／ledger の quarantine 側は `report_instance_id` を **`NULL` 維持**（B1／B2 の設計と整合）。** |

---

## 2. B3 を進めない理由（backfill しない根拠）

| # | 理由 |
|---|------|
| 1 | **`sessions_without_dtr_core_snapshot` 系の集計と整合し、**未紐づけ session が **11** 件規模**である（候補診断・preflight 系の前提と合わせて読む）。** |
| 2 | **Session と DTR snapshot／report の **同一性を示す根拠が弱い** — **機械的に **`user_id` だけ**や **`created_at` 近接だけ**、**`core_profile_ref` だけ**、**`theme` だけ**で **結合しない**。** |
| 3 | **誤結合は相談履歴／返書履歴としての整合を壊し、運用・ユーザー体験のリスクが大きい。** |
| 4 | **`report_instance_id` を session へ **一括 `UPDATE` で流入**しない** — **B3 は現時点で **機械バックフィル対象から外す**。** |

---

## 3. B3 方針（quarantine 継続）

| # | 方針 |
|---|------|
| 1 | **現時点では **すべての既存 **`reply_sessions` を「quarantine 継続」**とみなし、**自動 backfill で `report_instance_id` を埋めない**。** |
| 2 | **Session の `report_instance_id` は **non-null **0**** 件で維持**（本条のフェーズでの目標状態）。** |
| 3 | **将来、より強い証拠チェーンがある場合のみ、**別設計・別フェーズ／別プロジェクトで **個別評価**する。** |
| 4 | **追加相談返書での Stripe／課金まわりの実装は、**既存 session の無理な **`report_instance_id` backfill**に依存しない**設計を優先**する。** |

---

## 4. 絶対禁止

| # | 禁止 |
|---|------|
| 1 | **Session の一括 **`UPDATE`**（`report_instance_id` をまとめて埋める行為）。** |
| 2 | **`user_id` だけでの session と snapshot／report の強引な紐づけ**。 |
| 3 | **`created_at` 近接だけを根拠にした結合**。 |
| 4 | **`core_profile_ref` だけ、`theme` だけを根拠にした単独結合**（弱い単独証拠）。** |
| 5 | **smoke／orphan に対する自動 **DML**（設計済み運用線を壊さない）。** |
| 6 | **`entitlements` archive 一括** |
| 7 | **`NOT NULL`／FK／厳格 UNIQUE** に当該目的で進む変更** |
| 8 | **DB の状態が本条の「到達点」と整合しないままの **Stripe 追加課金実装**（**先に論理・運用チェック**。）** |

**Stripe／Webhook／商品棚 UI 自体の改修**は本条のスコープ外だが**、本条の NO-GO 境界として **DB と課金の穴あき接続**だけは避ける。**

---

## 5. 今後の候補（方針レベルのみ）

| # | 候補 |
|---|------|
| 1 | **新規作成される **`reply_session`** は、運用・アプリ側で **`report_instance_id`** をどう載せるかを **上流で設計**（**過去だけを後追いしない**）。** |
| 2 | **既存 session は歴史保全として **`NULL` 維持**を許容し、読みモデル側で明示**。** |
| 3 | **追加相談返書の境界は、`report_instance_id` を **既にもつ **wallet／ledger** 系を正**として設計進行**。** |
| 4 | **既存 session への強い証拠付きリンクづけ**は **別プロジェクト／別 SSOT**（本条ではフェーズしない）。** |

---

## 6. 現時点の判定

| 判定 | Verdict |
|------|---------|
| **B3 で session を自動 backfill／一括 **`UPDATE`** する実行** | **NO-GO** |
| **`reply_sessions` の quarantine を維持し、`report_instance_id` を触らない方針** | **GO** |
| **次の成果物** | **「DB 到達点チェック」 SSOT（全体の整合リスト）** — **Stripe／Webhook／商品棚 UI は、そのチェック後に議論**。** |

---

## 7. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — B3 session quarantine continuation（自動 backfill しない） |
