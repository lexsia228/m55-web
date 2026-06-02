# M55 DTR Core — Chapter Copy & Graph Unification v1

**Gate:** `CATEGORY-1-M55-DTR-CORE-CHAPTER-COPY-GRAPH-UNIFICATION-W-B0-DOCS`
**Status:** Planning SSOT（display/copy/graph wiring design only — no runtime implementation in this gate）
**Date:** 2026-06-01
**Production baseline (Hub / reader):** `26dfe62` — W-A1 four-chapter integrated drawer hub
**Upstream SSOT:** `docs/review/M55_DTR_CORE_THEME_FIRST_ENTRY_MAPPING_v1.md`（W-A1 CLOSED, `f793ecd` close docs on local `main`）

---

## 1. 目的

W-A1 で確定した **4章統合 Hub**（ユーザー関心ラベル + Ⅰ〜Ⅳ 骨格）に合わせ、保存版 `/dtr/core` の **1〜4章 drawer 本文・文章量感・グラフ・枠・返書導線** を統一する。

- Ⅰ〜Ⅳ の章骨格は維持する（engine セクション id は変えない）
- 章ごとの読み味・見た目のボリュームを揃える
- 既存グラフは削除前提にせず、**本文のどの意味を補助するか**を明示する
- 相談返書で確立した文章ノウハウ（7部型）を **章本文の表示ラッパー**に応用する
- **engine / snapshot / DB / checkout は W-B0 では触らない**
- 既存購入者の `envelope_json` を書き換える snapshot rewrite / backfill は禁止

---

## 2. 現在の Hub 表面（W-A1 確定）

| pill | label | sublabel | panel |
|------|-------|----------|-------|
| Ⅰ | 自分の形を知る | 今の悩みを読み直す土台 | `chapter-1` |
| Ⅱ | 仕事・これからの進め方 | 力が出る条件と、優先順位を見る | `chapter-2` |
| Ⅲ | 恋人・近い人との向き合い方 | 距離感・言葉選び・無理の出方を見る | `chapter-3` |
| Ⅳ | お金・生活・疲れの整え方 | 生活の余白と、戻り方を見る | `chapter-4` |
| 返書 | 相談返書で整理する | 保存版に紐づく相談 | `consult` |

**役割分離（維持）:** Hub = 4章統合 + 返書行。ConsultRoom Step 1 = 5テーマ（`PAID_DTR_DRAWER_THEME_ENTRIES`）。

---

## 3. 現在の 1〜4 章：本文・グラフ・枠の棚卸し

実装根拠: `components/dtr/DtrFullReader.tsx` → `renderDrawerPanelBody`（`26dfe62` Production）。

| 章 | Hub 表面 | drawer `ReportPartBand`（旧章名） | engine `fullSections` | ナラティブ枠 | インライン可視化 | 深読み `PaidModuleShell` |
|----|----------|-----------------------------------|----------------------|--------------|------------------|---------------------------|
| **Ⅰ** | 自分の形を知る | 輪郭を見る | `s1_identity`, `s2_composition` | 2× wide article | `IdentityDesignFigures`, `StructureInteractionMapFigures` | `FiveAxisModule` |
| **Ⅱ** | 仕事・これから | 構造を読む | `s3_essence`, `s4_strengths` | essence article + strengths grid | `StabilityConditionsPanelFigures`, `StrengthsLiftFigures` | `TraitInteractionModule` |
| **Ⅲ** | 恋人・近い人 | 無理を知る | `s5_friction`, `s6_relation` | 2× grid article | `FrictionWarningFigures`, `CommFlowFigures` | `DomainMatrixModule` |
| **Ⅳ** | お金・生活・疲れ | 楽に扱う | `s7_work`, `s6_relation`（実践）, `s8_bridge`（深読み） | `WorkGuideCards`, `PracticalGuidanceSection` | （カード UI 中心） | `FrictionRecoveryModule` |

