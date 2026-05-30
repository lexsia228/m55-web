# M55 Paid DTR Report Body Readability Target Mapping v1

**Gate ID:** `CATEGORY-1-M55-PAID-DTR-REPORT-BODY-READABILITY-REFINEMENT-TARGET-MAPPING-DRAFT`  
**Status:** Planning / mapping artifact only  
**Baseline commit (read-only inspection):** `94e996f62807344967f7261efd31b4e2619b235a`  
**Prior gate verdict:** `CATEGORY_1_M55_PAID_DTR_REPORT_BODY_READABILITY_REFINEMENT_PLANNING_NEEDS_TARGET_MAPPING_READONLY_NO_MUTATION`  
**Date:** 2026-05-30

---

## 0. Gate and scope

This document is a **planning / target-mapping artifact**. It does **not** authorize implementation, deployment, or any mutation outside a future explicit GO gate.

| Action | Authorized by this document |
|--------|----------------------------|
| App / component / lib runtime code edits | **No** |
| `docs/ssot` edits | **No** |
| Existing `docs/review` edits | **No** |
| Engine (`lib/m55/dtrEngine.ts`) changes | **No** |
| Snapshot / `envelope_json` rewrite or DB backfill | **No** |
| Result-label / `tenStemCatalog.publicTitle` changes | **No** |
| Prompt / model / consultation reply behavior changes | **No** |
| CSS / layout changes | **No** |
| Checkout / payment / auth / env / webhook changes | **No** |
| `product_id` / entitlement / route / wallet ledger changes | **No** |

**In scope for this gate:** Create this mapping file only, to separate safe improvement layers before any implementation gate.

**Out of scope:** Consult room compose UI, My page catalog, LP sales copy (Gate 1 / `paidDtrProductCopy` wave already handled separately).

---

## 1. Problem statement

Production / manual review of **paid DTR 保存版** report body (`/dtr/core`, `DtrFullReader`) surfaced readability gaps while **product truth** (4 chapters, stem-derived tendencies, purchase-time profile freeze, consult reply boundary) must remain intact.

### User-observed issues

| # | Issue | Notes |
|---|--------|--------|
| 1 | **Subject ownership too weak** | Body reads like generic diagnosis; insufficient `tttさん` / `あなた` linkage |
| 2 | **Visible blank `—`** | Domain tiles, practical guidance, axis summary, judgment load |
| 3 | **Repeated content** | Same sentence in multiple UI surfaces (e.g. work-stuck line reused; engine phrases reused across blocks) |
| 4 | **Abstract / business-heavy wording** | 潜在, 中間成果, ポジション, 統合, 調整, リソース, 評価, マネジメント, プロデューサー的, etc. |
| 5 | **Work / career default bias** | s7 + domain matrix lead with「仕事」; daily life / close relationships underweighted in extraction |
| 6 | **Unclear 得意 / 苦手 framing** | s4/s5 exist but labels do not say 得意になりやすい / 苦手になりやすい |
| 7 | **Lack of safe positive acknowledgement** | Need observation-based warmth without praise-hacking |
| 8 | **Possible 1-year outlook** | Desired as reading rhythm, not prophecy (not in codebase today) |
| 9 | **Need for daily Japanese** | Preserve meaning; reduce stiffness |
| 10 | **M55 boundaries** | No scores, no fate, no generic chat, no medical/legal/financial/career guarantees; anti-sycophancy alignment |

### Non-goals (this mapping track)

- Changing stem lane, Golden Matrix, or fulfillment pipeline semantics  
- Rewriting purchased `dtr_report_snapshots.envelope_json` rows  
- Renaming `publicTitle` (e.g. プロデューサー) — separate result-label GO  
- Expanding consult reply prompts or LLM behavior in this track  

---

## 2. Source layer map

