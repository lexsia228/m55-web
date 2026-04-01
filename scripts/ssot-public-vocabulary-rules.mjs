/**
 * SSOT public-surface vocabulary rules (shared by run-sonnet-audit.js and ESLint).
 */
const SEVERITY = { critical: 'critical', major: 'major', minor: 'minor' };

export function collectViolationsForLine(line, fileRel, lineNumber) {
  const out = [];
  if (line.includes('占い')) {
    out.push({ type: 'vocabulary', file: fileRel, line: lineNumber, current: '占い', expected: '公開面では「占い」を使わない', severity: SEVERITY.critical, fix: '同趣旨の別表現へ' });
  }
  if (line.includes('10の資質')) {
    out.push({ type: 'vocabulary', file: fileRel, line: lineNumber, current: '10の資質', expected: '「10通りの資質」に統一', severity: SEVERITY.critical, fix: '置換' });
  }
  if (line.includes('偏り')) {
    out.push({ type: 'vocabulary', file: fileRel, line: lineNumber, current: '偏り', expected: '「5つの解析軸」に統一', severity: SEVERITY.critical, fix: '置換' });
  }
  const blocked = [
    ['世界初', 'B.1'], ['日本発', 'B.1'], ['20万7,360', 'B.1'], ['20万7，360', 'B.1'],
    ['33の基本因子', 'B.1'], ['12の動的サイクル', 'B.1'], ['1,000年の統計', 'B.1'], ['ぼったくり', 'B.1'],
  ];
  for (const [needle, tag] of blocked) {
    if (line.includes(needle)) {
      out.push({ type: 'vocabulary', file: fileRel, line: lineNumber, current: needle, expected: tag + ' 禁止', severity: SEVERITY.critical, fix: '削除' });
    }
  }
  return out;
}

export const PUBLIC_SCAN_ROOTS = [
  'app/home', 'app/how-m55-works', 'app/ten-views', 'app/support', 'app/legal', 'app/purchase',
  'components/home', 'components/pages', 'components/shell',
];
export const RESERVE_SCAN_ROOTS = ['app/api'];
