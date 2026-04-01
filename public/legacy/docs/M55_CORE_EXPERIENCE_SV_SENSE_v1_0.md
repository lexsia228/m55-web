# M55 Core Experience Addendum (SV Sensory Integration) v1.0

本書は、既存SSOT（背景NoTouch / NoLoop / NoBadge / 数値ゼロHome / 言語蒸留 / Haptics Registry 等）を**破壊せず**に、
以下の3要素を「M55のコア体験」として実装フェーズへ統合するための追加SSOTです。

---

## 1) Digital Weight（触覚）

### 目的
「石を動かす」「霧を払う」などの操作に、**重みのある触感**を一度だけ添える。
注意奪取や連続振動はしない。

### Hard Rules
- 連続/ループ振動は禁止（ドラッグ中に連打しない）
- 1ジェスチャーにつき **単発**（必要でも最大2回まで。原則は1回）
- 120ms未満の連続発火は禁止（レート制限）
- OS設定/ユーザー設定でOFF可能（初期はON）

### 実装（Web/Capacitor）
- 実装ユーティリティ: `public/legacy/js/m55_haptics_bridge.js`
  - `hSel()` … 極小の選択パルス
  - `hWeight()` … “重み”用の単発パルス（medium impact）
  - `hErr()` … 失敗系の単発パルス（light impact）

> 重要: SSOTの監査キーワード制約により、特定のAPI名をコード上で使用しない設計になっています。

### 推奨発火ポイント（例）
- 石を「離した瞬間」に `hWeight()`
- 霧の払拭が「一定量を越えた瞬間」に `hSel()`
- 払拭が「完全に終わった瞬間」に `hWeight()`

---

## 2) Silent Widget（潜伏）

### 目的
赤丸や数値ではなく、ホーム画面のウィジェットで **「現在の霧の濃さ」だけ** を静かに示す。

### 表示ルール
- 表示は **抽象 + 短文（<=80字）**
- 数字/割合/評価ラベル（良い・悪い）は出さない
- アニメーションはしない（OSの最小更新頻度に従う）
- タップは Home を開くだけ（CTA化しない）

### データ供給
- JS側のスナップショット保存: `public/legacy/js/m55_widget_snapshot.js`
  - `publishWidgetSnapshot({ density, shortText })`
  - `density` は `thin | mid | dense` のような **文字列キーのみ**
  - `shortText` は **<=80字**

### OS側（ネイティブ）
- iOS: WidgetKit（App Group / UserDefaults）
- Android: AppWidget / Glance（SharedPreferences）

---

## 3) Cryptic Artifact（共有）

### 目的
SNSシェアはテキストではなく、運勢を表す**抽象的な石の画像**を生成して共有する。

### 生成ルール
- 画像は **端末内で生成（オフスクリーン描画）**
- ログ本文/個人情報/ユーザーの入力テキストは含めない
- 画像は“背景”ではない（アプリ内UIの背景資産として追加しない）
- 画像は静止（ループ/点滅/動画化しない）

### 実装
- 実装モジュール: `public/legacy/js/m55_artifact_export.js`
  - 端末内で抽象の石PNGを生成
  - 共有APIが使えれば共有、使えなければダウンロード
  - MyPageに導線ボタン（`#artifact-export-btn`）を追加済み

---

## 監査ゲート整合メモ

- NoLoop: `infinite` を使わない
- NoBadge: コード内に特定キーワードを入れない
- Background NoTouch: `app/globals.css` / html/body背景変更禁止
