# DTR 購入・再開 E2E — 固定検証チェックリスト（次回以降）

**使い方:** 上から順に実施し、各項目に **日付・環境（例: local / preview）・実行者** を記録する。失敗時は [E2E_DTR_RECOVERY_RUNBOOK.md](./E2E_DTR_RECOVERY_RUNBOOK.md) を参照。

---

## 事前

- [ ] Stripe は **test mode** で実施（本番なら別チェックリスト）。
- [ ] **Purchased user** 用と **Clean user** 用で **アカウント（またはブラウザプロファイル）を分離**。
- [ ] `.env.local` の Clerk / Stripe / Supabase が対象環境と一致。

---

## A. Purchased user（再開・409）

- [ ] 保存版があるユーザーでサインイン。
- [ ] 再購入相当の操作で **`already_purchased`（409）** が返る、またはクライアントが **resume `/dtr/core`** に寄せる。
- [ ] **`/dtr/core`** で本文が表示される。
- [ ] **`GET /api/dtr/report-snapshot-ready`** → `hasPurchaseSnapshot: true` / `ready: true`。

---

## B. Clean user（初回購入）

- [ ] 未購入ユーザーでサインイン。
- [ ] 商品 LP から Checkout 開始 → **checkout API が 200**（Session 作成）。
- [ ] Stripe でテスト決済完了。
- [ ] **`/dtr/processing`** を経由（または想定フローどおり）。
- [ ] **`/dtr/core`** に到達し本文表示。
- [ ] **`GET /api/dtr/report-snapshot-ready`** → **`hasPurchaseSnapshot: true`** かつ **`ready: true`**。

---

## C. Owner 再入場（/my・/dtr）

- [ ] **`/my`** — 購入済みレポート一覧に **「開く」** があり、**`/dtr/core`** に遷移する。
- [ ] **`/dtr`** — 購入済みとして **レポートを開く** 導線で **`/dtr/core`** に遷移する。

---

## D. 回帰（壊れやすい境界）

- [ ] **未購入** — `/my`・`/dtr` で **購入導線**のみ（誤って core に入らない）。
- [ ] **購入済み・snapshot 未作成**（再現できる場合）— **「準備中」** 等、誤誘導がない。

---

## 完了記録（コピー用）

```
日付:
環境:
実行者:

A Purchased: PASS / FAIL — メモ:
B Clean:     PASS / FAIL — メモ:
C 再入場:    PASS / FAIL — メモ:
D 回帰:      PASS / FAIL — メモ:
```
