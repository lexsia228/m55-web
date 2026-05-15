# M55_REPLY_WALLET_UNSAFE_ARCHIVE_SQL_REJECTION_v1

Status: **Formal REJECTION — governance SSOT** — **DB は変更しない。** 本章はレビューのみ。  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_MINIMAL_BACKFILL_VERIFICATION_OBSERVATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md` §0.1  
- `docs/ssot/M55_SUPABASE_NON_PROD_DB_STRATEGY_FOR_REPLY_WALLET_MIGRATION_v1.md`

---

## 1. 否認対象

次の趣旨のアイディアおよび、それと同質の **`entitlements`** 行に対する **一括 `status = archived`**（または同等の状態遷移）を **広い論理フィルターだけで** 本番に適用する案を **全面否認する。**

- **`product_id = DTR_CORE_STATIC_V1`** に限り、かつ **`active`かつ `one_time`かつ文字列ソースがチェックアウト系**ような **条件だけ** で **大量行を archived に書き換える**案。  
- 外部ツール（例: Gemini 側）出力に付いた **「VERIFIED & READY FOR PROD」類の断言**。**M55 正本 SSOT のもとでは採用しない。**

**本章には当該 DML を転載しない。** 再現を避けるため、**論理のみ**記す。

---

## 2. 否認理由

| # | 理由 |
|---|------|
| 1 | **条件が広すぎる。** 同じフラグセットを **正常に満たす購入済みユーザー** と **問題の cohort** の両方にかかることがある。**一括適用では区別できない。** |
| 2 | **本番実測（minimal verification と整合する集計）**では、同一スコープにおいて **`active` stripe 系であり snapshot が存在するユーザーが 5 件**、`snapshot が無いユーザーが 3 件**（orphan が知られる範囲）と並存する。**上記広条件だけでは「snapshot があり正常な権利」を止めない保証がない。** |
| 3 | **orphan とみなすべき 3 件だけが安定して単独に特定されていない。** `hashed_user_id` と条件式での **個別検証または SSOT と突合済みリスト** がない状態の一括 DML は **誤適用である。** |
| 4 | **`entitlements`** だけを変えても **`reply_ticket_wallets`、`reply_wallet_ledgers`、`reply_sessions`、`reply_documents`、`entitlement_rights`、`one_time_fulfillments`、`dtr_report_snapshots`** と **ユーザー体験・請求・監査ログ**が **自動的には整合しない。** 参照整合を **読み取らずに権利のみ止めることはしない。** |
| 5 | **shadow project の検証が「簡易スキーマ＋ダミーデータ」**に近いとき、**それは実行可能性のチェックであり本番等同価証明ではない。** |
| 6 | **構文エラーなし ≠ 業務結果が安全**。本番適用可否は **影響行の意味・請求との関係・返書ログ**を含む **別次元の監査**。 |

---

## 3. 絶対禁止

次を **しない**。**本稿はいかなる自動化・スクリプトの許可にも使わない。**

- **本番**で、`entitlements` を **広い論理のみで一括 archived（または類似の権利ストップ相当）する**処理  
- **`entitlements` の一括 archived** で **正常ユーザー数件をまとめて権利停止**しかねない状態のまま適用すること  
- **`reply_ticket_wallets` / `entitlements` / `reply_wallet_ledgers` / `reply_sessions` / `reply_documents` の削除**  
- **推測**による **権利の停止・剥奪**  
- **orphan と特定されたユーザー**への **raw `user_id` を転記しない本番 DML**（および **チケット上の単独転記だけで本番適用しない**こと）  
- **Stripe の追加課金・商品棚 UI 変更**（本問題の是正と混同しない）  

---

## 4. 正しい扱い（M55 正本）

| 項目 | 方針 |
|------|------|
| **orphan 3 件** | **`manual_review_quarantine` / `legacy_protected`**（`ORPHAN_THREE_CASE_CLASSIFICATION_v1`）。**自動 backfill から除外**。 |
| **正常とみなすべきユーザー**（**snapshot が存在する側の条件を満たす購入等**） | **権利監査・返書ログ上の「保護対象」**。一括論理とは切り離す。 |
| **本番 DML が将来必要になったとき** | **別 PR・別レビュー・別承認**。**実行前後の読み取り監査、`ROLLBACK`/逆操作方針、対象 **`hashed_user_id` と条件式のみ**での突合**。 |

---

## 5. shadow 検証の扱い

- **構文または簡略スキーマで「更新が実行できる」だけ** を示した shadow 結果は **採用証拠にしない**。  
- **本番スキーマ、本番準拠データ量、RLS、関連テーブル整合、Stripe・運用状態** が **単一報告書で証明されていないもの** は **PROD READY 判定として不採用**。  
- 「VERIFIED」のラベルを **自動付与しない**。**人間レビューと SSOT が正本。**

---

## 6. 次に取るべき安全な方向（順序は運用により調整可）

1. **本章をリポジトリにコミット**し、`UNSAFE_ARCHIVE` と **一括論理適用禁止** を周知する。  
2. **shadow / staging** が **簡略テーブル主体**である場合は、**本番 `supabase/migrations` 相当の DDL を持つ環境** を別途準備する方針を **`M55_SUPABASE_NON_PROD_DB_STRATEGY_*`** と整合させる。**本稿は DDL を追加しない。**  
3. **`report_instance_id` の nullable のみ追加**など、**migration ラインで合意済みのフェーズ**に戻る場合があるが、**entitlements を bulk archive することとは独立した系統である。** 混線させない。

---

## 7. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | Gemini 案の一括 entitlements archived は正式 REJECT。 |
