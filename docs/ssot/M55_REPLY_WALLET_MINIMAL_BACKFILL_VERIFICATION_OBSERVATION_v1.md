# M55_REPLY_WALLET_MINIMAL_BACKFILL_VERIFICATION_OBSERVATION_v1

Status: **Evidence record (Supabase実測)** — **この文書は DB 変更を伴わない。** 観測の正本として扱う。  

Date: 2026-04-29  

Related:

- **Minimal verification SQL（再検証に使用）:** `scripts/sql/staging/m55_reply_wallet_backfill_minimal_verification_hash.sql`
- **前提ポリシー（orphan／missing fulfillment）:**  
  `docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_PART1_OBSERVATION_v1.md`  
  `docs/ssot/M55_REPLY_WALLET_MISSING_FULFILLMENT_REMEDIATION_POLICY_v1.md`
- **旧 Backfill検証SQL（SECTION B が 0 行になった版）:** `scripts/sql/staging/m55_reply_wallet_backfill_verification_hash.sql`  
  （コホート定義が厳しく **Phase0 の「snapshot 無し wallet」全件と一致しない**ことが判明。**本観測の行単位リストは minimal SQL を正とする**。）

---

## 1. 実測結果（Supabase / minimal SELECT）

検証実行は **読み取り専用**。**生 `user_id`・Stripe セッション ID・payload 本文は結果に含めず**、`hashed_user_id` および集計のみ。

| 項目 | 観測 |
|------|------|
| `wallet_user_without_snapshot_count` | **3**（Phase0 Lite と同一定義：`DTR_CORE_STATIC_V1` の snapshot が無い wallet 行数） |
| 該当 **3 行**を返す **PART 2** の行数 | **3**（上記カウントと一致） |
| 3 件とも `dtr_core_snapshot_count` | **0**（復旧済み snapshot **0** 件） |
| `verification_status = still_missing_snapshot` | **3 件とも** |
| 「部分復旧」相当（同一コホート内で snapshot ありだがチェーン欠落のみ、等） | **実測上 0 件**（全員 `still_missing_snapshot`） |
| 3 件とも `entitlement_count`（`DTR_CORE_STATIC_V1`） | **1** |
| 3 件とも `has_entitlement_stripe_session_id` | **true** |
| 3 件とも `core_right_count`（`m55_p:core_origin`） | **0** |
| 3 件とも `one_time_fulfillment_count`（同上製品） | **0** |
| **返書利用寄り（`consumed = 1` かつ `reply_sessions` / `reply_documents` に履歴あり）** | **2** 件 |
| **未利用寄り（`available = 1` / `consumed = 0` / 返書履歴なし）** | **1** 件 |

**要約：** 問題の **3 件すべて**において、`dtr_report_snapshots`（DTR core）**復旧は現DBでは確認できない**。`wallet_user_without_snapshot_count = 3` のまま。

---

## 2. Gemini 側「1 件 Backfill 成功」報告の扱い

- **M55 正本（本 SSOT）では採用しない。** 理由は **現 Supabase 実測との不一致**。
- 今回の **minimal verification** では **3 件とも `dtr_core_snapshot_count = 0`** かつ **`still_missing_snapshot`** であり、**「1 件だけ snapshot 復旧済み」は確認できない**。
- 想定される要因（排他的ではない）：**別環境・未反映の作業**、**別コホート条件**、**ツール側の誤判定**、**報告と実DBの時点ズレ** 等。
- **以降の意思決定は、本観測に基づく Supabase 実測を優先する。** Gemini 側の成功報告は **参照ログ**として残しつつ **SSOT の根拠にはしない**。

---

## 3. 3 件の分類（処理方針のたたき台）

### A. 返書利用済み側 — `still_missing_snapshot`：**2 件**

- **削除禁止**（請求監査・履歴・ユーザーへの説明責務）。
- **`reply_sessions` / `reply_documents`：** 既存ログとして **削除せず保護**。`report_instance` 未紐づでも **削除しない**（返書経路 SSOT）。
- **snapshot / envelope / birth / nickname の再構成が安全に証明できない場合：** **legacy 保護**または **manual_review／隔離対象**（詳細は `MISSING_FULFILLMENT_REMEDIATION_POLICY_v1` と整合）。

### B. 未使用側 — `still_missing_snapshot`：**1 件**

- **削除禁止**（wallet / entitlement / ledger / session／document）。
- **active entitlement + wallet が並存**しているため、**権利・課金監査の観点では消さない**。**manual_review** および **legacy 保護候補** とする。

---

## 4. 絶対禁止（本観測に基づく運用ゲート）

次を **しない**：

- **`reply_ticket_wallets` の削除**
- **`entitlements` 行の削除**
- **`reply_wallet_ledgers` / `reply_sessions` / `reply_documents` の削除**
- **推測に基づく `dtr_report_snapshots` の生成**（および birth／nickname／envelope を根拠なしで充填しない）
- **推測に基づく `one_time_fulfillments` / `entitlement_rights` の作成**
- **Phase A 以降**（nullable 列・UNIQUE・NOT NULL・RPC 追従など）への着手
- **`report_instance_id` を前提とした wallet migration（backfill 含む）の本番開始**
- **Stripe 追加課金・追加 SKU・新 Checkout の作成**
- **商品棚 UI の変更**

（Webhook／秘密鍵の取り扱いは組織のセキュリティ手順に従う。**本文書は秘密を含まない**。）

---

## 5. migration blocker（確定）

**次を満たすまで、`report_instance` 系 wallet migration を開始しない。** 本項目を **migration blocker** として記録する。

1. **本 3 件**について、運用側の区分（復旧対象／backfill 対象外／quarantine／legacy 保護等）が **文書・オーナー合意済み**であること。
2. **Gemini「1 件成功」報告と実DBが食い違う**ため、任意の自動 backfill は **本観測を上回る証跡**（環境同一性・適用済み DDL・実行ログの突合など）なく **走らせない**。
3. **本番 DB に書き込む修復**（INSERT／UPDATE）は **別 PR・別レビュー・別承認**のみ。

---

## 6. 次の方針

- **3 件を immediate の一括修復の対象にしない。** **manual_review** および必要に応じて **legacy 隔離／quarantine** を検討する。
- **返書利用済み 2 件：** **履歴保護を最優先**（セッション・文書の削除・上書きをしない）。
- **未使用 1 件：** **権利・wallet 整合の保護を最優先**（無根拠な削除や snapshot の推測生成をしない）。
- **Phase A 再開条件は再定義する。**  
  - 最低限：**本 blocker §5 が解除済み**、かつ **`MISSING_FULFILLMENT`／orphan 系ポリシーと矛盾しない運用決定**が付いていること。  
  - **Stripe 追加課金は別ゲート**とする（従前どおり）。

---

## 7. 変更履歴

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | minimal backfill verification 実測に基づく初版。Gemini 成功報告は未採用。migration blocker 確定。 |
