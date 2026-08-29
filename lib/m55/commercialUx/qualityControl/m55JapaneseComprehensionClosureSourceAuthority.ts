/**
 * Shared source-authority adapter for the 15 Japanese comprehension closure domains.
 * Imports or deterministically extracts from real product owners — never restates copy.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PAIR_AXIS_FREE_RESULT_FRAGMENTS,
  PAIR_AXIS_GAP_BODIES,
  PAIR_AXIS_TEASER_OPENERS,
  PERSON_A_BODY,
  PERSON_B_BODY,
  TOPIC_CLUE_CORE,
  TOPIC_DEEP_BODIES,
  TOPIC_IMMEDIATE_ACTIONS,
  TOPIC_TEASER_BRIDGES,
} from '../../compatibility/pairReadingFragments.v1';
import {
  PAIR_READING_FREE_STRUCTURE_ITEMS,
  PAIR_READING_GUEST_SUPPORT_LINES,
} from '../../compatibility/pairReadingPublicStructure';
import {
  PAID_DTR_BENEFITS_HEADING,
  PAID_DTR_BENEFIT_BULLETS,
  PAID_DTR_CHAPTERS,
  PAID_DTR_CHAPTER_OPENING_COPY,
  PAID_DTR_DRAWER_HUB,
  PAID_DTR_FREE_VS_PAID,
  PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA,
  PAID_DTR_VALUE_PROPOSITION,
} from '../../paidDtrProductCopy';
import {
  GUEST_PROFILE_HANDOFF_COPY_V1,
  GUEST_PROFILE_INTAKE_COPY_V1,
  GUEST_SAVE_RESULT_COPY_V1,
  REANSWER_CONFIRM_COPY_V1,
} from '../../freeResult/guestFreeJourneyCopyV1';
import {
  FREE_CONTINUOUS_FLOW_STEPS_JA,
  parseAndValidateDobInput,
  validateSegmentedDob,
} from '../../freeResult/segmentedDobInputV1';
import { PURCHASE_CHECKOUT_PUBLIC_ERRORS } from '../../purchaseCheckoutStartedAction';
import { M55_METHOD_ROUTE_LINK_LABEL_JA } from '../../method/m55MethodAuthority';
import type { CopyRole, GovernedCopyEntry, SurfaceFamily } from '../../../commercialQuality/japaneseComprehensionTypes';
export type M55ClosureSourceCopyIdentity = {
  domainId: string;
  sourceOwner: string;
  sourceExport: string;
  sourceItemId: string;
  expectedCopyId: string;
  textRef: string;
  sourceFingerprint: string;
};

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

export const M55_CLOSURE_PLACEHOLDER_DOMAIN_IDS = [
  'self.validation.error.empty.loading',
  'self.auth.transition',
  'self.free.result',
  'self.paid.report',
  'self.owned.report',
  'pair.dob.input',
  'pair.validation.error.empty.loading',
  'pair.auth.transition',
  'pair.free.result',
  'pair.paid.report',
  'pair.owned.report',
  'shared.support.help',
  'shared.validation.error',
  'shared.empty.loading',
  'shared.auth',
] as const;

export type M55ClosurePlaceholderDomainId = (typeof M55_CLOSURE_PLACEHOLDER_DOMAIN_IDS)[number];

export type M55ClosureSourceRegistration = {
  domainId: M55ClosurePlaceholderDomainId;
  copyId: string;
  surfaceId: string;
  runtimeStateId: string;
  surfaceFamily: SurfaceFamily;
  copyRole: CopyRole;
  sourceOwner: string;
  audienceContext: string;
  sourceExport: string;
  sourceItemId: string;
  textRef: string;
  visibleText: string;
};

export function buildSourceIdentityFingerprint(parts: {
  sourceOwner: string;
  sourceExport: string;
  sourceItemId: string;
  expectedCopyId: string;
  textRef: string;
  visibleText?: string;
}): string {
  const visiblePart = parts.visibleText ? parts.visibleText.replace(/\s+/g, '').trim() : '';
  return `${parts.sourceOwner}|${parts.sourceExport}|${parts.sourceItemId}|${parts.expectedCopyId}|${parts.textRef}|${visiblePart}`;
}

function readOwnerSource(relativePath: string): string {
  const fullPath = join(REPO_ROOT, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`closure source owner missing: ${relativePath}`);
  }
  return readFileSync(fullPath, 'utf8');
}

function findConstInitializerSlice(source: string, symbolName: string): string {
  const startRe = new RegExp(`const\\s+${symbolName}\\b`);
  const startMatch = startRe.exec(source);
  if (!startMatch) {
    throw new Error(`closure source symbol not found: ${symbolName}`);
  }
  let index = startMatch.index + startMatch[0].length;
  while (index < source.length && source[index] !== '=') index += 1;
  if (source[index] !== '=') {
    throw new Error(`closure source symbol missing initializer: ${symbolName}`);
  }
  index += 1;
  while (index < source.length && /\s/.test(source[index]!)) index += 1;
  const opener = source[index];
  if (opener !== '{' && opener !== '[' && opener !== "'" && opener !== '"') {
    throw new Error(`closure source symbol unsupported initializer: ${symbolName}`);
  }
  const closer = opener === '{' ? '}' : opener === '[' ? ']' : opener;
  if (opener === "'" || opener === '"') {
    let cursor = index + 1;
    while (cursor < source.length) {
      if (source[cursor] === '\\') {
        cursor += 2;
        continue;
      }
      if (source[cursor] === closer) {
        return source.slice(index, cursor + 1);
      }
      cursor += 1;
    }
    throw new Error(`closure source unterminated string: ${symbolName}`);
  }
  let depth = 0;
  let cursor = index;
  while (cursor < source.length) {
    const ch = source[cursor]!;
    if (ch === opener) depth += 1;
    if (ch === closer) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(index, cursor + 1);
      }
    }
    cursor += 1;
  }
  throw new Error(`closure source unterminated object: ${symbolName}`);
}

function unescapeTsString(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function extractFlatStringRecordEntries(
  objectSlice: string,
  prefix = '',
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  const re = /([A-Za-z0-9_]+)\s*:\s*'((?:\\'|[^'])*)'/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(objectSlice)) !== null) {
    const key = prefix ? `${prefix}.${match[1]}` : match[1]!;
    entries.push({ key, value: unescapeTsString(match[2]!) });
  }
  return entries;
}

function extractNestedStringRecordEntries(
  source: string,
  symbolName: string,
): Array<{ key: string; value: string }> {
  const objectSlice = findConstInitializerSlice(source, symbolName);
  const entries: Array<{ key: string; value: string }> = [];
  const outerRe = /([A-Za-z0-9_]+)\s*:\s*\{/g;
  let outer: RegExpExecArray | null;
  while ((outer = outerRe.exec(objectSlice)) !== null) {
    const outerKey = outer[1]!;
    const innerStart = outer.index + outer[0].length;
    let depth = 1;
    let cursor = innerStart;
    while (cursor < objectSlice.length && depth > 0) {
      const ch = objectSlice[cursor]!;
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      cursor += 1;
    }
    const innerSlice = objectSlice.slice(innerStart, cursor - 1);
    for (const inner of extractFlatStringRecordEntries(innerSlice, outerKey)) {
      entries.push(inner);
    }
  }
  return entries;
}

function countAnchorOccurrences(source: string, anchor: string): number {
  let count = 0;
  let from = 0;
  while (from < source.length) {
    const index = source.indexOf(anchor, from);
    if (index < 0) break;
    count += 1;
    from = index + anchor.length;
  }
  return count;
}

function findUniqueAnchorIndex(source: string, anchor: string, contextLabel: string): number {
  const count = countAnchorOccurrences(source, anchor);
  if (count === 0) {
    throw new Error(`closure anchor missing (${contextLabel}): ${anchor}`);
  }
  if (count > 1) {
    throw new Error(`closure anchor ambiguous (${contextLabel}): ${anchor} (${count} matches)`);
  }
  return source.indexOf(anchor);
}

function skipSyntaxWhitespace(source: string, start: number): number {
  let cursor = start;
  while (cursor < source.length && /\s/.test(source[cursor]!)) cursor += 1;
  return cursor;
}

function parseStringLiteralAt(source: string, start: number): { value: string; end: number } {
  const quote = source[start];
  if (quote !== "'" && quote !== '"') {
    throw new Error(`closure string delimiter expected at ${start}, got ${quote ?? 'eof'}`);
  }
  let cursor = start + 1;
  while (cursor < source.length) {
    if (source[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (source[cursor] === quote) {
      return { value: unescapeTsString(source.slice(start + 1, cursor)), end: cursor + 1 };
    }
    cursor += 1;
  }
  throw new Error('closure unterminated string literal');
}

function readUniqueScopeSlice(relativePath: string, scopeAnchor: string, scopeLabel: string): string {
  const source = readOwnerSource(relativePath);
  const scopeIndex = findUniqueAnchorIndex(source, scopeAnchor, scopeLabel);
  const scopedSource = source.slice(scopeIndex);
  const boundary = scopedSource.search(/\n(?:export )?function /);
  return boundary > 0 ? scopedSource.slice(0, boundary) : scopedSource;
}

function readJsxScopeSlice(
  source: string,
  startAnchor: string,
  endAnchor: string,
  contextLabel: string,
): string {
  const startIndex = findUniqueAnchorIndex(source, startAnchor, contextLabel);
  const tail = source.slice(startIndex);
  const endIndex = tail.indexOf(endAnchor);
  if (endIndex < 0) {
    throw new Error(`closure jsx scope end not found (${contextLabel}): ${endAnchor}`);
  }
  return tail.slice(0, endIndex);
}

function readJsxTextAfterCursor(sourceSlice: string, cursor: number, contextLabel: string): string {
  const window = sourceSlice.slice(cursor, cursor + 500);
  const mixedChildMatch = /^\s*([^<{]+?)(?=\s*\{)/s.exec(window);
  if (mixedChildMatch && mixedChildMatch[1]!.trim()) {
    return mixedChildMatch[1]!.trim();
  }
  const textUntilCloseMatch = /^\s*([\s\S]*?)\s*<\//.exec(window);
  if (textUntilCloseMatch && textUntilCloseMatch[1]!.trim()) {
    return textUntilCloseMatch[1]!.trim();
  }
  throw new Error(`closure jsx text not found after opening tag (${contextLabel})`);
}

function extractJsxTextAfterNthOpeningTag(
  sourceSlice: string,
  openingTagAnchor: string,
  occurrence: number,
  contextLabel: string,
): string {
  let from = 0;
  let tagIndex = -1;
  for (let index = 0; index <= occurrence; index += 1) {
    tagIndex = sourceSlice.indexOf(openingTagAnchor, from);
    if (tagIndex < 0) {
      throw new Error(`closure jsx opening tag occurrence ${occurrence} not found (${contextLabel})`);
    }
    from = tagIndex + openingTagAnchor.length;
  }
  let cursor = tagIndex + openingTagAnchor.length;
  if (!openingTagAnchor.endsWith('>')) {
    const tagEnd = sourceSlice.indexOf('>', cursor);
    if (tagEnd < 0 || tagEnd - cursor > 300) {
      throw new Error(`closure jsx opening tag not closed (${contextLabel}): ${openingTagAnchor}`);
    }
    cursor = tagEnd + 1;
  }
  return readJsxTextAfterCursor(sourceSlice, cursor, `${contextLabel}.${occurrence}`);
}

function extractStringLiteralAfterStructuralAnchor(
  relativePath: string,
  structuralAnchor: string,
  contextLabel: string,
): string {
  const source = readOwnerSource(relativePath);
  const anchorIndex = findUniqueAnchorIndex(source, structuralAnchor, contextLabel);
  const cursor = skipSyntaxWhitespace(source, anchorIndex + structuralAnchor.length);
  return parseStringLiteralAt(source, cursor).value;
}

function extractStringLiteralAtOpeningQuote(
  relativePath: string,
  prefixThroughOpeningQuote: string,
  contextLabel: string,
): string {
  const quote = prefixThroughOpeningQuote.at(-1);
  if (quote !== "'" && quote !== '"') {
    throw new Error(`closure opening-quote prefix must end with a quote (${contextLabel})`);
  }
  const source = readOwnerSource(relativePath);
  const anchorIndex = findUniqueAnchorIndex(source, prefixThroughOpeningQuote, contextLabel);
  const quoteIndex = anchorIndex + prefixThroughOpeningQuote.length - 1;
  return parseStringLiteralAt(source, quoteIndex).value;
}

function extractJsxTextAfterOpeningTag(
  sourceSlice: string,
  openingTagAnchor: string,
  contextLabel: string,
): string {
  const anchorIndex = findUniqueAnchorIndex(sourceSlice, openingTagAnchor, contextLabel);
  let cursor = anchorIndex + openingTagAnchor.length;
  if (!openingTagAnchor.endsWith('>')) {
    const tagEnd = sourceSlice.indexOf('>', cursor);
    if (tagEnd < 0 || tagEnd - cursor > 300) {
      throw new Error(`closure jsx opening tag not closed (${contextLabel}): ${openingTagAnchor}`);
    }
    cursor = tagEnd + 1;
  }
  return readJsxTextAfterCursor(sourceSlice, cursor, contextLabel);
}

function extractCaseBranchReturnLiteral(relativePath: string, caseLabel: string): string {
  const source = readOwnerSource(relativePath);
  const caseAnchor = `case '${caseLabel}':`;
  let searchFrom = findUniqueAnchorIndex(source, caseAnchor, `case:${caseLabel}`);
  while (searchFrom < source.length) {
    const tail = source.slice(searchFrom);
    const nextBoundary = tail.search(/\n\s+(?:case '|default:)/);
    const segment = nextBoundary > 0 ? tail.slice(0, nextBoundary) : tail;
    const returnMatch = /return\s+/.exec(segment);
    if (returnMatch) {
      const quoteIndex = skipSyntaxWhitespace(segment, returnMatch.index + returnMatch[0].length);
      return parseStringLiteralAt(source, searchFrom + quoteIndex).value;
    }
    if (nextBoundary < 0) {
      break;
    }
    searchFrom += nextBoundary;
  }
  throw new Error(`closure case return missing (${caseLabel})`);
}

function extractAssignmentStringLiteral(relativePath: string, propertyName: string): string {
  const source = readOwnerSource(relativePath);
  const structuralAnchor = `${propertyName}:`;
  const anchorIndex = findUniqueAnchorIndex(source, structuralAnchor, `assignment:${propertyName}`);
  const cursor = skipSyntaxWhitespace(source, anchorIndex + structuralAnchor.length);
  return parseStringLiteralAt(source, cursor).value;
}

function extractAnchoredTemplateHead(relativePath: string, anchor: string): string {
  const source = readOwnerSource(relativePath);
  const anchorIndex = findUniqueAnchorIndex(source, anchor, `template:${anchor}`);
  const window = source.slice(anchorIndex, anchorIndex + 200);
  const match = /`([^`$]+)`/.exec(window);
  if (!match) {
    throw new Error(`closure template literal not found (${relativePath}): ${anchor}`);
  }
  return match[1]!.trim();
}

function extractTernaryBranchLiterals(
  relativePath: string,
  questionAnchor: string,
  contextLabel: string,
): { whenTrue: string; whenFalse: string } {
  const source = readOwnerSource(relativePath);
  const anchorIndex = findUniqueAnchorIndex(source, questionAnchor, contextLabel);
  const window = source.slice(anchorIndex, anchorIndex + 500);
  const questionMark = window.indexOf('?');
  const colon = window.indexOf(':', questionMark + 1);
  if (questionMark < 0 || colon < 0) {
    throw new Error(`closure ternary operators not found (${contextLabel}): ${questionAnchor}`);
  }
  const trueStart = skipSyntaxWhitespace(window, questionMark + 1);
  const trueLiteral = parseStringLiteralAt(window, trueStart);
  const falseStart = skipSyntaxWhitespace(window, colon + 1);
  const falseLiteral = parseStringLiteralAt(window, falseStart);
  return {
    whenTrue: trueLiteral.value,
    whenFalse: falseLiteral.value,
  };
}

function runClosureExtractionNegativeControls(): void {
  const missingAnchorSource = "export function Demo() { return <p>ok</p>; }";
  if (countAnchorOccurrences(missingAnchorSource, 'definitely-missing-anchor') !== 0) {
    throw new Error('closure negative control setup failed: missing anchor fixture');
  }
  try {
    findUniqueAnchorIndex(missingAnchorSource, 'definitely-missing-anchor', 'negative.missing');
    throw new Error('closure negative control failed: missing anchor must throw');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('closure anchor missing')) {
      throw error;
    }
  }

  const duplicateAnchorSource = "alpha beta alpha";
  if (countAnchorOccurrences(duplicateAnchorSource, 'alpha') !== 2) {
    throw new Error('closure negative control setup failed: duplicate anchor fixture');
  }
  try {
    findUniqueAnchorIndex(duplicateAnchorSource, 'alpha', 'negative.duplicate');
    throw new Error('closure negative control failed: duplicate anchor must throw');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('closure anchor ambiguous')) {
      throw error;
    }
  }

  const sequentialLiteralSource = "setError('first'); setError('second');";
  const firstLiteral = extractStringLiteralAfterStructuralAnchorFromSource(
    sequentialLiteralSource,
    "setError('first'); setError(",
    'negative.sequential',
  );
  if (firstLiteral !== 'second') {
    throw new Error(`closure negative control failed: expected second literal, got ${firstLiteral}`);
  }
  try {
    extractStringLiteralAfterStructuralAnchorFromSource(
      sequentialLiteralSource,
      "setError('first')",
      'negative.literal-in-anchor',
    );
    throw new Error('closure negative control failed: literal-in-anchor prefix must throw');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('closure string delimiter expected')) {
      throw error;
    }
  }

  const pairAuth = buildM55ClosureSourceRegistrations().filter((entry) => entry.domainId === 'pair.auth.transition');
  const heading = pairAuth.find((entry) => entry.copyId === 'pair.auth.heading');
  const recoveryHeading = pairAuth.find((entry) => entry.copyId === 'pair.auth.recovery_heading');
  const body = pairAuth.find((entry) => entry.copyId === 'pair.auth.body');
  const recoveryBody = pairAuth.find((entry) => entry.copyId === 'pair.auth.recovery_body');
  if (!heading || !recoveryHeading || !body || !recoveryBody) {
    throw new Error('closure negative control failed: pair auth registrations missing');
  }
  if (heading.visibleText === recoveryHeading.visibleText || body.visibleText === recoveryBody.visibleText) {
    throw new Error('closure negative control failed: pair auth heading/body must be distinct');
  }

  const secondAuthoritySource = "if (!nick) { setError('ORIGINAL_LITERAL'); }";
  const structuralAnchor = 'setError(';
  const originalLiteral = extractStringLiteralAfterStructuralAnchorFromSource(
    secondAuthoritySource,
    structuralAnchor,
    'negative.second_authority.original',
  );
  if (originalLiteral !== 'ORIGINAL_LITERAL') {
    throw new Error(`closure negative control failed: second authority original literal mismatch (${originalLiteral})`);
  }
  const mutatedSource = "if (!nick) { setError('MUTATED_LITERAL'); }";
  const mutatedLiteral = extractStringLiteralAfterStructuralAnchorFromSource(
    mutatedSource,
    structuralAnchor,
    'negative.second_authority.mutated',
  );
  if (mutatedLiteral !== 'MUTATED_LITERAL') {
    throw new Error(`closure negative control failed: second authority mutated literal mismatch (${mutatedLiteral})`);
  }
  if (structuralAnchor.includes('ORIGINAL_LITERAL') || structuralAnchor.includes('MUTATED_LITERAL')) {
    throw new Error('closure negative control failed: structural locator must not embed visible copy');
  }

  const jsxAuthoritySource = '<section data-testid="scope"><h2>HEAD_A</h2></section>';
  const jsxStructuralAnchor = 'data-testid="scope"><h2>';
  const jsxOriginal = extractJsxTextAfterOpeningTag(
    jsxAuthoritySource,
    jsxStructuralAnchor,
    'negative.second_authority.jsx.original',
  );
  if (jsxOriginal !== 'HEAD_A') {
    throw new Error(`closure negative control failed: jsx second authority original mismatch (${jsxOriginal})`);
  }
  const jsxMutatedSource = '<section data-testid="scope"><h2>HEAD_B</h2></section>';
  const jsxMutated = extractJsxTextAfterOpeningTag(
    jsxMutatedSource,
    jsxStructuralAnchor,
    'negative.second_authority.jsx.mutated',
  );
  if (jsxMutated !== 'HEAD_B') {
    throw new Error(`closure negative control failed: jsx second authority mutated mismatch (${jsxMutated})`);
  }
  if (jsxStructuralAnchor.includes('HEAD_A') || jsxStructuralAnchor.includes('HEAD_B')) {
    throw new Error('closure negative control failed: jsx structural locator must not embed visible copy');
  }
}

function extractStringLiteralAfterStructuralAnchorFromSource(
  source: string,
  structuralAnchor: string,
  contextLabel: string,
): string {
  const anchorIndex = findUniqueAnchorIndex(source, structuralAnchor, contextLabel);
  const cursor = skipSyntaxWhitespace(source, anchorIndex + structuralAnchor.length);
  return parseStringLiteralAt(source, cursor).value;
}

function extractRecordLabelLiteralByHref(
  relativePath: string,
  href: string,
  contextLabel: string,
): string {
  const source = readOwnerSource(relativePath);
  const hrefAnchor = `href: '${href}'`;
  const anchorIndex = findUniqueAnchorIndex(source, hrefAnchor, contextLabel);
  const recordStart = source.lastIndexOf('{', anchorIndex);
  if (recordStart < 0 || anchorIndex - recordStart > 200) {
    throw new Error(`closure footer record start not found (${contextLabel})`);
  }
  const recordSlice = source.slice(recordStart, anchorIndex + hrefAnchor.length);
  const labelKey = "label: '";
  const labelKeyIndex = recordSlice.indexOf(labelKey);
  if (labelKeyIndex < 0) {
    throw new Error(`closure footer label key not found (${contextLabel})`);
  }
  const quoteIndex = recordStart + labelKeyIndex + labelKey.length - 1;
  return parseStringLiteralAt(source, quoteIndex).value;
}

function reg(input: Omit<M55ClosureSourceRegistration, 'audienceContext'> & { audienceContext?: string }): M55ClosureSourceRegistration {
  return { audienceContext: 'public', ...input };
}

function fromObjectEntries(
  domainId: M55ClosurePlaceholderDomainId,
  surfaceId: string,
  runtimeStateId: string,
  surfaceFamily: SurfaceFamily,
  copyRole: CopyRole,
  sourceOwner: string,
  sourceExport: string,
  copyIdPrefix: string,
  entries: ReadonlyArray<readonly [string, string]>,
): M55ClosureSourceRegistration[] {
  return entries.map(([sourceItemId, visibleText]) =>
    reg({
      domainId,
      copyId: `${copyIdPrefix}.${sourceItemId}`,
      surfaceId,
      runtimeStateId,
      surfaceFamily,
      copyRole,
      sourceOwner,
      sourceExport,
      sourceItemId,
      textRef: `${sourceExport}.${sourceItemId}`,
      visibleText,
    }),
  );
}

function selfValidationRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'lib/m55/freeResult/segmentedDobInputV1.ts';
  const emptyFieldsResult = validateSegmentedDob({ year: '', month: '', day: '' });
  const nonNumericResult = validateSegmentedDob({ year: 'abcd', month: '01', day: '01' });
  const yearRangeResult = validateSegmentedDob({ year: '1800', month: '01', day: '01' });
  const monthRangeResult = validateSegmentedDob({ year: '1990', month: '13', day: '01' });
  const invalidFormatResult = parseAndValidateDobInput('not-a-date');
  const fixtures: Array<{ sourceItemId: string; textRef: string; errorJa: string }> = [
    {
      sourceItemId: 'validate.empty_fields',
      textRef: 'validateSegmentedDob.empty_fields',
      errorJa: emptyFieldsResult.ok ? '' : emptyFieldsResult.errorJa,
    },
    {
      sourceItemId: 'validate.non_numeric',
      textRef: 'validateSegmentedDob.non_numeric',
      errorJa: nonNumericResult.ok ? '' : nonNumericResult.errorJa,
    },
    {
      sourceItemId: 'validate.year_range',
      textRef: 'validateSegmentedDob.year_range',
      errorJa: yearRangeResult.ok ? '' : yearRangeResult.errorJa,
    },
    {
      sourceItemId: 'validate.month_range',
      textRef: 'validateSegmentedDob.month_range',
      errorJa: monthRangeResult.ok ? '' : monthRangeResult.errorJa,
    },
    {
      sourceItemId: 'parse.invalid_format',
      textRef: 'parseAndValidateDobInput.invalid_format',
      errorJa: invalidFormatResult.ok ? '' : invalidFormatResult.errorJa,
    },
  ];
  for (const fixture of fixtures) {
    if (!fixture.errorJa) {
      throw new Error(`closure segmented DOB fixture produced no error: ${fixture.sourceItemId}`);
    }
  }
  const segmented = fixtures.map((fixture) =>
    reg({
      domainId: 'self.validation.error.empty.loading',
      copyId: `self.validation.${fixture.sourceItemId}`,
      surfaceId: 'm55:self.free.intake',
      runtimeStateId: 'self.validation.error',
      surfaceFamily: 'SELF',
      copyRole: 'VALIDATION',
      sourceOwner: owner,
      sourceExport: 'segmentedDobInputV1',
      sourceItemId: fixture.sourceItemId,
      textRef: fixture.textRef,
      visibleText: fixture.errorJa,
    }),
  );
  const intakeOwner = 'app/_components/IntakeModal.tsx';
  const intakeErrors = [
    {
      sourceItemId: 'nickname_required',
      structuralAnchor: "if (!nick) {\n      setError(",
      contextLabel: 'IntakeModal.nickname_required',
    },
    {
      sourceItemId: 'birthdate_required',
      structuralAnchor: "if (!birthDate) {\n      setError(",
      contextLabel: 'IntakeModal.birthdate_required',
    },
    {
      sourceItemId: 'privacy_required',
      structuralAnchor: "if (!privacyChecked) {\n      setError(",
      contextLabel: 'IntakeModal.privacy_required',
    },
  ] as const;
  const intake = intakeErrors.map((item) =>
    reg({
      domainId: 'self.validation.error.empty.loading',
      copyId: `self.validation.intake.${item.sourceItemId}`,
      surfaceId: 'm55:self.free.intake',
      runtimeStateId: 'self.validation.error',
      surfaceFamily: 'SELF',
      copyRole: 'VALIDATION',
      sourceOwner: intakeOwner,
      sourceExport: 'IntakeModal.setError',
      sourceItemId: item.sourceItemId,
      textRef: `IntakeModal.${item.sourceItemId}`,
      visibleText: extractStringLiteralAfterStructuralAnchor(
        intakeOwner,
        item.structuralAnchor,
        item.contextLabel,
      ),
    }),
  );
  const flowSteps = FREE_CONTINUOUS_FLOW_STEPS_JA.map((label, index) =>
    reg({
      domainId: 'self.validation.error.empty.loading',
      copyId: `self.loading.flow_step.${index}`,
      surfaceId: 'm55:self.free.intake',
      runtimeStateId: 'self.empty.loading',
      surfaceFamily: 'SELF',
      copyRole: 'LOADING',
      sourceOwner: owner,
      sourceExport: 'FREE_CONTINUOUS_FLOW_STEPS_JA',
      sourceItemId: String(index),
      textRef: `FREE_CONTINUOUS_FLOW_STEPS_JA[${index}]`,
      visibleText: label,
    }),
  );
  return [...segmented, ...intake, ...flowSteps];
}

function selfAuthTransitionRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'lib/m55/freeResult/guestFreeJourneyCopyV1.ts';
  const groups = [
    { exportName: 'GUEST_PROFILE_INTAKE_COPY_V1', value: GUEST_PROFILE_INTAKE_COPY_V1 },
    { exportName: 'GUEST_PROFILE_HANDOFF_COPY_V1', value: GUEST_PROFILE_HANDOFF_COPY_V1 },
    { exportName: 'GUEST_SAVE_RESULT_COPY_V1', value: GUEST_SAVE_RESULT_COPY_V1 },
    { exportName: 'REANSWER_CONFIRM_COPY_V1', value: REANSWER_CONFIRM_COPY_V1 },
  ] as const;
  return groups.flatMap(({ exportName, value }) =>
    Object.entries(value).map(([key, visibleText]) =>
      reg({
        domainId: 'self.auth.transition',
        copyId: `self.auth.${exportName}.${key}`,
        surfaceId: 'm55:self.free.intake',
        runtimeStateId: 'self.auth.transition',
        surfaceFamily: 'SELF',
        copyRole: key.toLowerCase().includes('action') ? 'CTA' : 'BODY',
        sourceOwner: owner,
        sourceExport: exportName,
        sourceItemId: key,
        textRef: `${exportName}.${key}`,
        visibleText,
      }),
    ),
  );
}

const FREE_DEPTH_STATIC_SYMBOLS = [
  'AXIS_TITLE_JA',
  'START_PATTERN',
  'DECISION_PATTERN',
  'START_REASON',
  'DECISION_REASON',
  'DISTANCE_REASON',
  'CHANGE_REASON',
  'RECOVERY_PATTERN',
  'DISTANCE_PATTERN',
  'CHANGE_PATTERN',
  'START_WORK',
  'DECISION_WORK',
  'DISTANCE_SCENE',
  'CHANGE_SCENE',
  'STRENGTH_BY_START',
  'STRENGTH_BY_DECISION',
  'STRENGTH_BY_RECOVERY',
  'LOAD_BY_START',
  'LOAD_BY_DISTANCE',
  'LOAD_BY_CHANGE',
] as const;

function selfFreeResultRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'lib/m55/freeResult/buildFreeDepthAnalysisV1.ts';
  const source = readOwnerSource(owner);
  const entries: M55ClosureSourceRegistration[] = [];
  const bodyTextOwners = new Map<string, string>();
  const flatSymbols = [...FREE_DEPTH_STATIC_SYMBOLS];
  const patternTexts = new Map<string, string>();
  for (const symbolName of ['CHANGE_PATTERN', 'DECISION_PATTERN', 'DISTANCE_PATTERN', 'RECOVERY_PATTERN', 'START_PATTERN'] as const) {
    const slice = findConstInitializerSlice(source, symbolName);
    for (const { key, value } of extractFlatStringRecordEntries(slice)) {
      patternTexts.set(`${symbolName}.${key}`, value);
    }
  }
  for (const symbolName of flatSymbols) {
    if (symbolName.endsWith('_REASON')) {
      const patternName = symbolName.replace('_REASON', '_PATTERN');
      const slice = findConstInitializerSlice(source, symbolName);
      for (const { key, value } of extractFlatStringRecordEntries(slice)) {
        const patternValue = patternTexts.get(`${patternName}.${key}`);
        if (patternValue === value) continue;
        entries.push(
          reg({
            domainId: 'self.free.result',
            copyId: `self.free.result.${symbolName}.${key}`,
            surfaceId: 'm55:self.free.result',
            runtimeStateId: 'self.free.result.body',
            surfaceFamily: 'SELF',
            copyRole: 'BODY',
            sourceOwner: owner,
            sourceExport: symbolName,
            sourceItemId: key,
            textRef: `${symbolName}.${key}`,
            visibleText: value,
          }),
        );
        bodyTextOwners.set(value, `${symbolName}.${key}`);
      }
      continue;
    }
    const slice = findConstInitializerSlice(source, symbolName);
    for (const { key, value } of extractFlatStringRecordEntries(slice)) {
      if (bodyTextOwners.has(value)) continue;
      entries.push(
        reg({
          domainId: 'self.free.result',
          copyId: `self.free.result.${symbolName}.${key}`,
          surfaceId: 'm55:self.free.result',
          runtimeStateId: 'self.free.result.body',
          surfaceFamily: 'SELF',
          copyRole: 'BODY',
          sourceOwner: owner,
          sourceExport: symbolName,
          sourceItemId: key,
          textRef: `${symbolName}.${key}`,
          visibleText: value,
        }),
      );
      bodyTextOwners.set(value, `${symbolName}.${key}`);
    }
  }
  for (const symbolName of ['HEADLINE_COMBINED', 'DOB_VS_FREE'] as const) {
    for (const { key, value } of extractNestedStringRecordEntries(source, symbolName)) {
      entries.push(
        reg({
          domainId: 'self.free.result',
          copyId: `self.free.result.${symbolName}.${key.replace('.', '_')}`,
          surfaceId: 'm55:self.free.result',
          runtimeStateId: 'self.free.result.body',
          surfaceFamily: 'SELF',
          copyRole: 'BODY',
          sourceOwner: owner,
          sourceExport: symbolName,
          sourceItemId: key,
          textRef: `${symbolName}.${key}`,
          visibleText: value,
        }),
      );
    }
  }
  const anchored = [
    {
      sourceItemId: 'trustCueJa',
      anchor: 'currentExpressionJa: insight.currentExpressionJa,\n    trustCueJa:',
      visibleText: extractStringLiteralAfterStructuralAnchor(
        owner,
        'currentExpressionJa: insight.currentExpressionJa,\n    trustCueJa:',
        'self.free.result.trustCueJa',
      ),
    },
    {
      sourceItemId: 'buildConclusion.s4',
      anchor: 'const s4 = `',
      visibleText: extractAnchoredTemplateHead(owner, 'const s4 = `'),
    },
  ] as const;
  for (const item of anchored) {
    entries.push(
      reg({
        domainId: 'self.free.result',
        copyId: `self.free.result.inline.${item.sourceItemId}`,
        surfaceId: 'm55:self.free.result',
        runtimeStateId: 'self.free.result.body',
        surfaceFamily: 'SELF',
        copyRole: 'BODY',
        sourceOwner: owner,
        sourceExport: 'buildFreeDepthAnalysisV1.inline',
        sourceItemId: item.sourceItemId,
        textRef: item.sourceItemId,
        visibleText: item.visibleText,
      }),
    );
  }
  if (entries.length === 0) {
    throw new Error('closure self.free.result produced zero identities');
  }
  return entries;
}

function selfPaidReportRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'lib/m55/paidDtrProductCopy.ts';
  const entries: M55ClosureSourceRegistration[] = [];
  for (const [index, line] of PAID_DTR_VALUE_PROPOSITION.notAClaim.entries()) {
    entries.push(
      reg({
        domainId: 'self.paid.report',
        copyId: `self.paid.report.not_a_claim.${index}`,
        surfaceId: 'm55:self.paid.report',
        runtimeStateId: 'self.paid.report.body',
        surfaceFamily: 'SELF',
        copyRole: 'BODY',
        sourceOwner: owner,
        sourceExport: 'PAID_DTR_VALUE_PROPOSITION.notAClaim',
        sourceItemId: String(index),
        textRef: `PAID_DTR_VALUE_PROPOSITION.notAClaim[${index}]`,
        visibleText: line,
      }),
    );
  }
  entries.push(
    reg({
      domainId: 'self.paid.report',
      copyId: 'self.paid.report.benefits.heading',
      surfaceId: 'm55:self.paid.report',
      runtimeStateId: 'self.paid.report.body',
      surfaceFamily: 'SELF',
      copyRole: 'HEADING',
      sourceOwner: owner,
      sourceExport: 'PAID_DTR_BENEFITS_HEADING',
      sourceItemId: 'heading',
      textRef: 'PAID_DTR_BENEFITS_HEADING',
      visibleText: PAID_DTR_BENEFITS_HEADING,
    }),
    reg({
      domainId: 'self.paid.report',
      copyId: 'self.paid.report.reader.hero_prefix',
      surfaceId: 'm55:self.paid.report',
      runtimeStateId: 'self.paid.report.body',
      surfaceFamily: 'SELF',
      copyRole: 'HEADING',
      sourceOwner: owner,
      sourceExport: 'PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA',
      sourceItemId: 'prefix',
      textRef: 'PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA',
      visibleText: PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA,
    }),
    reg({
      domainId: 'self.paid.report',
      copyId: 'self.paid.report.free_vs_paid.note',
      surfaceId: 'm55:self.paid.report',
      runtimeStateId: 'self.paid.report.body',
      surfaceFamily: 'SELF',
      copyRole: 'BODY',
      sourceOwner: owner,
      sourceExport: 'PAID_DTR_FREE_VS_PAID',
      sourceItemId: 'paidIsNotMerely',
      textRef: 'PAID_DTR_FREE_VS_PAID.paidIsNotMerely',
      visibleText: PAID_DTR_FREE_VS_PAID.paidIsNotMerely,
    }),
  );
  for (const [index, bullet] of PAID_DTR_BENEFIT_BULLETS.entries()) {
    entries.push(
      reg({
        domainId: 'self.paid.report',
        copyId: `self.paid.report.benefit.${index}`,
        surfaceId: 'm55:self.paid.report',
        runtimeStateId: 'self.paid.report.body',
        surfaceFamily: 'SELF',
        copyRole: 'BODY',
        sourceOwner: owner,
        sourceExport: 'PAID_DTR_BENEFIT_BULLETS',
        sourceItemId: String(index),
        textRef: `PAID_DTR_BENEFIT_BULLETS[${index}]`,
        visibleText: bullet,
      }),
    );
  }
  const PART_ID_BY_CHAPTER = {
    outline: '1',
    structure: '2',
    strain: '3',
    ease: '4',
  } as const;
  for (const chapter of PAID_DTR_CHAPTERS) {
    entries.push(
      reg({
        domainId: 'self.paid.report',
        copyId: `self.paid.report.chapter.${chapter.id}.title`,
        surfaceId: 'm55:self.paid.report',
        runtimeStateId: 'self.paid.report.body',
        surfaceFamily: 'SELF',
        copyRole: 'HEADING',
        sourceOwner: owner,
        sourceExport: 'PAID_DTR_CHAPTERS',
        sourceItemId: `${chapter.id}.title`,
        textRef: `PAID_DTR_CHAPTERS.${chapter.id}.title`,
        visibleText: chapter.title,
      }),
      reg({
        domainId: 'self.paid.report',
        copyId: `self.paid.report.chapter.${chapter.id}.helpsUnderstandJa`,
        surfaceId: 'm55:self.paid.report',
        runtimeStateId: 'self.paid.report.body',
        surfaceFamily: 'SELF',
        copyRole: 'BODY',
        sourceOwner: owner,
        sourceExport: 'PAID_DTR_CHAPTERS',
        sourceItemId: `${chapter.id}.helpsUnderstandJa`,
        textRef: `PAID_DTR_CHAPTERS.${chapter.id}.helpsUnderstandJa`,
        visibleText: chapter.helpsUnderstandJa,
      }),
    );
    const partId = PART_ID_BY_CHAPTER[chapter.id];
    const opening = PAID_DTR_CHAPTER_OPENING_COPY[partId];
    entries.push(
      reg({
        domainId: 'self.paid.report',
        copyId: `self.paid.report.chapter.${chapter.id}.opening.tendencyJa`,
        surfaceId: 'm55:self.paid.report',
        runtimeStateId: 'self.paid.report.body',
        surfaceFamily: 'SELF',
        copyRole: 'BODY',
        sourceOwner: owner,
        sourceExport: 'PAID_DTR_CHAPTER_OPENING_COPY',
        sourceItemId: `${partId}.tendencyJa`,
        textRef: `PAID_DTR_CHAPTER_OPENING_COPY.${partId}.tendencyJa`,
        visibleText: opening.tendencyJa,
      }),
    );
  }
  for (const [key, value] of Object.entries(PAID_DTR_DRAWER_HUB)) {
    if (typeof value === 'string') {
      if (key === 'ariaLabelJa') continue;
      entries.push(
        reg({
          domainId: 'self.paid.report',
          copyId: `self.paid.report.drawer.${key}`,
          surfaceId: 'm55:self.paid.report',
          runtimeStateId: 'self.paid.report.body',
          surfaceFamily: 'SELF',
          copyRole: key.includes('title') ? 'HEADING' : key.includes('aria') ? 'HELP' : 'BODY',
          sourceOwner: owner,
          sourceExport: 'PAID_DTR_DRAWER_HUB',
          sourceItemId: key,
          textRef: `PAID_DTR_DRAWER_HUB.${key}`,
          visibleText: value,
        }),
      );
    }
  }
  return entries;
}

function selfOwnedReportRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'components/dtr/PaidDtrAnalysisLoading.tsx';
  const source = readOwnerSource(owner);
  const entries: M55ClosureSourceRegistration[] = [];
  entries.push(
    reg({
      domainId: 'self.owned.report',
      copyId: 'self.owned.report.slow_wait',
      surfaceId: 'm55:self.owned.report',
      runtimeStateId: 'self.owned.report.loading',
      surfaceFamily: 'SELF',
      copyRole: 'LOADING',
      sourceOwner: owner,
      sourceExport: 'SLOW_WAIT_COPY',
      sourceItemId: 'slow_wait',
      textRef: 'SLOW_WAIT_COPY',
      visibleText: extractStringLiteralAtOpeningQuote(owner, "const SLOW_WAIT_COPY = '", 'PaidDtrAnalysisLoading.SLOW_WAIT_COPY'),
    }),
  );
  const chaptersSlice = findConstInitializerSlice(source, 'CHAPTERS');
  const chapterLabels = [...chaptersSlice.matchAll(/label:\s*'((?:\\'|[^'])*)'/g)];
  chapterLabels.forEach((match, index) => {
    entries.push(
      reg({
        domainId: 'self.owned.report',
        copyId: `self.owned.report.chapter_label.${index}`,
        surfaceId: 'm55:self.owned.report',
        runtimeStateId: 'self.owned.report.loading',
        surfaceFamily: 'SELF',
        copyRole: 'LOADING',
        sourceOwner: owner,
        sourceExport: 'CHAPTERS',
        sourceItemId: `label.${index}`,
        textRef: `CHAPTERS[${index}].label`,
        visibleText: unescapeTsString(match[1]!),
      }),
    );
  });
  const previewSlice = findConstInitializerSlice(source, 'PREVIEW_LINES');
  const previewMatches = [...previewSlice.matchAll(/'((?:\\'|[^'])*)'/g)];
  previewMatches.forEach((match, index) => {
    entries.push(
      reg({
        domainId: 'self.owned.report',
        copyId: `self.owned.report.preview.${index}`,
        surfaceId: 'm55:self.owned.report',
        runtimeStateId: 'self.owned.report.loading',
        surfaceFamily: 'SELF',
        copyRole: 'LOADING',
        sourceOwner: owner,
        sourceExport: 'PREVIEW_LINES',
        sourceItemId: String(index),
        textRef: `PREVIEW_LINES[${index}]`,
        visibleText: unescapeTsString(match[1]!),
      }),
    );
  });
  const linesStart = source.indexOf('const lines = [');
  if (linesStart < 0) {
    throw new Error('closure PaidDtrAnalysisLoading lines block missing');
  }
  const linesEnd = source.indexOf('] as const', linesStart);
  const linesSlice = source.slice(linesStart, linesEnd);
  const lineStrings = [...linesSlice.matchAll(/'((?:\\'|[^'])*)'/g)];
  lineStrings.forEach((match, index) => {
    entries.push(
      reg({
        domainId: 'self.owned.report',
        copyId: `self.owned.report.step.line.${index}`,
        surfaceId: 'm55:self.owned.report',
        runtimeStateId: 'self.owned.report.loading',
        surfaceFamily: 'SELF',
        copyRole: 'LOADING',
        sourceOwner: owner,
        sourceExport: 'stepCopy.lines',
        sourceItemId: String(index),
        textRef: `stepCopy.lines[${index}]`,
        visibleText: unescapeTsString(match[1]!),
      }),
    );
  });
  return entries;
}

function pairDobInputRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'components/compatibility/CompatibilityGuestExperience.tsx';
  const source = readOwnerSource(owner);
  const dobScope = readJsxScopeSlice(
    source,
    'data-testid="compatibility-dob-step"',
    '</section>',
    'pair.dob.scope',
  );
  const privacyBranches = extractTernaryBranchLiterals(
    owner,
    '<p className={styles.privacyNote}>\n            {userId',
    'CompatibilityGuestExperience.dobStep.privacy',
  );
  const anchors = [
    {
      sourceItemId: 'eyebrow',
      visibleText: extractJsxTextAfterOpeningTag(
        dobScope,
        '<p className={styles.eyebrow}>',
        'pair.dob.eyebrow',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'title',
      visibleText: extractJsxTextAfterOpeningTag(
        dobScope,
        '<h1 id="compatibility-title">',
        'pair.dob.title',
      ),
      copyRole: 'HEADING' as const,
    },
    {
      sourceItemId: 'lead',
      visibleText: extractJsxTextAfterOpeningTag(
        dobScope,
        '<p className={styles.lead}>',
        'pair.dob.lead',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'person_a_role',
      visibleText: extractJsxTextAfterNthOpeningTag(
        dobScope,
        '<span className={styles.inputRole}>',
        0,
        'pair.dob.person_a_role',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'person_a_label',
      visibleText: extractJsxTextAfterNthOpeningTag(
        dobScope,
        '<span className={styles.inputLabel}>',
        0,
        'pair.dob.person_a_label',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'person_b_role',
      visibleText: extractJsxTextAfterNthOpeningTag(
        dobScope,
        '<span className={styles.inputRole}>',
        1,
        'pair.dob.person_b_role',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'person_b_label',
      visibleText: extractJsxTextAfterNthOpeningTag(
        dobScope,
        '<span className={styles.inputLabel}>',
        1,
        'pair.dob.person_b_label',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'trust_strip_answerer',
      visibleText: extractJsxTextAfterNthOpeningTag(dobScope, '<li>', 0, 'pair.dob.trust_strip_answerer'),
      copyRole: 'BODY' as const,
    },
  ] as const;
  const componentEntries = anchors.map((item) =>
    reg({
      domainId: 'pair.dob.input',
      copyId: `pair.dob.input.${item.sourceItemId}`,
      surfaceId: 'm55:pair.entry',
      runtimeStateId: 'pair.dob.input',
      surfaceFamily: 'PAIR',
      copyRole: item.copyRole,
      sourceOwner: owner,
      sourceExport: 'CompatibilityGuestExperience.dobStep',
      sourceItemId: item.sourceItemId,
      textRef: `CompatibilityGuestExperience.dobStep.${item.sourceItemId}`,
      visibleText: item.visibleText,
    }),
  );
  componentEntries.push(
    reg({
      domainId: 'pair.dob.input',
      copyId: 'pair.dob.input.privacy_signed_in',
      surfaceId: 'm55:pair.entry',
      runtimeStateId: 'pair.dob.input',
      surfaceFamily: 'PAIR',
      copyRole: 'PRIVACY_SAFETY',
      sourceOwner: owner,
      sourceExport: 'CompatibilityGuestExperience.dobStep',
      sourceItemId: 'privacy_signed_in',
      textRef: 'CompatibilityGuestExperience.dobStep.privacy_signed_in',
      visibleText: privacyBranches.whenTrue,
    }),
    reg({
      domainId: 'pair.dob.input',
      copyId: 'pair.dob.input.privacy_guest',
      surfaceId: 'm55:pair.entry',
      runtimeStateId: 'pair.dob.input',
      surfaceFamily: 'PAIR',
      copyRole: 'PRIVACY_SAFETY',
      sourceOwner: owner,
      sourceExport: 'CompatibilityGuestExperience.dobStep',
      sourceItemId: 'privacy_guest',
      textRef: 'CompatibilityGuestExperience.dobStep.privacy_guest',
      visibleText: privacyBranches.whenFalse,
    }),
  );
  const structureOwner = 'lib/m55/compatibility/pairReadingPublicStructure.ts';
  const structure = [
    ...PAIR_READING_FREE_STRUCTURE_ITEMS.map((item) =>
      reg({
        domainId: 'pair.dob.input',
        copyId: `pair.dob.input.structure.${item.index}`,
        surfaceId: 'm55:pair.entry',
        runtimeStateId: 'pair.dob.input',
        surfaceFamily: 'PAIR',
        copyRole: 'HEADING',
        sourceOwner: structureOwner,
        sourceExport: 'PAIR_READING_FREE_STRUCTURE_ITEMS',
        sourceItemId: item.index,
        textRef: `PAIR_READING_FREE_STRUCTURE_ITEMS.${item.index}.titleJa`,
        visibleText: item.titleJa,
      }),
    ),
    ...PAIR_READING_GUEST_SUPPORT_LINES.map((line, index) =>
      reg({
        domainId: 'pair.dob.input',
        copyId: `pair.dob.input.support.${index}`,
        surfaceId: 'm55:pair.entry',
        runtimeStateId: 'pair.dob.input',
        surfaceFamily: 'PAIR',
        copyRole: 'PRIVACY_SAFETY',
        sourceOwner: structureOwner,
        sourceExport: 'PAIR_READING_GUEST_SUPPORT_LINES',
        sourceItemId: String(index),
        textRef: `PAIR_READING_GUEST_SUPPORT_LINES[${index}]`,
        visibleText: line,
      }),
    ),
  ];
  return [...componentEntries, ...structure];
}

function pairValidationRegistrations(): M55ClosureSourceRegistration[] {
  const guestOwner = 'lib/m55/compatibility/pairReadingGuestResult.ts';
  const authority = [
    {
      sourceItemId: 'invalid_dob',
      structuralAnchor: 'if (!isCompleteCompatibilityGuestInput(guestInput)) {\n    return { ok: false, message: ',
      contextLabel: 'buildCompatibilityPublicResult.invalid_dob',
      textRef: 'buildCompatibilityPublicResult.invalid_dob',
    },
    {
      sourceItemId: 'invalid_stage',
      structuralAnchor: 'if (!isValidCompatibilityRelationStatusId(relationStatusId)) {\n    return { ok: false, message: ',
      contextLabel: 'buildCompatibilityPublicResult.invalid_stage',
      textRef: 'buildCompatibilityPublicResult.invalid_stage',
    },
  ] as const;
  const fromAuthority = authority.map((item) =>
    reg({
      domainId: 'pair.validation.error.empty.loading',
      copyId: `pair.validation.${item.sourceItemId}`,
      surfaceId: 'm55:pair.entry',
      runtimeStateId: 'pair.validation.error',
      surfaceFamily: 'PAIR',
      copyRole: 'VALIDATION',
      sourceOwner: guestOwner,
      sourceExport: 'buildCompatibilityPublicResult',
      sourceItemId: item.sourceItemId,
      textRef: item.textRef,
      visibleText: extractStringLiteralAfterStructuralAnchor(
        guestOwner,
        item.structuralAnchor,
        item.contextLabel,
      ),
    }),
  );
  const componentOwner = 'components/compatibility/CompatibilityGuestExperience.tsx';
  const uiErrors = [
    {
      sourceItemId: 'ui_0',
      structuralAnchor: 'if (!complete) {\n      setError(',
      contextLabel: 'CompatibilityGuestExperience.startRelationStage.dob',
    },
    {
      sourceItemId: 'ui_1',
      structuralAnchor: 'function startQuestionnaire() {\n    if (!relationStatusId) {\n      setError(',
      contextLabel: 'CompatibilityGuestExperience.startQuestionnaire.stage',
    },
    {
      sourceItemId: 'ui_2',
      structuralAnchor: '!isCompleteCompatibilityCurrentContextV2(answers, relationStatusId)) {\n      setError(',
      contextLabel: 'CompatibilityGuestExperience.goNext.context',
    },
  ] as const;
  const fromUi = uiErrors.map((item) =>
    reg({
      domainId: 'pair.validation.error.empty.loading',
      copyId: `pair.validation.${item.sourceItemId}`,
      surfaceId: 'm55:pair.entry',
      runtimeStateId: 'pair.validation.error',
      surfaceFamily: 'PAIR',
      copyRole: 'ERROR',
      sourceOwner: componentOwner,
      sourceExport: 'CompatibilityGuestExperience.setError',
      sourceItemId: item.sourceItemId,
      textRef: `CompatibilityGuestExperience.setError.${item.sourceItemId}`,
      visibleText: extractStringLiteralAfterStructuralAnchor(
        componentOwner,
        item.structuralAnchor,
        item.contextLabel,
      ),
    }),
  );
  return [...fromAuthority, ...fromUi];
}

function pairAuthTransitionRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'components/compatibility/CompatibilityPurchaseExperience.tsx';
  const signInScope = readUniqueScopeSlice(owner, 'function SignInBoundary()', 'pair.auth.sign_in_boundary');
  const recoveryScope = readUniqueScopeSlice(
    owner,
    'data-testid="compatibility-purchase-recovery"',
    'pair.auth.recovery_boundary',
  );
  return [
    reg({
      domainId: 'pair.auth.transition',
      copyId: 'pair.auth.heading',
      surfaceId: 'm55:pair.purchase.confirmation',
      runtimeStateId: 'pair.auth.transition',
      surfaceFamily: 'PAIR',
      copyRole: 'HEADING',
      sourceOwner: owner,
      sourceExport: 'CompatibilityPurchaseExperience.authBoundary',
      sourceItemId: 'heading',
      textRef: 'CompatibilityPurchaseExperience.authBoundary.heading',
      visibleText: extractJsxTextAfterOpeningTag(
        signInScope,
        'data-testid="compatibility-sign-in-boundary">\n      <h2>',
        'pair.auth.heading',
      ),
    }),
    reg({
      domainId: 'pair.auth.transition',
      copyId: 'pair.auth.body',
      surfaceId: 'm55:pair.purchase.confirmation',
      runtimeStateId: 'pair.auth.transition',
      surfaceFamily: 'PAIR',
      copyRole: 'BODY',
      sourceOwner: owner,
      sourceExport: 'CompatibilityPurchaseExperience.authBoundary',
      sourceItemId: 'body',
      textRef: 'CompatibilityPurchaseExperience.authBoundary.body',
      visibleText: extractJsxTextAfterOpeningTag(
        signInScope,
        '</h2>\n      <p>',
        'pair.auth.body',
      ),
    }),
    reg({
      domainId: 'pair.auth.transition',
      copyId: 'pair.auth.cta',
      surfaceId: 'm55:pair.purchase.confirmation',
      runtimeStateId: 'pair.auth.transition',
      surfaceFamily: 'PAIR',
      copyRole: 'CTA',
      sourceOwner: owner,
      sourceExport: 'CompatibilityPurchaseExperience.authBoundary',
      sourceItemId: 'cta',
      textRef: 'CompatibilityPurchaseExperience.authBoundary.cta',
      visibleText: extractJsxTextAfterOpeningTag(
        signInScope,
        '<SignInButton mode="modal">\n        <button type="button" className={styles.primary}>',
        'pair.auth.cta',
      ),
    }),
    reg({
      domainId: 'pair.auth.transition',
      copyId: 'pair.auth.recovery_heading',
      surfaceId: 'm55:pair.purchase.confirmation',
      runtimeStateId: 'pair.auth.transition',
      surfaceFamily: 'PAIR',
      copyRole: 'HEADING',
      sourceOwner: owner,
      sourceExport: 'CompatibilityPurchaseExperience.authBoundary',
      sourceItemId: 'recovery_heading',
      textRef: 'CompatibilityPurchaseExperience.authBoundary.recovery_heading',
      visibleText: extractJsxTextAfterOpeningTag(
        recoveryScope,
        'data-testid="compatibility-purchase-recovery">\n          <h2>',
        'pair.auth.recovery_heading',
      ),
    }),
    reg({
      domainId: 'pair.auth.transition',
      copyId: 'pair.auth.recovery_body',
      surfaceId: 'm55:pair.purchase.confirmation',
      runtimeStateId: 'pair.auth.transition',
      surfaceFamily: 'PAIR',
      copyRole: 'BODY',
      sourceOwner: owner,
      sourceExport: 'CompatibilityPurchaseExperience.authBoundary',
      sourceItemId: 'recovery_body',
      textRef: 'CompatibilityPurchaseExperience.authBoundary.recovery_body',
      visibleText: extractJsxTextAfterOpeningTag(
        recoveryScope,
        '</h2>\n          <p>',
        'pair.auth.recovery_body',
      ),
    }),
  ];
}

function pairFreeResultRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'lib/m55/compatibility/pairReadingFragments.v1.ts';
  const entries: M55ClosureSourceRegistration[] = [];
  entries.push(
    ...fromObjectEntries(
      'pair.free.result',
      'm55:pair.free.result',
      'pair.free.result.body',
      'PAIR',
      'BODY',
      owner,
      'PAIR_AXIS_TEASER_OPENERS',
      'pair.free.result.teaser',
      Object.entries(PAIR_AXIS_TEASER_OPENERS),
    ),
  );
  for (const [axisId, fragment] of Object.entries(PAIR_AXIS_FREE_RESULT_FRAGMENTS)) {
    for (const field of ['overlap', 'difference', 'perspectiveOne', 'perspectiveTwo', 'dynamicOutcome'] as const) {
      entries.push(
        reg({
          domainId: 'pair.free.result',
          copyId: `pair.free.result.fragment.${axisId}.${field}`,
          surfaceId: 'm55:pair.free.result',
          runtimeStateId: 'pair.free.result.body',
          surfaceFamily: 'PAIR',
          copyRole: 'BODY',
          sourceOwner: owner,
          sourceExport: 'PAIR_AXIS_FREE_RESULT_FRAGMENTS',
          sourceItemId: `${axisId}.${field}`,
          textRef: `PAIR_AXIS_FREE_RESULT_FRAGMENTS.${axisId}.${field}`,
          visibleText: fragment[field],
        }),
      );
    }
  }
  entries.push(
    ...fromObjectEntries(
      'pair.free.result',
      'm55:pair.free.result',
      'pair.free.result.body',
      'PAIR',
      'BODY',
      owner,
      'PAIR_AXIS_GAP_BODIES',
      'pair.free.result.gap',
      Object.entries(PAIR_AXIS_GAP_BODIES),
    ),
    ...fromObjectEntries(
      'pair.free.result',
      'm55:pair.free.result',
      'pair.free.result.body',
      'PAIR',
      'BODY',
      owner,
      'TOPIC_TEASER_BRIDGES',
      'pair.free.result.bridge',
      Object.entries(TOPIC_TEASER_BRIDGES),
    ),
  );
  return entries;
}

function pairPaidReportRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'lib/m55/compatibility/pairReadingFragments.v1.ts';
  const entries: M55ClosureSourceRegistration[] = [
    ...fromObjectEntries(
      'pair.paid.report',
      'm55:pair.paid.report',
      'pair.paid.report.body',
      'PAIR',
      'BODY',
      owner,
      'TOPIC_DEEP_BODIES',
      'pair.paid.report.deep',
      Object.entries(TOPIC_DEEP_BODIES),
    ),
    ...fromObjectEntries(
      'pair.paid.report',
      'm55:pair.paid.report',
      'pair.paid.report.body',
      'PAIR',
      'BODY',
      owner,
      'TOPIC_CLUE_CORE',
      'pair.paid.report.clue',
      Object.entries(TOPIC_CLUE_CORE),
    ),
    reg({
      domainId: 'pair.paid.report',
      copyId: 'pair.paid.report.person_a_body',
      surfaceId: 'm55:pair.paid.report',
      runtimeStateId: 'pair.paid.report.body',
      surfaceFamily: 'PAIR',
      copyRole: 'BODY',
      sourceOwner: owner,
      sourceExport: 'PERSON_A_BODY',
      sourceItemId: 'body',
      textRef: 'PERSON_A_BODY',
      visibleText: PERSON_A_BODY,
    }),
    reg({
      domainId: 'pair.paid.report',
      copyId: 'pair.paid.report.person_b_body',
      surfaceId: 'm55:pair.paid.report',
      runtimeStateId: 'pair.paid.report.body',
      surfaceFamily: 'PAIR',
      copyRole: 'BODY',
      sourceOwner: owner,
      sourceExport: 'PERSON_B_BODY',
      sourceItemId: 'body',
      textRef: 'PERSON_B_BODY',
      visibleText: PERSON_B_BODY,
    }),
  ];
  for (const [topicId, fragment] of Object.entries(TOPIC_IMMEDIATE_ACTIONS)) {
    for (const field of ['situation', 'action'] as const) {
      entries.push(
        reg({
          domainId: 'pair.paid.report',
          copyId: `pair.paid.report.action.${topicId}.${field}`,
          surfaceId: 'm55:pair.paid.report',
          runtimeStateId: 'pair.paid.report.body',
          surfaceFamily: 'PAIR',
          copyRole: 'BODY',
          sourceOwner: owner,
          sourceExport: 'TOPIC_IMMEDIATE_ACTIONS',
          sourceItemId: `${topicId}.${field}`,
          textRef: `TOPIC_IMMEDIATE_ACTIONS.${topicId}.${field}`,
          visibleText: fragment[field],
        }),
      );
    }
  }
  return entries;
}

function pairOwnedReportRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'components/compatibility/CompatibilityPurchaseExperience.tsx';
  const source = readOwnerSource(owner);
  const successScope = readJsxScopeSlice(
    source,
    'data-testid="compatibility-purchase-processing"',
    '</main>',
    'pair.owned.success_scope',
  );
  const anchors = [
    {
      sourceItemId: 'eyebrow',
      visibleText: extractJsxTextAfterOpeningTag(
        successScope,
        '<p className={styles.eyebrow}>',
        'pair.owned.eyebrow',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'heading',
      visibleText: extractJsxTextAfterOpeningTag(successScope, '<h1>', 'pair.owned.heading'),
      copyRole: 'HEADING' as const,
    },
    {
      sourceItemId: 'lead',
      visibleText: extractJsxTextAfterOpeningTag(
        successScope,
        '<p className={styles.lead}>',
        'pair.owned.lead',
      ),
      copyRole: 'BODY' as const,
    },
    {
      sourceItemId: 'my_cta',
      visibleText: extractJsxTextAfterOpeningTag(
        successScope,
        '<Link className={styles.primaryLink} href="/my">',
        'pair.owned.my_cta',
      ),
      copyRole: 'CTA' as const,
    },
    {
      sourceItemId: 'return_cta',
      visibleText: extractJsxTextAfterOpeningTag(
        successScope,
        '<Link className={styles.quietLink} href="/synastry">',
        'pair.owned.return_cta',
      ),
      copyRole: 'CTA' as const,
    },
  ] as const;
  return anchors.map((item) =>
    reg({
      domainId: 'pair.owned.report',
      copyId: `pair.owned.report.${item.sourceItemId}`,
      surfaceId: 'm55:pair.purchase.processing',
      runtimeStateId: 'pair.owned.report',
      surfaceFamily: 'PAIR',
      copyRole: item.copyRole,
      sourceOwner: owner,
      sourceExport: 'CompatibilityPurchaseSuccess',
      sourceItemId: item.sourceItemId,
      textRef: `CompatibilityPurchaseSuccess.${item.sourceItemId}`,
      visibleText: item.visibleText,
    }),
  );
}

function sharedSupportHelpRegistrations(): M55ClosureSourceRegistration[] {
  const footerOwner = 'app/_components/PublicFooter.tsx';
  const footerLabels = [
    { sourceItemId: 'support', href: '/support' },
    { sourceItemId: 'refund', href: '/legal/refund' },
    { sourceItemId: 'terms', href: '/legal/terms' },
    { sourceItemId: 'privacy', href: '/legal/privacy' },
    { sourceItemId: 'tokushoho', href: '/legal/tokushoho' },
  ] as const;
  const footerEntries = footerLabels.map((item) =>
    reg({
      domainId: 'shared.support.help',
      copyId: `shared.support.footer.${item.sourceItemId}`,
      surfaceId: 'm55:shared.footer',
      runtimeStateId: 'shared.support.help',
      surfaceFamily: 'SHARED',
      copyRole: 'HELP',
      sourceOwner: footerOwner,
      sourceExport: 'PublicFooter.SUPPORT_LEGAL_GROUP',
      sourceItemId: item.sourceItemId,
      textRef: `PublicFooter.SUPPORT_LEGAL_GROUP.${item.sourceItemId}`,
      visibleText: extractRecordLabelLiteralByHref(
        footerOwner,
        item.href,
        `PublicFooter.${item.sourceItemId}`,
      ),
    }),
  );
  const methodOwner = 'lib/m55/method/m55MethodAuthority.ts';
  return [
    ...footerEntries,
    reg({
      domainId: 'shared.support.help',
      copyId: 'shared.support.method.link',
      surfaceId: 'm55:shared.footer',
      runtimeStateId: 'shared.support.help',
      surfaceFamily: 'SHARED',
      copyRole: 'HELP',
      sourceOwner: methodOwner,
      sourceExport: 'M55_METHOD_ROUTE_LINK_LABEL_JA',
      sourceItemId: 'link',
      textRef: 'M55_METHOD_ROUTE_LINK_LABEL_JA',
      visibleText: M55_METHOD_ROUTE_LINK_LABEL_JA,
    }),
  ];
}

function sharedValidationErrorRegistrations(): M55ClosureSourceRegistration[] {
  const owner = 'lib/m55/purchaseCheckoutStartedAction.ts';
  return Object.entries(PURCHASE_CHECKOUT_PUBLIC_ERRORS).map(([key, visibleText]) =>
    reg({
      domainId: 'shared.validation.error',
      copyId: `shared.validation.checkout.${key}`,
      surfaceId: 'm55:shared.purchase',
      runtimeStateId: 'shared.validation.error',
      surfaceFamily: 'SHARED',
      copyRole: 'ERROR',
      sourceOwner: owner,
      sourceExport: 'PURCHASE_CHECKOUT_PUBLIC_ERRORS',
      sourceItemId: key,
      textRef: `PURCHASE_CHECKOUT_PUBLIC_ERRORS.${key}`,
      visibleText,
    }),
  );
}

function sharedEmptyLoadingRegistrations(): M55ClosureSourceRegistration[] {
  const pairOwner = 'components/compatibility/CompatibilityPurchaseExperience.tsx';
  const entries: M55ClosureSourceRegistration[] = [
    reg({
      domainId: 'shared.empty.loading',
      copyId: 'shared.loading.pair.prepare_purchase',
      surfaceId: 'm55:pair.purchase.confirmation',
      runtimeStateId: 'shared.empty.loading',
      surfaceFamily: 'SHARED',
      copyRole: 'LOADING',
      sourceOwner: pairOwner,
      sourceExport: 'CompatibilityPurchaseExperience',
      sourceItemId: 'prepare_purchase',
      textRef: 'CompatibilityPurchaseExperience.inputReady',
      visibleText: extractJsxTextAfterOpeningTag(
        readOwnerSource(pairOwner),
        '<p className={styles.inputReady}>',
        'CompatibilityPurchaseExperience.inputReady',
      ),
    }),
    reg({
      domainId: 'shared.empty.loading',
      copyId: 'shared.loading.pair.checkout',
      surfaceId: 'm55:pair.purchase.confirmation',
      runtimeStateId: 'shared.empty.loading',
      surfaceFamily: 'SHARED',
      copyRole: 'LOADING',
      sourceOwner: pairOwner,
      sourceExport: 'CompatibilityPurchaseExperience',
      sourceItemId: 'checkout_loading',
      textRef: 'CompatibilityPurchaseExperience.checkoutLoading',
      visibleText: extractStringLiteralAfterStructuralAnchor(
        pairOwner,
        'aria-busy={loading}\n          >\n            {loading ? ',
        'CompatibilityPurchaseExperience.checkoutLoading',
      ),
    }),
  ];
  const quietOwner = 'components/QuietPolling.tsx';
  const quietScope = readOwnerSource(quietOwner);
  entries.push(
    reg({
      domainId: 'shared.empty.loading',
      copyId: 'shared.loading.quiet_poll.active',
      surfaceId: 'm55:shared.purchase.success',
      runtimeStateId: 'shared.empty.loading',
      surfaceFamily: 'SHARED',
      copyRole: 'LOADING',
      sourceOwner: quietOwner,
      sourceExport: 'QuietPolling',
      sourceItemId: 'active',
      textRef: 'QuietPolling.active',
      visibleText: extractJsxTextAfterOpeningTag(
        quietScope,
        '{count < max ? (\n        <p style={{ margin: 0 }}>',
        'QuietPolling.active',
      ),
    }),
    reg({
      domainId: 'shared.empty.loading',
      copyId: 'shared.loading.quiet_poll.fallback',
      surfaceId: 'm55:shared.purchase.success',
      runtimeStateId: 'shared.empty.loading',
      surfaceFamily: 'SHARED',
      copyRole: 'LOADING',
      sourceOwner: quietOwner,
      sourceExport: 'QuietPolling',
      sourceItemId: 'fallback',
      textRef: 'QuietPolling.fallback',
      visibleText: extractJsxTextAfterOpeningTag(
        quietScope,
        ') : (\n        <p style={{ margin: 0 }}>',
        'QuietPolling.fallback',
      ),
    }),
  );
  const dtrOwner = 'app/dtr/processing/page.tsx';
  const dtrProcessingBranches = extractTernaryBranchLiterals(
    dtrOwner,
    'description={\n          hiddenOnlyRepurchase',
    'DtrProcessingPage.loadingCopy',
  );
  entries.push(
    reg({
      domainId: 'shared.empty.loading',
      copyId: 'shared.loading.dtr.processing',
      surfaceId: 'm55:self.owned.report',
      runtimeStateId: 'shared.empty.loading',
      surfaceFamily: 'SHARED',
      copyRole: 'LOADING',
      sourceOwner: dtrOwner,
      sourceExport: 'DtrProcessingPage',
      sourceItemId: 'processing_copy',
      textRef: 'DtrProcessingPage.loadingCopy',
      visibleText: dtrProcessingBranches.whenFalse,
    }),
  );
  return entries;
}

function sharedAuthRegistrations(): M55ClosureSourceRegistration[] {
  const purchaseOwner = 'components/PurchaseButton.tsx';
  const purchaseSource = readOwnerSource(purchaseOwner);
  const entries: M55ClosureSourceRegistration[] = [
    reg({
      domainId: 'shared.auth',
      copyId: 'shared.auth.purchase.sign_in_prompt',
      surfaceId: 'm55:shared.purchase',
      runtimeStateId: 'shared.auth',
      surfaceFamily: 'SHARED',
      copyRole: 'BODY',
      sourceOwner: purchaseOwner,
      sourceExport: 'PurchaseButton',
      sourceItemId: 'sign_in_prompt',
      textRef: 'PurchaseButton.needsSignIn',
      visibleText: extractJsxTextAfterOpeningTag(
        purchaseSource,
        '{needsSignIn && (\n        <p role="alert" className="m55-purchase-button-alert">',
        'PurchaseButton.needsSignIn.prompt',
      ).replace(/\s+$/, ''),
    }),
    reg({
      domainId: 'shared.auth',
      copyId: 'shared.auth.purchase.sign_in_link',
      surfaceId: 'm55:shared.purchase',
      runtimeStateId: 'shared.auth',
      surfaceFamily: 'SHARED',
      copyRole: 'CTA',
      sourceOwner: purchaseOwner,
      sourceExport: 'PurchaseButton',
      sourceItemId: 'sign_in_link',
      textRef: 'PurchaseButton.signInHref',
      visibleText: extractJsxTextAfterOpeningTag(
        purchaseSource,
        '<a href={signInHref}',
        'PurchaseButton.needsSignIn.link',
      ),
    }),
    reg({
      domainId: 'shared.auth',
      copyId: 'shared.auth.purchase.profile_prompt',
      surfaceId: 'm55:shared.purchase',
      runtimeStateId: 'shared.auth',
      surfaceFamily: 'SHARED',
      copyRole: 'BODY',
      sourceOwner: purchaseOwner,
      sourceExport: 'PurchaseButton',
      sourceItemId: 'profile_prompt',
      textRef: 'PurchaseButton.needsProfile',
      visibleText: extractJsxTextAfterOpeningTag(
        purchaseSource,
        '{needsProfile && (\n        <p role="alert" className="m55-purchase-button-alert">',
        'PurchaseButton.needsProfile.prompt',
      ).replace(/\s+$/, ''),
    }),
  ];
  const upgradeOwner = 'components/dtr/LightToFullUpgradeButton.tsx';
  const upgradeCodes = [
    'unauthenticated',
    'forbidden_not_owner',
    'wallet_not_found',
    'cap_reached',
    'invalid_product',
    'stripe_error',
  ] as const;
  for (const code of upgradeCodes) {
    entries.push(
      reg({
        domainId: 'shared.auth',
        copyId: `shared.auth.upgrade.${code}`,
        surfaceId: 'm55:self.owned.report',
        runtimeStateId: 'shared.auth',
        surfaceFamily: 'SHARED',
        copyRole: 'ERROR',
        sourceOwner: upgradeOwner,
        sourceExport: 'messageForUpgradeCheckoutError',
        sourceItemId: code,
        textRef: `messageForUpgradeCheckoutError.${code}`,
        visibleText: extractCaseBranchReturnLiteral(upgradeOwner, code),
      }),
    );
  }
  return entries;
}

const DOMAIN_BUILDERS: Record<M55ClosurePlaceholderDomainId, () => M55ClosureSourceRegistration[]> = {
  'self.validation.error.empty.loading': selfValidationRegistrations,
  'self.auth.transition': selfAuthTransitionRegistrations,
  'self.free.result': selfFreeResultRegistrations,
  'self.paid.report': selfPaidReportRegistrations,
  'self.owned.report': selfOwnedReportRegistrations,
  'pair.dob.input': pairDobInputRegistrations,
  'pair.validation.error.empty.loading': pairValidationRegistrations,
  'pair.auth.transition': pairAuthTransitionRegistrations,
  'pair.free.result': pairFreeResultRegistrations,
  'pair.paid.report': pairPaidReportRegistrations,
  'pair.owned.report': pairOwnedReportRegistrations,
  'shared.support.help': sharedSupportHelpRegistrations,
  'shared.validation.error': sharedValidationErrorRegistrations,
  'shared.empty.loading': sharedEmptyLoadingRegistrations,
  'shared.auth': sharedAuthRegistrations,
};

export function buildM55ClosureSourceRegistrations(): readonly M55ClosureSourceRegistration[] {
  const registrations: M55ClosureSourceRegistration[] = [];
  for (const domainId of M55_CLOSURE_PLACEHOLDER_DOMAIN_IDS) {
    const built = DOMAIN_BUILDERS[domainId]();
    if (built.length === 0) {
      throw new Error(`closure domain produced zero identities: ${domainId}`);
    }
    registrations.push(...built);
  }
  const copyIds = new Set<string>();
  for (const entry of registrations) {
    if (copyIds.has(entry.copyId)) {
      throw new Error(`closure duplicate copyId: ${entry.copyId}`);
    }
    copyIds.add(entry.copyId);
  }
  return registrations;
}

export function buildM55ClosureSourceIdentities(): readonly M55ClosureSourceCopyIdentity[] {
  return buildM55ClosureSourceRegistrations().map((entry) => ({
    domainId: entry.domainId,
    sourceOwner: entry.sourceOwner,
    sourceExport: entry.sourceExport,
    sourceItemId: entry.sourceItemId,
    expectedCopyId: entry.copyId,
    textRef: entry.textRef,
    sourceFingerprint: buildSourceIdentityFingerprint({
      sourceOwner: entry.sourceOwner,
      sourceExport: entry.sourceExport,
      sourceItemId: entry.sourceItemId,
      expectedCopyId: entry.copyId,
      textRef: entry.textRef,
      visibleText: entry.visibleText,
    }),
  }));
}

export function toGovernedCopyEntry(entry: M55ClosureSourceRegistration): GovernedCopyEntry {
  return {
    copyId: entry.copyId,
    surfaceId: entry.surfaceId,
    runtimeStateId: entry.runtimeStateId,
    surfaceFamily: entry.surfaceFamily,
    copyRole: entry.copyRole,
    sourceOwner: entry.sourceOwner,
    audienceContext: entry.audienceContext,
    textRef: entry.textRef,
    visibleText: entry.visibleText,
  };
}

export function buildM55ClosureGovernedCopyEntries(): readonly GovernedCopyEntry[] {
  return buildM55ClosureSourceRegistrations().map(toGovernedCopyEntry);
}

/** Fail-closed extraction self-test for ambiguous or missing anchors. */
export function assertClosureSourceExtractionIntegrity(): void {
  runClosureExtractionNegativeControls();
  buildM55ClosureSourceRegistrations();
}
