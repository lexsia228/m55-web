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
  collectConditionalConstStrings,
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

  const premiumSurfaceMounts: PremiumSurfaceMountHit[] = jsxUsages
    .filter((u) => u.tagName === 'PremiumExperienceSurface' || u.tagName === 'PremiumDecisionSurface')
    .flatMap((u) => {
      if (!u.stateId) return [];
      const canonical = CANONICAL_SURFACE_MODULES[u.tagName];
      return [
        {
          component: u.tagName,
          stateId: u.stateId,
          boundToCanonicalModule: canonical
            ? jsxUsesResolvedSymbol(proofFor(u.tagName), u.tagName, canonical)
            : false,
          resolvedModule: u.binding?.effectiveModule ?? null,
        },
      ];
    });

  // Conditional stateId variants (e.g. `const questionStateId = edit ? A : B`).
  const sf = parseSourceFile(root, relPath);
  for (const [, variants] of collectConditionalConstStrings(sf)) {
    for (const variant of variants) {
      const tag = 'PremiumDecisionSurface';
      const canonical = CANONICAL_SURFACE_MODULES[tag];
      const alreadyKnown = premiumSurfaceMounts.some(
        (m) => m.component === tag && m.stateId === variant,
      );
      const usesTag = jsxUsages.some((u) => u.tagName === tag);
      if (alreadyKnown || !usesTag) continue;
      const binding = imports.find((i) => i.localName === tag) ?? null;
      premiumSurfaceMounts.push({
        component: tag,
        stateId: variant,
        boundToCanonicalModule: jsxUsesResolvedSymbol(proofFor(tag), tag, canonical),
        resolvedModule: binding?.effectiveModule ?? null,
      });
    }
  }

  const dataPremiumStates: PremiumDataStateHit[] = jsxUsages
    .filter((u) => u.dataPremiumState)
    .map((u) => ({ value: u.dataPremiumState! }));

  return { relPath, importedSymbols, imports, premiumSurfaceMounts, dataPremiumStates };
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
