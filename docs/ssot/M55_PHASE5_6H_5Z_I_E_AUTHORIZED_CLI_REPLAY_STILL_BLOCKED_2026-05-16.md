# Phase 5-6H-5Z-I-E — Authorized CLI replay still blocked evidence checkpoint（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-E Authorized CLI replay still blocked evidence checkpoint**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-H-A`** | fulfillment artifact は **すべて missing**。 |
| **`5Z-I-A`** | Stripe CLI が **restricted key 権限不足**で **`STRIPE_WEBHOOK_REPLAY_BLOCKED_BY_CLI_RESTRICTED_KEY_PERMISSION`**。 |
| **`5Z-I-C`** | **`DASHBOARD_RESEND_UI_NOT_OBSERVED`**。 |
| **`5Z-I-D`** | **`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`**（本条コミット前の SSOT 記載のまま）。** **Human が **`5Z-I-D`** で想定した **Human-only／exactly-one** CLI を試行し、本条で結果を転記**。 |
| **Human CLI 観測** | **`invalid_request_error`** — **restricted live key が当該 endpoint／account に必要な権限を欠く**（Stripe 側で拒否）。 |
| **M55 に向けた delivery** | **0**。**HTTP：** **none**。**status：** **none／not delivered**。 |
| **same restricted key での再試行** | **禁止。** **second replay：** **no**。 |

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-E-CLI-REPLAY-STILL-PERMISSION-BLOCKED-001`** | **本条：** **authorized CLI 試行後も権限種別として restrictive と観測され Stripe で blocked と記録**。 |
| **`M55-EVID-20260516-5Z-I-D-HUMAN-AUTHORIZED-CLI-REPLAY-001`** | **`5Z-I-D`** 枠 |
| **`M55-EVID-20260516-5Z-I-C-DASHBOARD-RESEND-UI-UNAVAILABLE-001`** | Dashboard resend 不可見 |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | artifact missing |

**転記しない：** Event／Endpoint／Session／PI／customer／email／ユーザー識別子／Stripe 秘密鍵全文／Webhook signing secret。** **Chat の誤貼りも本条に転写しない。**

---

## 4. Human CLI 結果（redacted）

| Field | Value |
|--------|-------|
| **command class** | **`stripe events resend`** + **`--webhook-endpoint`** + **`--live`** |
| **credential class** | **restricted live key（カテゴリのみ）** |
| **result** | **`invalid_request_error`** |
| **error summary** | **provided restricted live key lacks required permissions for this endpoint/account** |
| **replay delivery count to M55** | **0** |
| **M55 endpoint response code** | **none** |
| **delivery status** | **none／not delivered** |
| **second replay** | **no** |
| **full IDs／secrets** | **not recorded** |

---

## 5. 判定

**`STRIPE_WEBHOOK_REPLAY_STILL_BLOCKED_BY_RESTRICTED_KEY_PERMISSION`**

---

## 6. Interpretation（解釈）

- **M55 webhook route の処理失敗ではない**（**配信自体が Stripe 側で成立していない**）。
- **Vercel を障害と断定しない。** **Production DB write 失敗でもない。**
- **`checkout.session.completed` が M55 に届いていない**という観察と整合。
- **同一 restricted（同種の権限制限キー）での再試行：** **しない**。** **十分権限を持つ資格証：** **Human-only**・**explicit GO**・**別ゲートのみ**。** **Stripe のサポート／公式の経路確認／manual fulfillment は **`5Z-I-F`** で **docs-only** に比較する。**


---

## 7. 未実行事項

- **成立 replay／M55 への webhook delivery**
- **本 blocked を受けての 2 回目 replay／same restricted での retry**
- **broad／対象外 event replay**
- **新規決済／Checkout retry**
- **Production DB write**／手動 entitlement／wallet／ticket
- **Stripe webhook／`STRIPE_WEBHOOK_SECRET`／whsec／env** 変更
- **Vercel redeploy**、コード／UI、`/api/stripe` 直呼び、返金
- **フル ID／secrets の転記**

---

## 8. Next

**`Phase 5-6H-5Z-I-F` — Replay alternative／manual fulfillment repair planning gate**

- **docs-only first**。比較例：Stripe **support／公式の再送または確認ルート／Workbench**、**human-only で十分権限のローカル CLI**、**manual fulfillment／repair プランニング**。** **explicit GO なしに実行しない。**

## Work anchor

- **`4a36c7134a20089b202567c6177e1a0d06a40b0b`** — **`docs: record human authorized cli webhook replay`**（**`5Z-I-D`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_E_AUTHORIZED_CLI_REPLAY_STILL_BLOCKED_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-E-CLI-REPLAY-STILL-PERMISSION-BLOCKED-001`** |
| **Verdict** | **`STRIPE_WEBHOOK_REPLAY_STILL_BLOCKED_BY_RESTRICTED_KEY_PERMISSION`** |
| **Next** | **`Phase 5-6H-5Z-I-F`** Replay alternative／manual fulfillment repair planning（docs-only first） |
