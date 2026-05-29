# M55 SSOT Body Reflection Mapping v1

**M55 SSOT本体反映マッピング v1**

| 項目 | 値 |
|------|-----|
| 文書種別 | docs/review マッピングアーティファクト |
| 版 | v1 |
| 前提ゲート | CATEGORY_1_M55_SSOT_BODY_REFLECTION_PLANNING_GREEN_READONLY_NO_MUTATION |
| 入力計画 | `docs/review/M55_SSOT_REFLECTION_PLAN_v1.md` |

---

## 0. この文書の位置づけ

本書は **docs/review 専用のセクションレベル・マッピング文書** である。

- 本書は **`docs/ssot` を編集しない**。
- 本書は **`docs/ssot` 本体の変更（body mutation）を承認しない**。
- 本書は **実装を承認しない**（app/code・prompt/code・CSS/layout の変更指示を含まない）。
- 本書は次を **承認しない**：
  - DB / API / payment / auth / webhook の変更
  - Stripe / Clerk / Supabase 設定の変更
  - engine / snapshot / result-label の変更
  - checkout / payment / entitlement / route / product_id / wallet ledger の変更
- 本書の目的は、将来の SSOT 本体反映の前に、**どの `docs/ssot` ファイルのどの節を触ってよいか／触ってはいけないか** を安全に固定することである。
- **`docs/ssot` の実際の編集** は、本マッピングの承認に加え、**別途の明示 GO**（BODY-REFLECTION-DRAFT 等）がない限り行わない。

---

## 1. 入力ソース

### 1.1 レビュー文書

| # | パス |
|---|------|
| 1 | `docs/review/M55_SSOT_REFLECTION_PLAN_v1.md` |
| 2 | `docs/review/M55_HUMAN_REVIEW_MARKING_SHEET_v1.md` |
| 3 | `docs/review/M55_FINAL_HUMAN_COPY_REVIEW_PACKET_STORYFLOW_v1.md` |
| 4 | `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` |
| 5 | `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_SKELETON_v0_1.md` |
| 6 | `docs/review/M55_IMPLEMENTATION_PRE_INSTRUCTION_V0_2_REFINEMENT_REVISED.md` |

### 1.2 承認済み HUMAN_MARK 結果

| 項目 | 結果 |
|------|------|
| final result | **PASS_WITH_CARRYFORWARD** |
| BLOCK | **なし** |
| Product truth BLOCK | **なし** |
| implementation GO | **なし** |
| docs/ssot immediate reflection GO | **なし** |
| prompt/code GO | **なし** |

---

## 2. Candidate docs/ssot target files

