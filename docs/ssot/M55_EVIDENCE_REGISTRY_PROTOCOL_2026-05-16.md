# M55 AI-safe Evidence Registry Protocol (2026-05-16 SSOT)

## 1. Protocol name

**M55 AI-safe Evidence Registry Protocol**

---

## 2. Purpose

- **Stripe／Vercel／Supabase／UI の証跡を一貫して管理する。**
- **AI／Cursor／SSOT が後から同一証跡を `evidence_id` で識別できるようにする。** **機密となるフル外部 ID は保存しない。**
- **phase ごとの証跡と後続 diagnostic を `evidence_id` で接続する。**

---

## 3. Evidence ID format

採用形式：

```text
M55-EVID-YYYYMMDD-PHASE-SOURCE-KIND-NNN
```

例（**説明／テンプレート**）：

| example_id | メモ |
|------------|------|
| `M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001` | 決済状態の観測 |
| `M55-EVID-20260516-5Y-A-STRIPE-EVENT-001` | イベント種別の観測 |
| `M55-EVID-20260516-5Y-A-VERCEL-LOG-001` | 汎用 Vercel ログ行 |
| `M55-EVID-20260516-5Z-A-WEBHOOK-DELIVERY-001` | 将来の webhook 配送観測（**未取得時は未到達**） |
| `M55-EVID-20260516-5Z-A-SUPABASE-ENTITLEMENT-001` | 将来の DB read-only entitlement 観測 |

- **`PHASE`：** **`5Y-A`**、`**5Z-A**` のようにフェーズタグ。** **ソース・種別との区切りはハイフンで統一。**
- **`NNN`：** **同一日・同一 PHASE-SOURCE-KIND 内で 001 から採番。**

---

## 4. Evidence Registry schema

各証跡は最低限以下の項目で記録する（不足は **`NEEDS_FOLLOWUP`**）。

| Field | Description |
|--------|-------------|
| **evidence_id** | **`M55-EVID-...`** |
| **phase** | **`5Y-A`** 等 |
| **source_system** | 下記いずれか |
| **evidence_kind** | 下記いずれか |
| **observed_at_jst** | **人間確認の日本時間（可能なら）** |
| **observed_at_utc** | **取得できる場合のみ** |
| **product_id_redacted_or_public** | **例：** **`DTR_CORE_STATIC_V1`** |
| **amount** | **例：** **1000** |
| **currency** | **例：** **`jpy`** |
| **status_summary** | **paid／complete／200／失敗理由の redacted 要約など** |
| **redacted_external_ref** | **prefix＋末尾マスクのみ**（例：**`cs_live_****abcd`** のような粒度。**フル値は載せない**） |
| **local_fingerprint_optional** | **`fp_sha256_12:`** で始まる 12 hex など（**ソース ID を復元しない**） |
| **linked_ssot_doc** | **対応する SSOT Markdown パス** |
| **linked_phase** | **上流／下流フェーズ名** |
| **allowed_next_action** | **`read-only`** 等 |
| **prohibited_next_action** | **replay／full-ID paste 等** |
| **notes_redacted** | **PII を含めないメモ** |

### source_system（列挙）

- **Stripe Dashboard**
- **Stripe Workbench Events**
- **Stripe Workbench Logs**
- **Vercel Runtime Logs**
- **Vercel Deployments**
- **Supabase Production DB**
- **M55 UI**

### evidence_kind（列挙）

- **payment**
- **checkout_session**
- **stripe_event**
- **stripe_request**
- **webhook_delivery**
- **vercel_log**
- **db_row_presence**
- **ui_observation**

---

## 5. Redaction rule

### 記録禁止

- **フル Checkout Session ID**
- **フル Payment Intent ID**
- **フル Customer ID**
- **email 全文**
- **client_reference_id 全文**
- **user_id 全文**
- **フル Stripe Event ID**
- **フル Stripe Request ID**
- **フル Price ID**
- **`STRIPE_SECRET_KEY`／`whsec`／`service_role` 全文**

### 記録可能

- **object type**
- **prefix カテゴリ（必要最小限のみ）：** **`cs_live`**／**`pi`**／**`evt`**／**`req`** など
- **末尾マスクのみ：** **`****` + last4／last6**（**ソース文字列そのもの以外で推測される長さにならないよう注意**）
- **timestamp**
- **status**
- **product**
- **amount**
- **source system**
- **phase**
- **local fingerprint（下記§6により人間ローカルのみから生成された短さ）**

---

## 6. Local fingerprint rule

- **フル ID を AI／Cursor／SSOT に貼らず**、**人間のローカル環境のみ**で fingerprint を計算してよい。
- **fingerprint は任意。**
- **SSOT に残すのは短いハッシュのみ。**
- **フルソース ID は保存しない。**
- **salt を使う場合、salt は repo／チャット／SSOT に保存しない。**

推奨表記：

```text
fp_sha256_12: xxxxxxxxxxxx
```
（**`xxxxxxxxxxxx` は 12 桁の hex。復元不可能な切り詰め**）

---

## 7. Evidence state

