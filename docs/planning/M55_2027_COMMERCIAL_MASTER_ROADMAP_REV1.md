# M55 2027 Commercial Master Roadmap Rev1

## Document status

DRAFT（docs-only。実装・commit・push・PR 前の planning authority）

## Revision

Rev1（2026-07-12）

## Authority domain

2027年までの商用完成に向けた **phase 順序、task registry、dependency、critical path、parallel lanes、release gate、backtracking prevention、status registry** の唯一の normative owner。

## Current implementation base

- branch: docs/m55-2027-commercial-master-roadmap-rev1
- base SHA: `ab7988ebe6f6f871933c42e057615b2c4771dc2b`（Gate 1 selector types/catalog merged / Production observed）
- Gate 2 resolver plan: CLOSED GREEN（実装未着手）

## Owns

- North Star と commercial completion states
- 26 task ID の全文 registry（本ファイルのみ）
- critical path と parallel lanes
- entry/exit/STOP 条件
- authority map（1 fact = 1 owner）
- post-baseline backlog
- Human decision の registry 参照先

## Does not own

- 商品価格の正本（Product Truth 参照）
- 公開 copy 本文（既存 copy authority 参照）
- 画面レイアウト・state 遷移詳細（UX Journey 参照）
- selector / questionnaire algorithm（既存 technical SSOT 参照）
- test assertion 本文（QA Master Matrix 参照）

## References only

技術契約・商品 copy・価格の algorithm 詳細は **path + status のみ** 参照する。本文複製禁止。

| path | purpose | status |
|---|---|---|
| `docs/planning/M55_FREE_RESULT_5_VIEW_ANALYSIS_CONTRACT_AND_UX_DESIGN_REV1.md` | 無料5視点・二層分離 | CONTRACT FIXED |
| `docs/planning/M55_FREE_PERSONAL_QUESTIONNAIRE_SEMANTIC_COVERAGE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | 6問 questionnaire | CONTRACT DRAFT |
| `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | 三層 fingerprint | CONTRACT FIXED |
| `docs/planning/M55_PERSONAL_SEMANTIC_FINGERPRINT_VERSIONED_SELECTOR_IMPLEMENTATION_PLAN_REV1.md` | selector gates 1–5 | Gate 1 merged |
| `docs/planning/M55_COMMERCE_COMPLIANCE_EVIDENCE_CONTRACT_AND_ACTUAL_DIFF_PLAN_REV1.md` | commerce evidence E1–E10 | CONTRACT DRAFT |
| `docs/planning/M55_2027_PRODUCT_TRUTH_REV1.md` | 商品事実・claim boundary | DRAFT（本 series） |
| `docs/planning/M55_2027_END_TO_END_UX_JOURNEY_REV1.md` | journey / states | DRAFT（本 series） |
| `docs/planning/M55_2027_QA_MASTER_MATRIX_REV1.md` | QA dimensions / thresholds | DRAFT（本 series） |

## Change-control rule

- task ID の再利用・改変は Human approval 必須
- completed task の dependency 削除禁止
- technical algorithm 変更は既存 technical SSOT のみで実施
- 新 phase 追加は本 Roadmap の改訂 gate 経由のみ
- skipped dependency 禁止

---

## 1. Executive contract（M55 2027 North Star）

M55 は **生年月日を比較的変わりにくい土台** と **自己申告の現在の出方（6問）** を組み合わせ、ユーザーが自分の傾向を読み返せる **決定的・版管理・監査可能** なデジタル資産を提供する商用ソフトとする。

**MUST:**

- 無料結果は購入なしでも有用である
- 有料保存版は無料より明確に深い（4章・保存・再読）
- 追加読み解きは保存版文脈に接地し、1テーマの構造化質問である
- 相性（compatibility）は個人エンジン再利用＋A/B 比較。点数・判定・良し悪しなし
- 収益導線: 無料 → 保存版購入 → 追加読み解き → 相性 → 状況変化時の再解析 → チケット → **retention 証拠後のみ** membership 検討

