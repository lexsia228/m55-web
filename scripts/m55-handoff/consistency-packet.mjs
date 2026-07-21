import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalPathIdentity, htmlEscape, pathIsInside, stableJson } from './engine.mjs';
import { codePointCompare, normalizeSemanticData, normalizeSemanticString } from './consistency-engine.mjs';

const h = htmlEscape;
const displayStatus = (status) => status.replaceAll('_', ' ');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function renderFieldValue(value, fallback = 'Not applicable.') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function outcomeBadge(outcome) {
  const symbol = outcome === 'PASS' ? '✓' : outcome === 'FAIL' ? '!' : outcome === 'EXCLUDED' ? '—' : '◆';
  return `<span class="badge badge-${h(outcome.toLowerCase().replaceAll('_', '-'))}"><span aria-hidden="true">${symbol}</span> ${h(displayStatus(outcome))}</span>`;
}

function countStrip(report) {
  const c = report.counts;
  return `<dl class="count-strip"><div><dt>Compliance passes</dt><dd>${c.compliancePasses}</dd></div><div><dt>Current debt</dt><dd>${c.currentDebtObservations}</dd></div><div><dt>Human review</dt><dd>${c.humanReviewItems}</dd></div><div><dt>Excluded</dt><dd>${c.explicitExclusions}</dd></div><div><dt>Blocking failures</dt><dd>${c.blockingFailures}</dd></div></dl>`;
}

function maturityStrip(report) {
  const levels = report.counts.countsByEvidenceLevel;
  return `<dl class="maturity-strip"><div><dt>SOURCE_STATIC</dt><dd>${levels.SOURCE_STATIC}</dd></div><div><dt>RUNTIME_VERIFIED</dt><dd>${levels.RUNTIME_VERIFIED}</dd></div><div><dt>VISUAL_CAPTURE</dt><dd>${levels.VISUAL_CAPTURE}</dd></div><div><dt>HUMAN_APPROVED</dt><dd>${levels.HUMAN_APPROVED}</dd></div></dl>`;
}

function provenance(report) {
  return `<p class="provenance"><span>Project <code>${h(report.project)}</code></span><span>Evidence ${h(report.provenance.timestamp)}</span><span>Commit <code>${h(report.provenance.commit || 'synthetic')}</code></span><span>Branch <code>${h(report.provenance.branch || 'synthetic')}</code></span></p>`;
}

function refs(label, values) {
  return `<div><dt>${h(label)}</dt><dd>${values.length ? values.map((value) => `<code>${h(value)}</code>`).join('<br>') : 'None declared.'}</dd></div>`;
}

function evidenceArticle(record) {
  const outcomeClass = h(record.outcome.toLowerCase().replaceAll('_', '-'));
  return `<article class="evidence-record outcome-${outcomeClass}">${outcomeBadge(record.outcome)}<div class="record-copy"><p class="rule"><code>${h(record.ruleId)}</code> · ${h(record.category)} · ${h(record.evidenceLevel)}</p><h4>${h(record.summary)}</h4><dl class="record-fields"><div><dt>Expected</dt><dd>${h(renderFieldValue(record.expected))}</dd></div><div><dt>Observed</dt><dd>${h(renderFieldValue(record.observed))}</dd></div>${refs('Authority', record.authorityRefs)}${refs('Source', record.sourceRefs)}<div><dt>Contract state</dt><dd>${h(record.currentOrTarget)}</dd></div><div><dt>Next action</dt><dd>${h(renderFieldValue(record.nextAction, 'No action required.'))}</dd></div></dl></div></article>`;
}

function surfaceGroups(report, { fullEvidence = false } = {}) {
  const groups = new Map();
  for (const surface of report.surfaceSummaries) {
    if (!groups.has(surface.journeyGroup)) groups.set(surface.journeyGroup, []);
    groups.get(surface.journeyGroup).push(surface);
  }
  return [...groups.entries()].map(([group, surfaces]) => {
    const id = h(group.replaceAll(' ', '-').replaceAll('/', '-').toLowerCase());
    const content = surfaces.map((surface) => {
      const records = report.evidenceRecords.filter((record) => record.surfaceId === surface.id);
      const evidence = fullEvidence ? records : records.filter((record) => record.outcome !== 'PASS');
      const levels = Object.entries(surface.countsByEvidenceLevel).map(([level, count]) => `${h(level)} ${count}`).join(' · ');
      return `<details class="surface" ${surface.outcome !== 'PASS' ? 'open' : ''}><summary><span><strong>${h(surface.id)}</strong> <code>${h(surface.route)}</code></span>${outcomeBadge(surface.outcome)}<span class="surface-counts">PASS ${surface.counts.PASS} · DEBT ${surface.counts.CURRENT_DEBT} · REVIEW ${surface.counts.REVIEW_REQUIRED} · FAIL ${surface.counts.FAIL}</span></summary><div class="surface-body"><p class="level-summary">Evidence levels: ${levels}</p>${evidence.length ? evidence.map(evidenceArticle).join('') : '<p>No non-PASS finding for this surface.</p>'}</div></details>`;
    }).join('');
    return `<section class="journey" aria-labelledby="group-${id}"><h2 id="group-${id}">${h(group)}</h2>${content}</section>`;
  }).join('');
}

function buildWeekProvenance() {
  return `<section class="journey provenance-section"><p class="kicker">Build Week provenance</p><h2>BUILT WITH CODEX + GPT-5.6</h2><p>Codex implemented and iterated on the Control Plane. GPT-5.6 Sol was used inside Codex for architecture, adversarial audit, cross-platform root-cause analysis, evidence semantics, and information design. Independent Windows Codex verification was separated from Mac implementation.</p><p>The shipped evaluator remains deterministic and makes no model call. It requires no API key, secret, or network service. Human approval remained authoritative for scope, repair, commit, and merge decisions.</p></section>`;
}

function windowsCaseStudy() {
  return `<section class="journey case-study"><p class="kicker">Proven fail-closed case study</p><h2>INDEPENDENT WINDOWS VERIFICATION</h2><ol><li>A fresh Windows checkout was intentionally unmanaged; the live audit returned <code>HOLD / WORKTREE_UNREGISTERED</code>.</li><li>Independent Windows tests exposed cross-platform path-semantics defects before PR creation.</li><li>The verifier did not edit or auto-repair the checkout.</li><li>Human approval authorized the Mac-side repair; the Windows rerun then verified the repaired deterministic contract.</li></ol><p class="source-note">Repository evidence: <code>scripts/m55-handoff/samples/hold-report.json</code>; portability commits <code>3a09b53</code>, <code>8a6eeb5</code>, and <code>c1751c7</code>. No counterfactual impact metric is claimed.</p></section>`;
}

