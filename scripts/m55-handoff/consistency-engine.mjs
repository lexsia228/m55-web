import { safeRead, stableJson } from './engine.mjs';

export const CONSISTENCY_OUTCOMES = ['PASS', 'CURRENT_DEBT', 'REVIEW_REQUIRED', 'EXCLUDED', 'FAIL'];
export const EVIDENCE_LEVELS = ['SOURCE_STATIC', 'RUNTIME_VERIFIED', 'VISUAL_CAPTURE', 'HUMAN_APPROVED'];
const OUTCOME_ORDER = new Map(CONSISTENCY_OUTCOMES.map((value, index) => [value, index]));

export function repositoryReader(repo) {
  return (relativePath) => safeRead(repo, relativePath);
}

export function memoryReader(files) {
  return (relativePath) => {
    if (!Object.hasOwn(files, relativePath)) throw new Error(`ENOENT:${relativePath}`);
    return files[relativePath];
  };
}

function reasonCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function codePointCompare(left, right) {
  const a = Array.from(String(left), (character) => character.codePointAt(0));
  const b = Array.from(String(right), (character) => character.codePointAt(0));
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const plainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const repositoryRelativePath = (value) => nonEmptyString(value)
  && !/^(?:[A-Za-z]:[\\/]|[\\/]{1,2})/.test(value)
  && !value.split(/[\\/]+/).includes('..');

export function normalizeSemanticString(value) {
  return typeof value === 'string' ? value.normalize('NFC') : value;
}

export function canonicalRepositoryReference(value) {
  if (!repositoryRelativePath(value)) throw new Error('INVALID_REPOSITORY_REFERENCE');
  return normalizeSemanticString(value.replaceAll('\\', '/'));
}

export function normalizeSemanticData(value) {
  if (typeof value === 'string') return normalizeSemanticString(value);
  if (Array.isArray(value)) return value.map(normalizeSemanticData);
  if (plainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeSemanticData(item)]));
  return value;
}

const canonicalStrings = (values, { references = false } = {}) => [...values]
  .map((value) => references ? canonicalRepositoryReference(value) : normalizeSemanticString(value))
  .sort(codePointCompare);

function diagnostic(diagnostics, ruleId, section, expected) {
  diagnostics.push({ ruleId, section, expected });
}

function stringArray(value, section, diagnostics, { required = false, paths = false } = {}) {
  if (value === undefined && !required) return null;
  if (!Array.isArray(value)) {
    diagnostic(diagnostics, 'manifest.nested_schema.valid', section, 'An array when the collection is present.');
    return null;
  }
  value.forEach((item, index) => {
    if (!(paths ? repositoryRelativePath(item) : nonEmptyString(item))) {
      diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}[${index}]`, paths ? 'A non-empty repository-relative path.' : 'A non-empty string.');
    }
  });
  return value;
}

function objectArray(value, section, diagnostics, validateItem) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) {
    diagnostic(diagnostics, 'manifest.nested_schema.valid', section, 'An array when the collection is present.');
    return null;
  }
  value.forEach((item, index) => validateItem(item, `${section}[${index}]`, diagnostics));
  return value;
}

function requireStrings(item, fields, section, diagnostics) {
  for (const field of fields) {
    if (!nonEmptyString(item?.[field])) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.${field}`, 'A non-empty string.');
  }
}

function optionalString(item, field, section, diagnostics) {
  if (Object.hasOwn(item, field) && !nonEmptyString(item[field])) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.${field}`, 'A non-empty string when present.');
}

function optionalBoolean(item, field, section, diagnostics) {
  if (Object.hasOwn(item, field) && typeof item[field] !== 'boolean') diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.${field}`, 'A boolean when present.');
}

function validatePathValue(item, section, diagnostics, valueField = 'value') {
  if (!plainObject(item)) {
    diagnostic(diagnostics, 'manifest.nested_schema.valid', section, 'An object with required typed fields.');
    return;
  }
  if (!repositoryRelativePath(item.path)) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.path`, 'A non-empty repository-relative path.');
  if (!nonEmptyString(item[valueField])) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.${valueField}`, 'A non-empty string.');
  optionalBoolean(item, 'blocking', section, diagnostics);
}

