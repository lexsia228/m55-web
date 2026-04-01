/**
 * Clerk v6 await 漏れガード
 * auth() が await なしで呼ばれている場合に exit 1 で失敗。
 * 純粋 Node.js (fs) のみ使用。bash/grep 非依存・Windows 対応。
 *
 * 検証方法:
 *   正常時: node .github/scripts/guard_clerk_await.mjs  → exit 0
 *   違反時: 任意 .ts に const { userId } = auth(); を追加して実行 → exit 1
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

/** 分割代入の await 漏れ: const/let/var { ... } = auth(); (同一行に await auth() が無い場合) */
const DESTRUCT_AUTH_RE = /(?:const|let|var)\s*\{\s*[^}]*\s*\}\s*=\s*auth\s*\(\s*\)/;

function* walkFiles(dir, ext = ['.ts', '.tsx']) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      yield* walkFiles(full, ext);
    } else if (ext.some((x) => e.name.endsWith(x))) {
      yield full;
    }
  }
}

/**
 * 行に await 漏れがあるか判定（誤爆防止: await auth() を含む行では絶対に fail しない）
 * 違反パターン:
 * - const/let/var { ... } = auth();  (分割代入・同一行に await auth() なし)
 * - = auth() 代入（同一行に await なし）
 * - auth().xxx 直接プロパティアクセス
 */
function hasViolation(line) {
  if (!line.includes('auth()')) return false;
  if (line.includes('await auth()')) return false; // 誤爆防止: この行では絶対 fail しない

  if (DESTRUCT_AUTH_RE.test(line)) return true;
  if (/=\s*auth\s*\(\s*\)/.test(line)) return true;
  if (/auth\s*\(\s*\)\s*\./.test(line)) return true;
  return false;
}

/**
 * provision 専用チェック: 行内に "= auth();" があり、かつ同一行に "await" が無い場合のみ fail
 * "await auth();" を含む行では絶対に fail しない
 */
function provisionLineViolation(line) {
  if (!line.includes('= auth();')) return false;
  if (line.includes('await')) return false; // await auth(); を含む行では絶対 fail しない
  return true;
}

const violations = [];

// 強制ガード: provision/route.ts（誤爆防止付き）
const provisionPath = path.join(ROOT, 'app', 'api', 'diagnostics', 'provision', 'route.ts');
if (fs.existsSync(provisionPath)) {
  const lines = fs.readFileSync(provisionPath, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (provisionLineViolation(line)) {
      const prev = i > 0 ? lines[i - 1] : '';
      console.error('[guard_clerk_await] 強制ガード: app/api/diagnostics/provision/route.ts に await 漏れ');
      console.error(`  app/api/diagnostics/provision/route.ts:${i + 1}  ${line.trim()}`);
      if (prev) console.error(`  ※前の行: ${prev.trim()}`);
      process.exit(1);
    }
  }
}

const dirs = ['app', 'src', 'lib', 'components'].filter((d) => fs.existsSync(path.join(ROOT, d)));
for (const dir of dirs) {
  const dirPath = path.join(ROOT, dir);
  for (const file of walkFiles(dirPath)) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (hasViolation(line)) {
        const prev = i > 0 ? lines[i - 1] : '';
        violations.push({ file: rel, line: i + 1, content: line.trim(), prev: prev.trim() });
      }
    });
  }
}

if (violations.length > 0) {
  console.error('[guard_clerk_await] Clerk v6 await 漏れを検出しました。auth() は await 必須です。');
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line}  ${v.content}`);
    if (v.prev) console.error(`  ※前の行: ${v.prev}`);
  });
  process.exit(1);
}

console.log('[guard_clerk_await] OK — await auth() 漏れなし');
