# M55 Commerce Compliance Evidence Contract and Actual-Diff Plan Rev1

- **Gate ID:** `CATEGORY-2-M55-COMMERCE-COMPLIANCE-EVIDENCE-CONTRACT-AND-ACTUAL-DIFF-PLAN-REV1`
- **Status:** CONTRACT DRAFT（実装前・docs-only）
- **Canonical worktree:** `/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish`
- **Base SHA:** `0015b0a6ec0294d817c65ea6ccc0c8fc8e67d5bf`
- **Ownership:** 本ファイルが Commerce Compliance Evidence の契約正本。実装・migration・Stripe metadata 変更は本契約に従う別 gate で行う。

---

## 1. Decision

M55 は、個人向け無料結果・保存版（DTR saved report）・追加読み解き（consultation / additional reading）について、**10 evidence domain（E1–E10）** で commerce compliance を証明できる契約を固定する。

**正式採用 architecture:** **候補C `HYBRID`**

| レイヤー | 役割 |
|---|---|
| 既存 commerce tables | order / fulfillment / entitlement / snapshot / wallet の **運用 SSOT** を維持 |
| 専用 append-only evidence ledger（新規） | 購入時 Product Truth snapshot、webhook/fulfillment/access の **immutable event**、export 用 correlation |
| pure export builder（新規） | 既存 record + ledger を join し、redacted JSON/Markdown evidence bundle を生成 |

**不採用:**

| 候補 | 判定 | 理由 |
|---|---|---|
| **A** `REUSE_EXISTING_TABLES + DERIVED EXPORT` のみ | 不採用 | 購入時 offer snapshot が無い。Stripe metadata に PII が残る。access event が無い。integrity/export を一貫構成できない |
| **B** `DEDICATED LEDGER` のみ | 不採用 | 既存 `one_time_fulfillments` / `entitlements` / `dtr_report_snapshots` が運用正本。全面置換は退行リスクが高い |

**Business classification（本 gate 判定）:** `STRIPE_CLASSIFICATION_REVIEW_REQUIRED`

- repo 実態・Public Truth・Analysis Authority は **自己理解・関係性整理の参考情報** を主張し、未来予測・超自然断定・心理診断・%保証を否定している。
- しかし Stripe 日本向け禁止業種に **Psychic services and fortune tellers** が明示されているため、**言葉の置き換えだけでは不十分**。実態を正確に説明した上で **Stripe への書面確認 gate** を必須とする。
- 本契約は **Stripe 承認を保証しない**。

---

## 2. Scope and Non-Goals

### In scope（本契約）

1. 実際に販売した商品の証跡契約
2. 購入前表示（価格・内容・条件）の snapshot 契約
3. Stripe 決済と内部 order の correlation 契約
4. webhook 受信・冪等・failure ledger 契約
5. 保存版生成・権利付与の fulfillment 契約
6. ユーザーが商品へアクセスできた事実の契約
7. 解析ロジック・質問・文章構成の version / provenance 契約
8. 返金・support・dispute 対応の証跡契約
9. Stripe metadata への PII 非格納契約
10. 未来予測・超自然断定・心理診断を商品として提供していない実態の説明契約

### Out of scope（本 gate）

- production/runtime 実装
- DB migration 作成・適用
- Stripe API 呼び出し
- checkout / webhook / metadata の変更
- commit / push / PR / deploy
- questionnaire runtime 接続
- compatibility runtime 接続
- 実ユーザーデータの出力・export 実行

---

## 3. Official Stripe Policy Basis

以下は **Stripe 公式 domain のみ** を参照（観測日: **2026-07-11**）。長文転載は行わず要点を paraphrase する。

| Source title | Official domain | Observed | Relevant section | M55 適用判断 |
|---|---|---|---|---|
| Prohibited and Restricted Businesses | `https://stripe.com/legal/restricted-businesses` | 2026-07-11 | Japan — Psychic services and fortune tellers | 日本向けにサイキック／占い師系が制限対象。**実態が該当しないことを正確に説明し、書面確認が必要** |
| 同上 | 同上 | 同上 | Japan — Businesses without Commercial Disclosure (SCT) page | `/legal/tokushoho` 必須。既存ページあり |
| 同上 | 同上 | 同上 | Misleading / inaccurate business information（全体条項） | 申請内容・checkout・結果本文・広告の **実態一致** が必須。言い換え回避禁止 |
| Metadata | `https://docs.stripe.com/metadata` | 2026-07-11 | Sensitive information prohibition | **Stripe Official:** カード情報・銀行口座・secret 等の機密性の高い情報を metadata に保存しない。外部/内部 system record を参照する identifier は使用可 |
| Metadata（Events / webhook） | `https://docs.stripe.com/metadata` | 2026-07-11 | Webhook に metadata が含まれる | fulfillment correlation に metadata を利用できる。**M55 独自方針**（§17）は別レイヤー |
| Dispute evidence best practices | `https://docs.stripe.com/disputes/best-practices` | 2026-07-11 | Digital goods — IP / system log | デジタル商品はダウンロード・利用の system log が有効証跡 |
| 同上 | 同上 | 同上 | Product description / terms at checkout | 購入時に提示した条件・返金方針の **checkout 時点スナップショット** が重要 |
| Checkout Sessions（API ref） | `https://docs.stripe.com/api/checkout/sessions` | 2026-07-11 | Session object fields | `client_reference_id`, `metadata`, `payment_intent`, `success_url` が correlation 基盤 |
| Payment Intents（API ref） | `https://docs.stripe.com/api/payment_intents` | 2026-07-11 | Amount / currency / metadata | 金額・通貨の決済事実の正本は Stripe 側 |

