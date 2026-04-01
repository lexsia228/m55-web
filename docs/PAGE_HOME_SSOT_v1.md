# PAGE SSOT: PAGE_HOME
**Status:** FROZEN
**SSOT Level:** PAGE (v1.1)
**Core Phrase:** 絶対に大丈夫！

> Absolute: 既存凍結資産（v1.0.3本体/既存SSOT/既存HTML/既存ZIP）は編集・上書き禁止。追加のみ。
> Absolute: 背景NoTouch（全体背景の改変禁止）。通知/赤点/バッジ/ランキング/数値スコア/%/おすすめ表示禁止。
> Absolute: 常時ループ/点滅/注意奪取モーション禁止。Reduce Motion/Transparency 最優先。
> Cache Rule: 必ず `now < expires_at` の時のみキャッシュ採用（TTL削除遅延対策）。

**Route:** `/home`
**ID:** `PAGE_HOME`

---

## 0. PAGE IDENTITY (固定情報)
* **Page Name:** Home Hub
* **Page Type:** Hub
* **TopTab:** Core / Synastry / Today / Weekly / AI Calendar
* **BottomTab:** Home
* **Data Source:** `m55_meter_cache.weekly` / `m55_content_cache(key=dtr_shelf_v1).items`（棚は“並び”のみ、順位/おすすめ禁止）
* **Logic Source:** `M55_DATA_LOGIC_BRIDGE_SSOT.md` / `M55_SENSORY_SSOT.md`
* **Cache Rule:** `now < expires_at`
* **Weekly Key/Boundary:** `m55_meter_cache.weekly` の period_key/週境界は Legacy `routes_manifest.js`（ISO週キー／月曜00:00(ユーザーTZ)）を唯一ルートとして参照（推測で別計算しない）

---

## 1. HUMAN SSOT (意味と体験)
### 1.1 役割
アプリの中心ハブ。全ページへ到達できるが、行動を強制しない。

### 1.2 表示するもの
* AI観測メーター（数値なし）
* Third Eye（三連ドット：表示専用）
* TopTabs（本質/相性/今日/週間/AIカレンダー）
* BottomNav（5タブ固定）

### 1.3 絶対にしないこと (Prohibited)
* ランキング/おすすめ/人気/点数/% の表示
* 通知/赤点/バッジ/未読
* “次にやること”の強制、煽りコピー
* 常時ループ/点滅/注意奪取

### 1.4 感情トーン
静か／観測のみ／判断させない／邪魔しない

---

## 2. AI IMPLEMENTATION (Cursor実装契約)
### 2.1 DOM契約 (Structure)
* **Master Layout:** `M55_HOME_ULTIMATE_FINAL_SSOT_MERGED.html` を唯一の正として継承
* **Locked Selectors:**
  * `.main-container`
  * `.content-area`
  * `.meter-bar`
  * `.te-slot`
  * `.te-slot .dots`
  * `.te-slot .dots .dot`（×3）
* **Rule:** DOM構造の変更禁止。class付与・CSS変数・inline styleのみ許可。

### 2.2 入力State契約 (Input)
* `three_dot_status`: 0-3（参照: `m55_meter_cache.weekly.scores.three_dot_status`）
* `meter_level`: 0.0-1.0（UIに数値表示しない）
* `home_cards`: []（未凍結データはGhost）

### 2.3 遷移契約 (Navigation)
* **Back Route:** `null`（Tab root）
* **Transitions:**
  * `TopTab Core` -> `/core`
  * `TopTab Synastry` -> `/synastry`
  * `TopTab Today` -> `/today`
  * `TopTab Weekly` -> `/weekly`
  * `TopTab AI Calendar` -> `/ai-calendar`（modal）
  * `BottomNav Tarot` -> `/tarot`
  * `BottomNav AI Chat` -> `/ai-chat`
  * `BottomNav Premium(DTR)` -> `/dtr`
  * `BottomNav My` -> `/my`
  * `AI観測カード tap` -> `/ai-meter-detail`（未実装なら導線visible禁止）
* **Rule:** 未実装機能への導線は `display: none`（DOM保持+hidden）。

### 2.4 Fail-Closed & Loading
* **Error時:** 静かな固定文（リロード誘導禁止）
* **Loading時:** スピナー禁止。Skeleton UI（静止・Glass膜）
* **Empty時:** Mist（霧の待機）

### 2.5 Motion契約 (Sensory)
* 常時ループ禁止
* Reduce Motion尊重
* Haptics: なし（Homeは沈黙が正）

### 2.6 禁止UIチェック (Anti-Patterns)
`ranking`, `score`, `points`, `badge`, `notification`, `recommended` をコード内に存在させない

### 2.7 Acceptance Gate (完成条件)
1. Top/Bottom遷移が完走し、戻れること
2. 禁止語・禁止UIがゼロ
3. `.meter-bar` / `.te-slot .dots .dot` のDOM契約維持
