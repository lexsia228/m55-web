/**
 * TypeScript compiler module resolution for Premium Experience proof.
 *
 * Resolves the full chain — import declaration specifier → resolved source file
 * → exported symbol → re-export origin → local alias → JSX binding — so a
 * same-named import from a different module cannot satisfy an ownership
 * contract, and neither can a comment or string literal.
 */
import ts from 'typescript';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, normalize } from 'node:path';

export type ResolvedImportBinding = {
  /** Identifier as used in this file. */
  localName: string;
  /** Name as exported by the target module ('default' for default imports). */
  importedName: string;
  moduleSpecifier: string;
  /** Module the specifier resolves to (may be a barrel). */
  resolvedPath: string;
  /** Module that actually declares the symbol, after following re-exports. */
  effectiveModule: string;
  /** Re-export hops walked to reach effectiveModule. */
  reExportChain: string[];
  isDefault: boolean;
  isNamespace: boolean;
};

export type ResolvedJsxUsage = {
  tagName: string;
  binding: ResolvedImportBinding | null;
  stateId: string | null;
  dataPremiumState: string | null;
};

export type OwnerModuleProof = {
  ownerFile: string;
  expectedModule: string;
  symbol: string;
  jsxUsages: ResolvedJsxUsage[];
  imports: ResolvedImportBinding[];
};

export type ExportOrigin = {
  module: string;
  exportedName: string;
  chain: string[];
};

function normalizeRel(root: string, absPath: string): string {
  const rel = normalize(relative(root, absPath)).split('\\').join('/');
  return rel.startsWith('./') ? rel.slice(2) : rel;
}

export function stripExtension(rel: string): string {
  return rel.replace(/\.(tsx|ts|jsx|js|mjs)$/, '');
}

export function sameModule(a: string, b: string): boolean {
  return stripExtension(a) === stripExtension(b);
}

export function createPremiumCompilerHost(root: string) {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error('tsconfig.json not found');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  return { root, options: parsed.options };
}

export function resolveModuleSpecifier(
  root: string,
  fromRel: string,
  specifier: string,
  options: ts.CompilerOptions,
): string | null {
  const containing = join(root, fromRel);
  const result = ts.resolveModuleName(specifier, containing, options, ts.sys);
  const resolved = result.resolvedModule?.resolvedFileName;
  if (!resolved || !existsSync(resolved)) return null;
  return normalizeRel(root, resolved);
}

function parseSourceFile(root: string, relPath: string): ts.SourceFile {
  const src = readFileSync(join(root, relPath), 'utf8');
  return ts.createSourceFile(relPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function declaresLocally(sf: ts.SourceFile, name: string): boolean {
  if (name === 'default') {
    return sf.statements.some(
      (s) =>
        (ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s)) &&
        s.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword),
    ) || sf.statements.some((s) => ts.isExportAssignment(s) && !s.isExportEquals);
  }
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
      if (stmt.name?.text === name) return true;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) return true;
      }
    }
    if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) || ts.isEnumDeclaration(stmt)) {
      if (stmt.name.text === name) return true;
    }
  }
  return false;
}

/**
 * Walk `export { X } from './Y'`, `export * from './Y'` and local re-exports of
 * imported bindings until the module that actually declares the symbol is found.
 */
export function resolveExportOrigin(
  root: string,
  moduleRel: string,
  exportedName: string,
  options: ts.CompilerOptions,
  seen: Set<string> = new Set(),
): ExportOrigin | null {
  const key = `${moduleRel}#${exportedName}`;
  if (seen.has(key)) return null;
  seen.add(key);
  if (!existsSync(join(root, moduleRel))) return null;

  const sf = parseSourceFile(root, moduleRel);

  for (const stmt of sf.statements) {
    if (!ts.isExportDeclaration(stmt)) continue;

    const specifierText =
      stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;

    if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) {
        if (el.name.text !== exportedName) continue;
        const upstreamName = el.propertyName?.text ?? el.name.text;
        if (specifierText) {
          const target = resolveModuleSpecifier(root, moduleRel, specifierText, options);
          if (!target) continue;
          const deeper = resolveExportOrigin(root, target, upstreamName, options, seen);
          return deeper
            ? { ...deeper, chain: [moduleRel, ...deeper.chain] }
            : { module: target, exportedName: upstreamName, chain: [moduleRel] };
        }
        // Local `export { imported }` — follow the import binding.
        const local = parseImportBindings(root, moduleRel, options).find(
          (b) => b.localName === upstreamName,
        );
        if (local) {
          return {
            module: local.effectiveModule,
            exportedName: local.importedName,
            chain: [moduleRel, ...local.reExportChain],
          };
        }
        return { module: moduleRel, exportedName, chain: [] };
      }
    }

    if (!stmt.exportClause && specifierText) {
      const target = resolveModuleSpecifier(root, moduleRel, specifierText, options);
      if (!target) continue;
      const deeper = resolveExportOrigin(root, target, exportedName, options, seen);
      if (deeper) return { ...deeper, chain: [moduleRel, ...deeper.chain] };
    }
  }

  if (declaresLocally(sf, exportedName)) {
    return { module: moduleRel, exportedName, chain: [] };
  }
  // Symbol is exported inline (e.g. `export const X`) or unresolvable further.
  return { module: moduleRel, exportedName, chain: [] };
}

