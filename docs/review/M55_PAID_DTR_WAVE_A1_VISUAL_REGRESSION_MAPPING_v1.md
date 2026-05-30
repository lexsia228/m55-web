# M55 Paid DTR Wave A1 Visual Regression Mapping v1

**Gate ID:** `CATEGORY-1-M55-PAID-DTR-REPORT-BODY-READABILITY-REFINEMENT-WAVE-A1-VISUAL-REGRESSION-MAPPING-DRAFT`
**Status:** Planning / regression mapping artifact only — **NOT implementation GO**
**Prior visual verdict:** `BLOCK_VISUAL_SEMANTIC_REGRESSION_NO_MUTATION` (product truth intact; semantic / mapping regression)
**Baseline commit (read-only inspection):** `a9e33140ca4be6f9061bffaac54d0e5b9ff1d603`
**Wave A1 runtime commit:** `34a52d8e540ebff39c09583b50e2a1304b21c140` (`DtrFullReader.tsx`, `lib/m55/dtrPaidModules.ts`)
**Date:** 2026-05-30

---

## 0. Gate and scope

| Action | Authorized by this document |
|--------|----------------------------|
| Create this `docs/review` file only | **Yes** |
| Renderer / engine / snapshot / DB code changes | **No** |
| `docs/ssot` edits | **No** |
| Commit / push / deploy | **No** (separate gates) |

**Document type:** Problem classification and layer separation — **not** a correction implementation draft.

**Product framing (required):**

- M55 is a non-fortune-telling life-language product: it organizes current tendencies and how to handle them, not future prediction.
- This regression is **semantic / mapping drift** in display slots, fallbacks, and frozen body wording — **not** price, count, 4-chapter structure, or consult product-structure breakage.

---

## 1. 総合判定

| 項目 | 判定 |
|------|------|
| **DRAFT ゲート** | **GREEN** — 本書1本で要求セクションを収録 |
| **Visual regression** | **Confirmed** — entitled production `/dtr/core` human evidence |
| **Product truth** | **Not broken** — 保存版 / 4章 / 相談返書 / 件数・価格は表示上維持（human attestation） |
| **実装 GO** | **いいえ** |
| **次ゲート** | `CATEGORY-1-M55-PAID-DTR-REPORT-BODY-READABILITY-REFINEMENT-WAVE-A1-VISUAL-REGRESSION-MAPPING-REVIEW-COMMIT-PLANNING` |

**Wave A1 partial success:** Bare `—` replacement largely works; empty cells were replaced by **visible but semantically wrong** lines (generic fallbacks + mis-mapped engine excerpts).

---

## 2. Evidence 一覧（human `dtr.core.txt` / production entitled）

| ID | 表示箇所 | 表示文（観測） | 問題種別 | A1 関連 | 主な層 | 修正トラック |
|----|----------|----------------|----------|---------|--------|--------------|
| E-01 | Domain matrix / **仕事** / 戻し方 | 育成・統合・調整が求められるポジション。 | スロット誤配置・職務記述感 | 間接 | renderer + snapshot | **renderer-only** |
| E-02 | Domain matrix / **回復** / 戻し方 | 同上 | 同文流用・戻し方不適切 | 間接 | renderer + snapshot | **renderer-only** |
| E-03 | Domain matrix / **判断** / 負荷 | 無理に決めなくていい項目です。 | fallback 文脈破綻・UI語（「項目」） | **直接** | renderer (`dtrPaidModules`) | **renderer-only** |
| E-04 | Domain matrix / **判断** / 戻し方 | 自分自身の状態管理を後回しにしやすい。 | 負荷文が戻し方スロットに | 間接 | renderer + snapshot | **renderer-only** |
| E-05 | Domain matrix / **回復** / 出方 | 同上 | 出方として不自然 | 間接 | renderer + snapshot | **renderer-only** |
| E-06 | 実践ガイド / **タイミング** | 人を育てる役割・複数の業務を束ねるマネジメント・プロデューサー的な仕事で力を発揮。 | キャリア / 職務経歴書文体 | 部分 | renderer + snapshot | **renderer-only** (+ **Wave C** wording) |
| E-07 | 4章・保存版本文（後半） | 中間成果、リソース、ポジション、マネジメント、統合、調整、潜在、環境設計、人・企画・プロダクト、プロデューサー**的な**仕事 等 | 生活語 drift・能力分析感 | **A1 外** | snapshot / engine body | **engine-new-only** |
| E-08 | `dtr.core.txt` 末尾 | 相談返書らしき出力 | 返書品質・スコープ疑い | 別系統 | consult / reply | **別トラック** |