**Page last-updated:** Stripe 公式ページに明示日付が無い項目は `observed date` のみ記録。

### Stripe Official Sensitive-Information Boundary

Stripe 公式（`docs.stripe.com/metadata`）が示す範囲:

- metadata へ、カード情報・銀行口座情報・secret 等の **機密性の高い情報** を保存しない。
- metadata には、外部または内部 system record を参照する **identifier** を使用できる。

**注意:** 上記は Stripe 公式の sensitive-information 境界であり、「すべての個人情報（PII）が Stripe metadata で禁止」とは Stripe 公式が断定していない。M55 のより厳格な最小化方針は §17 の **M55 Privacy-Minimization Contract** に分離する。

### M55 Privacy-Minimization Contract（Stripe 公式とは別レイヤー）

M55 は、商品履行に不要な raw personal data を Stripe metadata または Session correlation fields へ格納しない方針を採用する。詳細禁止値は §10 / §17 を参照。

**Stripe approval guaranteed:** **NO**

---

## 4. Business Classification Boundary

### M55 の宣言商品（repo 実態）

| 商品 | 公開名 | 価格（Product Truth SSOT） | 提供内容 |
|---|---|---|---|
| 無料結果 | `/core` 無料見取り図 | 無料 | 10資質レーン +（契約後）5つの視点 answer projection。保存版 CTA のみ |
| 保存版ライト | `保存版ライト` | ¥1,000（税込）— `paidDtrProductCopy.ts` | 正式4章保存版 + 追加読み解き **1件** |
| 保存版FULL | `保存版FULL` | ¥1,480（税込） | 正式4章保存版 + 追加読み解き **合計5件**（1+4 wallet） |
| ライト→FULL アップグレード | — | ¥600（税込） | purchased_count を FULL 相当まで差分付与（新規4章は増えない） |
| 追加読み解き（legacy） | — | ¥500（legacy、新規販売停止） | `additional_reply_ticket` lane のみ既存フライト対応 |

### 実際の入力・ロジック（repo 事実）

| 領域 | 入力 | ロジック | provider/random |
|---|---|---|---|
| 無料（契約後） | nickname（表示のみ）+ birthDate + free-v1 6 answers | `buildIndividualizationFingerprintV1` 系 pure | **不使用**（契約: `M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md`） |
| 保存版 | checkout 時 profile（nickname, birthDate, 他 v2 任意） | `dtrEngine` / canonical pipeline + snapshot upsert | hybrid AI 経路あり（`generation_mode` / `generation_meta_json`） |
| 追加読み解き | 1テーマ + subquestions + optional free text | `/api/reply/generate` + wallet consume | provider 使用（本番 AI）。ticket 失敗時 consume 防止契約あり |

### 禁止商品特性の自己申告（Analysis Authority SSOT）

`lib/m55/analysisAuthorityReferenceModel.ts` より:

- **しない:** 医学的診断、心理検査、治療、カウンセリング、将来断定、運命断定、当たる保証、霊的効能、超自然的保証、占い・鑑定・相談としての断定
- **する:** 日本の暦文化上の手がかり + 回答差分による自己理解・関係性整理の参考情報

### 分類

| 判定 | 結果 |
|---|---|
| `CONSISTENT_WITH_DECLARED_SELF_UNDERSTANDING_PRODUCT` | **部分一致** — copy/tests/authority model は整合 |
| `STRIPE_CLASSIFICATION_REVIEW_REQUIRED` | **YES** — 日本 restricted list に psychic/fortune-teller 明示 |
| `PROHIBITED_PRODUCT_CHARACTERISTICS_DETECTED` | **NO（現時点）** — ただし出力・広告・SNS が repo 外のため **証跡 gap** あり |

**決済拡張 HOLD 条件:** 公開面・結果本文が占い・未来予測・超自然断定に該当すると判断された場合。

---

## 5. Current Commerce Architecture Inventory

### 5.1 Checkout 開始

| Route | Auth | Product source | Amount/currency | Success / Cancel |
|---|---|---|---|---|
| `POST /api/purchase/checkout` | Clerk `userId` 必須 | `productId` body + env `STRIPE_PRICE_*` | Stripe Price ID（env） | `/dtr/processing?session_id=…` / `/dtr/lp?checkout=cancelled` |
| `POST /api/reply-tickets/checkout` | Clerk 必須 | `product_key` + env price | Stripe Price ID | `/dtr/core?checkout=complete` / `cancelled` |