| # | target file | confidence | role | allowed use | forbidden use | risk |
|---|-------------|------------|------|-------------|-----------------|------|
| 1 | `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | **high** | product copy / paid DTR / consultation copy master | Product truth **boundary wording**；Storyflow checklist；external copy structure M55-safe transformation；consultation room boundary；温度感/察するUX as **expression policy**；具体承認/話しやすくするUX as **expression/input support policy**；My page functional UI clarification | product truth **value** changes；implementation instructions；prompt/code instructions；CSS/layout instructions；**external copy wording adoption** | **low–medium** |
| 2 | `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` | **high** | product truth / reply credit / entitlement-policy **numeric & ledger source** | **cross-reference only**；copy master / future consult quality SSOT must follow this policy；optional **one paragraph** near definition/scope only if later GO | **§3–§5** Stripe / metadata / webhook / ledger / schema / entitlement changes；price/count changes；wallet ledger changes；checkout/payment behavior changes | **medium** |
| 3 | `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md` | **high** | purchase lane / ¥1,000 and ¥500 lane split source | **cross-reference only**；preserve lane separation | checkout behavior changes；product_id changes；route changes；price changes | **low** |
| 4 | `docs/ssot/POST_REVIEW_UI_SWITCH_SSOT_v1.md` | **medium** | UI switch / storefront freeze / visible wording guardrails | **no change now**；cross-reference only if later GO touches LP/storefront/freeze | broad visual redesign；v0 storytelling changes；storefront freeze bypass | **medium–high** |
| 5 | `docs/ssot/M55_CONSULT_REPLY_QUALITY_AND_ANTI_SYCOPHANCY_SSOT_v1.md` (**new candidate**) | **medium** | future dedicated consult reply quality / anti-sycophancy SSOT | **later (Wave 2):** Anti-sycophancy five-part structure；concrete acknowledgement boundary；other-person/situation perspective；no unconditional validation | prompt implementation；model settings；therapy/legal/medical advice；generic chat promise | **medium** |

**補足:** `docs/ssot` ツリーは 600+ `.md` を含む。本マッピングが列挙する対象以外は **既定で編集禁止** とする。

---

## 3. Reflection category → target map

| ID | category | priority | target | proposed section | change type | Wave | rationale | risk to avoid |
|----|----------|----------|--------|------------------|-------------|------|-----------|---------------|
| A1 | Product truth boundary clarification | A | `M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | §2 Product identity / §7 Consultation / §9 Trust boundaries / §11 Forbidden claims（BODY-DRAFT 時に節番号を実ファイルで再確認） | clarification + cross-reference | **1** | 汎用チャット・誤約束をコピー正本で一本化 | generic chat；unlimited consultation；notification/email promise；medical/therapy/legal/investment/job-change substitute |
| A2 | Product truth / reply credit numeric source | A | `M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` | definition/scope 付近のみ；**cross-reference if needed** | cross-reference only | **1 or later** | 数値正本は policy；コピー SSOT は追従 | accidentally changing price/count/ledger |
| A3 | Purchase lane split | A | `M55_PURCHASE_FLOW_SPLIT.md` | References のみ | cross-reference only | **1 or later** | 1000/500 レーン分離の明示 | checkout/product_id/route drift |
| A4 | Storyflow principles | A | `M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | **新規 §13** Storyflow / screen rhythm checklist | new checklist | **1** | `docs/ssot` に Storyflow 語彙なし；運用規則は copy master が最適 | manual-like long copy；work/career default；over-explaining |
| A5 | External copy structure M55-safe transformation | A | `M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | §13 内または隣接 subsection | allowed/rejected transformation table | **1** | 構造のみ・文言非採用を SSOT 固定 | manipulative copy；overclaim；shame pressure |
| A6 | Anti-sycophancy | A | **新規** `M55_CONSULT_REPLY_QUALITY_AND_ANTI_SYCOPHANCY_SSOT_v1.md`（**推奨**）または copy master appendix | new standalone SSOT preferred；copy master は cross-reference のみ | new SSOT candidate / appendix | **2**（Wave 1 では新規 SSOT 作成しない — 明示 GO なし） | policy §6 は台帳・範囲外が主；返書トーン正本は別文書 | sycophancy；self-justification；generic chat；harsh doubt |
| A7 | Consultation room boundary | A | `M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | §7 consultation / §10 inheritance（ConsultRoom 行） | clarification | **1** | cap・紐づき・入力境界を visible コピー層で固定 | unlimited consultation；generic chat；unclear cap |
| B1 | 温度感 / 察するUX | B | `M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | Expression policy（新規 subsection または §13 付随） | clarification | **1 or 2** | 出力表現のみ；engine 非影響 | gender branching；UI selector creep；result branching |
| B2 | 具体承認 / 話しやすくするUX | B | copy master または future Anti-sycophancy SSOT | Expression/input support policy | clarification | **1 or 2** | 観察ベース vs 操作系承認の区別 | praise-hacking；dependency；sycophancy |
| B3 | My page functional UI | B | `M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | §10 `/my` inheritance または My page subsection | clarification | **1 or 2** | 機能 UI のみ；感情ストーリー化を抑止 | story overload；Entry Report 主ラベル regression；visible 返書チケット主名称 |

### 3.1 Storyflow（A4 詳細）

- **お題 → あるある → 転換 → 読み解き → 次の一手**
- one screen = one scene
- one heading = one topic
- heading 1 line / body 2–3 lines / next action 1 line
- avoid work/career as default
- daily life / close people / words / distance / fatigue
- smartphone-level micro action

### 3.2 External copy M55-safe transformation（A5 詳細）

| 区分 | 内容 |
|------|------|
| **Allowed** | 繰り返しの違和感；責めない再定義；言葉・距離・タイミング・疲れ・期待；保存版に戻す；今の場面に近い入口を1つ |
| **Rejected** | IQ/talent comparison；income/status/success comparison；「人生を無駄にした」；「心理的防衛を無効化する」；「本当の理由が必ず分かる」；3-minute life change；shame pressure；external wording direct copy |
| **Required wording** | **警戒心を下げる**、**読み進めやすくする** — not 心理的防衛を無効化する |

### 3.3 Anti-sycophancy（A6 詳細 — Wave 2）

- acknowledge feelings without correctness verdict
- do not end with あなたは悪くない
- do not say 相手が悪い
- one non-accusatory other-person/situation perspective for conflict themes
- organize mismatch by 言葉 / 距離 / タイミング / 疲れ / 期待
- return to 保存版に紐づく相談
- one small next action

### 3.4 Consultation room boundary（A7 詳細）

- 保存版に紐づく相談
- one theme；short input accepted；long input narrowed
- cap/remaining wording：**付属1 + 追加最大4 = 合計5**、**追加500円**
- no generic chat

### 3.5 温度感（B1 詳細）

- no gender/sex-based logic branching；no 男性脳 / 女性脳
- output-expression layer only：そっと整理する / はっきり整理する / 順番にほどく
- no UI selector approval；no prompt/code implementation approval
- no engine/snapshot/result-label impact

### 3.6 具体承認（B2 詳細）

- observation-based acknowledgement
- not unconditional validation；not praise-hacking；not manipulation；not dependency induction
- recognize what user wrote/noticed；short input acceptable；long input narrowed
- return to 保存版-grounded structure

### 3.7 My page functional UI（B3 詳細）

- functional UI, not emotional story copy
- 保存版再開；相談返書カード；残数表示；購入時点プロフィール注記
- no Entry Report main-label regression

---

## 4. Wave plan

### 4.1 Wave 1 recommended scope

**Allowed later edit targets (BODY-REFLECTION-DRAFT + explicit GO):**

| file | scope |
|------|--------|
| `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | §2, §7, §9, §11 clarification；**新規 §13** Storyflow + M55-safe table；§7/§10 consult boundary；optional Expression / My page（B1–B3） |
| `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` | **optional** definition/scope cross-reference paragraph only |
| `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md` | **optional** §4 References cross-reference only |

