/**
 * TypeScript compiler module resolution for Premium Experience proof.
 */
import ts from 'typescript';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, normalize } from 'node:path';

export type ResolvedImportBinding = {
  localName: string;
  moduleSpecifier: string;
  resolvedPath: string;
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

function normalizeRel(root: string, absPath: string): string {
  const rel = normalize(relative(root, absPath)).split('\\').join('/');
  return rel.startsWith('.') ? rel.slice(2) : rel;
}

function stripExtension(rel: string): string {
  return rel.replace(/\.(tsx|ts|jsx|js)$/, '');
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

export function parseImportBindings(
  root: string,
  relPath: string,
  options: ts.CompilerOptions,
): ResolvedImportBinding[] {
  const abs = join(root, relPath);
  const src = readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(relPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: ResolvedImportBinding[] = [];

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
      out.push({
        localName: clause.name.text,
        moduleSpecifier: specifier,
        resolvedPath,
        isDefault: true,
        isNamespace: false,
      });
    }
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      out.push({
        localName: clause.namedBindings.name.text,
        moduleSpecifier: specifier,
        resolvedPath,
        isDefault: false,
        isNamespace: true,
      });
    }
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) {
        out.push({
          localName: el.name.text,
          moduleSpecifier: specifier,
          resolvedPath,
          isDefault: false,
          isNamespace: false,
        });
      }
    }
  }
  return out;
}

function jsxTagName(node: ts.JsxOpeningLikeElement, sf: ts.SourceFile): string | null {
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

function collectConditionalConstStrings(sf: ts.SourceFile): Map<string, string[]> {
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
  const abs = join(root, relPath);
  const src = readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(relPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
      const tag = jsxTagName(node, sf);
      if (!tag) {
        ts.forEachChild(node, visit);
        return;
      }
      out.push({
        tagName: tag,
        binding: importByLocal.get(tag) ?? null,
        stateId: resolveStateId(node.attributes),
        dataPremiumState: readJsxStringAttr(node.attributes, 'data-m55-premium-state', sf),
      });
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
  const expectedNorm = stripExtension(expectedResolvedModule);
  const binding = imports.find((i) => i.localName === expectedSymbol);
  if (binding && stripExtension(binding.resolvedPath) !== expectedNorm) {
    throw new Error(
      `${ownerFile}: ${expectedSymbol} resolves to ${binding.resolvedPath}, expected ${expectedResolvedModule}`,
    );
  }
  return { ownerFile, expectedModule: expectedResolvedModule, symbol: expectedSymbol, jsxUsages, imports };
}

export function jsxUsesResolvedSymbol(
  proof: OwnerModuleProof,
  jsxTag: string,
  expectedResolvedModule: string,
): boolean {
  const expectedNorm = stripExtension(expectedResolvedModule);
  return proof.jsxUsages.some((usage) => {
    if (usage.tagName !== jsxTag) return false;
    if (!usage.binding) return false;
    return stripExtension(usage.binding.resolvedPath) === expectedNorm;
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
  const expectedNorm = stripExtension(expectedModule);
  const hit = imports.find((i) => i.localName === importName);
  if (!hit) return null;
  if (stripExtension(hit.resolvedPath) !== expectedNorm) return null;
  return hit;
}
