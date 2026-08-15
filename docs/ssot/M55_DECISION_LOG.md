# M55 Decision Log

Status: **Decisions authority (Tier E)**

## ACCEPTED

| Decision | Reason |
|---|---|
| Product Authority Pack as M55 pilot | Human-approved P0 override; durable authority separated from conversation memory |
| Canonical Production host is m-55.jp | Human-frozen Production authority |
| m55.jp is non-authoritative | Not current M55 Production authority — process incident, not Production code defect |
| 個人無料は認識・信頼を作る | 解決策先行は M55 の理解精度を証明できない |
| 結果前 theme selection を廃止する（target） | ユーザーが結果を誘導したと感じる禁止ファネル |
| 無料は「何が起きやすいか」 | 有料との境界を明確化 |
| 有料は「なぜ・条件・扱い方」 | Premium 価値の中心 |
| 個人無料は Pair を含む M55 全体の信用証明 | Self free が Pair 信頼にも接続 |
| HOME と下流ページを同等品質へ | HOME だけ高品質は不十分 |
| SSOT merge 後に新 GPT スレッドへ移行 | 会話ログを authority にしない |
| 共有 commercial quality control plane を導入する | 固定ビューポート単発 gate では responsive 欠陥を再現できない。`lib/commercialQuality/**` を repository-independent engine、`lib/m55/commercialUx/qualityControl/**` を M55 adapter として分離し、既存 authority は参照のみ |
| canonical baseline は candidate → human-approved の二段のみ | 機械生成物が自己承認で canonical に昇格する経路を構造的に閉じる |

## REJECTED

| Decision | Reason |
|---|---|
| 無料結果前に仕事 / 関係 / 疲れ / 判断を選ばせる | 禁止ファネル — 現行 runtime debt として記録のみ |
| 無料で解決策を出し切る | 有料境界を破壊 |
| 無料を極端に薄くし有料へ誘導する | 信用証明として機能しない |
| HOME だけ高品質にする | ファネル全体の品質要件 |
| 有料 Pair 完成前に HOME を最終 SSOT 化 | HOME_FINAL = NOT_YET |
| 古い compatibility worktree で実装継続 | main より古く stale |
| 架空口コミ・利用数・精度 | 禁止 claim |
| 会話ログをそのまま authority にする | 再現性・検証不能 |
| m55.jp を canonical Production として扱う | Human-frozen authority は m-55.jp |
| 記憶・会話履歴を Production/worktree 真実として採用 | Product Authority Pack で機械検証可能な durable authority を導入 |

## Recorded deferrals (P2)

Recorded under `M55_COMMERCIAL_QUALITY_CONTRACT.md`「P2 は明示的な Human 受容または本ログへの記録がある場合のみ close 可」.

Active temporary deferrals: **none** (`M55_ACCESSIBILITY_DEFERRALS` is empty).

### Closed in Commit B (contrast)

| decisionRecordId | Route | Selector | measuredRatio before | measuredRatio after | Classification | Owner | Closure |
|---|---|---|---:|---:|---|---|---|
| `CQ-A11Y-DEFER-METHOD-SECTION-ORDER-2026-07-30` | `/how-m55-works` | `li:nth-child(10) > h3 > .M55MethodSections_sectionOrder__*` | 4.36 | 15.74 (ink `#201c34` on card composite) | `CLOSED_IN_COMMIT_B` | `components/pages/M55MethodSections.module.css` | axe `color-contrast` — CSS-only ink correction; deferral matcher removed |
| `CQ-A11Y-DEFER-PUBLIC-FOOTER-COPY-2026-07-30` | `/how-m55-works` | `.PublicFooter_copy__*` | 2.69 | 9.06 (navy `rgba(11,26,43,0.82)` on `#f3ede2`) | `CLOSED_IN_COMMIT_B` | `app/_components/PublicFooter.module.css` | axe `color-contrast` — CSS-only navy correction; deferral matcher removed |

Machine authority: `M55_ACCESSIBILITY_DEFERRALS` in `lib/m55/commercialUx/qualityControl/m55SurfaceManifest.ts`.

