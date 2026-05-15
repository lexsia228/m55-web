# M55 追加相談返書 — DB alignment 確認結果 SSOT（v1）

**文書種別:** **ローカル `.env.local` の Supabase 接続先**と **Supabase SQL Editor 側の URL / project** の一致を **人間確認**した結果の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**実行パケット:** [`M55_REPLY_TICKET_DB_ALIGNMENT_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_DB_ALIGNMENT_EXECUTION_PACKET_v1.md)  
**親ゲート:** [`M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md`](./M55_REPLY_TICKET_DB_ALIGNMENT_WEBHOOK_FORWARDING_GATE_v1.md)

**記録ポリシー:** **Supabase URL 全文・DB URL 全文・anon / service role key・secret** は本文に **含めない**。**`report_instance_id` 実値は記載しない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **確認方法** | **人間確認**により、**local `.env.local` の Supabase URL** と **Supabase SQL Editor 側に表示される URL / project** が **一致していること**を確認した。 |
| **値の取り扱い** | **接続文字列・ref・キー類は出力していない**。 |
| **SQL** | **実行していない**。 |
| **DB 更新** | **なし**。 |
| **追加決済 / webhook 再送 / Stripe CLI** | **未実施**。 |
| **商品棚 UI** | **触っていない**。 |

---

## 2. 確認結果

| フィールド | 値 |
|------------|-----|
| **`local_supabase_url_present`** | **true** |
| **`local_supabase_project_ref_matches_sql_editor`** | **true** |
| **`sql_editor_project_name_confirmed`** | **true** |
| **`sql_editor_project_is_m55_soul_core`** | **true** |
| **`sql_editor_project_is_m55_soul_shadow`** | **false** |
| **`target_report_same_as_checkout_test`** | **unknown** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

※ **`sql_editor_project_is_m55_soul_core` / `_shadow`:** Dashboard の表示名・ラベルが紛らわしい場合は **`unknown`** とし、別結果 SSOT で更新する。本記録は **確認できた範囲で core ／ not shadow** と判断した場合の値。  
※ **`target_report_same_as_checkout_test`:** **`report_instance_id` を本文に書かず**に同一性だけ確認した場合は **true** とできるが、**本セッションでは未再確認なら `unknown`** とする — **本ファイルでは `unknown`**（pre baseline SQL の **target 未束縛**経路との整合）。

---

## 3. 判定

| 観点 | 結論 |
|------|------|
| **DB alignment** | **PASS 候補** — **ローカルアプリと SQL Editor が同一 Supabase project を向いている**旨が確認できた。 |
| **core / shadow の単純不一致** | **相対的に低可能性**（同一 URL / project で照合済みのため）。 |
| **前回 post baseline が無効だった主因（推定）** | **core と shadow の取り違えより**、**SQL 手順違い・`target_report_instance_id` 未束縛（params が NULL のまま実行）・実行した SQL の取り違い**の **可能性が高い**と記録する。 |
| **Webhook fulfillment** | **成功・失敗はまだ判定しない**。 |

---

## 4. 次の候補

1. **webhook forwarding setup / check packet**（親ゲートに準拠）。  
2. **正しい webhook 受信エンドポイント:** **`/api/stripe/webhook`**。**`/api/webhooks/stripe` ではない**（実装の単一正と照合すること）。  
3. **Stripe CLI・webhook secret** は **別ゲート / 別パケット**で扱い、**秘密は記録しない**。  
4. alignment 済みのうえ、**同一 target を束縛した post fulfillment baseline** を **別承認**で再実行する。

---

## 5. 引き続き NO-GO

- **追加決済**
- **duplicate replay**
- **webhook 再送**
- **DB 手動 UPDATE**
- **商品棚 UI** の公開・変更
- **Vercel env 変更**
- **secret / DB URL / key / session id / event id の出力**

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL 実行・DB 更新・Stripe CLI・webhook 再送・追加決済・秘密出力・商品棚 UI 操作は **実施していない**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DB_ALIGNMENT_RESULT_v1*
