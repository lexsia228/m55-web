# Phase 5-6H-5Z-I-G — Stripe official support / Dashboard route confirmation gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-G Stripe official support / Dashboard route confirmation gate**

本条は **inquiry-only／read-only**。**replay・CLI 実行・Dashboard 実行再送・DB write・manual fulfillment・refund は行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Y-A`** | **¥1,000 DTR base** が **paid / complete** と観測（**カテゴリ転記のみ**。**フル Stripe／ユーザー識別子は SSOT に書かない**）。 |
| **`5Z-H-A`** | Production DB **fulfillment artifact はすべて missing**（**row_count 0** 等と整合）。 |
| **`5Z-I-C`** | Dashboard で **Resend／Replay UI は not observed**（先行証跡）。 |
| **`5Z-I-E`** | **Restricted key** により **`STRIPE_WEBHOOK_REPLAY_STILL_BLOCKED_BY_RESTRICTED_KEY_PERMISSION`**。 |
| **`5Z-I-F`** | Replay 代替／repair プランニング完成。** **`READY_FOR_STRIPE_OFFICIAL_SUPPORT_DASHBOARD_ROUTE_CONFIRMATION_GATE`** が記録済み**。 |
| **M55 への replay delivery** | **0**。 |
| **M55 endpoint HTTP** | **none**。 |
| **entitlement／report unlock** | **unproven**（未証明）。 |

**Work anchor（直前フェーズ）：** **`fe69cac`** — **`docs: plan replay alternative and fulfillment repair routes`**（**`5Z-I-F`**）。

---

## 3. Official documentation summary（計画・確認用）

本条は **公式ドキュメント上の一般的記述を整理**する。**特定アカウント状態の確定には Dashboard／Stripe support を要する**。**非公式・直接 API ミューテーションは対象外**。

| 項目 | 要約 |
|------|------|
| **Dashboard manual resend** | eligible なイベントに対して、**イベント view／delivery 文脈**から **manual resend** が提供される **公式経路**。多くの文脈で **イベント作成からおおよそ 15 日**の制約がある（**常に Stripe 最新公式を確認**）。 |
| **Stripe CLI — `stripe events resend`** | **`stripe events resend <FULL_EVENT_ID> --webhook-endpoint=<FULL_ENDPOINT_ID> --live`**。多くは **イベント作成からおおよそ 30 日**のウィンドウ（**公式確認**）。**宛先 Production endpoint を固定するために `--webhook-endpoint`** が要件。 |
| **Workbench／Event deliveries と Retry now** | Webhook endpoint の **Event deliveries** に **試行ログ**がある場合、その文脈で **Retry now** が並ぶことがある（**公式説明ベース**。UI 文言は時代で変わり得る）。 |
| **Delivery attempt が無いケース** | **イベント作成時に endpoint が存在しなかった／試行が一度も無い**と、Dashboard の **Retry／Resend** が現れない可能性がある。**Stripe の公式ヘルプ／サポートでの確認ルートが必要**となることがある。**本条では実行確定しない**。 |
| **非公式 API** | **検討対象外** |

※ **`<FULL_EVENT_ID>`／`<FULL_ENDPOINT_ID>`** は **プレースホルダ**。**実値は AI／チャット／SSOT に転記しない**。

---

## 4. A. Dashboard route confirmation（read-only チェックリスト）

Human が **読み取りのみ**で以下を順に確認する。**本条コミット時点では新規スクショ転記や値の SSOT 化はしない**。

| 確認項目 | 手順／論点 |
|----------|-------------|
| **Resend／Replay／Retry の有無** | Workbench **Events** で該当 **`checkout.session.completed`**（人手で特定）について **UI 上に Resend／Replay／類似文言**があるか。 |
| **Endpoint 側の delivery attempt** | 既存 Production webhook endpoint の **Event deliveries** に、当該イベントの **delivery attempt** が列挙されるか。 |
| **Retry now の前提** | **Retry now** は **試行済みログが存在する**文脈で現れやすい、という **一般的模型**との整合。**試行無しでは表示されない**可能性。 |
| **Historical／endpoint後作成ケース** | **支払い時点では endpoint が無かった**履歴イベントでは **試行無し→ UI 無し**のパターンと両立検討。 |
| **Execution** | **本条では実行しない**。 |

### Dashboard route confirmation result（本条 SSOT に記載する転記のみ）

本条は **inquiry／read-only／SSOT 草案のみ**であり、Stripe 側の追加回答未取得。**先行 SSOT と矛盾しない範囲**で状態を明示する。

| Field | Result（本条作成時点） |
|--------|--------------------------|
| **Dashboard resend route observed** | **unclear／pending Human verification**。**先行：** **`5Z-I-C`** は **not observed**。 |
| **Endpoint delivery attempt observed** | **unclear**。Human が **Dashboard read-only での一次確認結果を別途保持**。**SSOT には試行ログ・イベント値を転記しない**。 |
| **Retry now observed** | **unclear**（同上）。 |
| **Execution performed（Dashboard resend／retry／replay）** | **no**。 |

---

## 5. Stripe official support／inquiry plan（B／C）

### B. Stripe official support / help route（方針）

- **Stripe 公式サポート／Dashboard ヘルプ**で **正規経路のみ**確認する。**問い合わせは情報確認のみ**。
- **Full Stripe／顧客識別子（Event／Endpoint／Account／customer／session／PI／email 等）：** **Stripe 画面上で Human が入力するのみ**。**AI／チャット／SSOT には転記しない**。
- **`sufficiently permitted` キーを用いた CLI 実行：** **本条では禁止**。回答に基づく **実行は別 Gate**。

### C. Support inquiry draft（redacted）

**言語：** English（Stripe support への提出用ドラフト。**プレースホルダに実値を入れた完成文を SSOT に貼らない**）。

```text
We have a Live checkout.session.completed event for a one-time Checkout payment that occurred before our Production webhook endpoint was configured. The payment is paid/complete, but no delivery attempt appears for the new Production endpoint, and the Dashboard/Workbench UI does not show Resend/Replay/Retry for this historical event. The endpoint is now active and subscribes to checkout.session.completed.

