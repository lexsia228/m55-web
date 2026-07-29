/**
 * TypeScript AST inspection for Premium Experience mount verification.
 *
 * Mounts are only recognised when the JSX tag's import binding resolves to the
 * canonical owner module, so markers inside comments or string literals never
 * satisfy a contract.
 */
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createPremiumCompilerHost,
  jsxUsesResolvedSymbol,
  parseImportBindings,
  parseJsxUsages,
  sameModule,
  type OwnerModuleProof,
  type ResolvedImportBinding,
} from './premiumExperienceModuleResolution';

export type PremiumSurfaceMountHit = {
  component: string;
  stateId: string;
  boundToCanonicalModule: boolean;
  /** Module the JSX binding actually resolves to. */
  resolvedModule: string | null;
  /** Source text of the `stateId={…}` expression this mount was resolved from. */
  stateIdExpression: string;
  /** False when the expression is open-ended (prop, call, computed access). */
  stateIdResolved: boolean;
};

export type StateIdExpressionResolution = {
  expressionText: string;
  variants: string[];
  resolved: boolean;
};

export type PremiumDataStateHit = {
  value: string;
};

export type PremiumAstInspection = {
  relPath: string;
  importedSymbols: Set<string>;
  imports: ResolvedImportBinding[];
  premiumSurfaceMounts: PremiumSurfaceMountHit[];
  dataPremiumStates: PremiumDataStateHit[];
};

export const CANONICAL_SURFACE_MODULES: Record<string, string> = {
  PremiumExperienceSurface: 'components/experience/PremiumExperienceSurface.tsx',
  PremiumDecisionSurface: 'components/experience/PremiumDecisionSurface.tsx',
};

function parseSourceFile(root: string, relPath: string): ts.SourceFile {
  const src = readFileSync(join(root, relPath), 'utf8');
  return ts.createSourceFile(relPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

const MAX_EXPRESSION_DEPTH = 8;

function collectVariableInitializers(sf: ts.SourceFile): Map<string, ts.Expression[]> {
  const map = new Map<string, ts.Expression[]>();
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const existing = map.get(node.name.text) ?? [];
      // A declaration without an initializer is deliberately recorded as a
      // sentinel so an assigned-later binding resolves as open-ended.
      existing.push(node.initializer ?? (node.name as unknown as ts.Expression));
      map.set(node.name.text, existing);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return map;
}

/**
 * Resolve the finite set of state ids reachable from one specific JSX
 * `stateId={…}` expression.
 *
 * Only bindings reachable from that exact expression are followed, so an
 * unrelated variable elsewhere in the same file that happens to contain the
 * expected state string never satisfies a mount contract.
 */
export function resolveStateIdExpression(
  sf: ts.SourceFile,
  expression: ts.Expression,
  initializers: Map<string, ts.Expression[]>,
  depth = 0,
  seen: Set<string> = new Set(),
): StateIdExpressionResolution {
  const expressionText = expression.getText(sf);
  const unresolved: StateIdExpressionResolution = { expressionText, variants: [], resolved: false };
  if (depth > MAX_EXPRESSION_DEPTH) return unresolved;

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { expressionText, variants: [expression.text], resolved: true };
  }
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    const inner = resolveStateIdExpression(sf, expression.expression, initializers, depth + 1, seen);
    return { ...inner, expressionText };
  }
  if (ts.isConditionalExpression(expression)) {
    const whenTrue = resolveStateIdExpression(sf, expression.whenTrue, initializers, depth + 1, seen);
    const whenFalse = resolveStateIdExpression(sf, expression.whenFalse, initializers, depth + 1, seen);
    return {
      expressionText,
      variants: Array.from(new Set([...whenTrue.variants, ...whenFalse.variants])),
      resolved: whenTrue.resolved && whenFalse.resolved,
    };
  }
  if (
    ts.isBinaryExpression(expression) &&
    (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    const left = resolveStateIdExpression(sf, expression.left, initializers, depth + 1, seen);
    const right = resolveStateIdExpression(sf, expression.right, initializers, depth + 1, seen);
    return {
      expressionText,
      variants: Array.from(new Set([...left.variants, ...right.variants])),
      resolved: left.resolved && right.resolved,
    };
  }
  if (ts.isIdentifier(expression)) {
    const name = expression.text;
    if (seen.has(name)) return unresolved;
    const declarations = initializers.get(name);
    // Ambiguous or absent declarations (props, params, reassignment) stay open-ended.
    if (!declarations || declarations.length !== 1) return unresolved;
    const initializer = declarations[0];
    if (ts.isIdentifier(initializer) && initializer.text === name) return unresolved;
    const nextSeen = new Set(seen);
    nextSeen.add(name);
    const inner = resolveStateIdExpression(sf, initializer, initializers, depth + 1, nextSeen);
    return { ...inner, expressionText };
  }

  return unresolved;
}

export function inspectPremiumOwnerFile(root: string, relPath: string): PremiumAstInspection {
  const host = createPremiumCompilerHost(root);
  const imports = parseImportBindings(root, relPath, host.options);
  const jsxUsages = parseJsxUsages(root, relPath, imports);
  const importedSymbols = new Set(imports.map((i) => i.localName));

  const proofFor = (tag: string): OwnerModuleProof => ({
    ownerFile: relPath,
    expectedModule: CANONICAL_SURFACE_MODULES[tag] ?? '',
    symbol: tag,
    jsxUsages,
    imports,
  });

  // Each mount is derived from one concrete JSX element and the state ids
  // reachable from that element's own `stateId` expression.
  const sf = parseSourceFile(root, relPath);
  const initializers = collectVariableInitializers(sf);
  const premiumSurfaceMounts: PremiumSurfaceMountHit[] = [];

  function visitSurfaces(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = ts.isIdentifier(node.tagName) ? node.tagName.text : null;
      if (tag === 'PremiumExperienceSurface' || tag === 'PremiumDecisionSurface') {
        const canonical = CANONICAL_SURFACE_MODULES[tag];
        const bound = canonical ? jsxUsesResolvedSymbol(proofFor(tag), tag, canonical) : false;
        const resolvedModule = imports.find((i) => i.localName === tag)?.effectiveModule ?? null;
        const attr = node.attributes.properties.find(
          (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(sf) === 'stateId',
        );

        let resolution: StateIdExpressionResolution = {
          expressionText: '(missing)',
          variants: [],
          resolved: false,
        };
        if (attr?.initializer) {
          if (ts.isStringLiteral(attr.initializer)) {
            resolution = {
              expressionText: attr.initializer.getText(sf),
              variants: [attr.initializer.text],
              resolved: true,
            };
          } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
            resolution = resolveStateIdExpression(sf, attr.initializer.expression, initializers);
          }
        }

        for (const variant of resolution.variants) {
          premiumSurfaceMounts.push({
            component: tag,
            stateId: variant,
            boundToCanonicalModule: bound,
            resolvedModule,
            stateIdExpression: resolution.expressionText,
            stateIdResolved: resolution.resolved,
          });
        }
        if (resolution.variants.length === 0) {
          premiumSurfaceMounts.push({
            component: tag,
            stateId: '',
            boundToCanonicalModule: bound,
            resolvedModule,
            stateIdExpression: resolution.expressionText,
            stateIdResolved: false,
          });
        }
      }
    }
    ts.forEachChild(node, visitSurfaces);
  }
  visitSurfaces(sf);

  const dataPremiumStates: PremiumDataStateHit[] = jsxUsages
    .filter((u) => u.dataPremiumState)
    .map((u) => ({ value: u.dataPremiumState! }));

  return { relPath, importedSymbols, imports, premiumSurfaceMounts, dataPremiumStates };
}

