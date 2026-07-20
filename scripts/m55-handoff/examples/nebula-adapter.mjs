import { classifyChecks } from '../engine.mjs';

// Fully synthetic non-M55 adapter/config contract. No M55 names or product concepts.
export const NEBULA_AUTHORITY_CONFIG = {
  authorityFiles: ['GOVERNANCE.md', 'STATE.md', 'WORKTREES.md'],
  readOrder: ['GOVERNANCE.md', 'STATE.md', 'WORKTREES.md'],
  requiredHeadings: ['## Active delivery lane', '## Next action'],
};

export function inspectNebula({ clean, authorityText }) {
  const checks = [];
  for (const heading of NEBULA_AUTHORITY_CONFIG.requiredHeadings) checks.push({ id: `authority:${heading}`, level: authorityText.includes(heading) ? 'PASS' : 'FAIL' });
  checks.push({ id: 'git:clean', level: clean ? 'PASS' : 'FAIL' });
  return { status: classifyChecks(checks), checks };
}
