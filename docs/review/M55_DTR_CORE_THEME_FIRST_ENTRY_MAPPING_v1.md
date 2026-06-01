# M55 DTR Core — Theme-First Hub Entry Mapping v1

**Gate:** `CATEGORY-1-M55-DTR-CORE-THEME-FIRST-ENTRY-W0-DOCS`  
**Status:** Planning SSOT (display/routing design only — no runtime implementation in this gate)  
**Date:** 2026-06-01  
**Production baseline (Hub / reader):** `d544677` (PRE-W1 regression HOTFIX closed)
**Runtime SSOT (Hub labels):** `PAID_DTR_DRAWER_CHAPTER_ENTRIES` in `paidDtrProductCopy.ts`（W-A1 v1.2 以降）

---

## 0. W-A1 v1.2 — 5テーマ直列から4章統合へ（方針転換）

**経緯:** W-A1 初版で Hub を5テーマ + 相談の6行にしたが、Human visual で **保存版のⅠ〜Ⅳ骨格が弱く見える** と判断。仕事/これから・お金/疲れの同章共有も、入口が5行になることで重複感が増した。

**確定方針（v1.2）:**

| 表面 | 役割 |
|------|------|
| **PremiumDrawerHub** | **4章統合** — Ⅰ〜Ⅳ の器に、ユーザー関心を寄せたラベル（各章1行）+ 相談返書行 |
| **ConsultRoom Step 1** | **5テーマ維持** — `themeExamplesJa` / `PAID_DTR_DRAWER_THEME_ENTRIES` は相談・返書マップ用 |

**5テーマ → 4章への統合（Hub 表面）:**

| 統合先章 | 取り込む関心テーマ |
|---------|-------------------|
| Ⅰ 輪郭 | 全テーマの土台（「自分の形を知る」） |
| Ⅱ 構造 | 仕事・スキル、これからの進め方 |
| Ⅲ 無理 | 恋人・近い人 |
| Ⅳ 楽に扱う | お金・生活、疲れと戻し方 |

**W0 本文の「5テーマ Hub 直列」:** 初版 W0 / v1.1 の計画記述。**実装は v1.2 で4章統合に変更**（本節が正）。Product Truth ガード（§11–16）は維持。

---

## 1. 目的

`/dtr/core` 保存版の **PremiumDrawerHub** は、Ⅰ〜Ⅳの **4章骨格を表面でも見せる**読み返し入口とする。旧プロセス語（「〜を読む」）より、**章ごとに統合したユーザー関心ラベル**を載せる。

- **表面（Hub）:** 4行（Ⅰ〜Ⅳ 統合ラベル）+ 相談返書 — `PAID_DTR_DRAWER_CHAPTER_ENTRIES`
- **相談（Step 1）:** 5テーマ — `PAID_DTR_CONSULT_REPLY.themeExamplesJa`（変更なし）
- **裏側:** `chapter-1..4` の既存 drawer 本文 — engine / snapshot **変更なし**
- **操作:** 章行は読む入口のみ（ticket 消費なし）

本資料は W-A1 以降の実装・Human review の SSOT とする。

---

## 2. 現在 Hub 文言の弱点

| # | 弱点 | 詳細 |
|---|------|------|
| W1 | プロセス語 | 「まず、全体を読み返す」「力が出やすい条件を読む」等は M55 の読み方手順であり、ユーザーの「いまのお題」ではない |
| W2 | 内部骨格の先行露出 | sublabel の `Ⅰ 輪郭を見る` 等は SSOT として正しいが、購入直後は「どれが自分の悩みか」が選びにくい |
| W3 | 返書との語彙断絶 | ConsultRoom Step 1 の5チップと Hub が別言語 → 読了→相談の往復が弱い |
| W4 | 動機づけの遅延 | 「力が出やすい条件」は理解後に価値が出るフレームで、有料ページの**顔**としては抽象度が高い |
| W5 | 4行＝4章の錯覚 | ユーザーは「悩み5種」ではなく「章4＋相談」と感じ、テーマ選びの入口にならない |

**現行 Hub 行（参照 — `PAID_DTR_DRAWER_HUB.chapterRowLabelsJa`）**

| 行 | 主ラベル | sublabel（章） |
|----|----------|----------------|
| 1 | まず、全体を読み返す | Ⅰ 輪郭を見る |
| 2 | 力が出やすい条件を読む | Ⅱ 構造を読む |
| 3 | 無理が出やすい場面を読む | Ⅲ 無理を知る |
| 4 | 戻し方と使い方を読む | Ⅳ 楽に扱う |
| 5 | 相談返書で整理する | 保存版に紐づく相談 |

