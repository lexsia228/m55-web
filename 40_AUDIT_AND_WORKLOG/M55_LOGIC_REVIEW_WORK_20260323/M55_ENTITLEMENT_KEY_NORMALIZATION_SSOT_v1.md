# M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGHEST
Scope: Layer1 key discipline / ownership / retention / unlock state
Intent: entitlement / ownership / retention / consult credit に関わるキーの唯一表を固定し、未知キーFAILと同義語汚染を防ぐ

---

## 0. Purpose

本書は Layer1 の **キー名の唯一表** を定義する。

目的は以下。

1. same concept に複数キー名が生まれる事故を防ぐ
2. unknown key = fail を実運用できるようにする
3. plan / ownership / retention / consult credit の混線を防ぐ
4. current Web と future logic integration の整合を保つ

---

## 1. Hard rules

### 1.1 Unknown key = FAIL
定義されていない key は fail。  
黙って無視しない。推測しない。

### 1.2 No synonym emission
legacy alias を一時的に ingest することはあっても、system 内部から emit するのは canonical key のみ。

### 1.3 Layer ownership
- Layer1 が権利事実を持つ
- Layer2 は読むだけ
- Layer3 は表示だけ

---

## 2. Canonical key set

### 2.1 Viewer / purchase state
- `viewer_state`
- `purchase_entitlement_state`
- `chat_credit_state`
- `owned_dtr_state`
- `recent_session_state`

### 2.2 Ownership / product keys
- `dtr_ownership_type`
- `dtr_unlock_state`
- `dtr_expires_at`
- `retention_window_days`

### 2.3 Credits / counters
- `consult_credits_remaining`
- `consult_credits_total`

### 2.4 Purchase metadata
- `last_purchase_at`
- `purchase_surface`
- `purchase_product_code`

---

## 3. Allowed value enums

### 3.1 `viewer_state`
- `anonymous`
- `identified`
- `signed_in`

### 3.2 `purchase_entitlement_state`
- `locked`
- `owned`
- `expired`

### 3.3 `chat_credit_state`
- `none`
- `available`
- `consumed`

### 3.4 `owned_dtr_state`
- `none`
- `static`
- `dynamic`
- `personal`

### 3.5 `dtr_ownership_type`
- `static`
- `dynamic`
- `personal`

### 3.6 `dtr_unlock_state`
- `locked`
- `owned`
- `expired`

---

## 4. Canonical meaning

### `viewer_state`
ユーザー識別状態。  
権利状態ではない。

### `purchase_entitlement_state`
購入権利の総体的状態。  
`owned` / `locked` / `expired` のみ。

### `chat_credit_state`
AI相談 credit の状態。  
数値は `consult_credits_remaining` が持つ。

### `owned_dtr_state`
保有している DTR の種類。  
値は ownership type と整合させる。

### `dtr_ownership_type`
DTR object に紐づく ownership type の唯一値。

### `retention_window_days`
dynamic の保存日数など retention 事実。

### `consult_credits_remaining`
残っている相談回数。  
整数。負数禁止。

---

## 5. Canonical object shape

```json
{
  "viewer_state": "identified",
  "purchase_entitlement_state": "owned",
  "chat_credit_state": "available",
  "owned_dtr_state": "static",
  "recent_session_state": "available",
  "dtr_ownership_type": "static",
  "dtr_unlock_state": "owned",
  "dtr_expires_at": null,
  "retention_window_days": null,
  "consult_credits_remaining": 1,
  "consult_credits_total": 1,
  "last_purchase_at": "2026-03-23T10:00:00Z",
  "purchase_surface": "web_mvp",
  "purchase_product_code": "dtr_single_v1"
}
```

---

## 6. Legacy aliases (ingest only, never emit)

以下は ingest adapter で受けてもよいが、normalize 後は canonical に変換し、以後 emit 禁止。

- `consultRemaining` -> `consult_credits_remaining`
- `consult_remaining` -> `consult_credits_remaining`
- `ownedDtrState` -> `owned_dtr_state`
- `purchaseEntitlementState` -> `purchase_entitlement_state`
- `chatCreditState` -> `chat_credit_state`
- `viewerState` -> `viewer_state`
- `recentSessionState` -> `recent_session_state`

### Rule
normalize 後に alias が残っていたら fail。

---

## 7. Synonym ban list

以下のような曖昧キーは禁止。

- `plan`
- `tier`
- `status`
- `credits`
- `remaining`
- `owned`
- `unlock`
- `type`
- `expiry`

理由:
意味が広すぎて将来 collision を起こすから。

---

## 8. Validation rules

- enum 不一致 -> fail
- negative credits -> fail
- `owned_dtr_state` と `dtr_ownership_type` 不一致 -> fail
- `purchase_entitlement_state = expired` なのに `dtr_unlock_state = owned` -> fail
- dynamic で `retention_window_days` も `dtr_expires_at` も null -> fail

---

## 9. Integration rule

current Web MVP は表面商品を増やさない。  
したがって、Layer1 でも Free / Standard / Premium 等の surface tier key は今定義しない。

必要なのは、**現在のWebを壊さない最小の権利契約** だけである。

---

## 10. Final command

Layer1 の事故は、たいてい “同じ意味に複数キー” から始まる。  
本書を唯一表として、unknown key = fail / synonym ban を徹底すること。
