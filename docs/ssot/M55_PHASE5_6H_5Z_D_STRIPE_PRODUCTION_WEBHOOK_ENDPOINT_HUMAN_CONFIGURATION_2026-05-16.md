# Phase 5-6H-5Z-D — Stripe Production webhook endpoint human configuration gate（2026-05-16 SSOT）

## 1. Phase名

**Phase 5-6H-5Z-D Stripe Production webhook endpoint human configuration gate**

---

## 2. 現在地

- **`5Y-A`：** paid／complete 証跡は SSOT に記録済み（¥1,000／Standard）。
- **Post-payment M55 UI：** **`接続を確認できませんでした`**（証跡は既存 Evidence Registry）。
- **`5Z-B`：** **`STRIPE_WEBHOOK_ENDPOINT_NOT_OBSERVED_FINDING_RECORDED`**（当時 webhook endpoint は観測されず）。
- **`5Z-C`：** **`READY_FOR_STRIPE_PRODUCTION_WEBHOOK_ENDPOINT_HUMAN_CONFIGURATION_GATE`**（planning：**`be49ddaffc2a554d9db8d632260b593a21bfb7a6`**）を前提に本条を実施。
- **本条：** Human により Stripe Production **webhook endpoint を作成した**ことを SSOT 化する。**このコミットは endpoint 作成事実のみを記録**。
- **`STRIPE_WEBHOOK_SECRET`：** Vercel Production には **未設定のまま**（**5Z-E**）。
- **Replay／delivery test：** **未実施**。**Replay：** **未実施**。
- **Entitlement／report unlock／included reply-ticket：** **本条では未証明**（変更なし）。

---

## 3. Human Stripe UI observation（Dashboard / Workbench → Webhooks）

**Source：** Stripe Dashboard / Workbench · **Webhook**（送信先／destinations）。

| 観測項目 | 記録値 |
|-----------|--------|
| **Endpoint created（送信先作成）** | **yes** |
| **Endpoint URL（登録済み公開 URL）** | **`https://m55-webv2.vercel.app/api/stripe/webhook`** |
| **イベント購読（選択された type）** | **`checkout.session.completed`**のみ（最小構成。**`charge.refunded`／`invoice.paid` は本条では追加しない**。） |
| **Endpoint enabled / active に相当する状態** | **yes** |
| **Signing secret / `whsec` が生成済みまたは UI から参照可能か** | **yes** |
| **`whsec` フル値** | **記録なし／SSOT 本文に無し／AI に貼付なし** |
| **Stripe endpoint のフルオブジェクト ID** | **記録なし** |
| **送信テスト／テスト送信／replay／delivery を使った確認** | **未実施** |

---

## 4. Evidence Registry

| `evidence_id` | **`M55-EVID-20260516-5Z-D-STRIPE-WEBHOOK-ENDPOINT-CREATED-001`** |
|---------------|----------------------------------------------------------------------|
| **Source kind** | `stripe_webhook_endpoint_created` |
| **State** | **`OBSERVED` / `REDACTED_RECORDED`** |
| **External full IDs** | **記録しない** |

**関連（親・前提）：**

- **`M55-EVID-20260516-5Z-C-WEBHOOK-CONFIG-PLAN-001`**（**5Z-C planning**）。
- **`M55-EVID-20260516-5Z-B-STRIPE-WEBHOOK-ENDPOINT-001`**（endpoint 不在観測）。
- **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`**（Events 文脈接続のみ）。

---

## 5. 判定

**`STRIPE_PRODUCTION_WEBHOOK_ENDPOINT_HUMAN_CONFIGURATION_RECORDED`**

---

## 6. Important limitations（English）

- This SSOT records **Stripe-side endpoint creation only** (human configuration in Stripe Dashboard / Workbench).
- **This does not prove** live **webhook delivery** to Production.
- **This does not prove** server-side fulfillment, DB writes, entitlement, or report unlock.
- **`STRIPE_WEBHOOK_SECRET` / signing secret wiring** belongs to **`Phase 5-6H-5Z-E`** (human Vercel env); **never paste full `whsec` here or to AI**.
- **`Vercel redeploy`** (when needed after env updates) stays in **`Phase 5-6H-5Z-F`** or equivalently gated step.
- **Delivery verification, replay governance, idempotency review:** **`Phase 5-6H-5Z-G` or later** only.

---

## 7. 未実行事項

- Stripe **webhook replay**
- Stripe **delivery test／テスト送信**
- **`STRIPE_WEBHOOK_SECRET`／`whsec` の値を SSOT／AI／チャットへ記載**
- **Vercel env 変更**（**`STRIPE_WEBHOOK_SECRET` を Production に入れる作業は **`5Z-E`**。本条では未実施）。
- **Vercel redeploy**
- Stripe の **本条の endpoint 作成以外の追加設定変更**
- Supabase／Production DB／手動 entitlement／wallet
- Runtime／code／UI 変更
- 再決済／Checkout 再試行／返金 rollback
- **`/api/stripe/*`** を直接叩く検証行為
- full Endpoint ID／Session／PI／Customer／email／event id／price／secret 等の記録

---

## 8. Next

**Phase 5-6H-5Z-E — Vercel `STRIPE_WEBHOOK_SECRET` human env configuration gate**

**5Z-E でのみ：** Human が Stripe endpoint の **signing secret** を **`m55-webv2` の Vercel Production** の **`STRIPE_WEBHOOK_SECRET`** に設定する。**`whsec` フル値は SSOT に書かない。Redeploy は `5Z-F` に分離。Delivery／replay は後続のみ。**

---

## Work anchor

- **`be49ddaffc2a554d9db8d632260b593a21bfb7a6`** — `docs: plan stripe production webhook endpoint configuration`（**`5Z-C`**）。

**Prior：** `docs/ssot/M55_PHASE5_6H_5Z_C_STRIPE_PRODUCTION_WEBHOOK_ENDPOINT_CONFIGURATION_PLANNING_2026-05-16.md`