## Authority collisions noted

| Collision | Resolution |
|---|---|
| m55.jp vs m-55.jp host confusion (2026-07) | **Process incident** — not a Production code defect; canonical = m-55.jp; m55.jp = NON_AUTHORITATIVE |
| Conversation memory vs repository/worktree facts | Product Authority Pack observations supersede recalled facts |
| `WEB_MASTER_SSOT__PRICING_AND_PRODUCTS_v1.md` vs Self Premium HOME prices | Machine contract wins for Light ¥1,000 / Full ¥1,480 |
| `M55_2027_PRODUCT_TRUTH_REV1.md` vs this SSOT series | This series wins for commercial funnel handoff |
| Runtime「保存版」vs SSOT「プレミアムレポート」 | **RESOLVED 2026-08-04** — Human: `保存版` = INTERNAL_ONLY; public Premium terminology canonical; WT-018 local implementation authorized |

## Human-approved policy decisions (dated)

### 2026-08-04 — Premium public terminology (WT-018)

**Status:** Human-approved **local implementation** on WT-018 from `ada0510c77f73dd992dc6901d1a04389a2cf7e74`.

| Rule | Value |
|---|---|
| `保存版` | **INTERNAL_ONLY / PUBLIC_PROHIBITED** |
| Generic paid public term | **プレミアムレポート** |
| Light variant | **M55 プレミアムレポート ライト** |
| Full variant | **M55 プレミアムレポート フル** |
| Additional reading | **追加読み解き** |
| Free/Pair `見取り図` | **unchanged in this wave** |
| Stored snapshots | **display-time normalization only** — no DB migration |
| Commit/push/PR/merge/deploy | **not authorized** by this decision |

Terminology-only remediation does not reopen IND-FREE functional lane or completed GREEN control-plane gates.

### 2026-08-06 — MRQ governance alignment (docs-only)

**Status:** Human-approved **docs-only governance alignment** on WT-020 from `ac71d054556ebec06d6fa107fbe359a88052aca6`. Does **not** authorize commit, push, MRQ implementation, checkout, 4242, or sales launch.

#### PR #90 merge and P0 Premium terminology closure

| Rule | Value |
|---|---|
| PR #90 | **MERGED** @ `ac71d054556ebec06d6fa107fbe359a88052aca6` (`2026-08-05T13:13:10Z`) |
| Feature head | `af33c722e6e585f51f8e51297055d090606fd32e` |
| Production deployment id | **5762301638** |
| Production SHA | `ac71d054556ebec06d6fa107fbe359a88052aca6` |
| P0 Premium terminology | **CLOSED GREEN** |
| Sales launch | **not authorized** by PR #90 merge |

#### MRQ read-only mapping final acceptance

| Rule | Value |
|---|---|
| WT-019 mapping Revision 1 | **CLOSED GREEN** — read-only mapping accepted |
| MRQ implementation authority on WT-019 | **false** |
| Future MRQ implementation worktree | **not created** · **not authorized** |

#### Normalized false-green corrections (recorded; not closed by this docs patch)

| Area | Corrected classification |
|---|---|
| Contrast / accessibility | Human visual review **open** — not CLOSED GREEN by docs alignment alone |
| Checkout code wired vs operational readiness | **open** — code presence ≠ operational checkout readiness |
| Safe public error mapping | **not wired** — remains open |
| Stripe / 4242 proof | **missing** — remains open |

#### Human governance decisions

| Decision | Value |
|---|---|
| PR #68 | **CLOSED_AS_SUPERSEDED** — unmerged; branch retained; not an implementation source |
| P3 smoke strategy | **PREVIEW_ONLY_FIRST** |
| PR #30 | **INDEPENDENT_NOT_BLOCKING_MRQ** — HOME reopen not authorized |
| PR #75 | **FROZEN_REFERENCE_ONLY** — not blocking MRQ |
| WT-019 implementation authority | **false** |
| Test checkout 4242 | **not authorized** |
| MRQ implementation | **not authorized** |
| MRQ patch scope freeze | **not frozen** |
| Sales launch | **not authorized** |
| Product Authority reconciliation | **separate future gate** — `PRODUCT_AUTHORITY_RECONCILIATION_PENDING` |