**Allowed products（`lib/oneTimeCheckout.ts`）:**

- `DTR_CORE_STATIC_V1`（legacy）
- `dtr_core_light_v1`
- `dtr_core_full_v1`
- `dtr_core_light_to_full_upgrade_v1`（reply-tickets route のみ）
- `additional_reply_ticket`（legacy、reply-tickets route）

**購入前 Product Truth:** `lib/m55/paidDtrProductCopy.ts`, `/dtr/lp`, `/pricing`, `/legal/*`

### 5.2 Checkout field inventory（現状 — 変更禁止・gap 記録）

現行 checkout は **A. Checkout metadata** と **B. Checkout Session top-level fields** を分けて記録する。`client_reference_id` は metadata ではない。

#### A. Checkout metadata

**DTR saved report checkout（`buildStripeCheckoutMetadataFromProfile`）:**

| Key | 内容 | 分類 |
|---|---|---|
| `productId` | product code | SAFE |
| `profileNickname` | nickname 最大120 | RAW_PII（M55 最小化対象） |
| `profileBirthDate` | YYYY-MM-DD | RAW_PII（M55 最小化対象） |
| `profileBirthTime` | optional | RAW_PII（M55 最小化対象） |
| `profileBirthplace` | optional | RAW_PII（M55 最小化対象） |
| `profileCountry`, `profileTimezone`, `inputVersion`, `engineVersionCandidate`, `calculationMode` | 技術メタ | 技術値（redaction 方針要） |

**Reply ticket checkout:**

| Key | 内容 | 分類 |
|---|---|---|
| `product_key` | product code | SAFE |
| `report_instance_id` | internal UUID | SAFE_OPAQUE_REFERENCE |
| `user_ref_hash` | 16 hex hash | SAFE_OPAQUE_REFERENCE |
| `quantity` | `1` | SAFE |

#### B. Checkout Session top-level fields

| Field | 内容 | 分類 | 備考 |
|---|---|---|---|
| `client_reference_id` | raw Clerk userId（DTR / Reply 共通） | **RAW_PERSONAL_IDENTIFIER** | metadata ではない。future remediation: opaque internal order/principal reference へ置換候補 |
| `customer_email` | Clerk/account email から prefill（両 route） | **PERSONAL_DATA_ON_SESSION** | metadata ではない。Stripe 側へ個人情報として渡る。card/payment sensitive data とは別分類。future classification: `NECESSITY_AND_MINIMIZATION_REVIEW_REQUIRED`（metadata remediation / privacy review gate） |

**Gap:** 現行 DTR metadata の raw DOB/nickname/birthplace と Session-level `client_reference_id` / `customer_email` は、**M55 Privacy-Minimization Contract（§17）** と **CONFLICTING**。Stripe 公式 sensitive-information 境界を超える断定はしない。remediation は専用 gate へ分離。

### 5.3 Webhook

| 項目 | 実態 |
|---|---|
| Route | `POST /api/stripe/webhook`（Node runtime） |
| Signature | `stripe.webhooks.constructEvent` + `STRIPE_WEBHOOK_SECRET` |
| Dedup | `stripe_events.event_id` 存在チェック → early return |
| Key events | `checkout.session.completed`, `charge.refunded` |
| Failure ledger | `failed_fulfillments`（`failure_reason`, `raw_metadata` jsonb — schema 上は任意保持可。現行 insert path は最小 diagnostic object 中心。§11 参照） |
| Fulfillment | `fulfillDtrCoreFromCheckoutSessionId`, `handleReplyTicketCheckoutCompleted` |
| Retry | 500 on processing failure → Stripe retry。duplicate は idempotent skip |

### 5.4 Internal order / entitlement / fulfillment

| Table / 概念 | 用途 | Idempotency |
|---|---|---|
| `one_time_fulfillments` | checkout_session_id PK、fulfillment 監査 | PK + 23505 handling |
| `entitlements` | user_id + product_id active grant | upsert onConflict |
| `entitlement_rights` | `m55_p:core_origin` 等 | upsert |
| `dtr_report_snapshots` | 保存版本文 snapshot | upsert at fulfillment |
| `stripe_events` | webhook event_id 冪等 | unique event_id |
| `failed_fulfillments` | 失敗キュー | append |
| `ledger.reply_wallet_*` | 追加読み解き枠 | RPC + ledger idempotency |
| `purchases`（migration 定義） | **lib から未参照** | EXISTS but UNUSED |

**Duplicate prevention:** `one_time_fulfillments.checkout_session_id` PK、`stripe_events.event_id`、`reply` RPC idempotency key。

**Partial failure:** snapshot skip はログ + ops notify だが、evidence completeness は **PARTIAL** になりうる。

### 5.5 Migrations（READ-ONLY 確認）

主要 migration:

- `20260306000000_phase1_entitlements_ssot.sql` — purchases, subscriptions, entitlement_rights
- `20260308000000_one_time_checkout_fulfillment.sql` — one_time_fulfillments, failed_fulfillments
- `20260420000000_dtr_drafts_and_report_snapshots.sql` — dtr_report_snapshots
- `20260615000001_failed_fulfillments_user_ref_hash.sql` — user_ref_hash、RLS revoke anon/auth
- `20260629000000_dtr_report_snapshots_hybrid_ai_generation_meta_v1.sql` — generation_mode, generation_meta_json

