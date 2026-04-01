# M55 Phase 1 Monetization Implementation (2026-03-06)

Post-Review Phase 1（隔離UI）で収益化を開始。ストアフロントは変更しない。

## 変更したファイル一覧

| 種別 | パス |
|------|------|
| 新規 | `supabase/migrations/20260306000000_phase1_entitlements_ssot.sql` |
| 変更 | `app/api/stripe/webhook/route.ts` |
| 新規 | `app/api/me/entitlements/route.ts` |
| 新規 | `app/prototype/hub/page.tsx` |
| 変更 | `app/prototype/page.tsx` |

**未変更（監査ガード）**: `/`, `/dtr/lp`, `/support`, `/legal/*`

## DB 追加 SQL

`supabase/migrations/20260306000000_phase1_entitlements_ssot.sql` を Supabase で実行する。
または Supabase Dashboard の SQL Editor で以下を実行：

```sql
-- stripe_events 拡張
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS processed_at timestamptz DEFAULT now();
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS type text;

-- purchases
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  canonical_product_id text NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  stripe_event_id text,
  meta_json jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id text PRIMARY KEY,
  tier text NOT NULL CHECK (tier IN ('free','standard','premium')),
  status text NOT NULL,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz DEFAULT now()
);

-- entitlement_rights
CREATE TABLE IF NOT EXISTS entitlement_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  right_key text NOT NULL,
  right_value text NOT NULL,
  expires_at timestamptz,
  source text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, right_key)
);
CREATE INDEX IF NOT EXISTS idx_entitlement_rights_user ON entitlement_rights(user_id);
```

## API 仕様

### GET /api/me/entitlements

- **認証**: Clerk 必須。未認証は 401。
- **レスポンス**（Silent Free: エラー時は tier=free, 最小 limit で返す）:
```json
{
  "tier": "free" | "standard" | "premium",
  "retention_days": 0 | 30 | 90,
  "chat_daily_limit": 1 | 5 | -1,
  "tarot_daily_limit": 1 | 5 | -1,
  "dtr_rights": ["m55_p:core_origin", "m55_p:week:2026-W10", ...]
}
```

## 安全ガード

- webhook/ログ/例外に秘密値を出さない（署名検証失敗時はログ出力なし）
- env 追加後は必ず redeploy（既ビルド成果物に env は反映されない）

## 最小動作確認手順（PowerShell、1行ずつ）

```powershell
$base = "http://localhost:3000"
```

```powershell
Invoke-RestMethod -Uri "$base/api/__probe" -Method GET
```

```powershell
curl.exe -sS -o NUL -w "%{http_code}" "$base/"
```

```powershell
curl.exe -sS -o NUL -w "%{http_code}" "$base/prototype"
```

```powershell
curl.exe -sS -o NUL -w "%{http_code}" -H "x-m55-proto: YOUR_TOKEN" "$base/prototype"
```

```powershell
curl.exe -sS -o NUL -w "%{http_code}" "$base/api/me/entitlements"
```

（認証必須のため 401 が期待値。Clerk セッションありで 200 + JSON）

DB 適用後、Stripe の Webhook を `https://your-domain/api/stripe/webhook` に設定し、`STRIPE_WEBHOOK_SECRET` を env に追加して redeploy すること。
