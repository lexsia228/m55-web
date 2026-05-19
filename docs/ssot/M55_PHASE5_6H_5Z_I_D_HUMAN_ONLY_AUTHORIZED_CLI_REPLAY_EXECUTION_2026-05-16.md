# Phase 5-6H-5Z-I-D — Human-only authorized CLI replay execution gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-D Human-only authorized CLI replay execution gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Y-A`** | **¥1,000** **DTR base**：paid／complete 相当の証跡は SSOT で接続。**フル ID は本条に転記しない。** |
| **`5Z-H-A`** | fulfillment artifact は **すべて missing**（**`FULFILLMENT_ARTIFACTS_MISSING`**／ **`READY_FOR_EXACTLY_ONE_WEBHOOK_REPLAY_PLANNING`**）。 |
| **`5Z-I-A`** | Stripe CLI が **restricted key 権限不足**で **`STRIPE_WEBHOOK_REPLAY_BLOCKED_BY_CLI_RESTRICTED_KEY_PERMISSION`**。**delivery：** **0**。** |
| **`5Z-I-C`** | **`DASHBOARD_RESEND_UI_NOT_OBSERVED`**。 |
| **delivery／M55 HTTP** | **引き続き 0／none** とする（**replay 結果が本条で転記されない場合**）。 |
| **entitlement／report unlock** | **未証明** |
| **本条フェーズが許すこと** | **Human のみ**・**十分権限の Stripe 資格証**・**ローカル端末のみ**・**`checkout.session.completed`（**`5Y-A`** コンテキスト）への **exactly one** replay 試行**。** |
| **本条 SSOT が記録しないこと** | **Stripe の秘密鍵全文**、**`--api-key` の値**、**フルの Event／Endpoint／Session／PI／email／customer／`client_reference_id`／ユーザー識別子**。 |

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-D-HUMAN-AUTHORIZED-CLI-REPLAY-001`** | 本条：**Human-only CLI replay の証跡枠** |
| **`M55-EVID-20260516-5Z-I-C-DASHBOARD-RESEND-UI-UNAVAILABLE-001`** | Route A が観測不能 |
| **`M55-EVID-20260516-5Z-I-A-STRIPE-CLI-REPLAY-PERMISSION-BLOCKED-001`** | restricted key が blocked の前提 |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | artifact missing |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **`5Y-A`** |
| **`M55-EVID-20260516-5Z-D-STRIPE-WEBHOOK-ENDPOINT-CREATED-001`** | Production webhook endpoint |

---

## 4. Human CLI 結果

### 4.1 許可されているコマンド形（転記のみ・値は載せない）

**クラス 1：** **`stripe events resend <FULL_EVENT_ID> --webhook-endpoint=<FULL_ENDPOINT_ID> --live`**

**クラス 2（権限により）：** **`... --live --api-key <HUMAN_LOCAL_ONLY_KEY>`** — **キーは端末のみ**。**Repo／AI／SSOT／Chat に保存・貼付しない。** **exactly one 試行**。**Stripe／権限／ID 異常：** **その場で終了**。**再試行しない。**

**宛先：** **M55 Production DTR Checkout Webhook**。**ドメイン：** **`m55-webv2.vercel.app`**。**イベント種：** **`checkout.session.completed`。コンテキスト：** **`5Y-A`／¥1,000／DTR base。**

---

### 4.2 本条 SSOT／Cursor 本条コミットで適用する結果（転記未取得）

**Stripe CLI の応答／Webhook delivery の状態が、本条作成時に Human から Cursor へ転記されていない。**

| Field | 本条で記録する値 |
|--------|-------------------|
| **replay attempt（Stripe が受理した試行として確認済みか）** | **未転記** |
| **M55 endpoint HTTP（転記済み応答コード）** | **未転記** |
| **delivery status（Stripe が示す状態の redacted）** | **未転記** |
| **error summary** | **該当なし（転記なし）** |
| **2 回目 replay** | **本条コミット主体ではしない** |
| **second replay** | **no** |

**本条適用 verdict：** **`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`**（**「replay を禁止」ではなく「本条で実行結果が確定しない」**。Human が転記済みなら別コミットで **`DELIVERY_EXECUTED_ONCE`**／**`BLOCKED`** へ更新。**）

---

### 4.3 Human 転記用テンプレート（別コミットで成功／失敗を埋める）

**成功時**

| Field | Redacted で記載 |
|--------|----------------|
| command class | `stripe events resend` + `--webhook-endpoint` + `--live`（/`--api-key` **使用フラグのみ**／値は無し） |
| credential | Human-local のみ。**フル値は無し**。 |
| target event type | `checkout.session.completed` |
| target context | **5Y-A**／**DTR base**／**¥1,000 JPY** |
| endpoint domain | **`m55-webv2.vercel.app`** |
| replay attempt count | **1** |
| response code | **2xx または転記済みの HTTP ステータスコード（数値）のみ |
| delivery status | `succeeded` / `delivered` / `accepted` / `unclear` |
| second replay | **no** |
| full IDs/secrets | **not recorded** |

**blocked／失敗時**

| Field | Redacted で記載 |
|--------|----------------|
| replay attempt count | **1**（Stripe まで到達）または **0**（実行前中止） |
| error category | `permission` / `auth` / `invalid_id` / `other` |
| M55 endpoint response | **`none`** if no delivery |
| stopped without retry | **yes** |
| second replay | **no** |

---

## 5. 判定（本条コミット）

**`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`**

（**Human が CLI 出力共有後の適用：** 成功 **`STRIPE_WEBHOOK_REPLAY_DELIVERY_EXECUTED_ONCE`**、失敗 **`STRIPE_WEBHOOK_REPLAY_DELIVERY_BLOCKED`**。**）

---

## 6. 重要な制限

- **本条は replay の HTTP／DB grant／entitlement を単体で証明しない。**
- **`5Z-J`：** **Post-replay Production DB の `SELECT` read-only を別ゲート。** **UI アンロック**も別。
- **返金／rollback** は別。** **無許可の追加 replay** も別 explicit Gate。

---

## 7. 未実行事項

- **本条コミットで確定しないが、規程上禁止：** **2 回目／broad／対象外 replay**／**Checkout 再試行／新規決済**
- **Production DB write**／手動 entitlement／ticket
- **Stripe webhook／`STRIPE_WEBHOOK_SECRET`／whsec／env** 変更
- **Vercel redeploy**、コード／UI 変更、**`/api/stripe` 直呼び**、返金
- **フル ID／secret の転記**

---

## 8. Next

### Human が転記済みで **`DELIVERY_EXECUTED_ONCE`** としたとき

**`Phase 5-6H-5Z-J`** — **Post-replay Production DB read-only fulfillment verification**：`stripe_events`、`one_time_fulfillments`、`failed_fulfillments`、`entitlements`、`entitlement_rights`、`reply_ticket_wallets`、`reply_wallet_ledgers`、`dtr_report_snapshots`。**WRITE 禁止。**

### Human が転記済みで **`BLOCKED`** または本条のまま **転記未完** のとき

**`Phase 5-6H-5Z-J`** — **Replay blocked／代替 fulfillment プランニング**。**2 回目 replay は別 Gate。**

---

## Human execution procedure（ワークフロー再掲）

1. **ローカル端末のみ。**
2. **`stripe --version`** で CLI 確認。
3. **`FULL_EVENT_ID`／`FULL_ENDPOINT_ID`** は Dashboard のみ。**AI／SSOT に貼らない。**
4. **権限十分な資格証**を端末のみで使用。**`--api-key` の値は永続保存しない。** **Repo に入れない。**
5. **exactly one：**
   **`stripe events resend <FULL_EVENT_ID> --webhook-endpoint=<FULL_ENDPOINT_ID> --live`**
   または **`--api-key`** 付き同形。**1 回で停止。**

---

## Work anchor

- **`8bfe312d1b858f0533185cbd080d24039f2cf0a9`** — **`docs: record dashboard resend ui unavailable finding`**（**`5Z-I-C`**）。

**本条 SSOT パス：** `docs/ssot/M55_PHASE5_6H_5Z_I_D_HUMAN_ONLY_AUTHORIZED_CLI_REPLAY_EXECUTION_2026-05-16.md`

---

### 本条サマリー（Cursor 本条）

| Field | Value |
|--------|-------|
| Evidence | **`M55-EVID-20260516-5Z-I-D-HUMAN-AUTHORIZED-CLI-REPLAY-001`** |
| Verdict | **`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`** |
| Attempt／HTTP／delivery | **未転記** |
