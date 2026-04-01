# M55_LOGIC_LAYERED_INTEGRATION_PACKAGE_SSOT_20260323_v1

AUTHORITY: PRIMARY CANDIDATE
Status: READY-FOR-CURSOR
Priority: HIGHEST
Scope: logic reconstruction package / monetization-structure integration / vocabulary+narrative layering
Intent: 占術ロジック資産・収益化正本・翻訳辞書・3層骨格を、Layer1/2/3 を壊さずに統合するための package 正本

---

## 0. Executive judgment

今回の統合案は、**かなり正しい**。  
特に、「表面商品ではなく、権利モデル / 所有モデル / 出力契約 / 更新境界で接続する」という判断は、いままで凍結してきた Web MVP と矛盾しない。

### Why it is strong
- monetization を “surface” ではなく “structure” として使う
- logic を copy より先に contract で固める
- vocabulary / narrative を差し替え可能 layer に逃がす
- unknown key = fail を前提にできる
- golden test vector を持ち込める

### What would make it weak
- Layer3 語彙を Layer2 演算に混ぜる
- app monetization surface を current Web に戻す
- raw dramatic copy を public wording に漏らす
- schema 不在のまま実装先行する

---

## 1. Final 4-layer architecture

### Layer0 — Public surface
役割:
- Home wording
- FAQ
- support / legal
- DTR deepening explanation
- free-first central scroll

ルール:
- 擬似科学 claim 禁止
- 強い予言表現禁止
- raw logic を直接露出しない
- calm / public-safe wording only

### Layer1 — Entitlement / Ownership / Retention
役割:
- plan keys
- DTR ownership type
- consult credits
- retention / expiration / cooldown
- unlock state
- unknown key handling

ルール:
- monetization freeze を唯一の正として継承
- unknown key = fail
- 推測フォールバック禁止
- synonym key 禁止

### Layer2 — Observation logic engine
役割:
- birthDate seed
- nickname label role
- essence output
- today output
- weekly output
- DTR payload generation
- relationship / long-term reserved extension

ルール:
- UI 文言ではなく canonical I/O contract を先に固定
- deterministic
- same input -> same raw output

### Layer3 — Presentation mapping
役割:
- M55×現代語 の翻訳辞書
- ライフ・プロデュース・ロジックL の3層骨格
- raw -> display 蒸留
- page別 mapping
- DTR narrative skeleton

ルール:
- Layer1/2 を変更しない
- raw と display を分離
- display は calm / short / safe
- 更新可能だが contract は壊さない

---

## 2. What can be imported right now

### Safe to import now — Layer1
- Static / Dynamic / Personal
- interruption ban
- quiet offer principle
- no ads / no score / no rank
- retention / ownership / save / consult structure
- exact key discipline

### Safe to import now — Layer3
- 五行 -> 才能ジャンル等の vocabulary mapping
- 魂の原石 / 才能の変換機 / 航路 の narrative skeleton
- raw term 保持 + display term 蒸留
- “稼ぐ” を “変換 / 出力 / パッケージング” に寄せる語彙

### Safe to import now — Test assets
- 1983-02-28 等の厳密演算レポートを golden vector に使う

---

## 3. What must NOT be imported now

### Do NOT import into current Web surface
- Free / Standard / Premium 表面UI
- Tarot daily surface
- Ads surface
- Calendar monetization surface
- app commerce tabs
- subscription-first public UI

### Why
current Web の表面商品は **¥1,000 DTR + AI相談1往復** を中心に設計されている。  
ここへ app 側の表面商品を混ぜると、Home / DTR / My / entitlement が再崩壊する。

---

## 4. Required missing package files

この統合を壊れなくするには、最低でも次の3本が必要。

### A. Canonical I/O Contract
Create:
`M55_CANONICAL_IO_CONTRACT_SSOT_v1.md`

