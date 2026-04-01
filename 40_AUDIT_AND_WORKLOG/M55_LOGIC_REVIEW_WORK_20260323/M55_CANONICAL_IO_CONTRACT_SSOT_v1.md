# M55_CANONICAL_IO_CONTRACT_SSOT_v1.md

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGHEST
Scope: Layer2 canonical contract / observation engine I/O / free-deep boundary
Intent: M55 logic engine の唯一の入出力契約を固定し、今後のWeb更新でも壊れない決定論の基盤にする

---

## 0. Purpose

本書は Layer2（Observation logic engine）の **唯一の正** となる canonical I/O contract を定義する。

目的は以下。

1. same input -> same raw output を保証する
2. UI 文言より先に、logic の契約を固定する
3. free/deep の境界を contract で固定する
4. Layer3 語彙更新が Layer2 を壊さないようにする
5. current Web MVP / future DTR / future extensions に共通の基盤を作る

---

## 1. Contract rules

### 1.1 Determinism
同一の canonical input は、同一 version の engine に対して常に同一の raw output を返すこと。

### 1.2 No presentation leakage
Layer2 output は raw / neutral であり、public wording・広告表現・DTRコピーを含まない。

### 1.3 No entitlement mutation
Layer2 は ownership / consult credit / retention を変更しない。  
それらは Layer1 の責務。

### 1.4 Versioned contract
すべての output は `contractVersion` と `engineVersion` を持つ。

---

## 2. Canonical input schema

### 2.1 Required input fields
- `birthDate`: string (`YYYY-MM-DD`)
- `nickname`: string
- `contextScope`: enum
  - `essence`
  - `today`
  - `weekly`
  - `dtr`
- `locale`: string
  - default: `ja-JP`
- `nowDate`: string (`YYYY-MM-DD`)

### 2.2 Optional future input fields
- `relationshipTarget`: object | null
- `longTermWindow`: object | null
- `historySignals`: object | null

### 2.3 Input rules
- `birthDate` は演算初期値
- `nickname` は表示識別 / 保存 / 同期 / 呼び出しラベルであり、計算主因ではない
- `contextScope` は required
- missing required field -> fail
- malformed date -> fail

### 2.4 Canonical input example
```json
{
  "birthDate": "1983-02-28",
  "nickname": "T",
  "contextScope": "essence",
  "locale": "ja-JP",
  "nowDate": "2026-03-23",
  "relationshipTarget": null,
  "longTermWindow": null,
  "historySignals": null
}
```

---

## 3. Top-level canonical output envelope

すべての scope で、最上位 envelope はこれに従う。

- `contractVersion`: string
- `engineVersion`: string
- `contextScope`: enum
- `generatedAt`: string (ISO 8601)
- `seedFingerprint`: string
- `freeVisible`: boolean
- `dtrExpandable`: boolean
- `payload`: object

### Output envelope example
```json
{
  "contractVersion": "v1",
  "engineVersion": "logic-v1",
  "contextScope": "today",
  "generatedAt": "2026-03-23T13:00:00Z",
  "seedFingerprint": "sha256:...",
  "freeVisible": true,
  "dtrExpandable": true,
  "payload": {}
}
```

---

## 4. Essence output schema

`contextScope = essence`

### Required fields
- `summaryShort`: string
- `keywords`: string[]
- `focusAreas`: string[]
- `rawTraits`: string[]
- `freeVisible`: boolean
- `dtrExpandable`: boolean

### Recommended limits
- `summaryShort`: 60〜160字相当
- `keywords`: 2〜4
- `focusAreas`: 2〜4
- `rawTraits`: internal raw labels

### Example
```json
{
  "summaryShort": "あなたらしさの要約。",
  "keywords": ["静かな推進", "観察", "集中"],
  "focusAreas": ["本質", "整理", "選択"],
  "rawTraits": ["raw_trait_a", "raw_trait_b"],
  "freeVisible": true,
  "dtrExpandable": true
}
```

