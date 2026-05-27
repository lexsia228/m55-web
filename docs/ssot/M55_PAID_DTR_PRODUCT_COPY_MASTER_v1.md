# M55 Paid DTR Product Copy Master v1

**Status:** ACTIVE — Category 1 product-copy SSOT (paid DTR / 保存版)
**Version:** `m55-paid-dtr-product-copy-v1`
**Runtime module:** `lib/m55/paidDtrProductCopy.ts`
**Date:** 2026-05-27
**Classification:** Product copy / display only — not engine, payment, DB, or auth law

---

## 0. Status / authority

| Field | Value |
|-------|--------|
| **Authority** | This document is the **current active product-copy SSOT** for paid DTR (本質の読み解き / 保存版) and consultation reply (相談返書). |
| **Supersedes (for implementation)** | Conflicting copy/product references in older rules that state **8 chapters**, **max 3 replies**, **¥700 add-on**, or **Entry Report as primary Japanese name**. |
| **Does not supersede** | Engine/divination authority, Golden Matrix, payment/webhook contracts, entitlements DB schema — those remain in their own gates. |
| **Historical records** | Old PRIMARY LAW / cursor rules / concierge SSOT files **remain on disk** as audit history. They are **obsolete for new implementation** until updated by a separate law/archive gate. **This gate does not delete or edit old files.** |
| **Human approval (2026-05-27)** | Latest **implementation/product truth** is the only active truth. Conflict Register below records supersession. |

**Downstream rule:** LP, Core, My, shelf, reader chrome, and ConsultRoom must **import or mirror** `lib/m55/paidDtrProductCopy.ts` in later alignment gates — not redefine long copy locally.

---

## 1. Conflict Register

| Conflict | Old source | Current product truth | Implementation evidence | Decision | Action for old source |
|----------|------------|----------------------|-------------------------|----------|------------------------|
| **Chapter count: 4 vs 8** | `.cursor/rules/m55-entry-report-product.mdc` §2 (8-chapter list) | **4 chapters** (Ⅰ–Ⅳ) | `components/dtr/DtrFullReader.tsx` `REPORT_PARTS`; `lib/m55/paidDtrProductCopy.ts` `PAID_DTR_CHAPTERS` | **4 chapters are product truth** | Obsolete for copy. Archive/update via separate cleanup gate. |
| **Reply cap: 5 vs 3** | `00_PRIMARY_ACTIVE_LAW/M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1.md` §1.3 `max 3 / 3`; `M55_REPORT_CONCIERGE_ROOM_SSOT_v1.md` §2.3 | **Included 1 + additional max 4 = total 5** | `lib/m55/reply/replyTicketCheckoutConstants.ts`; `components/dtr/ConsultRoom.tsx` | **5-cap is product truth** | Obsolete for copy. Law append-only update in separate gate. |
| **Add-on price: ¥500 vs ¥700** | `m55-entry-report-product.mdc` §4 ¥700; CONCIERGE SSOT §3.4 ¥700 candidate | **¥500 per additional 相談返書** | `ConsultRoom.tsx` UI; `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_A_1000_DTR_500_REPLY_PLANNING_2026-05-23.md` | **¥500 is product truth** | Obsolete for copy. |
| **Product name: JP vs Entry Report primary** | `M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1.md` §1.2 `public label: Entry Report` | **本質の読み解き** (primary), **保存版** (format), **Entry Report** (auxiliary EN) | `lib/m55/dtrProductLabels.ts`; Wave1 alignment | **JP primary** | PUBLIC_CLAIMS may still say Entry Report — align in language wave; not primary UI. |
| **Email / notification promises** | `M55_DAILY_DIGEST_AND_HABIT_LOOP_SSOT_v1` (future habit loop) | **No M55-owned report-ready / reply-ready / update email in product copy** | No user-facing email system; My mentions Stripe payment email only | **Deferred** | Future `CATEGORY-1-NOTIFICATION-EMAIL-SYSTEM-ARCHITECTURE-PLANNING`. |

---

## 2. Product identity

| Role | Value |
|------|--------|
| **Primary Japanese name** | 本質の読み解き |
| **Format** | 保存版 |
| **Owned state** | 保存済み |
| **Auxiliary EN label** | Entry Report — unowned shelf/LP aria, legacy engine title cleanup only |
| **Short name** | 本質の読み解き |
| **Consultation feature (primary UI)** | 相談返書 |
| **Bridge term (explanatory only)** | AI往復券 — not default UI label |

