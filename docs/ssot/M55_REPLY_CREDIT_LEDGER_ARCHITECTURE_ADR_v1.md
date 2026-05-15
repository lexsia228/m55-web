# M55_REPLY_CREDIT_LEDGER_ARCHITECTURE_ADR_v1

Status: Accepted (documentation only — no code or DB changes in the PR that introduces this file)  
Date: 2026-04-28  
Scope: 相談返書クレジットの正本（SSOT）と、`consult_*` / `reply_*` 二重管理への移行方針  
Related: `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md`  
Owner: M55 / Reflect Note by M55

---

## 0. 目的

追加相談返書の権利・消費・監査を **単一のデータモデル** に収斂し、Stripe 追加課金・付属1件・運用補填と矛盾しない実装順序を固定する。  
本 ADR は **設計の決定と移行順序** を記す。本ファイルのマージ **単体**では **DB 変更・API 挙動変更・MAX_CREDITS 変更を行わない**。

---

## 1. 決定

1. **返書クレジットの正本**は **`reply_ticket_wallets` / `reply_wallet_ledgers`** とする。  
   - 利用可能残数の真実は `reply_ticket_wallets`（制約・式は既存マイグレーションに従う）。  
   - 付与・購入・消費・補填・移管・取消の説明責任は **`reply_wallet_ledgers`** に残す。

2. **Stripe 追加購入**、**付属1件**、**手動補填**、**誤入力時の未使用移管**は **wallet / ledger 側**で表現・実装する（レポート紐づけは正本 `M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` に従う）。

3. **`consult_threads`** は最終的に **会話ログ・表示上の状態・read-only 補助** に寄せる。  
   - **`consult_threads.credits_total` / `credits_remaining` は長期的に「正本」としない**。移行完了後も正本が wallet 側であることを維持する。

4. 本決定により、**正本以外の場所での「だけを」権利増減**（consult だけ増やす等）を禁止する（詳細は §4）。

---

## 2. 現状（2026-04-28 時点のコード観察）

| 経路 | 実装 |
|------|------|
| **DtrFullReader / ConsultRoom / `GET`\|`POST /api/room/core*`** | **`consult_threads` / `consult_messages`** を参照。残数・消費は主にこの系で更新されている。 |
| **DTR 購入フルフィルメント** | **`grantInitialIncludedReplyIfNeeded`** により **`reply_ticket_wallets`** に同梱1件を付与。 |
| **`/api/reply/generate`** | **`reply_ticket_wallets`**、`reply_sessions`、`reply_documents`、およびコミット用 RPC と連動。 |
| **`grantPurchasedReplyTickets`** | **実装は存在するが、Stripe/Webhook からは未配線**（呼び出し元がコードベースに未接続）。 |

**構造リスク:** このまま Stripe 追加購入だけを進めると、**購入反映先（wallet 想定）と、メイン UI（ConsultRoom）が参照している残数（consult）** が **継続的にズレる**。

---

## 3. 責務分離

| コンポーネント | 責務 |
|----------------|------|
| **`reply_ticket_wallets`** | **現在利用可能な返書クレジット残数**および wallet 状態（例: active）。正本の「いま使える件数」の一次ソース。 |
| **`reply_wallet_ledgers`** | **付与・購入・消費・補填・移管・取消** の **監査台帳**（イベント種別・残高after・関連セッション等）。 |
| **`reply_documents` / `reply_sessions`** | **生成された返書本文** と **生成セッション**（スキーマ版・入力・状態機械）。 |
| **`consult_messages`** | **会話ログ**（ユーザー発言・AI 応答）。移行完了後も **ログ保存** に使いうる。**消費の正本ではない**。 |
| **`consult_threads`** | **短期互換**。スレッド境界・読み書きロック補助・既存 UX との接续。将来的には **wallet 残数の表示補助のみ**または **縮退・廃止候補**。 |

---

## 4. 禁止事項

1. **Stripe / Webhook で `consult_threads` だけを増やす**（wallet / ledger と整合しない単独更新）。  
2. **ConsultRoom だけが `credits_remaining` を「唯一の真実」として扱う**設計（正本は wallet）。  
3. **PurchaseCache を所有状態・権利の正とする**。  
4. **`success_url` 到達だけでクレジット付与する**（決済検証・Webhook・DB 台帳と揃えること）。  
5. **追加購入分を「グローバルチケット」化し、レポート横断で使い回す**（正本の他レポート併用禁止に反する）。  
6. **他レポートの権利へ流用する**実装・運用。  
7. **`report_instance_id`（または正本で定義される同等のレポート实例キー）なしで、追加返書権利のみを処理する**。

