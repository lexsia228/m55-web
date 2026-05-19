# Phase 5-6H-5Z-I-B — Replay route decision gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-B Replay route decision gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Y-A`** | ¥1,000 **DTR base** の決済が **paid／complete 相当**に見える証跡は事前 SSOT 接続済み。**フル ID は本条に載せない。** |
| **`5Z-H-A`** | Production Supabase **`SELECT`** で **fulfillment artifact はすべて missing（`row_count` 0）** |
| **`5Z-I`** | **`STRIPE_WEBHOOK_REPLAY_NOT_EXECUTED`**／delivery／HTTP の **転記未取得** |
| **`5Z-I-A`** | **Stripe CLI が restricted live key の権限不足で blocked**。**M55 への delivery：** **発生していない**。 |
| **replay が M55 に届いたと言える状態** | **いまだなく**。**delivery count は 0** のまま。 |
| **M55 endpoint の HTTP** | **観測なし／none。** |
| **Replay 後の Production DB における fulfillment 証明** | **いまだなし**。 |
| **entitlement／report unlock** | **未証明** |
| **`5Z-I-B` での実行** | **replay は実行しない**（経路決定のみ）。 |

---

## 3. Official Stripe documentation summary（要約のみ・本文に機微なし）

- **Stripe Dashboard（Workbench）上での手動 resend：** イベント送信の再試行経路として**公式に提供**。**イベント作成から一定期間以内**が対象（**Dashboard は CLI より短い対象ウィンドウ**）。**本条では「イベント画面／delivery コンテキスト」から操作する運用のみ**。
- **`stripe events resend`：** **公式 CLI** で `<event_id>` と webhook endpoint を指定。**形（プレースホルダのみ）：**
  **`stripe events resend <FULL_EVENT_ID> --webhook-endpoint=<FULL_ENDPOINT_ID>`**
  **Live：** Production 宛は **`--live`** を付ける必要がある運用であり、Human の端末で **ローカルのみ**扱う（**本条はコマンド形のクラスのみ**。**FULL\_* は転記しない**）。
- **対象ウィンドウ（経路ごと・常に Stripe 公式の最新説明が SSOT）：** **CLI：** イベント作成後 **およそ 30 日以内**が一般的な要件として知られる。**Dashboard** の手動 resend：**より短く**、**およそイベント作成後 15 日以内**が説明されていることがある。
- **非公式経路：** **イベントの内容を捏造して API を直叩きする等は行わない。** **公式の Dashboard または公式 CLI のみ。** `/api/stripe/*`（M55 側）との混同回避。

※ **フルイベント ID／endpoint ID／キー類は SSOT と AI に貼らない。**

---

## 4. Route decision（本条の選択）

**推奨経路：** **Route A を先。** **Unavailable のときのみ Route B。**

| 順位 | Route | Role |
|:----:|-------|------|
| **優先（Preferred）** | **Route A — Dashboard／Workbench の resend UI 再確認** | **イベント／delivery／メニュー**から **公式 UI の再送**。AI に ID を公開する必要はない。**UI が利用可能なら第一選択。** |
| **Fallback** | **Route B — Human-only 権限付き CLI replay** | **端末のみ**。**十分権限を持つクレデンシャル**。**explicit GO と exactly one のみ**。再試行でループしない。 |

本文のゲート判定（§8）は **優先順に応じ **`READY_FOR_DASHBOARD_RESEND_UI_RECHECK_GATE`** を既定**とする。Dashboard が **明示的に使えない**ことが既に証明済みとなる SSOT が先行していれば、そのとき **`READY_FOR_HUMAN_ONLY_AUTHORIZED_CLI_REPLAY_GATE`** を採れる（本条時点：**UI 未到達確認のため前者**）。

---

## 5. Route A — Dashboard resend UI 再チェック計画（5Z-I-Bでは実行しない）