**consult drawer:** `s8_bridge` Summary + `ConsultRoom`（5テーマ Step 1 維持）。

**PRE-W1 維持（drawer 外）:** PremiumIntro 01/02、非クリック相談1行、Notice、footer — W-B でも触らない。

**統一ギャップ:**

1. Hub 関心ラベルと drawer 内 `ReportPartBand` タイトルが二重系統
2. 章ごとの UI ボリュームが不均一（Ⅰ=記事2+viz2+深読み大、Ⅲ=grid+5場面カード、Ⅳ=実践カード群）
3. 返書7部型が章本文に未適用
4. グラフの「何を見るか」1行キャプションが未統一

---

## 4. 章ごとの文章量比較

`fullSections[].body` 文字数（10 stem サンプル、`buildV2FulfillmentSnapshotFromFields` 経由、2026-06-01 棚卸し）。

### 4.1 セクション単位

| セクション id | min | avg | max |
|---------------|-----|-----|-----|
| s1_identity | 156 | 188 | 287 |
| s2_composition | 230 | 266 | 293 |
| s3_essence | 176 | 195 | 260 |
| s4_strengths | 249 | 267 | 283 |
| s5_friction | 259 | 286 | 449 |
| s6_relation | 329 | 359 | 479 |
| s7_work | 237 | 253 | 289 |
| s8_bridge | 285 | 285 | 285 |

### 4.2 章（drawer ナラティブ合算）

| 章 | 含むセクション | min | avg | max |
|----|----------------|-----|-----|-----|
| ch1 | s1 + s2 | 388 | 454 | 570 |
| ch2 | s3 + s4 | 429 | 462 | 538 |
| ch3 | s5 + s6 | 591 | 645 | 928 |
| ch4 | s7 + s8（s8 は深読み側も） | 522 | 538 | 574 |

**所見:** engine 本文のみでは極端なばらつきは小〜中（ch3 がやや長い）。体感の不均衡は **UI 層**（viz 数、深読み accordion、カード群）が主因。

---

## 5. 章ごとの既存グラフ一覧

| 章 | コンポーネント | データ源 |
|----|----------------|----------|
| Ⅰ | `IdentityDesignFigures` | `identityDesignVizForStem(stemIdx)` |
| Ⅰ | `StructureInteractionMapFigures` | `compositionStructureVizForStem(stemIdx)` |
| Ⅰ | `FiveAxisModule` | `AXIS_DATA[stemIdx]`（深読み） |
| Ⅱ | `StabilityConditionsPanelFigures` | `essenceStabilityVizForStem(stemIdx)` |
| Ⅱ | `StrengthsLiftFigures` | `s4_strengths` body |
| Ⅱ | `TraitInteractionModule` | s4 + s5（深読み） |
| Ⅲ | `FrictionWarningFigures` | `s5_friction` body |
| Ⅲ | `CommFlowFigures` | `s6_relation` body |
| Ⅲ | `DomainMatrixModule` | s3/s6/s7/s2 抜粋（深読み） |
| Ⅳ | `WorkGuideCards` | `s7_work` ブロック |
| Ⅳ | `PracticalGuidanceSection` | s7 + s6 抜粋 + stem 固定行 |
| Ⅳ | `FrictionRecoveryModule` | s5 + s8（深読み） |

---

## 6. 各グラフが本文のどこに紐づくか