const baseCss = `:root{color-scheme:dark;--navy:#091526;--navy2:#10243b;--ivory:#f6efe2;--muted:#aeb9c8;--line:#304861;--gold:#efbd67;--coral:#ff7d6e;--green:#62cfb6;--blue:#83b9e8;--gray:#98a5b4}*{box-sizing:border-box}html{background:var(--navy)}body{margin:0;background:radial-gradient(circle at 88% 0,#193955 0,transparent 36rem),var(--navy);color:var(--ivory);font:16px/1.55 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:anywhere}main[data-primary-report-root]{width:min(1180px,100%);margin:auto;padding:36px 28px 72px}h1,h2,h3{font-family:Georgia,"Times New Roman",serif;line-height:1.05}h1{font-size:clamp(2.5rem,6.5vw,5.5rem);margin:.12em 0}.eyebrow,.rule,.provenance,.kicker,.source-note{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.eyebrow,.kicker{color:var(--gold);font-size:.74rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.lede{max-width:54rem;font:1.2rem/1.5 Georgia,"Times New Roman",serif;color:#dce4ec}.status-line{border-top:8px solid var(--tone,var(--gold));padding-top:20px}.status-hold{--tone:var(--coral)}.status-consistent{--tone:var(--green)}.status-review-required{--tone:var(--gold)}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;word-break:break-word}.provenance code,.rule code{word-break:break-all}.badge{display:inline-flex;align-items:center;gap:.38em;border:1px solid currentColor;border-radius:999px;padding:.2em .6em;font:700 .68rem/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.04em;white-space:nowrap}.badge-pass{color:var(--green)}.badge-current-debt{color:var(--gold)}.badge-review-required{color:var(--blue)}.badge-excluded{color:var(--gray)}.badge-fail{color:var(--coral)}.count-strip,.maturity-strip{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);margin:22px 0}.count-strip{grid-template-columns:repeat(5,1fr)}.maturity-strip{grid-template-columns:repeat(4,1fr)}.count-strip div,.maturity-strip div{background:var(--navy2);padding:14px}.count-strip dt,.maturity-strip dt{color:var(--muted);font-size:.68rem;letter-spacing:.04em}.count-strip dd,.maturity-strip dd{font:2rem/1 Georgia,serif;margin:8px 0 0}.provenance{display:flex;flex-wrap:wrap;gap:7px 20px;color:var(--muted);font-size:.72rem}.next-action{border-left:3px solid var(--gold);padding:4px 0 4px 16px;max-width:55rem}.journey{margin-top:40px}.journey>h2{font-size:1.65rem;border-bottom:1px solid var(--line);padding-bottom:10px}.surface{border-bottom:1px solid var(--line)}.surface summary{display:grid;grid-template-columns:minmax(13rem,1fr) auto minmax(18rem,auto);gap:12px;align-items:center;padding:15px 0;cursor:pointer}.surface-counts{color:var(--muted);font:700 .68rem ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right}.surface-body{padding:0 0 18px 20px}.level-summary,.source-note{color:var(--muted);font-size:.72rem}.evidence-record{display:grid;grid-template-columns:9rem 1fr;gap:16px;padding:15px 0;border-top:1px solid color-mix(in srgb,var(--line),transparent 35%);break-inside:avoid}.record-copy h4{margin:3px 0 8px;font:700 1rem/1.35 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.rule{margin:0;color:var(--muted);font-size:.68rem}.record-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:0}.record-fields div{min-width:0}.record-fields dt{color:var(--muted);font-size:.68rem;text-transform:uppercase;letter-spacing:.06em}.record-fields dd{margin:2px 0 0;font-size:.84rem}.section-card{border:1px solid var(--line);background:color-mix(in srgb,var(--navy2),transparent 16%);padding:20px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}.plain-list{padding-left:20px}.plain-list li,.case-study li{margin:.35em 0}@media(max-width:760px){main[data-primary-report-root]{padding:24px 17px 52px}.count-strip,.maturity-strip{grid-template-columns:1fr 1fr}.count-strip div:last-child{grid-column:1/-1}.surface summary{grid-template-columns:1fr auto}.surface-counts{grid-column:1/-1;text-align:left}.surface-body{padding-left:0}.evidence-record{grid-template-columns:1fr;gap:7px}.record-fields,.two-col{grid-template-columns:1fr}.provenance{display:block;font-size:.68rem}.provenance span{display:block;margin-top:5px}.provenance code{display:inline;word-break:break-all}.eyebrow{font-size:.68rem}}`;

