# M55 2027 Product Truth Rev1

## Document status

DRAFT（docs-only。商品事実・claim boundary の normative owner）

## Revision

Rev1（2026-07-12）

## Authority domain

ユーザーが **何を受け取るか**、商品境界、commercial claims、entitlement 意味、AI/非AI 開示、データ利用境界、**価格 authority 参照**、禁止 claim の唯一 owner。

## Current implementation base

- base SHA: `ab7988ebe6f6f871933c42e057615b2c4771dc2b`
- 公開 copy runtime: `lib/m55/paidDtrProductCopy.ts`、`lib/m55/topFreeEntryPublicCopy.ts`、`lib/m55/m55LogicPublicCopy.ts`
- 価格 canonical contract: `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md`
- 回帰 test evidence: `lib/m55/legalSupportPublicCopy.test.ts`、`lib/m55/paidDtrProductCopy.test.ts`

## Owns

- 商品名と提供範囲
- free / paid / additional-reading / compatibility の境界
- entitlement 意味（利用可能・使用済み・付帯件数）
- AI / 非AI の開示区分
- データ保存・第三者送信のユーザー向け説明
- **verified 価格の記載**（本ファイルのみ）
- PROHIBITED_TO_CLAIM 一覧
- HUMAN_DECISION_REQUIRED 一覧

## Does not own

- phase 順序・task ID（Master Roadmap 参照）
- 画面遷移・loading UI（UX Journey 参照）
- test threshold（QA Master Matrix 参照）
- selector / questionnaire algorithm（technical SSOT 参照）

## References only

| path | purpose |
|---|---|
| `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` | **canonical** product/pricing contract |
| `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | normative copy candidate（existing SSOT） |
| `lib/m55/paidDtrProductCopy.ts` | **runtime** publication implementation |
| `lib/m55/topFreeEntryPublicCopy.ts` | free entry copy（runtime） |
| `lib/m55/legalSupportPublicCopy.test.ts` | **test evidence**（SSOT/runtime parity 回帰） |
| `lib/m55/paidDtrProductCopy.test.ts` | **test evidence**（pricing/copy 回帰） |
| `docs/planning/M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | evidence / metadata 契約 |
| `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` | 5視点契約 |
| `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` | phase / release |

## Change-control rule

- 価格変更は canonical SSOT と runtime の整合確認後のみ本ファイル更新
- 新商品・新価格の創作禁止（verified authority なしに追加しない）
- technical algorithm は参照のみ
- canonical / runtime / test の不一致は **HUMAN_DECISION_REQUIRED** または authority collision resolution gate へ送る（silent ignore 禁止）

### Pricing authority hierarchy（3層）

| 層 | owner path | 役割 |
|---|---|---|
| **canonical** | `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` | 価格・商品構造の normative owner |
| **runtime** | `lib/m55/paidDtrProductCopy.ts` 等 | 公開状態の実装証拠（canonical policy そのものではない） |
| **test evidence** | `lib/m55/legalSupportPublicCopy.test.ts`、`lib/m55/paidDtrProductCopy.test.ts` | SSOT/runtime parity の回帰証拠（**primary product authority ではない**） |

---

## 1. Truth classification

| 分類 | 意味 |
|---|---|
| PUBLICLY_LIVE | Production でユーザーが利用可能 |
| MERGED_STATIC_ONLY | main に存在、runtime 未接続 |
| DESIGN_ONLY | 設計・tests のみ、公開未許可 |
| PLANNED | 契約固定済み・未実装 |
| PROHIBITED_TO_CLAIM | 公開表現禁止 |
| HUMAN_DECISION_REQUIRED | 人間判断未完了 |

---

## 2. Free product

### 2.1 Verified current

| 項目 | 値 | 分類 |
|---|---|---|
| public name | 無料の見取り図 | PUBLICLY_LIVE |
| entry authority | `lib/m55/topFreeEntryPublicCopy.ts` | PUBLICLY_LIVE |
| current runtime | `/core` — birthDate ベース legacy result | PUBLICLY_LIVE |
| visible foundation | 10資質レーン + DOB radar（5軸数値） | PUBLICLY_LIVE |
| six-question projection | fp-v1 pure layer | MERGED_STATIC_ONLY |
| align/diverge visible point | 契約上 PLANNED | PLANNED |

### 2.2 Future contract（PLANNED）

**MUST:**

- DOB stable baseline を維持
- 5つの視点（answer projection）を表示
- 1点の align/diverge 要約を表示
- 保存版の深さプレビューを具体的に示す

**MUST NOT:**

- 無料結果を購入前提のプレースホルダーにしない
- 診断・スコア・% を表示しない

Free result は **購入なしでも有用** でなければならない。

---

## 3. Saved report（保存版）

### 3.1 Verified current