**MUST NOT:**

- 占い・未来予言・心理診断・科学的性格測定の主張
- 相性％・関係判定・結果保証
- fake AI / fake urgency / dark pattern
- subscription の先行確定

**MAY:**

- event-driven re-analysis（状況・テーマ・関係文脈の変化）
- retention 証拠蓄積後の membership decision gate

---

## 2. Current-state baseline（実測）

| 領域 | 分類 | 備考 |
|---|---|---|
| questionnaire（free-v1 6問） | MERGED_STATIC_ONLY | pure layer 完成。runtime 未接続 |
| fp-v1 fingerprint | MERGED_STATIC_ONLY | variance QA 証拠あり |
| selector catalog | MERGED_STATIC_ONLY | main merged、Production observed |
| resolver | ABSENT | Gate 2 plan GREEN |
| builder selector integration | ABSENT | Gate 3 予定 |
| gmfn-v2 | ABSENT | Gate 3 予定 |
| free result runtime | LEGACY DOB-ONLY | `/core` は birthDate のみ |
| paid runtime | LEGACY / hybrid path | 既存 DTR chapter gen |
| commerce | PUBLICLY_LIVE + P0_OPEN | checkout LIVE、metadata PII 残存 |
| compatibility | DESIGN_ONLY / HOLD | quality matrix のみ、route 未接続 |

---

## 3. Authority map（one fact, one owner）

| 情報 | owner | 他文書の扱い |
|---|---|---|
| phase / task / dependency | **本 Roadmap** | 他文書は phase 名参照のみ |
| 商品名・価格・entitlement・claim | **Product Truth** | 価格再掲禁止 |
| route・state・loading・error | **UX Journey** | copy 詳細は参照のみ |
| test dimension・threshold・evidence | **QA Master Matrix** | assertion 複製禁止 |
| 5視点・questionnaire・fingerprint・selector algorithm | **既存 technical SSOT** | path 参照のみ |
| commerce evidence ledger 形式 | **Commerce Evidence contract** | path 参照のみ |
| 公開 copy 実行時正本 | `lib/m55/paidDtrProductCopy.ts` 等 | Product Truth が参照先を指す |

**分類:** one fact / one owner / references only elsewhere

---

## 4. Master task registry（26件・一意）

各 task は **1回のみ** 登録する。重複登録禁止。

### Phase P0 — Commercial SSOT freeze

#### M55-2027-P0-001

| 項目 | 内容 |
|---|---|
| title | 4-authority document draft freeze |
| owner lane | Master / docs |
| goal | 4 planning authority の草案完成と scope 検証 |
| dependencies | inventory gate GREEN |
| entry conditions | docs branch @ main merge base |
| mutable scope class | `docs/planning/M55_2027_*_REV1.md` NEW のみ |
| completion evidence | 4 files NEW、26 task unique、validation scripts PASS |
| exit conditions | actual-diff review gate へ移行可能 |
| commercial value | 2027 完成の単一ナビゲーション確立 |
| STOP conditions | 対象外 file 変更、task 重複、algorithm 複製 |
| next task | Authority collision resolution map（§4 次項） |

#### M55-2027-P0-002

| 項目 | 内容 |
|---|---|
| title | Authority collision resolution map |
| owner lane | Master / docs |
| goal | paid copy dual authority 等の衝突を参照解決表に固定 |
| dependencies | 4-authority document draft freeze complete |
| entry conditions | 4 docs draft 存在 |
| mutable scope class | Roadmap §3 / Product Truth §authority |
| completion evidence | collision map 記載、micro-patch 要否分類 |
| exit conditions | 実装 gate が参照先を一意に解釈可能 |
| commercial value | 二重正本による実装ブレ防止 |
| STOP conditions | technical SSOT 本文の無断改変 |
| next task | Stripe classification Human decision（§4 次項） |

#### M55-2027-P0-003

