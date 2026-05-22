# Phase 5-6H-5Z-I-V-CORE-DTR-B — Free core vs paid DTR UI implementation planning gate（2026-05-21 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-B** |
| **Title** | **Free core vs paid DTR UI implementation planning** |
| **Classification** | **Category 1 / UI implementation planning / docs-only / no-mutation** |
| **Verdict** | **`FREE_CORE_PAID_DTR_UI_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-B-FREE-CORE-PAID-DTR-UI-IMPLEMENTATION-PLAN-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **CORE-DTR-A** — **`M55-EVID-20260521-5Z-I-V-CORE-DTR-A-FREE-CORE-PAID-DTR-SNAPSHOT-CONSISTENCY-POLICY-PLAN-001`** |

**Execution:** **none** — UI spec + file map only.** **No** code, DB, deploy, checkout.

---

## B. Drift判定ヘルパー仕様（`lib/m55/dtrProfileDrift.ts` — 新規予定）

### B1. Inputs（no raw user_id in return payload）

| Field | Source | Notes |
|-------|--------|-------|
| **current** | Server: latest draft or client-synced profile via API | `{ birthDate, nickname }` |
| **snapshot** | `dtr_report_snapshots.profile_snapshot` | Immutable purchase profile |
| **product** | `DTR_CORE_STATIC_V1` | Single SKU for v1 |

**Forbidden in helper I/O:** `user_id`, email, session, Stripe IDs.

### B2. Normalization

| Field | Rule |
|-------|------|
| **birthDate** | Trim → take **`YYYY-MM-DD`** prefix；invalid → treat as **unknown** |
| **nickname** | Trim；Unicode NFKC optional；compare **case-insensitive** for equality |

### B3. Drift levels（CORE-DTR-B decision）

| Level | Condition | UX tier |
|-------|-----------|---------|
| **`none`** | No snapshot row OR no current birthDate | No drift UI（unowned / no profile） |
| **`match`** | **birthDate equal**（nickname may differ） | **Primary** paid path — open `/dtr/core` |
| **`nickname_only`** | birthDate equal；nickname differs | **Cosmetic** badge only：「表示名は購入時と異なります」；**still primary open** |
| **`birthDate_drift`** | birthDate differs | **Full drift** — soft-hide primary；repurchase CTA |
| **`unknown`** | Parse failure on either side | Fail-closed：**no primary open**；support copy |

**Rationale:** Stem / engine index is driven by **birthDate**（`essenceStemLaneIndex`）— nickname alone must **not** block opening purchased report.

### B4. Helper API（planning signature）

```ts
export type DtrProfileDriftLevel =
  | 'none'
  | 'match'
  | 'nickname_only'
  | 'birthDate_drift'
  | 'unknown';

export type DtrProfileSnapshotProfile = {
  birthDate: string;
  nickname: string;
};

export type DtrProfileDriftResult = {
  level: DtrProfileDriftLevel;
  /** Safe display only — no user_id */
  snapshotNickname: string | null;
  snapshotBirthDateLabel: string | null; // e.g. "1983-02-28" formatted JP optional
  currentBirthDate: string | null;
  isPrimaryOpenAllowed: boolean; // true for match | nickname_only
};

