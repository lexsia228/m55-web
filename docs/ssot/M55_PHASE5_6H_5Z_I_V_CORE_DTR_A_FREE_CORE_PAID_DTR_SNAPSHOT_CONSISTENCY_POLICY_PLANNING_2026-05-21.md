# Phase 5-6H-5Z-I-V-CORE-DTR-A — Free core vs paid DTR snapshot consistency policy planning gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-A** |
| **Title** | **Free core vs paid DTR snapshot consistency policy planning** |
| **Classification** | **Category 1 / policy planning / docs-only / no-mutation** |
| **Verdict** | **`FREE_CORE_PAID_DTR_SNAPSHOT_CONSISTENCY_POLICY_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-A-FREE-CORE-PAID-DTR-SNAPSHOT-CONSISTENCY-POLICY-PLAN-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Related** | **TL-F7**（type table unification — **out of scope** for CORE-DTR-A）；**TL-FIX-C**（paid shelf uses snapshot stem） |

**Execution:** **none** — policy SSOT only.** **No** evidence delete, DB write, or UI implementation.

---

## B. Observed phenomenon（Human / product）

| Observation | Interpretation |
|-------------|----------------|
| **`/core`** result changes when **MyPage** birth date is edited | **Expected** — free layer is **current-profile mutable preview** |
| Example: **熱量先導 / INFLUENCER** → **協調支援 / MANAGER** | **Profile input change** + **free `TYPE_CATALOG` framing** |
| **`/my`** still lists **購入済みレポート** | **Expected** — **entitlement + snapshot row preserved** |
| User perceives **free core ≠ paid DTR** as “same reading broke” | **Expectation mismatch**, not necessarily fulfillment bug |

---

## C. Root cause classification

| Class | Applies? | Notes |
|-------|----------|-------|
| **C1 — By-design product split** | **yes（primary）** | Free **mutable preview** vs paid **purchase-time immutable snapshot** |
| **C2 — Profile mutation after purchase** | **yes** | `ProfileRepository.save` updates current profile；**does not** rewrite `dtr_report_snapshots` |
| **C3 — DB inconsistency / corruption** | **no（default）** | Snapshot + entitlement **intentionally retained**；not evidence of orphan delete |
| **C4 — Engine bug on paid path** | **unlikely** | Paid body gated on **`profile_snapshot`**；re-derived text uses same birthDate at purchase |
| **C5 — Type label table divergence** | **yes（secondary）** | Free **`TYPE_CATALOG`** vs paid **`TEN_STEM_DISPLAY` / `DTR_TYPE_EN`** — even same stem index can read differently（**5Z-I-U F-U-CORE-03**） |
| **C6 — Shelf vs core stem source（pre-TL-FIX-C）** | **mitigated @ 5c9248f** | Owned shelf now uses **snapshot**；**`/core` still independent** |

**Verdict:** **Not a single bug** — **policy + UX disclosure** issue.** **Do not “fix” by deleting paid artifacts.**

---

## D. Canonical policy（SSOT）

| # | Rule | Mandatory |
|---|------|-----------|
| **P1** | **`/core`** = **current profile–based mutable preview**（輪郭・今日の見え方） | **yes** |
| **P2** | **`/dtr/core`** = **purchase-time `profile_snapshot`–based immutable paid report** | **yes** |
| **P3** | **`dtr_report_snapshots`**, **`entitlement_rights`**, **`entitlements`**, **`one_time_fulfillments`**, checkout evidence → **never hard-delete** for profile drift | **yes** |
| **P4** | Profile change **does not** mutate paid snapshot rows | **yes** |
| **P5** | New reading after profile change → **additional purchase lane**（new product session / future SKU policy），not overwrite | **yes** |
| **P6** | UI may **de-emphasize or hide** stale paid entry from **primary nav** when **current profile ≠ snapshot profile** | **yes** |
| **P7** | **Hard delete** of paid evidence / snapshots / entitlements → **forbidden** | **yes** |
| **P8** | **Evidence preservation** for support / admin / audit → **mandatory** | **yes** |
| **P9** | **TL-F7**（unify free/paid type tables）is **separate** — does not change P1–P2 immutability | **yes** |

---

## E. UI policy（user-facing）

### E1. `/my` — 購入済みレポート一覧

| State | Display policy |
|-------|----------------|
| **snapshot profile === current profile**（normalized birthDate + nickname policy TBD） | Show **購入済み** row；primary CTA **レポートを開く** → `/dtr/core` |
| **snapshot profile ≠ current profile** | Row **remains in list**（ownership truth）but tagged **保存時のプロフィール** / **現在のプロフィールと異なります**；primary CTA → **詳細** or **保存版を見る**（secondary）；**not** default “your current reading” |
| **entitlement without snapshot** | Keep **準備中** path（existing）；no delete |

**Do not remove** purchased row from `/my` solely due to drift — **status + copy** change only.

### E2. Primary navigation（`/dtr` shelf · Home CTAs）

| State | Policy |
|-------|--------|
| **Owned + profile match** | **レポートを開く** → `/dtr/core` |
| **Owned + profile drift** | **Do not** present shelf card type/hero as “your current essence”；show **保存版（購入時）** + link **保存版を見る**；optional quiet note **プロフィール変更後の見え方は無料の本質で確認できます** → `/core` |
| **Unowned** | Unchanged purchase funnel |

### E3. Past saved report visibility

| Tier | Policy |
|------|--------|
| **Primary user path** | **Hide misleading equivalence** — paid report not marketed as “current profile reading” |
| **Secondary path** | **Allowed:** “購入時の保存版を見る” with **fixed date / nickname** visible |
| **Collapsed / advanced** | Optional **折りたたみ** “過去の保存版” — never implies deletion |
| **Forbidden** | Implying report was **revoked** or **deleted** because profile changed |

### E4. Additional purchase CTA（profile drift）

| Element | Recommended copy direction |
|---------|---------------------------|
| **JP headline** | **いまのプロフィールで、新しい読み解き（保存版）を入手する** |
| **Sub** | 購入済みの保存版は購入時の内容のまま残ります（削除されません） |
| **Target** | `/dtr/lp` or future **second-purchase** SKU — **not** overwrite snapshot |
| **Forbidden** | “再計算して上書き”“古いレポートを削除して更新” |

### E5. Type label distinction（`/core` vs `/dtr/core`）

| Surface | Label policy |
|---------|----------------|
| **`/core`** | **輪郭** / **いまの本質** — avoid **保存版** / **購入済み**；use **`TYPE_CATALOG` labels** with footnote **プロフィール変更で変わります** |
| **`/dtr/core`** | **本質の読み解き（保存版）** — **購入時固定**；**`TEN_STEM_DISPLAY.publicTitle`**；show **保存日・ニックネーム（購入時）** in meta |
| **Cross-link** | One quiet line on `/core` when owned+drift: **購入済み保存版は別画面（購入時のプロフィール）** |

---

## F. Evidence preservation policy（support / admin）

| Artifact | Preservation | Admin access |
|----------|--------------|--------------|
| **`dtr_report_snapshots`** | **immutable** | Read-only SQL / dashboard；**no DELETE** in runbooks |
| **`envelope_json` + `profile_snapshot`** | **immutable** | Compare to current `ProfileRepository` / draft — **labels only** |
| **Stripe checkout / webhook / `one_time_fulfillments`** | **retain** | Idempotent replay docs only |
| **`entitlement_rights`** | **retain** | Repair adds rights；**never** strip on drift |
| **Reply wallet / consult threads** | **bound to `report_instance_id`** | Orphan policies **separate** — not drift-driven delete |

**Support script tone:** “購入時の保存版は残っています。マイページの生年月日変更は無料の本質に反映され、保存版は購入時のままです。”

---

## G. No-delete CONTROL（AI / Cursor / repair）

| Control ID | Rule |
|------------|------|
| **CONTROL-CORE-DTR-01** | **Never** propose `DELETE FROM dtr_report_snapshots` for profile mismatch |
| **CONTROL-CORE-DTR-02** | **Never** propose entitlement / fulfillment **revocation** solely because `/core` type changed |
| **CONTROL-CORE-DTR-03** | **Never** propose “sync snapshot to current profile” without **explicit Human GO + migration gate** |
| **CONTROL-CORE-DTR-04** | UI work **may** hide primary links；**may not** hard-delete rows |
| **CONTROL-CORE-DTR-05** | Repair runners (**5Z-I-Q class**）**add** artifacts only unless separate **legal/delete gate** |
| **CONTROL-CORE-DTR-06** | Docs must state **drift is expected** before any “data cleanup” planning |

**Violation severity:** **critical** — same class as Stripe double-charge / entitlement strip.

---

## H. Profile drift detection（planning — implementation in CORE-DTR-B）

| Signal | Source | Use |
|--------|--------|-----|
| **Current profile** | `ProfileRepository` or server draft | Compare |
| **Snapshot profile** | `dtr_report_snapshots.profile_snapshot` | Immutable |
| **Normalize** | `birthDate` ISO date；`nickname` trim case-fold | Mismatch → **drift** |
| **Do not use** | Re-derived engine type equality alone | Type tables differ（TL-F7） |

---

## I. Decision matrix（§検討項目 1–7）

| # | Topic | CORE-DTR-A decision |
|---|--------|---------------------|
| **1** | `/my` 購入済み表示 | **Keep row**；add **drift badge** + secondary open |
| **2** | profile ≠ snapshot | **De-emphasize** primary；**allow** secondary view |
| **3** | 過去保存版 | **Not hidden from DB**；**off primary path**；**fold optional** |
| **4** | 追加購入 CTA | **新しい読み解き（保存版）** — no overwrite language |
| **5** | support/admin 証跡 | **Full row retention**；read-only diagnostics |
| **6** | type label | **Free = 輪郭/mutable**；**Paid = 保存版/購入時固定**（TL-F7 separate） |
| **7** | CONTROL | **§G** — mandatory |

---

## J. No-mutation statement

- **No** code / UI implementation
- **No** DB write / snapshot delete / entitlement delete
- **No** deploy / env / Stripe / Clerk / Slack
- **No** raw user_id / email / session / secret

---

## K. Next gate

| Priority | Gate | Scope |
|----------|------|-------|
| **Recommended** | **`5Z-I-V-CORE-DTR-B`** | **UI implementation planning** — drift detection helper, `/my` copy, `/dtr` shelf states, CTA strings, no-delete guards in components |
| **Separate** | **TL-F7** | Type table unification（optional product decision） |
| **Not in B** | Evidence delete / snapshot rewrite / entitlement strip | **Forbidden without new legal gate** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-A-FREE-CORE-PAID-DTR-SNAPSHOT-CONSISTENCY-POLICY-PLAN-001`** | **本条** |
| **`M55-EVID-20260516-5Z-I-U-UI-UNLOCK-TYPE-MISMATCH-READONLY-DIAGNOSTIC-001`** | Type source / catalog divergence |
| **`M55-EVID-20260521-5Z-I-V-TL-FIX-C-TYPE-LABEL-MISMATCH-IMPLEMENTATION-EXECUTION-001`** | Paid shelf snapshot stem |
