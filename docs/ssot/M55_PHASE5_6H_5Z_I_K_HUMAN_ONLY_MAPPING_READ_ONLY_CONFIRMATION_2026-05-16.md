# Phase 5-6H-5Z-I-K — Human-only mapping read-only confirmation gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-K Human-only mapping read-only confirmation gate**

本条は **read-only mapping の結果を SSOT に収める場**である。**Production DB write／Events API／Stripe API／repair 実行は行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-J`** | **`SELECTED_ROUTE_R1_APPLICATION_SIDE_FULFILLMENT_FUNCTION_REUSE`**（**`fulfillDtrCoreFromCheckoutSessionId` 再利用**）。** **`READY_FOR_HUMAN_ONLY_MAPPING_READ_ONLY_CONFIRMATION_GATE`**。 |
| **本 Gate の目的** | **R1 repair 実行前**に、Stripe paid コンテキストと Supabase／Clerk／draft／既存 artifact の **対応を Human が read-only のみで確定**する。 |
| **`5Y-A`** | **¥1,000 DTR base** **paid／complete** と観測（**フル ID は SSOT に書かない**）。 |
| **`5Z-H-A`** | **fulfillment artifact aggregate missing**（**row_count 0**）— **Human は本 Gate でテーブル別 SELECT を再確認する**（**未転記なら本条では `unclear`**）。 |
| **replay delivery** | **0**。 |
| **entitlement／report unlock** | **unproven**。 |

**Work anchor（直前フェーズ）：** **`392dfafa1b500745279e06a4cfcfe5376d0e6e54`** — **`docs: design manual fulfillment repair route`**（**`5Z-I-J`**）。

**本条コミット時点：** **Human が Stripe Dashboard／Supabase での read-only 照合結果を SSOT にまだ転記していない**ため、下表の **Stripe／Supabase 各項目はいずれも `unclear`（転記待ち）** とする。**実測後は Human が本ドキュメントを更新するか、次証跡コミットで差分反映**（**フル ID は書かない**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-K-HUMAN-MAPPING-READONLY-001`** | **本条：** **Human-only read-only mapping（結果は redacted のみ）**。 |
| **`M55-EVID-20260516-5Z-I-J-REPAIR-ROUTE-SELECTION-TECH-DESIGN-001`** | **`5Z-I-J`** tech design |
| **`M55-EVID-20260516-5Z-I-H-STRIPE-SUPPORT-HELP-RESPONSE-001`** | Support **manual route** |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | Preflight **missing** |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **5Y-A** 観測 |

**転記禁止：** rk_live／sk_live／whsec／**フル** Event／Endpoint／Session／PI／Customer／email／`client_reference_id`／`user_id`／Request ID／Price ID。

---

## 4. Stripe read-only mapping result（Dashboard）

**各項目：** **`matched`／`mismatch`／`unclear`**。**本条作成時点はすべて `unclear`**（**Human 転記未取得**）。

| 観点 | Result |
|------|--------|
| **event type `checkout.session.completed`** | **unclear** |
| **livemode（Live）** | **unclear** |
| **amount／currency（¥1,000 JPY）** | **unclear** |
| **metadata `productId`＝`DTR_CORE_STATIC_V1`** | **unclear** |
| **session status `complete`** | **unclear** |
| **payment_status `paid`** | **unclear** |
| **success_url／ドメイン（意図：`m55-webv2.vercel.app`）** | **unclear** |

**Human のみが UI で参照：** **customer／email／`client_reference_id`／session／payment_intent**。**SSOT には **結果ラベルのみ**。

---

## 5. Supabase／identity read-only mapping result（SELECT only）

**各項目：** **`matched`／`missing`／`mismatch`／`unclear`** または **期待 missing／不審に存在**。**本条作成時点は原則 `unclear`**。