**RLS:** `failed_fulfillments` は anon/authenticated から REVOKE。client 直アクセスなし（service role 経由）。

---

## 6. Current Product Truth and Legal Inventory

### 6.1 Public routes（購入前後）

| Surface | Source | 記録される内容 |
|---|---|---|
| `/dtr/lp` | `paidDtrProductCopy.ts` + LP components | 価格、4章、追加読み解き件数、無料との違い |
| `/pricing` | `app/pricing/page.tsx` + copy SSOT | プラン説明 |
| `/legal/tokushoho` | `app/legal/tokushoho/page.tsx` + tests | ¥1,000 / ¥1,480 / ¥600、販売者、返金導線 |
| `/legal/terms` | terms page + `legalSupportPublicCopy` tests | 提供条件、追加読み解き件数 |
| `/legal/refund` | refund page | 返金方針 |
| `/legal/privacy` | privacy page | 個人情報 |
| `/support` | support copy | 問い合わせ先 |
| `/dtr/processing` | processing UI | 購入後・生成待ち |
| `/dtr/core` | saved report reader | 購入後アクセス |

### 6.2 Version / hash の現状

| 種別 | 現状 |
|---|---|
| Product copy version | **明示 registry なし** — file-level SSOT のみ |
| Legal document version | **明示 registry なし** |
| Analysis authority | `M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION = v1` |
| Free 5-view contract | `M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md`（docs） |
| Snapshot generation | `generation_meta_json`, `engine_context_json`, `generation_mode` |
| Offer snapshot at purchase | **MISSING** |

### 6.3 Guard / audit

- `m55-guardrails`, `M55 SSOT public audit`, `m55-audit-gate`（CI）
- `analysisAuthorityReferenceModel.test.ts`, `paidDtrProductCopy.test.ts`, `legalSupportPublicCopy.test.ts`
- **Gap:** SNS/広告/note 系は repo 外 — E1 business classification で **証跡不足**

---

## 7. Evidence Domain Model

| ID | Domain | 目的 |
|---|---|---|
| E1 | Business Classification | 事業実態の正確な説明 |
| E2 | Offer Snapshot | 購入直前の価格・内容・条件の固定 |
| E3 | Checkout Correlation | internal order ↔ Stripe Session ↔ PaymentIntent |
| E4 | Webhook Evidence | 署名検証・冪等・処理結果 |
| E5 | Fulfillment Evidence | 生成・権利付与・snapshot |
| E6 | Analysis / Generation Provenance | version・hash・provider 宣言 |
| E7 | Entitlement Evidence | 権利付与・wallet・consume |
| E8 | Digital Access Evidence | レポート利用可能・初回アクセス |
| E9 | Support / Refund / Dispute | 問い合わせ・返金・争議対応 |
| E10 | Evidence Export | redacted deterministic export |

---

## 8. Business Classification Evidence（E1）

### 必須証跡

- 商品目的、入力、ロジック概要、回答差分、暦文化参照の位置づけ
- provider/random 不使用（無料 pure）/ 使用（追加読み解き）の **商品別宣言**
- 未来予測・超自然・診断・%・保証・占い断定の否定
- 公開 copy snapshot + forbidden phrase audit 結果
- Stripe 申請用 business description（**実態ベース**）

### Current gap

| 項目 | Coverage |
|---|---|
| In-repo copy/tests | `EXISTS_PARTIAL` |
| Runtime output audit | `EXISTS_PARTIAL`（hybrid AI meta あり、全 surface 未網羅） |
| Off-repo ads/SNS | `MISSING` |
| Stripe written classification | `MISSING` |

---

## 9. Offer Snapshot Evidence（E2）

### 契約要件

購入直前に固定する structured snapshot:

- `product_contract_id` / `version`
- product name, price, currency
- 章数、追加読み解き枠、保存条件、返金条件参照
- legal document versions（hash）
- CTA label, route, observed_at
- canonical content hash

**原則:** checkout 後に LP copy が変わっても **購入時表示を再現**できる。スクリーンショットのみに依存しない。

### Current gap: `MISSING`

- 専用 `commerce_offer_snapshots`（ledger 内）が必要
- 既存 Stripe Session metadata だけでは legal version / 全文 hash を保持できない

---

## 10. Checkout Correlation Evidence（E3）

### 必須フィールド

- opaque `m55_order_ref`
- `m55_evidence_ref`
- `m55_product_code`, `m55_product_contract_version`
- Stripe Checkout Session ID, PaymentIntent ID
- amount, currency, created_at, completion state

### 許可 Stripe metadata（将来・M55 契約）

```text
m55_order_ref
m55_evidence_ref
m55_product_code
m55_product_contract_version
```

### M55 Prohibited Metadata and Correlation Values

M55 Privacy-Minimization Contract に基づく禁止値（**Stripe 公式義務ではなく M55 独自方針**）:

