# Phase 5‑6H‑5Z — Post-payment fulfillment / entitlement / report unlock diagnostic planning gate (2026‑05‑16 SSOT)

## 1. Phase名

**Phase 5‑6H‑5Z — Post-payment fulfillment / entitlement / report unlock diagnostic planning gate**

---

## 2. 現在地

- **`5U‑L‑A`：** Checkout 作成／**`checkout.stripe.com`** 到達 **GREEN**
- **`5X‑B`：** batch live payment planning **GREEN**
- **`5Y‑A`：** **`DTR_BASE_LIVE_PAYMENT_PAID_CONNECTION_BLOCKED_EVIDENCE_RECORDED`**（evidence commit **`b8b4849b4ee206bcb1eb9e226d26888bbb070373`**）
- **Product：** **M55 デジタル鑑定レポート (Standard)**
- **Amount：** **¥1,000 JPY**
- **Payment attempt count：** **1**
- **Stripe／Vercel（redacted 要約）：** **`status`** **`complete`**／**`payment_status`** **`paid`**／**`mode`** **`payment`**／product **`DTR_CORE_STATIC_V1`**／**`amount_total`** **`1000`**／**`currency`** **`jpy`**／**`verifyStripeCheckoutSessionForDtr`** **`valid`** **`true`**
- **`/dtr/processing`**：** **200**
- **`/api/dtr/draft/claim`**：** **200**
- **`/api/dtr/draft/me`**：** **200**
- **Post-payment UI：** **`接続を確認できませんでした`**
- **webhook fulfillment：** **未証明**
- **entitlement／DB grant：** **未証明**
- **paid report unlock：** **未証明**
- **付帯 reply-ticket grant：** **未証明**
- **report snapshot／access state：** **未証明**
- **refund／rollback：** **未実行**

---

## 3. この Gate の目的

- **¥1,000 DTR 本体決済後に残っている post-payment fulfillment／entitlement／report unlock の問題について、次フェーズ以降で実施する read-only 診断の範囲・順序・停止条件を SSOT に固定する。**
- **本条（5Z）は docs-only。** **実診断・Production DB 読み取り・Stripe webhook ダッシュボード確認・webhook replay・コード／env／返金／DB 変更は行わない。** **（本条コミットのスコープ外。）**

---

## 4. 診断仮説（検証すべき論点）

- **`checkout.session.completed` webhook が届いていない**
- **webhook は届いたが signature／`whsec`／endpoint mismatch で fulfillment されていない**
- **webhook は成功したが DTR fulfillment 処理内で一部失敗した**
- **`one_time_fulfillments`／`entitlements`／`entitlement_rights`／`reply_ticket_wallets`／`reply_wallet_ledgers`／`dtr_report_snapshots` のいずれかが未作成または不整合**
- **`/dtr/processing` は Stripe session 検証には成功したが、ownership／report unlock 判定に失敗している**
- **user id／`client_reference_id`／auth session／draft claim／report snapshot の紐付けに不整合がある**
- **paid report ルートが DB 権限ではなく別の purchase cache／state を見ている**
- **付帯 reply-ticket grant が未付与、または wallet／ledger のみ不整合**
- **PostgREST schema cache／migration／RLS／function 権限の問題が残っている**

---

## 5. 次フェーズ以降の read-only 診断計画

### A. Stripe Dashboard payment evidence read-only checkpoint

- **paid／complete の redacted 確認**
- **フル Session／PI／customer／email は記録しない**

### B. Stripe webhook delivery read-only checkpoint

- **`checkout.session.completed` の delivery 有無**
- **endpoint URL**
- **delivery status**
- **response code／error summary**
- **`STRIPE_WEBHOOK_SECRET` は変更しない**
- **replay しない**

### C. Vercel runtime log read-only checkpoint

- **webhook route ログ**
- **fulfillment 関数ログ**
- **`/dtr/processing` ログ**
- **`/api/dtr/draft/claim`／`/api/dtr/draft/me` ログ**
- **ログ内のフル ID は redact**

### D. Supabase Production DB read-only planning（実行は 5Z 以後・別明示 GO）