| Layer | File(s) | Role | Affects existing purchased reports | Affects future purchases | Risk | Safe handling |
|-------|---------|------|-----------------------------------|--------------------------|------|----------------|
| **Engine catalog** | `lib/m55/dtrEngine.ts` (`STEM_BODIES`, `SECTION_SPECS`, `runDtrEngine`) | Deterministic 8-section `body` text at fulfillment; partial nickname tokens (stem 3, s8, s1 title) | **No** (text frozen in snapshot) | **Yes** (new `envelope_json`) | **High** if mistaken for display-only | Wave C only; separate engine GO; no backfill default |
| **Fulfillment write** | `lib/m55/compositeStem/buildV2FulfillmentSnapshot.ts` | v2 pipeline → `runDtrEngine` → persist `envelope_json` + `engine_context_json` | No (write once per purchase) | Yes | High | Do not touch in Wave A/B |
| **Snapshot store** | DB `dtr_report_snapshots.envelope_json` | Authoritative purchased report body | Yes (stored bytes) | N/A | **Critical** | **Never UPDATE body by default**; read-only in implementation |
| **Snapshot read** | `lib/m55/compositeStem/storedEnvelopeRead.ts` | Fail-closed read; **no `runDtrEngine` re-derive** | Yes (what reader receives) | Yes | Medium | Read path unchanged unless separate gate |
| **Route wire** | `app/dtr/core/page.tsx` | Auth → visible snapshot → `DtrFullReader` | Yes | Yes | Low | No logic change in readability waves |
| **Renderer + extraction** | `components/dtr/DtrFullReader.tsx` | 4 chapter bands, section articles, domain matrix, practical guidance, viz captions | **Yes** (display layer) | Yes | Medium | **Wave A primary** |
| **Mapper utilities** | `lib/m55/dtrPaidModules.ts` (`parseBlockItems`, `firstSentence`, `axisVizSummaryDisplay`, `AXIS_DATA`) | Parses `【header】` blocks; axis summaries with `'—'` fallbacks | **Yes** | Yes | Medium | Wave A mapper dedupe + fallbacks |
| **Stem display chrome** | `lib/m55/tenStemCatalog.ts` | `publicTitle`, `displayOneLine` in hero (e.g. プロデューサー) | Yes (label only) | Yes | Medium for label GO | **Not approved** in this track; body separate from title |
| **Chapter bridge copy** | `lib/m55/dtrReportBridgeCopy.ts` | Static 返書 prompts per chapter; no engine coupling | Yes | Yes | Low | Optional copy tweak in later gate; not body |
| **Product copy boundary** | `lib/m55/paidDtrProductCopy.ts` | `PAID_DTR_FORBIDDEN_CLAIMS` (`deterministic future`, etc.); reader must not repeat LP consult UI | Reference | Reference | Low | SSOT boundary reference only |
| **Saved notice** | `components/dtr/SavedSnapshotNotice.tsx` | Purchase-time profile notice | Yes | Yes | Low | Out of body scope |

### Data flow (reference)

```
Profile + stem (fulfillment) → runDtrEngine → envelope_json (frozen)
                                         ↓
/dtr/core → resolveStoredEnvelopeRead → DtrFullReader → UI extractions
```

---

## 3. Issue-to-target map

| Issue | Observed example / pattern | Likely source | Target layer | Existing-user safe path | Future-user path | Priority | Next action |
|-------|---------------------------|---------------|--------------|-------------------------|------------------|----------|-------------|
| Subject ownership / name | Hero shows nickname; paragraphs use「あなた」; stem 3 only has `{{DTR_STEM3_*}}` tokens | `dtrEngine` bodies; limited `runDtrEngine` replace | Renderer opener + engine (Wave C) | **Yes:** 1-sentence opener per chapter when `nickname` trim non-empty | Stem-wide engine subject lines | **P1** | Wave A: `ReportPartBand` / section wrapper; Wave C: `STEM_BODIES` |
| Blank `—` | `domainJudgmentLoad` → `'—'`; tiles `d.strength \|\| '—'`; practical `row.when \|\| '—'`; `axisVizSummaryDisplay` assist `'—'` | `DtrFullReader`, `dtrPaidModules` | Renderer / mapper | **Yes:** hide row or soft fallback copy | Same + engine text richness | **P0** | Wave A: central `emptyFieldCopy` helper |
| Repetition / duplicate extraction | `PracticalGuidanceSection` uses `workStuck` for both「理由」and recovery; `firstSentence` same source in domain tiles | `DtrFullReader` extraction | Mapper / renderer | **Yes:** dedupe by source hash per view | Engine paragraph role split (Wave C) | **P0** | Wave A: extraction map |
| Abstract / business terms | 己 stem: 「潜在」「中間成果」「育成・統合・調整が求められるポジション」 | `STEM_BODIES[5]` (stem lane 5) | Engine (primary) + optional display gloss | **Partial:** inline gloss/tooltip only if approved; full rewrite needs engine | `STEM_BODIES` daily Japanese | **P1** | Wave C stem-by-stem; optional gloss in Wave A (careful) |
| Work / career bias | Domain order: 仕事 first; s7 headers「力が出る条件」「環境のヒント」work-heavy | `DtrFullReader` `domainTiles`; engine s7 | Renderer order + engine s7 balance | **Yes:** reorder / rebalance labels; emphasize「生活のヒント」 | Rewrite s7 blocks | **P1** | Wave A order; Wave C s7 |
| 得意 / 苦手 framing | s4 title「力が出やすい場面」; s5「無理が出やすいところ」 | Section titles + grid labels | Renderer labels only | **Yes:** display labels 得意になりやすいこと / 苦手になりやすいこと | Native engine headings (Wave C) | **P1** | Wave A labels on s4/s5 bands |
| Safe positive acknowledgement | Some stems have「弱さではなく」; inconsistent | `STEM_BODIES`; no dedicated block | SSOT template + renderer insert or engine | **Yes:** optional short callout (renderer) | Engine paragraph | **P2** | Wave B SSOT + Wave A optional callout |
| 1-year outlook | Not implemented | — | SSOT-first + new renderer block | **Yes** (additive UI, no snapshot write) | Same | **P2** | Wave B only after SSOT paragraph |
| Mobile length risk | Long paragraphs + 5×3 domain matrix + practical rows | `DtrFullReader` + CSS | Renderer copy length discipline | Yes (shorter copy) | Same | **P1** | Cap opener 1–2 sentences; review in implementation gate |
| Saved snapshot immutability | `storedEnvelopeRead` authoritative | DB + read SSOT | Boundary | N/A | N/A | **P0** | No UPDATE `envelope_json`; no backfill |