| 項目 | 内容 |
|---|---|
| title | Stripe classification Human decision |
| owner lane | Product Truth / commerce |
| goal | Stripe 日本向け制限業種に対する書面確認方針の Human 決定 |
| dependencies | Commerce Evidence contract 参照 |
| entry conditions | Product Truth draft 存在 |
| mutable scope class | Human decision record（docs のみ） |
| completion evidence | `HUMAN_DECISION_REQUIRED` 解消または明示 HOLD + 判断記録 |
| exit conditions | checkout 継続方針が Product Truth に固定 |
| commercial value | 決済継続リスクの明示的管理 |
| STOP conditions | Stripe への無断実装変更 |
| next task | Gate 2 feature branch create（Phase P1） |

### Phase P1 — Personal resolver

#### M55-2027-P1-001

| 項目 | 内容 |
|---|---|
| title | Gate 2 feature branch create |
| owner lane | Personal engine |
| goal | resolver 実装用 feature branch を main から作成 |
| dependencies | Gate 2 plan GREEN、P0 docs freeze |
| entry conditions | `origin/main` @ merge base、同名 branch なし |
| mutable scope class | git branch create only |
| completion evidence | branch HEAD = main base、2-file allowlist 固定 |
| exit conditions | resolver implementation gate 開始可能 |
| commercial value | selector 選択 logic の実装基盤 |
| STOP conditions | catalog/type 変更、main 直接 commit |
| next task | Resolver implementation（§4 次項） |

#### M55-2027-P1-002

| 項目 | 内容 |
|---|---|
| title | Resolver implementation |
| owner lane | Personal engine |
| goal | pure resolver 2 files 実装 |
| dependencies | Gate 2 feature branch created |
| entry conditions | exact allowlist: `resolveIndividualizationSelectorsV1.ts` + test |
| mutable scope class | Gate 2 allowlist 2 files のみ |
| completion evidence | typecheck PASS、focused runtime 13+ tests PASS 計画 |
| exit conditions | PR validation 可能 |
| commercial value | strain/recovery/free/paid selector の決定的選択 |
| STOP conditions | builder 同時変更、catalog 変更 |
| next task | Resolver focused runtime validation（§4 次項） |

#### M55-2027-P1-003

| 項目 | 内容 |
|---|---|
| title | Resolver focused runtime validation |
| owner lane | Personal engine / QA |
| goal | resolver test の直接 runtime 証拠取得 |
| dependencies | Resolver implementation complete |
| entry conditions | standalone `/tmp` emit または installed runner |
| mutable scope class | read-only test execution |
| completion evidence | TAP: tests/pass/fail/exit 記録 |
| exit conditions | merge HOLD 解除 eligible |
| commercial value | selector logic の merge 前品質保証 |
| STOP conditions | package install なしで runner 不能時は infra patch gate |
| next task | Builder selector integration（Phase P2） |

### Phase P2 — Builder / hash / snapshot

#### M55-2027-P2-001

| 項目 | 内容 |
|---|---|
| title | Builder selector integration |
| owner lane | Personal engine |
| goal | fp-v1 builder へ optional selector bundle 接続 |
| dependencies | Resolver validation merged、Production observed |
| entry conditions | Gate 3 file scope frozen |
| mutable scope class | Gate 3 allowlist（builder/types/index） |
| completion evidence | selector bundle present、legacy absence 維持 |
| exit conditions | gmfn-v2 gate 開始可能 |
| commercial value | fingerprint と selector の単一 provenance |
| STOP conditions | silent fallback、selectors:null |
| next task | gmfn-v2 and snapshot versioning（§4 次項） |

#### M55-2027-P2-002

| 項目 | 内容 |
|---|---|
| title | gmfn-v2 and snapshot versioning |
| owner lane | Personal engine |
| goal | selector-enabled hash と snapshot version 境界 |
| dependencies | Builder selector integration complete |
| entry conditions | hash contract frozen（selector plan §20） |
| mutable scope class | Gate 3 allowlist |
| completion evidence | gmfn-v1 既存 snapshot 不変、新規のみ gmfn-v2 |
| exit conditions | composition gate 開始可能 |
| commercial value | 版管理された再読資産 |
| STOP conditions | 既存 snapshot backfill |
| next task | Free composition matrix（Phase P3） |