```text
raw DOB
nickname
birth time
birthplace
raw internal/auth user ID
answer IDs
answer-derived profile
report body
consultation text
support content
secrets
raw webhook payload
```

Session correlation fields も同方針で最小化する。`customer_email` は Stripe 公式上の一律禁止ではないが、M55 では `NECESSITY_AND_MINIMIZATION_REVIEW_REQUIRED`。

### Current gap: `EXISTS_PARTIAL` + `CONFLICTING`

- Correlation 自体は `one_time_fulfillments` + Session retrieve で可能
- **現行 metadata / Session fields に M55 最小化対象の personal data が含まれる** — remediation gate 必須（`P0_METADATA_PRIVACY_REMEDIATION_REQUIRED`）

---

## 11. Webhook Evidence（E4）

### 必須

- Stripe `event_id`, `event_type`, API version
- `received_at`, signature verified
- dedup result, handler version, outcome
- correlated order ref, failure classification, retry state
- canonical minimal event hash（raw payload 非保存が原則）

### Current gap: `EXISTS_PARTIAL`

| あり | なし |
|---|---|
| `stripe_events.event_id` 冪等 | handler version 列 |
| signature verify | canonical minimal event hash |
| `failed_fulfillments` | structured retry count |
| ops notify | evidence_ref 連携 |

**`failed_fulfillments.raw_metadata`（現行 runtime / schema risk）:**

| 区分 | 分類 | 内容 |
|---|---|---|
| CURRENT_RUNTIME | `MINIMIZED_DIAGNOSTIC_OBJECTS` | 現行 repo の insert path は多くが `null`、`{ productId }`、`{ payment_status }` 等の最小 diagnostic object。Stripe Checkout metadata 全体や raw webhook payload の一律複製ではない |
| SCHEMA/FUTURE_RISK | `PII_REPLICATION_RISK` | 列は jsonb で任意情報を保持可能。将来の誤用で PII 複製リスクは残る |
| REMEDIATION | — | allowlisted diagnostic schema、raw personal data prohibition、export redaction、retention/access review（privacy/legal gate） |

---

## 12. Fulfillment and Entitlement Evidence（E5 + E7）

### Fulfillment 必須

- attempt ref, order ref, started_at / completed_at
- product version, generator version, status
- entitlement result, snapshot result
- duplicate prevention result, partial failure state

### 状態（repo 照合）

| 契約状態 | repo 実態 |
|---|---|
| `PENDING` | processing UI / entitlement 未付与 |
| `PROCESSING` | webhook 処理中 |
| `COMPLETED` | `one_time_fulfillments` + snapshot + rights |
| `FAILED_RETRYABLE` | webhook 500 → Stripe retry |
| `FAILED_FINAL` | `failed_fulfillments` |
| `VOIDED` | refund lane（要詳細 mapping） |

### Entitlement 必須

- grant source, duplicate grant prevention
- consultation allowance, remaining/used
- consume event / timing
- **生成完了前の誤消費防止**（reply generate idempotency）

### Current gap

| E5 | `EXISTS_PARTIAL` — fulfillment row あり、attempt-level ledger なし |
| E7 | `EXISTS_PARTIAL` — wallet RPC + ledger あり、evidence export 未整備 |

---

## 13. Analysis and Generation Provenance（E6）

### 必須

- questionnaire schema version（無料: `free-v1` 契約済み、**runtime 未接続**）
- answer contract version, DOB fingerprint version
- individualization version, composition matrix version
- product contract version, template/block IDs
- output hash, quality audit result
- provider used boolean + name/version
- deterministic/random mode, snapshot ID

### Current gap: `EXISTS_PARTIAL`

| あり | なし |
|---|---|
| `generation_meta_json`（paid snapshot） | free runtime provenance 接続 |
| `engine_context_json` | unified provenance registry |
| fp-v1 pure tests/docs | purchase-time provenance bundle |

**PII:** 証跡 export に raw DOB/nickname/answers/report 本文を **原則含めない**。

---

## 14. Digital Access Evidence（E8）

### 必須候補

- `report_available_at`, `first_accessed_at`
- authenticated principal ref（opaque）
- snapshot/version accessed, route/resource type
- additional-reading opened_at

### IP / User-Agent

- **新規 raw IP 永続化を自動決定しない**
- 既存 lawful logging があれば privacy notice / retention / access control を確認
- 最低限: access timestamp + opaque principal ref

### Current gap: `MISSING`

- `first_accessed_at` 等の dedicated column / event **なし**（rg 確認: access_log 系ヒットなし）
- 履行証跡は将来 **append-only access event** で補完

---

## 15. Support, Refund, and Dispute Evidence（E9）

### 必須

- order ref, support case ref, issue category
- response timestamps, resolution
- refund request/decision, Stripe refund/dispute refs
- policy version applied
- communication evidence ref（redacted）

### Current gap: `DERIVABLE` + `MISSING`

| あり | なし |
|---|---|
| `/support`, public email | structured support_case table |
| `/legal/refund` copy | dispute evidence export automation |
| `charge.refunded` webhook | case ↔ order correlation |

