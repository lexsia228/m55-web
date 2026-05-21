# Phase 5-6H-5Z-I-V-CORE-DTR-UI-GUARD-A — Permanent saved report notice planning（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-UI-GUARD-A** |
| **Title** | **Permanent saved report notice badge planning** |
| **Classification** | **Category 1 / UI guard planning / docs-only** |
| **Verdict** | **`CORE_DTR_UI_GUARD_A_SAVED_REPORT_NOTICE_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-UI-GUARD-A-001`** |
| **Date** | **2026-05-21** |
| **Surface** | **`/dtr/core`** owned saved report reader |
| **Policy anchor** | **CORE-DTR-A** P1–P2；**CORE-DTR-B** E5 paid surface copy |

**Planning only.** No code, deploy, checkout, DB write, env, or VERIFY-C.

---

## B. Problem statement

| Risk | Mitigation |
|------|------------|
| User edits **My Page** profile → **`/core`** changes | Expected（mutable preview） |
| User assumes **`/dtr/core`** tracks live profile | **Misread** — paid body is **purchase-time snapshot** |
| Future **v2** snapshots alongside **legacy** | Same UX guard for **both** read modes |
| Support asks “report disappeared” | Notice states **preserved at purchase time** without **削除** language |

**Human attestation（POST-DEPLOY）：** legacy owned report **資質 / クリエイター** stable — notice must **not** obscure hero type card.

---

## C. Copy（fixed — implementation must match exactly）

| Key | JP（canonical） |
|-----|----------------|
| **`saved_snapshot_notice_primary`** | **この保存版は、購入時点のプロフィールをもとに作成・保存されています。** |

**Forbidden in this notice and adjacent UI:**

| Forbidden | Reason |
|-----------|--------|
| **削除** | Implies revocation |
| **再計算** | Implies engine rerun |
| **上書き** | Implies snapshot mutation |
| **通知** / bell / unread | M55 notification ban |
| **おすすめ / 最適 / 成功** | Ranking ban |

**Optional secondary line（B-phase defer — not in A scope）：**

| Key | JP | Status |
|-----|-----|--------|
| `saved_snapshot_notice_secondary` | マイページでプロフィールを変更しても、保存版の本文は変わりません。 | **optional** GUARD-B+ if Human wants |

**A-phase:** **primary line only**（single sentence per user directive）.

---

## D. Placement options

| Option | Location | Pros | Cons | Verdict |
|--------|----------|------|------|---------|
| **A（推奨）** | **`PremiumHero` 直後** · `#dtr-core-analysis` **直前** | Hero（資質/クリエイター）と本文の境界が明確；常時 visible on load；legacy/v2 共通 | Adds ~1 band height | **SELECT** |
| B | Inside hero overlay under type card | Tight coupling to hero | Competes with **資質 / クリエイター**；busy poster | reject |
| C | Top of first article `s1_identity` | Near “正文” | Easy to miss after scroll；late discovery | reject |
| D | `app/dtr/core/page.tsx` above `DtrFullReader` | Server wrapper | Duplicates reader ownership；harder to style with reader tokens | reject |

### D1. Recommended layout（ASCII）

```text
[ PremiumHero — 保存済み chips · Blueprint · 資質/クリエイター ]
[ SavedSnapshotNotice — 1-line editorial strip ]  ← NEW (Option A)
[ #dtr-core-analysis — saved report sections … ]
```

**DOM sketch:**

```text
div.reportRoot
  div.reportMain
    header.premiumHero
    aside|div.savedSnapshotNotice   ← role="note" aria-label="保存版について"
    section#dtr-core-analysis.savedReportShell
```

---

## E. Visual treatment（notice strip — not notification UI）

| Token | Guidance |
|-------|----------|
| **Component name** | `SavedSnapshotNotice`（avoid `Notification*` / `Unread*` class names） |
| **Style** | Quiet **editorial strip**：subtle border + muted text（mirror `ConsultRoom.readOnlyNotice` tone） |
| **Density** | Single line · `0.875rem` · line-height ~1.65 · padding 12–14px |
| **Motion** | No infinite animation；**prefers-reduced-motion** → static |
| **Icon** | Optional small **shield / document** inline SVG — **no** bell |
| **Persistence** | Always rendered when `purchasedSnapshot` path active — **no** dismiss button（permanent guard） |