**Note on E-07:** 資質名 **プロデューサー**（publicTitle）は **LOCK / PROTECTED** — 改名・言い換え禁止。問題は **「プロデューサー的な仕事」等の本文硬語**のみ。

---

## 3. 原因層の仮説

### 3.1 Data flow (reference)

```
購入時 envelope_json (frozen)
  → section.body / 【header】 blocks (engine-generated at fulfillment)
  → DtrFullReader: parseBlockItems, firstSentence, domainTiles, PracticalGuidanceSection
  → if empty or "—": dtrPaidModules fallbacks (Wave A1)
  → purchaser-facing UI
```

### 3.2 Layer hypothesis table

| 層 | 役割 | 本 regression への寄与 | 信頼度 |
|----|------|------------------------|--------|
| **snapshot 由来** | `envelope_json` 固定本文 | E-07 全文；E-01/02/04/05/06 の**文面そのもの** | 高 |
| **engine-new-only** | `STEM_BODIES`（新規購入のみ変更可） | E-07 硬語の根治；E-06 文面の生活語化 | 高 |
| **DtrFullReader** | Domain matrix・実践ガイド抽出 | スロットと抽出元のズレ（E-01–06） | 高 |
| **dtrPaidModules** | 汎用 fallback 4種・dedupe ヘルパー | E-03；横断 fallback の文脈不適合 | 高 |
| **mapper** | `parseBlockItems` / `firstSentence` | 切り出しのみ；**意味ロールは未補正** | 中 |
| **renderer-only（修正候補）** | 上記の表示マップ・fallback 差し替え | 既存購入者にも効く第一優先 | 高 |
| **consultation reply** | 返書生成・ルーム UI | E-08；保存版本文 A1 とは分離 | 中 |

### 3.3 Code anchors (implementation reference — not user-facing copy)

| Evidence | 主なコード経路 |
|----------|----------------|
| E-01 | `domainTiles[work].recovery` ← `firstSentence(workEnv)` — `【環境のヒント】` |
| E-02 | `domainTiles[recovery].recovery` ← `domainRecoveryMerge(workEnv, workHint)` — `workEnv` 優先 |
| E-03 | `domainJudgmentLoad` → `DTR_DISPLAY_FALLBACK_SOFT` when essence lacks keyword match |
| E-04 | `domainJudgmentRecovery(..., workHint)` ← `【生活のヒント】` first sentence |
| E-05 | `domainTiles[recovery].strength` ← `firstSentence(workHint)` |
| E-06 | `PracticalGuidanceSection` row `when` ← `pickUniqueDisplaySentence([firstSentence(envHint)], …)` |
| E-07 | `payload.fullSections[].body` in snapshot — e.g. `lib/m55/dtrEngine.ts` stem lane 5 `work` / `essence` / `strengths` |
| E-08 | `ConsultRoom` / reply routes — **out of Wave A1 scope** |

**Stem 5（プロデューサー）例 — engine `work` block（snapshot に焼かれうる）:**

- `【環境のヒント】` … 育成・統合・調整が求められるポジション。…マネジメント・プロデューサー的な仕事…
- `【生活のヒント】` … 自分自身の状態管理を後回しにしやすい。…

---

## 4. Wave A1 責任範囲の整理

| Wave A1 意図 | 結果 |
|--------------|------|
| 裸 `—` を減らす | **おおむね成功** — human evidence は `—` より誤文・硬語 |
| 汎用 fallback 4種 | **副作用** — スロット無関係の「項目」等（E-03） |
| `pickUniqueDisplaySentence` dedupe | **不十分** — 同一 engine 文の**別スロット再掲**（E-01/02、E-04/05） |
| スロット意味の再設計 | **未実施**（A1 は P0 の空白・重複のみ） |

---

## 5. Renderer-only 候補（実装は別 GO）

### 5.1 Domain matrix — 出方 / 負荷 / 戻し方 再マップ