function validateHumanReview(item, section, diagnostics) {
  if (!plainObject(item)) {
    diagnostic(diagnostics, 'manifest.nested_schema.valid', section, 'An object containing ruleId and summary.');
    return;
  }
  requireStrings(item, ['ruleId', 'summary'], section, diagnostics);
  for (const field of ['expected', 'observed', 'nextAction']) optionalString(item, field, section, diagnostics);
  stringArray(item.authorityRefs, `${section}.authorityRefs`, diagnostics, { paths: true });
  stringArray(item.sourceRefs, `${section}.sourceRefs`, diagnostics, { paths: true });
  if (Object.hasOwn(item, 'evidenceLevel') && !EVIDENCE_LEVELS.includes(item.evidenceLevel)) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.evidenceLevel`, `One of: ${EVIDENCE_LEVELS.join(', ')}.`);
  optionalBoolean(item, 'blocking', section, diagnostics);
}

function validateSurface(surface, index, diagnostics) {
  const section = `surfaces[${index}]`;
  if (!plainObject(surface)) {
    diagnostic(diagnostics, 'manifest.surface.valid', section, 'A surface object.');
    return;
  }
  for (const field of ['id', 'route']) {
    if (!nonEmptyString(surface[field])) diagnostic(diagnostics, 'manifest.surface.valid', `${section}.${field}`, 'A non-empty string.');
  }
  if (!['current', 'target', 'excluded'].includes(surface.status)) diagnostic(diagnostics, 'manifest.surface.valid', `${section}.status`, 'One of: current, target, excluded.');
  optionalString(surface, 'journeyGroup', section, diagnostics);
  optionalBoolean(surface, 'targetPresentedAsLive', section, diagnostics);

  const sources = stringArray(surface.sourcePaths, `${section}.sourcePaths`, diagnostics, { required: true, paths: true });
  const authorities = stringArray(surface.authoritySources, `${section}.authoritySources`, diagnostics, { required: true, paths: true });
  if ((surface.status === 'current' || surface.status === 'target') && (!sources || sources.length === 0)) diagnostic(diagnostics, 'manifest.surface_evidence.empty', `${section}.sourcePaths`, 'At least one source path for a covered surface.');
  if (!authorities || authorities.length === 0) diagnostic(diagnostics, 'manifest.surface_evidence.empty', `${section}.authoritySources`, 'At least one authority source.');
  if (surface.status === 'excluded' && !nonEmptyString(surface.exclusionReason)) diagnostic(diagnostics, 'manifest.surface.valid', `${section}.exclusionReason`, 'A non-empty exclusion reason.');

  if (Object.hasOwn(surface, 'layout')) {
    if (!plainObject(surface.layout)) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.layout`, 'An object when present.');
    else {
      optionalString(surface.layout, 'family', `${section}.layout`, diagnostics);
      objectArray(surface.layout.markers, `${section}.layout.markers`, diagnostics, validatePathValue);
    }
  }
  if (Object.hasOwn(surface, 'tokens')) {
    if (!plainObject(surface.tokens)) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.tokens`, 'An object when present.');
    else objectArray(surface.tokens.forbiddenRawValues, `${section}.tokens.forbiddenRawValues`, diagnostics, validatePathValue);
  }
  if (Object.hasOwn(surface, 'terminology')) {
    if (!plainObject(surface.terminology)) diagnostic(diagnostics, 'manifest.nested_schema.valid', `${section}.terminology`, 'An object when present.');
    else {
      objectArray(surface.terminology.required, `${section}.terminology.required`, diagnostics, validatePathValue);
      objectArray(surface.terminology.prohibited, `${section}.terminology.prohibited`, diagnostics, validatePathValue);
    }
  }
  objectArray(surface.ctas, `${section}.ctas`, diagnostics, (item, itemSection, itemDiagnostics) => {
    if (!plainObject(item)) {
      diagnostic(itemDiagnostics, 'manifest.nested_schema.valid', itemSection, 'An object containing path and at least one CTA contract field.');
      return;
    }
    if (!repositoryRelativePath(item.path)) diagnostic(itemDiagnostics, 'manifest.nested_schema.valid', `${itemSection}.path`, 'A non-empty repository-relative path.');
    const fields = ['label', 'href', 'role', 'hierarchy'];
    if (!fields.some((field) => nonEmptyString(item[field]))) diagnostic(itemDiagnostics, 'manifest.nested_schema.valid', itemSection, 'At least one non-empty label, href, role, or hierarchy field.');
    fields.forEach((field) => optionalString(item, field, itemSection, itemDiagnostics));
    optionalBoolean(item, 'blocking', itemSection, itemDiagnostics);
  });
  objectArray(surface.responsiveEvidence, `${section}.responsiveEvidence`, diagnostics, (item, itemSection, itemDiagnostics) => {
    validatePathValue(item, itemSection, itemDiagnostics, 'marker');
    if (plainObject(item)) optionalString(item, 'label', itemSection, itemDiagnostics);
  });
  objectArray(surface.currentDebt, `${section}.currentDebt`, diagnostics, (item, itemSection, itemDiagnostics) => {
    if (!plainObject(item)) {
      diagnostic(itemDiagnostics, 'manifest.nested_schema.valid', itemSection, 'An object containing the declared debt fields.');
      return;
    }
    requireStrings(item, ['ruleId', 'observedMarker', 'expected', 'observed', 'summary'], itemSection, itemDiagnostics);
    if (!repositoryRelativePath(item.path)) diagnostic(itemDiagnostics, 'manifest.nested_schema.valid', `${itemSection}.path`, 'A non-empty repository-relative path.');
    optionalString(item, 'nextAction', itemSection, itemDiagnostics);
    stringArray(item.authorityRefs, `${itemSection}.authorityRefs`, itemDiagnostics, { paths: true });
    stringArray(item.sourceRefs, `${itemSection}.sourceRefs`, itemDiagnostics, { paths: true });
    optionalBoolean(item, 'blocking', itemSection, itemDiagnostics);
  });
  objectArray(surface.humanReview, `${section}.humanReview`, diagnostics, validateHumanReview);
}

function manifestDiagnostics(manifest, readText) {
  const diagnostics = [];
  if (!plainObject(manifest)) {
    diagnostic(diagnostics, 'manifest.structure', 'manifest', 'A manifest object.');
    return diagnostics;
  }
  if (!nonEmptyString(manifest.project)) diagnostic(diagnostics, 'manifest.structure', 'manifest.project', 'A non-empty project identity.');
  if (typeof readText !== 'function') diagnostic(diagnostics, 'manifest.structure', 'readText', 'A source reader function.');
  optionalString(manifest, 'nextSingleAction', 'manifest', diagnostics);
  optionalString(manifest, 'agentNextAction', 'manifest', diagnostics);
  stringArray(manifest.journeyOrder, 'manifest.journeyOrder', diagnostics);
  stringArray(manifest.humanDecisions, 'manifest.humanDecisions', diagnostics);
  objectArray(manifest.humanReview, 'manifest.humanReview', diagnostics, validateHumanReview);
  if (!Array.isArray(manifest.surfaces) || manifest.surfaces.length === 0) diagnostic(diagnostics, 'manifest.structure', 'manifest.surfaces', 'A non-empty surface array.');
  else {
    manifest.surfaces.forEach((surface, index) => validateSurface(surface, index, diagnostics));
    if (!manifest.surfaces.some((surface) => plainObject(surface) && (surface.status === 'current' || surface.status === 'target'))) diagnostic(diagnostics, 'manifest.no_covered_surface', 'manifest.surfaces', 'At least one non-excluded current or target surface.');
  }
  return diagnostics;
}

function evidenceRecord(input) {
  return {
    surfaceId: normalizeSemanticString(input.surfaceId || 'project'),
    ruleId: normalizeSemanticString(input.ruleId),
    category: normalizeSemanticString(input.category),
    outcome: normalizeSemanticString(input.outcome),
    summary: normalizeSemanticString(input.summary),
    expected: input.expected === null || input.expected === undefined ? null : normalizeSemanticString(input.expected),
    observed: input.observed === null || input.observed === undefined ? null : normalizeSemanticString(input.observed),
    authorityRefs: canonicalStrings(input.authorityRefs || [], { references: true }),
    sourceRefs: canonicalStrings(input.sourceRefs || [], { references: true }),
    evidenceLevel: normalizeSemanticString(input.evidenceLevel || 'SOURCE_STATIC'),
    blocking: typeof input.blocking === 'boolean' ? input.blocking : input.outcome === 'FAIL',
    currentOrTarget: normalizeSemanticString(input.currentOrTarget || 'CURRENT'),
    nextAction: input.nextAction ? normalizeSemanticString(input.nextAction) : null,
  };
}

function validEvidence(record) {
  return record && nonEmptyString(record.surfaceId) && nonEmptyString(record.ruleId)
    && nonEmptyString(record.category) && CONSISTENCY_OUTCOMES.includes(record.outcome)
    && typeof record.summary === 'string' && record.summary && Array.isArray(record.authorityRefs)
    && Array.isArray(record.sourceRefs) && EVIDENCE_LEVELS.includes(record.evidenceLevel)
    && typeof record.blocking === 'boolean' && ['CURRENT', 'TARGET', 'NOT_APPLICABLE'].includes(record.currentOrTarget);
}

function validSurface(surface) {
  return plainObject(surface) && nonEmptyString(surface.id) && nonEmptyString(surface.route)
    && ['current', 'target', 'excluded'].includes(surface.status) && Array.isArray(surface.sourcePaths)
    && Array.isArray(surface.authoritySources) && surface.authoritySources.length > 0;
}

export function canonicalEvidenceRepresentation(record) {
  const canonical = evidenceRecord(record);
  const compatibilityPrefix = [
    canonical.surfaceId,
    canonical.category,
    String(OUTCOME_ORDER.get(canonical.outcome)),
    canonical.ruleId,
    canonical.sourceRefs.join('|'),
    String(canonical.expected),
    String(canonical.observed),
  ].join(':');
  return `${compatibilityPrefix}\u0000${stableJson([
    canonical.surfaceId,
    canonical.ruleId,
    canonical.category,
    canonical.outcome,
    canonical.summary,
    canonical.expected,
    canonical.observed,
    canonical.authorityRefs,
    canonical.sourceRefs,
    canonical.evidenceLevel,
    canonical.blocking,
    canonical.currentOrTarget,
    canonical.nextAction,
  ])}`;
}

export function compareEvidenceRecords(left, right) {
  return codePointCompare(canonicalEvidenceRepresentation(left), canonicalEvidenceRepresentation(right));
}

export function canonicalEvidenceIdentity(record) {
  const canonical = evidenceRecord(record);
  return stableJson([
    canonical.surfaceId,
    canonical.category,
    canonical.ruleId,
    canonical.sourceRefs,
    canonical.currentOrTarget,
    canonical.expected,
    canonical.observed,
  ]);
}

function outcomeCounts(records) {
  return Object.fromEntries(CONSISTENCY_OUTCOMES.map((outcome) => [outcome, records.filter((record) => record.outcome === outcome).length]));
}

function levelCounts(records) {
  return Object.fromEntries(EVIDENCE_LEVELS.map((level) => [level, records.filter((record) => record.evidenceLevel === level).length]));
}

export function evaluateConsistency(manifest, { readText, provenance = {}, generatedAt = new Date().toISOString() } = {}) {
  const records = [];
  const cache = new Map();
  const read = (relativePath) => {
    const canonicalPath = canonicalRepositoryReference(relativePath);
    if (!cache.has(canonicalPath)) {
      try {
        const text = readText(canonicalPath);
        cache.set(canonicalPath, typeof text === 'string' ? { readable: true, text, errorState: null } : { readable: false, text: null, errorState: 'NON_STRING_SOURCE' });
      } catch {
        cache.set(canonicalPath, { readable: false, text: null, errorState: 'READ_ERROR' });
      }
    }
    return cache.get(canonicalPath);
  };
  const search = (relativePath, marker) => {
    const result = read(relativePath);
    return { ...result, found: result.readable ? result.text.includes(marker) : false };
  };
  const add = (input) => records.push(evidenceRecord(input));
  const project = nonEmptyString(manifest?.project) ? normalizeSemanticString(manifest.project) : 'UNKNOWN_PROJECT';
  const projectNextAction = nonEmptyString(manifest?.nextSingleAction) ? normalizeSemanticString(manifest.nextSingleAction) : 'Resolve manifest authority before acting.';
  const diagnostics = manifestDiagnostics(manifest, readText);
  const canEvaluate = diagnostics.length === 0;

  if (!canEvaluate) {
    for (const item of diagnostics) {
      add({ surfaceId: 'project', ruleId: item.ruleId, category: 'MANIFEST', outcome: 'FAIL', summary: `Manifest section ${item.section} is malformed.`, expected: item.expected, observed: `${item.section} failed deterministic schema validation.`, currentOrTarget: 'NOT_APPLICABLE', nextAction: 'Repair the identified manifest section before evaluating consistency.' });
    }
  } else {
    const ids = manifest.surfaces.map((surface) => normalizeSemanticString(surface?.id)).filter(Boolean);
    const duplicates = canonicalStrings(new Set(ids.filter((id, index) => ids.indexOf(id) !== index)));
    if (duplicates.length) add({ surfaceId: 'project', ruleId: 'manifest.surface_id.unique', category: 'MANIFEST', outcome: 'FAIL', summary: 'Surface ids must be unique.', expected: 'Unique surface ids.', observed: duplicates.join(', '), currentOrTarget: 'NOT_APPLICABLE', nextAction: 'Remove or rename duplicate surface entries.' });

    for (const surface of manifest.surfaces) {
      const currentOrTarget = surface.status === 'target' ? 'TARGET' : surface.status === 'excluded' ? 'NOT_APPLICABLE' : 'CURRENT';
      const authorityRefs = surface.authoritySources;
      if (surface.status === 'excluded') {
        const unreadableAuthorities = authorityRefs.filter((relativePath) => !read(relativePath).readable);
        if (unreadableAuthorities.length) {
          for (const relativePath of unreadableAuthorities) {
            add({ surfaceId: surface.id, ruleId: 'authority.exclusion_source.readable', category: 'AUTHORITY', outcome: 'FAIL', summary: 'Excluded scope authority is missing or unreadable.', expected: 'Readable authority before accepting an exclusion boundary.', observed: 'Unverifiable: exclusion authority unreadable.', authorityRefs: [relativePath], sourceRefs: [relativePath], currentOrTarget, nextAction: `Restore or verify ${relativePath} before accepting the exclusion.` });
          }
        } else {
          add({ surfaceId: surface.id, ruleId: 'scope.surface.excluded', category: 'SCOPE', outcome: 'EXCLUDED', summary: surface.exclusionReason, expected: 'Explicit scope boundary grounded in readable authority.', observed: `${surface.route} excluded.`, authorityRefs, currentOrTarget, nextAction: surface.nextAction || 'Do not treat this surface as compliance evidence.' });
        }
        continue;
      }

      const surfaceRecordStart = records.length;
      for (const relativePath of surface.sourcePaths) {
        const result = read(relativePath);
        if (result.readable) {
          add({ surfaceId: surface.id, ruleId: 'inventory.source.readable', category: 'PAGE_INVENTORY', outcome: 'PASS', summary: 'Required surface source is readable.', expected: 'Readable repository source.', observed: 'Readable.', authorityRefs, sourceRefs: [relativePath], currentOrTarget });
        } else {
          add({ surfaceId: surface.id, ruleId: 'inventory.source.readable', category: 'PAGE_INVENTORY', outcome: 'FAIL', summary: 'Required surface source is missing or unreadable.', expected: 'Readable repository source.', observed: 'Unreadable.', authorityRefs, sourceRefs: [relativePath], currentOrTarget, nextAction: `Restore or verify ${relativePath}.` });
        }
      }
      for (const relativePath of surface.authoritySources) {
        const result = read(relativePath);
        if (result.readable) {
          add({ surfaceId: surface.id, ruleId: 'authority.source.readable', category: 'AUTHORITY', outcome: 'PASS', summary: 'Required surface authority is readable.', expected: 'Readable authority source.', observed: 'Readable.', authorityRefs: [relativePath], sourceRefs: [relativePath], currentOrTarget });
        } else {
          add({ surfaceId: surface.id, ruleId: 'authority.source.readable', category: 'AUTHORITY', outcome: 'FAIL', summary: 'Required surface authority is unreadable.', expected: 'Readable authority source.', observed: 'Unreadable.', authorityRefs: [relativePath], sourceRefs: [relativePath], currentOrTarget, nextAction: `Restore or verify ${relativePath}.` });
        }
      }

      for (const requirement of surface.layout?.markers || []) {
        const result = search(requirement.path, requirement.value);
        add({ surfaceId: surface.id, ruleId: 'layout.marker.present', category: 'LAYOUT_CONTRACT', outcome: result.readable && result.found ? 'PASS' : 'FAIL', summary: !result.readable ? 'Required layout marker is unverifiable because its source is unreadable.' : result.found ? 'Required layout marker is present.' : 'Required layout marker is missing.', expected: requirement.value, observed: !result.readable ? 'Unverifiable: source unreadable.' : result.found ? 'Present.' : 'Missing.', authorityRefs, sourceRefs: [requirement.path], currentOrTarget, nextAction: result.readable && result.found ? null : 'Resolve the layout contract without changing unrelated surfaces.' });
      }

      const addAbsenceCheck = ({ rule, ruleId, category, presentSummary, absentSummary, unreadableSummary, nextAction }) => {
        const result = search(rule.path, rule.value);
        if (!result.readable) {
          add({ surfaceId: surface.id, ruleId, category, outcome: 'FAIL', summary: unreadableSummary, expected: 'Readable source required before evaluating this negative rule.', observed: 'Unverifiable: source unreadable.', authorityRefs, sourceRefs: [rule.path], currentOrTarget, nextAction: `Restore or verify ${rule.path} before evaluating this rule.` });
        } else {
          add({ surfaceId: surface.id, ruleId, category, outcome: result.found ? 'FAIL' : 'PASS', summary: result.found ? presentSummary : absentSummary, expected: `Absent: ${rule.value}`, observed: result.found ? 'Present.' : 'Absent.', authorityRefs, sourceRefs: [rule.path], currentOrTarget, nextAction: result.found ? nextAction : null });
        }
      };
      for (const rule of surface.tokens?.forbiddenRawValues || []) {
        addAbsenceCheck({ rule, ruleId: 'token.forbidden_raw_value.absent', category: 'TOKEN_DISCIPLINE', presentSummary: 'A project-defined forbidden raw token value is present.', absentSummary: 'Configured forbidden raw token value is absent.', unreadableSummary: 'Forbidden raw token compliance is unverifiable because its source is unreadable.', nextAction: 'Replace only through the project-defined token authority.' });
      }
      for (const rule of surface.terminology?.required || []) {
        const result = search(rule.path, rule.value);
        add({ surfaceId: surface.id, ruleId: 'terminology.required.present', category: 'TERMINOLOGY', outcome: result.readable && result.found ? 'PASS' : 'FAIL', summary: !result.readable ? 'Required terminology is unverifiable because its source is unreadable.' : result.found ? 'Required current terminology is present.' : 'Required current product or surface terminology is missing.', expected: rule.value, observed: !result.readable ? 'Unverifiable: source unreadable.' : result.found ? 'Present.' : 'Missing.', authorityRefs, sourceRefs: [rule.path], currentOrTarget, nextAction: result.readable && result.found ? null : 'Resolve terminology against the named authority.' });
      }
      for (const rule of surface.terminology?.prohibited || []) {
        addAbsenceCheck({ rule, ruleId: 'terminology.prohibited.absent', category: 'TERMINOLOGY', presentSummary: 'A project-defined prohibited term is present.', absentSummary: 'Configured prohibited terminology is absent.', unreadableSummary: 'Prohibited terminology compliance is unverifiable because its source is unreadable.', nextAction: 'Resolve the prohibited term through product authority.' });
      }
      for (const cta of surface.ctas || []) {
        for (const field of ['label', 'href', 'role', 'hierarchy']) {
          if (!cta[field]) continue;
          const result = search(cta.path, cta[field]);
          add({ surfaceId: surface.id, ruleId: `cta.${field}.matches`, category: 'CTA_CONTRACT', outcome: result.readable && result.found ? 'PASS' : 'FAIL', summary: !result.readable ? `CTA ${field} contract is unverifiable because its source is unreadable.` : result.found ? `CTA ${field} contract is present.` : `CTA ${field} contract is missing or contradictory.`, expected: cta[field], observed: !result.readable ? 'Unverifiable: source unreadable.' : result.found ? 'Present.' : 'Missing.', authorityRefs, sourceRefs: [cta.path], currentOrTarget, nextAction: result.readable && result.found ? null : 'Resolve the CTA against its authority before implementation.' });
        }
      }
      for (const responsive of surface.responsiveEvidence || []) {
        const result = search(responsive.path, responsive.marker);
        const missingOutcome = responsive.blocking === false ? 'REVIEW_REQUIRED' : 'FAIL';
        add({ surfaceId: surface.id, ruleId: 'responsive.source_marker.present', category: 'RESPONSIVE_EVIDENCE', outcome: !result.readable ? 'FAIL' : result.found ? 'PASS' : missingOutcome, summary: !result.readable ? 'Configured responsive evidence is unverifiable because its source is unreadable.' : result.found ? 'Configured responsive source marker is present; rendered behavior is not implied.' : 'Configured responsive source evidence is missing.', expected: responsive.marker, observed: !result.readable ? 'Unverifiable: source unreadable.' : result.found ? 'Static marker present.' : 'Static marker missing.', authorityRefs, sourceRefs: [responsive.path], evidenceLevel: 'SOURCE_STATIC', currentOrTarget, nextAction: result.readable && result.found ? 'Use viewport capture or runtime exercise before claiming rendered responsive correctness.' : 'Provide the configured evidence or restore the unreadable source.' });
      }
      for (const debt of surface.currentDebt || []) {
        const result = search(debt.path, debt.observedMarker);
        add({ surfaceId: surface.id, ruleId: debt.ruleId, category: 'CURRENT_DEBT', outcome: result.readable && result.found ? 'CURRENT_DEBT' : 'FAIL', summary: !result.readable ? 'Declared current debt is unverifiable because its source is unreadable.' : result.found ? debt.summary : 'Declared current debt was not observed at its declared evidence level.', expected: debt.expected, observed: result.readable && result.found ? debt.observed : 'Unverifiable.', authorityRefs: debt.authorityRefs || authorityRefs, sourceRefs: [debt.path, ...(debt.sourceRefs || [])], evidenceLevel: 'SOURCE_STATIC', currentOrTarget: 'CURRENT', nextAction: debt.nextAction || 'Resolve only in the authorized product lane.' });
      }
      if (surface.targetPresentedAsLive) add({ surfaceId: surface.id, ruleId: 'current_target.target_presented_as_live', category: 'CURRENT_VS_TARGET', outcome: 'FAIL', summary: 'A target-only requirement is represented as current runtime.', expected: 'Target and current runtime remain explicitly separated.', observed: 'Target represented as live.', authorityRefs, sourceRefs: surface.sourcePaths, currentOrTarget: 'TARGET', nextAction: 'Restore explicit current-versus-target labeling.' });
      for (const item of surface.humanReview || []) {
        add({ surfaceId: surface.id, ruleId: item.ruleId, category: 'HUMAN_REVIEW', outcome: 'REVIEW_REQUIRED', summary: item.summary, expected: item.expected || 'Human judgment.', observed: item.observed || 'Not yet approved.', authorityRefs: item.authorityRefs || authorityRefs, sourceRefs: item.sourceRefs || surface.sourcePaths, evidenceLevel: item.evidenceLevel || 'SOURCE_STATIC', currentOrTarget, nextAction: item.nextAction || projectNextAction });
      }
      if (records.length === surfaceRecordStart) add({ surfaceId: surface.id, ruleId: 'manifest.surface_evidence.empty', category: 'MANIFEST', outcome: 'FAIL', summary: 'A covered surface produced zero evidence records.', expected: 'At least one grounded evidence record.', observed: 'Zero evidence records.', authorityRefs, currentOrTarget, nextAction: 'Add source and authority evidence before evaluating the surface.' });
    }
    for (const item of manifest.humanReview || []) {
      add({ surfaceId: 'project', ruleId: item.ruleId, category: 'HUMAN_REVIEW', outcome: 'REVIEW_REQUIRED', summary: item.summary, expected: item.expected || 'Human judgment.', observed: item.observed || 'Not yet approved.', authorityRefs: item.authorityRefs || [], sourceRefs: item.sourceRefs || [], evidenceLevel: item.evidenceLevel || 'SOURCE_STATIC', currentOrTarget: 'NOT_APPLICABLE', nextAction: item.nextAction || projectNextAction });
    }
  }

  if (records.some((record) => !validEvidence(record))) {
    records.push(evidenceRecord({ surfaceId: 'project', ruleId: 'evidence.schema.valid', category: 'MANIFEST', outcome: 'FAIL', summary: 'One or more evidence records are malformed.', expected: 'Complete stable evidence fields.', observed: 'Malformed evidence record.', currentOrTarget: 'NOT_APPLICABLE', nextAction: 'Repair evidence generation before using any output.' }));
  }
  const validRecords = records.filter(validEvidence);
  const firstByIdentity = new Map();
  const collisions = [];
  validRecords.forEach((record, index) => {
    const identity = canonicalEvidenceIdentity(record);
    const first = firstByIdentity.get(identity);
    if (!first) {
      firstByIdentity.set(identity, { index, representation: canonicalEvidenceRepresentation(record) });
      return;
    }
    collisions.push({
      identity,
      recordIndices: [first.index, index],
      collisionType: first.representation === canonicalEvidenceRepresentation(record) ? 'EXACT_DUPLICATE' : 'CONFLICTING_CONTENT',
    });
  });
  if (collisions.length) {
    validRecords.push(evidenceRecord({
      surfaceId: 'project',
      ruleId: 'evidence.identity.collision',
      category: 'MANIFEST',
      outcome: 'FAIL',
      summary: 'Evidence identities must be unique; duplicates and conflicting semantic records fail closed.',
      expected: 'One canonical semantic record per evidence identity.',
      observed: stableJson(collisions),
      currentOrTarget: 'NOT_APPLICABLE',
      nextAction: 'Give each evidence declaration a distinct stable identity or remove the duplicate declaration.',
    }));
  }
  const evidenceRecords = validRecords.sort(compareEvidenceRecords);
  const failures = evidenceRecords.filter((record) => record.outcome === 'FAIL');
  const currentDebt = evidenceRecords.filter((record) => record.outcome === 'CURRENT_DEBT');
  const reviewRequired = evidenceRecords.filter((record) => record.outcome === 'REVIEW_REQUIRED');
  const exclusions = evidenceRecords.filter((record) => record.outcome === 'EXCLUDED');
  const status = failures.length ? 'HOLD' : currentDebt.length || reviewRequired.length ? 'REVIEW_REQUIRED' : 'CONSISTENT';
  const reasonCodes = new Set(failures.map((record) => reasonCode(record.ruleId)));
  if (currentDebt.length) reasonCodes.add('CURRENT_DEBT_PRESENT');
  if (reviewRequired.length) reasonCodes.add('HUMAN_REVIEW_REQUIRED');
  const counts = outcomeCounts(evidenceRecords);
  const levels = levelCounts(evidenceRecords);
  const manifestSurfaces = canEvaluate ? manifest.surfaces.filter(validSurface) : [];
  const journeyOrder = Array.isArray(manifest?.journeyOrder) ? manifest.journeyOrder.map(normalizeSemanticString) : [];
  const journeyRank = (group) => {
    const index = journeyOrder.indexOf(group);
    return index === -1 ? journeyOrder.length : index;
  };
  const surfaceSummaries = manifestSurfaces.map((surface) => {
    const surfaceId = normalizeSemanticString(surface.id);
    const journeyGroup = normalizeSemanticString(surface.journeyGroup || 'UNGROUPED');
    const surfaceEvidence = evidenceRecords.filter((record) => record.surfaceId === surfaceId);
    const surfaceCounts = outcomeCounts(surfaceEvidence);
    const surfaceLevels = levelCounts(surfaceEvidence);
    const surfaceOutcome = surfaceCounts.FAIL ? 'FAIL' : surfaceCounts.CURRENT_DEBT || surfaceCounts.REVIEW_REQUIRED ? 'REVIEW_REQUIRED' : surfaceCounts.EXCLUDED ? 'EXCLUDED' : 'PASS';
    return { id: surfaceId, route: normalizeSemanticString(surface.route), journeyGroup, scopeStatus: surface.status.toUpperCase(), outcome: surfaceOutcome, counts: surfaceCounts, countsByEvidenceLevel: surfaceLevels, topFindings: surfaceEvidence.filter((record) => record.outcome !== 'PASS').slice(0, 3).map((record) => ({ ruleId: record.ruleId, outcome: record.outcome, summary: record.summary })) };
  }).sort((a, b) => journeyRank(a.journeyGroup) - journeyRank(b.journeyGroup)
    || codePointCompare(a.journeyGroup, b.journeyGroup) || codePointCompare(a.id, b.id));

  return normalizeSemanticData({
    schemaVersion: 'control-plane-consistency-evidence-v2', toolVersion: '2.0.0', project, status, reasonCodes: canonicalStrings(reasonCodes),
    counts: {
      totalEvidence: evidenceRecords.length,
      compliancePasses: counts.PASS,
      currentDebtObservations: counts.CURRENT_DEBT,
      humanReviewItems: counts.REVIEW_REQUIRED,
      explicitExclusions: counts.EXCLUDED,
      blockingFailures: counts.FAIL,
      countsByEvidenceLevel: levels,
      coveredSurfaces: surfaceSummaries.filter((surface) => surface.scopeStatus !== 'EXCLUDED').map((surface) => surface.id),
      excludedSurfaces: surfaceSummaries.filter((surface) => surface.scopeStatus === 'EXCLUDED').map((surface) => surface.id),
    },
    evidenceRecords, surfaceSummaries, journeyOrder, failures, currentDebt, reviewRequired, exclusions,
    nextSingleAction: projectNextAction, agentNextAction: nonEmptyString(manifest?.agentNextAction) ? normalizeSemanticString(manifest.agentNextAction) : projectNextAction,
    humanDecisions: canonicalStrings(Array.isArray(manifest?.humanDecisions) ? manifest.humanDecisions : []),
    provenance: { branch: provenance.branch || null, commit: provenance.commit || null, timestamp: provenance.timestamp || generatedAt },
    generatedAt,
  });
}
