# M55 2027 End-to-End UX Journey Rev1

## Document status

DRAFT（docs-only。route・state・transition・loading・error・mobile・a11y・ethical conversion の normative owner）

## Revision

Rev1（2026-07-12）

## Authority domain

**画面順序、state 遷移、progress/back/resume、loading truth、error recovery、mobile/a11y 要件、ethical conversion boundary** の唯一 owner。

## Current implementation base

- base SHA: `ab7988ebe6f6f871933c42e057615b2c4771dc2b`
- 実測 routes: `app/**/page.tsx`

## Owns

- current / target journey map
- questionnaire interaction contract
- result information architecture（構造のみ）
- conversion boundary
- loading / error / resume 分類
- compatibility journey（設計）
- analytics event timing 候補（payload なし）

## Does not own

- 価格（Product Truth 参照）
- 商品 copy 本文（copy authority 参照）
- selector / composition algorithm（technical SSOT 参照）
- test threshold（QA Master Matrix 参照）
- phase / task ID（Master Roadmap 参照）

## References only

| path | purpose |
|---|---|
| `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` | 商品境界・claim |
| `docs/planning/M55_2027_COMMERCIAL_MASTER_ROADMAP_REV1.md` | UX wiring phase |
| `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` | 5視点 IA |
| `docs/planning/M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | 6問 schema |
| `docs/ssot/M55_WEB_UI_ARCHITECTURE_SSOT_v1_2026-03-07.md` | design system |
| `docs/ssot/M55_VISUAL_TOKEN_SPEC_v1.md` | visual tokens |

## Change-control rule

- output schema freeze 前は inventory / prototype のみ
- 価格・CTA 文言の正本は Product Truth / copy modules 参照
- 独自 CSS 数値の固定はしない

---

## 1. Current live route map

| route | purpose | status | auth | notes |
|---|---|---|---|---|
| `/` | entry redirect | PUBLICLY_LIVE | optional | → `/home` 307 |
| `/home` | 探索ハブ | PUBLICLY_LIVE | optional | frozen per home rule |
| `/core` | 無料結果（legacy DOB） | PUBLICLY_LIVE | Clerk owner | fp-v1 未接続 |
| `/dtr` | 保存版ハブ | PUBLICLY_LIVE | signed-in typical | saved report |
| `/dtr/lp` | 保存版 LP | PUBLICLY_LIVE | optional | conversion entry |
| `/dtr/core` | DTR core surface | PUBLICLY_LIVE | varies | |
| `/reply` | 追加読み解き wizard | PUBLICLY_LIVE | entitlement | structured questions |
| `/reply/result` | 追加読み解き結果 | PUBLICLY_LIVE | entitlement | |
| `/pricing` | プラン表示 | PUBLICLY_LIVE | optional | Product Truth 参照 |
| `/support` | サポート | PUBLICLY_LIVE | optional | |
| `/legal/*` | 法務 | PUBLICLY_LIVE | optional | tokushoho/terms/privacy/refund |
| `/synastry` | 相性 route 存在 | DESIGN_ONLY | HOLD | compatibility runtime 未接続 |
| `/purchase/success` | 購入戻り | PUBLICLY_LIVE | signed-in | entitlement 確認 |

---

## 2. Target personal journey（PLANNED wiring）

```text
/home
→ DOB intake
→ six questions（one per screen）
→ truthful short processing
→ free result（useful standalone）
→ saved-report depth explanation
→ checkout（price visible — Product Truth 参照）
→ saved report hub（/dtr）
→ additional reading（/reply）
→ compatibility entry（HOLD until personal QA GREEN）
→ re-analysis entry（PLANNED）
```

---

## 3. Questionnaire interaction（§10.3）

**MUST:**

- one question per screen
- clear progress indication
- previous-answer review 可能
- result manipulation pressure なし
- useful free result 表示前に purchase prompt なし
- deterministic answer persistence
- mobile keyboard / focus safe
- accessibility labels
- reduced motion 尊重

**MUST NOT:**

- fake AI animation
- infinite loading loop
- 回答を変えろという圧力
- checkout への premature redirect

schema 詳細は questionnaire semantic contract 参照。

---

## 4. Result information architecture

### 4.1 Free result structure（PLANNED display）

| block | role |
|---|---|
| summary | 全体要約 |
| DOB stable baseline | 10資質 + baseline 輪郭 |
| current five views | answer projection |
| alignment/divergence | 1点要約 |
| strain（if applicable） | optional category |
| recovery（if applicable） | optional category |
| saved-report depth point | 深さプレビュー |

詳細 copy は composition contract / Product Truth 参照。

### 4.2 Paid result structure

| block | role |
|---|---|
| four chapter surfaces | 章ごとに distinct role |
| saved state | 再読可能 |
| reload persistence | 同一 snapshot |
| version-safe display | legacy 区別 |
| additional-reading entry | 1テーマ整理 |

---

## 5. Conversion boundary（ethical）

**MUST:**

- free result に standalone value
- paid depth を正確に説明（Product Truth 参照）
- false scarcity なし
- fake discount なし
- hidden entitlement なし
- checkout 前に price visible（Product Truth authority）
- support/refund access visible
- purchase button を偽装しない
- back navigation をブロックしない

**MUST NOT:**

- ritual 中の決済挿入
- dark pattern
- fake urgency

---

## 6. Loading truth

| class | what happens | user message rule |
|---|---|---|
| local deterministic processing | fp-v1 / selector pure compute | 短い処理中。AI と偽らない |
| server generation | chapter / reply gen | 実際に生成中。秒数は創作しない |
| payment transition | Stripe redirect | 決済画面へ遷移 |
| snapshot loading | saved report fetch | 保存版を読み込み中 |
| additional-reading generation | consult generate | 追加読み解きを作成中 |

**MUST NOT claim:**

- 「AIが考えています」— deterministic stage で
- 固定秒数 — 実測 authority なし

cancel/retry: idempotent な箇所のみ retry 許可。ticket は成功完了まで消費しない。

---

## 7. Error and partial-failure states

| error class | UX requirement |
|---|---|
| invalid DOB | 修正可能、scary copy 禁止 |
| incomplete questionnaire | resume へ誘導 |
| unknown version | fail-closed、support へ |
| generation failure | retry 可能、secret 非表示 |
| persistence failure | 再試行、data loss 明示 |
| payment return without entitlement | support ルート、再購入圧力抑制 |
| entitlement exists but report unavailable | 準備中表示、誤 complete 禁止 |
| ticket generation partial failure | complete 扱い禁止、ticket 保持 |
| compatibility consent incomplete | 続行ブロック |

**MUST:**

- raw error / secret / internal ID を表示しない
- support route 提示
- partial failure を complete 扱いしない

---

## 8. Resume, reload and history

| concern | definition |
|---|---|
| questionnaire resume | 未完了回答の再開 |
| free-result reload | 同一 sealed result の再表示 |
| saved-report reload | snapshot からの再読 |
| additional-reading history | 過去 reply の一覧 |
| version compatibility | legacy vs selector-enabled 表示 |
| stale snapshot handling | 黙って再生成しない |

---

## 9. Mobile-first

**MUST（minimum）:**

- 320px 級幅で overflow なし
- adequate tap targets
- text scaling 対応
- stable CTA placement
- keyboard safe（input focus）
- reduced motion
- long Japanese text readability
- safe-area 考慮

数値詳細は `M55_VISUAL_TOKEN_SPEC_v1` / `M55_WEB_UI_ARCHITECTURE_SSOT_v1` 参照。本ファイルは独自 pixel 値を固定しない。

---

## 10. Accessibility

**MUST（minimum）:**

- semantic headings
- label/input association
- keyboard navigation
- focus management（wizard step）
- progress announcement
- error association（aria-describedby）
- contrast（design system 準拠）
- reduced motion
- screen-reader-safe dynamic updates

---

## 11. Compatibility journey（DESIGN_ONLY）

### 11.1 One-person perspective mode

```text
本人 DOB + answers
→ 相手 DOB
→ 関係ステータス選択
→ 結果（断定・score なし）
```

### 11.2 Mutual-participation mode

```text
A consent + input
→ B consent + input
→ two-person comparison
→ 結果（双方視点、verdict なし）
```

**MUST NOT connect runtime until:**

- personal Production QA GREEN
- consent/data contract GREEN（Master Phase P9）

catalog 参照: `lib/m55/compatibility/pairReadingCatalog.v1.ts`

---

## 12. Analytics boundary（future event names only）

**MAY（候補 event name — 実装は別 contract）:**

- journey_start
- question_step_completed
- free_result_reached
- paid_plan_viewed
- checkout_started
- purchase_completed
- saved_report_viewed
- additional_reading_started
- additional_reading_completed
- compatibility_entry_viewed

**MUST NOT send:**

- DOB
- nickname
- answer IDs / combinations
- primary theme
- selector IDs
- generated text
- relationship details
- email
- raw user ID

payload contract は analytics 専用 gate で定義する。

---

## 13. Authentication boundaries

| surface | typical auth |
|---|---|
| /core | Clerk owner for seal |
| /dtr, /reply | signed-in + entitlement |
| /pricing, /legal | public |
| checkout | signed-in or guest draft path（既存） |

---

## 14. Legacy vs new path

| path | classification |
|---|---|
| /core DOB-only | LEGACY — 維持しつつ fp-v1 path を追加 |
| /dtr hybrid chapter | LEGACY — selector path と並存期間あり |
| selector-enabled fingerprint | PLANNED — Gate 2–6 |

legacy 結果の黙って上書き禁止。

---

## 15. State transition matrix（PLANNED wiring）

| from state | user action | to state | guard |
|---|---|---|---|
| home_idle | start DOB | dob_input | none |
| dob_input | valid DOB submit | question_1 | DOB validation pass |
| question_N | answer select | question_N+1 | N < 6 |
| question_6 | answer select | processing | all answers sealed |
| processing | compute complete | free_result | deterministic success |
| processing | compute fail | error_retry | fail-closed |
| free_result | view depth preview | free_result | no purchase required |
| free_result | proceed to checkout | checkout_prep | user intent |
| checkout_prep | Stripe redirect | payment_external | price visible（Product Truth） |
| payment_external | success return | entitlement_check | webhook idempotent |
| entitlement_check | grant confirmed | saved_report_hub | entitlement exists |
| saved_report_hub | open chapter | chapter_view | saved snapshot |
| saved_report_hub | start additional reading | reply_wizard | ticket available |
| reply_wizard | complete generation | reply_result | success only consumes ticket |
| reply_wizard | partial fail | reply_error | ticket preserved |
| saved_report_hub | compatibility entry | compat_hold | personal P8 GREEN only |

---

## 16. Focus and keyboard contract

**MUST:**

- wizard step 進行時に focus を次の primary control へ移動
- back 操作後は前 step の選択済み control に focus 復帰
- modal / overlay 内で focus trap
- Escape で安全に閉じられる surface のみ閉じる

**MUST NOT:**

- focus を視覚的に隠したまま操作可能にする
- keyboard だけで完了不能な mandatory path を作る

---

## 17. Reload truth table

| surface | reload behavior | stale handling |
|---|---|---|
| questionnaire in progress | resume from sealed answers | incomplete → resume prompt |
| free result | same sealed output | version mismatch → fail-closed message |
| saved report | load persisted snapshot | missing snapshot → support route |
| additional reading result | load history entry | partial → not marked complete |
| compatibility（PLANNED） | pair snapshot reload | consent re-check if policy requires |

---

## 18. Ethical conversion checklist（release gate）

| check | requirement |
|---|---|
| standalone free value | free result readable without paywall |
| paid depth accuracy | matches Product Truth chapter/add-on scope |
| price before pay | visible on pricing / checkout path |
| support visible | `/support` reachable from conversion path |
| refund visible | `/legal/refund` reachable |
| no disguised CTA | purchase buttons labeled honestly |
| no blocked back | browser back safe on wizard |
| no fake scarcity | no artificial countdown |
| no notification UI | bell/badge/counter 禁止（workspace rule） |
| no score UI | %/ranking/gauge 禁止（workspace rule） |

---

## 19. Route future role summary

| route | future role |
|---|---|
| /home | exploration hub（frozen） |
| /core | free result primary surface |
| /dtr | saved report hub |
| /dtr/lp | conversion landing |
| /reply | additional reading wizard |
| /synastry | compatibility entry（HOLD） |
| /pricing | plan comparison（Product Truth 参照） |

---

## 20. UX ownership boundary reminder

本ファイルは **遷移と state** のみを規定する。商品名・価格・章本文・algorithm は Product Truth / technical SSOT が所有。QA threshold は QA Master Matrix が所有。phase 順序は Master Roadmap が所有。