| 観点 | Result |
|------|--------|
| **target user identity（存在）** | **unclear** |
| **payment owner／`client_reference` と user の一致** | **unclear** |
| **`dtr_guest_drafts`／profile／birth linkage** | **unclear** |
| **`one_time_fulfillments`（対象 checkout）** | **unclear**（**期待：missing** — **5Z-H-A と整合するか Human SELECT で確認**） |
| **`entitlements`（`DTR_CORE_STATIC_V1`）** | **unclear**（**期待：missing**） |
| **`entitlement_rights`（DTR core）** | **unclear**（**期待：missing**） |
| **`reply_ticket_wallets`／`reply_wallet_ledgers`（included grant）** | **unclear**（**期待：missing**） |
| **`dtr_report_snapshots`（`DTR_CORE_STATIC_V1`）** | **unclear**（**期待：missing**） |
| **`failed_fulfillments`（対象関連）** | **unclear** |

**SQL 方針：** **SELECT／COUNT／EXISTS のみ**。**SSOT に貼る SQL には placeholder のみ**。**`row_count` のみ**可。**full session／user／email／PI は禁止**。

**Clerk：** 必要なら **read-only** で **identity 整合**（**結果は matched／mismatch／unclear のみ**）。

---

## 6. Aggregate mapping classification

**本条採用（本条作成時点）：** **`HUMAN_MAPPING_INCONCLUSIVE_DEEPER_READ_ONLY_REQUIRED`**

**分類候補（Human 転記後にいずれかへ更新）：**

| Token | 条件 |
|--------|------|
| **`HUMAN_MAPPING_CONFIRMED_READY_FOR_PRE_WRITE_REPAIR_SCRIPT_REVIEW`** | Stripe **すべて matched**、Supabase **matched または期待どおり missing** |
| **`HUMAN_MAPPING_MISMATCH_STOP_REPAIR`** | **いずれか mismatch** |
| **`HUMAN_MAPPING_INCONCLUSIVE_DEEPER_READ_ONLY_REQUIRED`** | **unclear 残存**／**追加 SELECT 要** |

---

## 7. Repair readiness

| Token | 条件 |
|--------|------|
| **`READY_FOR_PRE_WRITE_REPAIR_SCRIPT_REVIEW_GATE`** | **mapping confirmed** かつ **stop なし** |
| **`STOP_REPAIR_MAPPING_MISMATCH`** | **mismatch** |
| **`DEEPER_READ_ONLY_MAPPING_REQUIRED`** | **inconclusive** |

**本条作成時点：** **`DEEPER_READ_ONLY_MAPPING_REQUIRED`**

---

## 8. Stop conditions（即時 stop／次に repair へ進めない）

- **product／amount／currency／status／payment_status の不一致**
- **target user 確定不能**
- **payment owner／`client_reference` と user が一致しない**
- **draft／profile／birth linkage が不明**
- **想定外に entitlement／fulfillment／snapshot／wallet が存在**
- **SSOT に full ID／secret が必要になる**
- **二重付与リスクが制御不能**

---

## 9. 未実行事項

- **Production DB write／write RPC／migration／manual grant／Events API／Stripe API／`/api/stripe`／replay／CLI／Dashboard resend**
- **新規決済／Checkout retry／返金 rollback**
- **Stripe 設定／env／whsec／redeploy／code／UI 変更**
- **フル IDs／secrets の SSOT 記録**

---

## 10. Next

**本条作成時点の分類に基づき：**

| 状態 | Next |
|------|------|
| **mapping confirmed（将来）** | **`Phase 5-6H-5Z-I-L` — Pre-write repair script／implementation review gate** |
| **mismatch（将来）** | **`Phase 5-6H-5Z-I-L` — Repair blocked mapping mismatch checkpoint** |
| **inconclusive（本条）** | **`Phase 5-6H-5Z-I-L` — Deeper read-only mapping diagnostic gate** |

---

## Work anchor & 本条パス

- **`392dfafa1b500745279e06a4cfcfe5376d0e6e54`** — **`docs: design manual fulfillment repair route`**（**`5Z-I-J`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_K_HUMAN_ONLY_MAPPING_READ_ONLY_CONFIRMATION_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-K-HUMAN-MAPPING-READONLY-001`** |
| **Classification（本条）** | **`HUMAN_MAPPING_INCONCLUSIVE_DEEPER_READ_ONLY_REQUIRED`** |
| **Repair readiness（本条）** | **`DEEPER_READ_ONLY_MAPPING_REQUIRED`** |
| **Next（本条）** | **`5Z-I-L` Deeper read-only mapping diagnostic** |