**Do not use as primary user-facing product name:**

- Entry Report
- Premium
- Blueprint
- DTR Core Static V1
- 汎用AIチャット / 汎用チャット
- 診断・占い・鑑定・当たる・開運
- Language implying deterministic outcomes or guaranteed results

**Labels module:** Short pills and aria remain in `lib/m55/dtrProductLabels.ts`. Long copy lives in `paidDtrProductCopy.ts`.

---

## 3. One-sentence value proposition

**Life-language (canonical):**

> 無料の見取り図で見えた輪郭を土台に、保存版は章立てで読み返しながら、近い人との距離・消耗・迷い・整え方を自分の暮らしの中で読み直せる有料レポートです。

**Must convey:**

- Paid, **rereadable** saved report
- Built on the user’s core result / visible tendencies
- Useful for patterns, fatigue, relationships, work/role, decisions, recovery

**Must not convey:**

- Generic fortune or horoscope result
- Generic chatbot
- Internal jargon (軸, 結節, engine names, factor counts)

---

## 4. Free Core vs paid 保存版

| | Free Core | Paid 保存版 |
|---|-----------|-------------|
| **Role** | 入口 / 無料の見取り図 | 章立てで読み返す deeper report |
| **Gives** | 傾向の輪郭、5つの出方の入口、保存版への土台 | 4章の保存版、深い場面整理、**相談返書 1件付帯** |
| **Is not** | — | 無料の「長文」ではない |

**Canonical bundle note:** 本質の読み解きに加え、相談返書の利用が含まれます。

---

## 5. Paid content volume / 4 chapters

**Do not claim** exact body character counts in public copy unless separately verified and approved. **Do not use 8 chapters.**

| Chapter | Title | Helps user understand | Life concern | LP / reader / My |
|---------|-------|----------------------|--------------|------------------|
| **Ⅰ** | 輪郭を見る | 今出やすい傾向の全体像 | いまの自分の出方 | TOC tag: 全体像 |
| **Ⅱ** | 構造を読む | 力が出る理由・安定 | 近い人との距離・日々の判断 | TOC tag: 動き方の理由 |
| **Ⅲ** | 無理を知る | 無理がたまる場面（非断定） | 疲れ・消耗・関係負荷 | TOC tag: 崩れやすい条件 |
| **Ⅳ** | 楽に扱う | 戻し方・整え方・日常 | 回復・自分への扱い | TOC tag: 戻し方と使い方 |

**Reading model:** 順に読む / 章単位で戻る。保存版は購入時プロフィールに基づく（`dtrSavedReportCopy` notice）。

---

## 6. Life-use cases

| ID | Area | Use |
|----|------|-----|
| work_role | 日々の役目（仕事・家庭） | 抱えやすさ・期待・進め方 |
| relationships | 人との距離・関係 | 期待のずれ・対人消耗 |
| fatigue | 消耗・疲れ | 崩れやすい条件の見える化 |
| decision | 迷い・判断 | 論点の一本化 |
| recovery | 回復・自分への扱い | 戻し方・整え方 |
| consult_moment | 相談したいとき | 保存版読了後の相談返書 |

---

## 7. 相談返書 / AI往復券

| Field | Value |
|-------|--------|
| **Primary user-facing term** | 相談返書 |
| **Included** | 1 reply with paid 保存版 |
| **Additional max** | 4 purchases per report |
| **Total cap** | 5 per report |
| **Additional price** | ¥500 per reply (tax-inclusive display per surface) |
| **Grounded in** | Purchased 保存版 chapters — not generic chat |
| **Where** | `/dtr/core` → 相談返書ルーム (`#consultation-room`); via My / レポート棚 → 開く |

**Good question examples (pattern):** words swallowed with close people tied to 距離 chapter; relationship exhaustion tied to 無理 chapter; recovery tied to 戻し方.

**Out of scope:** unrelated topics; other people’s readings; medical/legal/investment; guarantees; emergencies.

**Avoid overpromising:** no unlimited chat; no “anything can be asked”; no M55 email when report/reply is ready.

**AI往復券:** explanatory bridge only unless a separate gate chooses otherwise.

---

