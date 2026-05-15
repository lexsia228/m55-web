# M55_UNIFIED_AUTHORITY_AUDIT_AND_CONSOLIDATION_REPORT_20260324_v1.md

Status: READY-FOR-CURSOR
Purpose: 現行 M55 Web / logic / pricing / chat / design law を一本化するための監査報告
Decision mode: Adopt / Hold / Archive
Scope: public surface, logic package, design SSOT folder, boost conflict, report/chat commercialization

---

## 0. 監査結論

M55 はここまでの議論で、**現行公開面の正本** と **将来商品群の設計メモ** が混ざりやすい状態にある。  
ただし、いま勝っている authority は明確に切り分け可能であり、適切に整理すれば **Cursor のハルシネーションと誤実装はかなり防げる**。

### 最終判定
- current Web public surface: **一本化可能**
- logic package / canonical engine / golden audit: **一本化済み**
- Boost / refill / old subscription surface: **未統一。現行 public には入れない**
- old design SSOT folder: **二次参照 + 歴史文書へ再配置が必要**

### 一番重要な一文
**現行 M55 Web の公開面は、free -> entry report (旧DTR) -> purchaser-only concierge room の一本線で固定し、  
旧 Free/Standard/Premium・Boost構想・chat-first shell・public generic chat は current Web authority から外す。**

---

## 1. 現行 authority stack（勝者SSOT）

## A. 現行の最上位（ACTIVE / PRIMARY）

1. `M55_MONETIZATION_SSOT_FULL_FREEZE_v1_0.md`
2. `M55_LOGIC_LAYERED_INTEGRATION_PACKAGE_SSOT_20260323_v1.md`
3. `M55_CANONICAL_IO_CONTRACT_SSOT_v1.md`
4. `M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md`
5. `M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md`
6. `M55_LAYER3_VOCABULARY_AND_NARRATIVE_PACK_SSOT_v1.md`
7. `M55_BINDING_ROLLOUT_FROM_DEFINITION_TO_CONNECTION_SSOT_20260324_v1.md`
8. `M55_TEN_STEM_PROFESSIONAL_MAPPING_SSOT_20260324_v1.md`
9. `M55_PUBLIC_SKIN_STRATEGY_SSOT_20260324_v1.md`

### 理由
- layered package は、current Web に old Free/Standard/Premium UI や Tarot / Ads / Calendar monetization surface を混ぜないことを明示している。 fileciteturn72file5turn72file6
- roadmap update は、現フェーズで subscription-shell revival や generic AI chat public revival を non-goal としている。 fileciteturn72file0
- page mapping / logic package は Layer1/2/3 分離、unknown key = fail、public-safe wording を前提にしている。 fileciteturn72file5turn72file6

---

## 2. 現行公開面の product truth

## 現在の公開 truth
- free
- entry report（旧DTR）1本
- purchaser-only AI concierge room

## 非採用（current Web に混ぜない）
- Free / Standard / Premium 表面UI
- subscription-first public UI
- Tarot daily surface
- Ads surface
- Calendar monetization surface
- app commerce tabs
- public generic AI chat revival
- 5-tab bottom nav や old commerce surface

### 根拠
layered integration package が、これらを current Web に混ぜてはいけないと明示。 fileciteturn72file5turn72file9  
roadmap でも subscription-shell revival / generic AI chat revival は non-goal。 fileciteturn72file0

---

## 3. 公開面の最終構造（採用案）

### Public primary tabs
- Home
- 本質
- レポート
- My

### Purchaser-only conditional tab
- 相談室

### Quiet utility
- サポート
- 返金
- 特商法
- 利用規約
- プライバシー

### 判定
**通常4タブ、購入後は5タブ** が最も整合的。  
`/today` `/weekly` は route と logic scope としては保持するが、公開 primary tabs からはいったん外す。  
理由は public main lane での「今日 / 今週」主語が弱く、M55 の独自性が薄まるため。

---

## 4. free/result/report/chat の役割分離

### Home
- 理解と入力の場
- 10称号、五行ジャンル、円グラフサンプル、入力ゲート、曇り棚

### 本質
- 無料でも存在する基礎閲覧面
- 称号 / 円グラフ / 本質要約
- report 購入者は、同じ本質タブ内で「解像度の上がった本質補足」を閲覧可能

### レポート（旧DTR）
- 購入面 / teaser 面 / reader 面の総称
- public label は「リフレクションレポート」推奨
- internal canonical key は `dtr` のまま維持

### 相談室
- purchaser-only
- report ごとに1スレッド
- public main lane には置かない

---

## 5. report × consult ticket の整合判定