#### Scope boundary — not authorized by this entry

This decision authorizes **only** durable governance recording in the five-file docs allowlist. It does **not** authorize:

- Product Authority regeneration or reconciliation completion claims
- MRQ implementation worktree creation
- patch-scope freeze
- checkout / 4242 execution
- sales launch
- commit / push / PR / merge / deploy


### 2026-08-02 — Product Authority version policy and Production observation coordinator policy

**Status:** Human-approved **policy recording only**. Gate 1 is **not** closed by this entry. Independent review of this one-file patch remains required before any implementation.

#### Product Authority version policy (approved target values)

| Constant | Approved value | Semantic owner |
|---|---|---|
| `HANDOFF_SCHEMA_VERSION` | `2.0.0` | generated `handoff.json` shape and field semantics |
| `LOCK_SCHEMA_VERSION` | `1.0.0` | `authority.lock.json` shape and interpretation |
| `GENERATOR_VERSION` | `1.1.0` | generator implementation behavior, derivation, and human-readable rendering |

`HANDOFF_SCHEMA_VERSION` exclusively owns compatibility of the machine-readable generated `handoff.json` shape and field semantics. Removal of `growthShareDelivery.productionDeployed` is an incompatible handoff shape/meaning change represented by `HANDOFF_SCHEMA_VERSION = 2.0.0`; no generated Production object replaces the removed field.

**New Human-authorized semantic versioning policy:**

| Constant | Major | Minor | Patch |
|---|---|---|---|
| `HANDOFF_SCHEMA_VERSION` | incompatible generated `handoff.json` shape or field-meaning removal | backward-compatible handoff field addition | compatible metadata or clarification change |
| `LOCK_SCHEMA_VERSION` | `authority.lock.json` shape or field-meaning change | backward-compatible lock field addition | non-shape clarification |
| `GENERATOR_VERSION` | incompatible change to the generator invocation contract, interpretation of Product Authority inputs, or generator processing contract not already governed by a separately versioned generated artifact schema | backward-compatible generator behavior, derivation, or rendering change, including behavior accompanying a separately versioned handoff schema change | non-semantic generator correction that does not change generated meaning or compatibility |

**Reason for `HANDOFF_SCHEMA_VERSION = 2.0.0`:** `growthShareDelivery.productionDeployed` will be removed; removal is incompatible for any consumer expecting the field; no generated Production object will replace it.

**Reason for `LOCK_SCHEMA_VERSION = 1.0.0`:** lock JSON shape, source-path model, and lock-field meanings remain unchanged.

**Reason for `GENERATOR_VERSION = 1.1.0`:** generator behavior changes to render current rolling Production observation; generated authority-boundary prose changes; removal of the old hardcoded `productionDeployed` derivation. The incompatible handoff JSON field removal is owned by `HANDOFF_SCHEMA_VERSION = 2.0.0`, not by a generator major bump. This is a generator behavior/rendering revision, not a lock-format change.

**Unchanged input and package versions (remain at repository baseline until separately authorized implementation):**

| Field | Current repository value | Change authorized by this entry |
|---|---|---|
| `authority.json` `schemaVersion` | `1.0.0` | none — remains `1.0.0` |
| `observations.json` `schemaVersion` | `1.0.0` | none — remains `1.0.0` |
| `package.json` application `version` | `1.0.0` | none — remains unchanged |

Repository baseline at decision time (read-only inspection): generated `handoff.json` / lock `schemaVersion` = `1.0.0`; `generatorVersion` = `1.0.0`.

#### Production observation coordinator policy

**Prohibited topology:** direct observer-to-application shell pipelines, including:

```text
observe-production-diagnostics | apply-production-observation
```

**Reason:** shell `pipefail` reports final pipeline status but does not guarantee that the downstream mutating process waits for observer exit `0`; observer failure must never be followed by a Product Authority write.

