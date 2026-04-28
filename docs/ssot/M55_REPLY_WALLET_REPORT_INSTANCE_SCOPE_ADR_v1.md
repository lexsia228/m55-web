# M55_REPLY_WALLET_REPORT_INSTANCE_SCOPE_ADR_v1

Status: Accepted (documentation only — no migration applied in the PR that introduces this file)  
Date: 2026-04-28  
Scope: 追加相談返書クレジットを **report_instance 単位**で管理するための方針・DB 候補・移行順序  
Related:

- `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md`
- `docs/ssot/M55_REPLY_CREDIT_LEDGER_ARCHITECTURE_ADR_v1.md`（wallet / ledger を正本とする前提）
- PR1.5 監査結論：現行 `reply_ticket_wallets` は **user_id UNIQUE** で **レポート単位分離不可**

Owner: M55 / Reflect Note by M55

---

## 0. 背景

PR1 で read-only 照合を実装済み。PR1.5 で現行スキーマを監査し、**返書クレジットの Wallet がユーザー全局 1 行**であり、**正本 SSOT の「本質レポート 1 インスタンスにのみ紐づく」「他レポート併用不可」**を DB で保証できないことが確定した。  
**PR2（ConsultRoom の表示を Wallet 正本へ切替）は、スキーマ拡張なしでは NO-GO** とする。本 ADR は、その後の **report_instance 単位台帳** への設計合意を記す。

---

## 1. 決定

1. **追加相談返書クレジットは `user` 単位ではなく `report_instance` 単位**で管理する。  
2. **1 本質レポート・インスタンスにつき 1 wallet 行**を原則とする（マイグレーション上の物理名は別途 DDL で定義）。  
3. **付属 1 件**、**追加購入最大 4 件**、**消費**、**補填**、**移管**、**取消**はすべて **`report_instance_id` に紐づく ledger / wallet 操作**として扱う。  
4. **`user_id` 単独での wallet 一意性（単一行）**は **長期的な正本にしない**。移行完了後は読取・集計・レガシー監査以外の正本経路に使わない。

---

## 2. 現状の問題（PR1.5 監査の要約）

| 問題 | 説明 |
|------|------|
| **UNIQUE が user のみ** | `reply_ticket_wallets.user_id UNIQUE` により **ユーザーあたり最大 1 行**。 |
| **`available_count` のスコープ** | **ユーザー全局**で 1 つの残数。複数本質レポート・将来商品で **混線**。 |
| **ledger の付与追跡** | `reply_wallet_ledgers` の付与行に **`report_instance_id` 等がなく**、**どのインスタンスへの付与か**を行単体で完結できない。 |
| **`reply_sessions`** | **`report_instance_id` 列なし**（現行マイグレーション）。生成とレポート实例の紐づけが **DB 一意制約として表現されない**。 |
| **`/api/reply/generate` / RPC** | **`user_id` で wallet をロック**し消費。**インスタンス粒度でない**。 |
| **PR2 のリスク** | 現スキーマのまま ConsultRoom 表示を Wallet に寄せると、**正本の境界に反する**。 |

---

## 3. 必要な DB 設計案と比較

### 候補 A：`reply_ticket_wallets` に `report_instance_id` を追加し、`UNIQUE (user_id, report_instance_id)` とする

| 観点 | 評価 |
|------|------|
| **既存データ移行** | **中**。既存 1 行 / ユーザーを **`report_instance_id` 付きにバックフィル**する必要。**实例の正は別テーブルまたは運用定義**が要る。 |
| **Stripe 追加購入** | **良**。Webhook は **实例特定**（metadata 等）後 **該当 wallet 行だけ** `purchased_count` / `available_count` 更新。 |
| **Webhook 冪等性** | **良**。`stripe_event_id` + **wallet 行 id または (user, report_instance, price)** で重複付与を防ぎやすい。 |
| **誤入力・未使用移管** | **良**。**移管は「旧实例 wallet → 新实例 wallet」ledger イベント**で表現しやすい。 |
| **返書履歴追跡** | **中〜良**。`reply_sessions` に `report_instance_id` を追加すれば **消費 ledger + session** が揃う。**既存 RPC の改修は必須**。 |
| **`/api/reply/generate` 影響** | **大**。RPC が **user 単位 wallet 前提**のため、**引数または解決ロジックに report_instance** が必要。 |
| **ConsultRoom 移行** | **中**。`consult_threads` は既に `report_key` 等を保持可能。**实例 id の解決**（スナップショット／所有テーブル）を **API が一貫して渡す**必要。 |
| **rollback** | **中**。カラム追加は **ロールバックで列削除**または **新列を無視する読取**に戻す。 |
| **最小 PR サイズ** | **中**。DDL + バックフィル + 読取経路の段階的切替。 |

### 候補 B：新テーブル `reply_credit_wallets_v2` を作り、既存 `reply_ticket_wallets` を legacy 凍結

| 観点 | 評価 |
|------|------|
| **既存データ移行** | **中〜高**。v2 へ **コピーまたは再計算**。**旧表は参照のみ**に残せる。 |
| **Stripe / Webhook** | **良**。**新表のみ**を更新対象にすれば、旧データと衝突しにくい。 |
| **冪等性** | **良**。新 ledger テーブルまたは v2 専用 ledger を分けられる（**重複は複雑になる**リスクあり → 設計要）。 |
| **移管・監査** | **良**。「v1 → v2」の **移行イベント**を ledger に残しやすい。 |
| **返書履歴** | **中〜良**。アプリは **v2 wallet id** に寄せる。**二重テーブル期間**の整合に注意。 |
| **`/api/reply/generate`** | **大**。読取先を v2 に切替。**旧 RPC 名のまま内部で v2** も可。 |
| **ConsultRoom** | **中**。読取先を v2 に合わせる。 |
| **rollback** | **良**。**アプリを旧表読取に戻す**だけでよい（データ二重保持の前提）。 |
| **最小 PR** | **大**。**新表 + マイグレーション + 読取切替**が分割しにくい。**長期二重メンテ**のリスク。 |

