# DTR 購入フロー — 復旧 Runbook（1 枚）

**目的:** 何が壊れたか不明なときに、**観測順序**と**参照ファイル**で切り分ける。コード変更はこのドキュメントの範囲外。

---

## 症状早見 → 最初に見る場所

| 症状 | 先に疑う層 | 確認すること |
|------|------------|----------------|
| `/dtr/core` に入れない（LP に飛ぶ） | **Ownership / snapshot** | `resolveEntryReportOwnership` の結果、`dtr_report_snapshots` の有無 |
| 支払い後ずっと processing | **Fulfillment / webhook / processing ページ** | Stripe 決済状態、`one_time_fulfillments` / `entitlements`、processing が session を処理したか |
| Checkout が通らない | **Checkout route** | HTTP **200 vs 409**、JSON の `code` |
| 「開く」が出ない／常に準備中 | **Snapshot 未生成** | `report-snapshot-ready` の `hasPurchaseSnapshot` / `ready` |
| 再購入できてしまう／二重課金疑い | **409 分岐** | snapshot ありで **409 `already_purchased`** になるか |

---

## 1. Purchased state（購入状態）

**SSOT の考え方:** `lib/m55/dtrOwnershipGate.ts` の `resolveEntryReportOwnership`（サーバ専用）。

- **`dtr_report_snapshots`** に product 行があれば **owned**（保存版あり）。
- なければ **`entitlement_rights`** + **支払い裏付け**（`entitlements` active または `one_time_fulfillments`）で owned 判定。
- 権利だけ残って裏付けがない場合は **fail-closed（locked）**。

**DB で見る（管理者・SQL コンソール）:**

- `dtr_report_snapshots` — user_id + product に行があるか。
- `entitlements` — `product_id` / `status=active`。
- `entitlement_rights` — `m55_p:core_origin` 等。
- `one_time_fulfillments` — 直近の fulfilled 行。

---

## 2. Snapshot ready（本文表示の可否）

**API:** `GET /api/dtr/report-snapshot-ready`（`app/api/dtr/report-snapshot-ready/route.ts`）

- **`hasOwnership`:** gate 上 owned か。
- **`hasPurchaseSnapshot`:** `getDtrReportSnapshot` が非 null か。
- **`ready`:** 上記両方 true。

**`/dtr/core`:** snapshot なしかつ owned でも本文は出さず **LP へ redirect**（`app/dtr/core/page.tsx`）。UI の「開く」はこの **`ready`** と整合させる。

---

## 3. Checkout — 200 / 409

**実装:** `app/api/purchase/checkout/route.ts`

| HTTP | `code`（例） | 意味（要約） |
|------|----------------|--------------|
| **200** | — | 新規 Checkout Session 発行など、フロー継続可 |
| **409** | `already_purchased` | **スナップショット既存** → 新規セッション不要（再開導線へ） |
| **409** | `fulfillment_pending` | 購入処理中・再開用セッション確認が必要な状態など |

**ログ:** `[checkout] 409` / `already_purchased` / `fulfillment_pending` のサーバログを追う。

---

## 4. report-snapshot-ready

- **認証必須**（未ログインは 401）。
- フロントの `/my` は entitlements と併用して本 API を読む想定。
- **`ready: false` かつ `hasOwnership: true`** → 支払い or 権利はあるが **本文スナップショット未生成**（processing / 非同期待ち）。

---

## 5. 切り分けフロー（最短）

1. ブラウザで **`GET /api/dtr/report-snapshot-ready`**（ログイン状態）→ `ready` / `hasPurchaseSnapshot` を記録。
2. 同ユーザーで **`GET /api/me/entitlements`** → `dtr_rights` の有無。
3. Checkout を試す → **200 か 409 か** とレスポンス `code`。
4. まだ不明なら **Supabase** で `dtr_report_snapshots` と `entitlements` を同一 `user_id` で確認。

---

## 6. この Runbook の位置づけ

- **成功証跡:** [E2E_DTR_SUCCESS_EVIDENCE_2026-04-20.md](./E2E_DTR_SUCCESS_EVIDENCE_2026-04-20.md)
- **次回の手順固定:** [E2E_DTR_VERIFICATION_CHECKLIST.md](./E2E_DTR_VERIFICATION_CHECKLIST.md)
