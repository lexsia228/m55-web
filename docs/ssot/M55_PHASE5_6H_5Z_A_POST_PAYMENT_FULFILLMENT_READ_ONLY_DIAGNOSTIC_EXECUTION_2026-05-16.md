# Phase 5‑6H‑5Z‑A — Post-payment fulfillment read-only diagnostic execution (2026‑05‑16 SSOT)

## 1. Phase名

**Phase 5‑6H‑5Z‑A — Post-payment fulfillment read-only diagnostic execution**

---

## 2. 現在地

- **`5Y‑A`：** **`DTR_BASE_LIVE_PAYMENT_PAID_CONNECTION_BLOCKED_EVIDENCE_RECORDED`**（**payment は paid／complete 相当の redacted ログ・人手観測あり**）
- **`5Z`：** diagnostic planning **`READY_FOR_POST_PAYMENT_FULFILLMENT_READ_ONLY_DIAGNOSTIC_EXECUTION_GATE`**
- **`5Z‑A0`：** **`EVIDENCE_REGISTRY_PROTOCOL_GREEN`**（evidence commit **`893d540a4b0da10503ebac4552cc122b85f91d5e`**）
- **Product：** **M55 デジタル鑑定レポート (Standard)**／**DTR_CORE_STATIC_V1**
- **Amount：** **¥1,000 JPY**
- **Post-payment UI（5Y-A）：** **`接続を確認できませんでした`**
- **webhook fulfillment／entitlement／DB／report unlock：** **本条以前は未証明**
- **本条：** **read-only。** **Stripe／Vercel／Supabase の **live** コンソールは **本 Cursor セッションからは操作・閲覧不能**。** **Production DB は **本条コミットでは SELECT を実行しない**。** **コードは repo read-only で確認。**

---

## 3. Evidence Registry references