1. Stripe **Workbench → Events** を Human が開く。
2. **`5Y-A`** コンテキストの **`checkout.session.completed`** を **画面上のみ**特定（フルイベント ID は AI／SSOT へ転記しない）。
3. **イベントの delivery／エンドポイント宛の送信履歴／メニュー**を確認。**「Resend／Replay／再送」相当**があるかだけを判定。
4. **UI が見つかった場合：** **ここで replay しない**。**明示 GO を得た **`5Z-I-D` Dashboard exactly-one resend execution** で **1 回だけ**実行予定として止める。
5. **UI が見つからない場合：** **`unavailable`** を記録する別 SSOT（**`5Z-I-C`**）で固定し **Route B 計画へ**進む準備のみ。

---

## 6. Route B — Human-only 権限付き CLI 計画（5Z-I-Bでは実行しない）

- **実行場所：** **Human のローカル端末のみ。** **Cursor にキーを貼らない。**
- **クレデンシャル：** **十分権限**。**値は恒久的に証跡に書かない。**
- **コマンド形（redacted、FULL は書かない）：**
  **`stripe events resend <FULL_EVENT_ID> --webhook-endpoint=<FULL_ENDPOINT_ID> --live`**
- **イベント ID と endpoint ID：** **ターミナル／Stripe UI のみ**。**SSOT には載せない。**
- **GO：** **`5Z-I-D` Human-only authorized CLI replay execution gate** に **明示 GO**。**試行：** **exactly one**。**権限または認証エラー：** **STOP → BLOCKED 記録**。**連投しない。**

---

## 7. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-B-REPLAY-ROUTE-DECISION-001`** | 本条：経路決定 |
| **`M55-EVID-20260516-5Z-I-A-STRIPE-CLI-REPLAY-PERMISSION-BLOCKED-001`** | CLI が restricted key で blocked |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | artifact missing |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **`5Y-A`** 文脈 |
| **`M55-EVID-20260516-5Z-D-STRIPE-WEBHOOK-ENDPOINT-CREATED-001`** | Production endpoint 証跡 |

**フル ID／キー：** **転記しない。**

---

## 8. 判定

**`READY_FOR_DASHBOARD_RESEND_UI_RECHECK_GATE`**

**補助：** Dashboard resend が **既存 SSOT 上で明示的に利用不能と確証済み**のときだけ、ゲート文言を **`READY_FOR_HUMAN_ONLY_AUTHORIZED_CLI_REPLAY_GATE`** に切り替えうる。**UI 有無の一次確認は **`5Z-I-C`**。** **本条は replay を実行しない。**

---

## 9. 未実行事項

- **replay／M55 webhook への実 delivery**
- **2 回目／broad／対象外 event の replay**
- **新規決済／Checkout retry**
- **Production DB write**／手動 entitlement／wallet／ticket
- **Stripe webhook 設定**、`STRIPE_WEBHOOK_SECRET`／whsec／env 変更
- **Vercel redeploy**、コード／UI 変更
- **返金 rollback**、`/api/stripe` 直呼び
- **フル ID／secret の証跡**

---

## 10. Next

**`Phase 5-6H-5Z-I-C`** — **Dashboard resend UI re-check gate**

- **`5Z-I-C`** で Dashboard resend UI の **あり／なし**を read-only で確定。**本条では実行しない。**
- **`5Z-I-C` の後：**
  - **UI あり：** **`Phase 5-6H-5Z-I-D` Dashboard exactly-one resend execution gate**
  - **UI なし：** **`Phase 5-6H-5Z-I-D` Human-only authorized CLI replay execution gate**
いずれも **別途 explicit GO**。**replay は `5Z-I-D` で **exactly one** のみ許容設計。**

---

## Work anchor

- **`c474af62643a78e322845a7cde5b10f14a3a6bda`** — **`docs: record stripe webhook replay cli permission blocked`**（**`5Z-I-A`**）。

**本条 SSOT パス：** `docs/ssot/M55_PHASE5_6H_5Z_I_B_REPLAY_ROUTE_DECISION_GATE_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-B-REPLAY-ROUTE-DECISION-001`** |
| **Verdict** | **`READY_FOR_DASHBOARD_RESEND_UI_RECHECK_GATE`** |
| **Preferred route** | **Route A（Dashboard resend UI）→ 不可なら Route B（CLI）** |