**Wave 1 categories:**

- Product truth boundary clarification（A1）
- Storyflow principles（A4）
- External copy structure M55-safe transformation（A5）
- Consultation room boundary（A7）
- optional：温度感 / 具体承認 / My page functional UI（B1–B3）— copy master 節構成が許せば同梱

**Wave 1 must not:**

- create new Anti-sycophancy SSOT（A6）unless user explicitly narrows Wave 1
- touch policy **§3–§5**
- touch checkout/payment/ledger/entitlement
- touch `app/**`, `prompt/**`, CSS
- touch engine/snapshot/result-label

### 4.2 Wave 2 recommended scope

**Allowed later candidate:**

| file | scope |
|------|--------|
| `docs/ssot/M55_CONSULT_REPLY_QUALITY_AND_ANTI_SYCOPHANCY_SSOT_v1.md`（**new file**） | Anti-sycophancy 正本；具体承認の深い境界；reply quality structure |

**Wave 2 categories:**

- Anti-sycophancy（A6）
- 具体承認 deeper boundary（B2 が Wave 1 で未完了の場合）
- consult output structure / reply quality

**Wave 2 must not:**

- implement prompt/code
- change model behavior directly
- create generic chat promise
- create therapy/legal/medical claims

---

## 5. Explicit edit-forbidden map

| target / scope | rule |
|----------------|------|
| `M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` **§3–§5** | no Stripe metadata；no webhook/ledger/schema；no wallet/entitlement logic changes |
| `M55_REPORT_CORRECTION_*` 数値 | no price/count changes（付属1、追加最大4、合計5、500円、1000円レーン） |
| `POST_REVIEW_UI_SWITCH_SSOT_v1.md` | no change unless storefront/freeze explicit GO |
| `M55_SYSTEM_SSOT.md` | no change — changelog/system umbrella, not copy policy target |
| `app/**` | no edit |
| `components/**` | no edit |
| `lib/**` | no edit |
| `supabase/**` | no edit |
| `package.json` | no edit |
| CSS files | no edit |
| prompt/code files | no edit |
| engine / snapshot / result-label files | no edit |
| DB / API / payment / auth / webhook / config | no edit |
| product_id / route / checkout related files | no edit |
| external copy wording | no direct import into SSOT as adopted M55 copy |

