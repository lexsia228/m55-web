# Phase 5‑6H‑5Q‑A — Historical Stripe payment evidence inventory checkpoint (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5Q‑A — Historical Stripe payment evidence inventory checkpoint**

---

## 2. 現在地（証跡の前提）

- **`5P‑A`：** Production **`Checkout`** は **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** **missing** により **現在も BLOCKED**（記録変更なし）。
- **`5Q`：** **`READY_FOR_PRODUCTION_STRIPE_PRICE_ID_HUMAN_CONFIRMATION_GATE`**（docs-only planning、`0f63e994027986c9e664d1d072f6667e43ed0e09`）。
- **本条：** **現在の Production での Checkout 再試行・購入ボタン再押下・live payment は実施しない。** **`env` は本条・本コミットで変更しない。**

---

## 3. Human-provided historical Stripe screenshot observation（記録してよい項目のみ）

**ソース：** Stripe Dashboard のスクリーンショットを **人間が提示**した。**画像ファイルは repo にコミットしない。**

**スクショから SSOT に転記したテキスト情報のみ（識別子のコピペなし）：**

| 項目 | 記録 |
|------|------|
| **金額** | **¥1,000 `JPY`** |
| **決済状態の見え方** | succeeded / successful と読める表示 |
| **商品／説明文の見え方** | **M55／レポート製品に関連すると読める文言** |
| **画面上の日付の見え方** | **03/14 付近**と読める |

**スクショに写っていた識別子（Payment Intent・Request・Customer・メール・client_reference・Price ID 等）は意図的に SSOT に書かない。**

---

## 4. 重要な制限（スコープ）

- **This is historical evidence only.**（過去のダッシュボード上の記録に対する **inventory checkpoint**。）
- **This does not prove current Production checkout works.**（現在の **`Checkout`** を **成立済み（GREEN）** とみなさない。）
- **This does not resolve **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** **missing**。** **現在どの Stripe Price ID を **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** に載せるべきかも証明しない（いずれも **`5R`** で確認）。**
- **This does not confirm current webhook fulfillment or current entitlement／DB write path.**
- **This must not be used as current live payment GREEN evidence.**

**現在の Production checkout は **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** **missing のまま BLOCKED。** 本条は **`5R`** の Price ID human confirmation を補助する **過去証跡のインベントリ**に過ぎない。

---

## 5. Redaction policy（本条遵守）

| 種別 | SSOT の扱い |
|------|----------------|
| Payment Intent ID | **REDACTED／未記録** |
| Request ID | **REDACTED／未記録** |
| Customer ID | **REDACTED／未記録** |
| Email | **REDACTED／未記録** |
| Stripe Price ID（フル値） | **REDACTED／未記録** |
| スクリーンショットファイル | **repo にコミットしない** |

---

## 6. 判定（本条）

**`HISTORICAL_STRIPE_PAYMENT_EVIDENCE_INVENTORY_RECORDED`**

---

## 7. 本条での未実行事項

- No env / `whsec` / secret changes
- No Vercel setting changes
- No Stripe Dashboard **設定変更**
- No Stripe webhook changes / replay
- No Checkout retry / no purchase button click
- No live payment **in this phase**
- No Supabase changes
- No additional redeploy
- No runtime / code / UI changes
- No Production DB changes
- No **`POST`** / **`PUT`** / **`PATCH`** / **`DELETE`**
- No **`/api/stripe/*`** direct execution

---

## 8. Next

- **Phase 5‑6H‑5R — Production Stripe Price ID human confirmation gate**
- **`5R` では** 現在の **`DTR Core Static V1`／¥1,000 `JPY`** に対応する **Stripe Price ID を Dashboard で人間が確認**する。** **フル Price ID は AI／Cursor／SSOT に共有しない。** **redacted（末尾桁のみ等）のみで証跡化する。**

---

## Work anchor

- Branch: **`work/home-cluster`**
- Prior SSOT commit: **`0f63e994027986c9e664d1d072f6667e43ed0e09`** — `docs: plan production stripe price env configuration`
- Current Production blocker（変更なし）: **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** **missing**
