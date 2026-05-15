# M55_MONETIZATION_IMPLEMENTATION_PLAN_WEB_v1 (2026-03-06 JST)
Status: SSOT (Implementation Plan)
Scope: Web版（Next.js + Supabase + Clerk + Stripe）での収益化を、既存の審査・安全制約に適合させて実装するための手順書。

## 0. Canonical Inputs（参照SSOT）
- Monetization model（Free/Standard/Premium + DTR + Chat Boost）: `docs/audit/sources/ingest_2026-03-06/01_BIZ_Monetization_Logic_v1.0.txt`
- Purchase/rights 正規化（productId→権利キー、期限権利の静かな扱い、contextKey）: `M55_DATA_LOGIC_BRIDGE_SSOT.md`
- Tarotのログ形状・回数制限の従属（Monetization SSOTに従う）: `M55_TAROT_LOGIC_SSOT.md`
- Post-Review UI Switch（Phase 0/1/2）: `docs/ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md`
- UI核の接続面（AI観測メーター / DTR棚）: `m55_ai_meter_detail.html` / `M55_HOME_ULTIMATE_FINAL_SSOT_MERGED.html`

## 1. 非交渉（最上位の不変条件）
1) 最優先は「課金・返金・サポート・法務の整合性」と「誤認リスク（禁止語彙・占い扱い等）」を上げないこと。
2) 審査関連の公開ページ群（`/`, `/dtr/lp`, `/support`, `/legal/*`）は、審査通過まで本文・価格・導線を不変とする。
3) 購入状態SSOTは DB / PurchaseCache のみ（増殖禁止）。クライアント側の推測・派生状態は禁止。
4) Tap-only（URLクエリでの文脈注入禁止）。Fail-Closed（欠損・不整合・改ざん疑いは推測しない）。
5) 禁止語彙（例：占い/鑑定/運勢/予言/開運/霊感/当たる 等）は「公開HTML」からは0。内部SSOT/ログに残すのは可だが、表示・販売コピーへは出さない。

## 2. 収益モデルを Web に写経する（構造の固定）
### 2.1 正規収益構造（Web適合）
(1) Subscription（Standard / Premium）
- Stripeのサブスクで表現する（WebなのでIAPではなくStripe）。
- 目的は「保存価値（30日/90日）」と「回数制限（1/5/実質無制限）」を"権利"として提供すること。
- Premiumは「月次DTR付与」を自動付与（サブスク更新イベントで付与）。

(2) DTR（単発購入）
- Core / Synastry / Weekly / Daily を、正規 productId と rightsKey に正規化して付与する（Bridge SSOTに従う）。
- 期限権利は expiresAt を必須にし、期限切れは"静かに眠る"。

(3) Chat Boost（任意・補助）
- これは「回数追加」または「一時的な深掘り枠」。
- 公開導線に煽りとして露出させない。必要ならFeature Flag。

(4) 広告
- 01_BIZでは"主軸にしない"と定義されているが、現行M55運用では導入しない（別SSOTで明示的に解禁されるまで禁止）。

## 3. DTRの Canonical Product IDs / Rights Keys（Webでも不変）
### 3.1 Canonical Product IDs（固定）
- dtr_core_origin（永久）
- dtr_synastry_{partnerHash}（永久）
- dtr_weekly_tide（期限：meta.weekKey + meta.expiresAt 必須）
- dtr_daily_spot（期限：meta.dateKey + meta.expiresAt 必須）

### 3.2 Rights Storage Keys（論理キー：固定）
- m55_p:core_origin -> true
- m55_p:syn_index -> ["partnerHash", ...]
- m55_p:syn:<partnerHash> -> true
- m55_p:week:<weekKey> -> expiresAt(ms)
- m55_p:day:<dateKey> -> expiresAt(ms)