export function renderOperatorHtml(report) {
  const projectRecords = report.evidenceRecords.filter((record) => record.surfaceId === 'project');
  const statusClass = h(report.status.toLowerCase().replaceAll('_', '-'));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(report.project)} Control Plane - Consistency Operator</title><style>${baseCss}</style></head><body><main data-primary-report-root="operator" data-render-instance="canonical"><header class="status-line status-${statusClass}" data-verdict-block><p class="eyebrow">Control Plane · Operator evidence</p><h1>${h(displayStatus(report.status))}</h1><p class="lede">Status-first inspection of the complete canonical evidence package. Current debt is observed current-state debt proven at its declared evidence level; SOURCE_STATIC debt is not runtime-verified. Current debt and exclusions are never counted as PASS.</p>${countStrip(report)}<p class="next-action"><strong>Next single action:</strong> ${h(report.nextSingleAction)}</p>${provenance(report)}</header><section class="journey"><h2>Project-wide evidence</h2>${projectRecords.length ? projectRecords.map(evidenceArticle).join('') : '<p>No project-wide evidence.</p>'}</section>${surfaceGroups(report, { fullEvidence: true })}</main></body></html>`;
}

function findingList(records, empty) {
  return records.length ? `<ul class="plain-list">${records.slice(0, 8).map((record) => `<li>${outcomeBadge(record.outcome)} <strong>${h(record.summary)}</strong><br><span class="muted"><code>${h(record.ruleId)}</code></span></li>`).join('')}</ul>` : `<p>${h(empty)}</p>`;
}

export function renderJudgeHtml(report) {
  const reviewed = [...report.currentDebt, ...report.reviewRequired, ...report.failures];
  const isM55 = report.project === 'M55';
  const projectControlPlane = `${report.project} Control Plane`;
  const caseStudy = isM55 ? windowsCaseStudy() : '';
  const provenanceSection = isM55 ? buildWeekProvenance() : '';
  const reproduction = isM55
    ? '<p><code>node scripts/m55-handoff/consistency-demo.mjs</code></p><p><strong>Zero-install demo. Adapter-configured adoption.</strong> The v1 runner requires Node and uses Node built-ins. No model call, API key, secret, database, Clerk, Stripe, or external service is required.</p><p>The evaluator is project-agnostic, project facts live in adapters, and Orbit proves a non-M55 adapter.</p><p><strong>Guardrail core:</strong> native macOS and Windows verification.<br><strong>Consistency distribution layer:</strong> native macOS execution; final Windows rerun pending.<br>Linux path semantics remain test-covered, with no native Linux claim.</p>'
    : '<p>Invoke the repository-configured Consistency runner for this adapter.</p><p><strong>Zero-install engine. Adapter-configured adoption.</strong> The evaluator uses Node built-ins and requires no model call, API key, secret, dependency install, or network service.</p>';
  const verdict = report.status === 'REVIEW_REQUIRED'
    ? 'This is an intentional Human gate, not a system failure. Encoded failures are zero; recorded current debt and Human-only decisions remain visible.'
    : report.status === 'HOLD'
      ? 'HOLD is the fail-closed blocking state. The control loop stopped because required evidence failed.'
      : 'All encoded evidence passes with no current debt, Human review item, or blocking failure.';
  const judgeCss = `.judge-title{font-size:clamp(2.2rem,5vw,4.8rem)}.product-lockup{border-top:8px solid var(--gold);padding-top:20px}.product-lockup>h2{margin:.2em 0;font:800 clamp(1rem,2vw,1.35rem)/1.2 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.14em}.promise{font:clamp(1.45rem,3vw,2.5rem)/1.12 Georgia,serif;max-width:28ch}.verdict-panel{margin-top:24px;border-left:5px solid var(--gold);padding:16px 20px;background:var(--navy2)}.verdict-panel h2{margin:0;font-size:2rem}.control-loop{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px}.control-loop article{border:1px solid var(--line);padding:20px;height:100%}.arrow{font-size:1.7rem;color:var(--gold)}.muted{color:var(--muted)}@media(max-width:700px){.control-loop{grid-template-columns:1fr}.arrow{transform:rotate(90deg);text-align:center}.judge-title{font-size:2.7rem}.promise{font-size:1.55rem}.verdict-panel h2{font-size:1.55rem}}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(projectControlPlane)} - Judge Brief</title><style>${baseCss}${judgeCss}</style></head><body><main data-primary-report-root="judge" data-render-instance="canonical"><header class="product-lockup"><p class="eyebrow">REPOSITORY-NATIVE CONTROL FOR HUMAN + MULTI-AGENT SOFTWARE DEVELOPMENT</p><h1 class="judge-title">${h(projectControlPlane.toUpperCase())}</h1><h2>GUARDRAILS &amp; CONSISTENCY</h2><p class="promise">Stops unsafe AI work.<br>Keeps coding agents aligned to repository evidence.</p><p class="lede">${h(projectControlPlane)} stops unsafe agent work and preserves product consistency across agents, branches, machines, and product surfaces.</p><div class="verdict-panel" data-verdict-block><p class="kicker">Current project verdict</p><h2>${h(displayStatus(report.status))}</h2><p>${h(verdict)}</p></div>${countStrip(report)}${provenance(report)}</header><section class="journey"><h2>Why this matters</h2><div class="two-col"><article class="section-card"><h3>For a small project</h3><ul><li>Stable terminology and product intent</li><li>Less repeated explanation</li><li>Fewer agent-to-agent contradictions</li></ul></article><article class="section-card"><h3>As the project grows</h3><ul><li>Worktree authority and dirty-state protection</li><li>Current-versus-target enforcement</li><li>Cross-machine handoff and fail-closed automation</li></ul></article></div></section><section class="journey"><h2>One control loop, two protections</h2><div class="control-loop"><article><p class="kicker">Guardrails</p><h3>Stop unsafe or unauthorized work</h3><p>Dirty, ambiguous, unregistered, conflicting, prohibited, or unverifiable repository state fails closed before implementation.</p></article><div class="arrow" aria-hidden="true">→</div><article><p class="kicker">Consistency</p><h3>Preserve encoded product intent</h3><p>Page inventory, layout, terminology, CTA, scope, responsive markers, current debt, and Human decisions remain explicit.</p></article></div><p><strong>REVIEW_REQUIRED</strong> is an intentional Human gate. <strong>HOLD is the fail-closed blocking state.</strong></p></section><section class="journey"><p class="kicker">Evidence maturity</p><h2>What this result proves</h2>${maturityStrip(report)}<p>These results prove encoded repository consistency, not complete runtime or visual quality. Current debt is observed current-state debt proven at its declared evidence level; SOURCE_STATIC debt is not runtime-verified. Outcome and evidence level remain independent. Static responsive markers are not runtime verification, and screenshots of this report are not visual evidence for ${h(report.project)} consumer pages.</p><p>${report.counts.humanReviewItems} Human-review evidence records are distinct from ${report.humanDecisions.length} pending Human decisions.</p><p>Judge, Operator, and print approval is a separate Control Plane tooling-release prerequisite; it does not resolve consumer review or increment consumer VISUAL_CAPTURE or HUMAN_APPROVED.</p></section><section class="journey"><h2>What it inspected</h2><p>${report.counts.coveredSurfaces.length} covered surfaces; ${report.counts.excludedSurfaces.length} explicit exclusions. Excluded scope is never counted as PASS.</p>${surfaceGroups(report)}</section><section class="journey"><h2>Representative findings</h2>${findingList(reviewed, 'No current debt, Human review item, or failure.')}</section>${caseStudy}${provenanceSection}<section class="journey"><h2>Reproduce without production access</h2><div class="section-card">${reproduction}<p><strong>HOLD would occur for:</strong> missing authority, malformed evidence, a layout or CTA contradiction, prohibited terminology, required evidence failure, or target state presented as live.</p></div></section></main></body></html>`;
}

function printCoverage(report) {
  const groups = new Map();
  for (const surface of report.surfaceSummaries) {
    if (!groups.has(surface.journeyGroup)) groups.set(surface.journeyGroup, []);
    groups.get(surface.journeyGroup).push(surface);
  }
  return [...groups.entries()].map(([group, surfaces]) => `<div class="print-group"><h3>${h(group)}</h3>${surfaces.map((surface) => `<div class="print-surface"><span><strong>${h(surface.id)}</strong> <code>${h(surface.route)}</code></span>${outcomeBadge(surface.outcome)}<small>PASS ${surface.counts.PASS} · DEBT ${surface.counts.CURRENT_DEBT} · REVIEW ${surface.counts.REVIEW_REQUIRED} · FAIL ${surface.counts.FAIL}</small></div>`).join('')}</div>`).join('');
}

export function renderPrintHtml(report) {
  const publicFindings = [...report.failures, ...report.currentDebt.slice(0, 6), ...report.reviewRequired];
  const debtReviewCount = report.currentDebt.length + report.reviewRequired.length;
  const isM55 = report.project === 'M55';
  const projectControlPlane = `${report.project} Control Plane`;
  const judgeCommand = isM55 ? '<code>node scripts/m55-handoff/consistency-demo.mjs</code>' : 'Use the repository-configured Consistency runner.';
  const buildProvenance = isM55 ? '<div class="print-card"><h3>BUILT WITH CODEX + GPT-5.6</h3><p>Codex implemented and iterated on the Control Plane. GPT-5.6 Sol was used inside Codex for architecture, adversarial audit, cross-platform root-cause analysis, evidence semantics, and information design. Independent Windows Codex verification was separated from Mac implementation.</p><p>The shipped evaluator remains deterministic and makes no model call. Human approval remained authoritative for scope, repair, commit, and merge decisions.</p></div>' : '';
  const windowsEvidence = isM55 ? '<div class="print-card"><h3>INDEPENDENT WINDOWS VERIFICATION</h3><ol><li>An intentionally unmanaged fresh checkout returned <code>HOLD / WORKTREE_UNREGISTERED</code>.</li><li>Windows tests exposed path-semantics defects before PR creation; the verifier made no edit or automatic repair.</li><li>Human approval authorized Mac-side repair, and the Windows rerun verified the repaired deterministic contract.</li></ol><p>Evidence: <code>scripts/m55-handoff/samples/hold-report.json</code>; commits <code>3a09b53</code>, <code>8a6eeb5</code>, <code>c1751c7</code>. No impact metric is claimed.</p></div>' : '';
  const supportBoundary = isM55
    ? '<p>The evaluator is project-agnostic; facts live in adapters; Orbit proves non-M55 reuse.</p><p><strong>Guardrail core:</strong> native macOS and Windows verification.<br><strong>Consistency distribution layer:</strong> native macOS execution; final Windows rerun pending.<br>Linux path semantics remain test-covered, with no native Linux claim.</p>'
    : '<p>The evaluator is project-agnostic; project facts remain in the selected adapter.</p><p>Platform support claims belong to the repository distribution that executes this adapter.</p>';
  const verdict = report.status === 'REVIEW_REQUIRED' ? 'An intentional Human gate: no blocking failures, while current debt and Human-only judgments remain explicit.' : report.status === 'HOLD' ? 'HOLD is the fail-closed blocking state.' : 'All encoded evidence passes with no debt, review item, or failure.';
  const printCss = `@page{size:A4;margin:14mm;background:#fff}html{background:#fff}body{background:#fff;color:#142033;font:10.5pt/1.42 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main[data-primary-report-root]{width:auto;margin:0;padding:0}.print-page{break-after:page;page-break-after:always;min-height:255mm;display:flex;flex-direction:column}.print-page:last-child{break-after:auto;page-break-after:auto}.print-page>*{max-width:100%}.print-page h1,.print-page h2,.print-page h3{color:#142033;break-after:avoid;page-break-after:avoid}.print-page h1{font-size:30pt}.print-page h2{font-size:20pt;border-bottom:1px solid #9aabbc;padding-bottom:3mm}.print-page h3{font-size:12.5pt}.print-page .eyebrow,.print-page .kicker{color:#75510f}.print-page .lede{color:#30445a;font-size:12pt}.print-page .count-strip,.print-page .maturity-strip{background:#b7c2cd;border-color:#b7c2cd}.print-page .count-strip div,.print-page .maturity-strip div,.print-card,.print-group{background:#f4f1ea;color:#142033}.print-page .count-strip dd,.print-page .maturity-strip dd{font-size:20pt}.print-page .count-strip dt,.print-page .maturity-strip dt{color:#40556b}.print-card{border:1px solid #9aabbc;padding:4mm;margin:2mm 0;break-inside:avoid;page-break-inside:avoid}.print-coverage{display:grid;grid-template-columns:1fr 1fr;gap:0 5mm;align-content:start}.print-group{border-left:3px solid #b78527;padding:2.5mm 3mm;margin:2mm 0;break-inside:avoid;page-break-inside:avoid}.print-group h3{margin:0 0 1.5mm}.print-surface{display:grid;grid-template-columns:1fr auto;gap:1mm 2mm;border-top:1px solid #c5ced7;padding:1.5mm 0;break-inside:avoid}.print-surface small{grid-column:1/-1;color:#52677b}.print-page .badge{background:#fff}.print-page .badge-pass{color:#126b59}.print-page .badge-current-debt{color:#76500b}.print-page .badge-review-required{color:#245f91}.print-page .badge-excluded{color:#4e5965}.print-page .badge-fail{color:#9f2f25}.print-page .provenance{color:#52677b;margin-top:auto}.print-page code{font-size:8.5pt}.print-findings{columns:2;column-gap:7mm}.print-findings-page{font-size:9.6pt;line-height:1.32}.print-findings-page h2{font-size:18pt}.print-findings-page .print-finding{padding:1.2mm 0}.print-findings-page .print-card{padding:2.5mm;margin:1mm 0}.print-finding{break-inside:avoid;page-break-inside:avoid;border-top:1px solid #b7c2cd;padding:2mm 0}.print-finding p{margin:.8mm 0}.print-footer-note{margin-top:auto;border-top:1px solid #9aabbc;padding-top:3mm;font-size:8.5pt;color:#52677b}.print-dense{font-size:8.6pt;line-height:1.3}.print-dense h2{font-size:18pt}.print-dense h3{font-size:10.5pt;margin:0 0 1mm}.print-dense .print-card{padding:2.5mm;margin:1.5mm 0}.print-dense .print-card p,.print-dense .print-card ol,.print-dense .print-card ul{margin:1mm 0}.print-dense .maturity-strip{margin:1.5mm 0}.print-dense .maturity-strip div{padding:2mm}.print-dense .maturity-strip dd{font-size:14pt}@media print{html,body,main[data-primary-report-root],.print-page{background:#fff!important;background-image:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}a{color:inherit;text-decoration:none}.print-page{orphans:3;widows:3}}@media screen{body{background:#dfe4e8}.print-page{width:210mm;min-height:297mm;margin:10mm auto;padding:14mm;background:#fff;box-shadow:0 5px 24px #50607055}}@media(max-width:850px){@media screen{.print-page{width:auto;min-height:0;margin:0;padding:20px}.print-findings{columns:1}.print-coverage{grid-template-columns:1fr}}}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(projectControlPlane)} - Distribution Report</title><style>${baseCss}${printCss}</style></head><body><main data-primary-report-root="print" data-render-instance="canonical"><section class="print-page"><p class="eyebrow">${h(projectControlPlane)} · Distribution report</p><h1>Guardrails &amp;<br>Consistency</h1><p class="lede">Stops unsafe AI work. Keeps coding agents aligned to repository evidence.</p><div class="print-card" data-verdict-block><p class="kicker">Current verdict</p><h2>${h(displayStatus(report.status))}</h2><p>${h(verdict)}</p></div>${countStrip(report)}${provenance(report)}</section><section class="print-page"><p class="eyebrow">02 · Control loop</p><h2>One engine, two protections</h2><div class="print-card"><h3>Guardrails stop unsafe or unauthorized work</h3><p>Repository identity, branch, worktree registration, dirty state, authority, prohibited lanes, and current-versus-target truth are evaluated before an agent acts.</p></div><div class="print-card"><h3>Consistency preserves encoded product intent</h3><p>Project-defined page, layout, token, terminology, CTA, responsive markers, current debt, exclusions, and Human decisions are evaluated from the same evidence model.</p></div><div class="print-card"><h3>Evidence maturity</h3>${maturityStrip(report)}<p>These results prove encoded repository consistency, not complete runtime or visual quality. Current debt is observed current-state debt proven at its declared evidence level; SOURCE_STATIC debt is not runtime-verified. Outcome and evidence level remain independent. Report screenshots are not ${h(report.project)} consumer-page visual evidence.</p><p>Judge, Operator, and print approval is a separate Control Plane tooling-release prerequisite; it does not resolve consumer review or increment consumer VISUAL_CAPTURE or HUMAN_APPROVED.</p></div><div class="print-card"><h3>One canonical result</h3><p>AI JSON, operator HTML, judge HTML, and print share status, counts, evidence records, commit, branch, and timestamp. Presentation differs; evaluation does not.</p></div><p class="print-footer-note">A target contract is never reported as live merely because it exists in documentation.</p></section><section class="print-page"><p class="eyebrow">03 · Coverage</p><h2>Consistency map</h2><p>${report.counts.coveredSurfaces.length} covered surfaces; ${report.counts.excludedSurfaces.length} explicit exclusions. Exclusion is a scope boundary, never a PASS.</p><div class="print-coverage">${printCoverage(report)}</div></section><section class="print-page print-findings-page"><p class="eyebrow">04 · Findings</p><h2>Representative current debt and Human gates</h2><p>The complete ${debtReviewCount}-item debt/review record remains in JSON and Operator HTML; ${report.exclusions.length} explicit exclusions remain in Coverage. This includes ${report.reviewRequired.length} Human-review evidence records; ${report.humanDecisions.length} pending Human decisions are listed separately below.</p><div class="print-findings">${publicFindings.map((record) => `<article class="print-finding">${outcomeBadge(record.outcome)}<p><strong>${h(record.summary)}</strong></p><p><code>${h(record.ruleId)}</code></p><p>${h(record.nextAction || report.nextSingleAction)}</p></article>`).join('') || '<p>No debt, review, or failure finding.</p>'}</div><div class="print-card"><h3>Human decisions still required</h3><ul>${report.humanDecisions.map((decision) => `<li>${h(decision)}</li>`).join('')}</ul></div><p class="print-footer-note">Machine checks establish encoded consistency only. They do not prove complete visual quality.</p></section><section class="print-page print-dense"><p class="eyebrow">05 · Reproducibility and provenance</p><h2>Safe to run, clear to audit</h2><div class="two-col"><div class="print-card"><h3>Judge command</h3><p>${judgeCommand}</p><p><strong>Zero-install demo. Adapter-configured adoption.</strong> Node built-ins only; no model call, API key, secret, or network service.</p></div><div class="print-card"><h3>Integrity</h3><p>Schema <code>${h(report.schemaVersion)}</code><br>Tool <code>${h(report.toolVersion)}</code><br>Commit <code>${h(report.provenance.commit || 'synthetic')}</code><br>Branch <code>${h(report.provenance.branch || 'synthetic')}</code></p></div></div>${buildProvenance}${windowsEvidence}<div class="print-card"><h3>Support boundary and limitations</h3>${supportBoundary}<p>Static evidence does not establish complete runtime or visual quality. PDF bytes may vary by browser engine.</p></div><p class="print-footer-note">A4 · 100% scale · default document margins · background graphics on · browser headers and footers off.</p></section></main></body></html>`;
}