### Phase P3 — Free composition

#### M55-2027-P3-001

| 項目 | 内容 |
|---|---|
| title | Free composition matrix |
| owner lane | Personal engine |
| goal | 無料 narrative の role-aware composition |
| dependencies | gmfn-v2 and snapshot versioning complete |
| entry conditions | selector bundle stable |
| mutable scope class | composition module（Gate 定義） |
| completion evidence | free useful standalone、visible answer variance |
| exit conditions | UX wiring（free）開始可能 |
| commercial value | 無料の単独価値確保 |
| STOP conditions | purchase pressure copy 混入 |
| next task | Paid four-chapter composition（Phase P4） |

### Phase P4 — Paid composition

#### M55-2027-P4-001

| 項目 | 内容 |
|---|---|
| title | Paid four-chapter composition |
| owner lane | Personal engine |
| goal | 4章 distinct role の paid composition |
| dependencies | Free composition matrix complete |
| entry conditions | paidChapterEmphasisIds stable |
| mutable scope class | paid composition module |
| completion evidence | 4章構造差、free より明確に深い |
| exit conditions | P5 QA 開始可能 |
| commercial value | 保存版の差別化価値 |
| STOP conditions | 章間重複、unsupported inference |
| next task | 1,215 questionnaire and selector variance QA（Phase P5） |

### Phase P5 — Logic and copy QA

#### M55-2027-P5-001

| 項目 | 内容 |
|---|---|
| title | 1,215 questionnaire and selector variance QA |
| owner lane | QA |
| goal | logic determinism と selector distribution 検証 |
| dependencies | Paid four-chapter composition complete |
| entry conditions | QA Master Matrix thresholds 参照 |
| mutable scope class | test execution / evidence docs |
| completion evidence | matrix PASS 記録 |
| exit conditions | copy QA 並行可能 |
| commercial value | 無効組合せ・ゼロ効果回答の排除 |
| STOP conditions | 全 DOB×1215 直積の誤要求 |
| next task | Copy naturalness and claim-safety QA（§4 次項） |

#### M55-2027-P5-002

| 項目 | 内容 |
|---|---|
| title | Copy naturalness and claim-safety QA |
| owner lane | QA |
| goal | 日本語自然さ・claim safety・重複検査 |
| dependencies | Paid four-chapter composition complete |
| entry conditions | Human editorial protocol 参照 |
| mutable scope class | QA evidence |
| completion evidence | automated + Human minimum PASS |
| exit conditions | UX wiring 開始可能 |
| commercial value | 商用前の表現安全 |
| STOP conditions | 診断・予言表現の混入 |
| next task | Free questionnaire UX wiring（Phase P6） |

### Phase P6 — UX wiring

#### M55-2027-P6-001

| 項目 | 内容 |
|---|---|
| title | Free questionnaire UX wiring |
| owner lane | UX |
| goal | 6問 one-screen flow の runtime 接続 |
| dependencies | Free composition output shape frozen |
| entry conditions | UX Journey §10.3 参照 |
| mutable scope class | app/components（UX allowlist gate） |
| completion evidence | questionnaire E2E、resume/back |
| exit conditions | free result UX 接続可能 |
| commercial value | 現在の出方入力の実利用 |
| STOP conditions | output schema 未 freeze 時の最終 UI 固定 |
| next task | Free and paid result UX wiring（§4 次項） |

#### M55-2027-P6-002

| 項目 | 内容 |
|---|---|
| title | Free and paid result UX wiring |
| owner lane | UX |
| goal | free/paid result surface の接続 |
| dependencies | Free questionnaire UX wiring complete、Paid composition complete |
| entry conditions | error/loading truth frozen |
| mutable scope class | UX allowlist gate |
| completion evidence | route smoke、mobile/a11y baseline |
| exit conditions | commerce closeout 並行可能 |
| commercial value | end-to-end 体験の完成 |
| STOP conditions | ethical conversion 境界違反 |
| next task | Stripe metadata PII remediation（Phase P7） |