---

## 3. theme-first 化の採用理由

| 理由 | 説明 |
|------|------|
| R1 | **既存 SSOT との一致** | `PAID_DTR_CONSULT_REPLY.themeExamplesJa` の5文言がすでに Product Truth 上の用途軸 |
| R2 | **返書マップの再利用** | `lib/m55/consult/consultReplyThemePartMap.ts` が各テーマ→プライマリ章を定義済み |
| R3 | **engine 不変** | drawer 本文は現行 `chapter-1..4` の `renderDrawerPanelBody` のまま開ける |
| R4 | **snapshot 不変** | 購入時 envelope / fullSections は rewrite 不要（表示・入口のみ） |
| R5 | **有料ページの顔** | 悩み起点の方が「読みたい・相談したい」動機に直結する |

**採用しない案:** 章の削除・統合、全文縦積み復活、テーマ＝相談5回の誤解を招く UI。

---

## 4. 採用する5テーマ

`themeExamplesJa` と **完全一致**（新語彙を増やさない）。

| id | テーマ（表面ラベル） |
|----|---------------------|
| T1 | 恋人・近い人との向き合い方 |
| T2 | 仕事・スキルの伸ばし方 |
| T3 | お金・生活の整え方 |
| T4 | これからの動き方 |
| T5 | 疲れたときの戻り方 |

**Hub 6行目（維持）:** 相談返書で整理する / 保存版に紐づく相談

---

## 5. 5テーマとⅠ〜Ⅳ章の対応表

| テーマ | プライマリ章 | 関連章 | 主な engine / reader コンテンツ |
|--------|-------------|--------|--------------------------------|
| T1 恋人・近い人 | **Ⅲ 無理を知る** | Ⅰ, Ⅱ | `s6_relation`, `s5_friction`, Ch3 DomainMatrix, GridArticleCommViz |
| T2 仕事・スキル | **Ⅱ 構造を読む** | Ⅰ, Ⅲ | `s3_essence`, `s4_strengths`, TraitInteraction, Ch2 深読み |
| T3 お金・生活 | **Ⅳ 楽に扱う** | Ⅲ | `s7_work`, WorkGuideCards, PracticalGuidance, Ch3 DomainMatrix（生活負荷） |
| T4 これから | **Ⅱ 構造を読む** | Ⅳ, Ⅰ | `s3` 判断・優先、`s2` 全体像、Ch4 次の一手（**運勢・1年予測は出さない**） |
| T5 疲れ | **Ⅳ 楽に扱う** | Ⅲ | Ch4 実践ガイド、回復モジュール、`s5` 消耗条件 |

**Ⅰ 輪郭の位置づけ:** 全テーマの土台。プライマリにはしないが、関連章として常にリンク候補。

---

## 6. 5テーマと ConsultRoom Step 1 テーマの対応表

| Hub 表面テーマ | ConsultRoom Step 1（`themeExamplesJa`） | 一致 |
|----------------|----------------------------------------|------|
| T1 | 恋人・近い人との向き合い方 | 完全一致 |
| T2 | 仕事・スキルの伸ばし方 | 完全一致 |
| T3 | お金・生活の整え方 | 完全一致 |
| T4 | これからの動き方 | 完全一致 |
| T5 | 疲れたときの戻り方 | 完全一致 |

**返書レンズ（`consultReplyThemePartMap` PRIMARY）:** Hub プライマリ章と同一に保つ。

| テーマ | 返書プライマリ章 | visualKind（返書） |
|--------|-----------------|-------------------|
| T1 | Ⅲ | communication |
| T2 | Ⅱ | stability |
| T3 | Ⅳ | stability |
| T4 | Ⅱ | stability |
| T5 | Ⅳ | stability |

---

## 7. 5テーマごとの primary chapter

| テーマ | primary | drawer `panel` id（実装参照） | anchor |
|--------|---------|------------------------------|--------|
| T1 | Ⅲ 無理を知る | `chapter-3` | `section-strain` |
| T2 | Ⅱ 構造を読む | `chapter-2` | `section-structure` |
| T3 | Ⅳ 楽に扱う | `chapter-4` | `section-practice` |
| T4 | Ⅱ 構造を読む | `chapter-2` | `section-structure` |
| T5 | Ⅳ 楽に扱う | `chapter-4` | `section-practice` |

**実装原則:** テーマ行クリック → 上記 `chapter-N` の既存 drawer 本文を開く（新規 engine セクションは作らない）。

---

## 8. 5テーマごとの related chapters

