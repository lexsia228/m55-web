# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D — Hide API + `/my` UI implementation planning（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D** |
| **Title** | **Hide API and My Page delete UI — implementation planning** |
| **Classification** | **Category 1 / implementation planning / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_IMPLEMENTATION_PLANNING_GREEN_NO_CODE_NO_DEPLOY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **C-D-R** @ **`0d62c49`** — `CORE_DTR_SOFT_HIDE_REPURCHASE_C_D_R_PRODUCTION_APPLY_GREEN` |
| **Policy anchor** | `M55_PHASE5_6H_5Z_I_V_CORE_DTR_SOFT_HIDE_REPURCHASE_A_USER_VISIBLE_HIDE_REPURCHASE_SPEC_PLANNING_2026-05-21.md` §B1.3 |

**Planning only.** No code, deploy, checkout test charge, Production DB write, or **VERIFY-C**.

---

## B. Production DB state（C-D-R — binding）

| Item | Production（m55-soul-core） |
|------|---------------------------|
| **user_hidden_* columns** | **active** |
| **partial unique index** | **active** |
| **total_snapshot_rows** | **6** |
| **user_hidden_at_nonnull_count** | **0** |
| **App layer** | **not implemented** |

---

## C. Implementation track split（deploy separation）

| Track | Gate | Scope | Deploy? |
|-------|------|-------|---------|
| **D-READ** | **SOFT-HIDE-D-READ** | `getVisibleDtrReportSnapshot` + all read-path call sites | Preview first |
| **D-HIDE-API** | **SOFT-HIDE-D-API** | `POST` hide endpoint + server hide helper | Preview first |
| **D-MY-UI** | **SOFT-HIDE-D-MY** | `/my` delete button + dialog + toast | Preview first |
| **D-CHECKOUT** | **SOFT-HIDE-D-CHECKOUT** | Visible-only block + repurchase lane | Preview first；**no live charge** in gate |
| **D-FULFILL** | **SOFT-HIDE-D-FULFILL** | Multi-row INSERT on repurchase + wallet link | After D-CHECKOUT planning |
| **D-PROD-R** | Human smoke | Production deploy **after** preview GREEN | Separate Human GO |

**Rule:** **Never** bundle schema migration deploy with app deploy — schema **already applied** @ C-D-R.

---

## D. §1 — `/my` 保存版カード「削除」UI

### D1.1 Placement

| Surface | Element | When shown |
|---------|---------|------------|
| **`OwnedReportsBlock`** core row | Text button **削除** | `snap.ready === true`（visible snapshot exists） |
| **Style** | Quiet destructive-secondary（not bell/badge） | Match `MyPanel.module.css` tokens |
| **After success** | Row **removed** from list（client refetch `report-snapshot-ready`） | No 「元に戻す」 |

### D1.2 Files

| File | Change |
|------|--------|
| `components/my/MyPanel.tsx` | Delete trigger + modal state on core row |
| `components/my/MyPanel.module.css` | `.deleteReportBtn` — surface-local |
| `components/my/SavedReportDeleteDialog.tsx`（**new**） | Presentational dialog |
| `components/my/SavedReportDeleteToast.tsx`（**new**, optional inline) | Toast strip |

### D1.3 `/home` freeze

**Do not modify** `app/home/**` or `components/home/**` per m55-home-no-touch.

---

## E. §2 — 確認ダイアログ文言（A-R locked）

**Source:** `lib/m55/dtrSavedReportDeleteCopy.ts`（**new** or extend — separate from `dtrSavedReportCopy.ts` notice）

| Key | JP（verbatim — §A B1.3） |
|-----|--------------------------|
| `DTR_SAVED_REPORT_DELETE_CONFIRM_TITLE` | この保存版を削除しますか？ |
| `DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P1` … `P4` | §A |
| `DTR_SAVED_REPORT_DELETE_CONFIRM_CANCEL` | キャンセル |
| `DTR_SAVED_REPORT_DELETE_CONFIRM_CONFIRM` | 削除する |
| `DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY` | 保存版を削除しました。 |
| `DTR_SAVED_REPORT_DELETE_TOAST_SECONDARY` | 必要な場合は、同じプロフィールで新しい保存版を作成できます。 |

