# Phase 5-6H-5Z-I-N — Minimal repair runner code creation / no execution gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-N Minimal repair runner code creation / no execution gate**

本条は **runner ソースファイルの追加**まで。**runner の起動／dry-run／repair／Production DB write／Stripe／Events は一切未実施**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-J`**〜**`M`**| R1：**`fulfillDtrCoreFromCheckoutSessionId`** 再利用／**minimal runner** 設計済（**`5Z-I-M`**）。 |
| **Supabase（`5Z-I-K-A`）**| 対象 fulfillment 系 artifact **期待 missing**。**safe label（非 ID）：** **`cs_live_JSRW`**／**`user_36xz`** — **DB に使用禁止**。 |
| **本条**| **`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`** を **追加のみ**。 |

**Work anchor：** **`fb336e96568841560e6aa48255b4e04abc6e851f`** — **`docs: design minimal repair runner`**（**`5Z-I-M`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-N-MINIMAL-REPAIR-RUNNER-CODE-CREATED-001`** | **本条：** runner **コード作成**（**実行なし**）。 |
| **`M55-EVID-20260516-5Z-I-M-MINIMAL-REPAIR-RUNNER-DESIGN-001`** | 設計 SSOT |
| **`M55-EVID-20260516-5Z-I-L-PRE-WRITE-REPAIR-SCRIPT-REVIEW-001`** | pre-write review |
| **`M55-EVID-20260516-5Z-I-K-A-HUMAN-SUPABASE-MAPPING-READONLY-001`** | Human mapping |

**転記禁止：** full Session／Event／PI／ユーザー／秘密鍵等。

---

## 4. 作成ファイル

| Path | Purpose |
|------|---------|
| **`scripts/repair/repair-dtr-core-fulfillment-from-checkout-session.ts`** | **`fulfillDtrCoreFromCheckoutSessionId`** を import する **ローカル one-off repair runner**。**デフォルト dry-run**。実行モードは **`M55_REPAIR_DRY_RUN=false`** かつ **確認フレーズ一致**のみ。 |

**本条コミット時点：** **当該スクリプトは一度も実行していない**。

---

## 5. Runner 動作サマリー

| Topic | 要約 |
|------|------|
| **環境入力** | **`M55_REPAIR_CHECKOUT_SESSION_ID`**、**`M55_REPAIR_EXPECTED_USER_ID`**、**`M55_REPAIR_STRIPE_EVENT_ID`**、**`M55_REPAIR_PRODUCT_ID`**（省略時は製品コード定数へ）、**`M55_REPAIR_DRY_RUN`**（未設定＝既定 **dry-run**）、**`M55_REPAIR_CONFIRM`**（実行時のみ）、**`STRIPE_SECRET_KEY`**、**`NEXT_PUBLIC_SUPABASE_URL`**、**`SUPABASE_SERVICE_ROLE_KEY`**。**値はログに全面禁止**。 |
| **既定安全** | **import のみでは副作用なし**。**CLI で当ファイルがエントリのときのみ** `main`。**`stop()` は code exit。** |
| **Dry-run（将来 `5Z-I-O`）** | Stripe retrieve＋検証 booleans。**Supabase は head count のみ**（一覧テーブル）。**writes 禁止**。結果 **`READY`／`STOP`**。 |
| **実行（将来 `5Z-I-P`）** | **`M55_EXECUTE_CONFIRM_PHRASE`** と **`M55_REPAIR_CONFIRM`** が **完全一致**。`stripe_events` **事前 SELECT** で重複なら **`STOP`**。無ければ INSERT（event_type は **`checkout.session.completed`**）、続けて **`fulfillDtrCoreFromCheckoutSessionId`**。INSERT が **`23505`** または既存行は **`STOP`**。合成 Stripe `event.id` は禁止。 |
| **ログ** | **phase／safeLabelsReference／validation booleans／row_count／-finals のみ**。 |
| **`stripe_events` + 第二層** | コードコメント：**`one_time_fulfillments.checkout_session_id`** 冪等（**fulfill 内**）が追加防御。 |

**実行用確認フレーズ（repo 内定数・SSOT 可）：** ソースの **`M55_EXECUTE_CONFIRM_PHRASE`**（**`M55_CONFIRM_ONE_SHOT_DTR_CORE_MANUAL_REPAIR_20260516`**）。

---

## 6. Verification

| Check | Result |
|-------|--------|
| **`git diff --check`** | コミット前に実行（末尾空白など）。 |
| **静的型チェック** | **`npx tsc --noEmit -p tsconfig.json`** — **コンパイルのみ**。**runner は起動しない**。 |
| **`package.json`**／**lock** | **本条で変更しない**。**依存／npm scripts 追加なし**。 |

**runner 実行：** **本条では実施しない**。

---

## 7. Determination（判定）

| Field | Value |
|--------|--------|
| **採用** | **`READY_FOR_DRY_RUN_REPAIR_RUNNER_EXECUTION_PLANNING_GATE`** |

**別案（追加静的レビューが要る場合のみ）：** **`READY_FOR_REPAIR_RUNNER_STATIC_REVIEW_GATE`**

---

## 8. 未実行事項

- **runner／dry-run／repair の実行**
- **Production DB write／手動 entitlement／wallet**
- **Events／Stripe／webhook／CLI／Dashboard resend／新規決済／返金／env-whsec／redeploy／UI**
- **依存追加／npm script 追加**
- **フル IDs／secrets の記録**

---

## 9. Next

**`Phase 5-6H-5Z-I-O` — Dry-run repair runner execution planning gate**

- **`5Z-I-O`**：**dry-run のみ**計画・実行許可。**write 禁止**。
- **exactly-one repair 実行：** **`5Z-I-P`** 以降のみ。

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_N_MINIMAL_REPAIR_RUNNER_CODE_CREATION_NO_EXECUTION_2026-05-16.md`