What is the official Stripe-supported way to resend this historical event to the endpoint, if Dashboard Retry/Resend is not visible?

If Dashboard resend is unavailable, should we use Stripe CLI `stripe events resend <FULL_EVENT_ID> --webhook-endpoint=<FULL_ENDPOINT_ID> --live` with a sufficiently permitted key, or is there another official supported route?

We need only official guidance—we are not requesting custom API mutations outside documented Stripe-supported flows.

— We will paste the specific event ID, endpoint ID, and account identifiers only into the Stripe Support form (never into third-party tooling or chats).
```

---

## 6. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-G-STRIPE-OFFICIAL-ROUTE-CONFIRMATION-001`** | **本条：** **公式経路確認ゲート／read-only／問い合わせドラフト**。 |
| **`M55-EVID-20260516-5Z-I-F-REPLAY-ALTERNATIVE-REPAIR-PLAN-001`** | **`5Z-I-F`** プランニング Evidence |
| **`M55-EVID-20260516-5Z-I-E-CLI-REPLAY-STILL-PERMISSION-BLOCKED-001`** | CLI **restricted blocked** |
| **`M55-EVID-20260516-5Z-I-C-DASHBOARD-RESEND-UI-UNAVAILABLE-001`** | Dashboard **not observed** |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | fulfillment **missing** |

**転記しない：** rk_live／sk_live／whsec／**フル** Event／Endpoint／Session／PI／Customer／email／client_reference_id／user_id／Request ID／Price ID。**Chat 誤貼りも転写しない**。

---

## 7. Determination（判定）

**本条採用（サポート／Dashboard 回答未取得のデフォルト）：** **`READY_FOR_STRIPE_SUPPORT_INQUIRY_HUMAN_CONFIRMATION_GATE`**

**条件付き分岐コード（Stripe 側回答が得られた **`5Z-I-H`** 以降でのみ採用）：**

