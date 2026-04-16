\# M55 Reply Data Model and DB Contract v1



\## 1. 目的



返書システムに必要な永続化モデル、型、テーブル責務、整合性制約を固定する。  

本仕様は、`ReplySession`、`ReplyDocument`、`ReplyTicketWallet` を中心に、返書生成・保存・再閲覧・将来の消費接続を矛盾なく実装するための SSOT である。



\---



\## 2. 基本原則



\- DB 上の真実はサーバー側に置く。

\- UI は DB 契約の結果を表示するだけで、権利や残数の真実を保持しない。

\- `ReplySession` は「生成要求の単位」。

\- `ReplyDocument` は「生成結果の保存単位」。

\- `ReplyTicketWallet` は「返書残数の真実」。

\- `WalletLedger` は wallet 変動の監査台帳であり required とする。

\- `available\_count` は導出値を正とし、必要に応じて再計算可能でなければならない。

\- 二重生成、二重保存、二重消費を起こさない設計を優先する。



\---



\## 3. エンティティ一覧



本仕様で固定する主要エンティティは以下とする。



\- `ReplySession`

\- `ReplyDocument`

\- `ReplyTicketWallet`

\- `WalletLedger`

\- `AccessEntitlement`（参照先として必要最低限のみ）

\- `CoreProfileRef`（core 結果参照）



\---



\## 4. ReplySession



\## 4.1 役割

`ReplySession` は、1回の返書生成要求を表す。  

生成の冪等性、入力の記録、進行状態の管理に使う。



\### 4.2 最低フィールド



\- `id`

\- `user\_id`

\- `theme`

\- `input\_mode`

\- `selected\_subquestions\_json`

\- `free\_text`

\- `schema\_version`

\- `idempotency\_key`

\- `status`

\- `core\_profile\_ref`

\- `created\_at`

\- `updated\_at`


\## 4.3 型契約



\- `id`: string / UUID

\- `user\_id`: string

\- `theme`: string

\- `input\_mode`: string

\- `selected\_subquestions\_json`: json / jsonb

\- `free\_text`: text nullable

\- `schema\_version`: string

\- `idempotency\_key`: string

\- `status`: enum-like string

\- `core\_profile\_ref`: string nullable

\- `created\_at`: timestamp

\- `updated\_at`: timestamp


\## 4.4 status 許可値



\- `accepted`

\- `generating`

\- `succeeded`

\- `failed`

\- `cancelled`



\## 4.5 制約



\- `idempotency\_key` は user 単位で一意

\- `theme` は空文字不可

\- `schema\_version` は `"1.1"` 固定

\- `selected\_subquestions\_json` は array でなければならない

\- `succeeded` 状態の session に対して複数 document を作ってはならない

\- `ReplyDocument` との紐づきの正本は `ReplyDocument.reply\_session\_id` とする


\---



\## 5. ReplyDocument



\## 5.1 役割

`ReplyDocument` は、生成された返書 JSON 本体の保存単位である。  

再閲覧、履歴表示、将来の深掘り導線の土台になる。



\## 5.2 最低フィールド



\- `id`

\- `reply\_session\_id`

\- `user\_id`

\- `theme`

\- `payload\_json`

\- `version`

\- `generator\_version`

\- `created\_at`



\## 5.3 型契約



\- `id`: string / UUID

\- `reply\_session\_id`: string

\- `user\_id`: string

\- `theme`: string

\- `payload\_json`: json / jsonb

\- `version`: string

\- `generator\_version`: string nullable

\- `created\_at`: timestamp



\## 5.4 制約



\- `reply\_session\_id` は一意

\- `payload\_json` は `M55\_REPLY\_JSON\_SCHEMA\_v1.md` に完全準拠

\- `version` は payload 内の `version` と一致すること

\- 保存後の `payload\_json` は不変

\- `theme` は session 側の `theme` と一致すること


\---



\## 6. ReplyTicketWallet



\## 6.1 役割

`ReplyTicketWallet` は返書残数の真実を保持する。  

初回同梱分、追加購入分、消費済み本数を管理する。



\## 6.2 最低フィールド



\- `id`

\- `user\_id`

\- `initial\_included\_count`

\- `purchased\_count`

\- `consumed\_count`

\- `available\_count`

\- `status`

\- `created\_at`

\- `updated\_at`



\## 6.3 型契約



\- `id`: string / UUID

\- `user\_id`: string

\- `initial\_included\_count`: integer

\- `purchased\_count`: integer

\- `consumed\_count`: integer

\- `available\_count`: integer

\- `status`: string

\- `created\_at`: timestamp

\- `updated\_at`: timestamp



\## 6.4 status 許可値



\- `active`

\- `suspended`

\- `closed`



\## 6.5 制約



\- `user\_id` は一意

\- すべての count は 0 以上

\- `available\_count = initial\_included\_count + purchased\_count - consumed\_count`

\- `available\_count` は負になってはならない

\- `suspended` 状態では消費を開始してはならない



注記:  

`available\_count` は導出値を正とする。DB に保存する場合も、再計算・再同期可能でなければならない。



\---



\## 7. WalletLedger



\## 7.1 役割

`WalletLedger` は wallet 変動の完全監査台帳。  