## 4. Web実装のデータモデル（DBをSSOTにする）
推奨テーブル（Supabase）：
A) products
- canonical_product_id (pk) 例: dtr_core_origin / sub_standard / sub_premium / chat_boost_pack1
- product_type: "dtr" | "subscription" | "boost"
- active: bool
- display_name_safe: 公開用の安全な名称（禁止語彙0）
- stripe_price_id: Stripe price id（値は環境変数/DB、SSOTには書かない）

B) purchases
- id (pk)
- user_id (clerk user id / internal user id)
- canonical_product_id
- purchased_at
- expires_at (nullable)
- stripe_event_id (idempotency用)
- meta_json

C) subscriptions
- user_id (pk)
- tier: free | standard | premium
- status: active | past_due | canceled | ...
- current_period_end
- stripe_customer_id
- stripe_subscription_id

D) entitlements（SSOTの"権利表"）
- user_id
- right_key（例：m55_p:core_origin / m55_p:week:2026-W10 / m55_sub:tier）
- right_value（true / expiresAt / json）
- expires_at（nullable）
- source（purchase_id / subscription_id）
- updated_at

原則：UIは entitlements を参照し、PurchaseCache は"キャッシュ"に徹する。

## 5. Stripe連携フロー（Fail-Closed + Idempotent）
### 5.1 Checkout
- DTR単発: Stripe Checkout（payment）
- サブスク: Stripe Checkout（subscription）
- 返金/解約導線は `/legal/refund` と `/support` を常設（公開HTML側）

### 5.2 Webhook（唯一の真実化）
- 受信イベント例：
  - checkout.session.completed（単発/サブスク初回）
  - invoice.payment_succeeded（更新）
  - customer.subscription.updated / deleted
- 署名検証は必須。未検証は全て破棄（Fail-Closed）。
- stripe_event_id で二重処理を抑止。
- DB(entitlements/subscriptions/purchases) を更新し、そこから UI が反映。

## 6. UIの接続面（ai_meter を"接続ページ"として吸収）
### 6.1 Meter Detail（7/30/90日の"観測"を核にする）
- `m55_ai_meter_detail.html` の構造を、Web UIの接続面として採用。
- 表示は「記録の頻度」「期間スケール」「DTR棚」の3点に限定し、購入煽りはしない。
- DTR棚（週次/30日/90日など）は、権利に応じて "静かに表示/静かにロック" を切り替える。

### 6.2 Home（AI観測を核として上部タブを同化）
- HomeのSSOT HTMLにある「AI観測メーター」を核にする。
- 背景NoTouch、Reduce Motion尊重、通知っぽさ禁止を守る（UI側の演出は最小）。

## 7. 禁止語彙対策（公開テキストの自動ガード）
- 公開ページ（`/`, `/dtr/lp`, `/support`, `/legal/*`）は forbidden=0 を CI で常時チェック。
- /app /prototype 側も"公開される文字列"は同様にスキャン対象にする（Phase 1の事故防止）。

言い換え辞書（例）
- 「運勢」→「行動トレンド」
- 「吉凶」→「リスク/リターン係数」
- 断定/予言/保証は全面禁止

## 8. AIによる収益最適化（ただし事故らない形）
目的：ユーザーの興味・課題に合わせて DTR を"推薦"するが、販売内容や表現を誤認方向へ寄せない。
実装原則：
- DBに「canonical_product_id（不変）」と「display_name_safe（公開用）」を分離。
- LLMは"提案文"のみ生成し、禁止語彙フィルタ（forbidden=0）を通らない限り採用しない。
- 自動ABは最初からやらない。Phase 2以降、Feature Flag + 手動承認を挟む。

## 9. ロードマップ（Post-Review UI Switchに従属）
- Phase 0: ストアフロント維持（公開ページ不変）
- Phase 1: UI隔離（`/app` または `/prototype`） + ai_meter を接続面に統合
- Phase 2: トップ差し替えする場合のみ、固定ブロック（価格/提供/返金/サポート）を残し、禁止語彙0を満たした上で段階導入（必ずFeature Flag）

(END)
