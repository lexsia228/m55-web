# Phase 5-6H-5Z-F — Vercel Production redeploy for STRIPE_WEBHOOK_SECRET activation checkpoint（2026-05-16 SSOT）

## 1. Phase名

**Phase 5-6H-5Z-F Vercel Production redeploy for STRIPE_WEBHOOK_SECRET activation checkpoint**

---

## 2. 現在地

- **`5Z-D`：** Stripe Production webhook endpoint **作成済み**（SSOT 済）。
- **`5Z-E`：** **`VERCEL_STRIPE_WEBHOOK_SECRET_HUMAN_ENV_CONFIGURATION_RECORDED`**（commit **`167f0859047d47096e88badda4c4fea86593b513`**）。
- **本条：** Human が **`STRIPE_WEBHOOK_SECRET` 設定後**に **Vercel Production の redeploy を **1 回のみ**実行**し、**Ready／Latest／Current** を確認した事実を記録する。
- **期待：** **新しい Production deployment が **`STRIPE_WEBHOOK_SECRET`** を読み込む**（本条は redeploy とステータス観測のみ。**ランタイムでの値取得ログは本条では証明しない**。）
- **Webhook：** **replay／delivery test：** **未実施**。
- **Entitlement／report unlock：** **未証明**。

---

## 3. Human Vercel UI observation

**Source：** Vercel Dashboard · Project **`m55-webv2`** · Deployments。

| 観測項目 | 記録値 |
|-----------|--------|
| **Project** | **`m55-webv2`** |
| **Deployment display／ID（prefix／truncated）** | **`74YQgkwgR…`**（**フル deployment ID は SSOT に載せない。**） |
| **Status** | **Ready／Latest** |
| **Environment** | **Production／Current** |
| **Branch** | **`main`** |
| **Source commit（表示ベース）** | **`a38918`** — **`chore(audit): refresh repo asset index`** |
| **所要時間（人手観測）** | **約 1 分 13 秒**（**about 1m13s**） |
| **Secret／`whsec`／フル識別子** | **記録しない** |

---

## 4. Evidence Registry

| `evidence_id` | **`M55-EVID-20260516-5Z-F-VERCEL-REDEPLOY-WHSEC-ACTIVATION-001`** |
|---------------|---------------------------------------------------------------------|
| **kind** | `vercel_production_redeploy_webhook_secret_activation` |
| **State** | **`OBSERVED` / `REDACTED_RECORDED`** |

**関連（親・前提）：**

- **`M55-EVID-20260516-5Z-E-VERCEL-WHSEC-ENV-001`**
- **`M55-EVID-20260516-5Z-D-STRIPE-WEBHOOK-ENDPOINT-CREATED-001`**

**フルの Deployment ID／secret／checkout／event／customer 等：** **記録しない**。

---

## 5. 判定

**`VERCEL_PRODUCTION_REDEPLOY_FOR_STRIPE_WEBHOOK_SECRET_ACTIVATION_GREEN`**

---

## 6. Important limitations（English）

- This checkpoint records **one human-triggered Production redeploy** and **Ready／Latest／Current** observation **only**.
- **This does not prove** Stripe **webhook delivery**, handler execution, fulfillment, entitlement/DB writes, or report unlock.
- **Replay**, **delivery tests**, and **idempotency governance** belong to **`Phase 5-6H-5Z-G`** or later **explicit GO**.

---

## 7. 未実行事項

- Webhook **replay**
- Webhook **delivery test**
- Stripe webhook の **設定変更**
- **`STRIPE_WEBHOOK_SECRET`／`whsec`／その他 env／secret の追加変更**（本条の redeploy **後**も **変更しない**）
- **本条で記録した 1 回目以外の追加 redeploy**
- Production DB の **read／write**
- 手動 entitlement／wallet／ticket 付与
- Runtime／code／UI 変更
- 再決済／Checkout 再試行／返金 rollback
- **`/api/stripe/*`** の直接実行
- **full Deployment／Endpoint／Event／Session／PI／Customer／email／client_reference_id／user_id／Price／secret／`whsec`／`service_role`** の記録

---

## 8. Next

**Phase 5-6H-5Z-G — Webhook idempotency／delivery or replay planning gate**

**5Z-G は最初 docs-only とする。** 計画に含めるべき項目：

- **既に paid となった **`checkout.session.completed`** に対して Stripe **replay** を使うかどうか**
- **replay 前の idempotency チェック**（**`stripe_events`**／**`one_time_fulfillments`**／duplicate の挙動）
- **DB 副作用リスク**
- **replay の前に Production DB を **read-only** で見るか**（別 Gate／人手のみ／AI は値を SSOT に書かない）
- **hard stop 条件**

**別明示 GO が無い限り：** **replay／DB write／返金／再決済は実行しない**。

---

## Work anchor

- **`167f0859047d47096e88badda4c4fea86593b513`** — `docs: record vercel stripe webhook secret env configuration`（**`5Z-E`**）。

**Prior：** `docs/ssot/M55_PHASE5_6H_5Z_E_VERCEL_STRIPE_WEBHOOK_SECRET_HUMAN_ENV_CONFIGURATION_2026-05-16.md`
