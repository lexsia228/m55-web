# M55 Command Center (HQ) SSOT v1.0 — 2026-02-04 (ENFORCED)

**Status:** ENFORCED  
**Timezone:** Asia/Tokyo (JST)  
**Canonical Territory Pack:** `M55_STEP1_RECONCILED_RC1_2026-02-04_PATCH2`  
**Purpose:** “司令部”として、矛盾を全排除し、以後の全SSOT/実装/CIをこの文書へ従属させる。

---

## 0. 司令部の前提

- 以後、**推測による実装は禁止**。未凍結の領域は「未実装として静かに不在」か「DOM保持+hidden」のみ。
- “動くが壊れている” を許さない。**Fail-Closed** が唯一の安全。
- 「背景NoTouch」「通知/バッジ/ランキング/スコア禁止」「常時ループ禁止」は上位法。
- 内部ロジック（占術/LLMの判断構造）は **変更禁止**。ただし **出力言語** は「言語蒸留フィルター」で静かに整える（データそのものは不変）。

---

## 1. 統治階層（優先順位）

### Level 0 — Constitution（最高法規）
この文書（**M55 Command Center (HQ) SSOT v1.0**）が唯一の憲法。  
矛盾が出た場合は **この文書に合わせて下位を修正** し、下位で上書きすることはできない。

### Level 1 — Ministries（領域法）
各領域は「唯一の真実（Truth）」を持ち、**そのTruth以外参照禁止**。

| Ministry | 唯一の真実 (Truth) | 鉄の掟 (Iron Rules) |
|---|---|---|
| Logic & Data | `data/m55_name_analysis_81_sanitized.json` | 参照はこれのみ。改変禁止。SHA不一致は即Halt。 |
| UI / Sanctuary | `index.html`, `page_chat.html`, `page_mypage.html`, `DTR_TEMPLATE.html` | 背景NoTouch、通知/赤点/数値煽り禁止、常時ループ禁止。 |
| Wiring / Routes | `js/routes_manifest.js`, `js/phase3_wiring_async.js` | anon/デモフォールバック禁止。routeはmanifest準拠。 |
| Purchase / Rights | `js/m55_purchase_cache.js` | 永続性（Purchased value never lost）。途中課金遮断禁止。 |
| Safety / Halt | `js/system_halt.js`, `js/integrity_guard.js` | NoTouch膜Halt。許可アクションはReloadのみ。 |

### Level 2 — Territory（現場コード）
このZIPに同梱するファイル群（= 展開ディレクトリ）が唯一の「正当な開発現場」。  
他のZIP/スナップショット/パッチは **証拠/履歴** であり、現場Truthではない。

---

## 2. 唯一ロジックデータ（The ONLY Logic Data）

### 2.1 Canonical File
- **Path:** `data/m55_name_analysis_81_sanitized.json`
- **SHA-256 (Canonical):** `94d58be9bc925103235ace9f06f9363cf82ecdc46c3bf4370809486b9bfe6918`

### 2.2 Normalization（事故防止）
ハッシュ不一致事故を防ぐため、Gitで以下を強制する。

- **Encoding:** UTF-8 (No BOM)
- **Line Endings:** LF
- **Implementation:** `.gitattributes` を必須（同梱済み）

> 重要：**このJSONをSSOT本文へコピペしない**。参照は常にファイルから行う。

---

## 3. Fail-Closed & SystemHalt（停止の作法）

### 3.1 Halt Trigger（即停止条件）
次のいずれかを検出したら、フォールバックせず即 `systemHalt()`。

- JSON欠損
- SHA-256不一致
- userHash欠損（匿名/デモ禁止）
- 期待するAPI/環境が無い（TrustedStorage等）

### 3.2 Halt UI（背景NoTouch）
- 背景は改変しない（塗りつぶし禁止）
- **半透明の膜（overlay）** を被せるのみ
- 表示文言（固定）：`The stars are silent. / 星々は静寂の中にあります。`
- **許可アクション：Reloadのみ**（`window.location.reload()`）