各 Evidence は次の **`state`** を持つ：

| State | 意味 |
|-------|------|
| **OBSERVED** | **観測されたが SSOT に未記録** |
| **REDACTED_RECORDED** | **本 Registry に redacted で登録済み** |
| **SOURCE_CONFIRMED** | **人手がソース側で確認済み（full ID は SSOT 外）** |
| **NEEDS_FOLLOWUP** | **追加証跡が必要** |
| **SUPERSEDED** | **より新しい evidence に置換** |
| **BLOCKED** | **証跡取得が規約により停止中** |
| **GREEN** | **計画済みチェックリスト上は整合** |

---

## 8. Current 5Y-A evidence seeds（初期登録）

**フル ID は一切記載しない。** **以下は説明／seed であり、tabular registry の初版。** **event／request のイベント ID は SSOT に含めない。**

### M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001

- **phase:** **`5Y-A`**
- **source_system:** Stripe Dashboard（Payments）
- **evidence_kind:** **payment**
- **status_summary:** **`complete`**／**`paid`**
- **product_id_redacted_or_public:** **`DTR_CORE_STATIC_V1`**
- **amount:** **1000**
- **currency:** **`jpy`**
- **state:** **`REDACTED_RECORDED`**
- **linked_ssot_doc:** `docs/ssot/M55_PHASE5_6H_5Y_A_DTR_BASE_LIVE_PAYMENT_PAID_CONNECTION_BLOCKED_CHECKPOINT_2026-05-16.md`
- **full IDs:** **not recorded**

### M55-EVID-20260516-5Y-A-STRIPE-EVENT-001

- **source_system:** Stripe Workbench Events
- **evidence_kind:** **stripe_event**（種別：**`checkout.session.completed`** と人手で確認できる範囲）
- **observed_at_jst:** **about 2026-05-16 22:49 JST**（**およそ。フルイベント ID は SSOT に保存しない**）
- **full event ID:** **not recorded**
- **state:** **`SOURCE_CONFIRMED`** または **`REDACTED_RECORDED`**（運用側判断）

### M55-EVID-20260516-5Y-A-STRIPE-LOG-001

- **source_system:** Stripe Workbench Logs
- **evidence_kind:** **stripe_request**（checkout／session／payment 系 API と人手で読める範囲）
- **status_summary:** **200 OK（要約のみ）**
- **full request ID:** **not recorded**

### M55-EVID-20260516-5Y-A-VERCEL-PROCESSING-001

- **source_system:** Vercel Runtime Logs
- **evidence_kind:** **vercel_log**
- **notes_redacted:** **`/dtr/processing`**、**HTTP 200**、**`verifyStripeCheckoutSessionForDtr`** **`valid`** **`true`（5Y-A 再掲）**
- **full session／user／email：** **not recorded**

### M55-EVID-20260516-5Y-A-M55-UI-001

- **source_system:** M55 UI
- **evidence_kind:** **ui_observation**
- **status_summary：** **`接続を確認できませんでした`**
- **screenshot committed:** **no**

---

## 9. Operational rules

1. **`5Z-A` 以降の read-only 診断は、外部ソースを指すとき `evidence_id` を優先引用する。** **フル外部 ID でテーブルを埋めない。**
2. **ダッシュボード検索にフル ID が必要な場合：人間が UI またはローカル私密メモのみで入力する。**
3. **AI／Cursor は `evidence_id`、時間帯、`source_system`、末尾マスク済み参照、状態（status）のみを前提に質問／追記する。**
4. **フル ID が SSOT に必須になった場合：作業停止し、`human-only handling` Gate を別途確立してからのみ扱う。**

---

## 10. 判定（Protocol の採用状態）

本 Protocol ドキュメントの採用と 5Y-A seed の登録方針を承認する場合：

**`EVIDENCE_REGISTRY_PROTOCOL_GREEN`**

---

## 11. 未実行事項（Protocol 導入コミット／5Z-A0 と共通スコープ）

- **No read-only Production DB diagnostic in this phase（`5Z-A` 着手前）**
- **No webhook replay**
- **No Stripe webhook changes／No `STRIPE_WEBHOOK_SECRET` change／No env／secret changes**
- **No DB writes**
- **No code／runtime／UI changes**
- **No refund／rollback**
- **No second payment**
- **No full IDs recorded**

加えて：**`/api/stripe/*` の直接実行は禁止。** **Production DB 読み書きは本条では行わない。**

## 12. Cross-reference

Phase checkpoint:

- **`docs/ssot/M55_PHASE5_6H_5Z_A0_EVIDENCE_REGISTRY_PROTOCOL_CHECKPOINT_2026-05-16.md`**

Upstream planning:

- **`docs/ssot/M55_PHASE5_6H_5Z_POST_PAYMENT_FULFILLMENT_ENTITLEMENT_REPORT_UNLOCK_DIAGNOSTIC_PLANNING_2026-05-16.md`**

Next execution phase（**本条では開始しない**）：

- **`Phase 5-6H-5Z-A`** — Post-payment fulfillment read-only diagnostic execution（**`evidence_id` と redacted のみ**）