### Phase P7 — Commerce / privacy

#### M55-2027-P7-001

| 項目 | 内容 |
|---|---|
| title | Stripe metadata PII remediation |
| owner lane | Commerce / privacy |
| goal | raw DOB/nickname の metadata 排除 |
| dependencies | P0-003 方針、Commerce Evidence contract |
| entry conditions | opaque reference 設計 frozen |
| mutable scope class | checkout/webhook allowlist |
| completion evidence | metadata scan PASS |
| exit conditions | offer snapshot gate |
| commercial value | 決済コンプライアンス |
| STOP conditions | 無断 customer_email 追加 |
| next task | Offer snapshot and evidence ledger（§4 次項） |

#### M55-2027-P7-002

| 項目 | 内容 |
|---|---|
| title | Offer snapshot and evidence ledger |
| owner lane | Commerce |
| goal | 購入時 Product Truth snapshot + append-only ledger |
| dependencies | Stripe metadata PII remediation complete |
| entry conditions | HYBRID architecture（commerce contract） |
| mutable scope class | DB migration gate |
| completion evidence | snapshot + ledger write 証拠 |
| exit conditions | export gate |
| commercial value | 紛争・返金対応証跡 |
| STOP conditions | 実ユーザーデータ export 実行 |
| next task | Fulfillment and access evidence export（§4 次項） |

#### M55-2027-P7-003

| 項目 | 内容 |
|---|---|
| title | Fulfillment and access evidence export |
| owner lane | Commerce |
| goal | fulfillment/access の redacted evidence bundle |
| dependencies | Offer snapshot and evidence ledger complete |
| entry conditions | idempotency contract |
| mutable scope class | export builder gate |
| completion evidence | export sample（synthetic）PASS |
| exit conditions | personal Production QA |
| commercial value | commercial evidence complete へ |
| STOP conditions | PII を含む export |
| next task | Personal Production observation（Phase P8） |

### Phase P8 — Personal Production QA

#### M55-2027-P8-001

| 項目 | 内容 |
|---|---|
| title | Personal Production observation |
| owner lane | QA |
| goal | personal path の Production SHA/route 証拠 |
| dependencies | Free/paid result UX wiring complete、Fulfillment evidence export complete |
| entry conditions | READ_ONLY observe gate |
| mutable scope class | observe only |
| completion evidence | diagnostics + route smoke |
| exit conditions | controlled purchase QA |
| commercial value | PRODUCTION_READY 判定 |
| STOP conditions | Production POST / mutation |
| next task | Controlled purchase QA（§4 次項） |

#### M55-2027-P8-002

| 項目 | 内容 |
|---|---|
| title | Controlled purchase QA |
| owner lane | QA / commerce |
| goal | 制御された購入・fulfillment・access 証拠 |
| dependencies | Personal Production observation complete |
| entry conditions | runbook 参照 |
| mutable scope class | CONTROLLED_LIVE gate |
| completion evidence | purchase/access ledger 一致 |
| exit conditions | compatibility contract 開始可能 |
| commercial value | COMMERCIAL_EVIDENCE_COMPLETE |
| STOP conditions | 本番 ticket 無断消費 |
| next task | Compatibility consent and data contract（Phase P9） |

### Phase P9–P12 — Compatibility

#### M55-2027-P9-001

| 項目 | 内容 |
|---|---|
| title | Compatibility consent and data contract |
| owner lane | Compatibility |
| goal | 一人/双方モードの consent・data boundary 固定 |
| dependencies | Controlled purchase QA GREEN |
| entry conditions | personal Production QA GREEN |
| mutable scope class | docs + pure types gate |
| completion evidence | consent contract draft + review |
| exit conditions | engine gate |
| commercial value | 相性機能の安全基盤 |
| STOP conditions | personal QA 未完了時の runtime |
| next task | Compatibility engine and composition（§4 次項） |

#### M55-2027-P10-001