| グラフ | 直前の本文 | 強度 | 補助する意味 |
|--------|------------|------|--------------|
| IdentityDesignFigures | s1 全文後 | 強 | 輪郭・成長条件（出る/崩れる/戻す） |
| StructureInteractionMapFigures | s2 全文後 | 強 | 5傾向の重なり（レーダー） |
| FiveAxisModule | 深読み（s1/s2 間接） | 中 | 5力のバランス（Hub Ⅰ「土台」とややズレ可） |
| StabilityConditionsPanelFigures | s3 全文後 | 強 | 安定・力が出る/崩れる4条件 |
| StrengthsLiftFigures | s4 grid 内 | 強 | 出やすい面の鍵 |
| TraitInteractionModule | s4+s5 深読み | 強 | 傾向×無理の重なり |
| FrictionWarningFigures | s5 grid | 強 | 無理の出方 |
| CommFlowFigures | s6 grid | 強 | やりとりの流れ |
| DomainMatrixModule | s5/s6 後（深読み） | 中 | 場面横断（Ⅲ Hub より広い） |
| WorkGuideCards | ch4 先頭 | 強 | 仕事/生活の取扱い4ブロック |
| PracticalGuidanceSection | s7/s6 | 強 | 小さな一手（行動/理由/タイミング） |
| FrictionRecoveryModule | s5+s8 深読み | 中 | つまずき→戻し |

---

## 7. 紐づきが弱いグラフ

| 項目 | 理由 | 方針（削除しない） |
|------|------|-------------------|
| `FiveAxisModule`（Ⅰ深読み） | Hub「土台」より力の内訳寄り；情報過多 | GraphCaption + 章導入で位置づけ；defaultOpen 見直し可 |
| `DomainMatrixModule`（Ⅲ深読み） | 仕事・判断・回復を含みⅢ Hub より広い | 導入文で「近い人中心・他は参照」；カード順を relation 優先 |
| `ReportPartBand` 旧タイトル | Hub ラベルと不一致 | 表示層で Hub 副題を併記（W-B1） |
| Ⅲに `s3_essence` ナラティブなし | essence はⅡのみ | Ⅲ章頭でⅡへの橋（UI copy） |
| `IdentityDesignFigures` aria | 「分解する」硬語 | UI 置換（W-B1） |
| ch4 `s8_bridge` | まとめが consult 寄り | Ⅳに bridge 要約1段を UI 抜粋（表示のみ） |

---

## 8. 返書文体 7 部型を章本文にどう流用するか

**返書で使う型（章本文への応用マップ）:**

| # | 返書の型 | 章本文での使い方 | データ源 |
|---|----------|------------------|----------|
| 1 | この章で見ること | 章頭 `ChapterIntro`（新規 UI） | `PAID_DTR_DRAWER_CHAPTER_ENTRIES` + `PAID_DTR_CHAPTERS` |
| 2 | 保存版から見ると | 章頭 or 第1記事 lede 前 | 既存 `section.body` 先頭 |
| 3 | 今の場面で起きやすいこと | ブロック見出し前（s5/s6/s7） | `parseBlockItems` 表示ラップ |
| 4 | 少しほどく見方 | 記事中盤 | 既存 `BodyPara`（整形のみ） |
| 5 | グラフで見る補助線 | 各 `*Figures` 直前 | **新規** `GraphCaption`（静的 copy） |
| 6 | 小さな一手 | 章末 or Ⅳ Practical | s7/s8 抜粋 + stem 固定行 |
| 7 | 返書で深める問い | 章末（**W-B3 以降**） | copy テンプレ；`consult` panel 遷移のみ |

**流用しない:** 返書の「受け止め」「別視点」全文 — 章は読み物、返書は相談応答のまま分離。

---

## 9. 硬い語彙・置換候補

| 所在 | 現状 | 置換候補 | 層 |
|------|------|----------|-----|
| `DtrFullReader` aria/overline | 力の出方を**分解**する | 力の出方を**ひとつずつ見る** | UI（W-B1） |
| `dtrEngine` 複数 stem | **調査・分析・改善サイクル** | じっくり確かめて直していける現場 | engine（W-B-engine, defer） |
| `dtrEngine` | **分析**の基盤 | 読み取りの土台 | engine（defer） |
| `PaidModuleShell` copy | 場面別の**整理** | 場面ごとの**見方** | UI（W-B2） |

**監査キーワード（章 UI に出してはいけない）:** 分析 / 分解 / 調査 / 改善サイクル / ドメイン / マトリクス（ユーザー向け文言）。