| テーマ | related（表示順） | 用途 |
|--------|------------------|------|
| T1 | Ⅰ 輪郭を見る、Ⅱ 構造を読む | 自分の出方・距離の土台 |
| T2 | Ⅰ 輪郭を見る、Ⅲ 無理を知る | 輪郭＋負荷の読み合わせ |
| T3 | Ⅲ 無理を知る | 生活負荷・消耗の見える化 |
| T4 | Ⅳ 楽に扱う、Ⅰ 輪郭を見る | 次の一手・全体像（非予言） |
| T5 | Ⅲ 無理を知る | 崩れやすい条件の特定 |

**W-A2（任意）:** drawer パネル先頭または Hub sublabel に「関連する保存版の章」として secondary リンクを置く。

---

## 9. Hub 表示案（主ラベル）— **v1.2 確定（4章統合）**

| 行 | pill | 主ラベル | sublabel | 開く先 |
|----|------|---------|----------|--------|
| 1 | Ⅰ | 自分の形を知る | 今の悩みを読み直す土台 | `chapter-1` |
| 2 | Ⅱ | 仕事・これからの進め方 | 力が出る条件と、優先順位を見る | `chapter-2` |
| 3 | Ⅲ | 恋人・近い人との向き合い方 | 距離感・言葉選び・無理の出方を見る | `chapter-3` |
| 4 | Ⅳ | お金・生活・疲れの整え方 | 生活の余白と、戻り方を見る | `chapter-4` |
| 5 | 返書 | 相談返書で整理する | 保存版に紐づく相談 | `consult` |

**廃止（W-A1 初版のみ）:** 5テーマ直列6行（恋人 / 仕事 / お金 / これから / 疲れ を各行に分割）。

**Hub ヘッダ（現行維持候補）**

- overline: 保存版の入口
- title: この保存版で読み返すこと
- lead: 気になるところから、静かに読み返せます。（または W-A1 で「いまのテーマから読み返せます」に微調整可 — Product Truth 監査後）

---

## 10. Hub sublabel 案 — **v1.2**

v1.2 では **章 pill（Ⅰ〜Ⅳ）+ 関心ラベル + 1行 sublabel**。ローマ数字の章名を sublabel に重ねない（骨格は pill で示す）。

相談行: 保存版に紐づく相談（現行維持）。pill: 返書。

**v1.1 案（5テーマ直列）:** プライマリ章 + 関連章を sublabel に列挙 — **v1.2 では不採用**。

---

## 11. 「恋人・近い人との向き合い方」の注意点

| やらない（公開面・Hub / bridge / 返書導線） | 扱う範囲（自分側） |
|------------------------------------------|-------------------|
| 相性診断・相性占いに見せる表現 | 自分側の**距離感** |
| 復縁・恋愛成就・うまくいく保証 | **言葉選び**・受け取り方の癖 |
| 相手の気持ち・本音の**断定** | **無理の出方**（消耗・平気のふり等） |
| 他者の性格鑑定（Product Truth 外） | **戻し方**・整え方（Ⅲ primary + ⅠⅡ 関連） |

**W-A1 コピー監査:** Hub 主ラベル・sublabel・パネル先頭1行に「相手はこう思っている」系を入れない。

---

## 12. 「仕事・スキルの伸ばし方」の注意点

| やらない | 扱う範囲 |
|----------|----------|
| 転職・退職の**判断代行** | **力が出やすい条件**（Ⅱ primary） |
| 収入・昇給・年収の**保証** | **疲れやすい条件**・負荷のたまり方（関連 Ⅲ） |
| 職業適性診断・「向いている職」断定 | **無理なく続けやすい整え方**（関連 Ⅳ） |
| キャリア占い・成功約束 | 保存版の構造・強みの読み返し（engine 本文は変更しない） |

**W-A1 コピー監査:** 「転職すべき」「この仕事が合う」に読める副題・CTA を避ける。

---

## 13. 「お金・生活の整え方」の注意点

| やらない | 扱う範囲 |
|----------|----------|
| **投資助言**（銘柄・ファンド・仮想通貨等） | **生活の余白**・休む間隔 |
| **借金**返済・借り換え・ローンの具体助言 | **判断疲れ**の整理 |
| **税金・法律**・契約の判断代行 | **日々の安定**の整え方（リズム・負荷） |
| **収入が上がる**・稼ぐ・貯める**断定** | **優先順位**の整理（何を先に整えるか） |
| **家計の具体判断**の代替（いくら使う・割る等） | `s7_work`・Ch4 PracticalGuidance 内の**生活の扱い** |

| 補足 | |
|------|--|
| primary Ⅳ「楽に扱う」＝整え方・戻し方 | 専章 engine 追加は **W0–W-A2 では不要** |
| 深度不足 | **UI コピー・bridge** で補う（snapshot / engine は後回し） |

