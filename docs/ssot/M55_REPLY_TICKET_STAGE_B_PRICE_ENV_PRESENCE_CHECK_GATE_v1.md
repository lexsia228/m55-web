# M55 追加相談返書 — Stage B price env presence check ゲート（v1）

**文書種別:** 追加相談返書用 **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` の「有無」だけ**を確認するゲート SSOT  
**バージョン:** v1  
**前提:** [`M55_REPLY_TICKET_STAGE_B_OWNERSHIP_WALLET_DATA_SELECTION_RESULT_v1.md`](./M55_REPLY_TICKET_STAGE_B_OWNERSHIP_WALLET_DATA_SELECTION_RESULT_v1.md) — ownership / wallet 系 Stage B は **STOP**。**次は price env の有無のみ**が候補。

**本ファイル作成時:** `.env` や runtime を**読んでいない**。**値・secret は出力していない**。API・Stripe・DB・Dashboard／Vercel は**変更していない**。

---

## 1. このゲートの目的

| 項目 | 内容 |
|------|------|
| **確認するもの** | 環境内に **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` というキー**が論理的に存在し、運用側が「設定済み」と言える状態か（**真偽・有無のみ**）。 |
| **値** | **`price_*` の実値は SSOT・チャット・コンソール共有に載せない**（**出力しない**）。 |
| **secret** | **`STRIPE_SECRET_KEY`・Webhook signing secret・その他 KMS** の**値も見せない／出さない**。 |
| **Stripe API** | **呼ばない**（価格の妥当性確認はしない）。 |
| **Checkout URL** | **生成しない**。 |
| **実決済** | **しない**。 |

---

## 2. 確認対象

| 対象 | 内容 |
|------|------|
| **ローカル** | **`/.env.local`（またはチーム規約どおりのローカル env ファイル）に、キー行 `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` が「存在するか」**のみ。ファイルの **他行の値は読まない／貼らない**。 |
| **Vercel / 本番 env** | **本ゲート文書だけでは変更しない**。実確認は **別承認**のうえ、**読み取り専用の UI または社内規程どおりの方法**のみ（値は開示禁止）。 |
| **禁止参照** | `STRIPE_SECRET_KEY`・`STRIPE_WEBHOOK_SECRET`・類似鍵の**値の表示・コピペ**。 **`STRIPE_PRICE_*` の price id 文字列**の貼付。 |

---

## 3. 実施方法候補

**いずれも「値そのもの」を標準出力・ログ・SSOT に出さない。**

### 3.A ファイル上のキー有無（例: PowerShell）

- **ゴール:** `.*env*` 内に **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET=` を含む行があるか**（正規表現はキー名と `=` のみ）。
- **避けること:** **`Get-Content` をそのまま共有する**、`Select-String` の **`Line` に値が含まれる形で貼る**。
- **推奨イメージ:** 「**キー名がマッチした行数が 0 より大きいか**」だけを **boolean** でメモする（**行本文は貼らない**）。

### 3.B runtime の truthy（例: Node 一発）

- **ゴール:** `process.env.STRIPE_PRICE_ADDITIONAL_REPLY_TICKET` が **空でない文字列か** — **印字は `true`/`false` のみ**（`console.log` に env を渡さない）。
- **注意:** 実行は **ローカル**に限定し、**本番プロセスに接続して秘密をプリントしない**。

### 3.C 禁止に近いもの

- `stripe prices retrieve` 等 **Stripe CLI / API**。
- **Dashboard** で price id を開いて内容をスクショ共有。

これらは **§6 STOP** とするか、別ゲートでのみ許可する。

---

## 4. 記録してよいもの（結果 SSOT 用フィールド）

| フィールド | 例・意味 |
|------------|----------|
| `key_exists` | **true/false**（規約ファイル内にキー行の有無） |
| `runtime_env_present` | **true/false**（運用ビルド／ローカル起動コンテキストで truthy か—**値は書かない**） |
| `value_printed` | **false**（必ず false を維持） |
| `secret_exposed` | **no** |
| `timestamp` | 確認日時（UTC または明示 TZ） |

**オプション（値なし）:** `environment_label` に **local のみ** 等のラベルのみ。

---

## 5. 記録禁止

- **Stripe price id の実文字列**
- **Stripe secret / Webhook secret**
- **DB URL**
- **Clerk／Supabase service role／その他 KMS**
- **Cookie / Bearer / Authorization**

---

## 6. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **env の実値がターミナル・チャット・SSOT に出そうになる** |
| 2 | **Stripe API を叩く**ような確認に進む |
| 3 | **Checkout Session 作成／Checkout URL 取得**まで進む |
| 4 | **Vercel / Stripe Dashboard / 本番 env を無承認で変更**する |
| 5 | **実決済** |
| 6 | **商品棚 UI** を露出・変更する |
| 7 | **secret を貼る** |

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本ゲート文書の作成** | **GO** |
| **実確認（PowerShell / Node 等）** | **別承認** |
| **Checkout Session 作成** | **NO-GO** |
| **実決済 / 実 Webhook / DB 更新 smoke** | **NO-GO** |

---

## 実施後の結果 SSOT（任意）

`M55_REPLY_TICKET_STAGE_B_PRICE_ENV_PRESENCE_CHECK_RESULT_v1.md` 等に **§4 のフィールドのみ**を記載する。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・API・SQL・DB 更新・Stripe・Dashboard/env 変更・**env 値・secret の出力**・商品棚 UI 変更は行わない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STAGE_B_PRICE_ENV_PRESENCE_CHECK_GATE_v1*