## 8. Purchase and access flow

1. **サインイン** — purchase requires login
2. **お支払い** — `/dtr/lp` → Stripe Checkout; digital; **Stripe payment email** for receipt (existing external fact)
3. **本文の準備** — pending until snapshot ready; check My / 棚
4. **マイページ** (`/my`) — hub: owned reports, profile, support
5. **レポート棚** (`/dtr`) — card CTA: open / pending / purchase
6. **保存版レポート** (`/dtr/core`) — 4-chapter reader
7. **相談返書ルーム** — after reading; wallet/cap in room
8. **サポート・返金** — `/support`, `/legal/refund`, `/legal/tokushoho`

**Do not promise:** M55 report-ready email, reply-ready email, push notifications, marketing newsletter.

---

## 9. Trust boundaries

- Digital content; **no physical delivery**
- **Not** medical, legal, or investment advice
- **No** guaranteed outcomes or deterministic predictions
- **Profile snapshot:** saved at purchase time; nickname may differ from current profile
- **Support:** `/support`, `/legal/refund`, `/legal/tokushoho`
- **Main product price:** ¥1,000 tax-inclusive, one-time (checkout surfaces)

---

## 10. Page inheritance map

| Surface | Inherit from master | Remain local | Must not repeat |
|---------|---------------------|--------------|-----------------|
| `/dtr/lp` | §1–§8 short forms, comparison, chapters, consult, flow, FAQ | CTA modes, price, CheckoutTrustRow | Full body, ConsultRoom UI |
| `/core` | §2 short, §3 full boundary, §6 short, CTA labels | Free sections (hero frozen) | 4-chapter TOC, full FAQ |
| `/dtr/core` reader | §4 names/desc, §2 intro, §6 link, §8 notice | Engine body, CSS | LP sales, purchase CTA |
| `/my` | §1, §7 summary, §6 line, §8 links | Profile, delete, entitlements | Chapter full text, price |
| `/dtr` shelf | §1–§2, §6 meta, §7 CTA | Card art, ownership | Full FAQ |
| **ConsultRoom** | §6 full | Compose, wallet, errors | Product catalog |
| **legal/support** | §8 link context | Statutory text | Authoritative cap/price in legal body |

---

## 11. Forbidden claims

- Unlimited chat / anything can be asked
- Guaranteed result / deterministic future
- Medical / legal / investment advice as product output
- Exact character counts (unverified)
- **準備完了メール** / **返書完了メール** / product update push (M55-owned; not implemented)
- New divination authority or internal engine numerics (33/12, etc.) on public copy
- **8 chapters**, **max 3 replies**, **¥700** add-on as current truth
- **Entry Report**, **Premium**, **Blueprint** as primary Japanese product name
- Scores, %, rankings (M55 global rules)

---

## 12. Next-gate inheritance checklist

### PAID-LP-CONTENT-EXPANSION-IMPLEMENTATION-PLANNING

- [ ] Map LP sections to `PAID_DTR_*` exports
- [ ] No local duplicate of §3–§7 long copy
- [ ] No email notification promises
- [ ] Do not edit payment/checkout

### PAID-LP-CONTENT-EXPANSION-WAVE1-EXECUTION

- [ ] Import `paidDtrProductCopy` in `app/dtr/lp` only (Human GO)
- [ ] Keep CTA modes / PurchaseButton unchanged
- [ ] Forbidden path scan passes

### USER-LANGUAGE-QUALITY-WAVE-A1

- [ ] After LP wave; polish only, no new product truth
- [ ] Align `corePublicCopy` STATIC_CTA → re-export from master

### MY-PAGE-COMPLETENESS-AUDIT-PLANNING

- [ ] §7 flow + §6 cap summary on My
- [ ] No notification prefs until architecture gate

### ENGINE-AUDIT-TRAIL-REPRODUCIBILITY-PLANNING

- [ ] Separate from copy; no engine claims added to master

---

## Evidence

| ID | Note |
|----|------|
| `M55-EVID-20260527-PAID-DTR-PRODUCT-COPY-MASTER-v1-DRAFT` | DRAFT gate artifacts only; no downstream wiring |

**Verdict target (this gate):** `CATEGORY_1_PAID_DTR_COPY_BASE_SSOT_DRAFT_GREEN_LOCAL_CHANGES_NO_COMMIT`
