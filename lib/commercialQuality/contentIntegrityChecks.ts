/**
 * Deterministic M55 content integrity checks for generated Japanese prose.
 */

import { extractJapaneseLabelQuoteJa, parsePublicCardDisplayV1 } from '../m55/narrative/publicCardDisplayV1';
import type {
  ContentIntegrityAuditResult,
  ContentIntegrityCategory,
  ContentIntegrityCorpusItem,
  ContentIntegrityFinding,
  ContentIntegritySeverity,
} from './contentIntegrityTypes';
import { CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1 } from './contentIntegrityTypes';
import { checkSemanticIntegrityCorpus, checkSemanticIntegrityItem } from './contentIntegritySemanticChecks';

const BRACKET_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['「', '」'],
  ['『', '』'],
  ['（', '）'],
  ['(', ')'],
];

const MOJIBAKE_PATTERNS: readonly RegExp[] = [
  /\uFFFD/,
  /ï¼|ã€|â€™|Ã©|Ã¯|â€œ|â€/,
];

const INTERPOLATION_LEAK = /\$\{|undefined|null|\[object Object\]/;

function finding(
  item: ContentIntegrityCorpusItem,
  severity: ContentIntegritySeverity,
  category: ContentIntegrityCategory,
  evidence: string,
  currentText: string,
  expectedText?: string,
): ContentIntegrityFinding {
  return {
    findingId: `CI-${category}-${item.itemId}`,
    itemId: item.itemId,
    severity,
    category,
    deterministicEvidence: evidence,
    currentText: currentText.slice(0, 200),
    expectedText: expectedText?.slice(0, 200),
  };
}

export function checkJapaneseBracketBalance(text: string): boolean {
  for (const [open, close] of BRACKET_PAIRS) {
    let depth = 0;
    for (const ch of text) {
      if (ch === open) depth += 1;
      else if (ch === close) depth -= 1;
      if (depth < 0) return false;
    }
    if (depth !== 0) return false;
  }
  return true;
}

export function looksTruncatedAgainstAuthority(display: string, authority: string): boolean {
  const d = display.trim();
  const a = authority.trim();
  if (!a || d === a) return false;
  return a.startsWith(d) && d.length < a.length;
}

export function hasDanglingBracketFragment(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[「『（\(]$/.test(t)) return true;
  const opens = (t.match(/「/g) ?? []).length;
  const closes = (t.match(/」/g) ?? []).length;
  if (opens !== closes) return true;
  return false;
}

export function hasIncompleteSentenceEnding(text: string): boolean {
  const t = text.trim();
  if (t.length < 16) return false;
  if (/[。！？!?」』）\)]$/.test(t)) return false;
  if (/、$/.test(t) && t.length >= 24) return true;
  return false;
}

export function hasDuplicateAdjacentClause(text: string): boolean {
  const parts = text
    .split(/[。！？\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 8);
  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i] === parts[i - 1]) return true;
  }
  return false;
}

