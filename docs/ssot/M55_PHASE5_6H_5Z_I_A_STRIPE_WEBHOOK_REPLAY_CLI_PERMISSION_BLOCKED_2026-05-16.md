# Phase 5-6H-5Z-I-A — Stripe webhook replay blocked by CLI restricted key permission checkpoint（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-A Stripe webhook replay blocked by CLI restricted key permission checkpoint**

---

## 2. 現在地（前提）

- **`5Z-H-A`：** Production Supabase **`SELECT`** で **fulfillment artifact はすべて missing**（**`row_count` 0**）と転記済み。
- **`5Z-I`：** **`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`**／Stripe からの **delivery／HTTP の転記未取得**として記録済み。
- **Human：** **`stripe login` 後、ローカル Stripe CLI で replay を試行した。**
- **結果：** **restricted live key の権限不足**により **Stripe 側で `invalid_request_error`**。**M55 webhook へイベントは届かなかった**（**endpoint 応答なし**）。
- **本条：** **replay 成功・DB write・entitlement 付与・返金・Stripe／Vercel 設定変更は行わない。**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-A-STRIPE-CLI-REPLAY-PERMISSION-BLOCKED-001`** | 本条：**CLI replay が権限で blocked** |
| **`M55-EVID-20260516-5Z-I-STRIPE-WEBHOOK-REPLAY-001`** | **`5Z-I`** replay Gate |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | replay 前 **artifact missing** |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **`5Y-A`** コンテキスト接続 |

**記録禁止：** **`rk_live`／`sk_live`／`whsec`／その他シークレット**、**フル** Event／Session／Payment Intent／Customer／email／client_reference_id／user／Webhook Endpoint オブジェクト ID／Request ID／Price ID。

---

## 4. Human CLI 観測（転記のみ・フル ID なし）

| Field | 値 |
|--------|-----|
| **Stripe CLI version** | **1.40.9** |
| **コマンド形（クラス）** | **`stripe events resend` + `--webhook-endpoint=` + `--live`**（`<FULL_EVT_ID>`／`<FULL_WE_ENDPOINT_ID>` は **SSOT に書かない**） |
| **結果（Stripe 応答）** | **`invalid_request_error`** |
| **エラー要約（意訳・カテゴリのみ）** | **「restricted live key がこの endpoint／account に必要な権限を持たない」** |
| **replay attempt（delivery に至った回数）** | **0** |
| **M55 endpoint の response code** | **none**（**配信が発生しないため HTTP 観測なし**） |
| **delivery status** | **none／not delivered** |
| **2 回目 replay** | **no** |
| **フル key／フル ID** | **記録しない／本条にも載せない** |

---

## 5. 判定

**`STRIPE_WEBHOOK_REPLAY_BLOCKED_BY_CLI_RESTRICTED_KEY_PERMISSION`**

---

## 6. Interpretation（解釈）

- **webhook handler（Next.js route）の失敗ではない**（**M55 へ届いていない**）。
- **Vercel の障害としては結論づけない**（**配信が発火していない**）。
- **Production DB の write 失敗でもない**（**処理に入っていない**）。
- **イベントは M55 に delivery されていない。** replay は **未完了**。**別経路での exactly-one 再送計画が必要**。
- **十分な権限を持つキー**の扱いは **Human のみ／端末ローカルのみ**。**SSOT／AI／Chat にフル key を貼らない。**

---

## 7. Next options

### A. Dashboard 再送 UI の再確認ゲート

- Human が **同一 `checkout.session.completed`（5Y-A コンテキスト）**に対し、**Events または endpoint delivery タブ**で **「Resend／再送」**相当を探索。
- 見つかれば **exactly one** のみ実行。

### B. 権限の足りるキーによる **Human-only** CLI replay ゲート

- **十分な権限の Stripe API key** を **端末ローカル**のみで使用（**`--api-key` 等は本文に書かない**）。
- **同一イベント 1 回のみ**の resend。**broad replay 禁止。**

### Recommended next

**`Phase 5-6H-5Z-I-B` — Replay route decision gate**（Dashboard vs 権限付き CLI 等の**経路決定のみ**、**フル secret／フル ID は書かない**）。

---

## 8. 未実行事項

- **成立した replay／M55 への webhook delivery**
- **2 回目／broad replay**
- **新規決済／Checkout retry**
- **Production DB write**／手動 entitlement／wallet／ticket
- **Stripe webhook 設定変更**、`STRIPE_WEBHOOK_SECRET`／whsec／env 変更
- **Vercel redeploy**、コード／UI 変更
- **返金 rollback**、`/api/stripe` 直呼び
- **フル ID／secrets の記録**

---

## Work anchor

- **`95760b31bee0322c5f33c9bcfb9a1bcb2b8fce80`** — **`docs: record exactly one stripe webhook replay execution`**（**`5Z-I`**）。

**本条 SSOT パス：** `docs/ssot/M55_PHASE5_6H_5Z_I_A_STRIPE_WEBHOOK_REPLAY_CLI_PERMISSION_BLOCKED_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-A-STRIPE-CLI-REPLAY-PERMISSION-BLOCKED-001`** |
| **Verdict** | **`STRIPE_WEBHOOK_REPLAY_BLOCKED_BY_CLI_RESTRICTED_KEY_PERMISSION`** |
| **Delivery に至った replay** | **0** |
| **Next** | **`Phase 5-6H-5Z-I-B` Replay route decision gate** |
