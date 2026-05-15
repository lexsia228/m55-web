# M55_BINDING_ROLLOUT_FROM_DEFINITION_TO_CONNECTION_SSOT_20260324_v1.md

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGHEST
Scope: post-definition / post-golden-audit binding rollout
Intent: canonical engine を current Web に安全に差し込む順番・制約・受け入れ条件を固定する

---

## 0. Core conclusion

定義フェーズと golden 監査フェーズは完了した。  
次は **binding フェーズ** に進む。

ただし、binding は一気にやらない。  
**`/core` → `/today` → `/weekly` → `/my` → DTR ownership truth**
の順で、1 scope ずつ差し込む。

---

## 1. Why this order is correct

### Step 1 — `/core`
最初に essence を bind する。  
理由:
- Home を触らずに、最も小さい無料面で canonical engine を使える
- Layer3 の「あなたらしさの要約」が最も自然に入る
- `/today` `/weekly` より文脈が単純

### Step 2 — `/today`
次に today を bind。  
理由:
- same engine / same mapper を別 scope に広げやすい
- 毎日用の短い出力なので UI 変更が少ない

### Step 3 — `/weekly`
その後に weekly を bind。  
理由:
- lines / focusAreas を持ち、today より一段広い
- `/core` `/today` が通れば最後に整えやすい

### Step 4 — `/my`
その後に Layer1 truth と library metadata を bind。  
理由:
- ownership / consult / expires の事実層に近い
- free lanes より破壊半径が大きい

### Step 5 — DTR ownership truth / reader
最後に object-level ownership と full reader を bind。  
理由:
- unlock / teaser/full / expires の条件が一番複雑
- 最後にやる方が事故が少ない

---

## 2. Global no-touch constraints

### Absolutely do not change
- Home
- pricing
- product surface
- routing
- support / legal
- FAQ
- shell hierarchy
- Free / Standard / Premium を current Web に戻すこと
- Ads / Calendar / Tarot surface の復活

### Meaning
binding は **logic source の差し替え** だけ。  
見た目の再設計ではない。

---

## 3. Shared binding rules

### Rule 1
Layer1 / Layer2 / Layer3 を混ぜない。

### Rule 2
Page は canonical engine を直接いじらず、**thin binding adapter** 経由で読む。

### Rule 3
display は必ず display mapper 経由。  
raw payload を free page に直接出さない。

### Rule 4
unknown key / unknown scope / shape mismatch は fail fast。

### Rule 5
各 step 完了後に report を出し、freeze を切る。  
同時に2ページ以上 bind しない。

---

## 4. Step 1 — `/core` binding law

### Goal
`/core` を legacy / ad-hoc source から切り離し、  
canonical engine の `essence` 出力を使う面にする。

### Must use
- canonical engine
- `contextScope = essence`
- display mapper
- page output mapping (`/core` allowed fields only)

### Allowed visible fields
- essence.summaryShort
- essence.keywords
- essence.focusAreas
- safe bridge links

### Must not expose
- rawTraits
- raw dramatic labels
- DTR fullSections
- long-term detail
- Layer1 truth details

### Acceptance
- `/core` が canonical engine から描画される
- UI の tone は現行を大きく変えない
- Home を一切触らない
- run-to-run deterministic

---

## 5. Step 2 — `/today` binding law

### Goal
`/today` を canonical engine の `today` 出力へ bind する。

### Allowed visible fields
- today.heading
- today.summaryShort
- today.focus
- today.step
- today.bridgeToTomorrow

### Must not expose
- rawSignals
- long body
- relationship detail
- DTR deep fields

---

## 6. Step 3 — `/weekly` binding law

### Goal
`/weekly` を canonical engine の `weekly` 出力へ bind する。

### Allowed visible fields
- weekly.heading
- weekly.weeklyKey
- weekly.lines
- weekly.focusAreas
- weekly.nextBridge

### Must not expose
- rawSignals
- long body
- future full DTR fields

---

## 7. Step 4 — `/my` binding law

### Goal
`/my` に Layer1 truth を接続する。

### Must use
- purchase_entitlement_state
- owned_dtr_state
- consult_credits_remaining
- dtr metadata

### Must not do
- DTR full body 全表示
- Home 代替化
- heavy narrative copy

---

## 8. Step 5 — DTR ownership truth binding law

### Goal
object-level ownership / teaser-full split / expiry truth を reader 側へ接続する。

### Must use
- dtr_ownership_type
- dtr_unlock_state
- expiresAt
- teaserSections / fullSections
- owned-only gate

### Must not do
- public LP に fullSections を漏らす
- unlock logic を推測で補完する

---

## 9. Binding adapter recommendation

各 step で直接 page に logic を埋め込まず、最小の adapter を置く。

### Example responsibilities
- canonical input assembly
- engine call
- display mapper call
- page-safe field selection
- fallback fail handling

### Why
将来の engine change や golden rerun と整合しやすいから。

---

## 10. Acceptance criteria by rollout

### `/core` step pass
- canonical essence bind 完了
- no Home change
- no surface change
- report + freeze

### `/today` step pass
- canonical today bind 完了
- today specific fields only
- report + freeze

### `/weekly` step pass
- canonical weekly bind 完了
- weekly specific fields only
- report + freeze

### `/my` step pass
- Layer1 truth bind 完了
- ownership summary が壊れない
- report + freeze

### DTR step pass
- teaser/full ownership truth 完了
- public/deep boundary 保持
- report + freeze

---

## 11. Final command

次は Home ではない。  
**`/core` から始める。**

binding は、設計を広げる作業ではなく、  
**canonical engine を current Web へ順番に差し込む作業** である。

1 step = 1 page.  
報告と freeze を挟みながら進めること。