export function parseImportBindings(
  root: string,
  relPath: string,
  options: ts.CompilerOptions,
): ResolvedImportBinding[] {
  const sf = parseSourceFile(root, relPath);
  const out: ResolvedImportBinding[] = [];

  const push = (
    localName: string,
    importedName: string,
    specifier: string,
    resolvedPath: string,
    isDefault: boolean,
    isNamespace: boolean,
  ) => {
    const origin = isNamespace
      ? null
      : resolveExportOrigin(root, resolvedPath, importedName, options, new Set());
    out.push({
      localName,
      importedName,
      moduleSpecifier: specifier,
      resolvedPath,
      effectiveModule: origin?.module ?? resolvedPath,
      reExportChain: origin?.chain ?? [],
      isDefault,
      isNamespace,
    });
  };

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) {
      continue;
    }
    const specifier = stmt.moduleSpecifier.text;
    const resolvedPath = resolveModuleSpecifier(root, relPath, specifier, options);
    if (!resolvedPath) continue;
    const clause = stmt.importClause;
    if (!clause) continue;

    if (clause.name) {
      push(clause.name.text, 'default', specifier, resolvedPath, true, false);
    }
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      push(clause.namedBindings.name.text, '*', specifier, resolvedPath, false, true);
    }
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) {
        push(
          el.name.text,
          el.propertyName?.text ?? el.name.text,
          specifier,
          resolvedPath,
          false,
          false,
        );
      }
    }
  }
  return out;
}

function jsxTagName(node: ts.JsxOpeningLikeElement): string | null {
  const n = node.tagName;
  if (ts.isIdentifier(n)) return n.text;
  if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.name)) return n.name.text;
  return null;
}

function readJsxStringAttr(attrs: ts.JsxAttributes, name: string, sf: ts.SourceFile): string | null {
  for (const prop of attrs.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    if (prop.name.getText(sf) !== name || !prop.initializer) continue;
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

export function collectConditionalConstStrings(sf: ts.SourceFile): Map<string, string[]> {
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
  visit(sf);
  return map;
}

export function parseJsxUsages(
  root: string,
  relPath: string,
  imports: ResolvedImportBinding[],
): ResolvedJsxUsage[] {
  const sf = parseSourceFile(root, relPath);
  const importByLocal = new Map(imports.map((i) => [i.localName, i]));
  const conditional = collectConditionalConstStrings(sf);
  const out: ResolvedJsxUsage[] = [];

  function resolveStateId(attrs: ts.JsxAttributes): string | null {
    const direct = readJsxStringAttr(attrs, 'stateId', sf);
    if (direct) return direct;
    for (const prop of attrs.properties) {
      if (!ts.isJsxAttribute(prop) || prop.name.getText(sf) !== 'stateId' || !prop.initializer) continue;
      if (
        ts.isJsxExpression(prop.initializer) &&
        prop.initializer.expression &&
        ts.isIdentifier(prop.initializer.expression)
      ) {
        const variants = conditional.get(prop.initializer.expression.text);
        if (variants?.length) return variants[0];
      }
    }
    return null;
  }

  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = jsxTagName(node);
      if (tag) {
        out.push({
          tagName: tag,
          binding: importByLocal.get(tag) ?? null,
          stateId: resolveStateId(node.attributes),
          dataPremiumState: readJsxStringAttr(node.attributes, 'data-m55-premium-state', sf),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return out;
}

export function proveOwnerModuleResolution(
  root: string,
  ownerFile: string,
  expectedSymbol: string,
  expectedResolvedModule: string,
): OwnerModuleProof {
  const host = createPremiumCompilerHost(root);
  const imports = parseImportBindings(root, ownerFile, host.options);
  const jsxUsages = parseJsxUsages(root, ownerFile, imports);
  return { ownerFile, expectedModule: expectedResolvedModule, symbol: expectedSymbol, jsxUsages, imports };
}

/** A JSX tag counts as a mount only when its binding resolves to the canonical module. */
export function jsxUsesResolvedSymbol(
  proof: OwnerModuleProof,
  jsxTag: string,
  expectedResolvedModule: string,
): boolean {
  return proof.jsxUsages.some((usage) => {
    if (usage.tagName !== jsxTag) return false;
    if (!usage.binding) return false;
    return sameModule(usage.binding.effectiveModule, expectedResolvedModule);
  });
}

export function importsResolveTo(
  root: string,
  fromRel: string,
  importName: string,
  expectedModule: string,
): ResolvedImportBinding | null {
  const host = createPremiumCompilerHost(root);
  const imports = parseImportBindings(root, fromRel, host.options);
  const hit = imports.find((i) => i.localName === importName);
  if (!hit) return null;
  if (!sameModule(hit.effectiveModule, expectedModule)) return null;
  return hit;
}
