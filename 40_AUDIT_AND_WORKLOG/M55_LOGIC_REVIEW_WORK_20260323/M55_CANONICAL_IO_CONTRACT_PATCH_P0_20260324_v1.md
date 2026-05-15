# M55_CANONICAL_IO_CONTRACT_PATCH_P0_20260324_v1.md

Status: READY-FOR-CURSOR
Authority target: `M55_CANONICAL_IO_CONTRACT_SSOT_v1.md`
Intent: review pass で出た P0 blockers / P1 definitions を埋める patch

---

## 0. Patch purpose

この patch は、review pass で抽出された以下の未定義を埋める。

- M1 `seedFingerprint` 算出方式
- M2 `contractVersion / engineVersion` versioning rule
- M3 `rawTraits / rawSignals` value space
- M4 / C5 golden vector 用 `nowDate` 固定日付
- M5 reserved extension schema
- M6 / C4 DTR section visibility と `teaserSections / fullSections` の対応

---

## 1. Frozen golden test date

golden vector の固定日付を次で凍結する。

- `nowDate = 2026-03-23`

### Rule
- 1983-02-28 golden vector 監査では、必ず `nowDate=2026-03-23` を使う
- 今後 golden vector を変える場合は監査ファイルを version bump する
- production runtime の nowDate とは切り分ける

---

## 2. seedFingerprint definition

`seedFingerprint` は canonical input の再現性確認用 fingerprint とする。  
暗号鍵ではない。監査 / diff 用。

### Canonical source string
次の順で canonical source string を構築する。

1. `birthDate`
2. `nickname`
3. `contextScope`
4. `locale`
5. `nowDate`
6. canonicalized `relationshipTarget`
7. canonicalized `longTermWindow`
8. canonicalized `historySignals`

### Canonicalization rule
- object は key 昇順
- null は literal `null`
- string は trim 後そのまま
- join separator は `|`

### Output
- `seedFingerprint = "sha256:" + lowercase_hex(sha256(canonical_source_string))`

### Example (conceptual)
`1983-02-28|T|essence|ja-JP|2026-03-23|null|null|null`

---

## 3. Versioning rule

### `contractVersion`
- I/O 契約の schema 互換性を表す
- format: `io-v<major>.<minor>`
- field addition = minor bump
- field removal / rename / semantic break = major bump

### `engineVersion`
- 演算ロジックの実装 version
- format: `logic-v<major>.<minor>.<patch>`
- deterministic behavior の change は patch であっても必ず golden test rerun

### Rule
- same `contractVersion` + same `engineVersion` + same canonical input -> same raw output
- `contractVersion` を変えずに breaking change してはならない

---

## 4. rawTraits / rawSignals value space

現行 schema の `string[]` は維持する。  
ただし値形式を固定する。

### `rawTraits[]`
- format: `trait.<slug>`
- example:
  - `trait.observation_bias`
  - `trait.structural_focus`
  - `trait.quiet_persistence`

### `rawSignals[]`
- format: `signal.<slug>`
- example:
  - `signal.narrow_focus`
  - `signal.external_shift`
  - `signal.step_first`

### Rule
- display label は Layer3 が解決する
- raw value は public surface に直接表示しない
- slug は lowercase token を推奨
- free pages に raw code を漏らしたら fail

---

## 5. Reserved extension schema

### `relationshipTarget`
```json
{
  "nickname": "string",
  "birthDate": "YYYY-MM-DD",
  "relationType": "partner|family|friend|other"
}
```

### `longTermWindow`
```json
{
  "startDate": "YYYY-MM-DD",
  "durationDays": 30
}
```

### `historySignals`
```json
{
  "openedScopes": ["essence","today"],
  "consultUsed": 0,
  "ownedDtrTypes": ["static"]
}
```

### Rule
- reserved fields は Layer2 input として受けてもよい
- current public Web MVP では main surface に露出しない
- absent / null は valid

---

## 6. DTR visibility rule

`sections[]` / `teaserSections[]` / `fullSections[]` の関係を次で固定する。

### Section object
- `id`
- `title`
- `summary`
- `body`
- `visibility`

### `visibility` enum
- `teaser`
- `full`

### Consistency rule
- `teaserSections` = `sections` のうち `visibility="teaser"` の subset
- `fullSections` = `sections` のうち `visibility="full"` の subset
- same `id` が teaser と full の両方に同時所属してはならない
- `/dtr/lp` は `teaserSections` のみ参照可
- future owned reader のみ `fullSections` 参照可

### Fail conditions
- `sections` と subset lists の不一致
- unknown visibility
- `fullSections` が public page に露出

---

## 7. Patch acceptance

この patch 適用後、`M55_CANONICAL_IO_CONTRACT_SSOT_v1.md` は少なくとも以下を満たす。

- golden vector 再現性が定義される
- fingerprint 算出が一意になる
- versioning ルールが明文化される
- raw code space が比較可能になる
- reserved extension の shape が最低限定義される
- DTR teaser/full の境界が壊れなくなる
