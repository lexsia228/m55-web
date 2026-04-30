# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_CANDIDATE_DRAFT_v1

Status: **Fulfillment additive migration の candidate DDL ドラフト SSOT** — **実行可能 migration ではない。APPLY は禁止。**  

Recorded: **2026-04-28**

Upstream:

- **Preflight 結果:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PREFLIGHT_RESULT_v1.md`
- **設計レビュー:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_DESIGN_REVIEW_v1.md`
- **ドラフト SQL（コメントのみ・実行なし）:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_candidate_draft.sql`

**秘密鍵・DB URL・Webhook secret・payload 本文・生の `user_id` を本条・ドラフトファイルに記載しない。**

---

## 1. 本 draft の目的

追加相談返書チケットの **Stripe Fulfillment** に向け、**冪等記録用の薄いテーブル**と **Ledger の nullable 参照列**を、**初回 CHECK 改変なし**・**NOT NULL／FK／strict UNIQUE なし**の範囲で **文章化・コメント DDL 化**し、**レビューおよび shadow／staging 適用設計**への入力とする。

---

## 2. NOT A MIGRATION / DO NOT RUN の扱い

| 項目 | 内容 |
|------|------|
| 配置 | **`supabase/migrations` には置かない** |
| 実行 | **本番・shadow・staging へは貼り付け APPLY しない**（別 gate） |
| SQL ファイル実体 | **`CREATE`／`ALTER` はブロックコメント内のみ** — **実行可能文はゼロ** |
| 昇格 | **承認後**に正式 migration ファイル名・順序・環境を決め、**検証後**にのみ適用 |

---

## 3. Candidate A — processed events テーブル（`stripe_processed_events` 相当）

| 列（候補） | 備考 |
|------------|------|
| `id` | `uuid DEFAULT gen_random_uuid()` — **当面 NOT NULL／PK は入れない**（将来ゲート） |
| `stripe_event_id` | text — **冪等の主キー論理**。**Webhook 本番前に実効的な一意性が必須**だが、本 draft では **strict UNIQUE を書かない** |
| `checkout_session_id` | text nullable |
| `payment_intent_id` | text nullable |
| `product_key` | text nullable |
| `report_instance_id` | uuid nullable |
| `user_ref_hash` | text nullable — **生 `user_id` の代替**としての **ハッシュ列**を候補（列名は `user_id_hash` と比較可） |
| `status` | text |
| `processed_at` | timestamptz nullable |
| `created_at` | timestamptz default `now()` |
| `updated_at` | timestamptz default `now()` nullable |

**原則:** **raw Stripe payload 全文は保存しない。**  

**将来ゲート（コメントに記載）:** `stripe_event_id` 向け **`UNIQUE INDEX`／`CONSTRAINT`**（partial UNIQUE など）を **Webhook 本番前までに必須**とするが、**本 candidate ドラフトには含めない**。

---

## 4. Candidate B — `reply_wallet_ledgers` に nullable の参照列のみ

| 候補 | 備考 |
|------|------|
| `stripe_event_id` | text nullable |
| Checkout 系（**どちらか一本**） | **`stripe_checkout_session_id`**（Stripe 名前空間明示） vs **`checkout_session_id`**（短い） — **一覧性・リポ規約・既存コードとの衝突**で比較する |
| Intent 系（**どちらか一本**） | **`stripe_payment_intent_id`** vs **`payment_intent_id`** — 同上 |
| `product_key` | text nullable |

**方針:** Ledger は **監査台帳**。**太らせすぎない**。**`payload_json` は第一候補から外す**（冪等表＋参照 ID で足りる設計）。  

**冪等の「正」**は **Candidate A**。Ledger は **写し**として扱う前提（設計レビューと整合）。

---

## 5. Candidate C — CHECK 据え置き方針

- **初回 candidate では** `reply_wallet_ledgers` の **CHECK を一切変更しない**。
- Ledger 行は **既存の `purchase_grant`／`source_of_grant` の `PURCHASE`（または許容される NULL 方針）** に寄せる（preflight の `check_can_use_existing_values_without_extension` と整合）。
- **`purchase_additional_reply_ticket`／`stripe_checkout`** は **後続 migration の検討事項**として **文書のみ**保持する。

---

## 6. strict UNIQUE／FK／NOT NULL を今回入れない理由

| 論点 | 理由 |
|------|------|
| **strict UNIQUE** | スキーマ変更のインパクトと **一意性ポリシー**（partial / WHERE NOT NULL）は **運用確認後**が安全。**draft は「論点の固定」**。 |
| **FK** | 参照先 Stripe 側に **実テーブルの PK と一致しない**可能性や、**イベント行のライフサイクル**との結合順を **別レビュー**で詰める。 |
| **NOT NULL** | 既存処理・バックフィルなしでの **強制はリスク**。**nullable additive** で **スキーマのみ先に**。 |

---

## 7. Webhook 本番前に冪等性の実効担保が必須であること

**DB だけでなくアプリ側の「先読み INSERT」競合でも**、`stripe_event_id` 軸が **論理的・物理的に重複しない**運用になるよう、**Webhook 本番適用ゲートまでに**:

- **`stripe_event_id`（または運用決めた別キー）の一意 enforce** を **DB または同等のロック戦略**で満たすこと、  
と **明示的ゲートに含める**。本ドラフトでは **コードを書かず**、その **必須性のみ**本条で固定する。

---

## 8. Preflight / Postflight の候補（SELECT）

| タイミング | 例（一覧のみ — 具体クエリは preflight PACKET／別スクリプト） |
|------------|------------------------------------------------------------|
| **適用前** | §A 名前衝突、§B **列の未存在**、wallet／ledger **行数／cap**、Stripe 既存索引 |
| **適用後** | **行数変化しない**ことが期待どおりか、**新表／新列が存在する**、`information_schema`／`pg_catalog` のみ |

※ **件数・定義のみ**。秘密・生 ID・payload を結果に載せない。

---

## 9. shadow／staging 適用前の監査項目（目安）

1. **本 draft と正式 migration の diff**（名前・列・順序）は **レビュー承認**。  
2. **ロールバック方針**（additive は原則列DROPを慎重に）は **runbook**。  
3. **既存アプリが未使用列でも壊れない**ことの **読み**。  
4. **shadow DB** でだけ **ドラフト DDL の実行検証**（本番 APPLY は別ゲート）。

---

## 10. まだ NO-GO の範囲

- **migration APPLY**（`supabase/migrations` への格納含む確定ファイルの本番適用）  
- **本番／shadow／staging への DDL 実行**（**別承認があるまで本条のドラフトを流用 APPLY しない**）  
- **Webhook／Checkout API／Stripe Dashboard／商品棚 UI** の実装  
- **secret／Webhook secret の出力・転載**  

---

## 次アクション（短い）

1. 列名 **`stripe_*` prefix vs short name** をレビューで一本化する。  
2. **Formal migration SQL** を **新規ブランチ**で起案（**まだマージ APPLY しない**）。  
3. **shadow／staging** で **postflight** まで通す。

---

## CHANGELOG

- **2026-04-28:** v1 初版。candidate A/B/C と禁止事項・ゲートを整理。
