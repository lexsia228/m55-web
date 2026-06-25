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

**Product truth boundary (copy layer only — values unchanged):**

- **保存版に紐づく相談**（相談返書）。**汎用チャットではない**。**無制限相談ではない**。
- **なんでも答える約束をしない**。**通知・メール送付を約束しない**（M55 起因の準備完了／返書完了／更新メールは未実装）。
- **医療・治療・法律・投資・転職・退職判断の代替にしない**。**辞めろ・別れろ等の絶対助言にしない**。
- **engine / snapshot / result-label** は本マスターで変更しない（表示コピーのみ）。

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

### 7.1 相談返書ルーム — copy boundary（Wave 1 SSOT）

| Rule | Policy |
|------|--------|
| **紐づき** | **保存版に紐づく相談**。購入済み保存版の4章・傾向の範囲で整理する。汎用チャットではない。 |
| **回数・価格（表示のみ）** | **付属1** + **追加最大4** = **合計5**（レポート単位）。追加は **500円**/件。数値の正本は `M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md`（本マスターは追従のみ）。 |
| **1テーマ** | 1回の相談返書は **1テーマ** に絞る。長文は **1テーマに narrow** する。 |
| **入力** | **短文入力は受け入れ可能**。 |
| **感情・対立** | 感情には触れるが **正誤判定で終わらない**。「あなたは悪くない」で締めない。「相手が悪い」と言わない。対立テーマでは **非非難の相手／状況視点を1つ** 含めうる。 |
| **禁止** | 無制限相談・なんでも答える・通知/メール約束・**辞めろ/別れろ** 等の絶対助言・医療/治療/法律/投資/転職/退職の代替。 |
| **締め** | 保存版に根ざした整理のうえ、**小さな一手を1つ**（prompt 実装は別 GO）。 |

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
| `/my` | §1, §7 summary, §6 line, §8 links, **§14** | Profile, delete, entitlements | Chapter full text, price; emotional story overload |
| `/dtr` shelf | §1–§2, §6 meta, §7 CTA | Card art, ownership | Full FAQ |
| **ConsultRoom** | §7, **§7.1**, §12–§13 | Compose, wallet, errors | Product catalog |
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
- **心理的防衛を無効化する** 等の操作系推奨文言（採用しない。代わりに **警戒心を下げる** / **読み進めやすくする**）
- IQ/才能・成功・収入・地位比較、羞恥圧力、「人生を無駄にした」煽り、「本当の理由が必ず分かる」、3分で人生が変わる示唆
- 外部クイズ／コピーの **文言直コピー**（構造のみ M55-safe 変換可 — §12）
- 性別・sex による logic 分岐、**男性脳 / 女性脳**
- praise-hacking、依存誘導、無条件全肯定

---

## 12. Storyflow / 画面リズム

LP・保存版リーダー・相談返書ルーム・My 等の **表示コピー** に適用する運用規則（engine / payment / prompt 実装は別 GO）。

### 12.1 M55 版シーン構造

| 段 | 役割 |
|----|------|
| 起 | お題 |
| 承 | あるある |
| 転 | 転換（非責め再定義） |
| 結 | 読み解き → 次の一手 |

### 12.2 画面リズム

- **one screen = one scene**（1画面 = 1シーン）
- **one heading = one topic**（1見出し = 1トピック）
- 見出しは短く / 本文は可能なら **2–3行** / **次の一手は1行**
- **長い平坦な説明ブロック** を避ける
- デフォルト軸は **日常・近い人・言葉・距離・疲れ・タイミング・期待**（**仕事/キャリアをデフォルトにしない**）

### 12.3 次の一手（micro action）

スマホでできる小さな一手の例：

- 1行だけ置く
- 近い入口を1つ選ぶ
- 保存版の1章だけ見る
- 今の場面だけ送る（相談返書）

### 12.4 外部コピー構造の M55-safe 変換

- 外部クイズ／コピーライティング素材の **文言は採用しない**。**構造／フックのみ** 変換可。

**変換チェーン（推奨）:**

繰り返しの違和感 → 責めない再定義 → 言葉・距離・タイミング・疲れ・期待 → 保存版に戻す → 今の場面に近い入口を1つ

| 区分 | 内容 |
|------|------|
| **採用する構造** | 繰り返しの違和感；同じ場面に戻る；弱いのではなく止まりやすい順番；5軸整理；保存版の近い入口；相談返書で1テーマ；**警戒心を下げる**；**読み進めやすくする** |
| **採用しない** | IQ/才能比較；成功・収入・地位比較；「人生を無駄にした」；**心理的防衛を無効化する**；「本当の理由が必ず分かる」；3分で人生が変わる示唆；羞恥圧力；外部文言直コピー；依存・lock-in・操作系 |

---

## 13. 出力表現方針（温度感 / 具体承認）

**出力表現レイヤーのみ。** UI セレクタ・prompt/code 実装は **本マスターでは承認しない**。engine / snapshot / result-label / 保存版結果 / 4章 / product truth 数値に **影響させない**。

### 13.1 温度感 / 察するUX

- **性別・sex による logic 分岐なし**（**男性脳 / 女性脳** を使わない）
- 許容する表現方向（例）：**そっと整理する** / **はっきり整理する** / **順番にほどく**
- いずれも Anti-sycophancy 境界（§7.1）を満たすこと

### 13.2 具体承認 / 話しやすくするUX

