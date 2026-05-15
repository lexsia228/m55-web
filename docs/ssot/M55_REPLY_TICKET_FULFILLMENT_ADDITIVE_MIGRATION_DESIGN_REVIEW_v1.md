# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_DESIGN_REVIEW_v1

Status: **追加相談返書チケット用・Stripe Fulfillment の additive migration 設計レビュー SSOT** — **本条は migration ファイル作成・APPLY・Webhook／Checkout／DB 更新の承認ではない。**  

Recorded: **2026-04-28**

Upstream（実測・論理）:

- **本番診断結果:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_DIAGNOSTIC_RESULT_v1.md`
- **Gap 一覧:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_REVIEW_v1.md`
- **DB／API 設計（論理）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_API_DESIGN_REVIEW_v1.md`

**秘密鍵・DB URL・Webhook secret・Stripe secret・生の識別子・payload 本文を本条に記載しない。**

---

## 1. 設計目的

| # | 目的 |
|---|------|
| 1 | **Stripe Webhook Fulfillment** において **二重付与（冪等違反）を防ぐ** — 処理済みを **一意キーで再現でき、再送時は DB 側で「既処理」へ寄せられる**こと。 |
| 2 | **Wallet の数更新**と **Ledger の監査記録**を **同一論理単位／リカバリ可能**な形で行えること。 |
| 3 | **1 レポートあたり合計 5 件上限**を守る（既存 cap 列・整合式と矛盾しない更新）。 |
| 4 | **付与は `report_instance_id` 単位**でスコープし、**誤ったグローバル付与**を避ける。 |
| 5 | **`user_id` 単独**を **付与キーとして使わない**（診断・ADR で指摘されている **単独 UNIQUE** 問題と整合）。 |

---

## 2. 既存 schema で使うもの（診断結果と整合）

本番 SELECT-only 診断（`M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_DIAGNOSTIC_RESULT_v1.md`）により、少なくとも次が **DDL 上そろっている**ものとして読める。

| オブジェクト／観念 | 使い方 |
|--------------------|--------|
| **`reply_ticket_wallets`** | `purchased_count`／`available_count`／`consumed_count`／`initial_included_count`／`status`／**`report_instance_id`** で cap とスコープを表現。 |
| **`reply_wallet_ledgers`** | `delta`／`balance_after`／`event_type`／`source_of_grant`／`wallet_id`／`user_id`／**`report_instance_id`** で監査。 |
| **Cap 整合** | 既存 CHECK 式 **`available_count = initial_included_count + purchased_count - consumed_count`**（ベース migration）に沿った更新手順を前提にする。 |
| **`status`** | Fulfillment は **`active`** の wallet のみを対象とする方針（アプリ／SQL 条件で強制）。 |
| **既存 `stripe_events`** | **テーブルは存在**（診断）。**処理済み一意・冪等の主キーとして十分か**は列定義・運用により **「再利用」か「別テーブル」**を選ぶ（§3 と候補 A）。 |

**`purchases` テーブルは未検出**のため、Checkout 参照の永続は **Ledger／冪等テーブル／既存 Stripe 系**に寄せる前提で設計する。

---

## 3. 追加候補 A：`stripe_processed_events` 相当（新規テーブル案）

**狙い:** Webhook の **`event.id`（Stripe event id）** を軸に **「このイベントは既に Fulfillment 済み」**を永続化し、**再送時は no-op**（または安全な短絡）にする。

### 3.1 列案（いずれも **nullable / additive** を初期位置づけ、**NOT NULL・FK・strict UNIQUE は §9 の NO-GO** に従い本章では採用しない）

| 列（案） | 役割 |
|----------|------|
| **`stripe_event_id`** | Stripe **`event.id`**（冪等の主候補）。将来 **UNIQUE 制約**は別ゲート。 |
| **`checkout_session_id`** | Checkout Session 参照（text／uuid 方針は実装・DDL で確定）。 |
| **`payment_intent_id`** | PaymentIntent 参照。 |
| **`event_type`** | Stripe **`type`**（文字列）。監査・デバッグ用。 |
| **`product_key`** | サーバー側製品キー（例：**追加相談返書チケット**の論理キー）。**SKU と混同しないこと。** |
| **`report_instance_id`** | 付与スコープ（uuid）。**user 単独キーにしない。** |
| **`status`** | `processed`／`skipped`／`failed` 等（列挙は migration packet で確定）。 |
| **`processed_at`** | 処理完了時刻。 |
| **`created_at`** | 行生成時刻。 |

### 3.2 raw payload 全文

| 方針 | 内容 |
|------|------|
| **推奨（デフォルト）** | **保存しない。** **PII・カード番号・全文**のリスクを避ける。 |
| **許容される代替** | **`payload_hash`**（既存 **`stripe_events`** に近い運用）や **参照 ID のみ** で十分ならそれに寄せる。 |
| **もし JSON を持つ場合** | **nullable**・**最小スキーマ**・**PII 禁止ポリシー**を前提に **別レビュー**（本条では **「持たない」が既定**）。 |

### 3.3 Webhook 再送時の no-op

- **INSERT 前に** `stripe_event_id` で **処理済み行の有無**を見る。**存在すれば** wallet ledger を増やさず終了（**冪等**）。
- DB 側は **競合時の一意性**（将来 UNIQUE 許可後）まで含め、アプリ側の **ロック順・アウト順** とセットで migration packet で詰める。

### 3.4 既存 `stripe_events` との関係

- **拡張して流用:** 運用・列が足りれば **新規テーブルなし**。  
- **責務分離:** **取り込み raw** と **Fulfillment 済み** を分けたい場合は **本候補 A の新規表**を **`reply_*` 系と近い名前**で切る（正式名は migration packet）。

---

## 4. 追加候補 B：`reply_wallet_ledgers` の Stripe 参照拡張

**狙い:** 監査台帳から **「どの Checkout／Intent／Event に紐づいた付与か」**を追えるようにする。

| 列（案） | 備考 |
|----------|------|
| **`stripe_checkout_session_id`**（nullable text） | Session id。 |
| **`stripe_event_id`**（nullable text） | Event id。 **候補 A と重複管理**になる — **どちらを正とするか**を決める（通常は **A を冪等の正**、Ledger は **監査の写し**）。 |
| **`stripe_payment_intent_id`**（nullable text） | PI id。 |
| **`payload_json` または `metadata_json`（nullable）** | **Stripe 参照のみ**・**PII 禁止**。 **候補 A に寄せる**なら Ledger は **参照列のみ**に留める選択肢あり。 |

### 4.1 Ledger をどこまで「太らせる」か

| 方針 | 説明 |
|------|------|
| **最小** | **参照 ID 列のみ（nullable）** — 台帳は人間／サポートが追える程度。 |
| **中** | **小さな `metadata_json`**（決済参照・product_key のみ）。 |
| **大**（非推奨を初期） | **payload 全文** — **PII・コスト・GDPR** の観点で **原則避ける**。 |

### 4.2 `processed_events` 側に寄せる案

- **冪等の正**を **候補 A のみ**にし、Ledger には **`stripe_event_id` 写しのみ**を入れる。  
- **再送耐性**と **監査の追跡性**を分離しやすい。

**すべて nullable／additive を原則とし、§9 の NO-GO を守る。**

---

## 5. 追加候補 C：CHECK 制約の拡張

### 5.1 `event_type`

| 選択肢 | 長所／短所 |
|--------|------------|
| **`purchase_additional_reply_ticket` を追加** | 意味が明示的。 **CHECK を変える**と **既存行の整合**を事前に要検証（違反行が無いこと）。 |
| **既存 `purchase_grant` のまま** | **DDL 変更が小さい**。 **「追加相談返書」は product_key／metadata／アプリで区別**する。 |

### 5.2 `source_of_grant`

| 選択肢 | 長所／短所 |
|--------|------------|
| **`stripe_checkout` を列挙に追加** | 監査上わかりやすい。**CHECK 更新**が必要。 |
| **既存 `PURCHASE` のまま** | **CHECK 変更不要**。 Stripe 由来は **候補 A／B の列**で表現。 |

### 5.3 既存データへの影響

- **CHECK を緩める／列挙を増やす**場合、**既存行が新しい列挙に反しない**ことを **preflight の SELECT** で確認する（§7）。
- **NOT NULL・FK・strict UNIQUE** は **まだ採用しない**（§9）。

---

## 6. 推奨案（最小 additive・1 本の「方向性」）

**本条の推奨（設計上のデフォルト案）** — **最終決定は次の additive migration preflight packet および別承認**とする。

1. **候補 A:** **`stripe_webhook_fulfillment_events` 等の新規テーブル**（名前は仮）を **冪等の正**とする。  
   - **`stripe_event_id`** を格納（**将来 UNIQUE を別ゲートで検討**）。  
   - **`report_instance_id`・`product_key`・`status`・`processed_at`** を持つ。  
   - **raw payload 全文は保存しない**（§3.2）。必要なら **hash または ID のみ**。

2. **候補 B（最小）:** **`reply_wallet_ledgers` に**  
   **`stripe_checkout_session_id`／`stripe_payment_intent_id`／`stripe_event_id`** を **nullable で追加**（全文 JSON は **持たない**が既定）。  
   - 冪等は **A に寄せ**、Ledger は **監査の写し**。

3. **候補 C:** **第一弾は CHECK を変えず**、  
   **`event_type = purchase_grant`** かつ **`source_of_grant = PURCHASE`**（または NULL 方針を packet で固定）にし、**チケット種別は `product_key`／metadata／アプリ**で区別。  
   - **明示的な `purchase_additional_reply_ticket`／`stripe_checkout` が必要**になった時点で **第二弾 migration** で CHECK を **additive 拡張**（既存行検証つき）。

**理由（要約）:** 診断上 **`stripe_events` は存在**するが、**Fulfillment 冪等の責務**を **既存テーブルに無理に詰め込む**より、**専用の薄い processed 表**の方が **変更影響を隔離**しやすい。**CHECK は既存データと衝突しやすい**ため **第一弾は据え置き**を推奨する。

---

## 7. Preflight / Postflight

**いずれも SELECT-only（migration packet で具体クエリを固定）**。**件数・スキーマ・制約の存在**に留め、**秘密・生 ID・payload 本文は出さない。**

### 7.1 Migration 前（preflight）

| # | 確認 |
|---|------|
| 1 | `reply_ticket_wallets`／`reply_wallet_ledgers` の **件数**（ベースライン）。 |
| 2 | **`report_instance_id` IS NOT NULL の件数**（wallet／ledger 別）。 |
| 3 | 既存 **`pg_constraint`** で **`event_type`／`source_of_grant`** の **CHECK 全文**（候補 C を触る場合）。 |
| 4 | **`stripe_events`** の列（再利用判断時）。 |
| 5 | 既存 **cap 違反行が無い**こと（`available_count` 式）。 |

### 7.2 Migration 後（postflight）

| # | 確認 |
|---|------|
| 1 | **§7.1 の件数**と **一致**（**既存 wallet／ledger 行数が変わっていない**）。 |
| 2 | **`report_instance_id` 件数**が **意図せず変化していない**（新 migration が **既存行を UPDATE しない**設計のとき）。 |
| 3 | **追加したテーブル／列／制約**が **存在**すること（`information_schema`／`pg_catalog`）。 |
| 4 | 新テーブルに **期待する索引候補**（将来）の有無 — **strict UNIQUE は別承認**。 |

---

## 8. Rollback / disable

| 論点 | 方針 |
|------|------|
| **Additive migration** | 原則 **列・表追加のみ**なら **ロールバック不要**で運用継続しやすい。**DROP は慎重**（別手順）。 |
| **無効化スイッチ** | **アプリ／env** で **Webhook 処理を止める**（DB だけにスイッチを持たせない前提を基本とする）。DB に持つ場合は **別 ADR**。 |
| **誤処理** | **`processed_events` の status** と **手動是正手順**（レジャーとの突合）を **runbook** で定義 — **本条では手順詳細まで書かず**、migration packet で参照。 |

---

## 9. NO-GO（本条の達成だけでは開始しない）

- **migration APPLY**（本条は **ファイルも作らない**）  
- **Webhook 実装**  
- **Checkout API 実装**  
- **Stripe Dashboard 変更**  
- **商品棚 UI**  
- **env／secret／Webhook secret の出力・転記**  
- **NOT NULL・FK・strict UNIQUE の新設**（**別ゲート**）

---

## 10. 次の候補（順序）

1. **Additive migration preflight packet**（SELECT-only の具体クエリ・ベースライン記録）  
2. **Additive migration candidate**（**ドラフト SQL**・**まだ APPLY しない**）  
3. **Shadow／staging での検証**  
4. **Production preflight**  
5. **Production apply gate**（承認・メンテ窓口）  
6. **その後** — Checkout／Webhook 設計・実装（別チケット）

---

## CHANGELOG

- **2026-04-28:** v1 初版。診断結果 SSOT を前提に additive migration の候補 A/B/C と推奨方向性を整理。