export function compareDtrProfileDrift(
  current: DtrProfileSnapshotProfile | null,
  snapshot: DtrProfileSnapshotProfile | null
): DtrProfileDriftResult;
```

### B5. Server aggregation（extend existing API — no new DB write）

**Preferred:** extend **`GET /api/dtr/report-snapshot-ready`** response（authenticated only）:

| New field | Type | Purpose |
|---------|------|---------|
| **`profileDriftLevel`** | `DtrProfileDriftLevel` | Client `/my`, `/dtr` |
| **`snapshotProfile`** | `{ birthDate, nickname } \| null` | Display「購入時」meta only |
| **`isPrimaryOpenAllowed`** | `boolean` | Gate primary CTAs |

**Server-side:** after `getDtrReportSnapshot`, load current profile from **`getLatestDraftForUser(userId)`** OR pass current from client **only as display fallback** — **prefer server draft** for drift truth.

**Do not** add DELETE or UPDATE to snapshot in this API.

---

## C. `/my` UI仕様

### C1. Section structure

| Block | Behavior |
|-------|----------|
| **Primary row** | Entry Report owned row when `hasOwnership` |
| **Sort** | `match` / `nickname_only` first；`birthDate_drift` under **折りたたみ** |
| **Empty** | Unchanged unowned copy |

### C2. Row states

| `profileDriftLevel` | Badge | Primary CTA | Secondary |
|---------------------|-------|-------------|-----------|
| **`match`** | **購入済み** | **開く** → `/dtr/core` | — |
| **`nickname_only`** | **購入済み** + **表示名のみ変更** | **開く** | Sub: 購入時のニックネーム表示 |
| **`birthDate_drift`** | **購入時のプロフィール** | **保存版を見る** → `/dtr/core`（secondary style） | **いまのプロフィールで新しい読み解き** → `/dtr/lp` |
| **`pending`** | **準備中** | — | existing |
| **`unknown`** | **確認できませんでした** | サポート | — |

### C3. Copy（fixed strings — `lib/m55/coreDtrDriftCopy.ts` 新規予定）

| Key | JP |
|-----|-----|
| **badge_purchase_profile** | **購入時のプロフィール** |
| **badge_nickname_only** | **表示名のみ変更** |
| **note_not_deleted** | **購入済みの保存版は削除されず、購入時の内容のまま残ります** |
| **cta_open_primary** | **開く** |
| **cta_open_archive** | **購入時の保存版を見る** |
| **cta_new_reading** | **いまのプロフィールで新しい読み解き（保存版）を入手する** |

### C4. Soft-hide（`/my`）

| Element | Policy |
|---------|--------|
| **折りたたみ `<details>`** | Title: **購入時のプロフィールで作成した保存版**；contains drifted row |
| **Default open** | **match** row expanded；drift section **collapsed** |
| **Forbidden copy** | 削除済み / 無効 / 失効（profile drift reason） |

### C5. Profile intake card

| Addition | When user saves new birthDate and owned+drift |
|----------|-----------------------------------------------|
| Quiet alert | **プロフィールを更新しました。無料の本質（/core）に反映されます。購入済み保存版は購入時のプロフィールのままです。** |

---

## D. `/core` copy仕様

### D1. New banner component — `CoreProfileContextBand.tsx`（予定）

| State | Content |
|-------|---------|
| **Always（profile ready）** | Overline: **いまのプロフィールに基づく本質** — Sub: **生年月日や表示名を変えると、ここに表示される輪郭も変わります。保存版（有料）とは別の画面です。** |
| **Owned + `birthDate_drift`** | Add line: **購入済みの保存版は購入時のプロフィールで固定されています。** Link: **購入時の保存版を見る** → `/dtr/core`（secondary） |
| **Owned + `match`** | Optional: **購入済み保存版を見る** → `/dtr/core` |

**Placement:** Below hero or above `CoreEntryReportCTASection` — **inside card surface only**（NoTouch global background）.

### D2. `CoreEntryReportCTASection` CTA copy（drift branch）

| State | Primary button |
|-------|----------------|
| **Unowned or no drift data** | Existing **本質の読み解きを見る** → `/dtr/lp` |
| **`birthDate_drift` + owned** | **いまのプロフィールで、新しい読み解き（保存版）を入手する** |
| **`match` + owned** | **保存版を開く** → `/dtr/core` **or** keep LP upsell secondary |

**Sub（drift):** **以前購入した保存版は残ります（上書き・削除はしません）。**

### D3. Hero / type labels

| Rule | Value |
|------|--------|
| **Do not** use **保存版** on `/core` hero | — |
| **Footnote** under type | **※プロフィール変更で変わる場合があります** |

---

## E. `/dtr` / `/dtr/core` copy仕様

### E1. `/dtr` shelf（extend `DtrShelfPanel` + server props）

| `profileDriftLevel` | Shelf behavior |
|---------------------|----------------|
| **`match` / `nickname_only`** | Existing owned ready path — **レポートを開く** |
| **`birthDate_drift`** | Card shows **保存版（購入時）**；meta line **購入時: {birthDate}**；no current-profile stem on poster；CTA **購入時の保存版を見る**；footnote **いまの見え方は /core で確認** |
| **owned + !snapshotReady** | Unchanged recovery |

**Pass from server:** `profileDriftLevel`, `snapshotProfile`, `isPrimaryOpenAllowed` alongside `ownedShelfDisplay`.

### E2. `/dtr/core` reader header

| Element | Copy |
|---------|------|
| **Meta strip** | **購入時のプロフィールで作成された保存版** |
| **Sub** | **{nickname}さん · {birthDate JP format}**（from snapshot only） |
| **Drift banner（if current ≠ snapshot birthDate）** | **マイページの生年月日が購入時と異なります。このレポートは購入時の内容のままです。** Link: **いまのプロフィールの本質** → `/core` |
| **Forbidden** | Implying content was **updated** to match current profile |

**Do not** change `runDtrEngine` input — always **`snap.profile_snapshot`**.

### E3. Evidence

| Rule | Implementation |
|------|----------------|
| **No snapshot DELETE** | — |
| **No envelope overwrite** | Reader may re-run engine for copy refresh（existing）but **profile_snapshot immutable** |

---

## F. 追加購入 CTA 仕様

| Field | Value |
|-------|--------|
| **Headline** | **いまのプロフィールで、新しい読み解き（保存版）を入手する** |
| **Sub** | **すでにお持ちの保存版は削除されず、購入時の内容として残ります。** |
| **Target** | `/dtr/lp`（v1 — same SKU policy TBD in commerce gate） |
| **Checkout** | **CORE-DTR-C では実行しない** — separate payment gate |
| **When shown** | `birthDate_drift` on `/core`, `/my`, `/dtr` shelf |

**Future SKU note（docs only):** Second purchase may need new `product_id` — **out of CORE-DTR-C** scope.

---

## G. Soft-hide 仕様（summary）

| Surface | Primary path | Secondary / collapsed |
|---------|--------------|------------------------|
| **`/my`** | Current-profile match row | Drifted row in `<details>` |
| **`/dtr` nav default** | Prefer `/core` link in drift banner | Archive open on shelf |
| **Home** | **No change**（frozen） | — |
| **Global nav `/dtr`** | Still reachable | Shelf shows archive semantics |

**Soft-hide ≠ remove:** Entitlement APIs unchanged；row/count truth preserved.

---

## H. No-delete CONTROL — implementation方針

### H1. SSOT（existing + extend）

| Artifact | Action |
|----------|--------|
| **CORE-DTR-A §G** | Keep **CONTROL-CORE-DTR-01〜06** |
| **`.cursorrules` or `docs/ssot/M55_CORE_DTR_EVIDENCE_PRESERVATION_CONTROL_v1.md`** | New short CONTROL file in **CORE-DTR-C** |

### H2. Code comments（CORE-DTR-C）

| Location | Comment template |
|----------|------------------|
| **`dtrProfileDrift.ts`** | `// CORE-DTR: UI-only drift. Never DELETE snapshot/entitlement on drift.` |
| **`report-snapshot-ready/route.ts`** | `// Read-only aggregation. No snapshot mutation.` |
| **Any PR touching `dtr_report_snapshots`** | Require CONTROL checklist in PR template |