---

## 10. 章ごとの新しい文章構成案

**共通:** drawer 先頭に UI ラッパー（engine 不変）→ 既存記事/grid → 各 viz + GraphCaption → Bridge → 深読み →（W-B3）章末返書問い。

| 章 | 1. この章で見ること（1文方向） |
|----|--------------------------------|
| Ⅰ | いまの自分の出方を、責めずに土台として読み直す |
| Ⅱ | 力が出る条件と、先に手を付ける順番を見る |
| Ⅲ | 近い人との距離・言葉・無理の出方を整理する |
| Ⅳ | 生活の余白と、疲れたときの戻り方を整える |

---

## 11. グラフ配置案

| 章 | 順序 |
|----|------|
| Ⅰ | Intro → s1 → Caption → Identity viz → s2 → Caption → Structure radar → Bridge → 深読み FiveAxis（Caption） |
| Ⅱ | Intro → s3 → Stability panel → s4 grid+Lift → Bridge → 深読み Trait（Caption） |
| Ⅲ | Intro → s5+viz → s6+viz → Bridge → 深読み Domain（Caption: 近い人中心） |
| Ⅳ | Intro → WorkGuide → Caption → Practical → Bridge → 深読み Recovery（Caption） |

**原則:** 削除せず、キャプション + 順序 + 深読み default で役割分担。

---

## 12. 章末返書導線案

- **W-B3 以降で実装**（W-B0/B1 では実装しない）
- 非送信の 1 問 + 「この章の悩みを相談返書で整理する」→ `onSelectPanel('consult')`
- Product Truth 併記: 保存版紐づき / 1テーマ / 付属1件 + 追加最大4件（500円）
- Hub「返書」行との二重 CTA は、章末＝**いま読んでいる章**文脈に限定
- **時間軸（指定なし / 今月 / 今年）** は ConsultRoom / prompt / API 別トラック — 本章統一から分離

**defer（別 Wave）:** Hub 返書行の視認性強化（W-B4）

---

## 13. UI 表示層だけで直せる範囲

- `PAID_DTR_CHAPTER_DRAWER_INTRO`（新規 copy SSOT）
- `ReportPartBand` に Hub 関心ラベル副題
- 全主要 viz 前の `GraphCaption`
- `PaidModuleShell` title / summary / overline / aria
- `IdentityDesignFigures` 硬語除去
- engine 本文の**表示抜粋**（JSON 不変）
- CSS: 390px 折り返し、深読み defaultOpen、viz 余白
- `PRACTICAL_GUIDANCE_STEM*` 拡張（小さな一手）

---

## 14. engine / snapshot に関わるため後回しにする範囲

- `lib/m55/dtrEngine.ts` 本文テンプレ全体の生活語化
- `fullSections` 構造変更・セクション追加/分割
- 既存購入者 `envelope_json` の rewrite / backfill
- 返書 prompt / sanitizer / model
- ConsultRoom / ConsultReplyCard
- 時間軸選択 UI
- お金専章の engine 新設

---

## 15. Product Truth リスク

| リスク | 緩和 |
|--------|------|
| 章末 CTA が無制限相談に見える | cap・500円・1テーマ・保存版紐づきを1行併記 |
| Ⅱが転職・収入保証 | 「優先順位」「力が出る条件」；未来断定禁止 |
| Ⅲが相性・復縁・相手断定 | 「距離・言葉・無理」；相手の気持ち断定禁止 |
| Ⅳが投資・家計代替 | 「余白・戻り方」；投資/税務/法務禁止 |
| グラフがスコア/ランキング | 数値・% なし（現行維持） |
| テーマ行・章行で ticket 消費 | 章行は読むのみ；消費は consult **送信時のみ** |

---

## 16. 実装 Wave 案

