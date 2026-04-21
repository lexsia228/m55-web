# E2E 成功証跡要約 — DTR 購入・再開・再入場（2026-04-20 固定）

本書は、当時の E2E が **成功した事実** を再現可能な形で固定する。生ログの全文は環境依存のためリポジトリ外管理とし、ここでは **観測事象の要約** と **成功条件** のみを記す。

---

## 1. 成功ログ要約（観測された事象）

### 1.1 Purchased user — resume

- Checkout 経路で **`already_purchased`**（409）が返るケースを確認。
- クライアント／導線が **`/dtr/core`** へ再開（resume）することを確認。
- 意図: 保存版スナップショットが既に存在する購入済みユーザーは、新規 Checkout を発行せず閲覧へ誘導する。

### 1.2 Clean user — fresh purchase（初回購入）

- 初期状態が **`locked`**（未購入相当）であることを前提にフローを実施。
- **`fresh_purchase_stripe_session_create`** に相当する処理で Checkout Session が作成され、**checkout API が HTTP 200** を返すことを確認。
- Stripe で支払い完了（test mode 含む）。
- **`/dtr/processing`** を経て **`/dtr/core`**（本文閲覧）に到達。
- **`GET /api/dtr/report-snapshot-ready`** で  
  **`hasPurchaseSnapshot: true`** かつ **`ready: true`** を確認。

### 1.3 Owner 再入場（Phase 1 オーナー体験）

- **`/my`** から購入済みレポートとして **再入場**（「開く」→ `/dtr/core`）できる。
- **`/dtr`**（商品棚）からも **購入済み資産へ再入場**できる。

---

## 2. 成功条件（箇条書き・固定）

以下をすべて満たしたとき、当該 E2E を「成功」とみなす。

1. **Purchased user（保存版あり）**
   - 再購入抑止経路で **`already_purchased`** が観測される。
   - ユーザーは **`/dtr/core`** でレポート本文に到達できる（resume）。

2. **Clean user（初回購入）**
   - 未購入状態から Checkout Session 作成が成功し、**checkout が 200**。
   - Stripe 支払い完了後、**processing → core** の順で到達できる。
   - **`report-snapshot-ready`** で **`hasPurchaseSnapshot === true`** かつ **`ready === true`**。

3. **再入場（UI 経路）**
   - **`/my`** から購入済みレポートを開ける（`/dtr/core`）。
   - **`/dtr`** からも購入済みとして開ける（`/dtr/core`）。

4. **一貫性**
   - 「購入済みだが snapshot 未作成」の中間状態では、**誤って空の core に誘導しない**（LP / 準備中表示など、実装どおり）。

---

## 3. Purchased user / Clean user の使い分け（固定）

| 観点 | **Purchased user**（再開検証用） | **Clean user**（初回購入検証用） |
|------|-----------------------------------|-----------------------------------|
| **目的** | 409 / resume、**再閲覧**の回帰 | **locked → checkout → paid → processing → core** の縦割り |
| **前提アカウント** | 既に DTR Core を購入済みで、`dtr_report_snapshots` が存在するユーザー | 同一プロダクト未購入（または検証用の新規 Clerk ユーザー） |
| **主な確認 API** | `GET /api/purchase/checkout`（409 `already_purchased`）、`GET /api/dtr/report-snapshot-ready`（`ready: true`） | `POST/GET` checkout（**200**）、processing、**`report-snapshot-ready`** |
| **主な確認 UI** | `/dtr/core` 直リンク、**`/my`・`/dtr` から「開く」** | `/dtr/lp` → Stripe → `/dtr/processing` → `/dtr/core` |

**注意:** 同一ブラウザプロファイルで「クリーン」と「購入済み」を混在させると、Cookie / セッションで結果が汚れる。**アカウントまたはプロファイルを分ける**こと。

---

## 4. 関連ドキュメント

- **復旧:** [E2E_DTR_RECOVERY_RUNBOOK.md](./E2E_DTR_RECOVERY_RUNBOOK.md)
- **次回検証:** [E2E_DTR_VERIFICATION_CHECKLIST.md](./E2E_DTR_VERIFICATION_CHECKLIST.md)
