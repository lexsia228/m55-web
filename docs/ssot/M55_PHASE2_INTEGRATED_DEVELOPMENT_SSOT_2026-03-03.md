# M55_PHASE2_INTEGRATED_DEVELOPMENT_SSOT_2026-03-03
Status: SSOT (Law) / Integrated Constitution
Date: 2026-03-03 (JST)
Scope: Web移植（Phase 2） + Stripe審査中の安全運用（Gate R防衛）

## 0. Purpose
本ドキュメントは、以下3本のSSOT（Tarot / Data Logic Bridge / Sensory）と監査裁定を矛盾なく統合し、審査中に事故を起こさずにWeb移植を進めるための「新・憲法」とする。
- M55_TAROT_LOGIC_SSOT.md
- M55_DATA_LOGIC_BRIDGE_SSOT.md
- M55_SENSORY_SSOT.md

## 1. Hierarchy of Laws（優先順位）
(1) Gate R / Stripe審査運用の凍結憲法（main/Production凍結、公開条件、禁止語彙0）
(2) Sensory SSOT（全ページ共通の感覚法）  ← 全演出の最上位
(3) Data Logic Bridge SSOT（内部ロジック→UI聖域への接続法）
(4) Tarot SSOT（Tarot領域の乱択・ログ・状態機械）
(5) 各ページSSOT（未凍結の場合はDOM改変禁止）

上位法と下位法が衝突する場合は、必ず上位法を優先する。

**2026-03-05 注記**: /prototype 隔離に関する事項は `docs/audit/M55_Prototype_Gate_Postmortem_2026-03-05_v1.0.md` を最上位とする。本 SSOT は Phase2 全般の補完。

## 2. Non-Negotiables（不変の禁止事項 / スレ跨ぎでも絶対）
A. Stripe審査・公開テキスト
- 公開テキスト禁止語彙（0厳守）:
  占い / 鑑定 / 運勢 / 予言 / 開運 / 霊感 / 当たる
- 断定保証・煽りコピー禁止（例）:
  「必ず」「確実」「成功」「最適」「おすすめ」「今だけ」「急げ」など
- 新規決済導線追加禁止（PayPay/コンビニ/ApplePay/GooglePay等は表示のみ。購入遷移に接続しない）

B. UI/感覚
- 背景NoTouch（html/body/全体トーン改変禁止、全画面疑似要素演出禁止）
- 通知っぽさ禁止（ベル/バッジ/未読/赤点/数字煽り等）
- 常時ループ/点滅/注意奪取/過剰演出禁止
- prefers-reduced-motion: reduce を尊重（動作停止または最小化）

C. 権利・状態・セキュリティ
- URL文脈注入禁止（クエリで状態/権利/文脈を決めない）
- DTR chat history は contextKey 分離（CTX_CORE / CTX_SYNASTRY_* 等）を壊さない
- 秘密鍵/シークレットの要求・出力・ログ禁止（CLERK_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY 等）
- 購入状態SSOTを増殖しない（PurchaseCache/DBが唯一の真実）

## 3. Gate R（審査中の運用憲法）
### 3.1 Production / main の凍結
Stripe審査中は Production（main）を凍結する。
- 対象面（常時200で公開）:
  /dtr/lp
  /legal/tokushoho
  /legal/privacy
  /legal/terms
  /legal/refund
  /support
- 価格定義: ¥1,000（税込）単発買い切り
- 提供: 決済後に即時閲覧（配送なし）
- 差し戻しが来た場合のみ、最小差分で修正して main に入れる（それ以外は入れない）

### 3.2 新規開発の境界
新規開発・移植・リファクタは全て feature ブランチで行い、Vercel Preview のみで検証する。
Production を揺らさないことが最優先。

### 3.3 公開リスク要素の扱い
禁止語彙が混入し得る領域（Tarot/相性/日次など）は、審査中は public route に出さない。
保持する場合は以下のいずれか:
- preview-only route（環境で遮断）
- feature flag（URL/クエリではなくサーバ側・環境で遮断）
- 非公開ルート（リンク無し + サーバ側で常時遮断）