---

## 4. Field-level mapping

| UI surface | Current source | Problem type | Proposed handling | Layer | Safe for existing reports | Requires engine change | Requires SSOT first | Priority |
|------------|----------------|--------------|-------------------|-------|---------------------------|------------------------|---------------------|----------|
| Chapter opening paragraph | None dedicated; first `section.body` ¶ from snapshot | Weak subject | Add **renderer-only** 1–2 sentence opener after `ReportPartBand` using `nickname` or あなた | Renderer | **Yes** | No | No | P1 |
| Section body paragraphs | `payload.fullSections[].body` in `envelope_json` | Abstract; generic あなた | Wave C: rewrite `STEM_BODIES`; Wave A: optional **non-mutating** gloss not stored | Engine / optional gloss | Partial (gloss only) | Yes for full fix | No | P1–C |
| Domain matrix tiles (出方/負荷/戻し方) | `parseBlockItems` + `firstSentence` / `domainJudgmentLoad` from s3/s6/s7 | `—`; repetition; work-first | Fallback copy; dedupe; reorder tiles; fix `domainJudgmentLoad` | Renderer / mapper | **Yes** | No | No | P0 |
| Practical guidance rows (行動/理由/タイミング) | `PracticalGuidanceSection`; stem 3 uses `PRACTICAL_GUIDANCE_STEM3` | Empty `when`; duplicate `workStuck` | Stem-specific row maps like stem 3; dedupe sources | Renderer | **Yes** | No | No | P0 |
| Axis summary cards | `axisVizSummaryDisplay` + `AXIS_DATA` | `'—'` in assist/grow rows | Replace `—` with soft Japanese; hide empty row | Mapper | **Yes** | No | No | P1 |
| Report bridge / 返書導線 | `dtrReportBridgeCopy.ts` + `ReportBridgeBand` | Already life-language; separate from body | Minor copy alignment only in later gate | Static copy | Yes | No | No | P3 |
| Summary / continuation support | s8 `body` + `ContinuousSupport` / grounding | Generic map text | Keep product truth; optional nickname in renderer wrapper | Snapshot + renderer | Partial | Optional s8 engine | No | P2 |
| Optional「これから1年の見方」block | **None** | Missing feature | New section after Ⅳ or before s8; anchor `generatedAt` | SSOT + renderer | **Yes** (additive) | No | **Yes** | P2 |
| Hero 資質 / publicTitle | `tenStemCatalog` via `stem.publicTitle` | プロデューサー feels job-title | **Do not change** in this track | result-label | Yes (unchanged) | Separate GO | Yes if ever | **Forbidden here** |
| s4 / s5 grid headings | `SECTION_SPECS` titles in snapshot + `ReportPartBand` | No 得意/苦手 words | Renderer overlay labels only | Renderer | **Yes** | Wave C optional | No | P1 |

### Section ID reference (engine)