| Wave | 内容 | 触る候補 |
|------|------|----------|
| **W-B0** | 本資料（Planning SSOT） | `docs/review/` のみ |
| **W-B1** | Intro + GraphCaption + ReportPartBand 副題 + UI 硬語除去 | `paidDtrProductCopy.ts`, `DtrFullReader.tsx`, CSS 最小 |
| **W-B2** | 深読みモジュール copy + Domain 表示順 | `DtrFullReader.tsx` |
| **W-B3** | 章末返書導線（panel 遷移のみ、送信なし） | `DtrFullReader.tsx`, copy |
| **W-B4** | Hub 返書行の視認性 | `PremiumDrawerHub.tsx` |
| **W-A2** | drawer 内「関連する保存版の章」リンク | `DtrFullReader.tsx` |
| **W-B-engine** | stem 本文生活語（新規のみ方針要決定） | `dtrEngine.ts` |
| **defer** | 時間軸・consult preselect | ConsultRoom / API |

**順序推奨:** W-B0 → W-B1 → Human → commit → W-B2 → W-B3 → …

---

## 17. W-B1 最小実装範囲

**In scope（W-B1）**

1. `lib/m55/paidDtrProductCopy.ts` — `PAID_DTR_CHAPTER_DRAWER_INTRO`（4章×章頭ブロック copy；7部型のうち 1・2・5 を中心に静的定義）
2. `components/dtr/DtrFullReader.tsx` — `ReportPartBand` に Hub 副題；`GraphCaption`；`ChapterIntro` ラッパー；aria「分解」除去
3. `components/dtr/DtrFullReader.module.css` — Intro / Caption の最小スタイル（390px 折り返し）

**Out of scope（W-B1）**

- 章末返書導線 → **W-B3**
- Hub 返書行強調 → **W-B4**
- 時間軸選択 → **別トラック**
- `dtrEngine.ts` / snapshot / DB / API / Stripe / Clerk
- ConsultRoom / ConsultReplyCard
- 03 TOC / full 縦積み復活
- Preview Harness / copy matrix doc の add・commit

**不変（W-B1）**

- `envelope_json` / `fullSections` の保存内容
- `renderDrawerPanelBody` の panel id と sec() マッピング
- PRE-W1 帯（01/02/相談1行/Notice/footer）

---

## 18. Human review checklist

**確認 URL（local）:** `http://localhost:3000/dev/dtr-drawer-preview?withConsult=1`（Harness は commit しない）
**確認 URL（production）:** `https://m55-webv2.vercel.app/dtr/core`（購入済み）

| # | 項目 | PASS 条件 |
|---|------|-----------|
| H1 | 各章 drawer 先頭に Intro（この章で見ること） | Hub ラベルと一致 |
| H2 | ReportPartBand に Hub 副題 | 旧章名 + 関心ラベル |
| H3 | 各主要グラフ直前に GraphCaption 1行 | 意味が読める |
| H4 | 「分解」等の硬語が UI にない | §9 |
| H5 | engine 本文の意味が変わっていない | 購入済み snapshot 比較 |
| H6 | 01/02/相談1行/Notice/footer 維持 | PRE-W1 |
| H7 | 03 TOC / 保存版を読む / full なし | 未復活 |
| H8 | 章行タップで ticket 消費しない | consult 送信しない |
| H9 | 390px で Intro/Caption が崩れない | 横スクロールなし |
| H10 | Product Truth（§15）を壊していない | 禁止領域感なし |

---

## 19. W-A1 mapping docs との相互参照

| 資料 | 関係 |
|------|------|
| `docs/review/M55_DTR_CORE_THEME_FIRST_ENTRY_MAPPING_v1.md` | Hub 4章統合・5テーマ Consult 分離・Product Truth §11–16・Wave W-A2/W-B 案 |
| 本資料 | drawer **内**の本文・グラフ・枠・返書導線の統一設計 |
| `lib/m55/paidDtrProductCopy.ts` | `PAID_DTR_DRAWER_CHAPTER_ENTRIES`（Hub）→ 本資料で `PAID_DTR_CHAPTER_DRAWER_INTRO`（drawer 内）を追加予定 |
| `components/dtr/PremiumDrawerHub.tsx` | W-A1 完了（`26dfe62`）— W-B4 で返書行のみ触る候補 |
| `components/dtr/DtrFullReader.tsx` | W-B1–B3 の主実装面 |