---

## 6. Do-not-reflect now

以下は **今回の SSOT 本体反映に入れない**（backlog 参照 1 行まで可）：

- implementation details（コンポーネント実装手順・ファイル変更リスト）
- prompt/code instructions
- UI selector implementation（温度感）
- CSS/layout redesign
- DB / API / payment / auth / webhook
- checkout / payment / entitlement / wallet ledger changes
- engine / snapshot / result-label changes
- external copy **wording** direct adoption
- manipulation framing；shame pressure；success/income/IQ comparison
- backlog **implementation**（Entry Report 表記、/reply wallet visual、v0 visual、snapshot v2、engine audit、notification/email architecture、broad CSS）
- 「心理的防衛を無効化する」as M55 recommended wording

**Implementation-planning only（SSOT に入れない）:** 相談返書ルーム、My page カード、LP、保存版 reader、Free/core bridge — 将来 implementation GO 後に app コピーへ。

---

## 7. Verification plan for later BODY-REFLECTION-DRAFT

将来の `CATEGORY-1-M55-SSOT-BODY-REFLECTION-DRAFT` ゲートで実行する検証（本マッピングは **commit しない**）：

### 7.1 Git / scope

```bash
git status --short
git status --branch --short
git rev-parse HEAD
git rev-parse origin/main
git diff --name-only origin/main
git diff --check
```

- allowed diff files only（Wave に応じて §4 の表と一致）
- **no** `app/**`, `components/**`, `lib/**`, `supabase/**`, `*.tsx`, `*.ts`, `*.css`, `package.json`

### 7.2 Product truth grep（must remain）

`本質の読み解き` / `保存版` / `4章` / `相談返書` / `付属1` / `追加最大4` / `合計5` / `追加500円` / `購入時点プロフィール` / `保存版に紐づく相談`

### 7.3 Forbidden regression grep

`max3` / `700円` / 無制限相談 / なんでも答える / 通知 / メール / 医療 / 治療 / 法律 / 投資 / 転職 / 退職 / 辞めろ / 別れろ — **新規採用として出現したら BLOCK**

### 7.4 External copy safety grep

`心理的防衛を無効化` / `本当の理由` / `3分` / `IQ` / `成功比較` / `収入比較` / `羞恥` / `外部文言直コピ` — **Rejected / risk / forbidden 文脈のみ。推奨コピーとして出現したら BLOCK**

### 7.5 Policy forbidden section diff check

- `M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` の **§3–§5** に diff があれば **BLOCK**（cross-ref 1 段落以外）

### 7.6 docs/ssot-only target check

- Wave 1: copy master + optional policy/purchase split cross-ref only
- Wave 2: + new Anti-sycophancy SSOT if GO

---

## 8. Next gate recommendation

1. **CATEGORY-1-M55-SSOT-BODY-REFLECTION-MAPPING-REVIEW-COMMIT-PLANNING** — 本ファイル review
2. commit `docs/review/M55_SSOT_BODY_REFLECTION_MAPPING_v1.md` only
3. push（別 GO）
4. mapping closeout
5. ユーザー選択：
   - **Wave 1** `CATEGORY-1-M55-SSOT-BODY-REFLECTION-DRAFT`（copy master + optional cross-ref；**明示 GO 必須**）
   - **Wave 2** anti-sycophancy new SSOT planning / DRAFT
   - **pause**

---

## 9. Final verdict

| 項目 | 値 |
|------|-----|
| gate verdict | **GREEN_AS_SSOT_BODY_REFLECTION_MAPPING_DRAFT** |
| artifact scope | **docs/review only**（本ファイル） |
| docs/ssot edited | **no** |
| implementation approved | **no** |
| prompt/code approved | **no** |
| recommended next gate | **CATEGORY-1-M55-SSOT-BODY-REFLECTION-MAPPING-REVIEW-COMMIT-PLANNING** |

---

## 付録 A. 変更禁止の明示（本トラック）

本マッピング作成において、以下は **行っていない／行わない**：

- `docs/ssot` の編集
- 既存 `docs/review` の編集（reflection plan 含む）
- app/code、prompt/code、CSS/layout の変更
- staging / commit / push / deploy
- SQL / DB mutation
- payment / checkout / auth / env / webhook の変更