| タイル | 現状（問題） | 候補方針 |
|--------|--------------|----------|
| 仕事 / 戻し方 | `workEnv`（環境ヒント）→ 職務記述 | `lifeHint` / bridge 第2段落 / 生活語「戻し方」専用 fallback |
| 回復 / 戻し方 | `workEnv` 流用 | 回復専用抽出（静かな時間・区切り）— `domainRecoveryMerge` 見直し |
| 判断 / 負荷 | 汎用 `SOFT` | 負荷専用生活語（「決めきれないときの重さ」等）— 「項目」禁止 |
| 判断 / 戻し方 | `workHint`（生活ヒント）→ 負荷文 | 戻し方候補のみ（区切り・休み・相談返書1手） |
| 回復 / 出方 | `workHint` → 負荷文 | 出方専用（手ごたえ・小さな変化）— `workStuck` と分離 |

### 5.2 Fallback 定数 — スロット別生活語化

| 現行定数 | 問題 | 候補 |
|----------|------|------|
| `DTR_DISPLAY_FALLBACK_NEUTRAL` | 出方に横断 | 出方用 / 負荷用 / 戻し方用に分割 |
| `DTR_DISPLAY_FALLBACK_SOFT` | 「項目」UI語 | 負荷専用句に差し替え |
| `DTR_DISPLAY_FALLBACK_CONSULT` | 実践ガイド when に過剰誘導 | 「タイミング」用の生活語＋相談は補助1行まで |
| `DTR_DISPLAY_FALLBACK_UNWORDED` | 戻し方のデフォルトに弱い | 戻し方専用（小さな区切り） |

### 5.3 関数候補見直し

| 関数 | 候補 |
|------|------|
| `domainJudgmentLoad` | essence から負荷文を抽出；fallback は負荷専用 |
| `domainJudgmentRecovery` | `workHint` を戻し方に直結しない |
| `domainRecoveryMerge` | `workEnv` を戻し方にそのまま出さない |
| `domainRecoveryLoad` | `workStuck` 先頭文の再利用範囲を限定 |

### 5.4 PracticalGuidanceSection — action / why / when ソース表

| カテゴリ | 現状 when 候補 | 候補方針 |
|----------|----------------|----------|
| 日々の判断と距離 | `envHint`（環境ヒント全文） | `lifeHint` / 生活の区切り文；**envHint をタイミングに使わない** |
| 疲労と回復 | `envHint` 重複 | `lifeHint` + 回復専用短句 |
| dedupe | 文単位 Set | **スロット + 正規化文** で跨カテゴリ流用禁止 |

### 5.5 Dedupe 方針（A1.5 / renderer-only）

- `normalizeDisplaySentenceForDedupe` を Domain matrix 全体で共有するか検討
- 同一文が **仕事・回復・判断** に出たら **2回目以降はスロット別 fallback**
- `workStuck` / `envHint` / `lifeHint` の **役割表**を docs で固定してから実装

**既存購入者:** renderer-only 変更は **表示のみ** — snapshot 不変。

---

## 6. Engine-new-only 候補（Wave C — 新規購入のみ）

| 硬語・硬塊 | 生活語方向（候補） | 備考 |
|------------|-------------------|------|
| 中間成果 | 途中で見える手ごたえ | § mapping v1 §9 整合 |
| リソース / リソースが枯渇 | 体力・時間・気力 | |
| ポジション | 立ち位置・関わり方 | Domain UI の「ポジション」と混同注意 |
| マネジメント | 順番をつくる・まとめる | |
| プロデューサー**的な**仕事 | 周りが動きやすくなる形をつくる場面 | **タイトル「プロデューサー」は LOCK** |
| 人・企画・プロダクト | 人、予定、考え、まだ形になっていないもの | |
| 統合 / 調整 | まとめ直す / 距離・受け渡しを整える | |
| 潜在 | まだ形になっていないものの育ちそうな部分 | |
| 環境設計 | 整え方・育つ場所を整える | patternCaption とは別判定（SSOT） |

**参照:** `docs/review/M55_PAID_DTR_WORD_POLISHING_OUTPUT_REVIEW_MAPPING_v1.md` 付録 A（stem 5 パイロット候補 — **not implementation text**).

**禁止:** UPDATE 既存 `envelope_json` / backfill.

---

## 7. SSOT 確認が必要なもの