### H3. Explicit non-goals in helper

```ts
// FORBIDDEN in drift UX path:
// - DELETE FROM dtr_report_snapshots
// - UPDATE profile_snapshot to match current profile
// - REVOKE entitlement_rights for drift
```

### H4. UI vs DB table（docs for reviewers）

| Action | Classification |
|--------|----------------|
| Hide primary CTA | **UI soft-hide** — allowed |
| Remove list item in React only while API still returns ownership | **Discouraged** — prefer collapsed `<details>` with truth |
| DELETE row | **Forbidden** |

---

## I. Implementation target files

| Priority | File | Change class |
|----------|------|--------------|
| **P0** | **`lib/m55/dtrProfileDrift.ts`** | **new** — compare helper |
| **P0** | **`lib/m55/coreDtrDriftCopy.ts`** | **new** — JP strings |
| **P0** | **`app/api/dtr/report-snapshot-ready/route.ts`** | Extend JSON — read-only drift |
| **P0** | **`lib/m55/dtrShelfAccess.ts`** | Optional: attach drift + snapshot profile to authenticated return |
| **P1** | **`components/my/MyPanel.tsx`** | Row states, collapse, banners |
| **P1** | **`components/dtr/DtrShelfPanel.tsx`** | Drift shelf modes |
| **P1** | **`app/dtr/page.tsx`** | Pass drift props |
| **P1** | **`components/dtr/DtrFullReader.tsx`** | Purchase-time meta banner |
| **P2** | **`components/core/CoreProfileContextBand.tsx`** | **new** |
| **P2** | **`components/core/CoreEssencePanel.tsx`** | Wire band + drift fetch |
| **P2** | **`components/core/CoreEntryReportCTASection.tsx`** | Drift CTA branch |
| **P2** | **`components/core/corePublicCopy.ts`** | Add drift CTA strings |

**Est. diff:** ~400–650 LOC + CSS module additions.

---

## J. Non-target一覧

| Path | Reason |
|------|--------|
| **`app/home/**`, `components/home/**` | Frozen |
| **`dtrOwnershipGate.ts`**, Stripe, webhook | No logic change |
| **`upsertDtrReportSnapshotAtFulfillment`** | No behavior change |
| **`dtrEngine.ts` body** | No snapshot sync |
| **TL-F7 type table unification** | Separate gate |
| **Second SKU / commerce** | Separate gate |
| **Repair runners** | No drift-driven delete |
| **AX-PROD / AL** | Forbidden |

---

## K. Acceptance criteria（CORE-DTR-C）

| ID | Criterion |
|----|-----------|
| **AC-CD-01** | birthDate change after purchase → `/core` updates；`/dtr/core` text unchanged |
| **AC-CD-02** | `/my` shows **購入時のプロフィール** badge + archive open；not **削除済み** |
| **AC-CD-03** | Repurchase CTA visible on drift；checkout **not** in CORE-DTR-C gate |
| **AC-CD-04** | nickname-only change → **開く** still allowed |
| **AC-CD-05** | No DELETE in diff touching snapshots/entitlements |
| **AC-CD-06** | API returns `profileDriftLevel` without raw user_id |

---

## L. No-mutation statement

- **No** code / deploy / DB / checkout / env / Stripe / Clerk
- **No** raw ID / email / session / secret

---

## M. Next gate

| Priority | Gate |
|----------|------|
| **Recommended** | **`5Z-I-V-CORE-DTR-C`** — implementation execution（Category 2 Human GO） |
| **Optional** | **`CORE-DTR-B-R`** — planning review if Human wants sign-off before code |
| **Separate** | **Commerce gate** if second purchase SKU needed |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-B-FREE-CORE-PAID-DTR-UI-IMPLEMENTATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-A-FREE-CORE-PAID-DTR-SNAPSHOT-CONSISTENCY-POLICY-PLAN-001`** | Policy |