**Forbidden UI strings:** 非表示 · 元に戻す · 再表示 · notification · badge · unread

---

## F. §3 — Hide API

### F1. Route

| Item | Spec |
|------|------|
| **Path** | `POST /api/dtr/report-snapshot/hide` |
| **Auth** | Clerk `auth()` — **401** if anonymous |
| **Runtime** | Node（match checkout/webhook patterns） |
| **Cache** | `dynamic = 'force-dynamic'` |

### F2. Request / response

```typescript
// Request body: empty or {}
// Success 200:
{ "ok": true }
// Errors:
// 401 unauthorized
// 404 no_visible_snapshot | not_found
// 409 already_hidden
// 500 hide_failed (no secret in body)
```

### F3. Server handler（fail-closed）

| Step | Action |
|------|--------|
| 1 | Resolve `userId` from Clerk |
| 2 | `getVisibleDtrReportSnapshot(userId, DTR_CORE_STATIC_V1)` |
| 3 | If null → **404** `no_visible_snapshot` |
| 4 | `UPDATE` **only** `user_hidden_at`, `user_hidden_source`, `user_hidden_reason` |
| 5 | `user_hidden_at = now()` · `user_hidden_source = 'my_panel'` · `reason = null` |
| 6 | Log event `dtr_snapshot_user_hide` — **userId length only**, no raw id in production logs policy |
| 7 | Return **200** `{ ok: true }` |

**Forbidden:** `DELETE` row · touch `envelope_json` / `profile_snapshot` · revoke entitlements

### F4. Files

| File | Role |
|------|------|
| `app/api/dtr/report-snapshot/hide/route.ts`（**new**） | HTTP handler |
| `lib/m55/hideDtrReportSnapshot.ts`（**new**） | `hideVisibleDtrReportSnapshotForUser()` |
| `lib/m55/dtrDraftDb.ts` | Add visible helper + hide update |

---

## G. §4 — Visible snapshot filter

### G1. New DB accessor

```typescript
// lib/m55/dtrDraftDb.ts
export async function getVisibleDtrReportSnapshot(
  userId: string,
  productId: string = DTR_CORE_STATIC_V1,
): Promise<DtrReportSnapshotRow | null>
```

| Query | `.eq('user_id').eq('product_id').is('user_hidden_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()` |

### G2. Migration path for call sites

| Consumer | Change |
|----------|--------|
| `getDtrReportSnapshot` | **Delegate** to `getVisibleDtrReportSnapshot`（deprecation comment） |
| `app/dtr/core/page.tsx` | visible only |
| `app/dtr/processing/page.tsx` | visible only |
| `lib/m55/dtrShelfAccess.ts` | `snapshotReady = visible != null` |
| `lib/m55/dtrOwnershipGate.ts` | visible `reportInstanceId` only |
| `app/api/dtr/report-snapshot-ready/route.ts` | `hasPurchaseSnapshot` = visible |
| `app/api/purchase/checkout/route.ts` | **visible** for `already_purchased` |
| `lib/m55/reply/replyTicketCheckoutValidate.ts` | visible snapshot id validation |

### G3. Hidden row exposure

| Surface | Rule |
|---------|------|
| User routes | **Never** serve hidden envelope |
| Admin/support | Out of scope D — SQL only |

---

## H. §5 — Checkout block変更方針

### H1. Decision table（SOFT-HIDE-D-CHECKOUT）

| State | Current | Target |
|-------|---------|--------|
| **Visible snapshot** | `409 already_purchased` | **unchanged**（visible check） |
| **Hidden only + owned** | `409 fulfillment_pending` | **Allow** new Stripe session（repurchase lane） |
| **Hidden only + not owned** | fresh purchase | **unchanged** |
| **Owned + no rows** | `409 fulfillment_pending` | **unchanged**（recovery） |

