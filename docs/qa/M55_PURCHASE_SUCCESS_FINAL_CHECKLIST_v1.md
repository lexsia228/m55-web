# M55 Purchase Success — Final Checklist v1

**Status:** QA 正本（手動／Release 前確認用）  
**Date:** 2026-03-30  
**Route:** `/purchase/success`  
**Review 前提:** 実装コードは読み取り専用として検証する。期待動作は **現行実装 + 下記契約文書** の整合が取れていること。

---

## 参照契約（読み順）

1. [PURCHASE_STATE_AND_SUCCESS_UI_CONTRACT.md](../PURCHASE_STATE_AND_SUCCESS_UI_CONTRACT.md) — Success は **表示／ポーリングのみ**、fulfillment の真理源は Webhook + DB  
2. [post_purchase_alignment_ssot_2026_03_08.md](../ssot/post_purchase_alignment_ssot_2026_03_08.md) — 分岐・コピー・Support URL  
3. [M55_VISUAL_TOKEN_SPEC_v1.md](../ssot/M55_VISUAL_TOKEN_SPEC_v1.md) — 当画面の視覚トークン（`success.module.css` 参照実装）

---

## 実装との明示的差分（Review 用）

| 項目 | `post_purchase_alignment_ssot_2026_03_08` 表記 | 現行実装（2026-03-30） |
|------|-----------------------------------------------|-------------------------|
| entitlement 反映済み時 | 同文書「Success Page 表示分岐」表に「redirect `/dtr/core?post_purchase=1`」とある | **サーバ `redirect` は行わない**。同一 URL 上で報酬文＋**プライマリ CTA リンク**で `/dtr/core?post_purchase=1` へ誘導（audit 回帰ガード対象） |

**判定:** QA では **実装＋ audit_gate 回帰** を正とし、`post_purchase_alignment` 表の「redirect」行は **文言更新が未着手のドキュメント差分** として扱う（本チェックリストは実装準拠）。

---

## 前提条件

- [ ] テストユーザーで Clerk サインイン済み  
- [ ] one-time lane（`mode=payment`）の Checkout 完了フローにアクセスできる  
- [ ] `session_id` が URL クエリに付くリダイレクト先として `/purchase/success` が開ける  

---

## A. 認証・セッション

- [ ] 未ログインで `/purchase/success` にアクセス → **`/sign-in` へ誘導**（サーバ `redirect`）  
- [ ] ログイン済みで `session_id` あり → Stripe Session 再取得が **ユーザ ID・product・mode と整合** する場合のみ delayed 系フローへ  
- [ ] `session_id` が不正／不整合 → メッセージ「セッションを確認できませんでした…」＋ **recoveryRef（session_id）表示** ＋ サポートリンク  

---

## B. Entitlement 分岐（READ のみ）

- [ ] Supabase `entitlements` が **active** のとき → **Happy 文面**（アクセス有効の説明）＋ **QuietPolling なし**（`entitlementReady`）  
- [ ] **未反映** かつ session 検証成功 → **遅延文面** ＋ **QuietPolling 表示** ＋ recoveryRef（該当時）  
- [ ] DB エラー時 → フォールバックメッセージ＋サポート導線  

**禁止確認:** Success 画面の表示だけで「必ず付与済み」とユーザーに誤認させないコピーになっていないこと（契約の Forbidden に抵触しないこと）。

---

## C. UI・導線（固定要素）

- [ ] ルート要素に `data-testid="m55-purchase-success-main"`  
- [ ] 見出しに `data-testid="m55-purchase-success-headline"`  
- [ ] プライマリ CTA に `data-testid="m55-purchase-success-primary-cta"` かつ **`href` に `/dtr/core?post_purchase=1`**  
- [ ] セカンダリ: `/my` と **実 URL の `/support`**（プレースホルダ禁止。`APP_ORIGIN` / `NEXT_PUBLIC_APP_URL` / ヘッダ由来の構築）  

---

## D. ポーリング（遅延時のみ）

- [ ] **上限付き** の静かなポーリング（フロントのみで権限を捏造しない）  
- [ ] 長時間待機時はサポート誘導が破綻しない（契約の `delayed_confirmation` / `support_needed` 精神に合致）  

---

## E. 視覚（トークン）

- [ ] [M55_VISUAL_TOKEN_SPEC_v1.md](../ssot/M55_VISUAL_TOKEN_SPEC_v1.md) のアクセント・タイポ・CTO 階層と **著しく矛盾しない**（ページ内サーフェスのみにスタイルが閉じている）  
- [ ] `globals.css` で html/body 背景を侵食していない（NoTouch）  

---

## F. 回帰コマンド（任意）

リリース前に CI 相当:

- `node scripts/audit_gate.mjs`（既存ゲート）  
- `node scripts/run-sonnet-audit.js`（公開面語彙）  

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-30 | v1 初版。実装準拠で redirect / CTA 差分を明示。 |
