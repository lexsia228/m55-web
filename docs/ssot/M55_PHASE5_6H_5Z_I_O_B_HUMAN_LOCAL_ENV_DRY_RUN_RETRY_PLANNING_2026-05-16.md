# Phase 5-6H-5Z-I-O-B — Human-local env dry-run retry planning gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-O-B Human-local env dry-run retry planning gate**

本条は **docs-only**：Human **ローカル端末**への **repair 用環境変数注入手順**と **次 dry-run 成功条件 / STOP** を固定する。**本条では dry-run 再実行なし／repair なし／Production DB write なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-O-A`** | dry-run **1 回**。**EXIT 2／STOP**。reason：**`MISSING_REPAIR_IDS_USE_LOCAL_ENV_ONLY_NOT_LOGGED_HERE`**。 |
| **未到達** | **Stripe retrieve なし** → **Stripe validation：** **`not_measured`**。**Supabase：** **`not_measured`**。 |
| **副作用** | **Production DB write なし／repair なし／フル ID 出力・SSOT 転記なし**（**`5Z-I-O-A` 記録**。） |
| **本条** | **Human-local だけに full を載せて再試行する手順計画のみ**。 |

**Work anchor：** **`83f6be025a55d8e9725f1fadedbe301cd1308dad`** — **`docs: record dry run repair runner execution`**（**`5Z-I-O-A`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-O-B-HUMAN-LOCAL-ENV-DRY-RUN-RETRY-PLAN-001`** | **本条：** **Human-local env 再 dry-run 計画**。 |
| **`M55-EVID-20260516-5Z-I-O-A-DRY-RUN-REPAIR-RUNNER-001`** | 初回 dry-run checkpoint |
| **`M55-EVID-20260516-5Z-I-N-MINIMAL-REPAIR-RUNNER-CODE-CREATED-001`** | runner ソース |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | expected-missing baseline |

---

## 4. STOP cause summary（`5Z-I-O-A` 継承）

| 観点 | 要約 |
|------|------|
| **直接原因** | **`M55_REPAIR_CHECKOUT_SESSION_ID`／`M55_REPAIR_EXPECTED_USER_ID`／`M55_REPAIR_STRIPE_EVENT_ID`** が **runner 実行時に利用可能でなかった**（**Human ローカル未注入／非対象シェル**。） |
| **Stripe** | **retrieve 未到達** → **validation 未測定**。 |
| **Supabase** | **count 未到達** → **未測定**。 |
| **DB write** | **無**。 |
| **repair** | **無**。 |
| **full ID／secret** | **stdout に出現させず／SSOT 転記せず**。 |

---

## 5. Human-local env handling plan

### 5.1 値の由来

- Human が **Stripe Dashboard／Supabase／Clerk 等公式 UI のみ**から **full を取得**。**Chat／Cursor／SSOT に貼らない**。

### 5.2 注入方法（推奨順）

| 順 | 手段 | 備考 |
|----|------|------|
| **1** | **ワンショット** `VAR=value VAR2=value2 npx tsx scripts/repair/…`（**プライベート端末のみ**） | **履歴設定に応じて** `history` の扱いに注意。**スクリーンショット禁止**。 |
| **2** | **同一セッションの shell 変数** `export`（**短命セッション**） | **`printenv`／`env`／`set` で一覧をログ・SSOT に出さない**。 |
| **3** | **`.env.local` への恒久追記** | **本条では推奨しない**（**別途明示 GO が無ければ編集しない**。） |

### 5.3 必須名（値は書かない）

| 名前 | 役割 |
|------|------|
| **`M55_REPAIR_CHECKOUT_SESSION_ID`** | Human **ローカルのみ**。 |
| **`M55_REPAIR_EXPECTED_USER_ID`** | **`client_reference_id` と整合**。 **ローカルのみ**。 |
| **`M55_REPAIR_STRIPE_EVENT_ID`** | **実 Stripe `event.id`（Webhook 側と整合する Human 所持 ID）**。 **ローカルのみ**。 |
| **`M55_REPAIR_PRODUCT_ID`** | **`DTR_CORE_STATIC_V1`**。 |
| **`M55_REPAIR_DRY_RUN`** | **`true` または省略**（**`false` 禁止**）。 |
| **`M55_REPAIR_CONFIRM`** | **未設定のまま**（**dry-run／再 dry-run**）。 |
| **`STRIPE_SECRET_KEY`** | **ローカルのみ**（runner が利用）。 |
| **`NEXT_PUBLIC_SUPABASE_URL`**／**`SUPABASE_SERVICE_ROLE_KEY`** | **ローカルのみ**。 |

### 5.4 Safe labels（参照のみ・非 ID・SQL 禁止）

- **checkout：** **`cs_live_JSRW`**
- **user／client_reference 参照：** **`user_36xz`**

---

## 6. Planned retry command（マスク済み形のみ）

```text
npx tsx scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts
```

- **依存追加・`package.json` scripts 変更なし**。
- **`M55_REPAIR_DRY_RUN=false` 禁止**。
- **`M55_REPAIR_CONFIRM` 禁止**。
- 次 gate（**`5Z-I-O-C`**）で **ちょうど 1 回**のみ。

---

## 7. Expected result criteria（`5Z-I-O-C` 成功像）

### 7.1 Stripe（全 **true**）

- **livemode**／**mode payment**／**status complete**／**payment_status paid**
- **amount_total 1000**／**currency jpy**
- **metadata.productId `DTR_CORE_STATIC_V1`**
- **success／cancel URL** に **`m55-webv2.vercel.app`**
- **expected user と `client_reference_id` 一致**（**ログは boolean のみ**）

### 7.2 Supabase（**head count すべて 0**）

`stripe_events`／`one_time_fulfillments`／`entitlements`（product `DTR_CORE_STATIC_V1`）／`entitlement_rights`／`reply_ticket_wallets`／`reply_wallet_ledgers`／`dtr_report_snapshots`／`failed_fulfillments`

### 7.3 終端 token

- **`DRY_RUN_READY_FOR_EXACTLY_ONE_REPAIR_EXECUTION_PLANNING`**

---

## 8. STOP conditions（計画〜実行共通）

Human／runner のいずれかで：**full が AI／SSOT に漏れる／`printenv` 等一覧をファイル化／`M55_REPAIR_CONFIRM` が立つ／`DRY_RUN=false`／repair 経路になる／Stripe boolean 不一致／期待外 count／`stripe_events` 先行行／`failed_fulfillments` ブロック／stdout に ID／依存インストール必須／ターミナル状態が不明**。

**STOP 時：** **自動リトライ禁止**。**repair・write 禁止**。

---

## 9. Determination（判定）

| Field | Value |
|--------|--------|
| **本条** | **`READY_FOR_HUMAN_LOCAL_ENV_DRY_RUN_RETRY_EXECUTION_GATE`** |

---

## 10. 未実行事項

- **本条での dry-run 再実行／repair／Production DB write**
- **grant／Events／replay／決済／返金／Stripe 設定・env・whsec・redeploy**
- **package／依存／npm script**
- **フル IDs／secrets の記録またはチャット転記**

---

## 11. Next

**`Phase 5-6H-5Z-I-O-C` — Human-local env dry-run retry execution checkpoint**

- **exactly-one dry-run**。**write 禁止／repair 禁止**。
- **READY の場合のみ**論理的に **`5Z-I-P` Exactly-one repair execution planning gate**へ（**明示 GO まで実行しない**。）
- **STOP の場合** blocked diagnostic へ。

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_O_B_HUMAN_LOCAL_ENV_DRY_RUN_RETRY_PLANNING_2026-05-16.md`
