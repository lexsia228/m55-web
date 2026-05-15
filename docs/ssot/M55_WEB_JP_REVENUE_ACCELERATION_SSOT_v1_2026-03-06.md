# M55_WEB_JP_REVENUE_ACCELERATION_SSOT_v1 (2026-03-06 JST)
目的：Web版M55で「初月から最大収益」を狙う。ただし最優先は (1) 課金/返金/サポート/法務の整合性、(2) 誤認リスク（占い扱い等）を上げないこと。
適用範囲：Phase 1（隔離UIのみ）。ストアフロント（/ , /dtr/lp , /support , /legal/*）は凍結のまま。

## 1) 非交渉（SSOT不変条件）
- 公開ページ凍結：/ , /dtr/lp , /support , /legal/* は「本文/価格/導線」を変更しない（解除は明示チェックポイントのみ）。
- Gate分離（Fail-Closedの意味を混線させない）：
  - Prototype "入場" gate：token/headers不一致・未設定 → 302 で / に戻す（/prototype/* を漏れなく守る）。
  - Entitlement "権利判定" gate：欠損/不整合/期限切れ → Silent Free（エラーを出さず、圧もかけない）。
- 購入状態SSOT：DB（+PurchaseCacheはキャッシュ）。クライアント永続状態をSSOTにしない。
- URL文脈注入禁止（クエリでの権利/文脈注入は禁止）。背景NoTouch/通知っぽさ禁止も継続。
- 公開文言：禁止語彙（占い/鑑定/運勢/予言/開運/霊感/当たる等）は公開HTMLから0（隔離UIも同等基準で運用）。

## 2) 初月最大収益の設計（日本市場適合、かつ事故らない）
「広告」ではなく「価値差（保存×深度×回数）」で売上を作る。実装は段階導入（Feature Flag）で、公開ページ凍結を維持。

### 2.1 プラン（最小で強い構成）
- Free：最小体験（Silent Free）。保存=当日相当。回数=最小（例：日次1）。
- Standard（月額 + 年額）：保存=30日。回数=中（例：日次5）。
- Premium（月額 + 年額）：保存=90日。回数=実質無制限相当（ただし濫用防止は別途）。月次DTR付与（特典）。
狙い：初月売上を最大化するため、年額を早期に用意し「前倒しキャッシュ」を作る（公開ページに新規煽りは出さず、隔離UIで比較表示）。

### 2.2 DTR商品（単発）＋棚（shelving）
- DTRは canonical_product_id → rightsKey を固定で運用（Core/Synastry/Weekly/Daily）。
- 価格は審査整合を優先し、初期は「単発¥1,000」を主軸にする（価格ABは後回し）。
- 先にABするのは「棚の並び」「説明」「露出位置」（価格/決済導線は最後）。
- Stripe側の名称は極力固定。表示名/説明/棚分類はDB側で安全に変えられる設計にする。

### 2.3 アップセル（煽らず、比較だけ）
- Freeに対して「保存期間（0/30/90日）」と「回数（1/5/∞相当）」の"比較表示"を隔離UI内で提示。
- "購入ボタンや決済導線"を増やさない。導線の増強はFeature Flagで段階導入し、監査ログを残す。

## 3) 接続ハブ（Phase 1の主戦場）
- ai_meter_detail を「接続ハブ」とする（DTR棚 + プラン価値の可視化）。
- Hubの責務：
  - 観測（7/30/90など）を見せる
  - DTR棚を並べる（権利がなければ静かにロック）
  - Standard/Premiumの価値差（保存日数）を比較表示（隔離UI内のみ）

## 4) 実装ガード（事故を出さないための必須要件）
- /prototype/* の漏れ防止：middleware matcher は /prototype/:path* まで含む。
- /api/me/entitlements のキャッシュ禁止：Cache-Control=private,no-store（または同等）+ dynamic強制。
- Stripe webhook は Node runtime を強制し、署名検証 + 冪等（event_id重複）を必須にする。
- ログに秘密値を出さない（署名失敗も含めて生値を残さない）。
- env変更は redeploy が必要（Vercelの既ビルドへは反映されない）。

## 5) 運用（初月の最短ループ）
- 1週目：Phase 1隔離UIで DTR棚 + 価値差比較（保存30/90）を稼働、購入反映（DB entitlements）を安定化。
- 2週目：年額を隔離UIで提示開始（公開ページは凍結）。Premium月次DTR付与をwebhookで実装。
- 3週目以降：ABは「棚/説明/並び」から。価格・決済導線の改変は最後（Gate解除チェックポイントが必要）。

## 6) External dependency guard (Supabase / tooling)
- Runtime must NOT depend on fetching OpenAPI/schema at /rest/v1/schema (or equivalent). Schema/codegen is offline-only.
- Supabase keys: prefer new key model (publishable/secret) for future-proofing; keep server secrets server-side only. Never embed secret keys in client or logs.
- Observability minimum: error tracking + webhook failure visibility + DB write failure visibility (Phase 1でも必須).
- Cursor workflow: when implementing Supabase features, paste the latest Supabase docs as Markdown into the prompt context to avoid stale/hallucinated code.

(END)
