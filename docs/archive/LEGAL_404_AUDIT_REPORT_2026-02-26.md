# /legal/privacy 404 監査レポート (2026-02-26)

## 1. ルート実在チェック結果

| パス | 存在 | 根拠 |
|------|------|------|
| `app/legal/privacy/page.tsx` | ✅ 存在 | `Glob` 検索で `app/legal/privacy/page.tsx` を確認 |
| `app/legal/terms/page.tsx` | ✅ 存在 | 同上 |
| `app/legal/tokushoho/page.tsx` | ✅ 存在 | 同上 |
| `app/support/page.tsx` | ✅ 存在 | `Glob` で `app/support/page.tsx` を確認 |

→ **4ファイルともリポジトリに存在。新規作成不要。**

---

## 2. ルーティング阻害チェック

### 2.1 next.config.mjs

| 項目 | 値 | /legal/* への影響 |
|------|-----|-------------------|
| basePath | 未設定 | なし |
| output | コメントアウト | デフォルト（SSR） |
| trailingSlash | **true → false に変更** | **根拠**: `trailingSlash: true` の場合、`/legal/privacy` は `/legal/privacy/` へリダイレクト。一部ホスティング（Vercel 等）でリダイレクト前の処理や CDN キャッシュにより 404 が報告される可能性。`false` で直アクセス可能に。 |
| redirects | 未設定 | なし |
| rewrites | 未設定 | なし |

### 2.2 middleware.ts

| 項目 | 変更前 | 変更後 | 根拠 |
|------|--------|--------|------|
| Clerk  | `clerkMiddleware()` のみ | `createRouteMatcher` で `/legal(.*)`, `/support` を**明示的に公開** | Clerk デフォルトは全ルート公開だが、将来の protect 追加時に誤ってブロックされないよう、法務・サポートルートを明示。 |
| auth 阻害 | 該当なし | 該当なし | 変更前も認証必須ではなかった。 |

---

## 3. 404 の原因（根拠付き）

### 原因 A: ビルド成果物が古い（主因の可能性が高い）

**根拠**:
- 修正前の `.next/types/routes.d.ts` に `/legal/privacy`, `/legal/terms`, `/support` が**含まれていない**
- 含まれていたのは `/legal/tokushoho` のみ
- `npx next build` をクリーン実行後、routes.d.ts に全4ルートが含まれることを確認

```
# 修正前 (routes.d.ts L4)
type AppRoutes = "..." | "/legal/tokushoho" | ...
# → /legal/privacy, /legal/terms, /support が欠落

# 修正後 (クリーンビルド後)
type AppRoutes = "..." | "/legal/privacy" | "/legal/terms" | "/legal/tokushoho" | "/support" | ...
```

**結論**: 本番デプロイ時に、`privacy` / `terms` / `support` が追加される前のビルドが使われていた、あるいは `.next` キャッシュが古い状態のままデプロイされていた可能性が高い。

### 原因 B: trailingSlash による不一致（副因の可能性）

**根拠**:
- `trailingSlash: true` では、`/legal/privacy` は 308 で `/legal/privacy/` へリダイレクト
- リンクはすべて `/legal/privacy`（末尾スラッシュなし）
- 一部エッジ／CDN 環境で、リダイレクト処理やキャッシュの組み合わせにより 404 相当の応答になる事例が報告されている

**対応**: `trailingSlash: false` に変更し、`/legal/privacy` をそのまま有効な URL として扱うようにした。

---

## 4. 実施した修正

| 対象 | 変更内容 |
|------|----------|
| `next.config.mjs` | `trailingSlash: true` → `false` |
| `middleware.ts` | `/legal(.*)`, `/support` を `createRouteMatcher` で明示的に公開ルートに追加 |

---

## 5. ビルド出力での到達性確認

```
Route (app)                              Size  First Load JS
├ ○ /legal/privacy                       301 B         106 kB
├ ○ /legal/terms                         299 B         106 kB
├ ○ /legal/tokushoho                     320 B         106 kB
├ ○ /support                             298 B         106 kB
```

→ **4ルートともビルドに含まれ、静的プリレンダリング済み（○）**

---

## 6. 変更/新規ファイル一覧

| 種別 | パス | 内容 |
|------|------|------|
| 変更 | `next.config.mjs` | `trailingSlash: false` |
| 変更 | `middleware.ts` | 公開ルート `createRouteMatcher` 追加 |
| 新規 | `docs/archive/LEGAL_404_AUDIT_REPORT_2026-02-26.md` | 本レポート |

---

## 7. デプロイ時の推奨

1. **クリーンビルド**: Vercel 等では通常 `next build` が毎回実行されるため、キャッシュを使わない「クリーンビルド」オプションを有効にするか、必要に応じてキャッシュをクリアしてからデプロイする
2. **本レポートの修正を反映したコミットをデプロイ**し、`/legal/privacy` の応答を確認する
