# Phase 5-6H-5J — Production no-login public UX visual check planning gate (2026-05-15)

## 1. Phase名

**Phase 5-6H-5J — Production no-login public UX visual check planning gate**

---

## 2. 現在地

| 項目 | 状態 |
|------|------|
| **ブランチ** | `work/home-cluster` |
| **PR #1** | **merged** |
| **`main` HEAD** | **`483285da9b5ef492bd8495fa404558b31d994705`** |
| **Vercel** | Project **m55-webv2** / Production **Ready / Current** |
| **5H** public GET/HEAD smoke | **`PRODUCTION_PUBLIC_SURFACE_READONLY_SMOKE_GREEN`** |
| **5I** evidence checkpoint | **`PRODUCTION_POST_DEPLOY_PUBLIC_SMOKE_EVIDENCE_CHECKPOINT_GREEN`** |
| **公開面** | **到達可能（5H 記録ベース）** |
| **ログイン / Checkout / payment / DB write** | **これまでのフェーズでも未実行** |

**直前 evidence commit（5J 本文書・SYSTEM_SSOT 更新直前）:** **`d34a7137a386e5d148ba122c4ca2e888f2be6d70`** — `docs: record production post-deploy public smoke checkpoint`

---

## 3. この Gate の目的

- **次フェーズ（5K）** で実施する **Production no-login public UX visual check** の **許容範囲・禁止・成功/失敗の目安** を **docs-only で固定**する。
- **本 5J ではブラウザ目視を実行しない。** **本番 URL の追加 `curl` もしない。**

---

## 4. 次フェーズ（5K）で許可予定の確認範囲案

**原則:** **ブラウザ目視のみ。** **ログイン不要・購入不要・フォーム送信不要・DB 書き込み不要**の **公開面**に限定。

### 4.1 候補 URL（Primary）

- `https://m55-web.vercel.app/`
- `https://m55-web.vercel.app/dtr/lp`
- `https://m55-web.vercel.app/legal/tokushoho`
- `https://m55-web.vercel.app/legal/privacy`
- `https://m55-web.vercel.app/legal/terms`
- `https://m55-web.vercel.app/legal/refund`
- `https://m55-web.vercel.app/support`

**補足:** **`/legal/disclaimer`** は **5G/5H/5I と同様、実装整合の観点から `/legal/refund` を正とし、無理に確認対象に入れない。**

---

## 5. 次フェーズ（5K）で見てよい項目

- **ページが通常表示されるか**
- **主要レイアウトが崩壊していないか**
- **DTR LP** に **価格・返金・サポート・法務導線**が **見えるか**
- **法務 / サポートページ**が **表示されるか**
- **公開表現ポリシー（Gate R 系）上の重大回帰**が **目視範囲でないか**
- **スマホ幅 / 通常幅**の目視は **可**。**操作はスクロール中心**。
- **リンク**は **法務 / サポート等の公開 GET 先**まで。**購入ボタンは見るだけ・押下禁止。**

---

## 6. 次フェーズ（5K）でも禁止する操作

- **ログイン**
- **無料鑑定フォーム送信**
- **DTR 生成**
- **購入ボタン押下**
- **Checkout 作成**
- **Stripe test/live payment**
- **webhook replay**
- **env / secret / `whsec` 変更**
- **DB 確認のための書き込み・DB 変更**（**5K では Production DB を触らない**）
- **`/api/*` の直接実行**
- **POST / PUT / PATCH / DELETE**
- **追加 deploy / redeploy**
- **Vercel / Supabase / Stripe 設定変更**
- **重大回帰を見つけてもその場でコード修正しない** — **まず `BLOCKED` として SSOT 記録し、別指示で修正 Gate**。

---

## 7. 成功条件案（5K で検証するとき）

- **対象公開ページ**が **ブラウザで表示できる**
- **Home / DTR LP / legal / support** に **重大な表示崩壊がない**
- **DTR LP** で **価格・返金・サポート・法務導線**が **確認できる**
- **購入・Checkout が発生していない**
- **ログイン・フォーム送信・DB 書き込みが発生していない**
- **Stripe 決済イベントが新規発生していない**

---

## 8. 失敗時の停止条件案（5K）

- **blank screen（真っ白・主要コンテンツが表示されない）**
- **hydration / runtime error が利用者視点で明瞭**
- **主要ページの表示崩壊**
- **DTR LP** の **価格・法務・サポート**導線 **欠落**
- **予期しない認証要求**
- **購入／Checkout に進んだ疑い**
- **DB / Stripe / API 副作用が発生した疑い**

→ **即停止・`BLOCKED` 記録**し、別 Gate へ。

---

## 9. 判定（Verdict）

**`READY_FOR_PRODUCTION_NO_LOGIN_PUBLIC_UX_VISUAL_CHECK_EXECUTION_GATE`**

**条件付き:** 実際の **ブラウザ目視**は **本 commit 後の別明示 GO** において **のみ**実施する。

---

## 10. 明確な未実行事項（本 5J / 本 docs セッション）

- **No browser visual check in 5J**
- **No additional curl**
- **No login**
- **No form submission**
- **No DTR generation**
- **No Checkout creation**
- **No Stripe test/live payment**
- **No Stripe webhook changes**
- **No webhook replay**
- **No env / `whsec` / secret changes**
- **No Supabase changes**
- **No Vercel setting changes**
- **No additional redeploy**
- **No POST / PUT / PATCH / DELETE**
- **No Production DB changes**

---

## 11. Next

- **Phase 5-6H-5K — Production no-login public UX visual check execution**
- **5K でも** **ログイン・Checkout・本番決済・webhook/env 変更・DB 書き込みは禁止**。
- **許可する場合は**、**ブラウザでの公開面目視・スクロール・法務/サポートの公開リンク確認だけ**を **別明示 GO** で実施する。

---

## Work anchor

- Branch `work/home-cluster`, baseline **`d34a7137a386e5d148ba122c4ca2e888f2be6d70`**（**5J 本文書・SYSTEM_SSOT 更新直前**）。

---

**記録宣言:** **5J は計画のみ**であり、**ブラウザ確認・追加 `curl`・決済・ログイン・webhook/env 変更は実施していない。**