| 項目 | 内容 |
|---|---|
| title | Compatibility engine and composition |
| owner lane | Compatibility |
| goal | pair reading engine + composition |
| dependencies | Compatibility consent and data contract complete |
| entry conditions | `lib/m55/compatibility/**` allowlist |
| mutable scope class | compatibility module |
| completion evidence | quality matrix 拡張 PASS |
| exit conditions | UX/commerce gate |
| commercial value | COMPATIBILITY_READY へ |
| STOP conditions | score/verdict 導入 |
| next task | Compatibility UX and commerce（§4 次項） |

#### M55-2027-P11-001

| 項目 | 内容 |
|---|---|
| title | Compatibility UX and commerce |
| owner lane | Compatibility / UX / commerce |
| goal | 相性 journey + commerce wiring |
| dependencies | Compatibility engine and composition complete |
| entry conditions | UX Journey §10.11 |
| mutable scope class | route + checkout allowlist |
| completion evidence | route smoke、entitlement |
| exit conditions | Production QA |
| commercial value | 第4収益柱 |
| STOP conditions | 公開を DESIGN_ONLY 前に実施 |
| next task | Compatibility Production QA（§4 次項） |

#### M55-2027-P12-001

| 項目 | 内容 |
|---|---|
| title | Compatibility Production QA |
| owner lane | QA |
| goal | 相性 path の Production 証拠 |
| dependencies | Compatibility UX and commerce complete |
| entry conditions | compatibility QA matrix |
| mutable scope class | observe + controlled |
| completion evidence | Production observe PASS |
| exit conditions | growth baseline |
| commercial value | 相性の商用運用開始 |
| STOP conditions | A/B データ漏洩 |
| next task | Analytics privacy contract（Phase P13） |

### Phase P13–P14 — Growth

#### M55-2027-P13-001

| 項目 | 内容 |
|---|---|
| title | Analytics privacy contract |
| owner lane | Growth / privacy |
| goal | privacy-safe event contract |
| dependencies | Personal Production observation baseline |
| entry conditions | UX Journey §10.12 |
| mutable scope class | analytics contract docs |
| completion evidence | prohibited payload 一覧 + review |
| exit conditions | retention events |
| commercial value | 計測と privacy の両立 |
| STOP conditions | raw answer/DOB 送信 |
| next task | Retention baseline events（§4 次項） |

#### M55-2027-P13-002

| 項目 | 内容 |
|---|---|
| title | Retention baseline events |
| owner lane | Growth |
| goal | journey timing の baseline 計測 |
| dependencies | Analytics privacy contract complete |
| entry conditions | implementation gate 別途 |
| mutable scope class | analytics impl gate |
| completion evidence | event inventory + sample |
| exit conditions | membership decision |
| commercial value | GROWTH_BASELINE_READY |
| STOP conditions | subscription 先行 |
| next task | Membership decision gate（Phase P14） |

#### M55-2027-P14-001

| 項目 | 内容 |
|---|---|
| title | Membership decision gate |
| owner lane | Growth / Product Truth |
| goal | retention 証拠に基づく membership 要否の Human 決定 |
| dependencies | Retention baseline events complete |
| entry conditions | OPTIONAL_MEMBERSHIP_READY 判定材料 |
| mutable scope class | Human decision |
| completion evidence | 決定記録または継続 HOLD |
| exit conditions | post-baseline backlog 更新 |
| commercial value | 継続課金の根拠ある判断 |
| STOP conditions | 証拠なし subscription 公開 |
| next task | post-baseline backlog |

---

## 5. Fixed critical path（release spine + parallel mandatory lane）

本節は **release spine**（商用完了の主軸）と **parallel mandatory lane**（並行必須レーン）を併記する。完全な一直線と parallel lane を同時に主張しない。

### Primary personal-product spine

```text
P0 Commercial SSOT freeze
→ P1 resolver（Gate 2）
→ P2 builder / gmfn-v2 / snapshot
→ P3 free composition
→ P4 paid composition
→ P5 logic / copy QA
→ P6 UX wiring
```