/**
 * A mount counts only when the canonical module binding holds AND the state id
 * is reachable from that JSX element's own fully resolved `stateId` expression.
 */
export function hasPremiumSurfaceMount(
  inspection: PremiumAstInspection,
  component: 'PremiumExperienceSurface' | 'PremiumDecisionSurface',
  stateId: string,
): boolean {
  return inspection.premiumSurfaceMounts.some(
    (m) =>
      m.component === component &&
      m.stateId === stateId &&
      m.boundToCanonicalModule &&
      m.stateIdResolved,
  );
}

/** Surfaces mounted with an open-ended or missing state id expression. */
export function unresolvedStateIdMounts(inspection: PremiumAstInspection): PremiumSurfaceMountHit[] {
  return inspection.premiumSurfaceMounts.filter((m) => !m.stateIdResolved);
}

export function hasDataPremiumState(inspection: PremiumAstInspection, value: string): boolean {
  return inspection.dataPremiumStates.some((m) => m.value === value);
}

/**
 * AST proof that a module passes a named prop to a resolved component tag —
 * replaces raw source `includes()` as state-selection evidence.
 */
export function jsxPassesPropToComponent(
  root: string,
  relPath: string,
  tagName: string,
  propName: string,
  expectedTagModule?: string,
): boolean {
  const host = createPremiumCompilerHost(root);
  const imports = parseImportBindings(root, relPath, host.options);
  const binding = imports.find((i) => i.localName === tagName);
  if (!binding) return false;
  if (expectedTagModule && !sameModule(binding.effectiveModule, expectedTagModule)) return false;

  const sf = parseSourceFile(root, relPath);
  let found = false;

  function visit(node: ts.Node) {
    if (found) return;
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = ts.isIdentifier(node.tagName) ? node.tagName.text : null;
      if (tag === tagName) {
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name.getText(sf) === propName) {
            found = true;
            return;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return found;
}

export function freeShareAccidentallyPremiumWrapped(root: string, relPath: string): boolean {
  const inspection = inspectPremiumOwnerFile(root, relPath);
  return inspection.premiumSurfaceMounts.some((m) => m.component === 'PremiumDecisionSurface');
}

export function proofForSymbol(
  root: string,
  relPath: string,
  symbol: keyof typeof CANONICAL_SURFACE_MODULES,
): OwnerModuleProof {
  const host = createPremiumCompilerHost(root);
  const imports = parseImportBindings(root, relPath, host.options);
  const jsxUsages = parseJsxUsages(root, relPath, imports);
  return {
    ownerFile: relPath,
    expectedModule: CANONICAL_SURFACE_MODULES[symbol],
    symbol,
    jsxUsages,
    imports,
  };
}