export function consistencyMarkdown(report) {
  const nonPass = report.evidenceRecords.filter((record) => record.outcome !== 'PASS');
  return `# ${report.project} Control Plane - AI / CI Consistency Handoff\n\nProject: **${report.project}**\nStatus: **${report.status}**\nSchema: \`${report.schemaVersion}\` · Tool: \`${report.toolVersion}\`\n\n## Counts\n\n- Total evidence: ${report.counts.totalEvidence}\n- Compliance passes: ${report.counts.compliancePasses}\n- Current debt observations: ${report.counts.currentDebtObservations}\n- Human review items: ${report.counts.humanReviewItems}\n- Explicit exclusions: ${report.counts.explicitExclusions}\n- Blocking failures: ${report.counts.blockingFailures}\n\nReason codes: ${report.reasonCodes.join(', ') || 'none'}\n\nAgent next action: **${report.agentNextAction}**\n\n## Non-PASS evidence\n\n${nonPass.map((record) => `- [${record.outcome}] \`${record.surfaceId}/${record.ruleId}\` - ${record.summary} Expected: ${renderFieldValue(record.expected)} Observed: ${renderFieldValue(record.observed)} Next: ${renderFieldValue(record.nextAction, 'none')}\n  - sourceRefs: ${stableJson(record.sourceRefs)}\n  - authorityRefs: ${stableJson(record.authorityRefs)}`).join('\n') || '- none'}\n\nCommit: \`${report.provenance.commit || 'synthetic'}\`\nBranch: \`${report.provenance.branch || 'synthetic'}\`\nEvidence timestamp: ${report.provenance.timestamp}\n`;
}