- **観察ベースの承認**（ユーザーが書いた・気づいたことの認識）
- **無条件全肯定・praise-hacking・操作・依存誘導** は不採用
- 短文 OK、長文は **1テーマ** に narrow → **保存版に根ざした構造**へ → **小さな一手1つ**

---

## 14. My page 機能 UI 方針

My page（`/my`）のコピーは **機能 UI**（再開・カード・残数・注記）。**感情ストーリーで埋めない**。

| 要素 | 方針 |
|------|------|
| **保存版再開** | 所有レポートへの再開導線 |
| **相談返書カード** | 保存版紐づき・残数・ルーム再入 |
| **残数表示** | product truth に追従（付属1 + 追加最大4 = 合計5） |
| **購入時点プロフィール注記** | 保存版は購入時プロフィールに基づく旨 |
| **避ける** | **Entry Report** を主日本語商品名にしない；visible **返書チケット** 主名称；My 全体の感情ストーリー過多 |

---

## 15. Next-gate inheritance checklist

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

## 16. Paid 保存版 individualization framing

**Added:** 2026-06-25 — Gate `CATEGORY-1-M55-EXTERNAL-NOTE-PRE-COPY-INDIVIDUALIZATION-FRAMING-REV1`

### 16.1 Context

保存版には、購入時点プロフィール（生年月日）から出る複合的な読み取りを本文内に整理した**補助整理ブロック**が含まれます。
ユーザーが初めて読んだとき「これは何か」と感じた場合の最小説明コピーを定めます。

### 16.2 User-facing labels and their framing

| Block label (body only; not product name) | User-facing framing |
|---|---|
| 【この保存版だけの本質リズム】 | 生年月日から出る月ごとのリズムを、購入時点のプロフィールに合わせて整理したもの |
| 【この保存版だけの補助整理】 | 購入時点のプロフィールから整理した、力が出やすいタイミングと注意しやすい場面の傾向 |
| 【保存版の本質リズム（購入時固定）】 | 相談返書の接地コンテキスト内のみ。ユーザー向けに露出しない |
| 【保存版の補助整理（購入時固定）】 | 同上 |

### 16.3 Canonical copy strings (runtime: `PAID_DTR_INDIVIDUALIZATION_FRAMING`)

```
readerContextJa:
  保存版では、10資質の入口に加えて、生年月日から出る複合的な読み取りを、
  購入時点のプロフィールに合わせて本文内に整理しています。

notSeparateReadingJa:
  これは別の鑑定を追加するものではなく、この保存版を読むための補助整理です。

snapshotFixedJa:
  この補助整理は、購入時点のプロフィールをもとに保存されています。

consultGroundingJa:
  相談返書では、この保存版に保存された内容をもとに、今の相談を1テーマずつ整理します。
```

### 16.4 Rules

- **禁止:** engine 内部キー（lunarMonthKey / solarTermKey / lunarDayKey / boundaryMetadata / stemLaneIndex / djb2 / 干支記号）を UI 文字列に含めない
- **禁止:** 「別の鑑定」「占いの追加」「AI再判定」として誤解させる表現
- **禁止:** 「このタイプ」を paid-user 向け body に使用
- **必須:** 「購入時点固定」であることを最小1文で示す
- 相談返書の「保存版紐づき」フレーミングを維持する（§7.1 との整合）
- `readerContextJa` / `notSeparateReadingJa` は reader 表面（保存版4章）に隣接表示可
- `consultGroundingJa` は ConsultRoom の接地コピーの補助として使用可
- 「外部NOTE」とは note.com 等へのURL公開導線を指す。相談返書・ConsultRoom を「NOTE」と呼ばない

### 16.5 Consult ticket count copy clarity（保存版情報 vs 相談入口）

**Added:** 2026-06-25 — Gate `CATEGORY-1-M55-CONSULT-TICKET-COPY-COUNT-CLARITY-REV1`

| Surface | Shows | Must NOT imply |
|---------|-------|----------------|
| **相談返書入口（ConsultRoom）** | `現在使える相談返書：{count}件` · `使用済み：{used}件` — **current live usable balance** | bare `残り {n}件`（static cap に読める） |
| **保存版の情報（ReportFooterMetaCard）** | 初回付与 1件 + balance pointer | current remaining = 1 when wallet shows 5 |

**Canonical strings (`PAID_DTR_INTRO_CONSULT_NOTE`):**

- `lineJa`: この保存版には、初回の相談返書が1件付いています。
- `balancePointerJa`: 現在の残り件数は、上の相談返書入口に表示されます。
- `metaLabelJa`: 初回付与
- `metaIncludedValueJa`: 1件

**Consult entrance wallet display (`PAID_DTR_CONSULT_ENTRY_NEUTRAL`):**

- `walletAvailableTemplateJa`: 現在使える相談返書：{count}件 — **live current balance** (prominent)
- `walletUsedTemplateJa`: 使用済み：{used}件 — secondary line

Do not use bare `残り {n}件` on the consultation entrance; it reads like a static product cap.

---

## Evidence

| ID | Note |
|----|------|
| `M55-EVID-20260527-PAID-DTR-PRODUCT-COPY-MASTER-v1-DRAFT` | DRAFT gate artifacts only; no downstream wiring |
| `M55-EVID-20260529-SSOT-BODY-REFLECTION-WAVE1-v1` | Wave 1 body reflection — Storyflow, M55-safe conversion, consult boundary, expression/My (local DRAFT; no commit in gate) |

**Verdict target (prior gate):** `CATEGORY_1_PAID_DTR_COPY_BASE_SSOT_DRAFT_GREEN_LOCAL_CHANGES_NO_COMMIT`
