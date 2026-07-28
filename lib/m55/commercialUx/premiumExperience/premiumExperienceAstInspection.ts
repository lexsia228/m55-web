/**
 * TypeScript AST inspection for Premium Experience mount verification.
 */
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PremiumSurfaceMountHit = {
  component: string;
  stateId: string;
};

export type PremiumDataStateHit = {
  value: string;
};

export type PremiumAstInspection = {
  relPath: string;
  importedSymbols: Set<string>;
  premiumSurfaceMounts: PremiumSurfaceMountHit[];
  dataPremiumStates: PremiumDataStateHit[];
};

function jsxTagName(node: ts.JsxOpeningLikeElement): string | null {
  const n = node.tagName;
  if (ts.isIdentifier(n)) return n.text;
  if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.name)) return n.name.text;
  return null;
}

function readJsxStringAttr(
  attrs: ts.JsxAttributes,
  name: string,
  sourceFile: ts.SourceFile,
): string | null {
  for (const prop of attrs.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    if (prop.name.getText(sourceFile) !== name || !prop.initializer) continue;
    if (ts.isStringLiteral(prop.initializer)) return prop.initializer.text;
    if (
      ts.isJsxExpression(prop.initializer) &&
      prop.initializer.expression &&
      ts.isStringLiteral(prop.initializer.expression)
    ) {
      return prop.initializer.expression.text;
    }
  }
  return null;
}

export function inspectPremiumOwnerFile(root: string, relPath: string): PremiumAstInspection {
  const abs = join(root, relPath);
  const src = readFileSync(abs, 'utf8');
  const sourceFile = ts.createSourceFile(relPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const importedSymbols = new Set<string>();
  const premiumSurfaceMounts: PremiumSurfaceMountHit[] = [];
  const dataPremiumStates: PremiumDataStateHit[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      for (const el of node.importClause.namedBindings.elements) {
        const local = el.name.text;
        importedSymbols.add(local);
      }
    }
    if (ts.isImportDeclaration(node) && node.importClause?.name) {
      importedSymbols.add(node.importClause.name.text);
    }
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = jsxTagName(node);
      if (tag === 'PremiumExperienceSurface' || tag === 'PremiumDecisionSurface') {
        const stateId = readJsxStringAttr(node.attributes, 'stateId', sourceFile);
        if (stateId) premiumSurfaceMounts.push({ component: tag, stateId });
      }
      const dataState = readJsxStringAttr(node.attributes, 'data-m55-premium-state', sourceFile);
      if (dataState) dataPremiumStates.push({ value: dataState });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { relPath, importedSymbols, premiumSurfaceMounts, dataPremiumStates };
}

export function hasPremiumSurfaceMount(
  inspection: PremiumAstInspection,
  component: 'PremiumExperienceSurface' | 'PremiumDecisionSurface',
  stateId: string,
): boolean {
  if (!inspection.importedSymbols.has(component)) return false;
  return inspection.premiumSurfaceMounts.some((m) => m.component === component && m.stateId === stateId);
}

export function hasDataPremiumState(inspection: PremiumAstInspection, value: string): boolean {
  return inspection.dataPremiumStates.some((m) => m.value === value);
}

export function freeShareAccidentallyPremiumWrapped(root: string, relPath: string): boolean {
  const inspection = inspectPremiumOwnerFile(root, relPath);
  return (
    inspection.importedSymbols.has('PremiumDecisionSurface') ||
    inspection.premiumSurfaceMounts.some((m) => m.component === 'PremiumDecisionSurface')
  );
}
