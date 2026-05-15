# M55_REPLY_WALLET_PHASE_A_RESTART_GATE_AFTER_ORPHAN_BLOCKER_v1

Status: **Governance / GO 条件** — **DB 変更なし・修復 SQL なし**（本稿は分類・ゲート定義のみ）。  

Date: 2026-04-29  

Related:

- **観測正本（blocking エビデンス）:** `docs/ssot/M55_REPLY_WALLET_MINIMAL_BACKFILL_VERIFICATION_OBSERVATION_v1.md`
- **Missing fulfillment 方針:** `docs/ssot/M55_REPLY_WALLET_MISSING_FULFILLMENT_REMEDIATION_POLICY_v1.md`
- **Orphan PART1 観測:** `docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_PART1_OBSERVATION_v1.md`
- **Snapshot 材料診断（READ-ONLY）:** `scripts/sql/staging/m55_reply_wallet_snapshot_material_hash_diagnostic.sql`

---

## 1. 現状（確定事項）

Minimal verification（`scripts/sql/staging/m55_reply_wallet_backfill_minimal_verification_hash.sql`）に基づく **Supabase 実測**を正とする。

| 項目 | 状態 |
|------|------|
| `wallet_user_without_snapshot_count` | **3** |
| 該当ユーザー | **3 件とも** `verification_status = still_missing_snapshot`、`dtr_core_snapshot_count = 0` |
| 利用パターン | **返書利用済み相当：2**、**未使用相当：1** |
| entitlement | **3 件とも** active 系、`entitlement_count = 1`、`has_entitlement_stripe_session_id = true` |
| チェーン欠落 | **rights / fulfillment / snapshot はすべて 0**（`core_right`、`one_time_fulfillment`、DTR core snapshot なし） |
| Gemini「1 件 Backfill 成功」 | **未採用**（現 DB 実測と整合しないため） |

**継続 NO-GO（変更なし）：** Phase A（migration 実行）の本開始、`report_instance_id` に依拠する wallet migration の前進、**Stripe 追加課金**、**商品棚 UI 変更**。

---

## 2. Phase A 再開の絶対条件（GO ゲート）

次を **すべて**満たしたときに限り、**report_instance wallet migration の Phase A を再開してよい**とする。満たさない限り **GO しない**。

1. **3 ユーザーそれぞれ**について、次の **いずれか一つ**が **文書化・オーナー合意**されていること。  
   - **`repair_candidate`**  
   - **`manual_review_quarantine`**  
   - **`legacy_protected`**
2. **migration の自動 backfill**（`report_instance_id` 等の機械的補填）について、**この 3 件を「含める」か「除外（quarantine）する」か**が **明文化**され、実装担当とレビューの双方が同じ前提を参照できること。
3. **返書利用済み 2 件**について、`reply_sessions` / `reply_documents` に対する **保護方針**（削除禁止・優先順位・CS／将来画面の想定など）が **確定**していること。
4. **未使用 1 件**について、`entitlements` / `reply_ticket_wallets` の **保護方針**（権利・請求監査の扱い）が **確定**していること。
5. **本番での書き込み**（将来的な修復）は **別 PR・別レビュー・別承認**のみとすること（本ゲート自体は **承認済み DDL/DML を含まない**）。
6. Phase A を **再開する段階**で使う実行物（staging 検証を経た migration バンドル等）について、**この 3 件を破壊・上書き・誤紐付けしない**ための **SQL 上の除外条件または安全条件**が **仕様として定義済み**であること（**具体の修復 SQL の記述は本稿の範囲外**。定義の存在が条件）。

---

## 3. 分類（3 件の割り当てルール）

各ユーザーは **いずれか一つ**に分類される。複数ラベルを同時に「実行の正」にしない（監査ログ上の備考は別途可）。

### A. repair_candidate

- **`dtr_report_snapshots` を安全に再作成できる見込み**があると **監査上判断できる**状態。  
  例：**birth_date / nickname / profile_snapshot / envelope 等を、DB または Stripe／運用ログ上の根拠と突き合わせて再構成できる**ことを示唆する材料がある（詳細は snapshot 材料診断の結果に委ねる）。  
- **Stripe／権利／入力データ**の説明可能性がプロダクト・法務ポリシーに照らして許容される。  
- **実行（INSERT/UPDATE）は本ゲートの外** — **別承認**のもとでのみ。

### B. manual_review_quarantine

- **復元材料が不足**しており、自動パイプラインに載せられない。  
- **権利／wallet／entitlement の意味での「保持」はする**が、**migration の自動 backfill 対象には含めない**（一時 **quarantine**）。  
- **CS・再入力・個別オペレーション**の候補として扱う。

### C. legacy_protected

- **旧仕様・不完全 fulfillment** 経由などとみなされるラインであり、現行コードの単純復元パスに乗せない。  
- **既存 wallet / entitlement / reply 履歴**を保持する。  
- **新規追加課金の対象にしない**。  
- **将来の管理画面／CS で扱う**想定としてラベルを付ける。

---

## 4. migration 側の扱い（方針レベル）

- **Phase A〜D に相当する運用上の自動 backfill**は、**この 3 ユーザーを自動で `report_instance_id` に紐づけない**前提で設計する（**別途 quarantine／除外リスト／WHERE 条件**として明示する）。  
- **nullable 列の追加のみ**など、**読み替えなくても既存行を誤って更新しない**段階は、**staging での安全性確認後に「可能性」として検討**しうるが、本ゲート **§2 の確定があるまで Phase A と呼ばない**。  
- **manual_review／quarantine が NULL のまま残るユーザー**については、その列に **NOT NULL を課す段階には進まない**。  
- **NOT NULL / FK / UNIQUE 制約**の本適用は、**全例外（少なくとも本 3 件）の処理方針が §2・§3 に沿って確定した後**。

---

## 5. 禁止事項（再掲）

次を **しない**：

- **推測による `dtr_report_snapshots` の生成**
- **推測による `entitlement_rights` / `one_time_fulfillments` の生成**
- **`reply_ticket_wallets`、`entitlements`、`reply_wallet_ledgers`、`reply_sessions`、`reply_documents` の削除**
- **Stripe の追加課金・追加 SKU の新規提供**（ゲート済みとは別問題として **本件の是正と混ぜない**）
- **商品棚 UI の変更**
- **`report_instance_id` を根拠不十分のまま一括埋めする Phase F／G に相当する作業**

---

## 6. 次の最小作業（コード・migration 開始前）

1. **3 ユーザー**について、`m55_reply_wallet_snapshot_material_hash_diagnostic.sql`（または後継 READ-ONLY 診断）の **材料有無**を確認する。  
2. **材料が無い**、または **安全に再構成できない**と判断される場合は、**`manual_review_quarantine` または `legacy_protected`** として扱う。  
3. 分類が揃ったのち、**migration バンドルに「quarantine 除外条件」をどう埋め込むか**を **設計レビュー**する（**修復用 DML の実装は別 PR**）。

---

## 7. 変更履歴

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | orphan blocker 後の Phase A 再開ゲート初版。 |
