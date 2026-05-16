# Phase 5‑6H‑5S — Vercel Production env variable addition planning／execution gate (2026‑05‑15 SSOT)

## 1. Phase名

**Phase 5‑6H‑5S — Vercel Production env variable addition planning／execution gate**

---

## 2. 現在地

- **`5R` Price ID human confirmation：** **`PRODUCTION_STRIPE_PRICE_ID_HUMAN_CONFIRMATION_GREEN`**（証跡 commit **`8408f37ddb5ea58153377367f667168533db30e5`**）。
- **`STRIPE_PRICE_DTR_CORE_STATIC_V1`：** **`5S` の本条コミット時点では、repo のみでは Production への追加完了を証明できない**。**`5R`／`5P‑A`** 系と整合する **`missing env`** は **本条の docs だけでは自動解消しない**（Human が Vercel UI で追加するまで）。
- **redacted Price ID（参照のみ）：** **`price_****U3hF`。** **フル Price ID は記録しない。**
- **Checkout 再試行：** **未実行。**
- **live payment：** **未実行。**

**Product lane（参照）：**

- **論理チェックアウト：** **`DTR_CORE_STATIC_V1`**
- **表示名：** **M55 デジタル鑑定レポート Standard**

**確認済み属性：** **`5R`** と整合。**`5S`** **では Stripe 側を変更しない。**

- **Amount：** **¥1,000 `JPY`**
- **Billing type：** one-time  
- **Status（Price）：** active  

**Vercel Project：** **`m55-webv2`**

**本条以前の人手観測（変更なしのまま本条でも前提とする）：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** は **Preview で存在すると読めるが、Production では一覧上確認されなかった**（`5R` と整合）。

---

## 3. **5S** の目的

**Vercel Production Environment にキー **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** を人間のみが追加する。**

**制約：**

- **値のフル記録は禁止**（repo・SSOT・AI／Cursor 出力へ貼らない）。
- **実際の Value 入力は人間が Stripe Dashboard で確認済みの Price ID を、Vercel UI に直接入力する。**
- **`5S`** **で redeploy／Checkout 再試行／本番決済は行わない**（明示的別 Gate）。
- **`5S`** **で env 追加後の Checkout 確認も行わない。**

---

**人間のみ：Vercel UI で行う操作**

1. **Project：** **`m55-webv2`**
2. **Settings → Environment Variables**
3. **Key：** **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**
4. **Environment：** **Production**
5. **Value：** 人間が Stripe Dashboard（Live／Production）で確認済みの Price ID を入力。**フル文字列は AI／Cursor／SSOT に入力・貼付・転記しない。**
6. **保存後の確認：** **Production に当該キーが存在することのみ**確認する。**値の表示・コピー・スクリーンショットの repo 同梱はしない。**

---

## 4. 実施結果

**本条コミット時点（Human の Vercel 操作完了は repo の外）：**

- **`STRIPE_PRICE_DTR_CORE_STATIC_V1` was not added.**（本条 SSOT 記録時点では Production 側への追加完了を repo が証明できず、**別途 Human が上記手順を完了させるまで保留**。）
- **reason:** Planning／execution SSOT を本条で先に固定する。**本条コミットは Human の Vercel Production 代入完了と同時刻証跡とはしない。**（Human が代入完了後は追記または後続コミットで **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`** へ。）
- **Next action:** Human が **`m55-webv2`** の Production にキーを追加し、**キー存在のみ**確認する。その後 **Phase `5‑6H‑5T`** のみ redeploy を計画。**Checkout／本番決済はより後続の明示 Gate**。

---

## 5. 判定

**`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_BLOCKED`**

（**ゲート手順・禁止事項・本条時点の未完了の固定**。**Human が Production にキー追加を完了させたとき**に **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`** を別証跡で確定する。）

---

## 6. Secret handling

- **Full Price ID：** **repo に保管しない。** **AI／Cursor へ送らない。** **SSOT に書かない。**
- **`whsec`／`sk_live`／service role などのシークレット：** **本条ではフル値を扱わない。** **代入・転記しない。**

---

## 7. 本条での未実行事項

- No redeploy in **5S**
- No checkout retry
- No purchase button click
- No live payment
- No Stripe setting changes
- No Stripe webhook changes
- No webhook replay
- No Supabase changes
- No runtime／code／UI changes
- No Production DB changes
- No `POST`／`PUT`／`PATCH`／`DELETE`
- No **`/api/stripe/*`** direct execution
- No post-env-add Checkout verification in **5S**

---

## 8. Next

- **`VERCEL_PRODUCTION_PRICE_ENV_ADDITION_GREEN`** が **Human の Vercel 代入完了証跡**で確定したら **Phase 5‑6H‑5T — Production redeploy for env activation planning／execution gate**。**Vercel の env は **現行 Production deployment に自動反映されない可能性**があるため、**活性化のための redeploy は **`5T`** に分離する。  
- **Checkout 再試行**と**本番決済**は **`5T`** 以降の**明示 Gate**に置く。

---

## Observed Production error（参照・再掲）

`Product DTR_CORE_STATIC_V1 is not configured (missing env: STRIPE_PRICE_DTR_CORE_STATIC_V1)`

---

## Work anchor

- **Branch：** **`work/home-cluster`**
- **`5R`：** commit **`8408f37ddb5ea58153377367f667168533db30e5`** — `docs: record production stripe price id confirmation`
- **Vercel Project：** **`m55-webv2`**
- **Production URLs（アンカー）：** **`m55-web.vercel.app`**、**`m55-webv2.vercel.app`**
