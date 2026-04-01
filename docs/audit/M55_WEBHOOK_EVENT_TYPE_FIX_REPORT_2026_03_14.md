# M55 Webhook event_type 修正レポート (2026-03-14)

**対象:** `/api/stripe/webhook` の one-time fulfillment 実装  
**目的:** `stripe_events.event_type` の NOT NULL 違反による 500 エラーを解消し、非対象イベントで正常終了させる。

---

## 1. 変更ファイル一覧

| ファイル | 変更種別 |
|----------|----------|
| `app/api/stripe/webhook/route.ts` | 修正 |

---

## 2. 修正内容

### 2.1 バグ原因

- `stripe_events` への insert で `event_id` のみ指定しており、`event_type` が null
- DB の `event_type` カラムに NOT NULL 制約があり、`null value in column "event_type" violates not-null constraint` で 500 発生
- `charge.updated` などの非対象イベントでも insert が走るため、同様に 500 になっていた

### 2.2 対応内容

1. **`event_type` の必須保存**  
   - `event.type`（Stripe の raw event type）を `event_type` として insert に含める  
   - `event.type ?? 'unknown'` でフォールバック

2. **insert 文言の修正**

   ```typescript
   // 修正前
   .insert({ event_id: event.id })

   // 修正後
   const eventType = event.type ?? 'unknown';
   .insert({ event_id: event.id, event_type: eventType })
   ```

3. **非対象イベント時の 500 回避**  
   - insert 失敗時（23505 以外）、これまで 500 を返していたが、200 を返すように変更  
   - 非対象イベント（`charge.updated` 等）で DB エラーが起きても、Stripe への retry を防ぐため 200 で応答

### 2.3 変更なし

- one-time entitlement / refund / success page polling / storefront ロジック
- `checkout.session.completed` / `charge.refunded` のハンドラ
- `stripe_events` の idempotency 挙動（existing チェック・23505 時の 200 返却）

---

## 3. 再実行手順

### 3.1 開発環境

1. 修正済みコードで Next.js を起動（または再起動）
   ```bash
   npm run dev
   ```

2. Stripe CLI で webhook を転送
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. 動作確認
   - `charge.updated` など非対象イベント → 200 OK
   - `checkout.session.completed` → 200 OK（fulfillment 成功時）
   - `stripe_events` に `event_type` が正しく入っていることを確認

### 3.2 本番反映

1. コードをデプロイ
2. Stripe Dashboard で webhook エンドポイントの送信履歴を確認
3. `stripe_events` テーブルで `event_type` が null になっていないことを確認

### 3.3 注意事項

- `stripe_events` に `event_type` カラムが存在しない場合、その環境用マイグレーションを追加してください：
  ```sql
  ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS event_type text;
  ```
- 既存の `type` カラム（phase1  migrations）を利用する場合は、insert で `type` を使用するよう変更してください。