### Mandatory commerce/privacy lane（Lane B）

```text
開始: P0 の必要判断完了後（P7-001 開始可能）
並行範囲: P7-001〜003 は P1〜P6 と並行可能（P6 完了後まで開始禁止ではない）
完了必須: P8 前
```

### Release join gate（P8）

```text
P8 開始条件: P6 complete AND P7 complete（join gate）
```

### After the join

```text
P8 personal Production QA
→ P9–P12 compatibility（P8 GREEN 後のみ）
→ P13–P14 growth baseline
```

**critical path 外（post-baseline）:** subscription、referral、SNS、branding experiments、provider expansion、new product variants、coupon

---

## 6. Parallel lanes

### Lane A — Personal engine

- **開始:** P1-001 直後
- **並行可能:** P1→P2→P3→P4→P5 は lane 内 sequential
- **並行禁止:** P3 前の UX 最終固定、P2 前の composition

### Lane B — Commerce / privacy（parallel mandatory lane）

- **開始:** P0 の必要判断完了後（P7-001 開始可能。P6 完了後まで開始禁止ではない）
- **並行可能:** P7-001〜003 は P1〜P6 と並行
- **完了必須:** P8 join gate 前（P8 は P6 + P7 両方完了が必須）

### Lane C — UX

- **開始:** P3/P4 output-shape freeze 後
- **並行可能:** P6-001 と P5 部分並行
- **並行禁止:** schema freeze 前の最終 UI

### Lane D — Compatibility

- **開始:** P8 GREEN 後のみ
- **並行禁止:** personal Production QA 前の runtime

### Lane E — Growth

- **開始:** P8 personal baseline 後
- **並行禁止:** analytics privacy 前の payload 実装

---

## 7. Backtracking prevention（entry gates）

| 開始点 | 未達時の禁止 |
|---|---|
| resolver | catalog/type 変更、builder 同時実装 |
| builder | resolver 未 merge、gmfn 契約未固定 |
| composition | selector bundle 未 stable |
| UX | free/paid output shape 未 stable |
| commerce | Product Truth + privacy contract 未参照 |
| compatibility | personal P8 未 GREEN |
| growth | Production baseline + analytics privacy 未 GREEN |

---

## 8. Commercial completion states

| state | 定義 |
|---|---|
| PRODUCT_COMPLETE | 1,215 deterministic、free useful、paid 4章 distinct、追加読み解き grounded |
| COMMERCIAL_EVIDENCE_COMPLETE | offer snapshot、fulfillment/access evidence、metadata PII 排除 |
| PRODUCTION_READY | SHA/route health、Human editorial minimum、controlled purchase QA |
| COMPATIBILITY_READY | personal baseline + consent contract + no score/verdict |
| GROWTH_BASELINE_READY | privacy-safe analytics only |
| OPTIONAL_MEMBERSHIP_READY | retention evidence 後の別 Human gate |

---

## 9. Human decisions and holds

| topic | status | owner doc |
|---|---|---|
| Stripe classification | HUMAN_DECISION_REQUIRED | Product Truth §11 |
| customer_email necessity | HUMAN_DECISION_REQUIRED | Product Truth §11 |
| DOB supported range | HUMAN_DECISION_REQUIRED | Product Truth §11 |
| paid product copy authority collision | HUMAN_DECISION_REQUIRED | Product Truth §11.4 |
| future membership | HUMAN_DECISION_REQUIRED | Product Truth §11.6 |

決定前は該当 topic の公開 claim 拡張と実装接続を禁止する。

---

## 10. Post-baseline backlog

subscription、referral coupon、SNS sharing、visual branding experiments、growth experiments、AI provider expansion、new product variants — **critical path 完了後** のみ検討。

---

## 11. Duplicate task audit

**分類:** DUPLICATE_TASKS_ZERO（26 ID × 1 registry）

---

## 12. Next gate

`CATEGORY-2-M55-2027-COMMERCIAL-MASTER-ROADMAP-SSOT-ACTUAL-DIFF-REVIEW-REV1`
