# M55 Recovery Bundle Checklist — 20260330

**誰向け:** リポジトリオーナー・運用担当（エンジニアでなくても追えるよう平易に記載）  
**目的:** 障害・端末紛失・ブランチ混乱のあとでも、**2026-03-30 baseline** の状態に戻す／同じ状態だったことを証明できるようにする。

**正本との関係:** green の定義は [../ssot/M55_BASELINE_FREEZE_20260330.md](../ssot/M55_BASELINE_FREEZE_20260330.md)。本チェックリストは **その状態を「束ねて保管する」手順** です。

**手順の詳細（いつ・どう取るか）:** [M55_BASELINE_CAPTURE_RUNBOOK_20260330.md](./M55_BASELINE_CAPTURE_RUNBOOK_20260330.md)

---

## 保存する実体物一覧（オーナー向け・最終確認）

次の **7 種類** を、あらかじめ決めた **1 か所のバンドルフォルダ** にまとめると、Recovery Bundle として完成です。

| # | 実体物 | 中身の例 |
|---|--------|----------|
| 1 | **Git タグ** | リモートに push 済みのタグ名 + SHA メモ（`tag.txt`） |
| 2 | **リポジトリ ZIP** | baseline コミット時点のソース一式 |
| 3 | **SSOT 監査 JSON** | public 用・reserve 用の 2 ファイル（`violations` 空） |
| 4 | **ローカル監査ログ**（推奨） | `npm run audit` / `npm run lint:ssot` の結果テキスト |
| 5 | **CI 緑の証跡** | Actions のスクリーンショットと／または実行 URL 一覧 |
| 6 | **主要画面スクリーンショット** | runbook「5. 取得対象」の一覧どおり |
| 7 | **復元手順** | runbook「7. 復元時の手順」の写し、または印刷 |

---

## 事前に決めること（1 回でよい）

1. **Baseline コミット**  
   - 「この時点が green だった」と決めた **Git コミットの SHA** をメモする（例: `abc1234…`）。  
   - 可能なら **その場でタグを付ける**（次節）。

2. **保管場所**  
   - 社内の安全なストレージ（共有ドライブ、パスワード付き ZIP 置き場など）を 1 つ決める。

---

## チェックリスト（束ねるもの）

### 1. Git タグ

- [ ] リポジトリで baseline コミットに **軽量タグ** を付けた  
  - **推奨タグ名の例:** `m55-baseline-2026-03-30`  
  - **コマンド例:** `git tag m55-baseline-2026-03-30 <コミットSHA>` のあと `git push origin m55-baseline-2026-03-30`  
- [ ] タグ名と SHA を、社内メモまたは本ファイルのコピーに **書き留めた**

### 2. リポジトリの ZIP（オフライン用）

- [ ] baseline コミット時点のソースを **ZIP でエクスポート** した（GitHub の「Download ZIP」でも、ローカルで `git archive` でも可）  
- [ ] ZIP のファイル名に **日付と SHA の一部** を入れた（例: `m55-repo-20260330-abc1234.zip`）  
- [ ] 上記ストレージに保存した

### 3. 監査コマンドの出力（audit outputs）

baseline コミットを checkout した状態で、結果をファイルに保存する。

- [ ] `node scripts/run-sonnet-audit.js` の **標準出力全体**（JSON）を `evidence/ssot-public-20260330.json` のような名前で保存  
- [ ] `node scripts/run-sonnet-audit.js --reserve-scan` も同様に保存（例: `evidence/ssot-reserve-20260330.json`）  
- [ ] 両方とも **`"violations": []`** であることを目視で確認した  
- [ ] `npm run audit` を実行し、**終了コード 0** であることをメモした（ログをテキストで残してもよい）  
- [ ] `npm run lint:ssot` も **終了コード 0** で、ログを残した

※ `evidence/` フォルダはリポジトリにコミットするかどうかは組織の方針でよい。**必ずどこか安全な場所にコピー**を残す。

### 4. CI が通った証跡（CI pass evidence）

- [ ] GitHub（または使用中の CI）で、**baseline コミットに対応するワークフロー実行**を開いた  
- [ ] 次が **すべて成功（緑）** だったことを確認した  
  - 少なくとも: `ssot-audit.yml`、`audit.yml`  
  - リポジトリに他の workflow がある場合は **そのコミットで動いたものすべて**  
- [ ] 画面の **スクリーンショット**、または **実行 URL の一覧** をメモに貼った（後から「あの実行」と特定できるようにする）

### 5. 主要ルートのスクリーンショット（key route screenshots）

ブラウザで **本番またはステージング**（どちらで撮ったか明記）を撮影する。

- [ ] `/` またはシェルホーム（実際にユーザーが land する画面）  
- [ ] `/support`  
- [ ] `/purchase/success`（テスト決済で到達できる環境なら）  
- [ ] `/legal/terms` など法務 1 ページ  
- [ ] ファイル名に日付を入れる（例: `home-20260330.png`）

### 6. 復元手順メモ（restore steps）

新しいマシンでも順にできるよう、**短い手順書**を同じフォルダに置く。

- [ ] 「タグを checkout する」手順を書いた  
  - 例: `git fetch --tags` → `git checkout m55-baseline-2026-03-30`  
- [ ] `npm ci` を実行する、と書いた  
- [ ] 本 baseline の green 条件どおり、次を実行して **すべて成功** すると書いた  
  - `npm run audit`  
  - `npm run lint:ssot`  
  - `node scripts/run-sonnet-audit.js`  
  - `node scripts/run-sonnet-audit.js --reserve-scan`  
- [ ] （任意）`npm run build` を実行して成功すると書いた

---

## 復元したあとにやる確認（最低限）

1. タグ（または ZIP）の中の `docs/ssot/M55_BASELINE_FREEZE_20260330.md` が存在する。  
2. 上記監査 4 本が **すべて 0 エラー／violations 空**。  
3. CI を同じコミットで再実行するか、保存した証跡と突き合わせる。

---

## 参考リンク（読み物）

- [M55_BASELINE_FREEZE_20260330.md](../ssot/M55_BASELINE_FREEZE_20260330.md) — green の定義  
- [M55_DEPRECATION_MAP_20260330.md](../ssot/M55_DEPRECATION_MAP_20260330.md) — どのドキュメントを信じるか

---

**一行サマリ:** タグ・ZIP・監査 JSON・CI の緑の証跡・主要画面のスクショ・checkout 手順を **1 か所にまとめれば**、2026-03-30 baseline に論理的に復帰できます。
