# M55 追加相談返書 — Phase IV RPC Production APPLY 結果 SSOT (v1)

**文書種別:** 本番 APPLY 結果の証跡（SSOT）  
**バージョン:** v1  
**対象:** `public.m55_reply_ticket_fulfill_checkout_event` の RPC 作成（CREATE OR REPLACE FUNCTION のみ）

---

## 1. 実行環境

| 項目 | 内容 |
|------|------|
| リポジトリ／ブランチ | m55-soul-core / **main** |
| 環境 | **PRODUCTION** |
| 実行 SQL | RPC **candidate** の **CREATE OR REPLACE FUNCTION のみ** |
| GRANT / REVOKE | **未実行** |
| Webhook 本実装 | **未変更** |
| Checkout API | **未変更** |
| Stripe Dashboard | **未変更** |
| 商品棚 UI | **未変更** |
| 本番決済テスト | **実施していない** |

---

## 2. 実施内容

- **`public.m55_reply_ticket_fulfill_checkout_event` を作成**（本番 DB 上）
- **LANGUAGE:** `plpgsql`
- **SECURITY DEFINER:** はい（`SECURITY DEFINER`）
- **SET search_path:** `public`（`search_path = public`）
- **RETURNS:** `jsonb`
- **DTR 関数:** **変更していない**（本 APPLY 対象外）

---

## 3. Postflight 結果

### 3.1 関数メタデータ（存在・定義）

| 項目 | 値 |
|------|-----|
| `schema_name` | `public` |
| `function_name` | `m55_reply_ticket_fulfill_checkout_event` |
| `identity_arguments` | `p_stripe_event_id text, p_checkout_session_id text, p_payment_intent_id text, p_product_key text, p_report_instance_id uuid, p_wallet_scope_user_id text, p_user_ref_hash text, p_quantity integer` |
| `result_type` | `jsonb` |
| `is_security_definer` | `true` |
| `function_config` | `["search_path=public"]` |

### 3.2 Postflight 件数

| メトリクス | 値 |
|------------|-----|
| `stripe_processed_events_count` | **0** |
| `wallet_count` | **8** |
| `ledger_count` | **10** |
| `session_count` | **11** |

---

## 4. 判定

- **RPC production APPLY は PASS** とする。
- **fulfillment トランザクションを DB 側 RPC として実行できる受け皿が本番に存在する**状態を、この文書で固定する。
- **ただし、まだ Webhook から当該 RPC は呼ばれていない。**
- **まだ追加チケット付与は稼働していない**（本番での付与フローは未接続）。

---

## 5. 残論点

- Webhook **Reply lane** から RPC を呼ぶ実装は **未実装**。
- **`event.id` 欠損 STOP** の本実装が必要。
- **`report_instance_id` 欠損 STOP** の本実装が必要。
- RPC 戻り値の扱い（**`duplicate_noop` / `skipped_cap` / `rejected_*`** 等）と **HTTP 応答の整理**が必要。
- **本番決済テストはまだ禁止**とする。
- **商品棚 UI はまだ禁止**とする。

---

## 6. 引き続き NO-GO

以下は **本 SSOT の範囲を超えた作業**として、**引き続き実施しない（NO-GO）**。

- Webhook 本実装
- Checkout API の追加変更
- Stripe Dashboard / 環境変数の変更
- 商品棚 UI の変更
- 本番決済テスト
- secret / Webhook secret / DB URL の出力
- GRANT / REVOKE の追加実行（本 APPLY でも未実行のまま）
- RPC の手修正による再実行（意図しないドリフト防止）

---

## 7. 次の候補（推奨順・概念）

1. **この SSOT をコミット**し、証跡をブランチ履歴に紐付ける。
2. 次ゲート:**Webhook Reply lane → RPC 呼び出し implementation gate** の整理・合意。
3. その後の **最小実装**（lane から RPC を呼ぶまでの最短経路）。
4. **typecheck / lint** の通過確認。
5. **RPC 呼び出しの dry-run 設計**。
6. **test mode での E2E 設計**。
7. **本番決済テスト**は上記および関連ゲートの後段。

---

## 厳守事項（本ファイルに関して）

- **文書作成のみ**が本タスクの範囲。
- SQL の実行・DB の更新・Webhook ルートの変更・Checkout API の変更・Stripe Dashboard / env / UI の操作・secret の出力は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_PHASE_IV_RPC_PRODUCTION_APPLY_RESULT_v1*