---

## 14. 「これからの動き方」の注意点

| やらない | 扱う範囲 |
|----------|----------|
| **運勢・予言・占い**・開運 | **いまの優先順位**の整理 |
| **1年予測**・流年・カレンダー型タイムライン | **迷い**の論点整理 |
| 未来・結果の**断定・保証** | **負荷の少ない進め方**（Ⅱ + 関連 Ⅳ） |
| 「今年の運勢」「見取り図」型 UI（W-A1 では出さない） | 次の一手（**非予言**の地味な表現） |

**禁止語（公開面）:** 占い・鑑定・当たる・開運・予言・運勢 等 — `PAID_DTR_PRODUCT_IDENTITY.termsNotForPrimaryUse` と整合。

**future 検討（別 GO — 本 W0 / W-A1 では実施しない）**

| 案 | ゲート条件 | engine / snapshot 影響 |
|----|-----------|------------------------|
| 「これから1年の見取り図」等の表面コピー | **別 Category・別 Product Truth 監査** | 現行 envelope だけでは不足する可能性大 → **engine 追加 or 表示レイヤー専用コピー**が必要なら snapshot 方針を先に固定 |
| W-A1 | 上記を**一切掲げない** | **影響なし** |

---

## 15. W0 ゲートの範囲（W0-DOCS / HARDENING）

**W0 でやること（本資料のみ）**

- テーマ ↔ Ⅰ〜Ⅳ ↔ Consult Step 1 の対応表・リスクガードの固定
- 下記ファイルの **read-only 存在・責務確認**（コード変更なし）

| 参照（読むだけ） | 確認すること |
|-----------------|-------------|
| `components/dtr/PremiumDrawerHub.tsx` | 現行4章行 + consult の組み立て・entry/panel 分離 |
| `lib/m55/paidDtrProductCopy.ts` | `PAID_DTR_DRAWER_HUB`, `themeExamplesJa`, `PAID_DTR_CHAPTERS` |
| `components/dtr/ConsultRoom.tsx` | Step 1 `THEMES` = `themeExamplesJa` |
| `lib/m55/consult/consultReplyThemePartMap.ts` | PRIMARY 章マップ |
| `components/dtr/DtrFullReader.tsx` | `renderDrawerPanelBody` / `chapter-1..4` |

**W0 でやらないこと**

- `paidDtrProductCopy.ts` / `PremiumDrawerHub.tsx` 等の**実装編集**
- W-A1 **実装対象ファイルの最終確定**（候補は §19 に記載するが、**確定は W-A1-IMPLEMENT-LOCAL ゲート**）
- commit / push / deploy
- Preview Harness・copy unification matrix 等の **add**

---

## 16. Product Truth リスク

| リスク | 緩和 |
|--------|------|
| 5テーマ＝相談5回 | テーマ行は**読むだけ**。消費は consult **送信時のみ**。説明カード・meta「相談返書 1件」維持 |
| 無制限チャットに見える | 相談行・ConsultRoom 既存文言維持（保存版紐づき・1テーマ） |
| 恋人＝相性・復縁・他者断定 | §11 遵守 |
| 仕事＝転職・収入保証・適性診断 | §12 遵守 |
| お金＝金融サービス | §13 遵守 |
| これから＝占い・1年予測 | §14 遵守 |
| 章との不一致クレーム | sublabel / W-A2 関連章リンクで Ⅰ〜Ⅳ を明示 |
| 件数・価格変更 | `includedCount: 1`, `totalCapPerReport: 5`, `additionalPriceYen: 500` — **変更しない** |

---

## 17. saved snapshot 影響

| 層 | 影響 |
|----|------|
| 購入時 `envelope` / `fullSections` | **なし**（rewrite・backfill 不要） |
| 既存購入者の本文 | **なし** |
| Hub / copy / open マップ | **表示のみ**（W-A1 以降） |
| Consult 履歴の legacy theme | `consultReplyThemePartMap` LEGACY マップはそのまま |

---

## 18. 実装 Wave 案

| Wave | 内容 | 触る候補 |
|------|------|----------|
| **W0** | 本資料（対応表 SSOT + リスクガード） | `docs/review/` のみ |
| **W-A1** | `PAID_DTR_DRAWER_CHAPTER_ENTRIES` + Hub 4章統合行 + `activeEntryId` | `paidDtrProductCopy.ts`, `PremiumDrawerHub.tsx` |
| **W-A2** | テーマパネル内「関連する保存版の章」リンク | `DtrFullReader.tsx` |
| **W-A3** | Consult テーマ preselect（任意） | `ConsultRoom.tsx` |
| **W-B** | 章本文・グラフ・深読みコピー研磨 | UI ラベル優先、`dtrEngine` は原則触らない |
| **defer** | engine 新セクション・snapshot・お金専章 | 不要と判断 |