| Verdict token | When |
|----------------|------|
| **`DASHBOARD_RESEND_ROUTE_CONFIRMED_READY_FOR_EXACTLY_ONE_RESEND_GATE`** | 公式確認が **Dashboard resend** で **exactly-one** 実行可能となったとき |
| **`CLI_ROUTE_CONFIRMED_READY_FOR_HUMAN_ONLY_SUFFICIENTLY_PERMITTED_CLI_GATE`** | 公式確認が **CLI + 十分権限**が **唯一または推奨**の公式経路とされたとき |
| **`HISTORICAL_RESEND_ROUTE_UNAVAILABLE_READY_FOR_MANUAL_FULFILLMENT_REPAIR_PLANNING`** | 公式が **historical 再送不能**または **本 endpoint 文脈での再配送は不可**としたとき |
| **`OFFICIAL_ROUTE_CONFIRMATION_INCONCLUSIVE`** | 回答分裂・未定・要エスカレーション時 |

---

## 8. Hard stop（本条および直後の準備フェーズでの禁止）

SSOT に **実鍵またはフル Stripe ID** が前提となる運用、`same restricted retry`、**broad／対象外 replay** の提案、repair Gate なしの **manual DB write**、repair／refund Gate なしの **refund**、**第 2 決済／Checkout retry** が混ざる提案、および **Human がイベント同一性も確認できない**まま実行に進む案は **即時 gate-out**。**また本条では：`sufficiently permitted` credential を使った CLI 実行、`/api/stripe` 直呼び、`whsec`/env の変更は禁止**。

---

## 9. 未実行事項

- **replay／CLI 実行／Dashboard resend／retry の実行／M55 への delivery／2 回目**
- **新規決済／Checkout retry**
- **Production DB write／manual entitlement／wallet／ticket**
- **Stripe webhook 変更／環境・署名秘密／Vercel redeploy／コード・UI／返金 rollback**
- **フル IDs／secrets の記録**

---

## 10. Next（`Phase 5-6H-5Z-I-H` に接続。**実行はしない**）

サポートでの **Human 送信が先要**となるため、**既定 Next：** **`Phase 5-6H-5Z-I-H` — Stripe support inquiry human submission checkpoint**。

### D. Stripe 公式回答または Dashboard read-only が確定した後の分岐（本条では確定しない）

| Stripe の確認内容（要約） | **`5Z-I-H` での名前案** |
|---------------------------|-------------------------|
| **Dashboard での公式 resend が利用可能**と確認 | **Dashboard exactly-one resend execution gate** |
| **CLI と十分権限キーが公式に必須／推奨** | **Human-only sufficiently permitted CLI replay** planning／execution Gate |
| **historical が公式上再送不能**と確認 | **Manual fulfillment repair planning** Gate |
| **回答不明確・未取得** | **Support response pending／deeper official confirmation** Gate |

**本条作成時点では上表を確定しない**。Human がサポートまたは Dashboard での結果を **`5Z-I-H`** に転記して確定する。

### 状態別ネクスト（一覧）

| 状態 | Next |
|------|------|
| 問い合わせ送信が次アクション | **Stripe support inquiry human submission checkpoint** |
| Dashboard **exactly-one resend** が公式確認済み後 | **Dashboard exactly-one resend execution gate** |
| CLI／十分権限が公式確認済み後 | **Human-only sufficiently permitted CLI replay gate** |
| 再送不能が公式確認 | **Manual fulfillment repair planning gate** |

**explicit GO があるまで実行しない**。

---

## Work anchor & 本条パス

- **`fe69cac`** — **`docs: plan replay alternative and fulfillment repair routes`**（**`5Z-I-F`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_G_STRIPE_OFFICIAL_SUPPORT_DASHBOARD_ROUTE_CONFIRMATION_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-G-STRIPE-OFFICIAL-ROUTE-CONFIRMATION-001`** |
| **Verdict（本条）** | **`READY_FOR_STRIPE_SUPPORT_INQUIRY_HUMAN_CONFIRMATION_GATE`** |
| **Dashboard 実行／CLI／delivery／DB／refund** | **本条：いずれも未実施／未転記増分** |
