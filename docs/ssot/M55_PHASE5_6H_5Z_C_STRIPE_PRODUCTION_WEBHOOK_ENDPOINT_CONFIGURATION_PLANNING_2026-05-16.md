# Phase 5-6H-5Z-C — Stripe Production webhook endpoint configuration planning gate（2026-05-16 SSOT）

## 1. Phase名

**Phase 5-6H-5Z-C Stripe Production webhook endpoint configuration planning gate**

---

## 2. 現在地

- **`5Y-A`：** ¥1,000 DTR base に関する paid／complete 証跡は SSOT に記録済み（**paid／complete 相当の見え**）。
- **Post-payment M55 UI：** **`接続を確認できませんでした`**。
- **`5Z-A`：** **`POST_PAYMENT_FULFILLMENT_READ_ONLY_DIAGNOSTIC_INCONCLUSIVE`**。
- **`5Z-B`：** **`STRIPE_WEBHOOK_ENDPOINT_NOT_OBSERVED_FINDING_RECORDED`**（commit **`638e22f608003f6dc43fb75c747e633541f9d1d9`**）。
- **Human 観測：** Stripe Workbench で **Production webhook endpoint は観測されなかった**。**delivery／response code も観測されず**。
- **本条まで：** webhook **endpoint は未作成**。**`STRIPE_WEBHOOK_SECRET`：** **未変更**。
- **引き続き未証明：** webhook 経由 fulfillment／entitlement／DB grant／report unlock／included reply-ticket。

---

## 3. この Gate の目的

Stripe **Production** 向け webhook destination／endpoint configuration を **安全な人手順で実施するための計画だけ**を SSOT に固定する。

本条（**5Z-C**）は **docs-only**。**endpoint 作成、`whsec` 取得、`STRIPE_WEBHOOK_SECRET` の値入力／Vercel env 編集／redeploy／webhook delivery test／replay／Production DB の read／write、手動付与、`/api/stripe/*` の直接実行、返金／再決済は **実施しない**。

---

## 4. Endpoint URL plan

### Candidate canonical webhook URL（公開 HTTPS。**secret でない**。）

| 種別 | URL |
|------|-----|
| **Candidate A（Vercel Project `m55-webv2` と整合する既定ホスト型）** | **`https://m55-webv2.vercel.app/api/stripe/webhook`** |
| **Candidate B（過去 redeploy checkpoint に現れた Deployment domain の例）** | **`https://m55-web.vercel.app/api/stripe/webhook`** |

Next.js route：**`POST /api/stripe/webhook`**（`app/api/stripe/webhook/route.ts`）。

### Recommended endpoint URL

**`https://m55-webv2.vercel.app/api/stripe/webhook`**

### Reasoning

- **`M55_SYSTEM_SSOT`** で本番コンテキストに **Vercel project `m55-webv2`** が繰り返し登場。**`m55-webv2.vercel.app` + `/api/stripe/webhook`** を **第一推奨**とする。
- **`m55-web.vercel.app`** は **過去証跡（Deployment domain）** と整合しうる。Stripe が叩く URL は **Production の canonical（カスタムドメイン／Vercel 既定ホスト）** とずれないか、**Phase 5-6H-5Z-D 実行前に** Vercel `m55-webv2` → Production → Domains で人手確認する。
- **`whsec` は URL と独立**。Signing secret は **endpoint 作成後**に Stripe で人手取得し（値は SSOT に書かない）、Vercel Production の **`STRIPE_WEBHOOK_SECRET`** と対応させる（§6）。

---

## 5. Event type subscription plan（repo read-only）

参照ソース：**`app/api/stripe/webhook/route.ts`**（本条コミット時点）。

### Handler がビジネスロジックに接続する主なイベント

| Stripe `event.type` | コード上の位置づけ |
|---------------------|--------------------|
| **`checkout.session.completed`** | **DTR core 一回払い**／subscription／追加返書レーン。**¥1,000 unblock に必須。** |
| **`charge.refunded`** | 一回払い **フル返金時の revoke**。**返金運用がある Production では購読推奨。** |
| **`invoice.paid`** | Premium invoice 由来の **`entitlement_rights`** 付与。**該当があるか人手で確認の上で購読要否。** |

広いイベント受信はコード上いったん **`stripe_events` に載るのみのパスに落ちうる。** **不要イベントの「全部購読」は避ける。**

### `payment_intent.succeeded`

この route に **`payment_intent.succeeded` 専用分岐はない**。**必須購読リストに含めない。**

### 方針

- **Stripe 側購読は必要最小限。**
- **当面の unblock 最小：** **`checkout.session.completed`**。
- **`charge.refunded` と `invoice.paid`** はコードが処理する。**Production 要件に応じ追加。** Premium を使わない強い確証があるなら **`invoice.paid` を省略する**選択もあり得る（その場合そのレーンはイベントが届いても効かない）。

---

## 6. Webhook secret / `whsec` handling plan

- Signing secret（**`whsec_` で始まる値**の形式）は **Stripe endpoint フローの後で人間のみ取得・保持**。**チャット／SSOT／スクショにフル値を載せない。**
- Vercel **project：`m55-webv2`** の env **`STRIPE_WEBHOOK_SECRET`** を **Production** にのみ設定する計画（**値は SSOT に書かない**）。
- Preview／Development は本論から切り離し本条ではしない。必要時は別 Gate。
- **`5Z-D`（Stripe で endpoint）** と **`5Z-E`（Vercel env）** は人手で連続になりうるが **SSOT では Gate を分離**する。

