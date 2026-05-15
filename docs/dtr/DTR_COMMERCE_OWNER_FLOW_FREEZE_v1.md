# DTR Commerce / Owner Flow — 凍結宣言（v1）

**状態:** 本ドキュメント時点で **DTR 側の商流・オーナー体験はここで凍結** とする。  
**コード:** 本ファイルの作成・更新のみ（アプリ本体の変更は行わない）。

---

## 1. 完了条件（DTR 側の「できている」定義）

以下を満たしたとき、当該スナップショットを **DTR 完了** とみなす。

### 1.1 購入・決済・権利

- **Fresh purchase:** 未購入 → Checkout → 支払い → processing 経由で **保存版（snapshot）生成** まで到達できる。
- **Purchased resume:** 既購入ユーザーは **`already_purchased` 等の内部コードを画面に出さず**、**再閲覧（`/dtr/core`）** に誘導できる。
- **Gate / ownership:** `resolveEntryReportOwnership` と `dtr_report_snapshots` を **SSOT** とした失敗閉鎖が維持されている。

### 1.2 オーナー再入場

- **`/my`（マイハブ）:** 購入済みレポートの **再開（開く）** と、カタログ・ヘルプ導線が機能する。
- **`/dtr`（棚）:** メインカードとカタログストリップが **所有状態** と整合する。
- **`/dtr/lp`（商品ページ）:** **purchased / pending / clean** に応じた CTA 出し分けが機能し、内部コードを表示しない。

### 1.3 証跡・運用

- 成功証跡・runbook・チェックリストは **`docs/evidence/`** を正本とする（既存）。

---

## 2. 今後 DTR 側で壊してはいけない要点（箇条書き）

- **`dtr_report_snapshots`** を「本文があるか」の根拠から外さない（再開の事実上の SSOT）。
- **`resolveEntryReportOwnership`** の意味（owned / locked / expired）を、UI だけ変えて **矛盾する結果** にしない。
- **`GET /api/dtr/report-snapshot-ready`** の `ready` / `hasPurchaseSnapshot` / `hasOwnership` の契約を、フロントだけで **逆の表示** にしない。
- **`GET /api/me/entitlements`** と snapshot API の **組み合わせ**（`/my`・カタログ）は、片方だけの変更で **「開く」が誤表示** にならないようにする。
- Checkout **`/api/purchase/checkout`** の **409 / 200 / resume** の意味を、画面に **生のコード名** で出さない（文言は人間向けに統一）。
- **`/dtr/core`:** snapshot なしで本文を出さない（**LP 等リダイレクト**の方針を崩さない）。
- **Owner 導線:** `/my` → `/dtr/core`、棚・LP の **購入済み「開く」** は **1 クリックで誤誘導しない**（準備中は準備中）。
- **`lib/m55/dtrProductCatalog.ts`:** 商品棚の **SSOT** を、別ファイルに **二重定義** して食い違わせない（追加時はここを拡張する）。
- **Public シェル:** `PublicHeader` / `PublicFooter` の **レポート・`/dtr` 導線** を、意図せず削除しない。

---

## 3. DTR 側の変更禁止ライン（明示）

以下は **DTR 凍結中は原則変更しない**。どうしても必要な場合は **別途「凍結解除」または「スコープ限定の承認」** を前提とする。

| 領域 | 禁止の例 |
|------|-----------|
| **Checkout / Webhook / Fulfillment** | `checkout` 処理の 200/409 意味の変更、二重課金リスクのある変更。 |
| **Processing ページ** | 決済後フロー完了条件の変更（モバイル・遅延 Webhook 前提）。 |
| **Gate 本体** | `dtrOwnershipGate` の **判定ロジック** の緩和・締め（fail-closed の破壊）。 |
| **DB スキーマ（DTR 関連）** | `dtr_report_snapshots` / entitlements / rights の **意味を変える** マイグレーション。 |
| **コア Reader ゲート** | `/dtr/core` の **認可・snapshot 必須** の方針。 |

**UI・文言・導線** は「全面リデザインで一括破壊」しない限り、**バグ修正・A/B 微調整** は将来可能だが、**上表と「壊してはいけない要点」に抵触しないこと**。

---

## 4. 次フェーズの定義（Home / public first-view）

**次フェーズの主対象は DTR ではない。**

- **名称:** **Home / public first-view フェーズ**
- **目的:** 初見ユーザーが **トップ・公開ランディング** で迷わず価値と次の一歩を理解できること（DTR の詳細は二次）。
- **想定スコープ例:** `/home`、公開ヒーロー・ファーストビュー、必要なら **共有ヘッダー/フッター** の情報設計（**DTR 商流のロジックは触らない**）。

---

## 5. no-touch 解除が必要であることの明記

- **`m55-home-no-touch`** により **`/home` 関連ファイルは凍結** とされている。  
  **Home / public first-view フェーズ** で `/home` や `components/home/**` を編集する場合は、  
  **ルール上「ユーザーによる no-touch 解除（または例外の明示）」が必要**である。
- 本ドキュメントの **DTR 凍結** と **Home no-touch** は別軸だが、**次フェーズで Home を触る場合は両方を意識する**こと。

---

## 6. 関連ドキュメント

| パス | 内容 |
|------|------|
| `docs/evidence/README.md` | E2E 証跡インデックス |
| `docs/evidence/E2E_DTR_RECOVERY_RUNBOOK.md` | 障害時の観測ポイント |
| `docs/evidence/E2E_DTR_VERIFICATION_CHECKLIST.md` | 再検証チェックリスト |
| `.cursor/rules/m55-home-no-touch.mdc` | Home 凍結ルール（解除要） |

---

*最終更新: 凍結宣言 v1（リポジトリに固定）*