export function semanticPayload(report) {
  return normalizeSemanticData({
    schemaVersion: report.schemaVersion,
    toolVersion: report.toolVersion,
    project: report.project,
    status: report.status,
    reasonCodes: report.reasonCodes,
    counts: report.counts,
    journeyOrder: report.journeyOrder,
    evidenceRecords: report.evidenceRecords,
    surfaceSummaries: report.surfaceSummaries,
    nextSingleAction: report.nextSingleAction,
    agentNextAction: report.agentNextAction,
    humanDecisions: report.humanDecisions,
    repository: { commit: report.provenance.commit, branch: report.provenance.branch },
  });
}

export function semanticDigest(report) {
  return sha256(stableJson(semanticPayload(report)));
}

function pngDimensions(bytes) {
  const signature = '89504e470d0a1a0a';
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== signature) return {};
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function outputBoundaryError(code, cause) {
  const error = new Error(code, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

function pathApiForOutputPlatform(platform) {
  if (platform === 'win32') return path.win32;
  if (platform === 'darwin' || platform === 'linux') return path.posix;
  throw outputBoundaryError('OUTPUT_PATH_UNVERIFIABLE');
}

function absoluteOutputPath(value, platform, pathApi, cwd) {
  const source = platform === 'win32' ? String(value).replaceAll('/', '\\') : String(value);
  return pathApi.isAbsolute(source) ? pathApi.normalize(source) : pathApi.resolve(cwd, source);
}

function realpathOrFail(value, realpathSync) {
  try {
    const resolved = realpathSync(value);
    if (typeof resolved !== 'string' || !resolved) throw new TypeError('realpath returned no identity');
    return resolved;
  } catch (cause) {
    if (cause?.code === 'OUTPUT_PATH_UNVERIFIABLE') throw cause;
    throw outputBoundaryError('OUTPUT_PATH_UNVERIFIABLE', cause);
  }
}

function existsOrFail(value, existsSync) {
  try {
    return existsSync(value);
  } catch (cause) {
    throw outputBoundaryError('OUTPUT_PATH_UNVERIFIABLE', cause);
  }
}

function outputFilesystemIdentity(requested, { existsSync, pathApi, platform, realpathSync, targetCwd }) {
  const suffix = [];
  let ancestor = requested;
  while (!existsOrFail(ancestor, existsSync)) {
    const parent = pathApi.dirname(ancestor);
    if (parent === ancestor) throw outputBoundaryError('OUTPUT_PATH_UNVERIFIABLE');
    suffix.unshift(pathApi.basename(ancestor));
    ancestor = parent;
  }
  const realAncestor = realpathOrFail(ancestor, realpathSync);
  const reconstructed = suffix.reduce((current, segment) => pathApi.join(current, segment), realAncestor);
  return canonicalPathIdentity(reconstructed, {
    targetPlatform: platform,
    targetCwd,
    filesystemResolution: false,
  });
}

export function validateOutputBoundary(out, repositoryRoot, options = {}) {
  if (!repositoryRoot) throw outputBoundaryError('OUTPUT_PATH_UNVERIFIABLE');
  const platform = options.platform || process.platform;
  const pathApi = pathApiForOutputPlatform(platform);
  const source = platform === 'win32' ? String(out).replaceAll('/', '\\') : String(out);
  const defaultCwd = platform === process.platform ? process.cwd() : pathApi.parse(source).root || pathApi.sep;
  const targetCwd = options.cwd || defaultCwd;
  const existsSync = options.existsSync || fs.existsSync;
  const realpathSync = options.realpathSync || fs.realpathSync.native;
  const requested = absoluteOutputPath(out, platform, pathApi, targetCwd);
  const repository = absoluteOutputPath(repositoryRoot, platform, pathApi, targetCwd);
  const repositoryIdentity = canonicalPathIdentity(realpathOrFail(repository, realpathSync), {
    targetPlatform: platform,
    targetCwd,
    filesystemResolution: false,
  });
  const outputIdentity = outputFilesystemIdentity(requested, { existsSync, pathApi, platform, realpathSync, targetCwd });
  const comparison = { targetPlatform: platform, targetCwd, filesystemResolution: false };
  if (repositoryIdentity === outputIdentity || pathIsInside(repositoryIdentity, outputIdentity, comparison)) {
    throw outputBoundaryError('OUTPUT_INSIDE_REPOSITORY');
  }
  options.onIdentityCheck?.(options.phase || 'unspecified', { repositoryIdentity, outputIdentity });
  return requested;
}

export const CONSISTENCY_PACKET_TARGETS = Object.freeze([
  'consistency-report.json',
  'consistency-handoff.md',
  'consistency-operator.html',
  'consistency-judge.html',
  'consistency-print.html',
]);

const PACKET_OWNER_MARKER = '.control-plane-staging-owner.json';
const PACKET_RENDERERS = Object.freeze([
  { filename: 'consistency-report.json', render: (report) => `${stableJson(report)}\n` },
  { filename: 'consistency-handoff.md', render: consistencyMarkdown },
  { filename: 'consistency-operator.html', render: renderOperatorHtml },
  { filename: 'consistency-judge.html', render: renderJudgeHtml },
  { filename: 'consistency-print.html', render: renderPrintHtml },
]);

function canonicalTargetName(filename) {
  if (typeof filename !== 'string' || !filename || filename === '.' || filename === '..' || /[\\/]/.test(filename)) {
    throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  }
  return normalizeSemanticString(filename);
}

export function renderConsistencyPacket(report, { targetDefinitions = PACKET_RENDERERS } = {}) {
  const canonicalReport = normalizeSemanticData(report);
  if (!canonicalReport || typeof canonicalReport !== 'object' || !Array.isArray(canonicalReport.evidenceRecords)) {
    throw outputBoundaryError('OUTPUT_WRITE_INCOMPLETE');
  }
  if (!Array.isArray(targetDefinitions)) throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  const names = targetDefinitions.map((definition) => canonicalTargetName(definition?.filename));
  if (new Set(names).size !== names.length) throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  let values;
  try {
    values = targetDefinitions.map((definition) => definition.render(canonicalReport));
  } catch (cause) {
    throw outputBoundaryError('OUTPUT_WRITE_INCOMPLETE', cause);
  }
  if (values.some((value) => typeof value !== 'string' && !Buffer.isBuffer(value))) {
    throw outputBoundaryError('OUTPUT_WRITE_INCOMPLETE');
  }
  return {
    report: canonicalReport,
    files: names.map((filename, index) => ({ filename, value: values[index] })),
  };
}

function outputOperations(options = {}) {
  const injected = options.operations || {};
  return {
    closeSync: injected.closeSync || fs.closeSync,
    fsyncSync: injected.fsyncSync || fs.fsyncSync,
    linkSync: injected.linkSync || fs.linkSync,
    lstatSync: injected.lstatSync || fs.lstatSync,
    mkdtempSync: injected.mkdtempSync || fs.mkdtempSync,
    openSync: injected.openSync || fs.openSync,
    readFileSync: injected.readFileSync || fs.readFileSync,
    renameSync: injected.renameSync || fs.renameSync,
    rmSync: injected.rmSync || fs.rmSync,
    statSync: injected.statSync || fs.statSync,
    unlinkSync: injected.unlinkSync || fs.unlinkSync,
    writeSync: injected.writeSync || fs.writeSync,
  };
}

function lstatOrNull(target, operations) {
  try {
    return operations.lstatSync(target);
  } catch (cause) {
    if (cause?.code === 'ENOENT') return null;
    throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE', cause);
  }
}

function mappedTargetError(cause, fallback = 'OUTPUT_TARGET_UNVERIFIABLE') {
  if (cause?.code?.startsWith?.('OUTPUT_')) return cause;
  if (cause?.code === 'EEXIST' || cause?.code === 'ELOOP') return outputBoundaryError('OUTPUT_TARGET_EXISTS', cause);
  return outputBoundaryError(fallback, cause);
}

function writeExclusiveFile(target, value, operations) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const flags = fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0);
  let descriptor;
  let failure = null;
  try {
    descriptor = operations.openSync(target, flags, 0o600);
    let offset = 0;
    while (offset < bytes.length) {
      const written = operations.writeSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (!Number.isInteger(written) || written <= 0) throw outputBoundaryError('OUTPUT_WRITE_INCOMPLETE');
      offset += written;
    }
    operations.fsyncSync(descriptor);
  } catch (cause) {
    failure = descriptor === undefined ? mappedTargetError(cause) : mappedTargetError(cause, 'OUTPUT_WRITE_INCOMPLETE');
  } finally {
    if (descriptor !== undefined) {
      try {
        operations.closeSync(descriptor);
      } catch (cause) {
        if (!failure) failure = outputBoundaryError('OUTPUT_WRITE_INCOMPLETE', cause);
      }
    }
  }
  if (failure) throw failure;
}