### 採用可能なルール
- entry report には 1 / 1 の相談権を付与
- 追加購入で 2 回まで top-up 可能
- 1 report thread あたり最大 3 / 3
- 上限到達後は閲覧のみ継続
- 新規質問は不可
- さらに聞きたい場合は次の report 購入

### 重要な整理
相談券は **独立した public SKU にしない**。  
あくまで **owned report にぶら下がる補助権利** として扱う。

### これで防げる矛盾
- 将来の高価格 report line-up で「最初から2〜3回付属」の商品が出ても整合する
- current public surface に複数相談商品を並べずに済む
- monetization freeze の「現行 public は一本線」を壊さない

---

## 6. 文字数・応答密度・利用規約整合

### 推奨凍結
- user input: max 500 chars
- warn at 450
- minimum 10
- AI output target: 700-900 chars
- hard cap: 1000 chars

### 判定
この仕様は採用可能。  
ただし「業界標準」を表で主張するのではなく、**M55 の価格・一往復モデルに対する内部標準** として凍結する方が安全。

### 必須反映
- UIカウンター
- 相談室ルール
- 利用規約
- FAQ
- チケット消費条件

---

## 7. 禁止ワード / sanitizer の整合判定

### 採用可能
二層 sanitizer

#### A. 軽度不適切語
- 置換 `※※※`
- 注意文を静かに表示
- ticket は通常消費

#### B. 高リスク語
- 送信ブロック
- ticket 不消費
- 必要なら安全案内へ

### 却下
- すべての禁止ワードを一律伏字
- high-risk 語も伏字で通す運用
- Zero-Knowledge / 100% / 強すぎる security claim

---

## 8. Boost に関する監査統合判定

### 監査結果の要旨
ユーザー監査文のとおり、Boost は
- 価格は上位文書で固定
- しかし「何に使えるか」「SKU inventory」「DTR に適用可能か」が未統一

### 現時点の判断
**Boost は current Web release surface へ入れない。**

### 理由
- 価格 master / inventory / reference schema がズレている
- DTR follow-up 専用か、通常AI / Tarot専用かが未統一
- winner SSOT 1枚化が終わっていない

### 現時点の安全策
- consult top-up は report room 内の追加権利として扱う
- Boost public SKU は hidden のまま
- Boost 本格導入は別 append / winner SSOT で一本化してから

---

## 9. 将来の通常ラインナップとの整合

### 採用
- 現行公開面は `¥1,000 entry report`
- 将来 line-up は通常版 report 群として追加可能
- 価格差は report volume / chapter depth / included consult count で作る

### 不採用
- 「今だけ ¥1,000」
- fake scarcity
- countdown
- price-drift copy

### 重要
将来商品群は **roadmap / design memo / future inventory** に留める。  
current public surface にはまだ出さない。

---

## 10. 旧 design SSOT folder の再配置方針（2026.3.20）

このフォルダは価値がある。  
ただし **全部を active law として読ませるのは危険**。

### A. Secondary supporting law（参照維持）
- PAGE_FAMILY_CONSISTENCY_SSOT.md
- PAGE_SKELETON_SSOT.md
- RESPONSIVE_LAYOUT_SSOT.md
- OPTICAL_HIERARCHY_SSOT.md
- SYSTEM_TYPOGRAPHY_SIGNAL_SSOT.md
- SURFACE_MATERIAL_AND_CONTROL_CHROME_SSOT_v1_0_20260319.md
- ACCESSIBILITY_AND_TOUCH_TARGET_SSOT.md
- CONTENT_DISCLOSURE_AND_DECISION_SSOT.md
- CONTENT_SHELF_SSOT.md
- CHECKOUT_TRUST_SURFACE_SSOT.md
- PURCHASE_JOURNEY_AND_CONVERSION_SSOT.md
- HOW_IT_WORKS_AND_PAYMENT_CLARITY_SSOT.md
- MY_PAGE_OWNERSHIP_CENTER_SSOT.md
- MY_DTR_LIBRARY_AND_OWNERSHIP_SSOT.md
- ENTITLEMENT_AND_CONSULT_COUNTER_SSOT.md
- AI_CHAT_REMAINING_AND_REFILL_FLOW_SSOT.md
- DTR_AI_CHAT_PRODUCT_EXPLANATION_SSOT.md
- RETENTION_RHYTHM_SSOT.md

### B. Historical / archive / do-not-drive-current-build
- M55_CHAT_FIRST_SHELL_SSOT.md
- M55_HOME_CONCIERGE_DOCK_SSOT.md
- MODE_SEPARATION_AND_PERSISTENT_NAV_SSOT_v1_0_20260319.md
- GLOBAL_NAV_VISIBILITY_SSOT.md
- LEGACY_IFRAME_SURFACE_SSOT.md
- IFRAME_RUNTIME_INVISIBLE_SSOT.md
- M55_SHELL_LAW_FIRST_PASS_AUDIT_20260319.md
- CHECKPOINT_APPEND_*.md
- ROADMAP_UPDATE_*.md
- MISSING_SSOT_MATRIX_20260320.md
- empty_error_loading_ssot.md
- kakonoibutu.txt
- 3.22.cp_lm
- CURSOR / HANDOFF / RESET / PATCH prompts

