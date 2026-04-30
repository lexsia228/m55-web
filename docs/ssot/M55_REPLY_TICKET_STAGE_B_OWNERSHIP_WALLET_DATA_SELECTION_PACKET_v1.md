# M55 追加相談返書 — Stage B ownership / wallet データ選定パケット（v1）

**文書種別:** [`M55_REPLY_TICKET_STAGE_B_OWNERSHIP_WALLET_VALIDATION_GATE_v1.md`](./M55_REPLY_TICKET_STAGE_B_OWNERSHIP_WALLET_VALIDATION_GATE_v1.md) 実行**前**の **SELECT-only** 確認用パケット  
**バージョン:** v1  
**SQL companion:** [`../../scripts/sql/production/m55_reply_ticket_stage_b_ownership_wallet_data_selection.sql`](../../scripts/sql/production/m55_reply_ticket_stage_b_ownership_wallet_data_selection.sql)

**本ファイルおよび SQL ファイル作成時:** API / Stripe は呼んでいない。**DB に対して本エージェントはクエリを実行していない**。**cookie / token / secret / raw user id / PII / 本文**は本文書に載せていない。

---

## 1. この packet の役割

| 項目 | 内容 |
|------|------|
| **用途** | 所有権／wallet／active／cap 系 **Stage B API 検証**に使う **`report_instance_id` の選択方針**と **環境可否**を、**読み取りだけ**で整える。 |
| **SELECT-only** | 付属 SQL は **WITH + SELECT のみ**。`UPDATE` / `INSERT` / `DELETE` / DDL / `SET` は**含めない**。 |
| **GO とはしない** | この packet（または結果）**単体では** **`POST /api/reply-tickets/checkout` の実実行 GO としない**。別ゲート／別承認が必要。 |
| **出力禁則** | **raw Clerk `user_id`、生日、report／相談／payload、secret、DB URL** を **SSOT・チャットへ出さない**。SQL 結果を SSOT に貼る場合も **カウントとブールのみ**を推奨。 |

---

## 2. 確認したいこと（設計質問への回答）

### 2.1 ログイン済みユーザー用 `report_instance_id` 選定方針

- **SQL は「誰がログイン中か」を知らない。** オペレーターが **ローカル限定のコピー**でだけ、`params.operator_user_hash_hex16` に **`hashUserIdForLedgerLog` の **先頭 16 hex****（[`readReplyWalletProbe.ts`](../../lib/m55/reply/readReplyWalletProbe.ts) と同等の SHA256-UTF8 切り詰め）を束縛すると **`owned_report_candidates_count`** および **スコープ付き補助列**が使える。
- **実際の API に渡す UUID** は、アプリ UI または **本人が安全な方法で取得した snapshot id** を用いる（**他人の UUID をチャット転載しない**）。
- **`digest` 未搭載 DB** の場合は **ハッシュ束縛を諦め**、グローバル件数のみ利用する。

### 2.2 所有権なし（403 `forbidden_not_owner`）

- **現在の SQL は「第三者の user_id」を返さず、他人由来の UUID を自動列挙しない**。
- **`forbidden_not_owner` は運用上「他人の／無権限の `report_instance_id`」が要る**。**可能なら本ケースは後回し**でよい。
- **必要になったとき**は、本人が許可された UI または **開発専用の安全な手順**でのみ別 UUID を準備する（本 packet の **コメント済みサンプル SELECT** と混同しない）。

### 2.3 wallet なし（404 `wallet_not_found`）

- **`wallet_missing_candidates_count`:** 「スナップショットはあるが、同一 `user_id` の `reply_ticket_wallets` 行が **存在しない**」スナップショット種類の **総数**。
- **必要時のみ**ファイル末尾コメントにある **`report_instance_id` 限定の SELECT**（ローカルでコメント解除）を **最大 3 行**まで。

### 2.4 wallet 非 active（422 `wallet_not_active`）

