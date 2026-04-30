# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_STAGING_GATE_v1

Status: **shadow／staging 検証用 DDL 起案可否のゲート SSOT** — **本条は実行可能 DDL の承認・migration 配置・production APPLY の許可証ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Candidate ドラフト SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_CANDIDATE_DRAFT_v1.md`
- **ドラフト SQL（コメントのみ）:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_candidate_draft.sql`
- **Preflight 結果:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PREFLIGHT_RESULT_v1.md`

**秘密鍵・DB URL・Webhook secret・payload 本文・生の識別子を本条に書かない。**

---

## 1. 現在の draft 到達点（要約）

| 項目 | 状態 |
|------|------|
| **冪等格納** | **`stripe_processed_events` 相当**の薄いテーブルを **候補**としてドラフト化済み（実行用 migration ではない） |
| **Ledger** | **`reply_wallet_ledgers` に nullable の Stripe 参照列**を追加する **候補** |
| **`payload_json`** | **初回は入れない**方針（第一候補） |
| **CHECK** | **初回では変更しない** |
| **NOT NULL／FK／strict UNIQUE** | **まだ入れない**（ドラフト範囲） |
| **Webhook 本番** | 本番前までに **冪等性の実効担保**（論理・物理）が **必須** — UNIQUE 等は **別ゲート** |

---

## 2. shadow／staging 候補で「作ってよい」もの（本条の GO 範囲）

次の **種類**の成果物は **shadow／staging 検証専用**として **起案してよい**（**ファイル作成は「次の別承認」**とする — 本条 §8）。

| 許可される成果物 | 条件 |
|------------------|------|
| **実行可能 DDL 候補ファイル**（新規） | **production 用ではない** とファイル先頭に明記 |
| **対象環境** | **shadow／staging のみ** を想定した命名・コメント |
| **配置** | **`supabase/migrations` にはまだ置かない**（repo 上は `scripts/sql/staging/` 等の **検証用ディレクトリ**を別途決める） |
| **DDL の性質** | **additive／nullable のみ**。**既存行の `UPDATE` は含めない**（列追加と空テーブルのみ） |

---

## 3. 候補 DDL の範囲（shadow／staging で試してよい論理スコープ）

以下 **のみ**を候補とし、**本条の外**の追加は **再ゲート**する。

| # | 内容 |
|---|------|
| 1 | **`public.stripe_processed_events`**（仮称のまま **本番接続なし**で検証）— **新規テーブル** |
| 2 | **`reply_wallet_ledgers`** に **nullable** の参照列追加（**一本化した列名**に従う — §4） |
| 3 | **CHECK の変更なし** |
| 4 | **NOT NULL なし** |
| 5 | **FK なし** |
| 6 | **strict UNIQUE なし**（§4 で **shadow 限定の別コメント UNIQUE 案**を **比較用**に残すか検討。**デフォルトは入れない**） |
| 7 | **raw payload 全文の保存なし** |

---

## 4. 重要な未解決論点（起案前または起案と並行で収束）

| # | 論点 | メモ |
|---|------|------|
| 1 | **`stripe_event_id` の一意性** | **本番 Webhook 前に必須**。**今回の shadow／staging 候補**では **原則 UNIQUE を入れない**。**代替案:** shadow 用スクリプトに **「検証専用 UNIQUE 候補」をコメントまたは別ブロック**で残し、**staging ポリシー**で可否を比較する。 |
| 2 | **`processed_events` と `stripe_events`** | **役割分担**（raw／取り込み vs Fulfillment 済み）を文言で固定し、**二重記録**を避ける。 |
| 3 | **Checkout／Intent 列名** | **`stripe_checkout_session_id` vs `checkout_session_id`**、**`stripe_payment_intent_id` vs `payment_intent_id`** の **一本化**。 |
| 4 | **Ledger の太り** | **参照 ID まで**を初期上限とし、**JSON／payload は載せない**。 |

---

## 5. shadow／staging preflight（実行前に必須の SELECT）

※ **既存** `m55_reply_ticket_fulfillment_additive_migration_preflight.sql` を **shadow／staging 接続で**流用またはコピー調整してよい。**件数・カタログのみ**。

| # | 確認 |
|---|------|
| 1 | 対象 **テーブル／列が未存在**（`stripe_processed_events`、追加予定 Ledger 列） |
| 2 | **既存行数**（wallet／ledger／session） |
| 3 | **`report_instance_id` の NULL／非NULL ベースライン** |
| 4 | **`processed_events` が未作成**であること |
| 5 | **Ledger 参照列が未作成**であること |

---

## 6. shadow／staging postflight（適用後の SELECT）

| # | 確認 |
|---|------|
| 1 | **新規テーブル**が存在すること |
| 2 | **追加列**が存在すること |
| 3 | **既存 wallet／ledger／session の総行数**が **適用前と一致**すること |
| 4 | **既存 RI（`report_instance_id`）の NULL／非NULL 件数**が **変化していない**こと |
| 5 | Ledger の **CHECK 定義**が **文字列として変化していない**こと（`pg_get_constraintdef` 比較） |
| 6 | **新列・新表にペイロード本文／secret を書いていない**こと（適用 DDL が **INSERT しない**ことを設計で保証） |

---

## 7. STOP 条件（即座に中止・差し戻し）

以下のいずれかになったら **shadow／staging であっても** **中止し別ゲート**とする。

| STOP | 内容 |
|------|------|
| 1 | **production** に向けて DDL を実行しようとする |
| 2 | **`supabase/migrations`** に **本番昇格前提**で置こうとする |
| 3 | **CHECK** を変更する |
| 4 | **NOT NULL／FK／strict UNIQUE** を **このゲート外の意図**で入れる（**許可リスト外**） |
| 5 | **payload 全文**を DB に保存する列・行を増やそうとする |
| 6 | **Stripe／Webhook／Checkout 実装**に **この DDL 適用のみで** 「本番準備完了」とジャンプする |

---

## 8. 現時点の判定（本条の結論）

| 項目 | 判定 |
|------|------|
| **本条（shadow／staging gate SSOT の作成）** | **GO** |
| **実行可能 DDL 候補ファイルの新規作成** | **次の別承認**（本条単体では行わない） |
| **shadow／staging での APPLY** | **別承認** |
| **production APPLY** | **NO-GO** |

---

## CHANGELOG

- **2026-04-28:** v1 初版。shadow／staging 専用検証ゲートとして範囲・STOP を固定。