| `id` | Engine title (default) | Chapter band |
|------|------------------------|--------------|
| `s1_identity` | あなたという人物 → nick overline | Ⅰ 輪郭を見る |
| `s2_composition` | 構成と傾向の全体像 | Ⅰ (before bridge) |
| `s3_essence` | 本質と安定の条件 | Ⅱ 構造を読む |
| `s4_strengths` | 力が出やすい場面 | Ⅲ grid |
| `s5_friction` | 無理が出やすいところ | Ⅲ 無理を知る |
| `s6_relation` | 人とのやりとりの癖 | Ⅲ grid |
| `s7_work` | 仕事と生活の取扱いヒント | Ⅳ 楽に扱う |
| `s8_bridge` | まとめと相談返書について | End / consult |

---

## 5. Renderer-only candidate list

Changes below may affect **existing purchased reports** at display time only. They must **not** write DB, mutate `envelope_json`, or change engine/stem semantics.

| Candidate | Files likely touched (later gate) | Risk | Verification |
|-----------|-----------------------------------|------|--------------|
| Replace or hide `—` in domain matrix | `DtrFullReader.tsx` (`DomainPracticeMatrix` ~L1759–1777) | Low–medium | Manual: stems with weak judgment keywords show fallback not dash |
| Replace `domainJudgmentLoad` default `'—'` | `DtrFullReader.tsx` ~L113–117 | Low | 己/庚 stems: 判断・負荷 tile readable |
| Practical row empty `when` / `action` fallbacks | `DtrFullReader.tsx` `PracticalGuidanceSection` ~L2007–2015 | Low | No bare `—` in Ⅳ |
| Dedupe repeated `firstSentence` across practical categories | `DtrFullReader.tsx` ~L1926–1955 | Medium | Same sentence not twice in one view |
| Dedupe domain tile vs practical source | `DtrFullReader.tsx` | Medium | Visual scan: no duplicate paragraph |
| Chapter opener: `{nick}さんにとって、この章では…` | `DtrFullReader.tsx` near `ReportPartBand` | Medium (tone) | Nickname absent → あなた only |
| Labels: 得意になりやすいこと / 苦手になりやすいこと | `DtrFullReader.tsx` s4/s5 bands | Low | No identity determinism wording |
| Optional gloss for abstract term (display-only) | `DtrFullReader.tsx` helper | Medium | Must not alter snapshot; max 1 short clause |
| Fallback: 「相談返書で具体化できます」 | Shared empty-field copy | Low | Only when field would be `—` |
| Axis `axisVizSummaryDisplay` `'—'` → soft text | `dtrPaidModules.ts` | Low | Unit test optional in impl gate |

**Explicit renderer prohibitions**

- No `runDtrEngine` on `/dtr/core` read path  
- No POST/PATCH to snapshot tables  
- No change to `ConsultRoom` send / wallet / checkout  

---

## 6. Engine-new-only candidate list

| Candidate | Affects existing snapshots | Notes |
|-----------|---------------------------|--------|
| `STEM_BODIES` daily Japanese rewrite (per stem) | **No** | New purchases only unless separate display-paraphrase layer approved |
| Stem-wide nickname / あなた in body paragraphs | **No** | Extend beyond stem 3 tokens in `runDtrEngine` |
| Restructure s7「仕事と生活」block balance | **No** | Keep `【力が出る条件】` structure for parser compatibility |
| Stronger 得意/苦手 wording inside engine titles/bodies | **No** | Coordinate with renderer labels to avoid double headings |
| Remove cross-block duplicate phrases at source | **No** | e.g. 己 stem 生活ヒント vs friction themes |

### Defaults (non-negotiable in this track)

- **No** existing `envelope_json` rewrite  
- **No** DB backfill  
- **No** engine / snapshot / result-label changes **without separate explicit GO** (Wave C gate)  
- **No** Golden Matrix or `stemLaneIndex` mutation  

---

## 7. SSOT-first concepts

Concepts requiring SSOT wording (in `docs/ssot` or approved review addendum) **before** implementation—not authorized by this mapping alone.

### 7.1 1-year outlook

| Allowed labels | Forbidden labels |
|----------------|------------------|
| これから1年の見方 | 未来予測 |
| これからの使い方 | 1年後に起きること |
| 次の1年で整えたいこと | 運命 |
| | 必ず |
| | 成功する |
| | 収入が上がる |
| | 恋愛が進む |
| | 転職すべき |

**Safe framing rules**