export function checkContentIntegrityItem(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = [];
  const text = item.semanticText.trim();

  if (!text) {
    findings.push(finding(item, 'P0', 'empty_output', 'semanticText empty', text));
    return findings;
  }

  if (!checkJapaneseBracketBalance(text)) {
    findings.push(finding(item, 'P0', 'unmatched_brackets', 'bracket balance failed', text));
  }

  for (const pattern of MOJIBAKE_PATTERNS) {
    if (pattern.test(text)) {
      findings.push(finding(item, 'P0', 'mojibake', `pattern=${pattern.source}`, text));
      break;
    }
  }

  if (INTERPOLATION_LEAK.test(text)) {
    findings.push(finding(item, 'P0', 'malformed_interpolation', 'interpolation leak', text));
  }

  if (hasDanglingBracketFragment(text)) {
    findings.push(finding(item, 'P1', 'dangling_fragment', 'dangling bracket fragment', text));
  }

  if (hasIncompleteSentenceEnding(text)) {
    findings.push(finding(item, 'P2', 'incomplete_sentence_ending', 'no terminal punctuation', text));
  }

  if (hasDuplicateAdjacentClause(text)) {
    findings.push(finding(item, 'P2', 'duplicate_adjacent_prose', 'repeated adjacent clause', text));
  }

  if (item.authoritySemanticText) {
    const authority = item.authoritySemanticText.trim();
    if (looksTruncatedAgainstAuthority(text, authority)) {
      findings.push(
        finding(
          item,
          'P0',
          'share_display_truncation',
          `displayLen=${text.length} authorityLen=${authority.length}`,
          text,
          authority,
        ),
      );
    }
  }

  if (item.shareTextJa && item.authoritySemanticText) {
    const share = item.shareTextJa;
    const authority = item.authoritySemanticText.trim();
    if (authority && share.includes(authority) && text !== authority) {
      findings.push(
        finding(
          item,
          'P0',
          'share_source_divergence',
          'share post contains full authority but display field truncated',
          text,
          authority,
        ),
      );
    }
  }

  if (
    text === CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1.truncatedDisplayJa &&
    item.authoritySemanticText === CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1.expectedActualJa
  ) {
    findings.push(
      finding(
        item,
        'P0',
        'nested_quote_truncation_regression',
        'known Production regression truncated nested 「ここまで」',
        text,
        CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1.expectedActualJa,
      ),
    );
  }

  return findings;
}

export function checkShareCardBodyParseIntegrity(input: {
  itemId: string;
  body: string;
  cta: string;
  variant: string;
}): ContentIntegrityFinding[] {
  if (input.variant !== 'seen_vs_actual') return [];
  const display = parsePublicCardDisplayV1({
    variant: 'seen_vs_actual',
    headline: '人から見える私 / 実際の私',
    body: input.body,
    cta: input.cta,
  });
  const findings: ContentIntegrityFinding[] = [];
  const authorityActual = extractJapaneseLabelQuoteJa(input.body, '実際の私');
  const authoritySeen = extractJapaneseLabelQuoteJa(input.body, '人から見える私');
  if (authorityActual && display.actualJa !== authorityActual) {
    findings.push({
      findingId: `CI-share_display_truncation-actual-${input.itemId}`,
      itemId: input.itemId,
      severity: 'P0',
      category: 'share_display_truncation',
      deterministicEvidence: `displayActualLen=${display.actualJa.length} authorityLen=${authorityActual.length}`,
      currentText: display.actualJa,
      expectedText: authorityActual,
    });
  }
  if (authoritySeen && display.seenJa !== authoritySeen) {
    findings.push({
      findingId: `CI-share_display_truncation-seen-${input.itemId}`,
      itemId: input.itemId,
      severity: 'P0',
      category: 'share_display_truncation',
      deterministicEvidence: `displaySeenLen=${display.seenJa.length} authorityLen=${authoritySeen.length}`,
      currentText: display.seenJa,
      expectedText: authoritySeen,
    });
  }
  return findings;
}

export function runContentIntegrityAudit(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityAuditResult {
  const findings: ContentIntegrityFinding[] = [];
  const brokenItemIds = new Set<string>();

  for (const item of corpus) {
    for (const f of checkContentIntegrityItem(item)) {
      findings.push(f);
      brokenItemIds.add(item.itemId);
    }
    for (const f of checkSemanticIntegrityItem(item)) {
      findings.push(f);
      brokenItemIds.add(item.itemId);
    }
  }
  for (const f of checkSemanticIntegrityCorpus(corpus)) {
    findings.push(f);
    brokenItemIds.add(f.itemId);
  }

  const bySeverity: Record<ContentIntegritySeverity, number> = { P0: 0, P1: 0, P2: 0 };
  for (const f of findings) {
    bySeverity[f.severity] += 1;
  }

  return {
    corpusItemCount: corpus.length,
    brokenItemCount: brokenItemIds.size,
    findings,
    findingsBySeverity: bySeverity,
  };
}
