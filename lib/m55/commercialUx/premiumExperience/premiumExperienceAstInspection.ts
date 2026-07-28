/**
 * TypeScript AST inspection for Premium Experience mount verification.
 */
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createPremiumCompilerHost,
  jsxUsesResolvedSymbol,
  parseImportBindings,
  parseJsxUsages,
  type OwnerModuleProof,
} from './premiumExperienceModuleResolution';

export type PremiumSurfaceMountHit = {
  component: string;
  stateId: string;
  boundToCanonicalModule: boolean;
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

const CANONICAL_SURFACE_MODULES: Record<string, string> = {
  PremiumExperienceSurface: 'components/experience/PremiumExperienceSurface.tsx',
  PremiumDecisionSurface: 'components/experience/PremiumDecisionSurface.tsx',
};

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

function collectConditionalConstStrings(sourceFile: ts.SourceFile): Map<string, string[]> {
  const map = new Map<string, string[]>();
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isConditionalExpression(node.initializer)
    ) {
      const whenTrue = node.initializer.whenTrue;
      const whenFalse = node.initializer.whenFalse;
      if (ts.isStringLiteral(whenTrue) && ts.isStringLiteral(whenFalse)) {
        map.set(node.name.text, [whenTrue.text, whenFalse.text]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return map;
}

export function inspectPremiumOwnerFile(root: string, relPath: string): PremiumAstInspection {
  const host = createPremiumCompilerHost(root);
  const imports = parseImportBindings(root, relPath, host.options);
  const jsxUsages = parseJsxUsages(root, relPath, imports);
  const importedSymbols = new Set(imports.map((i) => i.localName));

  const premiumSurfaceMounts: PremiumSurfaceMountHit[] = jsxUsages
    .filter((u) => u.tagName === 'PremiumExperienceSurface' || u.tagName === 'PremiumDecisionSurface')
    .flatMap((u) => {
      if (!u.stateId) return [];
      const canonical = CANONICAL_SURFACE_MODULES[u.tagName];
      const bound = canonical
        ? jsxUsesResolvedSymbol(
            { ownerFile: relPath, expectedModule: canonical, symbol: u.tagName, jsxUsages, imports },
            u.tagName,
            canonical,
          )
        : false;
      return [{ component: u.tagName, stateId: u.stateId, boundToCanonicalModule: bound }];
    });

  // conditional stateId variants (e.g. questionStateId ternary)
  const abs = join(root, relPath);
  const src = readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(relPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const conditional = collectConditionalConstStrings(sf);
  for (const [varName, variants] of conditional) {
    void varName;
    for (const variant of variants) {
      const tag = 'PremiumDecisionSurface';
      const canonical = CANONICAL_SURFACE_MODULES[tag];
      if (
        !premiumSurfaceMounts.some((m) => m.component === tag && m.stateId === variant) &&
        jsxUsages.some((u) => u.tagName === tag)
      ) {
        premiumSurfaceMounts.push({
          component: tag,
          stateId: variant,
          boundToCanonicalModule: jsxUsesResolvedSymbol(
            { ownerFile: relPath, expectedModule: canonical, symbol: tag, jsxUsages, imports },
            tag,
            canonical,
          ),
        });
      }
    }
  }

  const dataPremiumStates: PremiumDataStateHit[] = jsxUsages
    .filter((u) => u.dataPremiumState)
    .map((u) => ({ value: u.dataPremiumState! }));

  return { relPath, importedSymbols, premiumSurfaceMounts, dataPremiumStates };
}

export function hasPremiumSurfaceMount(
  inspection: PremiumAstInspection,
  component: 'PremiumExperienceSurface' | 'PremiumDecisionSurface',
  stateId: string,
): boolean {
  return inspection.premiumSurfaceMounts.some(
    (m) => m.component === component && m.stateId === stateId && m.boundToCanonicalModule,
  );
}

export function hasDataPremiumState(inspection: PremiumAstInspection, value: string): boolean {
  return inspection.dataPremiumStates.some((m) => m.value === value);
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