## 4. Integrated Rulings（監査裁定）
### 4.1 Sensory優先（Tarot演出の矛盾解消）
Tarot SSOT には Flip 1.0–1.3s / Pulse <=0.25s / Shuffle <=600ms の記述があるが、
Sensory SSOT は duration を Fast=200ms / Normal=400ms の2種に固定する（上位法）。
よって審査中・Web移植では Sensory SSOT を優先し、Tarot演出は以下に丸める:
- Shuffle: Fast(200ms) または Normal(400ms) のどちらかに統一
- Pulse: Fast(200ms)
- Flip: Normal(400ms)
- Reduce Motion: Tarot含めて animation 停止/最小化（fadeのみ等）

### 4.2 購入判定の真実は DB / PurchaseCache（TrustedStorageは補助）
Data Logic Bridge SSOT は権利のTrustedStorage保存を規約化しているが、クライアント単独署名（HMAC鍵問題）では
改ざん耐性・SSOT一元性が崩れやすい。
よって Web運用では以下を固定する:
- 購入権利の最終判定（unlockの真実）は DB / PurchaseCache のみ
- TrustedStorage は「UX用キャッシュ / 表示補助」に限定し、単独でunlockしない
- URL/クエリで権利を注入しない（Tap-onlyと整合）

## 5. Identity & Storage（Bridge統合）
### 5.1 userHash（最上位の結び目）
- userHash は必須（匿名/デモ/フォールバック禁止）
- 欠損時は systemHalt()（復旧はReloadのみ）
- 取得順序（固定）:
  1) window.M55_USER_HASH
  2) localStorage["m55_user_hash"]

### 5.2 Storage層
- Plain localStorage: 最低限の保持
- TrustedStorage: 改ざん検知パケット（m55_secure:<logicalKey>）
  - ただし「購入権利の真実」はDB/PurchaseCache（4.2）に固定

### 5.3 Fail-Closed（欠損時の挙動）
- userHash欠損 → systemHalt()
- data JSON欠損/ハッシュ不一致 → systemHalt()
- crypto.subtle欠損（整合性検証不能） → systemHalt()
- profile欠損/無効/改ざん → 未設定として静かに不在（推測しない）
- PurchaseCache欠損 → 権利は全てfalse扱い（再購入誘導しない）

## 6. Context & Tap-only（Chat/DTR）
- contextKey はTap起点でのみ注入:
  window.onNavigateChat({ contextKey, contextTitle })
- URL query / location.search / searchParams からの注入は禁止
- contextKey はCTX_*で正規化し、専用スロットとして履歴・回数枠を分離する
  - 例: CTX_CORE / CTX_SYNASTRY_<partnerHash> / CTX_WEEKLY_<weekKey> / CTX_DAILY_<dateKey>

## 7. NameAnalysis（唯一データの純参照）
- 唯一のロジックデータ:
  data/m55_name_analysis_81_sanitized.json
- resolveCore / resolveKaku81 / resolveDaily 等は「純参照」のみ
- 外部計算（漢字画数の独自実装等）・ヒューリスティック・LLMは禁止
- 出力は短文（<=80字推奨） + 必要最小の補足

## 8. Tarot（ワンオラクル統合）
- 大アルカナ22枚、1枚引きのみ
- 乱択は crypto.getRandomValues（Math.random禁止）
- ritual_id = SHA-256(userHash:timestamp_ms:nonce) を監査メタとして保存（UI表示しない）
- 逆位置は任意（強調しない）
- ログは「観測の固定」として一次ローカルのみ（外部同期は別SSOT凍結まで禁止）
- UIは状態機械に従い、二重入力を防ぐ
- 演出はSensory優先（4.1）

## 9. Sensory（全ページ共通）
- Haptics: navigator.vibrate のみ（未対応は無音）
  - Light 10ms / Medium 40ms / Heavy [30,50,30] のみ
- Motion: durationは 200ms / 400ms のみ
- Easing: cubic-bezier(0.2, 0.0, 0.0, 1.0) のみ
- Transition: fade + small translateY のみ（reduce motion時はfadeのみ）
- Micro: :active scale 0.98 のみ（reduce motion時は無効）

## 10. Operational Guardrails（審査中の運用ガード）
- main 直push禁止（PR必須）
- featureブランチでのみ開発、Previewのみで検証
- Gate RスクリプトでPASS証跡を保存（提出直前/差し戻し時）
- 証跡はリポジトリ外の専用フォルダに保存（改ざん/上書き防止）
- UI聖域（Sanctuary）は、各ページSSOT凍結前に main へDOM増設を入れない

End of SSOT