| 項目 | 理由 |
|------|------|
| Domain matrix **出方 / 負荷 / 戻し方** の定義 | 生活語の最小テンプレ（1文以内） |
| PracticalGuidance **action / why / when** | 各列の意味と禁止ソース（envHint → when 等） |
| Fallback と相談返書導線 | `DTR_DISPLAY_FALLBACK_CONSULT` の出し過ぎ防止 |
| `displayOneLine`（人や企画の芽…） | 準固定；「企画」生活語化は別 SSOT |
| `温室育成型` / `段取りと環境設計` | viz 用 vs 本文用 |
| **プロデューサー** | **LOCK** — 本文硬語のみ研磨対象 |

---

## 8. 相談返書品質 — 別トラック候補

| 項目 | 扱い |
|------|------|
| E-08 `dtr.core.txt` 末尾 | 保存版本文レポートと **混在コピー**の可能性 — 返書が弱い・汎用チャット化リスク |
| 本ゲート | **prompt / ConsultRoom 変更しない** |
| 推奨次ゲート | `CATEGORY-1-M55-CONSULT-REPLY-QUALITY-ANTI-SYCOPHANCY-READONLY-PLANNING`（既存 audit 参照可） |
| 境界 | 相談返書は保存版に紐づく・1テーマ・非無制限 — product truth 維持 |

---

## 9. 今は触らないもの

| 項目 |
|------|
| `envelope_json` / `dtr_report_snapshots` UPDATE・backfill |
| 価格・件数・商品構造・ルート・entitlement |
| **プロデューサー** 改名・publicTitle 変更 |
| Wave A2（章 opener、得意/苦手ラベル） |
| Wave C **実装**（本書は候補分類のみ） |
| 1年展望・positive acknowledgement callout |
| 相談返書 prompt / model |
| 本文 **全置換** |
| CSS / layout 全面変更 |
| deploy / production 設定変更 |

---

## 10. 問題箇所 × 層 × 修正候補（要約マトリクス）

| ID | renderer-only | engine-new-only | SSOT | consult 別 | 触らない |
|----|---------------|-----------------|------|------------|----------|
| E-01 | **主** | 文面 | 戻し方定義 | — | snapshot |
| E-02 | **主** | 文面 | 同上 | — | snapshot |
| E-03 | **主** | — | fallback | — | — |
| E-04 | **主** | 文面 | 戻し方 | — | snapshot |
| E-05 | **主** | 文面 | 出方 | — | snapshot |
| E-06 | **主** | **副** | when 定義 | — | snapshot |
| E-07 | — | **主** | 硬語表 | — | snapshot 書換 |
| E-08 | — | — | スコープ | **主** | prompt |

---

## 11. 推奨ゲート列（参考 — 本書は GO しない）

| 順 | ゲート | 内容 |
|----|--------|------|
| 1 | **REGRESSION-MAPPING-REVIEW-COMMIT-PLANNING** | 本書レビュー・commit 可否 |
| 2 | **REGRESSION-MAPPING-COMMIT** | docs のみ |
| 3 | **WAVE-A1B-RENDERER-SLOT-MAPPING-PLANNING**（名称例） | renderer-only 抽出表・fallback SSOT |
| 4 | **WAVE-A1B-IMPLEMENTATION**（明示 GO） | `DtrFullReader` / `dtrPaidModules` のみ |
| 5 | **A1 visual RE-CHECK** | 人間 entitled・390×844 |
| 6 | **Wave C PLANNING** | engine-new-only・別列 |
| 7 | **CONSULT-REPLY-QUALITY-PLANNING** | E-08 |

---

## 12. 次ゲート提案

**`CATEGORY-1-M55-PAID-DTR-REPORT-BODY-READABILITY-REFINEMENT-WAVE-A1-VISUAL-REGRESSION-MAPPING-REVIEW-COMMIT-PLANNING`**

- docs/review 文書のレビューと commit 可否のみ
- **実装・SSOT 反映・engine・renderer 変更は含まない**

---

## Appendix A — Wave A1 汎用 fallback（現行・監査用）

| 定数 | 現行文 |
|------|--------|
| `DTR_DISPLAY_FALLBACK_NEUTRAL` | 今はまだ強く出ていない項目です。 |
| `DTR_DISPLAY_FALLBACK_SOFT` | 無理に決めなくていい項目です。 |
| `DTR_DISPLAY_FALLBACK_CONSULT` | 気になる場面は相談返書で具体化できます。 |
| `DTR_DISPLAY_FALLBACK_UNWORDED` | まだ言葉にしきれていない可能性があります。 |

---

*End of document.*
