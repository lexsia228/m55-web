import fs from 'node:fs';
import path from 'node:path';
import { htmlEscape, stableJson } from './engine.mjs';

const HOLD_PREFIX = 'HOLD — DO NOT BEGIN IMPLEMENTATION.';

function reasonCodeFor(check) {
  return check.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_$/, '');
}

function reasonDetails(report) {
  if (report.reasonDetails?.length) return report.reasonDetails;
  return (report.checks || []).filter((check) => check.level !== 'PASS').map((check) => ({ code: reasonCodeFor(check), level: check.level, message: check.message, details: check.details || {} }));
}

function displayPath(value) {
  const parts = String(value).split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || 'local-worktree';
}

export function redactPublicText(value = '') {
  return String(value)
    .replace(/(https?:\/\/)([^/@\s]+)@/g, '$1[REDACTED]@')
    .replace(/\/Users\/[^/\s<>'"`]+\/[^\s<>'"`]*/g, (match) => `[LOCAL_PATH:${displayPath(match.replace(/[),.;:]+$/, ''))}]`)
    .replace(/[A-Za-z]:\\Users\\[^\\\s<>'"`]+\\[^\s<>'"`]*/g, (match) => `[LOCAL_PATH:${displayPath(match.replace(/[),.;:]+$/, ''))}]`);
}

function publicDiagnostic(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => publicDiagnostic(item, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, publicDiagnostic(child, childKey)]));
  if (typeof value !== 'string') return value;
  if (/paths?|root|directory/i.test(key) && (/^\//.test(value) || /^[A-Za-z]:[\\/]/.test(value))) return displayPath(value);
  return redactPublicText(value);
}

function publicReasonDetail(detail) {
  const diagnostic = publicDiagnostic(detail.details || {});
  const suffix = Object.keys(diagnostic).length ? ` Details: ${stableJson(diagnostic)}` : '';
  return `${detail.code} [${detail.level}] — ${redactPublicText(detail.message)}${suffix}`;
}

function availability(authority, field, value, fallbackReason = 'The field is unavailable because authority parsing did not provide it.') {
  const entry = authority.fieldAvailability?.[field];
  const hasValue = Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
  if (hasValue) return Array.isArray(value) ? value.map((item) => redactPublicText(item)).join('; ') : redactPublicText(value);
  return `UNAVAILABLE (${redactPublicText(entry?.reason || authority.parseReason || fallbackReason)})`;
}

function publicWorktrees(values = []) {
  return values.length ? values.map(displayPath).join(', ') : 'none';
}

function core(report) {
  const authority = report.authority || {};
  const hold = report.status === 'HOLD';
  const prohibited = report.prohibitedActions?.length
    ? report.prohibitedActions
    : hold ? ['Implementation while HOLD'] : authority.prohibitedLanes || [];
  return {
    project: report.projectIdentity || 'M55 Control Plane',
    repository: report.targetRepositoryDisplayIdentity || report.repository?.displayIdentity || 'M55 product repository',
    branch: report.repository?.branch || 'UNAVAILABLE',
    head: report.repository?.head || 'UNAVAILABLE',
    status: report.status,
    reasons: report.reasonCodes || [],
    details: reasonDetails(report),
    permission: report.implementationPermission || (hold ? 'NO' : 'YES_WITHIN_DOCUMENTED_AUTHORITY'),
    nextAction: report.nextAction || authority.nextSingleAction || (hold ? 'Resolve the listed HOLD reason codes, then rerun the audit. Do not implement while HOLD.' : 'UNAVAILABLE'),
    prohibited,
    parseStatus: authority.parseStatus || 'UNAVAILABLE',
    parseReason: authority.parseReason,
    activeLane: availability(authority, 'activeLane', authority.activeLane),
    authorizedNextAction: availability(authority, 'nextSingleAction', authority.nextSingleAction),
    humanDecisions: availability(authority, 'humanDecisions', authority.humanDecisionsRequired),
    currentState: availability(authority, 'currentState', authority.currentState),
    targetState: availability(authority, 'targetState', authority.targetState),
    authorityReadOrder: authority.readOrder?.length ? authority.readOrder.join(' → ') : 'UNAVAILABLE (authority read order was not provided)',
    prohibitedAuthority: availability(authority, 'prohibitedActions', authority.prohibitedLanes),
    doNotUseWorktrees: publicWorktrees(authority.doNotUseWorktrees),
  };
}

export function renderHtml(report) {
  const c = core(report);
  const rows = (report.checks || []).map((check) => `<tr><td>${htmlEscape(check.level)}</td><td>${htmlEscape(check.id)}</td><td>${htmlEscape(redactPublicText(check.message))}</td></tr>`).join('');
  const reasons = c.reasons.length ? c.reasons.join(', ') : 'No blocking or warning reasons.';
  const details = c.details.map((detail) => `<li>${htmlEscape(publicReasonDetail(detail))}</li>`).join('') || '<li>none</li>';
  const prohibited = c.prohibited.length ? c.prohibited.map(redactPublicText).join(', ') : 'none';
  const parse = `${c.parseStatus}${c.parseReason ? ` (${redactPublicText(c.parseReason)})` : ''}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Control Plane Handoff Report</title><style>body{margin:0;background:#101c31;color:#f7f0e3;font:17px/1.55 Georgia,serif}main{max-width:1080px;margin:auto;padding:44px 28px}header{border-top:7px solid ${report.status==='HOLD'?'#ff836f':report.status==='READY'?'#63c7b8':'#f2bf62'};padding-top:22px}h1{font-size:clamp(2.2rem,7vw,4.8rem);line-height:1;margin:.1em 0}.eyebrow{color:#83d1c7;text-transform:uppercase;letter-spacing:.12em;font:700 .75rem ui-monospace,monospace}.reason{font-size:1.25rem;max-width:48rem}.brief{border-left:3px solid #83d1c7;padding:8px 18px;margin:28px 0}h2{margin-top:34px}table{width:100%;border-collapse:collapse;margin-top:16px;background:#182944}td,th{padding:11px;border-bottom:1px solid #38516f;text-align:left;vertical-align:top}code{font-family:ui-monospace,monospace;word-break:break-all}@media(max-width:390px){main{padding:26px 18px}table{font-size:.82rem}td,th{padding:8px}.brief{margin:20px 0}}</style></head><body><main><header><p class="eyebrow">${htmlEscape(c.project)} · evidence ${htmlEscape(report.generatedAt)}</p><h1>${htmlEscape(c.status)}</h1><p class="reason">${htmlEscape(reasons)}</p><div class="brief"><strong>Project:</strong> ${htmlEscape(c.project)}<br><strong>Target repository:</strong> ${htmlEscape(c.repository)}<br><strong>Branch / HEAD:</strong> <code>${htmlEscape(c.branch)}</code> / <code>${htmlEscape(c.head)}</code><br><strong>Implementation permission:</strong> ${htmlEscape(c.permission)}<br><strong>Next single action:</strong> ${htmlEscape(c.nextAction)}<br><strong>Authorized next action after HOLD:</strong> ${htmlEscape(c.authorizedNextAction)}<br><strong>Prohibited next action:</strong> ${htmlEscape(prohibited)}<br><strong>Authority parse status:</strong> ${htmlEscape(parse)}<br><strong>Active lane:</strong> ${htmlEscape(c.activeLane)}<br><strong>Human decisions:</strong> ${htmlEscape(c.humanDecisions)}<br><strong>Current state:</strong> ${htmlEscape(c.currentState)}<br><strong>Target state:</strong> ${htmlEscape(c.targetState)}<br><strong>Authority read order:</strong> ${htmlEscape(c.authorityReadOrder)}<br><strong>Commit:</strong> <code>${htmlEscape(c.head)}</code></div></header><section><h2>Reason details</h2><ul>${details}</ul></section><section aria-labelledby="checks"><h2 id="checks">Evidence</h2><table><thead><tr><th>Result</th><th>Check</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></section></main></body></html>`;
}

export function handoffMarkdown(report) {
  const c = core(report);
  const reasons = c.reasons.join(', ') || 'none';
  const details = c.details.map((detail) => `- ${publicReasonDetail(detail)}`).join('\n') || '- none';
  const prohibited = c.prohibited.length ? c.prohibited.map(redactPublicText).join('; ') : 'none';
  const parse = `${c.parseStatus}${c.parseReason ? ` (${redactPublicText(c.parseReason)})` : ''}`;
  return `# Control Plane Handoff\n\nProject: **${c.project}**\nTarget repository: **${c.repository}**\nStatus: **${c.status}**\nImplementation permission: **${c.permission}**\n\n- Branch / HEAD: \`${c.branch}\` / \`${c.head}\`\n- Reason codes: ${reasons}\n- Next single action: ${c.nextAction}\n- Authorized next action after HOLD: ${c.authorizedNextAction}\n- Prohibited actions: ${prohibited}\n- Authority parse status: ${parse}\n- Active lane: ${c.activeLane}\n- Human decisions required: ${c.humanDecisions}\n- Current state: ${c.currentState}\n- Target state: ${c.targetState}\n- Authority read order: ${c.authorityReadOrder}\n- Prohibited authority lanes: ${c.prohibitedAuthority}\n- DO_NOT_USE worktrees: ${c.doNotUseWorktrees}\n\n## Reason details\n\n${details}\n\nFirst allowed read-only commands: \`git status --short --branch\`, \`git worktree list\`, \`npm run audit:m55-handoff -- --repo .\`.\n\n${report.status === 'HOLD' ? '**HOLD: do not begin implementation.**' : 'Proceed only within the documented allowed lane.'}\n`;
}

export function agentBootstrap(report) {
  const c = core(report);
  const lines = [];
  if (report.status === 'HOLD') lines.push(HOLD_PREFIX);
  else lines.push('READ AUTHORITY BEFORE ACTING.');
  lines.push(`Project: ${c.project}`);
  lines.push(`Target repository: ${c.repository}`);
  lines.push(`Active branch: ${c.branch}`);
  lines.push(`Active HEAD: ${c.head}`);
  lines.push(`Control Plane verdict: ${c.status}`);
  lines.push(`Implementation permission: ${c.permission}`);
  lines.push(`Reason codes: ${c.reasons.join(', ') || 'none'}`);
  lines.push('Reason details:');
  for (const detail of c.details) lines.push(`- ${publicReasonDetail(detail)}`);
  if (!c.details.length) lines.push('- none');
  lines.push(`Next single action: ${c.nextAction}`);
  lines.push(`Authorized next action after HOLD: ${c.authorizedNextAction}`);
  lines.push(`Prohibited actions: ${c.prohibited.length ? c.prohibited.map(redactPublicText).join('; ') : 'none'}`);
  lines.push(`Authority parse status: ${c.parseStatus}${c.parseReason ? ` (${redactPublicText(c.parseReason)})` : ''}`);
  lines.push(`Active lane: ${c.activeLane}`);
  lines.push(`Human decisions remaining: ${c.humanDecisions}`);
  lines.push(`Current state: ${c.currentState}`);
  lines.push(`Target state: ${c.targetState}`);
  lines.push(`Authority read order: ${c.authorityReadOrder}`);
  lines.push('Current state and target state are distinct; never report the target contract as implemented current runtime.');
  return `${lines.join('\n')}\n`;
}

export function writeHandoffPacket(out, report) {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'handoff-report.json'), `${stableJson(report)}\n`);
  fs.writeFileSync(path.join(out, 'handoff-report.html'), renderHtml(report));
  fs.writeFileSync(path.join(out, 'handoff.md'), handoffMarkdown(report));
  fs.writeFileSync(path.join(out, 'agent-bootstrap.txt'), agentBootstrap(report));
}