**禁止:** 問い合わせ本文の無制限 export、raw email thread の Stripe 送信

---

## 16. Evidence Integrity Model

### 必須

- event/reference uniqueness
- append-only または mutation audit
- canonical JSON normalization + SHA-256 content hash
- `created_at` vs `observed_at` 区別
- source system, schema version, actor type
- idempotency key, supersedes relation
- deletion/redaction audit

### Completeness states

```text
COMPLETE
PARTIAL
MISSING_REQUIRED
INTEGRITY_FAILED
REDACTED
NOT_APPLICABLE
```

**重要:** hash 単独では真正性を保証しない。DB access control + append-only + audit trail と組み合わせる。

---

## 17. PII, Redaction, and Stripe Metadata Contract

### Stripe Official Sensitive-Information Boundary

Stripe 公式（`docs.stripe.com/metadata`）:

- metadata へ、カード情報・銀行口座情報・secret 等の機密性の高い情報を保存しない。
- metadata には、外部または内部 system record を参照する identifier を使用できる。

これは Stripe の公式境界であり、M55 の privacy-minimization 方針とは別レイヤーである。

### M55 Privacy-Minimization Contract

M55 は、商品履行に不要な raw personal data を Stripe metadata または Session correlation fields へ格納しない。

### M55 Prohibited Metadata and Correlation Values

```text
raw DOB
nickname
birth time
birthplace
raw internal/auth user ID
answer IDs
answer-derived profile
report body
consultation text
support content
secrets
raw webhook payload
```

原則として許可するのは opaque internal order reference、opaque evidence reference、product code/version、必要最小限の技術値。

### Session top-level fields（現行 inventory）

| Field | 現状 | M55 方針 |
|---|---|---|
| `client_reference_id` | raw Clerk userId | **RAW_PERSONAL_IDENTIFIER** — opaque ref へ置換候補 |
| `customer_email` | Clerk email prefill | **NECESSITY_AND_MINIMIZATION_REVIEW_REQUIRED** — Stripe 公式一律禁止ではない。保持・代替は privacy review gate |

### 内部識別子（将来・許可候補）

- `m55_order_ref`（opaque UUID）
- `m55_evidence_ref`
- `user_ref_hash`（16 hex — 既存 reply lane）
- `report_instance_id`（internal UUID）

### Redaction manifest（export 必須）

- removed fields 一覧
- reason per field
- completeness impact

### 現行 CONFLICTING 項目（移行必須）

- DTR checkout metadata: `profileNickname`, `profileBirthDate`, `profileBirthTime`, `profileBirthplace`
- Session top-level: `client_reference_id`（raw userId）、`customer_email`（必要性・最小化は review gate）

**本 gate では変更しない。** 専用 metadata / Session-field remediation gate で実施。

---

## 18. Retention and Access Control

### データ分類

| 分類 | 扱い |
|---|---|
| financial transaction refs | Stripe + internal fulfillment が正本。期間は **Human/legal gate** で確定 |
| legal/product snapshots | dispute に必要。期間は legal review |
| fulfillment events | append-only ledger 推奨 |
| generation provenance | snapshot に紐づけ。PII 除外 |
| access events | 最小限 timestamp + opaque principal |
| support records | redacted case refs |
| raw webhook payload | **原則非推奨**。既存 `raw_metadata` は review 対象 |
| IP/User-Agent | 新規自動永続化 **禁止**（必要性・比例性の Human 判断） |
| evidence exports | 生成操作自体を audit |

**禁止:** 根拠のない 30/60/90/180 日固定、全永久、全同一期間

### Access matrix（原則）

| Actor | Read | Create | Export | Delete |
|---|---|---|---|---|
| end user | 自分の提供状態のみ | — | 自分の delivery status | — |
| support operator | case-scoped | case notes | redacted bundle（明示操作） | — |
| service role | internal tables | fulfillment | — | — |
| compliance/admin | evidence bundle | export job | full redacted export | redaction audit only |
| Stripe | metadata/ref のみ（PII-free） | — | — | — |

---

## 19. Failure and Fail-Closed Contract

| 失敗 | 原則 |
|---|---|
| checkout completed だが order correlation なし | `FAILED_FINAL`、support 導線。completed にしない |
| webhook 署名失敗 | 400、処理しない |
| duplicate webhook | idempotent skip、二重付与しない |
| fulfillment started but snapshot missing | `PARTIAL`、ops notify、user-facing は processing/failed 区別 |
| snapshot あり entitlement なし | repair path あるが evidence は `PARTIAL` |
| entitlement あり report inaccessible | `FAILED_RETRYABLE` or support |
| generation failed after payment | 誤 consume 禁止、返金は別契約 |
| ticket consumed but generation failed | idempotency で防止（既存契約） |
| refund 後も access 可能 | revoke 契約要確認 |
| evidence bundle incomplete | `MISSING_REQUIRED` と表示。`COMPLETE` と偽らない |
| hash mismatch | `INTEGRITY_FAILED` |
| legal/product snapshot missing | checkout 新規販売を **HOLD**（evidence contract 未実装時） |