コード参照：**`process.env.STRIPE_WEBHOOK_SECRET`**（`route.ts`）。未定義時は **`503`** `Webhook not configured`。

---

## 7. Vercel redeploy plan

- **`STRIPE_WEBHOOK_SECRET` を変更すると**、現在の Production deployment が環境変数を読み直すため **通常は redeploy が必要**となる。
- **5Z-C** では **redeploy しない**。実行は **`Phase 5-6H-5Z-F`**（またはこれに準ずる別明示 GO）。
- **目安：** Production で secret を入れる → （要なら）redeploy。

---

## 8. Delivery test / replay plan

- **Replay／強制 redelivery：** **duplicate fulfillment／`stripe_events`／`one_time_fulfillments`** と **idempotency** の読取レビュー前には禁止。
- **5Z-C：** **replay と delivery test の両方とも禁止**。
- 初検証は **`Phase 5-6H-5Z-G`**（または後続）で、署名付テスト送信などを **`checkout.session.completed`** 対象として計画する。**応答コードとログは redacted**。**実カード再決済は別 Gate。**

---

### DB／entitlement 影響（計画のみ・本条では副作用なし）

- webhook が handler に達すると **`stripe_events`**、fulfillment／entitlements／rights／snapshot／wallet などへの書込がありうる。
- Replay／再送は **二重 grant／イベント重複**のリスク。**`event_id` early return と fulfillment の一意性**をコード read-only で踏まえ、**replay は別 Gate**。
- **手動 DB／entitlement／wallet：恒久禁止。**

---

## 9. Risk and stop conditions

次のとき **停止または差し戻し**：

- **`whsec`**／**`service_role`** 等の **full secret** を SSOT／チャットに載せねばならない状況。
- endpoint URL と Vercel Production canonical が **未整合のまま 5Z-D へ進むとき**。
- event 購読がコードと **未突合**のとき。
- **idempotency レビュー前に replay が提案される**とき。
- 手動 entitlement／wallet／DB 修正が論点になるとき。
- 返金 rollback が先要だと断定されるとき。
- duplicate charge／duplicate grant が疑われるとき。

---

## 10. Evidence Registry

| `evidence_id` | 内容 |
|---------------|------|
| **`M55-EVID-20260516-5Z-C-WEBHOOK-CONFIG-PLAN-001`** | 本条：**webhook configuration planning**。**kind：** **`webhook_config_plan`**。**External full IDs：** **未記録** |

**リンク既存：** **`M55-EVID-20260516-5Z-B-STRIPE-WEBHOOK-ENDPOINT-001`**、**`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`**、**`M55-EVID-20260516-5Y-A-M55-UI-001`**。

**後続で追加する予約（本条ではイベント・値は書かない）：**

| 予約 ID | 用途 |
|---------|------|
| **`M55-EVID-20260516-5Z-D-STRIPE-WEBHOOK-ENDPOINT-CREATED-001`** | Endpoint 作成。**公開 URL は可。`whsec` 値は不可。** |
| **`M55-EVID-20260516-5Z-E-VERCEL-WHSEC-ENV-001`** | Vercel Production **`STRIPE_WEBHOOK_SECRET` 設定**。値は書かない。 |
| **`M55-EVID-20260516-5Z-F-WEBHOOK-DELIVERY-001`** | Delivery 結果要約。**フルペイロード／event id は redacted**。Next で **redeploy Gate（計画上 `5Z-F`）と番号が重なるときは、`5Z-G` 側で結果を観測記録することもあり得る**（本条は名前の予約）。 |

---

## 11. 判定

**`READY_FOR_STRIPE_PRODUCTION_WEBHOOK_ENDPOINT_HUMAN_CONFIGURATION_GATE`**

**Stripe の endpoint Dashboard 作成（Phase 5-6H-5Z-D）**は、本条コミット後かつ **`5Z-D`** の **明示 GO** が付いた場合のみ実施する。

---

## 12. 未実行事項

- Stripe webhook endpoint 作成／送信先追加
- webhook replay／delivery test
- **`STRIPE_WEBHOOK_SECRET`／`whsec`／env／secret の変更・追加**
- Stripe／Supabase／Vercel 設定変更、redeploy、code／runtime／UI 変更
- Production DB read／write、手動 entitlement／wallet、再決済／Checkout 再試行、返金 rollback、**`/api/stripe/*`** 直接
- full Session／PI／Customer／email／client_reference_id／user_id／Event／Request／Price **`whsec`／service_role の記録

---

## 13. Next

| Gate | 内容 |
|------|------|
| **`Phase 5-6H-5Z-D`** | Stripe：**人手のみ** endpoint **作成**。replay／DB／再決済なし。 |
| **`Phase 5-6H-5Z-E`** | Vercel **`m55-webv2`**：**`STRIPE_WEBHOOK_SECRET` を Production に**（値は書かない）。 |
| **`Phase 5-6H-5Z-F`** | **redeploy の要否判断と実行**（本条ではしない）。 |
| **`Phase 5-6H-5Z-G`** | idempotency 後の **delivery test／replay をどう扱うか**の planning／実行 GO。 |

---

## Work anchor

- **`638e22f608003f6dc43fb75c747e633541f9d1d9`** — `5Z-B`。
- **`893d540a4b0da10503ebac4552cc122b85f91d5e`** — Evidence Registry（`5Z-A0`）。

**Prior：** `docs/ssot/M55_PHASE5_6H_5Z_B_STRIPE_WEBHOOK_ENDPOINT_NOT_OBSERVED_FINDING_2026-05-16.md`、`docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md`。