**Authorized future command topology:**

```text
node scripts/product-authority/run-production-observation.mjs
```

**Coordinator requirements (policy only — not yet implemented):**

1. spawn the read-only observer subprocess
2. reject observer spawn errors before any application logic is invoked
3. capture bounded stdout in memory
4. wait for observer exit code `0`
5. validate the complete canonical observer result
6. only after all checks pass, invoke non-network application logic

The coordinator must **not** invoke the non-network application logic when any of the following occurs:

- observer spawn error
- signal termination
- nonzero observer exit
- truncated stdout
- stdout limit violation
- malformed output
- non-canonical output
- observer-result schema mismatch
- any complete-result validation failure

A failed observer, including failure to spawn, must never result in a Product Authority write.

#### Scope boundary — not authorized by this entry

This decision authorizes **only** durable policy recording in this file. It does **not** authorize:

- creating the coordinator, observer, application, or helper modules
- Product Authority mutation
- `observations.json` changes
- generated output changes
- version constant application in source
- generator execution
- Production GET or any network access
- `package.json` edit
- commit / push / PR / merge
- Pair work
- commercial feature implementation
- new-thread cutover

### 2026-08-10 — P1C CLOSED GREEN and post-merge SSOT transition (docs-only)

**Status:** Human-authorized **docs-only post-merge SSOT transition** on WT-025 from `faef130a335ce6e33cfd784d5318f874beeb70ad`. Does **not** authorize P2 implementation, P2 worktree creation, checkout, 4242, or sales launch.

#### PR #97 merge and P1C closure

| Rule | Value |
|---|---|
| PR #97 | **MERGED** @ `faef130a335ce6e33cfd784d5318f874beeb70ad` |
| Merge parents | `4967d963fef3ae832b420e8ff9d71cd732bf66db` · `5f0454ee32159873f58d08624ca49ae858ab714f` |
| Feature head | `5f0454ee32159873f58d08624ca49ae858ab714f` |
| main CI | **GREEN** — 8/8 terminal GREEN |
| Production deployment id | **5826935452** |
| Production SHA | `faef130a335ce6e33cfd784d5318f874beeb70ad` |
| Production state | **SETTLED GREEN** |
| Canonical Production host | `m-55.jp` |
| Safe public reachability | **GREEN** |
| P1C draft persistence | **CLOSED GREEN** |
| Sales launch | **not authorized** by PR #97 merge |

#### Transition to P2 Revenue-Ready entry/planning

| Rule | Value |
|---|---|
| Next product phase | **P2** — personal Premium / Revenue-Ready |
| Commercial direction | transparency · personalization · one-time-purchase trust — M55 is not to become a copy of an astrology/fortune site |
| Public Premium terminology | preserve current SSOT — プレミアムレポート · M55 プレミアムレポート ライト · M55 プレミアムレポート フル · 追加読み解き |
| P2 implementation | **not started** · worktree **not created** |
| MRQ implementation authority | **false** until explicit P2 gate |
| Revenue-Ready achieved | **false** |
| SELL authorized | **false** unless current SSOT already explicitly says so |

#### Scope boundary — not authorized by this entry

This decision authorizes **only** durable transition recording in the four-file SSOT allowlist. It does **not** authorize:

- P2 implementation or P2 worktree creation
- commit / push / PR / merge / deploy (separate gate required)
- checkout / 4242 execution
- sales launch
- Product Authority regeneration or reconciliation completion claims
- P1A/P1B/P1C re-audit or source reopening

### 2026-08-10 — P2 CLOSED GREEN and post-merge SSOT transition (docs-only)

**Status:** Human-authorized **docs-only post-merge SSOT transition** on `feat/m55-mrq-p2-postmerge-ssot-v1` from `2d14404d62ab7b265e07729448d6db602a055cce`. Does **not** authorize P3 implementation, P3 worktree creation, checkout, 4242, or sales launch.

#### PR #99 merge and P2 closure

