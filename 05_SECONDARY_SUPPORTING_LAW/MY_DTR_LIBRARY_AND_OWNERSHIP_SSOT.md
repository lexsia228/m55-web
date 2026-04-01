# MY_DTR_LIBRARY_AND_OWNERSHIP_SSOT

AUTHORITY: PRIMARY  
Status: DRAFT FOR ACTIVE WEB LAW  
Priority: HIGH  
Scope: M55 Web MVP / `/my` ownership center / DTR library / consult counter / reuse flow  
Depends on:
- M55_CHAT_FIRST_SHELL_SSOT.md
- M55_HOME_CONCIERGE_DOCK_SSOT.md
- HOME_VALUE_PROP_AND_ENTRY_FLOW_SSOT.md

---

## 0. Purpose

このSSOTは、M55 Web MVP における
`/my`
を **ownership center / DTR置き場 / 再利用中心** として固定するための正本である。

目的は以下。

1. DTR置き場を新規 route 乱立ではなく `/my` に集約する  
2. 購入済みDTR、最近の対話、残往復数、使用状態を一箇所で整理する  
3. 購入後ユーザーが迷わない ownership 面を作る  
4. 追加購入・再相談・再訪の中心を作る  

---

## 1. Core Thesis

`/my` はプロフィールページではない。  
`/my` は **所有・履歴・再利用の中枢** である。

ユーザーは `/my` に来たとき、最低限以下を理解できなければならない。

- 自分が何を所有しているか
- DTR をどこから開けるか
- 残り何回相談できるか
- 最近どこまで使ったか
- 次に何をすればよいか

---

## 2. Required Information Architecture

`/my` は最低限以下の4ゾーンを持つ。

### 2.1 Ownership summary
最上部に所有状態を要約表示する。

Must show:
- 購入済み件数
- 残往復数
- 直近利用状態
- 必要なら追加購入導線

### 2.2 DTR library
購入済みDTRの一覧。

各 item は最低限以下を持つ。
- タイトル or 識別名
- 購入時期または更新時期
- 状態（未読 / 閲覧済み など）
- 開く CTA

### 2.3 Recent conversations
最近の相談 or 結果への導線。

Must show:
- 最近の対話
- 状態
- 続きから使う導線

### 2.4 Reuse / repurchase
追加相談・再購入・次の行動。

Must show:
- 追加相談導線
- 関連 DTR または再購入導線
- Home へ戻る必要があるならその導線

---

## 3. DTR Library Law

### 3.1 Library location
MVP における DTR置き場の正本位置は `/my` とする。

### 3.2 DTR item law
各 DTR item は以下を満たす。

- 何を開くものか分かる
- 所有済みであることが分かる
- 開く行動が明確
- 必要なら関連相談状態とつながる

### 3.3 Must NOT become
以下は禁止。

- 雑然としたリンク一覧
- ファイル名の墓場
- 説明なしの履歴 dump
- Home 代替の販売面

---

## 4. Consult Counter Law

### 4.1 Meaning
残往復数は `/my` で最も分かりやすく見える必要がある。

### 4.2 Required display
Must show:
- 残り1回
- 残り0回
- 未解放
の差がすぐ分かる表示

### 4.3 Action binding
状態に応じて CTA を変える。

- 未解放 → 解放する
- 残りあり → 相談する
- 残り0回 → 追加購入する

---

## 5. Ownership States

### 5.1 Guest / no ownership
Must show:
- 所有なし
- 始める導線
- Home or DTR への導線

### 5.2 Purchased / unused
Must show:
- 保有中
- 残り1回
- DTRを開く
- 相談する

### 5.3 Purchased / consumed
Must show:
- DTR所有済み
- 残り0回
- 追加相談導線
- 最近の結果または履歴

### 5.4 Repeat buyer
Must show:
- 複数所有物の整理
- 再利用導線
- 追加購入の自然な提示

---

## 6. Primary Actions

`/my` の primary / secondary CTA は状態に依存して変化する。

### Primary CTA candidates
- 続きから使う
- DTRを開く
- AIコンシェルジュに相談する
- 追加で相談する

### Secondary CTA candidates
- Homeへ戻る
- 新しい対話
- 追加購入する

---

## 7. Relationship with Other Routes

### With Home
Home は入口。  
`/my` は所有整理。  
Home に所有一覧を詰め込みすぎない。

### With `/dtr/lp`
`/dtr/lp` は未購入時の不安解消。  
`/my` は購入後の整理と再利用。  
この2つを混同しない。

### With free lanes
`/core` `/today` `/weekly` は体験の入口。  
`/my` は ownership の集約。  
役割を入れ替えない。

---

## 8. Empty State Law

`/my` で何も持っていない場合でも、空ページにしない。

### Must show
- まだ所有していないこと
- 何から始めればよいか
- Home または DTR への導線

### Avoid
- 空の箱だけ
- 意味不明な装飾
- 初回訪問向け長文説明

---

## 9. Revisit Law

`/my` は一度買った後の再訪理由を支える場所である。

Must support:
- 所有確認
- 続き再開
- 相談残数確認
- 追加購入

M55 の継続利用は `/my` の整理品質に強く依存する。

---

## 10. Acceptance Criteria

1. ユーザーが自分の所有状態をすぐ理解できる  
2. 購入済み DTR をどこから開くか迷わない  
3. 残往復数と使用状態が見える  
4. 続きから使う / 追加購入する の次行動が明確  
5. `/my` が単なるプロフィールでも履歴 dump でもない  
6. MVP の DTR置き場として成立している  

---

## 11. Final Command

今後の M55 Web MVP では、  
DTR置き場を曖昧な散在導線にしない。  
`/my` を **ownership center / DTR library / reuse hub** として固定する。

購入後ユーザーが戻る場所、整理する場所、再利用する場所は `/my` である。