function stagingPrefix(finalName) {
  return `.${finalName}.consistency-staging-`;
}

function stagingNameMatches(stagingDirectory, finalName) {
  const name = path.basename(stagingDirectory);
  const prefix = stagingPrefix(finalName);
  return name.startsWith(prefix) && /^[A-Za-z0-9_-]{6,}$/.test(name.slice(prefix.length));
}

export function cleanupOwnedConsistencyStaging(stagingDirectory, finalName, { ownerToken = null, operations: injectedOperations = {} } = {}) {
  const operations = outputOperations({ operations: injectedOperations });
  if (!stagingNameMatches(stagingDirectory, finalName)) return false;
  const stagingStat = lstatOrNull(stagingDirectory, operations);
  if (!stagingStat || stagingStat.isSymbolicLink() || !stagingStat.isDirectory()) return false;
  const markerPath = path.join(stagingDirectory, PACKET_OWNER_MARKER);
  const markerStat = lstatOrNull(markerPath, operations);
  if (!markerStat || markerStat.isSymbolicLink() || !markerStat.isFile()) return false;
  let marker;
  try {
    marker = JSON.parse(operations.readFileSync(markerPath, 'utf8'));
  } catch {
    return false;
  }
  if (marker.schemaVersion !== 'control-plane-staging-owner-v1' || marker.finalName !== finalName || !marker.ownerToken) return false;
  if (ownerToken && marker.ownerToken !== ownerToken) return false;
  operations.rmSync(stagingDirectory, { recursive: true, force: false });
  return true;
}