加算、減算、補填、調整、復旧の出所を追跡する。



\## 7.2 最低フィールド



\- `id`

\- `user\_id`

\- `wallet\_id`

\- `reply\_session\_id`

\- `delta`

\- `balance\_after`

\- `event\_type`

\- `source\_of\_grant`

\- `created\_at`



\## 7.3 型契約



\- `id`: string / UUID

\- `user\_id`: string

\- `wallet\_id`: string

\- `reply\_session\_id`: string nullable

\- `delta`: integer

\- `balance\_after`: integer

\- `event\_type`: string

\- `source\_of\_grant`: string nullable

\- `created\_at`: timestamp



\## 7.4 event\_type 許可値



\- `included\_grant`

\- `purchase\_grant`

\- `reply\_consume`

\- `recovery\_adjust`

\- `admin\_adjust`



\## 7.5 source\_of\_grant 許可値



\- `PURCHASE`

\- `INCLUDED`

\- `RECOVERY`

\- `ADMIN\_ADJUST`



\## 7.6 制約



\- `balance\_after` は 0 以上

\- `reply\_consume` のとき `delta` は負

\- grant 系のとき `delta` は正

\- `reply\_session\_id` は `reply\_consume` イベント時に必須とする



\---



\## 8. AccessEntitlement（参照契約）



`AccessEntitlement` は詳細実装を別 SSOT に委ねるが、少なくとも以下を満たす。



\- `user\_id`

\- `can\_view\_core`

\- `can\_view\_paid\_reading`

\- `can\_generate\_reply`

\- `status`

\- `updated\_at`



`POST /api/reply/generate` は、wallet だけでなく `can\_generate\_reply` も参照する。



\---



\## 9. CoreProfileRef（参照契約）



返書生成は core 結果を前提にするため、session は少なくとも以下のどちらかで core を参照できること。



\- `core\_profile\_ref` を保持

\- 生成時点の core snapshot id を保持



目的は、後から「どの輪郭を土台に返書が生成されたか」を追えるようにすること。



\---



\## 10. テーブル間関係



\- 1 user : 1 wallet

\- 1 user : many reply\_sessions

\- 1 reply\_session : 0 or 1 reply\_document

\- 1 wallet : many wallet\_ledger rows

\- 1 reply\_session : 0 or many ledger references（通常は 1 consume）



\---



\## 11. 推奨インデックス



最低限、以下を推奨する。



\### ReplySession

\- unique(`user\_id`, `idempotency\_key`)

\- index(`user\_id`, `created\_at desc`)

\- index(`status`)



\### ReplyDocument

\- unique(`reply\_session\_id`)

\- index(`user\_id`, `created\_at desc`)

\- index(`theme`)



\### ReplyTicketWallet

\- unique(`user\_id`)

\- index(`status`)



\### WalletLedger

\- index(`wallet\_id`, `created\_at desc`)

\- index(`user\_id`, `created\_at desc`)

\- index(`reply\_session\_id`)



\---



\## 12. DB 不変条件の担保



可能なら DB 制約または migration レベルで以下を担保する。



\- count 系 >= 0

\- `available\_count >= 0`

\- `reply\_session\_id` unique on `ReplyDocument`

\- `schema\_version` not null

\- `idempotency\_key` not null

\- required string fields の空文字禁止はアプリ層 + DB check の二段で防ぐ
- `version` not null on `ReplyDocument`



\---



\## 13. transaction 境界



本実装時、以下は同一 transaction 内で扱う。



\- wallet row lock 取得

\- wallet 再確認

\- ReplyDocument 保存

\- wallet 減算

\- WalletLedger 記録

\- ReplySession 完了更新



LLM 呼び出し自体は transaction 外で行う。  

長時間ロックを避けるためである。



\---



\## 14. Failure / Recovery 契約



\### 14.1 保存失敗

\- `ReplyDocument` 保存失敗時は consume 不成立

\- wallet 減算をしてはならない



\### 14.2 減算失敗

\- wallet 減算失敗時は `ReplyDocument` 保存も rollback

\- ledger を残してはならない



\### 14.3 整合性不一致

\- wallet と ledger が不一致なら `suspended` へ遷移可能

\- 復旧時は `RECOVERY` または `ADMIN\_ADJUST` で補正

\- 補正は必ず ledger と audit に残す



\---



\## 15. TypeScript 型の方針



永続化モデルとアプリ内 DTO は分離する。



\- DB model: storage 最適化

\- API response DTO: public contract 最適化

\- LLM payload DTO: `M55\_REPLY\_JSON\_SCHEMA\_v1.md` に準拠



最低でも以下の型を持つ。



\- `ReplySessionRecord`

\- `ReplyDocumentRecord`

\- `ReplyTicketWalletRecord`

\- `WalletLedgerRecord`

\- `ReplyGenerateRequest`

\- `ReplyGenerateResponse`



\---



\## 16. この文書でまだ確定しないもの



\- 実際の ORM 実装詳細

\- DB 製品固有の column type 最終値

\- enum の最終実装方式

\- CoreProfile snapshot の最終保存形式

\- retention policy

\- partitioning / archive policy



これらは別 SSOT または実装段階で固定し、本仕様ではデータモデルと DB 契約の骨格のみを固定する。