- **`wallet_inactive_candidates_count`:** `reply_ticket_wallets.status` が **`active` 以外**の **行数**。
- オペレーター束縛時は **`scoped_operator_inactive_wallet_with_owned_snapshot_hint_count`**（**本人スナップショットと非 active wallet の対応が取れるか**のヒント、**wallet 行は重複排除**）。

### 2.5 cap 到達（422 `cap_reached`）

- アプリ／RPC と同型条件:  
  `(initial_included_count + purchased_count >= 5) OR (purchased_count >= 4)`  
  を満たす **wallet 行数** → **`cap_reached_candidates_count`**。
- 束縛時は **`scoped_operator_cap_wallet_with_owned_snapshot_hint_count`**（同様に DISTINCT wallet）。

### 2.6 DB 不変 baseline（Stage B API validation 前後）

- **`processed_events_total_count`**（`stripe_processed_events`）  
- **`reply_ticket_wallets_total_count`**  
- **`reply_wallet_ledgers_total_count`**  
- **`reply_sessions_total_count`**
- Stage B の **validation のみ**の API では **これらが変わらない**こと（任意で実行前後 `SELECT-only` で突き合わせ）。

---

## 3. summary 項目（結果行の解釈）

| 出力列（SQL） | 意味 |
|----------------|------|
| `processed_events_total_count` | `stripe_processed_events` 総行数 |
| `reply_ticket_wallets_total_count` | wallet 総行数 |
| `reply_wallet_ledgers_total_count` | ledger 総行数 |
| `reply_sessions_total_count` | `reply_sessions` 総行数 |
| **`operator_hash_bound_bool`** | オペレーターがハッシュを束縛したか（**hex 値は出力しない設計**） |
| **`owned_report_candidates_count`** | 束縛時: ハッシュ一致ユーザーの snapshot 件数。**未束縛: NULL**。 |
| **`wallet_missing_candidates_count`** | 「wallet 欠損ユーザー」の snapshot のユニーク件数 |
| **`wallet_inactive_candidates_count`** | 非 active wallet **行数** |
| **`cap_reached_candidates_count`** | cap 条件を満たす wallet **行数** |
| **`scoped_operator_wallet_missing_match_count`** | 束縛時のみ: 自分の snapshot のうち wallet 欠損に該当する件数 |
| **`scoped_operator_inactive_*` / `scoped_operator_cap_*`** | 束縛時のみ: 自分の snapshot と紐づく user の inactive / cap wallet の **ヒント件数（DISTINCT wallet）** |
| **`blocking_gap_count`** | **グローバル**において、`wallet_missing`／`inactive`／`cap` の **それぞれが 0 のときに 1 点ずつ加点**した合計（0〜3）。**「どの論理ケースも population がいない」ほど大きい。** |
| **`safe_to_run_ownership_wallet_validation`** | ヒューリスティック: *（欠損／非active／cap のいずれかが 1 件以上）**または**（束縛ありかつ owned snapshot > 0）*。**false でも個別ケースを個別承認で進められる** — 自動拒否ではない。 |

---

## 4. STOP 条件（packet 利用時）

- **この SQL や調査結果を理由に** **API 実施を自己承認しない**（別承認）。
- **Checkout URL が返る**ところまで進める **Stage B 所有権/wallet 検証**は **本 packet の外**（STOP）。
- **live 課金**、**実 Webhook**、**DB 更新でケース捏造**、**商品棚 UI**、**DTR checkout 改変**、**Stripe Dashboard / env 変更**。
- **raw user_id・Cookie・token・secret** を **SSOT / チャットに貼る**。

---

## 5. 現時点の判定

| 項目 | 判定 |
|------|------|
| **data selection packet / SQL の作成** | **GO**（**実行とコミット束縛はオペレーター責任**） |
| **ownership/wallet Stage B の API 実行** | **別承認** |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |

---

## 厳守事項（本タスクにおけるエージェントの範囲）

- **文書と SELECT-only SQL の追加のみ**。当該 SQL の **実行はしていない**。API・Stripe・DB 更新・秘密情報出力・UI 変更は行っていない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_OWNERSHIP_WALLET_DATA_SELECTION_PACKET_v1*
