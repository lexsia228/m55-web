# Stripe Dashboard Submission Checklist (Minimal PII) v1
Freeze date: 2026-02-26 (JST)

目的: Web公開→Stripe Live申請までを、個人情報露出を最小化しつつ、審査落ちポイントを潰す。

## 1. 公開ページの到達確認（ログイン不要）
- /legal/tokushoho が表示できる
- /legal/privacy が表示できる
- /legal/terms が表示できる
- /support が表示できる
- 共通フッターから全ページで到達できる（最低: Home / DTR LP / Purchase Success）

## 2. 記載の必須項目（特商法）
- 販売価格: 購入画面に表示（税表示はStripeに準拠）
- 支払方法: Stripe経由のクレジットカード決済
- 引渡時期: 決済完了後、即時提供（デジタルコンテンツ）
- 返品・キャンセル:
  - 「デジタルコンテンツの性質上、購入確定後のキャンセルおよび返金には原則として応じられません。」
  - （任意）「法令上必要な場合を除きます。」
- 住所/電話:
  - 住所: 可能なら都道府県＋市区町村まで、詳細は必要最小に（SSOT: 最小化）
  - 電話: 「請求があれば遅滞なく提供します」で運用可（国内慣行に沿う）

## 3. Stripe Live設定（入力順）
1) Business details（事業情報）
2) Representative / Owner（本人確認）
3) Bank account（入金口座）
4) Public website（公開URL）
   - 主要URL: トップ（/）
   - 特商法URL: /legal/tokushoho
   - サポートURL: /support

## 4. 技術の必須確認（Live前）
- Webhook endpoint（Live）を作成し、署名シークレット（whsec_...）をVercelへ設定
- STRIPE_SECRET_KEY を sk_live_... に差し替え
- Price ID（Liveの price_...）を環境変数に差し替え
- E2E（Live相当）は「Test modeで完走」してから切替（最短でも一度は確認）

## 5. 審査官視点での落ち筋（回避）
- 問い合わせ先が無い / 到達できない → 落ちる
- 商品内容が曖昧（何が提供されるか不明） → 落ちる
- 返金不可が明記されていない（デジタル販売） → チャージバックで揉めやすい
- 特商法ページがログイン必須 / 404 / 非公開 → 落ちる
