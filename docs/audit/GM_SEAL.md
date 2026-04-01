# M55 GM Seal（Gold Master 封印）

監査の正当性・CI再現性・DOM凍結検知を Gold Master 要件まで引き上げるための封印ドキュメント。

## 必須環境

- **Python 3.12** + `scripts/ci/guard/requirements.txt` を必須とする
- 監査ゲート（`npm run audit`）は Python 依存（beautifulsoup4）を利用する

## インストール

```bash
pip install -r scripts/ci/guard/requirements.txt
```

## routes_manifest.js の window.location 扱い（B案採用）

**裁定**: Direct Nav は `navigateTo()` 内では許容される正当ケース。

- `navigateTo()` は M55_ROUTES による許可された遷移を行う唯一のルート関数
- SSOT（docs/ssot/ui_constitution.html）上、A-plan は Home/AI Chat/MyPage の遷移を許可
- 遷移の実装には `window.location.replace()` / `window.location.href` が必須（他APIなし）
- **コード**: `window.location` を使用（location への逃げ禁止）
- **ガード**: m55_gate_scan_wiring.py において、routes_manifest.js の navigateTo 内の `window.location.replace` / `window.location.href` のみを除外（広域除外禁止）

## excludeLine 抑制ルールの対象（極小範囲）

| 対象 | 理由 |
|------|------|
| `no infinite` / `No infinite` を含む行 | ルール説明文の誤検知 |
| `display:none` + badge/unread/notif を含む行 | 抑制用スタイルの誤検知 |

※ パターン広すぎ禁止。上記以外は検知対象のまま維持。

## ビルド構成

- **ローカル/デプロイ環境**: `npm run build`（純粋ビルド）
- **CI/厳格チェック**: `npm run build:strict` または `npm run ci:build`（監査付きビルド）

## バージョン固定

- **Node**: `.nvmrc` を正とする（24.13.1）
- **Python**: `.python-version` を正とする（3.12.10）
- CI の `actions/setup-node` も同じ Node バージョンを使用

## DOM Freeze（GM Snapshot）

- `docs/ssot/gm_snapshot/` に現時点の正本を保存
- audit_gate により `m55_dom_freeze_check_v2.py` で GM vs CANDIDATE を比較
- PASS: DOM一致 / FAIL: exit 1（fail-closed）

### DOM Freeze 対象（明文化）

- **凍結対象は以下の7ファイル**: index.html, today.html, weekly.html, meter.html, calendar.html, core.html, synastry.html
- 上記7ファイルに限り、`docs/ssot/gm_snapshot` と `public/legacy` の乖離は許されない（乖離＝監査失敗）
- それ以外のファイルは DOM Freeze の対象外だが、別ガード（配線スキャン/言語ゲート等）の統制対象である

## GM Seal Completed

- 2026-02-17: GM Seal 実行完了
- `npm run audit` / `npm run build` / `npx cap sync` すべて PASS