**Do not** use ranking/score visuals or % meters.

---

## F. Target files（GUARD-B scope）

| File | Change |
|------|--------|
| **`components/dtr/DtrFullReader.tsx`** | Insert `<SavedSnapshotNotice />` between `<PremiumHero />` and `#dtr-core-analysis` |
| **`components/dtr/DtrFullReader.module.css`** | `.savedSnapshotNotice` + text（surface-local only） |
| **`lib/m55/dtrSavedReportCopy.ts`**（**new**） | Export `SAVED_SNAPSHOT_NOTICE_PRIMARY` constant |
| **`components/dtr/SavedSnapshotNotice.tsx`**（**new**, optional) | Thin presentational component if split preferred |

**Do not modify:**

| File | Reason |
|------|--------|
| `app/dtr/core/page.tsx` | Reader already owns snapshot props — notice is reader concern |
| `lib/m55/dtrDraftDb.ts` / snapshots | No DB |
| `storedEnvelopeRead.ts` | Read path unchanged |
| `/home/**` | Frozen |
| Storefront frozen pages | Out of scope |

**Mode fork:** **no** `engine_version` branch for copy — **same string** for **legacy** and **v2** envelopes.

---

## G. Acceptance criteria（GUARD-B）

| ID | Criterion |
|----|-----------|
| **AC-01** | Owned **`/dtr/core`** with readable snapshot shows notice **above** first report section |
| **AC-02** | Copy **exactly** matches §C primary line |
| **AC-03** | **資質 / {publicTitle}** hero block unchanged in layout（no overlap/truncation on mobile） |
| **AC-04** | Legacy snapshot（NULL `engine_context_json`）shows notice |
| **AC-05** | Future v2 snapshot（non-NULL columns）shows **same** notice when flag ON later |
| **AC-06** | No **削除 / 再計算 / 上書き** in notice DOM |
| **AC-07** | No notification bell / unread / counter UI introduced |
| **AC-08** | `html`/`body` background untouched（styles inside reader surface） |
| **AC-09** | Anonymous `/dtr/core` redirect unchanged — notice only on owned reader |
| **AC-10** | No checkout CTA added in notice band |

**Human smoke（post GUARD-B deploy）：** re-check owned `/dtr/core` on **`m55-webv2.vercel.app`** — notice visible + **資質 / クリエイター** still stable.

---

## H. Relationship to other gates

| Gate | Relationship |
|------|--------------|
| **CORE-DTR-VERIFY-B-R** | Independent — counts preflight can proceed in parallel |
| **CORE-DTR-VERIFY-C** | Unblocked by this UI guard — notice reduces misread during verify |
| **CORE-DTR-B implementation** | Drift CTAs on `/my` — **separate**；this notice is **`/dtr/core` only** |
| **ENGINE-ENV-GO** | v2 fulfillment ON later — notice still applies |
| **10k bulk test** | **out of scope** |

---

## I. No-mutation statement

| Action | Status |
|--------|--------|
| Code change | **no**（this gate） |
| deploy | **no** |
| checkout / payment / webhook | **no** |
| Production DB write / snapshot mutation | **no** |
| env / v2 fulfillment flag | **no** |
| CORE-DTR-VERIFY-C | **no** |

---

## J. Next gate

| Gate | Deliverable |
|------|-------------|
| **`CORE-DTR-UI-GUARD-B`** | Implement §D Option A + §F files + §G acceptance |
| **`CORE-DTR-UI-GUARD-B-R`** | Human UI verify on Production |
| **`CORE-DTR-UI-GUARD-B-COMMIT`** | SSOT + push `work/home-cluster` |

**Parallel:** **CORE-DTR-VERIFY-B-R** Human counts poll.

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Initial planning after Production + Human smoke GREEN |