- Anchor: `envelope.generatedAt` or purchase date — **reading rhythm only**, not event calendar  
- Content: usage order, load patterns, care points, chapter revisit sequence  
- **No** event prediction, guarantees, medical/legal/financial/career advice  
- Align with `PAID_DTR_FORBIDDEN_CLAIMS` → `deterministic future`  

**Implementation default:** Renderer-only additive block (Wave B); **no** new snapshot fields.

### 7.2 Positive acknowledgement boundary

See §8; cross-reference `docs/review/M55_CONSULT_REPLY_ANTI_SYCOPHANCY_SAFETY_AUDIT_v1.md` (return letter rules apply by analogy to report tone).

### 7.3 得意 / 苦手 as tendencies

- Use **得意になりやすいこと** / **苦手になりやすいこと**  
- Forbidden: 「あなたはこういう人間です」, fixed identity, rank, scores  

### 7.4 Future prediction boundary

Report body and new blocks must not imply deterministic outcomes. Consult room remains scoped to saved report chapters—not open-ended prophecy.

---

## 8. Positive acknowledgement rules

| Rule | Detail |
|------|--------|
| Observation-based only | Describe what tends to happen, not moral verdict |
| No praise-hacking | Avoid 天才, 特別, unlimited validation |
| No unconditional validation | Do not end with「あなたは正しい」「あなたは悪くない」 |
| No dependency induction | No「いつでも頼って」without boundary |
| Include boundary or next action | Pair strength with overload pattern + one small handling hint |

**Safe 4-part pattern**

1. **Observation** — 「〜しやすい」  
2. **Why it can help** — situational strength  
3. **Where it overloads** — fatigue / 抱え込み  
4. **One small handling hint** — 線引き, 休み, 相談返書で具体化  

**Placement options (later gate)**

- Renderer callout under s4 or s5 (Wave A/B)  
- Engine paragraph in `STEM_BODIES` (Wave C, new purchases only)  

---

## 9. Daily Japanese conversion rules

Convert **user-facing body** stiffness where meaning is preserved. Do **not** remove structural truth (stem tendencies, chapter roles). **`publicTitle` / result-label changes are not approved in this track.**

| Hard term | Acceptable daily-language substitute | Action |
|-----------|--------------------------------------|--------|
| 潜在 | まだ形になっていないものの中の育ちそうな部分 | replace in body |
| 中間成果 | 途中で見える成果・手ごたえ | replace |
| ポジション | 立ち位置・役割の置き方 | replace / explain |
| 統合 | バラバラなものをひとつにまとめる | replace |
| 調整 | バランスを整える・間に入る | replace |
| リソース | 体力・時間・気力 | replace |
| 評価 | 認められる・見える化 | replace carefully (avoid workplace-only) |
| 現実的な順序 | 無理のない順番 | replace |
| マネジメント | 人や仕事のまとめ役 | replace |
| プロデューサー (in **body**) | 育てて形にする・間に入って整える | replace in body only |
| プロデューサー (`publicTitle`) | — | **keep** (separate GO) |
| 育成 | 育てる・少しずつ形にする | replace |
| ベクトル / 到達点 | 進む方向・目指す先 | replace |
| 合意形成 | みんなの納得をそろえる | explain |
| 裁量 | 自分で決められる余地 | explain |

---

## 10. Target implementation waves

### Wave A — Renderer safety / readability (recommended first implementation gate)

- Blank `—` handling (P0)  
- Extraction dedupe (P0)  
- Chapter openers with nickname / あなた (P1)  
- 得意/苦手 display labels (P1)  
- Domain tile order / life-hint emphasis (P1)  
- **No** engine changes  
- **No** DB  
- **No** CSS unless separate layout GO (copy length discipline only here)  

### Wave B — Optional SSOT + UI block

- SSOT paragraph for 1-year outlook + acknowledgement template  
- Renderer block「これから1年の見方」using `generatedAt`  
- **No** snapshot schema change  

### Wave C — Engine-new-only daily Japanese

- `STEM_BODIES` rewrite per stem (pilot: stem 5 己 / プロデューサー body)  
- Extended nickname subject tokens  
- **Future purchases only**  
- Requires: engine GO, golden/fulfillment tests, no backfill  

### Wave D — Backlog / forbidden without new gate

| Item | Status |
|------|--------|
| Backfill / UPDATE existing `envelope_json` | Backlog — not default |
| Display-time paraphrase layer mutating displayed text vs stored JSON | Backlog — needs immutability policy doc |
| `publicTitle` / result-label parity changes | Separate GO |
| Golden Matrix / stem lane changes | Forbidden |
| Broad CSS/layout redesign | Separate GO |
| Consult prompt / model changes | Out of scope |
| Checkout / entitlement / route changes | Forbidden |