function validateExistingOutputDirectory(out, repositoryRoot, outputSafety, operations) {
  const resolved = validateOutputBoundary(out, repositoryRoot, { ...outputSafety, phase: 'pre-create' });
  const realpathSync = outputSafety.realpathSync || fs.realpathSync.native;
  const real = realpathOrFail(resolved, realpathSync);
  const stat = lstatOrNull(real, operations);
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  validateOutputBoundary(real, repositoryRoot, { ...outputSafety, phase: 'post-create' });
  return real;
}

export function writeConsistencyPacket(out, report, { repositoryRoot = null, outputSafety = {}, renderOptions = {} } = {}) {
  const rendered = renderConsistencyPacket(report, renderOptions);
  const operations = outputOperations(outputSafety);
  const requested = validateOutputBoundary(out, repositoryRoot, { ...outputSafety, phase: 'pre-create' });
  const parent = path.dirname(requested);
  const parentReal = realpathOrFail(parent, outputSafety.realpathSync || fs.realpathSync.native);
  const parentStat = lstatOrNull(parentReal, operations);
  if (!parentStat || parentStat.isSymbolicLink() || !parentStat.isDirectory()) throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  validateOutputBoundary(parentReal, repositoryRoot, { ...outputSafety, phase: 'post-create' });
  const finalName = path.basename(requested);
  const finalDirectory = path.join(parentReal, finalName);
  if (lstatOrNull(finalDirectory, operations)) throw outputBoundaryError('OUTPUT_TARGET_EXISTS');

  const ownerToken = crypto.randomBytes(24).toString('hex');
  let stagingDirectory = null;
  let published = false;
  try {
    try {
      stagingDirectory = operations.mkdtempSync(path.join(parentReal, stagingPrefix(finalName)));
    } catch (cause) {
      throw mappedTargetError(cause);
    }
    validateOutputBoundary(stagingDirectory, repositoryRoot, { ...outputSafety, phase: 'post-create' });
    const marker = `${stableJson({ schemaVersion: 'control-plane-staging-owner-v1', finalName, ownerToken })}\n`;
    writeExclusiveFile(path.join(stagingDirectory, PACKET_OWNER_MARKER), marker, operations);
    outputSafety.hooks?.afterStagingCreated?.({ stagingDirectory, finalDirectory, ownerToken, targetNames: rendered.files.map((file) => file.filename) });
    for (let index = 0; index < rendered.files.length; index += 1) {
      const file = rendered.files[index];
      writeExclusiveFile(path.join(stagingDirectory, file.filename), file.value, operations);
      outputSafety.hooks?.afterChildWritten?.({ stagingDirectory, finalDirectory, filename: file.filename, index });
    }
    outputSafety.hooks?.beforePublish?.({ stagingDirectory, finalDirectory });
    if (lstatOrNull(finalDirectory, operations)) throw outputBoundaryError('OUTPUT_PUBLISH_CONFLICT');
    try {
      operations.renameSync(stagingDirectory, finalDirectory);
    } catch (cause) {
      throw outputBoundaryError('OUTPUT_PUBLISH_CONFLICT', cause);
    }
    published = true;
  } catch (cause) {
    if (!published && stagingDirectory) {
      try {
        cleanupOwnedConsistencyStaging(stagingDirectory, finalName, { ownerToken, operations });
      } catch {
        // Cleanup is deliberately best-effort; the original classified failure remains authoritative.
      }
    }
    throw cause?.code?.startsWith?.('OUTPUT_') ? cause : outputBoundaryError('OUTPUT_WRITE_INCOMPLETE', cause);
  }
  outputSafety.hooks?.afterPublish?.({ finalDirectory });
  return finalDirectory;
}