**Production 系譜:** `d544677`（PRE-W1 HOTFIX）→ `26dfe62`（W-A1 Hub）→ W-B1 以降（表示層）。

---

## 変更履歴

| 版 | 日付 | 内容 |
|----|------|------|
| v1 | 2026-06-01 | W-B0-DOCS — 初版 Planning SSOT（CHAPTER-COPY-GRAPH-UNIFICATION） |

---

## 20. v1.1追記（W-B2 Planning 監査結果）

**Gate:** `CATEGORY-1-M55-DTR-CORE-CHAPTER-BALANCE-AND-REPLY-FUNNEL-W-B2a-DOCS-LOCAL`
**Status:** GREEN（planning only / docs only）
**Date:** 2026-06-02
**Baseline:** W-B1 CLOSED on Production `3d4e4f5`（Human smoke PASS）

### 20.1 Ⅰ〜Ⅳの文章量・読む負荷比較

| 章 | engine本文（目安） | UI要素の主因 | 体感負荷 |
|----|--------------------|--------------|----------|
| Ⅰ 自分の形 | s1+s2 avg ~454 | 記事2 + viz2 + FiveAxis深読み | 重 |
| Ⅱ 仕事・進め方 | s3+s4 avg ~462 | essence + strengths grid + trait深読み | 中〜重 |
| Ⅲ 近い人 | s5+s6 avg ~645 | grid2 + domain深読み（場面幅広） | 中〜重 |
| Ⅳ 生活・疲れ | s7中心（本文は軽め） | WorkGuide + Practical + Recovery深読み | 中（構成非対称） |

**所見:** 文字数だけでなく、深読みの開き方と可視化配置が読む負荷を決める。特にⅠは積み上がり、Ⅳは構成パターン差で別物に感じやすい。

### 20.2 章ごとの強い点

| 章 | 強い点 |
|----|--------|
| Ⅰ | 本人情報の起点が明確で、土台として読み直しやすい |
| Ⅱ | 力が出る条件が実務に直結し、優先順位に落としやすい |
| Ⅲ | 距離感・言葉選び・無理の出方が生活文脈で読める |
| Ⅳ | 戻し方が行動単位で示され、実践に移しやすい |

### 20.3 章ごとの弱い点

| 章 | 弱い点 |
|----|--------|
| Ⅰ | 情報が多く、深読みまで一気に読むと重い |
| Ⅱ | grid内で本文重複が起き、冗長に見える箇所がある |
| Ⅲ | 深読みの射程が広く、近い人テーマから外れて見える瞬間がある |
| Ⅳ | WorkGuide先行で、Ⅰ〜Ⅲと導入リズムが揃いにくい |

### 20.4 生活語としてまだ硬い箇所

- `輪郭` / `整理` / `構造` など、主表示で説明語に寄る箇所が残る
- `保存版から見ると` 系ラベルは、場面語に寄せる余地がある
- 分析語（分析・分解・調査・改善サイクル）は主表示から外す方針を維持

### 20.5 グラフ12点の棚卸し（削除前提にしない）

| # | graph id | 章 |
|---|----------|----|
| 1 | ch1-identity-design | Ⅰ |
| 2 | ch1-structure-radar | Ⅰ |
| 3 | ch1-five-axis | Ⅰ |
| 4 | ch2-stability-panel | Ⅱ |
| 5 | ch2-strengths-lift | Ⅱ |
| 6 | ch2-trait-interaction | Ⅱ |
| 7 | ch3-friction-warning | Ⅲ |
| 8 | ch3-comm-flow | Ⅲ |
| 9 | ch3-domain-scenes | Ⅲ |
| 10 | ch4-work-guide | Ⅳ |
| 11 | ch4-practical-guidance | Ⅳ |
| 12 | ch4-friction-recovery | Ⅳ |