---

## 11. Acceptance criteria for later implementation

Any future implementation gate must satisfy:

| Check | Required |
|-------|----------|
| Only files approved for that wave changed | Yes |
| No DB migration / SQL | Yes |
| No snapshot `envelope_json` rewrite | Yes |
| No engine change unless explicit Wave C GO | Yes |
| No `publicTitle` / result-label change | Yes |
| No checkout / payment / auth / env / webhook change | Yes |
| No `product_id` / route / entitlement change | Yes |
| No prompt / model change | Yes |
| No CSS/layout unless separate GO | Yes |
| No deterministic future wording | Yes |
| No praise-hacking / gender / 男性脳 / 女性脳 | Yes |
| No generic chat / unlimited consult promise | Yes |
| No medical / legal / financial / career advice | Yes |
| Mobile readability reviewed in implementation / human review gate | Yes |

---

## 12. Recommended next gate

**`CATEGORY-1-M55-PAID-DTR-REPORT-BODY-READABILITY-REFINEMENT-MAPPING-REVIEW-COMMIT-PLANNING`**

Rationale:

- This mapping is **complete** for layer separation (renderer vs engine vs SSOT vs backlog).  
- Source clarity is sufficient (`dtrEngine`, `storedEnvelopeRead`, `DtrFullReader`, `dtrPaidModules` inspected).  
- **Do not** jump to implementation (`…-DRAFT` code gate) until mapping review + explicit Wave A GO.  

**Not recommended now**

- `…-SOURCE-AUDIT-PLANNING` — only if review finds unknown extraction surfaces (none blocking at v1).  
- Immediate code implementation — mapping is not narrow enough for copy-only without wave boundary.  

---

## Appendix A. Safe rewrite examples (planning only)

### A.1 Subject ownership (engine or opener)

**Before:** 本質は、潜在を見抜き、現実的な順序に並べ替えて育てられることにあります。  
**After:** tttさんは、まだ形になっていないものの中から、育ちそうな部分を見つけやすい人です。思いつきで動くより、順番をつくって少しずつ形にする方が力が出やすいです。

### A.2 Blank fallback (renderer)

**Before:** 負荷 —  
**After:** 今は、この項目では大きな負荷が出ていないか、まだ言葉にしきれていない可能性があります。無理に決めず、気になる場面が出てきたら相談返書で具体化できます。

### A.3 Abstract → daily (engine, 己 stem)

**Before:** 育成・統合・調整が求められるポジション。  
**After:** 人や物事の間に入り、バラバラなものを少しずつ整える場面で戻りやすくなります。

### A.4 Safe positive acknowledgement

tttさんの良さは、まだ形になっていないものを雑に扱わず、育つところまで見ようとする点です。ただし、その分だけ自分の休みを後回しにしやすいので、最初に「ここまで」と線を引くことが大事です。

### A.5 Safe 1-year outlook (new block, SSOT-first)

**Label:** これから1年の見方  
**Body:** これから1年は、何かを大きく当てに行くより、日常の中で「抱えすぎない形」を覚えていく時期として使うと合いやすいです。最初は、疲れが出る場面を見つける。次に、頼まれごとの線引きを決める。最後に、続けやすい関わり方を残す。この順番で読むと、保存版を日常に戻しやすくなります。

---

## Appendix B. Code anchors (read-only inspection)

| Symbol | Location |
|--------|----------|
| `domainJudgmentLoad` → `'—'` | `components/dtr/DtrFullReader.tsx` ~L113–117 |
| Domain tile fallbacks | ~L1759–1777 |
| `PRACTICAL_GUIDANCE_STEM3` | ~L1854+ |
| Practical `'—'` | ~L2007–2015 |
| `REPORT_PARTS` chapter names | ~L228–239 |
| `SECTION_SPECS` / `runDtrEngine` | `lib/m55/dtrEngine.ts` ~L783–919 |
| `STEM_BODIES` | `lib/m55/dtrEngine.ts` ~L100+ |
| No re-derive | `lib/m55/compositeStem/storedEnvelopeRead.ts` L1–4 |
| `deterministic future` forbidden | `lib/m55/paidDtrProductCopy.ts` `PAID_DTR_FORBIDDEN_CLAIMS` |

---

*End of mapping v1. This file does not authorize code changes.*