Must include:
- input schema
- essence/today/weekly/dtr output schema
- free/deep split
- DTR object schema
- reserved extension slots

### B. Entitlement Key Normalization Table
Create:
`M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md`

Must include:
- plan keys
- ownership keys
- consult credit keys
- retention keys
- expiration keys
- unlock state keys
- synonym ban
- unknown key = fail

### C. Page × Output Field Mapping
Create:
`M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md`

Must include:
- Home
- core
- today
- weekly
- my
- dtr
and which output fields each may expose

---

## 5. Correct handling of M55×現代語

### Position
**辞書SSOT** として扱う。  
演算値や権利モデルには介入させない。

### Data model
- `rawLabel`
- `displayLabel`
- `displaySummaryShort`
- `tags[]`
- `safetyFlags[]`

### Rules
- raw term は保持
- display term は蒸留して短文化
- display は public-safe wording に従う
- entitlement / storage / ownership に影響させない

---

## 6. Correct handling of ライフ・プロデュース・ロジックL

### Position
**DTR章立て / narrative skeleton SSOT** として扱う。

### Approved 3-layer skeleton
- Layer1 = 魂の原石
- Layer2 = 才能の変換機
- Layer3 = 航路

### Allowed use
- DTR章立て
- `/core` の見出し設計
- My の所有物ラベル補助
- AI相談の解説補助

### Safety rule
public 面では強い断定コピーにしない。  
display は “要約 / 見方 / 焦点” に蒸留する。

---

## 7. Layer3 display safety policy

Layer3 は最も暴走しやすいので、ここを厳しく固定する。

### Must do
- raw / display dual-hold
- display は 40〜80字程度を基本
- 断定禁止
- 禁則語チェック
- public / dtr / my で tone を分ける

### Must NOT
- raw dramatic line をそのまま Home に出す
- “自由になれる時期” などを断定する
- “黄金期” “宿命” “重大転機” を public main copy に使う
- 不安を煽る言い回し

### Safe conversions
- 黄金期 -> 長期の流れ
- 宿命的相性 -> 関係性の見方
- 撤退の二字はない -> 継続して押し進める傾き
- 株価が動く -> 外部変化に反応しやすい局面

---

## 8. Golden test strategy

### Golden vector
1983-02-28 等の厳密演算レポートを golden vector とする。

### Test requirements
1. same input -> same raw output
2. same raw output -> same display output
3. forbidden wording leak がない
4. free/deep split が正しい
5. page mapping が正しい

### Why
Layer2 と Layer3 の結合を、最短で壊れなくできるから。

---

## 9. Silicon Valley-grade critique

この案の評価は高い。  
ただし、シリコンバレー基準では **“内部の強い欲求” と “公開面の安全な翻訳” を分けて運用できるか** が勝負になる。

### Strong points
- architecture-first
- contracts before implementation
- monetization as structure, not surface
- replaceable vocabulary layer
- deterministic testing mindset

### Weak points if left unchecked
- Layer3 の語彙が raw すぎる
- package file が未整備
- key normalization が曖昧
- free/deep split が field 単位で凍結されていない

---

## 10. Recommended sequence

### Step 1
この package SSOT を凍結

### Step 2
`M55_CANONICAL_IO_CONTRACT_SSOT_v1.md` を作る

### Step 3
`M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1.md` を作る

### Step 4
`M55_PAGE_OUTPUT_MAPPING_SSOT_v1.md` を作る

### Step 5
Layer3 語彙パックを統合

### Step 6
golden vector で決定論 + 蒸留安全性を検証

---

## 11. Final command

この統合案の正解は、
“全部を今の Web に乗せること” ではない。

**Layer1 は権利の唯一の正、  
Layer2 は決定論の唯一の正、  
Layer3 は更新可能な翻訳辞書**
として package 化し、  
current Web の表面商品は壊さずに future-safe な統合基盤を作る。

これが、最も事故が少なく、今後の Web 更新にも効く統合方式である。