### 候補 C：`report_key` / `product_scope` のみで暫定分離（`report_instance_id` なし）

| 観点 | 評価 |
|------|------|
| **意図** | 同一製品ラインで「種別」だけ分けたい場合の **暫定**。 |
| **弱点** | **同一 user・同一 product で本質レポートを複数買い直した場合**に **区別不能**。**正本 SSOT の「实例」に弱い**。 |
| **推奨度** | **原則非推奨**。**短期の救急**以外は **A または B** に倒す。 |

---

## 4. 推奨案

### 推奨：**候補 A（既存 `reply_ticket_wallets` を拡張し `UNIQUE (user_id, report_instance_id)` に移行）**

#### 理由（要約）

1. **単一の Wallet テーブル**を正本にできるため、**長期の二重メンテ（B の v1/v2）**を避けやすい。  
2. **既存 RPC・`walletGrants` の名前**を活かしつつ、**PRIMARY 一意制約の差し替え**に集中できる（B より **PR 分割がしやすい**）。  
3. **Ledger は既存 `reply_wallet_ledgers` を拡張**（`report_instance_id` 列追加等）し、**監査の一連性**を維持しやすい。  
4. 正本 **`M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1`** の **实例キー** と **1:1 で wallet** を対応付けられる。

#### 既存データ移行方針（方針レベルのみ — 本 ADR では DDL 未確定）

1. **`report_instance_id` の Canonical 定義**を正本または `dtr_report_snapshots` / 専用マスタで固定する（**UUID 等**）。  
2. 既存 **`reply_ticket_wallets` 1 行 / user** について、**当該ユーザーに紐づく「唯一の本質レポート实例」**がある前提で **1 行に `report_instance_id` をバックフィル**（前提が崩れるユーザーは **手当て or フラグ**）。  
3. **`UNIQUE (user_id)` を `UNIQUE (user_id, report_instance_id)` に変更**（PostgreSQL では制約入替の順序を設計）。  
4. **`reply_wallet_ledgers`** に **`report_instance_id`** を追加し、**可能な範囲でバックフィル**（無理な行は `recovery_adjust` 等で説明）。  
5. **`reply_sessions`** に **`report_instance_id` NOT NULL**（追加マイグレーション段階で nullable → 埋め → NOT NULL）。

#### 旧 user 単位 wallet の扱い

- **移行完了後**: **新規INSERTは必ず `report_instance_id` 付き**。**`user_id` 単独での新規行作成は禁止**（アプリ／制約で防止）。  
- **移行期間中**: 旧行は **読取専用**または **API で無視**し、**照会用ログのみ**に限定する運用を定義する。  
- **監査**: 旧データは **ledger 上で「移行完了」イベント**を残すことを推奨。

---

## 5. 移行順序（PR 番号は本 ADR 内の便宜上のラベル）

| 段階 | 内容 | ゲート |
|------|------|--------|
| **PR1.6** | **本 ADR のみ。コード変更なし。** | 文書合意。 |
| **PR1.7** | **migration 案（SQL 草案）作成のみ。未適用。** | レビュー可。 |
| **PR1.8** | **staging / dev で migration 適用、backfill 確認。** | 検証環境 OK。 |
| **PR1.9** | **wallet read helper を report_instance 対応。** | 読取が实例で一貫。 |
| **PR2** | **ConsultRoom 表示を report_instance wallet へ切替。** | 表示＝正本。 |
| **PR3** | **消費を ledger / RPC へ統合（实例スコープ）。** | 消費＝正本。 |
| **PR4** | **MAX_CREDITS を正本 5 件モデルへ。** | 上限整合。 |
| **PR5** | **Stripe Webhook から report_instance wallet へ冪等付与。** | 購入整合。 |
| **PR6** | **商品棚 UI。** | 販売導線。 |

（既存 **`M55_REPLY_CREDIT_LEDGER_ARCHITECTURE_ADR_v1`** の PR 番号とは **継承関係**であり、**本 ADR のラベルが「实例スコープ」前段のため、番号はプロジェクトで再採番してよい**。）

---

## 6. E2E ゲート（受入のたたき台）

以下を **staging / 本番相当**で検証できること。

1. **本質レポート A の wallet と本質レポート B の wallet が混ざらない**（同一 `user_id` でも残数独立）。  
2. **別レポート種別**（product_scope が異なる場合）と **混ざらない**。  
3. **付属 1 件**が **該当 `report_instance` の wallet にのみ**付与される。  
4. **追加 4 件**も **該当 `report_instance` の wallet にのみ**付与される。  
5. **消費時**に **該当实例の wallet だけ**減る。  
6. **誤入力で旧实例を void** したとき、**未使用分だけ新 `report_instance` に移管**できる（ledger で追跡）。  
7. **生成失敗時はクレジットを減らない**。  
8. **Stripe Webhook 重複**でも **二重付与しない**。

---

## 7. 非目標（本 ADR のスコープ外）

- 具体的 **DDL 全文**、`report_instance_id` の **生成元テーブル確定**  
- **Stripe metadata キー名**、**Webhook の疑似コード**  
- **PR1.7 の SQL ファイル作成**（別 PR）

---

## 8. 改廃

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-28 | 初版。实例スコープ決定、候補 A/B/C 比較、推奨 A、移行順序、E2E ゲート |
