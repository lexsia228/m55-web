# Phase 5-6H-5Z-I-R — Post-repair Production DB read-only verification gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-R Post-repair Production DB read-only verification gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-Q`** | **`EXACTLY_ONE_REPAIR_EXECUTION_RECORDED`** — **execution count `1`**／**dry-run `false`**／**confirm matched `yes`**／**Stripe validation `all matched`**／**`stripe_events` pre-insert `inserted`**／**`fulfillDtrCoreFromCheckoutSessionId` `success`**／**DB write by runner `yes`**／**final `REPAIR_EXECUTED_ONCE`**／**second／retry／refund：`no`**。 |
| **本条** | **`5Z-I-Q` 後**の **Production DB `SELECT` read-only** 証跡を **redacted のみ**固定。**DB write／repair 再実行なし**。 |
| **Agent（本条コミット）** | **Production `SELECT` 未実行**（Human-local のみ）。**本条は SSOT 転記のみ**。 |

**Work anchor（直前 repair 証跡）：** **`138b5dcab101dc12ed01e74f5c3d9967c3e086a7`** — **`docs: update exactly one repair execution result`**（**`5Z-I-Q`** Human-private 追認）。

**Planning anchor：** **`b52d6e0cfa1c201c3683899d86b4995a75315463`** — **`5Z-I-P`** post-repair 期待 artifact 一覧。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-R-POST-REPAIR-DB-READONLY-VERIFICATION-001`** | **本条：** post-repair Production DB **read-only 検証** |
| **`M55-EVID-20260516-5Z-I-Q-EXACTLY-ONE-REPAIR-EXECUTION-001`** | exactly-one repair 実行 |
| **`M55-EVID-20260516-5Z-I-O-D-HUMAN-SIDE-DRY-RUN-READY-ATTESTATION-001`** | dry-run READY（pre-repair **all 0**） |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | pre-repair mapping（**expected missing**） |

**Full IDs／secrets：** **記録しない**。**raw SQL with full IDs：** **SSOT に載せない**。

---

## 4. Safe labels（参照のみ・非 ID）

| 種別 | Label |
|------|--------|
| **checkout（参照）** | **`cs_live_JSRW`** |
| **user／client_reference（参照）** | **`user_36xz`** |

**注：** 上記は **redacted 参照ラベル**であり **full ID ではない**。**committed DB 値・SQL リテラルとして使用しない**。

---

## 5. Production DB read-only verification result（Human `SELECT`・redacted）

**対象文脈：** Human が **Supabase Production** で **safe label** に基づきローカル照合した **対象 checkout／user**（**フル値は SSOT に複写しない**）。

**許可トークン：** `found expected`／`missing unexpected`／`duplicate unexpected`／`non-blocking found`／`blocking found`／`unclear`

| 対象 | **classification** | **`row_count`** | 備考（redacted） |
|------|-------------------|-----------------|------------------|
| **`stripe_events`** | **found expected** | **1** | **`event_type`：** **`checkout.session.completed`**。**duplicate：** **no duplicate expected**。**full `event_id`：** **記録なし**。 |
| **`one_time_fulfillments`** | **found expected** | **1** | **対象 checkout のみ**。**`product_id`：** **`DTR_CORE_STATIC_V1`**。**duplicate：** **no**。**full `checkout_session_id`：** **記録なし**。 |
| **`entitlements`**（**`DTR_CORE_STATIC_V1`**） | **found expected** | **1** | **active／granted 相当：** **visible（safe）**。**duplicate：** **no**。**full `user_id`：** **記録なし**。 |
| **`entitlement_rights`** | **found expected** | **≥1** | **DTR core right expected**。**`right_key`（visible／safe）：** **`m55_p:core_origin`**。**duplicate unexpected：** **no**。**full `user_id`：** **記録なし**。 |
| **`reply_ticket_wallets`** | **found expected** | **1** | **included reply grant または設計どおりの既存正規化行**。**duplicate unexpected：** **no**。 |
| **`reply_wallet_ledgers`** | **found expected** | **≥1** | **included reply ledger expected**。**duplicate unexpected：** **no**。 |
| **`dtr_report_snapshots`**（**`DTR_CORE_STATIC_V1`**） | **found expected** | **1** | **report snapshot present**。**duplicate unexpected：** **no**。 |
| **`failed_fulfillments`** | **missing**（期待どおり） | **0** | **blocking／non-blocking 行：** **なし**。 |
| **duplicate scan** | **no duplicate unexpected** | — | **OTF／entitlement／snapshot の二重なし**。**wallet／ledger の意図外多重付与なし**。 |

---

## 6. Aggregate verification classification

**`POST_REPAIR_DB_ARTIFACTS_VERIFIED`**

---

## 7. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`POST_REPAIR_PRODUCTION_DB_READ_ONLY_VERIFICATION_GREEN`** |

**根拠（要約）：** 必須 artifact が **いずれも `found expected`**（または **`failed_fulfillments` `missing`／`0`**）。**blocking duplicate／blocking failure なし**。**`5Z-I-Q` `REPAIR_EXECUTED_ONCE` と整合**。

---

## 8. 未実行事項（本条 SSOT update）

- **Production DB INSERT／UPDATE／DELETE／UPSERT／write RPC**
- **schema 変更／migration 適用**
- **runner 実行／二回目 repair／retry**
- **manual SQL repair／manual entitlement／manual wallet／ticket 付与**
- **Events API／webhook replay／CLI replay／Dashboard resend**
- **新規決済／Checkout 再試行**
- **refund／rollback**
- **Stripe webhook 設定変更**／**`STRIPE_WEBHOOK_SECRET`／whsec／env／secret 変更**
- **Vercel redeploy**
- **package／dependency／npm script 追加**
- **runner file／runtime／UI 変更**
- **UI report unlock 確認**（**`5Z-I-S`**）
- **included reply-ticket UI 確認**（**`5Z-I-T`** 領域）
- **full Event ID／Session ID／PI／Customer ID／email／`client_reference_id`／`user_id`／Request ID／Price ID／secret／whsec の SSOT 記録**
- **raw SQL with full IDs の SSOT 記録**

---

## 9. Next

**`POST_REPAIR_PRODUCTION_DB_READ_ONLY_VERIFICATION_GREEN` のため：**

- **`Phase 5-6H-5Z-I-S` UI report unlock verification gate** — **DB write なし**。

**分岐（本条では未採用）：**

| 条件 | Next |
|------|------|
| partial／missing | **`5Z-I-S` Post-repair DB diagnostic gate**（**retry／refund なし**） |
| inconclusive | 同上（診断） |
| duplicate／blocking | **`5Z-I-S` Duplicate／blocking fulfillment diagnostic gate** |

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_R_POST_REPAIR_PRODUCTION_DB_READ_ONLY_VERIFICATION_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-R-POST-REPAIR-DB-READONLY-VERIFICATION-001`** |
| **Aggregate** | **`POST_REPAIR_DB_ARTIFACTS_VERIFIED`** |
| **Verdict** | **`POST_REPAIR_PRODUCTION_DB_READ_ONLY_VERIFICATION_GREEN`** |
| **Safe labels** | **`cs_live_JSRW`**／**`user_36xz`**（参照のみ） |
| **Agent Production SELECT** | **未実行** |
| **Production DB write（本条）** | **なし** |
