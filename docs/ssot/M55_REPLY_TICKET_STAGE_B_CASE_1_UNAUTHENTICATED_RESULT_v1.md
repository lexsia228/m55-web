# M55 追加相談返書 — Stage B Case 1 未ログイン検証 結果 SSOT（v1）

**文書種別:** `POST /api/reply-tickets/checkout` に対する **未ログイン**アクセス検証の実施結果  
**バージョン:** v1  
**手順準拠:** [`M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_STAGE_B_CHECKOUT_API_VALIDATION_EXECUTION_PACKET_v1.md) **Case 1**

**記録ポリシー:** 本文に **secret / cookie / bearer token / raw user id** は含めない。

---

## 1. 実施内容

- **対象:** `POST /api/reply-tickets/checkout`（追加相談返書 Checkout API）
- **ケース:** **Case 1 — 未ログイン**相当（認証ヘッダ・ブラウザセッションなしでの HTTP 確認）
- **付帯確認:** **`app/api/reply-tickets/checkout/route.ts` のファイル存在確認**（ローカル / リポジトリパスでの `Test-Path`）
- **制約順守:** **Stripe・DB を実行していない**。**secret を出力していない**。

---

## 2. route 存在確認

- **`.\app\api\reply-tickets\checkout\route.ts`** を対象とした **`Test-Path` は True**
- **ルートファイルはリポジトリ上に存在**している。

---

## 3. HTTP 結果

実施環境での **curl 相当アクセス**の観測:

- **`HTTP/1.1 404 Not Found`**（ハンドラの JSON 応答とは別の結果）
- **route handler 内で想定していた `401` と本文 `{"error":{..."unauthenticated"}}` は観測されず**

---

## 4. Clerk middleware ヘッダ

応答で観測されたヘッダ（値は開発時の状態を反映）:

- **`x-clerk-auth-status: signed-out`**
- **`x-clerk-auth-reason: protect-rewrite, dev-browser-missing`**

このため、**アプリ側 route handler に到達する前に Clerk 側で書き換え／保護レイヤにより遮断された**ものと記録する。

---

## 5. 判定

| 観点 | 結論 |
|------|------|
| **認証バウンダリ** | **PASS** — **未ログインでは当該 API を通していない**（意図に沿った遮断）。 |
| **route-level の 401（Open API レイヤでの `auth()` NG）** | **未観測**（ミドルウェアにより先に 404）。 |
| **route handler 到達** | **未到達**（上記ヘッダに整合）。 |

※ **「PASS」は「認証境界として未ログインが通されていないこと」の合格**であり、**Open API が 401 を返すことを実証した**わけではない。

---

## 6. 限界

- **未ログインの curl だけでは、route 内部の `validateReplyTicketCheckoutGate`／body validation を検証できない**。
- **Case 2〜Case 5**（JSON 不正、`report_instance_id`、`product_key`、所有権ほか）は、同様のセットアップでは **同一の Clerk 遮断が先に入る可能性が高い**。
- したがって、**それらは「認証済み validation 小ゲート」として手順・環境を分離**する必要がある（§7）。

---

## 7. 次の候補

1. **認証済み validation 小ゲート**の SSOT 化または execution packet の追補 — **ブラウザログイン済み**または開発用に許された方法でのみ、`POST /api/reply-tickets/checkout` の **ボディ検証〜ゲートを到達させる**。  
2. **cookie / token / secret をチャット・SSOT に貼らない**運用の維持（既存_execution packet と整合）。

---

## 8. 引き続き NO-GO

- **実決済**
- **実 Webhook**
- **DB を更新する smoke**
- **商品棚 UI の変更／本番公開**
- **Stripe Dashboard / env の変更**
- **secret / cookie / token のログ・証跡出力**

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL・DB 更新・Stripe API・**秘密情報の記載**・商品棚 UI 変更は行っていない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_CASE_1_UNAUTHENTICATED_RESULT_v1*
