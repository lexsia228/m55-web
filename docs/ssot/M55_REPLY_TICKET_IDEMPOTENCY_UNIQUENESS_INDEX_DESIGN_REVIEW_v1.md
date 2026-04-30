# M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1

Status: **`stripe_processed_events.stripe_event_id` に対する unique／index 候補の設計レビュー SSOT（Webhook 本番前準備）。** **本条は DDL ドラフト作成・適用・実装変更の承認ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Preflight 観測結果:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_RESULT_v1.md`
- **Preflight パケット:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_PACKET_v1.md`
- **冪等性・一意性方針（正本の一部）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_IDEMPOTENCY_UNIQUENESS_DESIGN_REVIEW_v1.md`

**本条に環境固有のシークレット・DB URL・Webhook signing secret を記載しない。**

---

## 1. 前提（preflight に基づく判定材料）

本番 **`stripe_processed_events` は存在し、現在 **0 件**。**`stripe_event_id` は nullable**。**重複データなし**。**`stripe_event_id` 一意のインデックスは未有り**。

→ **unique／index の設計レビュー（本条）への進行は GO。** ただし **DB に UNIQUE を作成することは本条では NO-GO**（ドラフト DDL も本条では作成しない）。

---

## 2. 必須方針：二重防御

| レイヤー | 役割 |
|---------|------|
| **DB 制約** | 非NULLの **`stripe_event_id`（Stripe `event.id`）が二重 INSERT できないこと**を、将来の適用フェーズで **物理的に担保**。 |
| **アプリ側 idempotency** | トランザクション内での **処理済み照合／先行記録**、 **`event.id` 欠損時の処理禁止**、**既処理イベントの no-op** など。 |

**両方とも必要。** 一方だけでは運用ギャップが残りやすい。

---

## 3. Unique／index 候補（論点のみ・DDL は作らない）

| 区分 | 内容 |
|------|------|
| **候補 A** | **Full unique index** on `stripe_processed_events (stripe_event_id)`。PostgreSQL では **複数の NULL を許容**するため、nullable 列でも **FULL UNIQUE と呼ぶが実質は「値が載った行のみ一意」という誤解**を招きやすい点に注意。**NOT NULL とセットで論じないと意味がぶれる**ことがある。 |
| **候補 B（初回推奨）** | **Partial unique index** on **`stripe_processed_events (stripe_event_id) WHERE stripe_event_id IS NOT NULL`**。**非NULLの `event.id` の一意だけを明示**。NULL 行との整合はアプリ側で扱う。 |
| **候補 C** | **`stripe_event_id` を当面 NOT NULL 化しない**。**Webhook で `event.id` 欠損は STOP（処理しない）**。 |
| **候補 D** | **`stripe_event_id` を NOT NULL にする変更**は **別ゲート**（データ・バックフィル・アプリ送信経路が固まってから）。 |

---

## 4. 推奨案（本条の結論）

**初回適用フェーズでの推奨（設計レビュー上のデフォルト）:** **候補 B（partial unique index） + 候補 C（Webhook 側で `event.id` 必須・欠損 STOP）** とし、**候補 D（NOT NULL）は後続ゲート**。

---

## 5. 推奨理由

| 理由 | 説明 |
|------|------|
| nullable のまま | 現状カタログ上 **`stripe_event_id` は nullable**。NOT NULL と同時適用しない方針と整合する。 |
| **0 件開始** | 既存データがなく、partial unique は **競合なく設計レビュー可能**。 |
| NULL と一意 | **複数NULL**を許容しつつ、**非NULL の Stripe event id は一意に束ねる**。 |
| アプリ側 | **`event.id` が取れないイベントは処理禁止**とし、**DB 側の「取り込み」を不要な曖昧行にしない**。 |
| NOT NULL は分離 | 列値の必須化は **マイグレーション・アプリ送信・運用確認の別ゲート**に回す。 |

---

## 6. Webhook 本番前の必須条件（本条で固定するチェックリスト）

| # | 条件 |
|---|------|
| 1 | **`stripe_event_id` の非NULL値に対する一意性担保**を、適用フェーズで **物理化**すること（本条推奨は partial unique と整合）。 |
| 2 | **`stripe_processed_events` への先行記録**または**同等の冪等フロー**（同一 `event.id` の再処理で付与ロジックに入らない）。 |
| 3 | **既処理イベントは no-op**（副作用を繰り返さない）。 |
| 4 | **wallet 更新と ledger insert は一貫して同一トランザクションまたは等価な整合**（設計詳細は Fulfillment SSOT と PR で詰める）。 |
| 5 | **ledger なしで wallet のみ更新しない**。 |
| 6 | **上限 5 件（ビジネスルール）チェックと idempotency を両方**実施（どちらか一方に寄せない）。 |

---

## 7. STOP 条件（本番化しない／設計倒退とみなす）

| STOP |
|------|
| **unique／index なし**のまま **Webhook を本番化**する |
| **`event.id` 欠損を許容**して処理続行する |
| **`payment_intent_id` 単独**を **主キー／正本** のように扱う |
| **`checkout_session_id` だけ**で二重付与防止にする |
| **wallet だけ更新**して **ledger なし** |
| **`user_id` だけ**で付与を決める（Stripe／レポート紐付けなしでの安易な付与） |
| **`report_instance_id` なしで付与**する（本条の論点と Fulfillment SSOT と矛盾する運用は設計レビューで止める） |
| **Stripe test／live の混同** |
| **secret／署名鍵／環境情報の露出** |

---

## 8. 次の候補（順序は運用ゲートで確定）

1. **unique／index の DDL draft**（PR／レビュー専用。本条では作成しない）。
2. **静的監査**（SQL／アプリ両面）。
3. **shadow／staging での検証**。
4. **production preflight**（適用直前）。
5. **production apply gate**（承認付き）。
6. その後段で **Checkout API／Webhook の設計確定・実装**へ。

---

## 9. 現時点ゲート一覧

| ゲート | 判定 |
|--------|------|
| preflight 結果 SSOT | **GO**（`M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_RESULT_v1.md`） |
| **index／unique の設計レビュー（本条）** | **GO**（論点確定のみ） |
| **UNIQUE／partial UNIQUE の作成** | **NO-GO**（別承認・別 PR） |
| **Webhook／Checkout API 実装** | **NO-GO** |
| **Stripe Dashboard／商品棚 UI** | **NO-GO** |

---

## 10. CHANGELOG — v1

- 初版: preflight 結果を入力とした unique／partial unique 候補レビュー、推奨、Webhook 前提、STOP、次工程の整理。