**自動返金・dispute 自動提出:** 禁止

---

## 20. Current-Gap Matrix

| Domain | Current source | Coverage | Missing | Privacy risk | Stripe relevance | Future candidate | Migration | Tests | Blocking |
|---|---|---|---|---|---|---|---|---|---|
| E1 Business | copy SSOT, authority model, CI audit | EXISTS_PARTIAL | off-repo ads | Low | **High** | classification packet | No | audit tests | **Stripe review** |
| E2 Offer snapshot | — | MISSING | entire domain | Low | **High** | `commerce_offer_snapshots` | **Yes** | snapshot hash tests | **Yes** |
| E3 Checkout | purchase/reply checkout routes, OTF table | EXISTS_PARTIAL | PII-free metadata | **High** | **High** | metadata adapter | **Yes** | metadata PII tests | **Yes** |
| E4 Webhook | stripe_events, failed_fulfillments | EXISTS_PARTIAL | event hash, handler ver | Medium | **High** | webhook evidence hook | Optional | idempotent tests | Partial |
| E5 Fulfillment | one_time_fulfillments, dtrDraftDb | EXISTS_PARTIAL | attempt ledger | Medium | **High** | fulfillment hook | Optional | partial failure tests | Partial |
| E6 Provenance | generation_meta_json, fp-v1 docs | EXISTS_PARTIAL | free runtime, registry | Medium | Medium | provenance registry | Optional | hash tests | Partial |
| E7 Entitlement | entitlements, rights, wallet RPC | EXISTS_PARTIAL | evidence export join | Low | **High** | entitlement hook | No | consume tests | Partial |
| E8 Access | — | MISSING | first_access events | Medium | **High** (dispute) | access event hook | **Yes** | access capture tests | **Yes** |
| E9 Support/dispute | legal pages, support email | DERIVABLE | case ledger | Medium | **High** | support case ref | Optional | refund state tests | Partial |
| E10 Export | — | MISSING | entire domain | **High** if misbuilt | **High** | export builder + redaction | No | deterministic export tests | **Yes** |

---

## 21. Selected Implementation Architecture

**正式採用: 候補C `HYBRID`**

```text
[既存 SSOT]
  one_time_fulfillments
  entitlements / entitlement_rights
  dtr_report_snapshots (+ generation_meta_json)
  stripe_events / failed_fulfillments
  ledger.reply_wallet_*

[新規 append-only ledger]
  commerce_evidence_events (domain, event_type, refs, hashes, schema_version)
  commerce_offer_snapshots (purchase-time Product Truth + legal hashes)

[新規 pure layer]
  evidence types + collector hooks + export builder + redaction manifest

[Stripe surface]
  metadata adapter (PII-free migration)
```

**Rejected:**

- **A only:** offer snapshot / access / integrity 不足
- **B only:** 既存 commerce 運用 SSOT を捨てるリスク

---

## 22. Proposed File and Migration Scope

### 既存ファイル（再利用・hook 接続候補）

| Path | 役割 |
|---|---|
| `app/api/purchase/checkout/route.ts` | DTR checkout + offer snapshot hook 点 |
| `app/api/reply-tickets/checkout/route.ts` | Reply/upgrade checkout |
| `app/api/stripe/webhook/route.ts` | Webhook evidence hook 点 |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | Fulfillment SSOT |
| `lib/m55/dtrDraftDb.ts` | Snapshot upsert + generation meta |
| `lib/m55/compositeStem/stripeCheckoutMetadata.ts` | **PII migration 対象** |
| `lib/m55/reply/replyTicketCheckoutConstants.ts` | Reply metadata keys |
| `lib/m55/reply/replyTicketWebhookLane.ts` | Reply fulfillment lane |
| `lib/m55/paidDtrProductCopy.ts` | Product Truth SSOT |
| `lib/m55/analysisAuthorityReferenceModel.ts` | Business classification copy |
| `lib/m55/verifyStripeCheckoutSessionForDtr.ts` | Session verify |

### 新規ファイル（implementation gate 候補 — 本 gate では未作成）

| 分類 | 候補 path |
|---|---|
| contract/types | `lib/m55/commerceEvidence/types.ts` |
| offer snapshot | `lib/m55/commerceEvidence/offerSnapshot.ts` |
| evidence collector | `lib/m55/commerceEvidence/collector.ts` |
| Stripe metadata adapter | `lib/m55/commerceEvidence/stripeMetadataAdapter.ts` |
| webhook hook | `lib/m55/commerceEvidence/webhookEvidence.ts` |
| fulfillment hook | `lib/m55/commerceEvidence/fulfillmentEvidence.ts` |
| entitlement hook | `lib/m55/commerceEvidence/entitlementEvidence.ts` |
| access hook | `lib/m55/commerceEvidence/accessEvidence.ts` |
| export builder | `lib/m55/commerceEvidence/exportBuilder.ts` |
| redaction | `lib/m55/commerceEvidence/redaction.ts` |
| tests | `lib/m55/commerceEvidence/*.test.ts` |
| migration | `supabase/migrations/*_commerce_evidence_ledger_v1.sql`（**planning gate で SQL 確定**） |

