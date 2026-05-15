# M55 追加相談返書 — DB alignment 実行パケット（v1）

**文書種別:** **ローカルアプリの Supabase 接続先**と **SQL Editor で選択している project / DB** が一致しているかを **人手で確認**する手順・記録規約の SSOT  
**バージョン:** v1  

**親ゲート:** [`M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md`](./M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md)  
**コンテキスト:** [`M55_REPLY_TICKET_TEST_PAYMENT_RETURN_WEBHOOK_NOT_VERIFIED_RESULT_v1.md`](./M55_REPLY_TICKET_TEST_PAYMENT_RETURN_WEBHOOK_NOT_VERIFIED_RESULT_v1.md)

---

## 1. 実施対象

| 対象 | 内容 |
|------|------|
| **ローカル `.env.local`** | **Supabase 接続先**が設定されているか・どの project を指すかを **オペレータが把握する**（**値そのものは SSOT に書かない**）。 |
| **Supabase SQL Editor** | **いま選択されている Supabase project** が **ローカルアプリと同じか**。 |
| **環境取り違え** | **`m55-soul-core`** と **`m55-soul-shadow`** を **混同していないか**。 |
| **baseline / Checkout と target** | **`report_instance_id`** が **pre baseline・Checkout テスト・（無効だった）post baseline 試行で意図した対象と同一か** — **照合はオペレータ内**、**値は出力しない**。 |

---

## 2. 確認方法

| ステップ | 方針 |
|----------|------|
| **1. `.env.local`** | **Supabase URL が「存在する」か**を確認する記録は **boolean のみ**（**URL 全文は記録・チャットに貼らない**）。 |
| **2. project ref** | ref を **画面と画面で照合**する。**SSOT には `true` / `false` / `unknown` のみ** — **ref の全文・URL 全文は書かない**。 |
| **3. SQL Editor** | ダッシュボードで **現在の project 名・表示**を **人間が確認**する。 |
| **4. DB 名のみに依存しない** | **`current_database()` の結果だけ**では **同一 project 証明としない**（別 project で同名 DB の可能性を考慮）。 |
| **5. Dashboard と env の突き合わせ** | **Supabase Dashboard 上部**の **project 名 / URL 表示 / ref** と **ローカル env の接続先**を **人間が同一だと言えるまで**照合する。 |
| **6. 秘密情報** | **raw DB URL・anon key・service role key** は **ターミナル出力・SSOT・チャットに出さない**。 |

---

## 3. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`local_supabase_url_present`** | **true / false** |
| **`local_supabase_project_ref_matches_sql_editor`** | **true / false / unknown** |
| **`sql_editor_project_name_confirmed`** | **true / false** |
| **`sql_editor_project_is_m55_soul_core`** | **true / false / unknown** |
| **`sql_editor_project_is_m55_soul_shadow`** | **true / false / unknown** |
| **`target_report_same_as_checkout_test`** | **true / false / unknown** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

※ **`sql_editor_project_is_m55_soul_core`** と **`sql_editor_project_is_m55_soul_shadow`** は **両方 true になり得ない**。**命名が揺れる場合は `unknown` とし**、別途運用ラベルで控える。

---

## 4. 記録禁止

- **Supabase URL 全文**
- **anon key**
- **service role key**
- **DB URL**（接続文字列の全文）
- **raw `user_id`**
- **`report_instance_id` を不用意にチャットへ貼ること**
- **cookie / token / Authorization**
- **Stripe secret**
- **Webhook secret**
- **Checkout URL 全文**
- **session id 全文**
- **dev log 全文**

---

## 5. STOP 条件

以下に該当したら **中断**し、結果 SSOT に **未完了理由（機微なし）**のみ残す。

- **Supabase secret** を出しそうになる
- **DB URL 全文**を出しそうになる
- **意図した project** と **SQL Editor の project** が **core / shadow のいずれとも整合しない**、または **不一致が判明**した
- **target report** が **Checkout / pre baseline と同一ではない**と判明した
- **SQL Editor と local app の接続先**が **不明のまま**（**unknown が解消できない**）
- **DB 手動 UPDATE** で整合を **ねつ造**しようとする
- **追加決済**をしようとする
- **webhook 再送**へ進もうとする
- **duplicate replay** へ進もうとする
- **商品棚 UI** へ進もうとする

---

## 6. 現時点の判定

| 項目 | 判定 |
|------|------|
| **DB alignment execution packet（本文書の作成）** | **GO** |
| **実 alignment 確認** | **別承認**（オペレータが Dashboard / env を開く） |
| **SQL 実行**（本パケットの範囲では） | **NO-GO** — alignment は **画面・env の照合が主** |
| **webhook forwarding 確認** | **次ゲート**（別パケット） |
| **webhook 再送** | **NO-GO** |
| **追加決済** | **NO-GO** |

---

## 後続（alignment PASS 後）

- [`M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md`](./M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md) の **webhook forwarding** パケット  
- **正しい DB / target** での **post fulfillment baseline 再実行**（別承認）  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**SQL 実行なし**。**DB 更新なし**。**Stripe CLI 未起動**。**webhook 再送なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DB_ALIGNMENT_EXECUTION_PACKET_v1*