function artifactRecord(artifact, operations) {
  const filename = canonicalTargetName(artifact?.filename);
  const stat = lstatOrNull(artifact.filePath, operations);
  if (!stat || stat.isSymbolicLink() || !stat.isFile()) throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  let bytes;
  try {
    bytes = operations.readFileSync(artifact.filePath);
  } catch (cause) {
    throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE', cause);
  }
  const record = { filename, byteSize: bytes.length, sha256: sha256(bytes), ...pngDimensions(bytes) };
  if ((artifact.byteSize !== undefined && artifact.byteSize !== record.byteSize) || (artifact.sha256 !== undefined && artifact.sha256 !== record.sha256)) {
    throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  }
  return { record, filePath: artifact.filePath };
}

function verifyArtifactRecords(artifacts, records, operations) {
  artifacts.forEach((artifact, index) => {
    let bytes;
    try {
      bytes = operations.readFileSync(artifact.filePath);
    } catch (cause) {
      throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE', cause);
    }
    if (bytes.length !== records[index].record.byteSize || sha256(bytes) !== records[index].record.sha256) {
      throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
    }
  });
}

export function writeArtifactManifest(out, report, artifacts, { repositoryRoot = null, generatedAt = new Date().toISOString(), outputSafety = {} } = {}) {
  if (!Array.isArray(artifacts)) throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  const operations = outputOperations(outputSafety);
  const resolved = validateExistingOutputDirectory(out, repositoryRoot, outputSafety, operations);
  const target = path.join(resolved, 'consistency-artifact-manifest.json');
  if (lstatOrNull(target, operations)) throw outputBoundaryError('OUTPUT_TARGET_EXISTS');
  const collected = artifacts.map((artifact) => artifactRecord(artifact, operations));
  const names = collected.map(({ record }) => record.filename);
  if (new Set(names).size !== names.length) throw outputBoundaryError('OUTPUT_TARGET_UNVERIFIABLE');
  const ordered = collected.map(({ record }) => record).sort((a, b) => codePointCompare(a.filename, b.filename));
  verifyArtifactRecords(artifacts, collected, operations);
  const canonicalReport = normalizeSemanticData(report);
  const manifest = normalizeSemanticData({
    manifestSchemaVersion: 'control-plane-artifact-manifest-v1',
    schemaVersion: canonicalReport.schemaVersion,
    toolVersion: canonicalReport.toolVersion,
    project: canonicalReport.project,
    repositoryCommit: canonicalReport.provenance.commit,
    branch: canonicalReport.provenance.branch,
    canonicalStatus: canonicalReport.status,
    canonicalCounts: canonicalReport.counts,
    semanticDigestAlgorithm: 'SHA-256',
    semanticDigest: semanticDigest(canonicalReport),
    artifacts: ordered,
    generatedAt,
  });
  const manifestBytes = `${stableJson(manifest)}\n`;
  const stagingTarget = path.join(resolved, `.consistency-artifact-manifest.json.staging-${crypto.randomBytes(16).toString('hex')}`);
  let published = false;
  try {
    writeExclusiveFile(stagingTarget, manifestBytes, operations);
    verifyArtifactRecords(artifacts, collected, operations);
    outputSafety.hooks?.beforeManifestPublish?.({ stagingTarget, target });
    try {
      operations.linkSync(stagingTarget, target);
    } catch (cause) {
      if (cause?.code === 'EEXIST' || lstatOrNull(target, operations)) throw outputBoundaryError('OUTPUT_TARGET_EXISTS', cause);
      throw outputBoundaryError('OUTPUT_PUBLISH_CONFLICT', cause);
    }
    published = true;
  } catch (cause) {
    if (!published) {
      try {
        const stagingStat = lstatOrNull(stagingTarget, operations);
        if (stagingStat && !stagingStat.isSymbolicLink() && stagingStat.isFile()) operations.unlinkSync(stagingTarget);
      } catch { /* Preserve the original classified failure. */ }
    }
    throw cause?.code?.startsWith?.('OUTPUT_') ? cause : outputBoundaryError('OUTPUT_WRITE_INCOMPLETE', cause);
  }
  try {
    operations.unlinkSync(stagingTarget);
  } catch (cause) {
    throw outputBoundaryError('OUTPUT_WRITE_INCOMPLETE', cause);
  }
  return manifest;
}