### C. Prompt-only
- M55_CURSOR_SHELL_RESET_FINAL_20260321_v1.md
- M55_CURSOR_HOME_VALUE_SPINE_AND_POPULAR_PATTERN_PATCH_PROMPT_20260321_v1.md
- CURSOR_HANDOFF_PROMPT_20260321_v1.md

### 注記
この分類はファイル名 / これまでの会話文脈 / 既存 authority に基づく。  
内容全文に対する逐条監査ではないため、最終移動前に一度だけ人間確認推奨。

---

## 11. 3.24 logic set の位置づけ

`3.24.web.senjutu/M55_ACTIVE_LOGIC_SET_20260323` は **そのまま active logic law** でよい。

### Active logic set
- M55_MONETIZATION_SSOT_FULL_FREEZE_v1_0.md
- M55_LOGIC_LAYERED_INTEGRATION_PACKAGE_SSOT_20260323_v1.md
- M55_CANONICAL_IO_CONTRACT_SSOT_v1.md
- M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md
- M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md
- M55_LAYER3_VOCABULARY_AND_NARRATIVE_PACK_SSOT_v1.md
- M55_GOLDEN_VECTOR_AUDIT_1983_02_28_SSOT_v1.md

これは current Web / logic / binding の中核 authority として維持。

---

## 12. 一本化後の推奨フォルダ構造

### 00_PRIMARY_ACTIVE_LAW
- monetization freeze
- layered integration package
- canonical io
- entitlement normalization
- page output mapping
- layer3 vocabulary
- binding rollout
- ten stem professional mapping
- public skin strategy

### 10_SECONDARY_SUPPORTING_LAW
- page / layout / typography / shelf / trust / purchase journey / ownership center / consult counter 等

### 20_PRODUCT_RULES_FUTURE
- report line-up planning
- future subscription notes
- future Boost winner SSOT（未作成）
- future gift / relationship / refill expansion（未採用）

### 30_PROMPT_ONLY
- Cursor prompts
- handoff prompts
- reset prompts
- patch prompts

### 40_CHECKPOINT_AND_ROADMAP
- roadmap updates
- checkpoint append
- phase notes

### 90_ARCHIVE_HISTORICAL
- chat-first shell
- concierge dock
- legacy iframe
- old nav laws
- missing matrix
- kakonoibutu
- obsolete CP artifacts

---

## 13. 最重要の一本化ポイント

### Winner rules
1. public surface は free -> entry report -> purchaser-only concierge room
2. internal canonical `dtr` は残す
3. public label は “リフレクションレポート” に変えてよい
4. consult ticket は report attribute であり、public standalone SKU にしない
5. max consult per report thread = 3
6. Boost は勝者SSOT 1枚化までは hidden / non-authoritative
7. Home / pricing / routing / product surface は current release truth を守る

---

## 14. 直近で必要な新規SSOT（不足しているもの）

1. `M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1.md`
- entry report
- future standard reports
- included consult count
- public label / internal canonical relation

2. `M55_REPORT_CONCIERGE_ROOM_SSOT_v1.md`
- thread rules
- consult cap
- add-on rule
- visibility / read-only state
- ticket consumption

3. `M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1.md`
- char limits
- sanitize rules
- block rules
- FAQ / terms copy
- room UI counters

4. `M55_BOOST_WINNER_SSOT_v1.md` （まだ未来）
- SKU名
- pack数
- 価格
- 有効期限
- 消費単位
- DTR適用可否
- subscription 非競合ルール

---

## 15. Final executive verdict

### Adopt now
- 現行 public は 4タブ + purchaser-only 相談室
- entry report + 1/1 consult
- top-up で最大 3/3
- free results は「称号 / 円グラフ / 本質 / 現在の焦点」
- report購入者は本質タブで解像度上昇した読みを保持
- internal canonical `dtr` 維持
- public label だけ report 系へ変更

### Hold
- future standard report product line-up
- boost public SKU
- gift flow
- relationship/public compatibility lane

### Archive / remove from active authority
- chat-first shell
- public concierge dock main-lane
- old bottom-nav / app-commerce revival
- old Free/Standard/Premium public surface

---

## 16. One-line summary

**M55 は、静かな無料結果で理解させ、entry report で深掘りさせ、購入者専用の相談室で継続価値を作る。  
その一本線を壊す旧 surface law / boost drift / old chat-first law は active authority から外す。**