| 項目 | 値 | authority |
|---|---|---|
| public framing | 保存版 | runtime: `lib/m55/paidDtrProductCopy.ts` |
| chapter count | 4章 | test evidence: legal/support tests |
| Light 商品名 | 保存版ライト | canonical + runtime |
| Light 価格 | **¥1,000（税込）** | canonical: `WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` / runtime: `paidDtrProductCopy.ts` / test: `legalSupportPublicCopy.test.ts` |
| FULL 商品名 | 保存版FULL | canonical + runtime |
| FULL 価格 | **¥1,480（税込）** | canonical: `WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` / runtime: `paidDtrProductCopy.ts` / test: `legalSupportPublicCopy.test.ts` |
| 4章本文 | ライトとFULLで共通 | test evidence: support copy tests |

**価格 authority path:** canonical SSOT が normative owner。runtime module は公開実装証拠。test files は回帰証拠のみ（primary authority ではない）。

### 3.2 Future personalisation（PLANNED）

**MUST（接続後）:**

- DOB baseline + questionnaire answers + versioned selector bundle
- 4章は役割が異なる（構造差）
- versioned snapshot で同一入力なら同一保存版に戻れる

**MUST NOT:**

- 収入・借金・経済状況の推測
- 恋人存在の前提

---

## 4. Additional reading（追加読み解き）

### 4.1 Verified current

| 区分 | 値 | 分類 | authority |
|---|---|---|---|
| public framing | 追加読み解き | PUBLICLY_LIVE | runtime: `lib/m55/paidDtrProductCopy.ts` |
| included entitlement（Light） | 1件 | PUBLICLY_LIVE | canonical + runtime + test evidence |
| included entitlement（FULL） | 合計5件 | PUBLICLY_LIVE | canonical + runtime + test evidence |
| Light → FULL upgrade | **¥600（税込）** | PUBLICLY_LIVE | canonical + runtime: `paidDtrProductCopy.ts` / test: `legalSupportPublicCopy.test.ts` |
| legacy standalone additional reading | **¥500（税込）** | legacy / newSalesStopped | runtime: `PAID_DTR_LEGACY_ADDITIONAL_REPLY_TICKET`（`newSalesStopped: true`） |

**商品境界（必須区別）:**

| 区分 | 説明 |
|---|---|
| included entitlement | 保存版購入に付帯する利用枠（Light 1件 / FULL 合計5件） |
| Light → FULL upgrade | ライト購入後の FULL 化（**¥600（税込）**）。追加読み解き単品ではない |
| legacy standalone sale | 旧・単品追加読み解き（**¥500（税込）**）。**新規販売停止** |
| current new-sales availability | legacy ¥500 単品の新規購入 CTA は使用しない。upgrade と standalone を同一商品として扱わない |

**MUST NOT:**

- ¥600 を追加読み解き単品価格と呼ぶ
- legacy ¥500 単品を現行販売中と claim する
- 価格変更や legacy 商品再開を本ファイルで決定する

### 4.2 Product boundary

**MUST:**

- saved-report grounded（保存版文脈必須）
- one selected theme
- structured question flow（wizard）
- 成功完了まで ticket を消費しない

**MUST NOT:**

- free-form AI chat として提供
- 新規診断として提供
- partial failure を complete 扱い
- 送信前の不正 ticket 消費

---

## 5. Compatibility（相性）

| 項目 | 分類 |
|---|---|
| public product name（設計） | DESIGN_ONLY — `lib/m55/compatibility/pairReadingCatalog.v1.ts`「2人の距離の読み解き」 |
| public route / purchase | DESIGN_ONLY — runtime HOLD |
| engine reuse | PLANNED — personal engine 完了後 |

### 5.1 Modes（PLANNED）

| mode | 説明 |
|---|---|
| one-person perspective | 本人 DOB+answers + 相手 DOB + 本人側関係整理 |
| mutual-participation | A/B consent + 双方入力 + 二人比較 |

**MUST NOT:**

- 相手の内面断定
- score / ranking / good-bad verdict
- 結婚・別れの推奨
- 未来予測
- 相性％

---

## 6. Re-analysis and repeat usage

**分類:** PLANNED

**MAY（product rationale）:**

- 状況が変わった
- テーマが変わった
- 関係文脈が変わった
- 別角度から読み直したい

**MUST NOT:**

- 定期的な利用需要の固定主張
- subscription 必然性
- fake expiry / fake urgency

再解析価格は **HUMAN_DECISION_REQUIRED**（§11）。

---

## 7. AI disclosure

### 7.1 Stage classification

| stage | 分類 |
|---|---|
| DOB / questionnaire / align-diverge / selector resolution | deterministic rule-based（MERGED_STATIC_ONLY 〜 PLANNED） |
| paid chapter body（現行 hybrid path） | AI-assisted text stages — PUBLICLY_LIVE（既存 hybrid） |
| additional reading generation | AI-assisted — PUBLICLY_LIVE（既存 consult path） |
| selector catalog / resolver | 非AI — MERGED_STATIC_ONLY / PLANNED |
| compatibility composition | PLANNED — DESIGN_ONLY |

### 7.2 MUST / MUST NOT

**MUST:**

- deterministic 出力を AI 生成と表示しない
- AI 使用箇所のみ AI-assisted と説明可能にする

**MUST NOT:**

- AI 未使用箇所で AI を主張
- provider 名の不要な user-facing 露出
- 医療・法律・投資助言化

