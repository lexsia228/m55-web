# M55 Live-Traffic E2E Verification Checklist
- Date: 2026-03-28
- Scope: Free → ¥1,000 Entry Report → purchaser-only concierge room
- Status: PENDING — not yet executed against live traffic

---

## A. Pre-purchase gate

| # | Path | Action | Expected |
|---|---|---|---|
| A-1 | `/dtr/core` — unauthenticated | アクセス | `/dtr/lp` へ redirect (302) |
| A-2 | `/dtr/core` — authenticated, no entitlement | アクセス | `/dtr/lp` へ redirect（locked state） |
| A-3 | `/dtr/core` — authenticated, entitlement `expires_at` 過去日 | アクセス | `/dtr/lp` へ redirect（expired state 表示） |
| A-4 | `/dtr/lp` — `state=expired` クエリ付き | 表示 | expired notice が表示される。purchase CTA が出る |
| A-5 | Room route — unauthenticated | アクセス | アクセス不可（redirect or 403） |
| A-6 | Room route — authenticated, no entitlement | アクセス | アクセス不可（redirect） |

---

## B. Purchase flow

| # | Path | Action | Expected |
|---|---|---|---|
| B-1 | `/dtr/lp` → Stripe Checkout | CTA クリック | Stripe Checkout ページが開く。SKU・金額（¥1,000）・商品名が正しい |
| B-2 | Checkout 完了（test mode） | カード入力 → complete | 指定 redirect 先（`/purchase/success` 等）に遷移する |
| B-3 | Webhook `checkout.session.completed` | Stripe CLI / Dashboard 確認 | webhook が受信され、`entitlement_rights` に行が insert される |
| B-4 | Entitlement 反映後に `/dtr/core` アクセス | 再アクセス | owned state で全文が表示される。locked/expired redirect が出ない |
| B-5 | `/my` 確認 | ページ表示 | 購入済みレポートが library に表示される。ownership 行が見える |

*(consult credit 初期値の確認は C-2 room アクセス後に行う)*

---

## C. Owned user — /dtr/core and room

| # | State | Action | Expected |
|---|---|---|---|
| C-1 | owned, credits 1/1 | `/dtr/core` 表示 | fullSections 全文表示。concierge room CTA が出る |
| C-2 | owned, credits 1/1 | room CTA クリック → room 表示 | room 表示、credits 1/1 が UI に反映。writable state（入力欄が有効） |
| C-3 | owned, credits 1/1 | メッセージ送信 | user message 保存 → AI response 受信 → credits が 0 に減算 |
| C-4 | owned, credits 0/1 | room アクセス | read-only state（入力欄が disabled または非表示）。credits 0/1 が表示。過去メッセージは読める |
| C-5 | owned, credits 0/1 | 送信試行 | ブロック。credits 消費なし。DB 行が insert されない |

---

## D. Consult credit edge cases

| # | Case | Expected |
|---|---|---|
| D-1 | メッセージ 10 文字未満 | ブロック。credits 消費なし |
| D-2 | メッセージ 500 文字超 | ブロック。credits 消費なし |
| D-3 | high-risk ワード含む | ブロック。credits 消費なし |
| D-4 | 正常送信中に double-submit | 2通目がブロックされる（sendLock または pending guard）。credits は 1 回分のみ消費 |
| D-5 | AI call 失敗（OpenAI タイムアウト等） | orphan user message は DB に残らない。credits 減算なし。UI はエラー表示（送信可能状態に戻る） |
| D-6 | credits 0 の状態で API を直接 POST | 400 または 403。credits 消費なし |

---

## E. Support / legal / refund links

| # | Link | Expected |
|---|---|---|
| E-1 | `/support` | 200、SiteFooter あり、shell なし |
| E-2 | `/legal/refund` | 200、返金ポリシー表示 |
| E-3 | `/legal/tokushoho` | 200、特定商取引法表示 |
| E-4 | `/legal/terms` | 200 |
| E-5 | `/legal/privacy` | 200 |
| E-6 | Home trust footer の各リンク | 上記と一致する destination に遷移 |

---

## F. Failure rollback cases

| # | Case | Expected |
|---|---|---|
| F-1 | Stripe Checkout を途中でキャンセル | entitlement が insert されない。`/dtr/core` は locked のまま |
| F-2 | Stripe Checkout 完了後に webhook 未到達 | *Ops recovery 確認事項*: 手動プロビジョニング手順が運用 doc に存在すること。E2E pass/fail 判定には含めない |
| F-3 | Webhook 重複配信（同一 event_id） | 冪等キー（event_id）で二重 grant されない |
| F-4 | `/api/room/core/send` で DB insert 失敗 | user message と AI message のアトミック insert が失敗した場合、credits 減算もロールバックまたは整合される |

---

## Pass criteria

以下をすべて満たせば **PASS**：

1. **Gate fail-closed**: A-1〜A-6 がすべて locked/expired/unauthenticated をアクセス不可に閉じる
2. **Entitlement 反映**: B-3 で webhook が到達し、B-4 で owned アクセスが成立する
3. **Credits 正確性**: C-3 で 1→0 に正確に減算。C-4/C-5 で 0 時に入力不可。C-2 で UI に初期値が表示される
4. **Input guard**: D-1〜D-6 でブロックケースが credits を消費しない。D-5 で AI 失敗時に orphan message が残らない
5. **Legal links**: E-1〜E-6 がすべて 200 で表示される
6. **Rollback safety**: F-1 で中断購入が entitlement を出さない。F-3 で冪等性が保たれる

## HOLD conditions

以下のいずれか1つでも該当すれば要対応（production traffic 増加前に解消）：

- locked/expired ユーザーが `/dtr/core` の本文を見られる
- credits 0 のユーザーが送信に成功する
- Checkout キャンセル後に entitlement が存在する
- double-submit でクレジットが 2 回消費される
- AI 失敗時に credits が減算される

---

## Ops recovery note (out of E2E pass/fail scope)

- F-2（webhook 未到達）は E2E の pass/fail 判定対象外
- 手動プロビジョニング手順が運用 doc に存在することを確認するにとどめる
- webhook 到達率の継続監視は別途 ops 運用として管理する