### H2. Repurchase lane logic

```
if (productId === DTR_CORE) {
  visible = getVisibleDtrReportSnapshot(...)
  if (visible) return 409 already_purchased

  if (owned && hasOnlyHiddenSnapshots) {
    // skip fulfillment_pending block for repurchase
    // issue new checkout (metadata: repurchase=true optional)
  }
  // existing owned-without-snapshot recovery unchanged
}
```

| Helper | `hasOnlyHiddenSnapshots(userId)` — hidden count ≥1 && visible null |

### H3. LP / shelf CTA

| Surface | Hidden-only + owned |
|---------|---------------------|
| `resolveDtrShelfAccess` | `showPurchaseCta: true` · label **再購入** direction |
| `/dtr/lp` | Purchase CTA visible（no visible body） |

**No checkout execution in D gate** — implementation + preview smoke only.

---

## I. §6 — Audit / no hard delete

| Layer | Policy |
|-------|--------|
| **User action** | **削除** = soft hide |
| **DB** | `UPDATE` hide columns only |
| **Audit fields** | `user_hidden_at`, `user_hidden_source`（`my_panel`） |
| **Retention** | Row + entitlements + Stripe + fulfillments **kept** |
| **Logs** | Safe category `dtr_snapshot_user_hide`；counts/status only |
| **Admin restore** | Future ops gate — `user_hidden_at = NULL` by support |

---

## J. §7 — Tests

| Test file | Coverage |
|-----------|----------|
| `lib/m55/dtrDraftDb.visible.test.ts`（**new**） | Query builder uses `user_hidden_at IS NULL` filter（mock supabase） |
| `lib/m55/hideDtrReportSnapshot.test.ts`（**new**） | 404 when no visible；409 idempotent hidden |
| `lib/m55/dtrShelfAccess.visible.test.ts`（**new**） | hidden-only → `snapshotReady false` + purchase CTA |
| `app/api/purchase/checkout.dtr-repurchase.test.ts`（**new**） | visible → 409；hidden-only owned → 200 session path（mock stripe） |

**Run:**

```bash
npx tsx --test lib/m55/dtrDraftDb.visible.test.ts lib/m55/hideDtrReportSnapshot.test.ts
npx tsc --noEmit
```

**No** live Stripe · **no** Production DB in tests

---

## K. §8 — Deploy分離

| Step | Order | Gate |
|------|-------|------|
| 1 | Code on `work/home-cluster` | D-IMPL subgates |
| 2 | Preview deploy | **D-PREVIEW** |
| 3 | Human preview smoke | delete flow UI only |
| 4 | Production app deploy | **D-PROD-DEPLOY** — **separate Human GO** |
| 5 | Post-deploy readonly verify | counts only |

**Already done:** Production **schema** @ C-D-R — **do not** re-run migration on deploy.

**Forbidden:** Single deploy that assumes schema absent；**VERIFY-C** mixed with hide UI test

---

## L. Subgate implementation order

| Order | Gate | Deliverable |
|-------|------|-------------|
| **1** | **D-READ** | `getVisibleDtrReportSnapshot` + call-site swap |
| **2** | **D-API** | hide route + server helper |
| **3** | **D-MY** | dialog + `/my` button + toast |
| **4** | **D-CHECKOUT** | repurchase lane + shelf CTA |
| **5** | **D-FULFILL** | fulfillment INSERT when only hidden exists |
| **6** | **D-PREVIEW-R** | Human preview |
| **7** | **D-PROD** | Production app deploy（not in D planning execution） |

---

## M. No-mutation statement

| Action | Status |
|--------|--------|
| code change in D gate | **no** |
| deploy | **no** |
| Production DB write | **no** |
| checkout / payment | **no** |
| env change | **no** |
| **VERIFY-C** | **no** |

---

## N. Next gates

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-COMMIT** | Commit this planning SSOT |
| **CORE-DTR-SOFT-HIDE-REPURCHASE-D-READ** | First code PR |

---

## O. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | D implementation planning post C-D-R GREEN |