### 20.6 グラフと本文の紐づき評価

| 評価 | 対象 | 方針 |
|------|------|------|
| 強 | identity/stability/friction/work-guide 系 | 現行順序を維持し、captionで意味を固定 |
| 中 | trait-interaction / recovery | 導入文を短く足して読み筋を作る |
| 弱 | five-axis / domain-scenes | 削除せず、導入文・順序・default設定で役割を明示 |

### 20.7 章ごとの統一構成案

共通骨格（表示層）:
`章導入（生活語） -> 本文 -> 可視化+caption -> bridge -> 深読み（必要時のみ）`

章別の確定候補:
- Ⅰ: **FiveAxisをdefaultClosed候補**
- Ⅱ: **grid内body重複の表示トリム候補**
- Ⅲ: **「近い人を中心に」の章頭橋追加候補**
- Ⅳ: **WorkGuide前に短い導入追加候補**

### 20.8 章末返書導線案（W-B3候補）

- `ReportBridgeBand` は既に存在（4章共通）
- W-B3は **「CTA + consult panel遷移」** に限定
- CTAは送信ではなく `consult` panel へ移動するのみ
- cap情報（1件同梱、追加最大4件、500円）は誤解回避のため短く併記

### 20.9 Hub返書行の強調案（W-B4候補）

- Hub内の返書行だけ視認性を1段上げる（過剰演出なし）
- 章行とのバランスを壊さず、導線の迷いを減らす
- 無制限相談や汎用チャットに見える文言は避ける

### 20.10 ConsultRoom / ConsultReplyCard へ波及すべき生活語（実装はW-C）

- `整理` の多用を、生活語（絞る・見立てる・今の場面に合わせる）へ置換候補化
- `保存版から見ると` のラベルを、章体験に沿う語へ再調整候補化
- ただし本ゲートではコード変更しない

### 20.11 時間軸選択の扱い（W-D別トラック）

- 3択（指定なし / 今月 / 今年）は有効性あり
- 置き場所は保存版drawerではなく、返書送信前工程が妥当
- 「予言」表現は避け、「今月の扱い方」「今年の見取り図」で扱う
- prompt/API/DB/UI影響が大きいため、W-B系列から分離する

### 20.12 Product Truthリスク（維持確認）

- 相談返書は **1件同梱**
- 追加は **最大4件**
- 合計 **5件**
- 追加 **500円**
- 保存版に紐づく相談、**1テーマ**
- 汎用チャットではない
- **ticket消費はconsult送信時のみ**

### 20.13 engine/snapshotに触れずにできる範囲

- 表示層 copy 調整（章導入、caption、bridge文言）
- drawer内の順序・折りたたみ・重複抑制
- consult panel への非送信遷移導線

### 20.14 後回しにすべき範囲

- engine本文の全面生活語化
- snapshot rewrite / backfill
- ConsultRoom / ConsultReplyCard 本体改修
- 時間軸のprompt/API連動

### 20.15 最小実装Wave案（更新）

| Wave | 目的 |
|------|------|
| W-B2a | 本docs v1.1追記（本ゲート） |
| W-B2b | 章バランスの表示層調整（量・順序・折りたたみ） |
| W-B3 | 章末CTA + consult panel遷移（送信なし） |
| W-B4 | Hub返書行の強調 |
| W-C | ConsultRoom/ReplyCard生活語波及 |
| W-D | 時間軸選択 |
| W-engine | 新規生成分のengine生活語化 |

---

## 21. Changelog v1.1

| 版 | 日付 | 内容 |
|----|------|------|
| v1.1 | 2026-06-02 | W-B2 Planning監査結果を追記（章バランス/グラフ紐づき/返書導線/Product Truth/Wave再編）。実装・commit・deployなし。 |