**順序:** W0 → W-A1 → Human → commit/push → W-A2 → … → W-B（CHAPTERS-COPY 系列と並行可）

---

## 19. W-A1 最小実装範囲（候補 — W-A1 ゲートで確定）

> **W0 では本節を確定しない。** 実装に入るのは `CATEGORY-1-M55-DTR-CORE-THEME-FIRST-ENTRY-W-A1-IMPLEMENT-LOCAL` 以降。

**In scope（候補）**

1. `lib/m55/paidDtrProductCopy.ts` — `PAID_DTR_DRAWER_CHAPTER_ENTRIES`（4章統合 + pill Ⅰ〜Ⅳ）
2. `components/dtr/PremiumDrawerHub.tsx` — `DRAWER_HUB_CHAPTER_ROWS` + consult；`activeEntryId`；`chapter-1..4` / `consult` を開く
3. `components/dtr/DtrFullReader.tsx` — **open ロジック・本文は変更しない**（`renderDrawerPanelBody` 維持）— 変更なしが原則

**Out of scope（W-A1）**

- `dtrEngine.ts` / snapshot / DB / API / Stripe / Clerk
- ConsultRoom / ConsultReplyCard 変更
- 03 TOC / full 縦積み復活
- テーマ行の ticket 消費・checkout 導線
- Preview Harness / docs matrix の add・commit

**CSS:** W-A1 では `PremiumDrawerHub.module.css` は **行数増のみなら触ってよい**、W1.5 entry card 強調は壊さない。

---

## 20. Human review checklist

**確認 URL（local）:** `http://localhost:3000/dev/dtr-drawer-preview?withConsult=1`  
**確認 URL（production）:** `https://m55-webv2.vercel.app/dtr/core`（購入済みアカウント）

| # | 項目 | PASS 条件 |
|---|------|-----------|
| H1 | Hub に4章統合行 + 相談が表示 | `PAID_DTR_DRAWER_CHAPTER_ENTRIES` |
| H2 | 各テーマ行で primary 章 drawer が開く | §7 の panel と一致 |
| H3 | テーマ行タップで ticket 消費しない | consult 送信しない限り消費なし |
| H4 | 「相談返書で整理する」行が残る | consult drawer が開く |
| H5 | 相談説明カードは非クリック・1行（HOTFIX 維持） | `d544677` 挙動維持 |
| H6 | 01 / 02 / Notice / footer 維持 | HOTFIX 維持 |
| H7 | 03 TOC / 保存版を読む / full 縦積みなし | 未復活 |
| H8 | 恋人/仕事/お金/これからに禁止領域感がない | §11–14 |
| H8b | 恋人＝相性・復縁保証に見えない | §11 |
| H8c | 仕事＝転職・収入保証に見えない | §12 |
| H8d | お金・これからに金融/占い/1年予測感がない | §13–14 |
| H9 | 390px で Hub 4行 + consult が崩れない | 横スクロール・重なりなし |
| H10 | W1.5 入口カード強調（entry / panel 分離）維持 | glow が本文全体を包まない |

---

## 参照コード（変更しない — マッピング根拠）

| ファイル | 役割 |
|----------|------|
| `lib/m55/paidDtrProductCopy.ts` | `PAID_DTR_DRAWER_CHAPTER_ENTRIES`, `PAID_DTR_DRAWER_THEME_ENTRIES`（相談のみ） |
| `lib/m55/consult/consultReplyThemePartMap.ts` | `PRIMARY_THEME_PART_MAP` |
| `components/dtr/PremiumDrawerHub.tsx` | 現行4章行 + consult |
| `components/dtr/DtrFullReader.tsx` | `renderDrawerPanelBody` / `chapter-1..4` |

---

## 変更履歴

| 版 | 日付 | 内容 |
|----|------|------|
| v1 | 2026-06-01 | 初版 — THEME-FIRST-ENTRY W0-DOCS |
| v1.1 | 2026-06-01 | W0-DOCS-HARDENING — テーマ別リスクガード（恋人・仕事・お金・これから）、W0 範囲明確化、W-A1 候補化 |
| v1.2 | 2026-06-01 | W-A1 FOUR-CHAPTER-INTEGRATION — Hub を5テーマ直列から4章統合へ。`PAID_DTR_DRAWER_CHAPTER_ENTRIES`。Consult Step 1 は5テーマ維持 |