**架空 path 断定禁止:** 上記は contract 候補。actual-diff review で既存命名規則と整合確認する。

---

## 23. Test Contract

実装 gate で必須とするテスト候補:

1. same `event_id` idempotent
2. duplicate webhook → no duplicate evidence / entitlement
3. Stripe metadata excludes PII（post-migration）
4. product/price snapshot reproducible from offer snapshot hash
5. legal document versions captured at purchase
6. fulfillment success → `COMPLETE` evidence state
7. partial failure → not `COMPLETE`
8. entitlement ↔ snapshot correlation
9. report first access captured
10. ticket failure does not consume
11. refund state reflected in evidence export
12. evidence export deterministic（same inputs → same hash）
13. tampered record → `INTEGRITY_FAILED`
14. missing required evidence → fail-closed
15. redaction removes PII/secrets
16. same input → same provenance hash（pure layer）
17. provider/random declaration matches runtime meta
18. public business description matches Product Truth
19. prohibited claim audit（forbidden phrases）
20. no raw payload/secret leakage in export

**本 gate:** tests 実行・編集なし。

---

## 24. Gate Sequence

固定順序:

1. **本 document actual-diff review** ← 次 gate
2. contract document commit
3. contract push / Production observation
4. schema and migration planning（ledger + offer snapshot + access events）
5. evidence types + pure builder tests
6. checkout metadata PII migration + offer snapshot implementation
7. webhook / fulfillment / entitlement evidence hooks
8. access evidence capture
9. export / redaction
10. local integration QA
11. Stripe sandbox controlled checkout QA
12. Product Truth / legal version QA
13. Production deploy
14. one controlled Production purchase observation（**別途 Human 承認**）
15. Human evidence-bundle review
16. **Stripe classification written-review decision**
17. questionnaire semantic contract（並行可能だが runtime 接続前に E6 provenance 必須）
18. free/paid composition implementation

**並行許可:** questionnaire / composition **planning** は commerce evidence と並行可能。

**ブロック:**

- evidence contract 未 commit で新 checkout 項目追加禁止
- questionnaire runtime Production 接続前に provenance contract 実装必須
- Stripe classification が `PROHIBITED_PRODUCT_CHARACTERISTICS_DETECTED` なら決済拡張 HOLD

---

## 25. Stripe Classification Review Packet

Human / Stripe 提出用パケット（将来 export。本 gate では未生成）に含める項目:

1. **Business summary（日本語・英語）** — 自己理解・関係性整理のデジタルコンテンツ。占い・未来予測・診断ではない旨を **実機能ベース** で記述
2. **入力一覧** — birthDate, questionnaire answers, consultation theme（商品別）
3. **出力一覧** — 無料見取り図、4章保存版、1テーマ追加読み解き
4. **禁止事項** — Analysis Authority `whatM55IsNotJa` から抜粋（paraphrase）
5. **Sample output refs** — Production URL paths（/core, /dtr/lp）+ copy hash。本文全文は含めない
6. **Checkout disclosure** — tokushoho / terms / refund URLs + version hash（実装後）
7. **SCT compliance** — `/legal/tokushoho` 存在
8. **Open question to Stripe** — 日本「Psychic services and fortune tellers」に対し、本サービスが **cultural self-understanding reference** として許容されるかの確認依頼

**禁止:** 規約回避のための言い換えのみの説明、占い的出力の隠蔽

---

## 26. Explicit Non-Goals

- PDF 提供の勝手な追加
- 追加読み解き件数の変更（1 / 合計5 / upgrade ¥600 は Product Truth 固定）
- 仮価格の記載
- retention 日数の固定
- Stripe 承認の保証
- raw webhook payload の証跡 export
- secrets / 実ユーザーデータの文書掲載
- 実装コードの本ファイルへの混入
- questionnaire / compatibility の本 gate での実装開始

---

## 27. Open Risks

| Risk | Severity | Mitigation gate |
|---|---|---|
| Stripe Japan psychic/fortune-teller 分類 | **High** | Written Stripe review + classification packet |
| DTR checkout metadata PII | **High** | Metadata migration gate |
| No purchase-time offer snapshot | **High** | Ledger + offer snapshot migration |
| No digital access events | **Medium** | Access evidence hook + migration |
| `failed_fulfillments.raw_metadata` schema risk | **Medium** | Allowlisted diagnostic schema + privacy/legal review（現行 runtime は `MINIMIZED_DIAGNOSTIC_OBJECTS`） |
| `purchases` table unused | **Low** | Reuse or deprecate in migration planning |
| Off-repo marketing evidence gap | **Medium** | Human marketing inventory gate |
| Free questionnaire runtime 未接続 | **Medium** | Provenance before Production wiring |
| Hybrid AI provider on paid path | **Medium** | E6 meta + export で provider 宣言を証明 |
| Evidence export 未実装 | **High** | Export builder gate |

---

*End of document.*
