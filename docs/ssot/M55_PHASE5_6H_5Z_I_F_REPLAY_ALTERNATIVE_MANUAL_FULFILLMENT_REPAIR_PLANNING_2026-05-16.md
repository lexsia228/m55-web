# Phase 5-6H-5Z-I-F — Replay alternative / manual fulfillment repair planning gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-F Replay alternative / manual fulfillment repair planning gate**

本条は **docs-only planning**。replay・DB write・手動付与・返金・新規決済は **行わない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Y-A`** | **¥1,000 DTR base** が **paid / complete** と観測されている（本条は **請求状態の転記のみ**。**フルの Stripe／ユーザ識別子は SSOT に書かない**）。 |
| **`5Z-H-A`** | Production DB の **fulfillment artifact はすべて missing**（例：**row_count 0** と整合）。 |
| **`5Z-I-A`** | CLI replay が **restricted live key の権限不足**で **blocked**。 |
| **`5Z-I-C`** | Dashboard に **manual resend / replay UI が not observed**。 |
| **`5Z-I-E`** | Authorized CLI が **restricted key 権限不足**で **`STRIPE_WEBHOOK_REPLAY_STILL_BLOCKED_BY_RESTRICTED_KEY_PERMISSION`**。 |
| **M55 への replay delivery** | **0**。 |
| **M55 endpoint HTTP** | **none**（配信未取得と整合）。 |
| **entitlement / report unlock** | **証明されていない**（**unproven**）。 |

**Work anchor（直前フェーズ）：** **`98063eb`** — **`docs: record authorized cli replay still blocked`**（**`5Z-I-E`**）。

---

## 3. Official Stripe documentation summary（要約・運用上の拘束）

本条は **公式ドキュメントの一般的制約を計画入力として転記**する。**イベント／endpoint の値は書かない**。**非公式な Stripe API でのイベント直接変更・捏造は検討しない**。

| 項目 | 要約 |
|------|------|
| **Dashboard manual resend** | Stripe が **イベント画面／delivery コンテキスト**から提供する場合の **公式ルート**。**イベント作成後おおよそ 15 日以内**に限定される運用がある（**常に最新の Stripe 公式を確認**）。 |
| **Stripe CLI — `stripe events resend`** | **`stripe events resend <FULL_EVENT_ID> --webhook-endpoint=<FULL_ENDPOINT_ID> --live`** 形式（**プレースホルダのみ**。**実値は SSOT に書かない**）。**特定 Production endpoint** への再送には **`--webhook-endpoint`** が必要。**イベント作成後おおよそ 30 日**のウィンドウが議論される（**常に最新の Stripe 公式を確認**）。 |
| **`--live`** | **Production（live mode）** 再送であることの前提。 |
| **Automatic retries** | Stripe が **送達できなかったイベント**に対して **最長およそ 3 日間**自動再試行しうる。**本ケースでは支払い時点で endpoint が未設定／未到達であった可能性**により、オリジナル経路での到達が取りこぼされた観察と両立する（**断定しない**。**公式挙動を参照**）。 |
| **許容される検討** | **Stripe Dashboard／サポートが案内する公式導線**および **Stripe CLI の公式 documented 経路**のみ。**非公式・直接 API でのミューテーション**は **本条・今後ゲートともに検討対象外**。 |

※ **`<FULL_EVENT_ID>`／`<FULL_ENDPOINT_ID>`** はプレースホルダであり、本条 SSOT には実値を入れない（**Human が Dashboard／端末のみで取り扱う**）。

---

## 4. Route comparison（A〜D）

**共通：** **実行はすべて別ゲートでの explicit GO 後のみ。**本条は **計画のみ**。

### Route A — Stripe official support / Dashboard route confirmation

| 軸 | 内容 |
|----|------|
| **許可タイミング** | **別 Gate（read-only／問い合わせのみ）** → 公式経路確認後。**再送実行**はさらなる **exactly-one resend Gate** のみ。 |
| **risk** | 低〜中：**課金インフラの公式導線に沿う**。UI ウィンドウ切れ／アカウントコンテキスト違いのリスク。 |
| **required evidence** | Dashboard／サポート回答のスクリーンショット等は **Human ローカル保持**。**フル Event ID／Endpoint ID／Session／Customer／メール／`client_reference_id`／`user_id` は SSOT に貼らない**。 |
| **stop conditions** | 15 日ウィンドウ外・該当 UI 不存在が **再確認された**場合。**非公式 API 前提**になる場合は中止。 |

### Route B — Human-only sufficiently permitted CLI route

| 軸 | 内容 |
|----|------|
| **許可タイミング** | **`READY_FOR_HUMAN_ONLY_SUFFICIENTLY_PERMITTED_CLI_REPLAY_PLANNING_GATE`**（**credential を Human が安全にスコープしローカルのみで扱えることが前提**）。**実行**は別 Gate。**exactly one attempt**。 |
| **risk** | 中：**キー取り扱い／誤 endpoint／二重送信**。**same restricted key retry は絶対禁止**。`--api-key` を使う場合も **キーは Human ローカルのみ**。**AI／SSOT へ貼らない**。 |
| **required evidence** | 端末側 Stripe CLI／Dashboard の結果。**HTTP／delivery は転記規則に従い redacted**。 |
| **stop conditions** | restricted 相当キーしかない／SSOT に鍵やフル ID を書くべきという結論になる場合は中止。 |

### Route C — Manual fulfillment repair planning route

| 軸 | 内容 |
|----|------|
| **許可タイミング** | replay が **実質不可能**または **許容できないリスク**と判断した後。**本条では DB に触れない**。 |
| **risk** | 高：**Production DB write**／**二重付与**／**idempotency 不確実**。 |
| **required evidence** | **既存 paid evidence**（**SSOT はカテゴリ・フェーズ参照のみ**。フル ID 禁止）。Human-only の mapping 確認。 |
| **stop conditions** | **repair DDL/DML が単独ゲートに分離されていない**提案。**idempotency が未整理**。**フルユーザー識別子を SSOT に書く要件**。以下を **順に別 Gate** とする：**(1)** repair DDL/DML planning、(2) exact mapping human-only confirmation、(3) DB write execution、(4) DB read-only verification、(5) UI unlock verification、(6) included reply-ticket verification。 |

### Route D — Refund / rollback planning route

| 軸 | 内容 |
|----|------|
| **許可タイミング** | **別 Refund／rollback Gate**。**Fulfillment repair 可能性を検討した後にのみ**検討。 |
| **risk** | 中〜高：**ユーザー権利と運用**。 |
| **required evidence** | 支払い済み／未履行の証跡チェーン（**フル決済 ID を SSOT に書かない**）。 |
| **stop conditions** | **本条および replay プランニング Gate での即時返金**。**二重処理**（repair と返金の競合）。 |

---

## 5. Recommended next・評価観点・判定

### 評価観点（比較軸）

- **課金インフラ安全性**
- **ユーザー権利の正確性**
- **二重付与リスク**
- **full ID / secret exposure リスク**
- **Production DB write リスク**
- **再現性と監査性**
- **SSOT 整合性**
- **今後の ¥500 追加返書券テストへの影響**

### 推奨順（policy）

1. **First:** **`Route A`** — Stripe **公式サポート／Dashboard**での **manual resend 導線の確認**プランニング
2. **Second:** **`Route B`** — **Human-only・十分権限 credential** が **ローカル限定で安全にスコープ**できる場合のみ
3. **Third:** **`Route C`** — replay が **実質不可能／不採用**となった場合の **manual fulfillment repair**（**ゲート分割は Route 表どおり**）
4. **`Route D`（Refund／rollback）：** **repair 検討の後のみ**。**別 Gate**。**最終手段**

### Ready とする Gate 名（本条の出力）

| 優先度 | Gate 名 |
|--------|---------|
| **Primary（本条推奨）** | **`READY_FOR_STRIPE_OFFICIAL_SUPPORT_DASHBOARD_ROUTE_CONFIRMATION_GATE`** |
| **Alternative（条件付き）** | Human が **十分権限 credential を安全にローカル限定で扱える**場合のみ **`READY_FOR_HUMAN_ONLY_SUFFICIENTLY_PERMITTED_CLI_REPLAY_PLANNING_GATE`** |

**本条の判定（採用）:** **`READY_FOR_STRIPE_OFFICIAL_SUPPORT_DASHBOARD_ROUTE_CONFIRMATION_GATE`**

---

## 6. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-F-REPLAY-ALTERNATIVE-REPAIR-PLAN-001`** | **本条：** **代替経路の docs-only 比較／推奨 Gate 判定**。 |
| **`M55-EVID-20260516-5Z-I-E-CLI-REPLAY-STILL-PERMISSION-BLOCKED-001`** | Authorized CLI が **権限不足**で blocked |
| **`M55-EVID-20260516-5Z-I-C-DASHBOARD-RESEND-UI-UNAVAILABLE-001`** | Dashboard resend UI **not observed** |
| **`M55-EVID-20260516-5Z-H-A-HUMAN-SUPABASE-DB-PREFLIGHT-001`** | fulfillment **missing** |
| **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`** | **5Y-A** Stripe 側観測（**フル ID 未転記**） |

**転記しない：** rk_live／sk_live／whsec／**フル** Event／Endpoint／Session／PI／Customer／email／client_reference_id／user_id／Request ID／Price ID／その他 Stripe 機微文字列。**Chat の誤貼りも本条に転写しない。**

---

## 7. Hard stop conditions（即時ゲートアウト）

次のような**計画または要件が浮上した場合**、本条スコープを超えるか **実行前に中止／別ゲートへ戻す**。

| 条件 |
|------|
| **full secret／full key が SSOT に露出することが前提となる**運用 |
| **full event／session／user／email が SSOT に記録することが要件となる**運用 |
| **same restricted key retry** が提案される |
| **broad replay** が提案される |
| **repair 用の Production DB manual write** が **複数ゲートなしで**提案される |
| **refund が repair プランニングと同一ゲートで**実行提案される |
| **second payment／Checkout retry** が本条に紐づいて提案される |
| **idempotency が不明なまま** write／replay が進められることが提案される |

---

## 8. 未実行事項

- **replay 実行／M55 への endpoint delivery／2 回目 replay／broad／対象外 event replay**
- **新規決済／Checkout retry**
- **Production DB write／manual entitlement／wallet／ticket 付与**
- **Stripe webhook 設定変更／環境変数／署名秘密変更**
- **Vercel redeploy／コード・ランタイム・UI 変更**
- **返金・rollback／`/api/stripe/*` 直呼び**
- **full ID／secrets の記録**

---

## 9. Next

**`Phase 5-6H-5Z-I-G` — Stripe official support / Dashboard route confirmation gate**

- **read-only／inquiry-only first**。**公式の manual resend 導線の有無**を確認する。
- **公式経路があり再送が許されるなら：** **exactly-one resend の実行ゲート**を別途計画。
- **不可能な場合：** **`Route B`（human-only 十分権限 CLI）または `Route C`（manual fulfillment repair の分割ゲート）**へ **docs で接続**。
- **explicit GO があるまで実行しない。**

---

## Work anchor & 本条パス

- **`98063eb`** — **`docs: record authorized cli replay still blocked`**（**`5Z-I-E`**）。

**本条 SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_F_REPLAY_ALTERNATIVE_MANUAL_FULFILLMENT_REPAIR_PLANNING_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|-------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-F-REPLAY-ALTERNATIVE-REPAIR-PLAN-001`** |
| **Verdict（primary）** | **`READY_FOR_STRIPE_OFFICIAL_SUPPORT_DASHBOARD_ROUTE_CONFIRMATION_GATE`** |
| **Verdict（alternative）** | **`READY_FOR_HUMAN_ONLY_SUFFICIENTLY_PERMITTED_CLI_REPLAY_PLANNING_GATE`**（条件付き） |
| **Replay / delivery / DB / refund（本条）** | **未実行** |
| **Next** | **`Phase 5-6H-5Z-I-G`** inquiry-only／read-only first |
