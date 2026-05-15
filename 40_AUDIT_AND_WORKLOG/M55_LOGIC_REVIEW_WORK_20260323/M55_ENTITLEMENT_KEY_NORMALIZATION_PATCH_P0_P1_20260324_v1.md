# M55_ENTITLEMENT_KEY_NORMALIZATION_PATCH_P0_P1_20260324_v1.md

Status: READY-FOR-CURSOR
Authority target: `M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md`
Intent: review pass で出た Layer1 semantics / product mapping / expiry rules を補完する patch

---

## 0. Patch purpose

この patch は、review pass の以下を埋める。

- C2 `dtr_ownership_type` と `owned_dtr_state` の役割差
- C3 `purchase_entitlement_state` と `dtr_unlock_state` の役割差
- M7 legacy alias ingest adapter の責務
- M8 `purchase_product_code` 対応表
- M10 `retention_window_days` と `dtr_expires_at` の関係
- C6 purchase後遷移の current Web 整合

---

## 1. Ownership semantics split

### `dtr_ownership_type`
- per-object field
- individual DTR object が `static|dynamic|personal` のどれかを持つ
- DTR schema に直結

### `owned_dtr_state`
- aggregate viewer-level summary
- current user が現時点でどの type を保有しているかの要約
- values: `none|static|dynamic|personal`

### Rule
- object を語るときは `dtr_ownership_type`
- viewer summary を語るときは `owned_dtr_state`
- mismatch -> fail

---

## 2. Unlock semantics split

### `purchase_entitlement_state`
- current offer / current viewer に対する総体状態
- `locked|owned|expired`
- Home / My / shell gating 用

### `dtr_unlock_state`
- specific DTR object の利用可能状態
- `locked|owned|expired`
- object-level gate 用

### Rule
- viewer-wide gate は `purchase_entitlement_state`
- object gate は `dtr_unlock_state`
- viewer が `locked` なのに object が `owned` は fail
- viewer が `expired` なのに object が `owned` は fail

---

## 3. Legacy alias ingest adapter

### Responsibility
legacy alias ingest adapter は **Layer1 ingress only** に置く。

### Placement
- state hydration 直前
- persisted storage / webhook ingest / old local storage 読込時
- UI layer には置かない

### Behavior
- alias key を canonical key に 1回だけ normalize
- normalize 後に alias が残っていたら fail
- emit は必ず canonical only

---

## 4. Product code mapping

current Web MVP で canonical に持つ product code は当面これだけを正とする。

### Canonical mapping table

| purchase_product_code | display title | dtr_ownership_type | consult_credits_total | purchase_surface |
|---|---|---:|---:|---|
| `dtr_core_static_v1` | DTR Core Static V1 | `static` | 1 | `web_mvp` |

### Rule
- current Web public surface はこの1商品を中心に運用
- Free / Standard / Premium product codes は current Web canonical set に入れない
- future product 追加時は mapping table version bump

---

## 5. Dynamic expiry rule

### For `static`
- `retention_window_days = null`
- `dtr_expires_at = null`

### For `personal`
- `retention_window_days = null`
- `dtr_expires_at = null`

### For `dynamic`
- `retention_window_days` required
- `dtr_expires_at` required
- derived rule:
  - `dtr_expires_at = last_purchase_at + retention_window_days`
- timezone base:
  - UTC timestamp base
- if explicit stored `dtr_expires_at` differs from derived value -> fail

### Reason
dynamic は retention に依存する唯一の type だから。

---

## 6. Purchase-success route note

MONETIZATION の過去文脈に “購入後→COREへ即ジャンプ” があっても、  
current Web MVP の routing truth では **購入後は DTR を開く / AIチャットを使う** の二択を優先する。fileciteturn41file3

### Current-Web-safe interpretation
- `purchase_success` 後の主導線は `/my` / DTR access / AI consult access を優先
- “即COREジャンプ” は current Web canonical behavior にしない
- 旧 app 文脈は Layer1 canonical routing truth に持ち込まない

---

## 7. Patch acceptance

この patch 適用後、Layer1 は次を満たす。

- aggregate state と object state の役割差が明文化される
- alias normalize の責務場所が固定される
- current Web canonical product code が一意になる
- dynamic expiry の算出が定義される
- purchase後遷移の current Web 解釈がぶれなくなる