---

## 4. UI/UX Sanctuary（静寂の聖域）

### 4.1 絶対禁止（UI）
- 通知/未読/赤点/バッジ/ランキング/人気/スコア/％/ゲージ（数値煽り全般）
- “次にやること” “アクションプラン” 等の行動指示UI
- 常時ループ/点滅/注意喚起アニメ
- 背景の改変（html/body/全画面疑似要素を含む）

### 4.2 Days-Only Meter
- 表示は **日数のみ**。点数・割合・達成率などはUIに存在させない。
- L102等のスコア系は **型レベルで無効**（nullのみ）。0フォールバック禁止。

---

## 5. 言語・人格（The Silent Observer）

### 5.1 禁止語（出力）
- Optimize / Maximize / Strategize / 成功保証 / 断言 / 煽り
- 命令形（〜しろ/〜せよ/〜しなさい/〜すべき）

### 5.2 言語蒸留フィルター（必須）
**データは不変**だが、ユーザー表示は必ずフィルターを通す。  
目的：データ内に残存する強い命令形や過度な断定を、観測文へ落とす。

最低要件：
- 命令形を観測形へ（例：`〜せよ` → `〜が意識に上がりやすい`）
- “最強/最大/必ず/約束” 等の断言を抑制
- 余白密度（30%）を維持（短く、静かに）

---

## 6. CI/CD（機械的ブロック）

### 6.1 必須ガード
- `ci/prebuild_guard.sh` を pre-build で常に実行（同梱済み）
- `.gitattributes` を必須化（同梱済み）

### 6.2 ブロック対象（例）
- `firebase/messaging`, `Notification.requestPermission`, `navigator.serviceWorker`
- `react-hot-toast`（トースト系）
- `action_plan`, `next_steps`, `todo_list`（行動誘導キー）
- anon/デモ系のフォールバック文字列

---

## 7. 断捨離（Deprecated Assets）

次は **参照禁止（汚染源）**。存在するだけでCIで落とす運用を推奨。

- 旧統合パッチ群（このTerritoryに統合済みのもの）
- 旧デプロイスナップショット（統合済み）
- 旧RC1パック（バグ混入の可能性があるもの）
- **旧ハッシュ** `79a76c...` を唯一正として扱う文書（現行Territoryの実データと矛盾）

---

## 8. “穴” の扱い（未凍結領域の実装規律）

穴を “推測で埋める” ことはしない。穴は「穴として明示」してから埋める。

未凍結（今は触らない）：
- 各ページの個別SSOT（Home以外のTopTabs各ページ等）
- ChatのLLM接続（バックエンド/プロンプトの最終凍結）
- 課金の本番決済連携（SDK/ストア接続、権限付与のE2E）

次に埋める順序（司令部の公式ロードマップ）：
1) TopTabs SSOT（画面単位のDOM/導線/データ源）
2) BottomTab SSOT（固定の沈黙/opacity規範）
3) Chat SSOT（Safety/保存期間/課金トリガー）
4) Purchase SSOT（購入→権限→再訪の完全整合）

---

## 9. 変更手続き（法治国家の運用）

- 変更は **PR単位**。司令部/Truthに触れる変更は、必ず「なぜ矛盾しないか」を文章で証明する。
- ハッシュが変わる変更は、**必ず新バージョンSSOTを発行**し、旧版をDeprecatedへ移す。
- 「動くからOK」は不合格。**CIが保証できないものは採用しない。**

---

## Appendix A — Territory Quick Check

- Integrity Guard: `js/integrity_guard.js` が `94d58be9bc925103235ace9f06f9363cf82ecdc46c3bf4370809486b9bfe6918` を検証し一致なら起動継続
- Halt Overlay: `js/system_halt.js` は背景改変せず膜で停止、Reloadのみ許可
- Prebuild Guard: `ci/prebuild_guard.sh` が禁止API/文言/旧資産を機械ブロック

---

**End of Document**