---

## 5. 移行順序（PR 一覧）

| PR | 内容 | 本 ADR と合致するゲート |
|----|------|-------------------------|
| **PR0** | **本 ADR の作成のみ。コード変更なし。** | 本ドキュメントの受理。 |
| **PR1** | **`GET /api/room/core` で、`reply_ticket_wallets.available_count` と `consult_threads.credits_remaining` を read-only で照合**し、**ログまたは管理用フィールド**に出す。**ユーザー向け文言・消費ロジック・表示の意味は変更しない**。 | 二重状態の **可視化のみ**。 |
| **PR2** | **ConsultRoom の「表示される残数」**を **wallet 正本** に切り替える（読取）。**消費の書き込み経路はまだ必ずしもwalletに寄せない判断を許容**するが、**表示は正本と一致**させる。 | ユーザーが見える数＝wallet。 |
| **PR3** | **相談送信時の消費**を **wallet + ledger（既存 RPC パターン等）に寄せる**。**生成成功後のみ消費**、失敗時は不消費。 | consume の正が ledger。 |
| **PR4** | **`MAX_CREDITS` を正本の 5件モデル**（付属1＋追加最大4）に合わせる（コード・スキーマは別設計レビュー）。 | 上限の一本化。 |
| **PR5** | **Stripe 追加購入 Webhook から `grantPurchasedReplyTickets` を冪等に呼ぶ**。 | purchase → wallet → ledger。 |
| **PR6** | **商品棚 UI を表示する**（本 ADR の範囲外詳細は商品 SSOT に従う）。 | 販売導線。 |

**注意:** PR1〜PR6 は **順序を崩すとデータ不整合や二重消費のリスク**が高い。スキップは **ADR と正本の再レビュー**を必須とする。

---

## 6. 復旧・整合性観点

1. **生成失敗時はクレジットを消費しない**。  
2. **永続保存失敗時も消費しない**（「消費したが本文が無い」を防ぐ）。  
3. **消費後に保存だけ失敗**するパスを避けるため、**消費と document 保存は同一 RPC またはトランザクション相当**に寄せる（既存 `m55_reply_generate_commit` 系の思想と整合）。  
4. **誤入力等で旧 `report_instance` を voided にした場合**、**未使用分のみ**新 `report_instance` へ **移管**できること（ledger に **移管イベント**を残す）。  
5. **誰が・いつ・何により** 付与 / 消費 / 移管したかを **`reply_wallet_ledgers` で追跡**する。

---

## 7. E2E ゲート（受入基準のたたき台）

以下を **本番相当環境**で **自動または手動 E2E** の対象とする（詳細は別テスト計画）。

1. **付属1件が wallet に存在する**（購入フルフィルメント後）。  
2. **ConsultRoom が wallet 残数を読める**（PR2 以降）。  
3. **1往復の生成成功後に wallet が 1 減る**（PR3 以降）。  
4. **生成失敗時は減らない**。  
5. **リロード後も返書履歴が見える**（保存された本文・または会話ログの定義に従う）。  
6. **未購入者は使えない**。  
7. **別ユーザーの `report_instance_id` では使えない**（正本の紐づけ検証）。  
8. **5件上限で止まる**（PR4 以降・正本と一致）。  
9. **Stripe 購入後に wallet が増え、ConsultRoom に反映される**（PR5〜6 以降）。

---

## 8. 非目標（本 ADR のスコープ外）

- **具体的な SQL / マイグレーション DDL** の確定  
- **`MAX_CREDITS` の数値変更**や **consult テーブル削除 DDL** の実行  
- **Stripe Checkout URL**、**Webhook 実装詳細**、**商品棚 UI の文言・配置** の確定  

上記は **PR4〜PR6** と正本レビューのうえで別文書または PR 単位で扱う。

---

## 9. 改廃

| バージョン | 日付 | 変更内容 |
|-----------|------|-----------|
| v1 | 2026-04-28 | 初版。Wallet 正本化決定・移行 PR 順序・禁止事項・E2Eゲート |

---

## 参考文献

- `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md`
- `docs/ssot/M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1.md`（既存データ層との整合を前提に参照すること）
