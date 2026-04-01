# M55 INTEGRATED ENGINEERING REPORT (v1.1 Hardened)
**STATUS:** DEEP FREEZE（絶対準拠）  
**DATE:** 2026-02-02 JST  
**SCOPE:** Phase 1-4（Foundation） & Phase 5（Oracle）  
**KEYWORD:** Ultimate Efficiency（究極効率）

---

## 0. このレポートの目的（全員が同じ視座で並走する）
- **何が決まったか**（凍結点）
- **なぜそうなったか**（事故の種を潰した理由）
- **各チームが今やること**（自分の担当領域が一目で分かる）

> 合言葉：**「仕様書通りに組めば繋がる」**（裁量を残さない）

---

## 1. Executive Summary（何が決まったか）
M55の基盤ロジックに対し、セキュリティと整合性を保証する **「最終硬化パッチ (v1.1)」** が適用された。  
これにより、以下の2種の事故が **物理的に排除** された。

1) **Privacy / 解釈事故**：ログ本文のキーワード検知で感情や危機を推測する（SSOT違反）  
2) **DOM注入事故**：購入完了UI等を innerHTML 生成する（XSS/差分崩壊/監査不能）

以降、v1.1 に反するコードはすべて **バグ** として扱う。

---

## 2. Core Architecture Updates（全チーム共通の凍結点）

### [A] Data Core（記憶と眼）
- **No Keywords:** LogVault / MeterEngine から「単語検知（ログ本文走査）」を完全削除
- **Pure Calculation:** メーター状態は **直近90日間のユニーク記録日数** のみで計算
- **Plan-Aware Retention:** Free 7d / Std 30d / Prem 90d（上限90d）
- **Local Only / No Server:** 解析目的のサーバ送信は禁止（ログは端末内）
- **Tamper Proof:** 重要データは署名付き保存（改ざん検知で破棄）

### [B] Wiring（収益と信頼の接合）
- **Meta Strict:** `dtr_weekly_tide` / `dtr_daily_spot` の権利登録には `meta` が必須  
  - Weekly: `meta.weekKey(YYYY-Www)` + `meta.expiresAt(ms)`  
  - Daily: `meta.dateKey(YYYY-MM-DD)`（推奨）
- **expiresAtはWiringで計算しない**（計算責任は呼び出し元=Product Logic、凍結済みルートのみ）
- **Static DOM Only:** Thanks View は DOM生成禁止。全DTRテンプレに `#dtr-thanks-view` を静的配置
- **Silence:** チャット遷移はユーザータップのみ。遷移後の自動発話をしない（入力待ち）

---

## 2.5 最短実装順（事故ゼロの順 / 実装者の自由度を残さない）
1) **Thanks View DOM** を全DTRコンテナに静的配置（`id` / `data-testid` 一致）  
2) **Chat Context Indicator** を静的DOM配置（生成禁止）  
3) **Wiring**（`purchase_success → COREジャンプ1回 → Thanks表示`）  
4) **Context Injection**（ボタンtap時のみ `setContext`、遷移後は沈黙）  
5) **Exclusive Slot 判定**（DTRキーのみバイパス）  
6) **Membrane**（Crisis優先でMap空 / toggleはAdapterでclass一括除去）  

---

## 3. Gates（警察）— うっかりを物理的に封じる

### 3.1 Wiring Gate（禁止API監視）
**Fail対象（v1.1.1 GatePlus / 非機能パッチ）**
- `document.createElement`
- `.innerHTML =`
- `insertAdjacentHTML`
- `outerHTML`
- `window.location`
- `getBoundingClientRect`（座標補正の芽）
- `setTimeout(...chat...)`（自動チャット発火の疑い）

### 3.2 Coverage Gate（Thanks View 網羅チェック）
- DTR関連テンプレ（ファイル名に `DTR` or `dtr` を含む）すべてに以下トークンが存在しないと FAIL  
  `id="dtr-thanks-view"`, `data-testid="thanks-title"`, `data-testid="thanks-rights"`, `data-testid="btn-thanks-chat"`, `data-testid="btn-thanks-home"`

### 3.3 Context Indicator Gate（静的DOM配置忘れ封じ）
- どこかのHTMLに `context-indicator` 文字列が存在しないと FAIL

**実行**
```bash
python tools/m55_gate_scan_wiring.py .
```

### 3.4 DOM Freeze Check（Turn04 時点）
- **m55_dom_freeze_check_v2.py** は **NOT_APPLICABLE**。
- 引数: `GM.html`（ゴールデンマスター）と `CANDIDATE.html` の2つが必要。GMの選定・運用が未確定のため、本 Turn では CI 必須にはしない。
- **いつ必須化するか**: Turn06 で GM を確定し、CI に組み込む方針。

---

## 4. Team Missions（並走の役割分担）

### Team A: Foundation（Phase 1-4）
**DoD**
1) v1.1 パック適用（DataCore / PurchaseCache / Wiring / Gate）  
2) `routes_manifest.js` の購入成功コールバックが `runPurchaseSuccessFlow(..., meta)` を呼ぶ  
3) Weekly/Daily の meta が凍結済みルートから供給される（Wiringで計算しない）  
4) Gate PASS（Coverage含む）  

### Team B: Oracle（Phase 5）
**DoD**
1) `page_chat.html` に `#context-indicator` を **静的配置**（生成禁止）  
2) `setChatContext(key)` を受け取り、上部インジケータを表示（クラス制御のみ）  
3) 遷移直後の自動発話は禁止（ユーザー入力待ち）  
4) 会話ログは `LogVault` へ保存（サーバ送信禁止）  

---

## 5. Merge Point（合流地点 / 1本の動脈）
- 購入成功 → `runPurchaseSuccessFlow` →（Coreなら1回だけCoreへJump）→ Thanks View表示  
- ユーザーが「AIと詳しく話す」タップ → `onNavigateChat({ contextKey })`（= Chatへ文脈注入）  
- Chat画面 → `Viewing: ...` が静かに表示 → ユーザー入力 → 応答 → LogVault保存  

> ここまで **自動発話ゼロ / DOM生成ゼロ / meta欠落ゼロ** が成り立っていれば、事故は起きない。

---

## 6. Artifact Pointers（共有用）
- `m55_phase3_wiring_frozen_pack_v1_1_hardened_integrated.zip`
- `m55_phase3_wiring_frozen_pack_v1_1_hardened.zip`

---

## 7. Non-Negotiables（即バグ判定）
- ログ本文のキーワード検知で状態/危機を推測する
- 購入完了UIをDOM生成する（innerHTML等）
- Weekly/Dailyでmeta無しで権利保存を試みる
- 期限計算をWiring側で行う
- Chat遷移直後の自動発話
- 追従/座標補正（座標測定）でUIを動かす

---

## 8. Final Note（M55の心）
**絶対に大丈夫！**  
（だからこそ、静寂と信頼を壊す実装は“仕組み”で止める）