- **read-only のみ**
- **候補テーブル例：** **`stripe_events`**、**`one_time_fulfillments`**、**`failed_fulfillments`**、**`entitlements`**、**`entitlement_rights`**、**`reply_ticket_wallets`**、**`reply_wallet_ledgers`**、**`dtr_report_snapshots`**、**`dtr_guest_drafts`**
- **取得キーは redacted ID または人間が画面上で確認した範囲に限定**
- **`service_role` 全文などは扱わない**
- **DB 書き込み禁止**

### E. App ownership／report unlock コードパス確認（repo 内 read-only）

- **DTR ownership gate が何を根拠にしているか**
- **paid report unlock 条件**
- **included reply-ticket grant 条件**
- **draft claim 後の report snapshot 参照条件**
- **PurchaseCache と DB ownership の関係**

### F. Refund／rollback の意思決定 planning

- **返金するかは診断後に決める**
- **返金実行は別 Gate**
- **DB rollback は別 Gate**
- **手動 DB 修正は最後の手段で、別明示 GO まで禁止**

---

## 5.1 repo 内 read-only で参照してよい候補（5Z でコード変更は禁止）

- `app/api/stripe/webhook/route.ts`
- `lib/m55/dtrCoreCheckoutFulfillment.ts`
- **`/dtr/processing`** 関連の **page／route**
- **`/api/dtr/draft/claim`** 関連 **route**
- **`/api/dtr/draft/me`** 関連 **route**
- **DTR ownership／entitlement gate 関連コード**
- **PurchaseCache／DB ownership／report snapshot 参照箇所**
- **migrations／schema／SSOT docs**
- **上記は「調査計画」の参照リストであり、本条コミットで編集しない。**

---

## 6. 停止条件

次のいずれかが必要になった場合は **即停止**し、**別 Gate** を作成する。

- **フル ID／secret が SSOT に残るしかない**
- **DB 書き込みが必要**
- **webhook replay が必要**
- **返金判断の実行まで踏み込む必要がある**
- **entitlement／wallet の手動付与が必要**
- **schema／コード修正が必要**

---

## 7. Redaction

- **フル Checkout Session ID：** **記録しない**
- **フル Payment Intent ID：** **記録しない**
- **フル customer ID：** **記録しない**
- **email：** **記録しない**
- **client_reference_id：** **記録しない**
- **user id：** **記録しない**
- **フル Price ID：** **記録しない**
- **フル `STRIPE_SECRET_KEY`／`whsec`／`service_role`：** **記録しない**
- **スクリーンショット：** **全面 redact しない限りコミットしない**

---

## 8. 5Z での判定

**`READY_FOR_POST_PAYMENT_FULFILLMENT_READ_ONLY_DIAGNOSTIC_EXECUTION_GATE`**

---

## 9. 未実行事項（本条／5Z スコープで実施しない）

- No second payment attempt
- No checkout retry
- No Stripe webhook changes
- No webhook replay
- No **`STRIPE_WEBHOOK_SECRET`** change
- No env／`whsec`／secret changes
- No Stripe setting changes
- No Supabase changes（**設定・schema 変更など**）
- No Vercel setting changes
- No additional redeploy
- No runtime／code／UI changes
- **Production DB read：** **本条（5Z）では実施しない**（診断の実施本体は **`5Z-A`** で別 GO）。
- No Production DB writes
- No manual DB mutation
- No entitlement／wallet／ticket の手動付与
- No refund／rollback
- No **`/api/stripe/*`** direct execution
- No **`POST`／`PUT`／`PATCH`／`DELETE`** の手動実行
- No full IDs recorded

---

## 10. Next

- **`Phase 5‑6H‑5Z‑A` — Post-payment fulfillment read-only diagnostic execution**
- **`5Z-A`：** **redacted read-only チェックのみ実行。** **DB 書き込み／webhook replay／返金／runtime・env／コード変更は禁止（別 GO）。**

---

## Work anchor / lineage

- **`b8b4849b4ee206bcb1eb9e226d26888bbb070373`** — `docs: record dtr base live payment paid connection blocked checkpoint`（**`5Y‑A`**）

Prior SSOT:

- `docs/ssot/M55_PHASE5_6H_5Y_A_DTR_BASE_LIVE_PAYMENT_PAID_CONNECTION_BLOCKED_CHECKPOINT_2026-05-16.md` — **`DTR_BASE_LIVE_PAYMENT_PAID_CONNECTION_BLOCKED_EVIDENCE_RECORDED`**