---

## 8. Data handling

| data | 扱い |
|---|---|
| DOB | sensitive personal input |
| questionnaire answers | self-reported current-expression input |
| saved reports | persisted user asset |
| Stripe metadata（現行） | P0_OPEN — raw DOB/nickname 残存（remediation PLANNED） |
| external services | minimum necessary only |

### 8.1 Stripe metadata prohibited target（PLANNED state）

**MUST NOT place in Stripe metadata:**

- DOB
- nickname
- raw answer IDs
- answer combinations
- generated report text
- primary theme
- selector IDs

詳細は Commerce Evidence contract 参照。

---

## 9. Commerce and entitlement

Product Truth owns:

- 何を購入したか（商品名・tier）
- 何にアクセスできるか（保存版閲覧・追加読み解き件数）
- 利用可能 / 使用済み の用語
- refund / support ルート（`/support`、`/legal/refund`）

技術的 ledger 形式・webhook 冪等は Commerce Evidence contract 参照。

---

## 10. Prohibited public claims（PROHIBITED_TO_CLAIM）

- scientifically validated personality diagnosis
- psychological test / 心理検査
- fortune-telling guarantee / 占いの確実性
- future prediction / 未来を当てる
- medical diagnosis
- legal advice
- investment advice
- compatibility percentage / 相性○%
- relationship verdict（良い/悪い/相性抜群）
- guaranteed improvement / 必ず良くなる
- AI claim where AI is not used
- scientific personality measurement claim

禁止 claim の **言及**（本節）は許可。商品 promise としての採用は禁止。

---

## 11. Human decisions（HUMAN_DECISION_REQUIRED）

### 11.1 Stripe classification

| 項目 | 内容 |
|---|---|
| owner | commerce / legal |
| 判断内容 | Stripe 日本向け restricted businesses への該当性と書面確認 |
| 依存 | Commerce Evidence contract §3 |
| 判断前禁止 | 新規 commercial claim 拡張、metadata 方針の無断変更 |

### 11.2 customer_email necessity

| 項目 | 内容 |
|---|---|
| owner | commerce / privacy |
| 判断内容 | checkout に email 必須とするか、最小化するか |
| 依存 | Commerce Evidence contract |
| 判断前禁止 | email 収集 UI の拡張 |

### 11.3 DOB supported range

| 項目 | 内容 |
|---|---|
| owner | personal engine / Product Truth |
| 判断内容 | サポートする生年月日範囲の公式化 |
| 依存 | fingerprint contract（現状 UNFIXED） |
| 判断前禁止 | 範囲外を正式サポートと claim |

### 11.4 Authoritative paid-copy owner

| 項目 | 内容 |
|---|---|
| owner | docs / copy |
| docs 側 | `M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` — normative copy candidate / existing SSOT |
| runtime 側 | `paidDtrProductCopy.ts` — current publication implementation |
| 判断内容 | docs と runtime の優先順位（最終 normative owner） |
| 依存 | P0-002 collision map |
| 判断前禁止 | 二重正本での公開 copy 更新、collision 解消前の新公開 copy 追加 |
| 現状 | **HUMAN_DECISION_REQUIRED** — 一方を未承認で最終正本と断定しない |

### 11.5 Future re-analysis pricing

| 項目 | 内容 |
|---|---|
| owner | Product Truth / commerce |
| 判断内容 | 再解析の価格・件数モデル |
| 判断前禁止 | 価格の創作公開 |

### 11.6 Membership

| 項目 | 内容 |
|---|---|
| owner | Growth / Product Truth |
| 判断内容 | subscription 導入要否 |
| 依存 | retention baseline（Phase P13） |
| 判断前禁止 | membership の公開・実装 |

---

## 12. Authority reference registry（must not duplicate）

| path | status | referenced by |
|---|---|---|
| `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` | CONTRACT FIXED | §2, §3 |
| `docs/planning/M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | CONTRACT DRAFT | §2 |
| `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | CONTRACT FIXED | §3 |
| `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_VERSIONED_SELECTOR_IMPLEMENTATION_PLAN_REV1.md` | Gate 1 merged | §3 |
| `docs/planning/M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | CONTRACT DRAFT | §8, §9 |
| `docs/ssot/WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` | FREEZE | §3 |
| `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | normative copy candidate（HOLD） | §3, §11.4 |
| `lib/m55/paidDtrProductCopy.ts` | runtime publication（HOLD collision） | §3, §4 |
| `lib/m55/legalSupportPublicCopy.test.ts` | test evidence | §3, §4 |
| `lib/m55/paidDtrProductCopy.test.ts` | test evidence | §3, §4 |
| `lib/m55/topFreeEntryPublicCopy.ts` | PUBLICLY_LIVE | §2 |
| `lib/m55/m55LogicPublicCopy.ts` | PUBLICLY_LIVE | method authority |
| `lib/m55/compatibility/pairReadingCatalog.v1.ts` | DESIGN_ONLY | §5 |

algorithm 詳細・ID 一覧は上記 technical paths のみが所有。本ファイルは複製しない。