| Rule | Value |
|---|---|
| PR #99 | **MERGED** @ `2d14404d62ab7b265e07729448d6db602a055cce` |
| Merge parents | `3cf560691dd11d35b26077ec6c5e4686a571dae5` · `21744e195f08aeda03f23b7972bedcbf227aaaaa` |
| Feature head | `21744e195f08aeda03f23b7972bedcbf227aaaaa` |
| Merge method | **MERGE COMMIT** |
| main CI | **GREEN** — 8/8 terminal GREEN |
| Production project | `m55-official/m55-webv2` |
| Production environment | **production** |
| Production deployment id | **AA99Xfx9uL5ne2tbpQztRkia2eYx** |
| Production SHA | `2d14404d62ab7b265e07729448d6db602a055cce` |
| Production state | **SETTLED GREEN** |
| Canonical Production host | `m-55.jp` |
| Safe public reachability | **GREEN** |
| ECP | **GREEN** |
| Premium proof | **GREEN** |
| P2 Revenue-Ready | **CLOSED GREEN** |
| Sales launch | **not authorized** by PR #99 merge |
| Revenue-Ready final commercial closure | **not claimed complete** |

#### Transition to P3 entry/planning

| Rule | Value |
|---|---|
| Next product phase | **P3** — checkout/refund/support/recovery safety |
| P3 implementation | **not started** · worktree **not created** |
| MRQ implementation authority | **false** until explicit P3 gate |
| Preview strategy | **Preview-only first** |
| REAL_CHECKOUT_AUTHORIZED | **false** |
| TEST_CHECKOUT_4242_AUTHORIZED | **false** |

#### Scope boundary — not authorized by this entry

This decision authorizes **only** durable transition recording in the four-file SSOT allowlist. It does **not** authorize:

- P3 implementation or P3 worktree creation
- commit / push / PR / merge / deploy (separate gate required)
- checkout / 4242 execution / real purchase
- sales launch
- P1A/P1B/P1C/P2 re-audit or source reopening

### 2026-08-15 — Product narrative + social share v1 (stacked overlay)

**Status:** Human-authorized **local stacked implementation** on WT-031 `feat/m55-product-narrative-share-v1` from personalization `6d53a71df148ed4c0a1016358bc86830086f8732`. PATCH-1 commercial copy (2026-08-15): public 4–6-slot manual, selected-card X, DOB cue, Pair copy, Premium fused takeaway. Delight v2 (2026-08-15): A/B/C visual grammar, Card C extra eligibility, OG restyle, image save fallback, private Japanese humanize, Pair 一方/もう一方 presentation, privacy-safe share enums. Does **not** rebuild inference engines. Does **not** merge personalization. Does **not** auto-merge. Production deploy is **not** authorized. USER_VISIBLE_CLOSED_GREEN requires Human stacked visual lock.

| Rule | Value |
|---|---|
| Product move | 自分を知る → 自分を伝える |
| Public share | Catalog-key tokens `n1*` reconstructed without DOB/answers |
| Public copy | Customer Japanese editorial 2026-08-15 — presentation only; no identity/fingerprint change |
| Compatibility Paid share | generic NO_OP (`二人の相性レポートを読みました`) |
| Existing s1 tokens | remain valid |
| Commerce / DB / Stripe | unchanged |

### 2026-08-16 — Personalization + narrative/share main settlement (PR #120 + PR #121)

**Status:** Human-authorized **conditional merge + main settlement**. PR #120 merged to `main` @ `679debfffa18a6811112b4e1b298653f472658a6`. PR #121 retargeted to `main` and merged @ `7bc2503bb3e188a9bc4cd83ff2b09c4964bbc87b`. WT-030 / WT-031 **COMPLETED** on main. Production deploy **not** executed in this gate.

| Rule | Value |
|---|---|
| Merge order | #120 → retarget #121 → #121 |
| origin/main (settlement) | `7bc2503bb3e188a9bc4cd83ff2b09c4964bbc87b` |
| Public identity | A162 / B44 / C78 / INFORMATION_LOSS 0 |
| Next gate | Production release/deploy |
| Production / DB / Stripe / env | unchanged in this settlement |