---

## 5. Today output schema

`contextScope = today`

### Required fields
- `heading`: string
- `summaryShort`: string
- `focus`: string
- `step`: string
- `bridgeToTomorrow`: string
- `rawSignals`: string[]
- `freeVisible`: boolean
- `dtrExpandable`: boolean

### Recommended limits
- `heading`: 12〜40字
- `summaryShort`: 60〜180字
- `focus`: 20〜80字
- `step`: 20〜80字
- `bridgeToTomorrow`: 12〜60字

### Example
```json
{
  "heading": "今日の見方",
  "summaryShort": "今日は見方を整える日です。",
  "focus": "目の前の1点に集中。",
  "step": "まず一つだけ進める。",
  "bridgeToTomorrow": "明日も流れを確認できます。",
  "rawSignals": ["raw_signal_a"],
  "freeVisible": true,
  "dtrExpandable": true
}
```

---

## 6. Weekly output schema

`contextScope = weekly`

### Required fields
- `heading`: string
- `weeklyKey`: string
- `lines`: string[]
- `focusAreas`: string[]
- `nextBridge`: string
- `rawSignals`: string[]
- `freeVisible`: boolean
- `dtrExpandable`: boolean

### Recommended limits
- `heading`: 12〜40字
- `weeklyKey`: 20〜100字
- `lines`: 2〜4
- `focusAreas`: 2〜4
- `nextBridge`: 12〜60字

### Example
```json
{
  "heading": "今週の焦点",
  "weeklyKey": "今週は整えて進む週です。",
  "lines": ["焦点1", "焦点2", "焦点3"],
  "focusAreas": ["整理", "接続", "持続"],
  "nextBridge": "DTRで長い流れも確認できます。",
  "rawSignals": ["raw_weekly_a"],
  "freeVisible": true,
  "dtrExpandable": true
}
```

---

## 7. DTR output schema

`contextScope = dtr`

### Required fields
- `title`: string
- `sections`: object[]
- `teaserSections`: object[]
- `fullSections`: object[]
- `ownershipType`: enum
  - `static`
  - `dynamic`
  - `personal`
- `expiresAt`: string | null
- `aiConsultIncluded`: boolean
- `version`: string

### Section object
- `id`: string
- `title`: string
- `summary`: string
- `body`: string
- `visibility`: enum
  - `teaser`
  - `full`

### Rules
- `teaserSections` は public-safe
- `fullSections` は owned state でのみ利用
- `ownershipType` は Layer1 と一致しなければ fail

---

## 8. Reserved extension slots

将来拡張用だが、現時点では public surface へ全面投入しない。

### Relationship preview
- `relationshipPreview`: object | null

### Long-term preview
- `longTermPreview`: object | null

### Rules
- slot は作ってよい
- public Main copy へ強く出さない
- current Web MVP の表面商品に昇格させない

---

## 9. Free / deep split contract

### Free-visible contract
許可されるもの:
- essence.summaryShort
- essence.keywords
- today.heading / summaryShort / focus / step
- weekly.heading / weeklyKey / lines
- DTR teaserSections

### Deep-only contract
許可されるもの:
- 長い背景説明
- セクション本文
- relationshipPreview 詳細
- longTermPreview 詳細
- DTR fullSections

### Rule
無料は価値を感じるが全部ではない。  
deep は続きが欲しくなるが、煽りではない。

---

## 10. Failure rules

次の場合は fail とする。

- required field missing
- malformed date
- unknown contextScope
- ownershipType mismatch
- envelope field missing
- output field type mismatch
- forbidden free/deep leakage

---

## 11. Change management

変更は次を満たすときだけ許可。

- `contractVersion` 更新
- migration note 追記
- page mapping 影響確認
- golden vector 再監査

---

## 12. Final command

Layer2 は copy のために存在するのではない。  
**決定論を守るための唯一の契約** である。

今後の実装は、必ずこの I/O contract を唯一の正として従うこと。