- **`M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001`**
- **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`**
- **`M55-EVID-20260516-5Y-A-STRIPE-LOG-001`**
- **`M55-EVID-20260516-5Y-A-VERCEL-PROCESSING-001`**
- **`M55-EVID-20260516-5Y-A-M55-UI-001`**

（**証跡の接続：** 上記 5 ID のみ。§10 のコード経路整理は repo ソース read-only と本条本文にとどめる。）

---

## 4. A. Stripe Dashboard payment（read-only）— **本セッション**

| 項目 | 結果 |
|------|------|
| paid／complete／succeeded **再確認（Dashboard での新規目視）** | **`unclear`**（**人手の Dashboard を本 agent は開けない**） |
| product／amount **`DTR_CORE_STATIC_V1`／¥1,000 と整合**（**5Y‑A に基づく間接評価**） | **`yes`**（**既証跡のみ**。**Dashboard による未独立検証**） |
| refund 状態 | **`unclear`** |
| **フル Session／PI／customer／email** | **記録なし（本条も変更なし）** |

---

## 5. B. Stripe Workbench Events（read-only）— **本セッション**

| 項目 | 結果 |
|------|------|
| **`checkout.session.completed` のイベント行の実在を Events UI で確認** | **`unclear`**（**イベントコンソール未アクセス**） |
| **`payment_*`／`charge.*` 系の関連イベント** | **`unclear`** |
| イベント時刻（**約 2026-05-16 22:49 JST**） | **`unclear`**（**5Y-A seed メモのみ。本条で再確認せず**） |
| **フル event／session／PI／customer／email ID** | **記録なし** |

---

## 6. C. Stripe webhook delivery（read-only）— **本セッション**

| 項目 | 結果 |
|------|------|
| Production endpoint への **`checkout.session.completed` delivery** | **`unclear`** |
| endpoint URL／domain | **`unclear`**（redacted での domain 固定も本条では未確認） |
| delivery status／response code／error／retry | **`unclear`** |
| replay 実行 | **`no`**（**禁止・未実施**） |
| webhook secret 変更 | **`no`** |
| **フル event／session／customer／email** | **記録なし** |

---

## 7. D. Stripe Workbench Logs（read-only）— **本セッション**

| 項目 | 結果 |
|------|------|
| checkout／payment 系 API の該当リクエスト行 | **`unclear`** |
| API key mode（live）／HTTP 状態 | **`unclear`** |
| **フル request ID** | **記録なし** |

---

## 8. E. Vercel runtime logs（read-only）— **本セッション**

| 項目 | 結果 |
|------|------|
| **新規のログ tail を本セッションで実施したか** | **`no`** |
| **`/dtr/processing`／verify／draft API の結果**（**5Y-A／Registry 再掲**） | **200、`verifyStripeCheckoutSessionForDtr`：** **`valid`** **`true`。** **`/api/dtr/draft/claim`：** **200。** **`/api/dtr/draft/me`：** **200（間接証跡のみ）** |
| **`POST /api/stripe/webhook` の同年月日近傍ログ／fulfillment の有無** | **`unclear`**（**本条でログ未取得**） |

---

## 9. F. Supabase Production DB（SELECT のみ許可済みだが本条では）— **本セッション**

**実施：** **なし。** **書き込みもなし。**

以下は **本条では `unclear`**（人手または **`5Z-B`** で redacted／時間窓のみの SELECT を別 GO）：

| 観点 | 結果 |
|------|------|
| **stripe_events** | **`unclear`** |
| **one_time_fulfillments** | **`unclear`** |
| **failed_fulfillments** | **`unclear`** |
| **entitlements（DTR／active）** | **`unclear`** |
| **entitlement_rights** | **`unclear`** |
| **reply_ticket_wallets／reply_wallet_ledgers**（付帯 grant） | **`unclear`** |
| **dtr_report_snapshots** | **`unclear`** |
| **dtr_guest_drafts 紐付け** | **`unclear`** |
| **DB writes** | **`none`**（本条） |

---

## 10. G. Code path（repo read-only）— **実施済み**

- **Stripe webhook：** `app/api/stripe/webhook/route.ts`
  - **`checkout.session.completed`** → **`handleCheckoutCompleted`**。
  - **`client_reference_id` 欠落** → **`failed_fulfillments`** 記録想定・HTTP **200**。
  - **DTR one-time：** **`fulfillDtrCoreFromCheckoutSessionId`**。**失敗時** **`failed_fulfillments`** と **500／200** が理由別。**`stripe_events`** は処理フロー上 **insert**。
  - **Dedupe：** **`stripe_events` に同一 `event_id` があると early return で fulfillment を再実行しない**設計がある。

- **Fulfillment：** `lib/m55/dtrCoreCheckoutFulfillment.ts`
  - **`one_time_fulfillments`／`entitlements`／`entitlement_rights`（products DTR_CORE_STATIC_V1 時）** を upsert。
  - **`grantInitialIncludedReplyIfNeeded`、`upsertDtrReportSnapshotAtFulfillment`。** **`dtr_report_snapshots` がスキップされても関数全体は **`ok: true`** を返りうる（ログのみ）— **その場合でも後段 UI は「準備中」側に寄りうる**。
  - **本条のユーザ観測タイトル「接続を確認できませんでした」との整合：** **`app/dtr/processing/page.tsx` では、`ProcessingFallback` の **`<h1>接続を確認できませんでした</h1>`** が **(1)** **`getSupabaseAdmin()` が throw**、**(2)** **`fulfillDtrCoreFromCheckoutSessionId` が `reason === 'db_error'` の失敗のいずれかで表示**。** **`getDtrReportSnapshot` が null で「準備しています」となる分岐では同一タイトルにはならない。**
  - **結論（コードのみ）：** **5Y‑A の「verify valid true」でも、**`/dtr/processing`** では **サーバ側 DB 初期化失敗または fulfillment の **`db_error`** が **同一エラー見出し**を生む枠がある。** **端到端では webhook／DB の実測との突合までは本条では未実施。**

- **Ownership／unlock：** `lib/m55/dtrOwnershipGate.ts`
  - **`dtr_report_snapshots` 優先**、続け **`entitlement_rights`**＋ **`entitlements`／`one_time_fulfillments`** の決済バッキング。
  - **エラー時 fail-closed `locked`。**

- **Draft claim：** `app/api/dtr/draft/claim/route.ts` — **ゲスト草案の user リンク（POST）。** **200 は 5Y-A。**

### **コード変更**

- **`no`**（本条コミットは docs のみ）。

---

## 11. Cause classification（列挙からの選抜）

**外部 A–F 未検証のため、エンドツーエンドの確定単一原因は選択不能。**

選択：**`INCONCLUSIVE`**

コードに基づく **追加の注目候補（確定ではない）：**

- **`POST_PAYMENT_RETURN_PROCESSING_MISMATCH`**（**session 検証成功後、`/dtr/processing` 内での Supabase クライアント取得または fulfillment が DB で失敗**— **§10**）
- **`WEBHOOK_NOT_DELIVERED`**／**`WEBHOOK_DELIVERED_BUT_HANDLER_FAILED`**／**`FULFILLMENT_DB_WRITE_FAILED`** 等：** **`unclear`**（**ログ・Dashboard・DB が未取得**）

---

## 12. 判定

**`POST_PAYMENT_FULFILLMENT_READ_ONLY_DIAGNOSTIC_INCONCLUSIVE`**

（**コードパスによる失敗面の示唆あり。Stripe→Webhook→DB の実測鎖は本条では緑／赤に判定できず。**）

---

## 13. 未実行事項

- No second payment attempt
- No checkout retry
- No Stripe webhook changes
- No webhook replay
- No **`STRIPE_WEBHOOK_SECRET`** change
- No env／`whsec`／secret changes
- No Stripe setting changes
- No Supabase **schema／policy**変更
- No Vercel setting changes／追加 redeploy
- No runtime／code／UI changes
- **No Production DB read（本条コミット）／No DB writes**
- No manual entitlement／wallet／ticket grant
- No refund／rollback
- No **`/api/stripe/*`** direct execution
- No **`POST`／`PUT`／`PATCH`／`DELETE`** 手動
- No full IDs／email／secret recorded

---

## 14. Next（**Phase 5-6H-5Z-B**）

**原因が完全に未定のため：** **`Phase 5-6H-5Z-B` — deeper read-only diagnostic planning（または実行 GO 付きチェックリスト）**

**5Z-B で最低限並べる候補：**

- Stripe Dashboard で **`M55-EVID-20260516-5Y-A-STRIPE-PAYMENT-001`** の **再 corroborate**
- Stripe Events で **`M55-EVID-20260516-5Y-A-STRIPE-EVENT-001`**
- **Webhook delivery 画面**での delivery **yes/no**（endpoint は **domain レベルの redacted のみ SSOT に**）
- Vercel **`/api/stripe/webhook` 同年月日ログ** と **`fulfill`** ログの **presence**
- Supabase：**時間窓／product のみで redacted の SELECT planning**（**full UUID を SSOT に書かない**）

（webhook が未到達 vs handler が失敗 vs DB と、§10 で分岐ヒントがあるため **5Z-B の観測セットを順序固定する**。）

---

## Work anchor / lineage

- **`893d540a4b0da10503ebac4552cc122b85f91d5e`** — `docs: add ai safe evidence registry protocol`（**`5Z‑A0`**）
- **`73d43824ccb156997caceade0fb778b1dbf37ba8`** — `docs: plan post payment fulfillment diagnostic`（**`5Z`**）

Prior SSOT：

- **`docs/ssot/M55_PHASE5_6H_5Z_POST_PAYMENT_FULFILLMENT_ENTITLEMENT_REPORT_UNLOCK_DIAGNOSTIC_PLANNING_2026-05-16.md`**
- **`docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md`**
