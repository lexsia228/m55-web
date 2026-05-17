# Phase 5-6H-5Z-I-K-A — Human Supabase mapping read-only evidence checkpoint（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-K-A Human Supabase mapping read-only evidence checkpoint**

本条は **Supabase Production DB の Human `SELECT` read-only 証跡**の固定のみ。**DB write／repair 実行／Stripe API／Events API／refund は行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-J`** | **`SELECTED_ROUTE_R1_APPLICATION_SIDE_FULFILLMENT_FUNCTION_REUSE`**（**`fulfillDtrCoreFromCheckoutSessionId` 再利用**）。 |
| **`5Z-I-K`** | **`HUMAN_MAPPING_INCONCLUSIVE_DEEPER_READ_ONLY_REQUIRED`**（**Supabase 転記が未確定**だった）。 |
| **本条** | Human が **Production で `SELECT` のみ**実施し、**対象 checkout／user 文脈**で **row_count を転記**。**full ID は共有・SSOT 化していない**。 |
| **実行** | **repair なし**／**DB write なし**。 |

**Work anchor（直前フェーズ）：** **`ff7c7fb162c4d76911b35f0ab386b97560b7e9ef`** — **`docs: record human mapping readonly confirmation`**（**`5Z-I-K`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | **本条：** **Supabase read-only mapping 証跡**（**row_count のみ**）。 |
| **`M55-EVID-20260516-5Z-I-K-HUMAN-MAPPING-READONLY-001`** | **`5Z-I-K`** 親 Evidence |
| **`M55-EVID-20260516-5Z-I-J-REPAIR-ROUTE-SELECTION-TECH-DESIGN-001`** | **`5Z-I-J`** R1 選定 |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | Preflight **missing** |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **5Y-A** 決済観測 |

**転記禁止：** rk_live／sk_live／whsec／**フル** Event／Session／PI／customer／email／`client_reference_id`／`user_id`／Request ID／Price ID。**safe label を DB 値・SQL リテラルとして扱わない**。

---

## 4. Human-safe labels（参照用・非 ID）

**以下は redacted 参照ラベルであり、full ID ではない。コミット SQL・SSOT の実キーとして使わない。**

| 種別 | Label |
|------|--------|
| **checkout（参照）** | **`cs_live_JSRW`** |
| **user／client_reference（参照）** | **`user_36xz`** |

---

## 5. Supabase read-only mapping result（Human `SELECT`）

**対象文脈：** 上記 **safe label** で人間がローカル照合した **checkout／user**（**値自体は本条に複写しない**）。

| 観点 | 結果 |
|------|------|
| **`one_time_fulfillments`（対象 checkout）** | **missing expected**／**`row_count 0`** |
| **`entitlements`**（**`product_id`＝`DTR_CORE_STATIC_V1`／対象 user**） | **missing expected**／**`row_count 0`** |
| **`entitlement_rights`（対象 user／DTR core 文脈）** | **missing expected**／**`row_count 0`** |
| **`reply_ticket_wallets`（対象 user）** | **missing expected**／**`row_count 0`** |
| **`reply_wallet_ledgers`（対象 user）** | **missing expected**／**`row_count 0`** |
| **`dtr_report_snapshots`**（**`DTR_CORE_STATIC_V1`／対象 user**） | **missing expected**／**`row_count 0`** |
| **`failed_fulfillments`（対象 checkout 関連）** | **missing**／**`row_count 0`** |
| **full ID の共有** | **no** |

---

## 6. Stripe mapping status

**方針：** **Supabase 証跡の記録を Stripe 再確認にブロックしない**。

**先行証跡（`5Y-A` 等）に基づく属性（full Stripe ID は再生しない）：**

| 観点 | 状態 |
|------|------|
| **event type** | **`checkout.session.completed`**（先行観測と整合） |
| **live mode** | **yes**（先行観測と整合） |
| **amount** | **¥1,000 JPY** |
| **metadata `productId`** | **`DTR_CORE_STATIC_V1`** |
| **session status** | **complete** |
| **payment_status** | **paid** |
| **success_url ドメイン** | **`m55-webv2.vercel.app`**（意図と整合） |

**追加の Stripe Dashboard read-only 最終確認：** **任意**（**不安残存時は `READY_FOR_STRIPE_MAPPING_FINAL_READ_ONLY_CONFIRMATION_GATE` を採用**）。**本条は先行証跡と矛盾しない範囲で **prior evidence matched** とし、**human final recheck は pending（optional）**）。

---

## 7. Aggregate classification

**`SUPABASE_MAPPING_EXPECTED_MISSING_CONFIRMED`**

---

## 8. Repair readiness

**候補トークン：**

| Token | 用途 |
|--------|------|
| **`READY_FOR_STRIPE_MAPPING_FINAL_CONFIRMATION_OR_PRE_WRITE_REPAIR_SCRIPT_REVIEW`** | 分岐の親ラベル（説明用） |
| **`READY_FOR_PRE_WRITE_REPAIR_SCRIPT_REVIEW_GATE`** | **先行 Stripe 十分と判断し `5Z-I-L`（pre-write レビュー）へ** |
| **`READY_FOR_STRIPE_MAPPING_FINAL_READ_ONLY_CONFIRMATION_GATE`** | **Stripe を Dashboard で再確認してから `5Z-I-L` へ** |

**本条採用（推奨）：** **`READY_FOR_PRE_WRITE_REPAIR_SCRIPT_REVIEW_GATE`**

**注：** 運用チームに不安が残る場合は **`READY_FOR_STRIPE_MAPPING_FINAL_READ_ONLY_CONFIRMATION_GATE`** に切り替え、**`5Z-I-L` を Stripe final read-only 名義**で先に実施する。

---

## 9. 重要な解釈

- **Expected-missing** が **対象 checkout／user 文脈で確認**された（**`row_count 0`**）。**`5Z-H-A`** の **aggregate missing** と整合。
- **R1（application-side fulfillment）** の **前提（重複履行の痕跡なし）**を支持。**二重付与の DB 痕跡は本条の範囲では観測されない**。
- **DTR entitlement／wallet／snapshot の既存行は観測されない**（**対象限定の SELECT**）。
- **本条は repair を実行しない**。**UI unlock の証明でもない**（**`5Z-I-O`** 領域）。

---

## 10. 未実行事項

- **Production DB write／RPC／migration／grant／Wallet 手動**
- **Events API／Stripe API／`/api/stripe`／replay／CLI／Dashboard resend**
- **新規決済／Checkout retry／返金 rollback**
- **Stripe 設定／env／whsec／redeploy／code／UI**
- **フル IDs／secrets の SSOT 記録**／**safe label の DB 値化**

---

## 11. Next

**推奨（Repair readiness＝`READY_FOR_PRE_WRITE_REPAIR_SCRIPT_REVIEW_GATE`）：**

- **`Phase 5-6H-5Z-I-L` — Pre-write repair script／implementation review gate**

**Stripe 最終 read-only を先に取る場合（`READY_FOR_STRIPE_MAPPING_FINAL_READ_ONLY_CONFIRMATION_GATE`）：**

- **`Phase 5-6H-5Z-I-L` — Stripe mapping final read-only confirmation gate**

**explicit GO まで repair 実行しない。**

---

## Work anchor & 本条パス

- **`ff7c7fb162c4d76911b35f0ab386b97560b7e9ef`** — **`docs: record human mapping readonly confirmation`**（**`5Z-I-K`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_K_A_HUMAN_SUPABASE_MAPPING_READ_ONLY_EVIDENCE_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** |
| **Classification** | **`SUPABASE_MAPPING_EXPECTED_MISSING_CONFIRMED`** |
| **Repair readiness（推奨）** | **`READY_FOR_PRE_WRITE_REPAIR_SCRIPT_REVIEW_GATE`** |
