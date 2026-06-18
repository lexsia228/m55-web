import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EXPECTED_ROUTE_REGISTRY = [
  "app/api/diagnostics/env/route.ts",
  "app/api/diagnostics/build/route.ts",
  "app/api/diagnostics/provision/route.ts",
  "app/api/diagnostics/core-regression/route.ts",
] as const;

const ENV_ROUTE_PATH = join(ROOT, "app/api/diagnostics/env/route.ts");
const BUILD_ROUTE_PATH = join(ROOT, "app/api/diagnostics/build/route.ts");
const PROVISION_ROUTE_PATH = join(ROOT, "app/api/diagnostics/provision/route.ts");
const CORE_ROUTE_PATH = join(ROOT, "app/api/diagnostics/core-regression/route.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function diagnosticsRouteRegistry(): string[] {
  const diagnosticsRoot = join(ROOT, "app/api/diagnostics");
  const children = readdirSync(diagnosticsRoot, { withFileTypes: true });
  const routes: string[] = [];
  for (const entry of children) {
    if (!entry.isDirectory()) continue;
    const routePath = join(diagnosticsRoot, entry.name, "route.ts");
    if (!existsSync(routePath)) continue;
    if (!statSync(routePath).isFile()) continue;
    routes.push(`app/api/diagnostics/${entry.name}/route.ts`);
  }
  return routes.sort();
}

describe("allowlist and source presence", () => {
  it("all four routes exist", () => {
    assert.equal(existsSync(ENV_ROUTE_PATH), true);
    assert.equal(existsSync(BUILD_ROUTE_PATH), true);
    assert.equal(existsSync(PROVISION_ROUTE_PATH), true);
    assert.equal(existsSync(CORE_ROUTE_PATH), true);
  });

  it("no unexpected diagnostics route source is added", () => {
    assert.deepEqual(diagnosticsRouteRegistry(), [...EXPECTED_ROUTE_REGISTRY].sort());
  });
});

describe("deployed guard contract", () => {
  it("env/provision/core include deployed guard before sensitive work", () => {
    const envSrc = read(ENV_ROUTE_PATH);
    assert.match(envSrc, /process\.env\.VERCEL === "1" \|\| Boolean\(process\.env\.VERCEL_ENV\)/);
    assert.ok(envSrc.indexOf("process.env.VERCEL") < envSrc.indexOf("const present ="));

    const provisionSrc = read(PROVISION_ROUTE_PATH);
    assert.match(provisionSrc, /process\.env\.VERCEL === "1" \|\| Boolean\(process\.env\.VERCEL_ENV\)/);
    assert.ok(provisionSrc.indexOf("process.env.VERCEL") < provisionSrc.indexOf("await auth()"));
    assert.ok(provisionSrc.indexOf("process.env.VERCEL") < provisionSrc.indexOf("createClient("));
    assert.ok(provisionSrc.indexOf("process.env.VERCEL") < provisionSrc.indexOf(".upsert("));

    const coreSrc = read(CORE_ROUTE_PATH);
    assert.match(coreSrc, /process\.env\.VERCEL === '1' \|\| Boolean\(process\.env\.VERCEL_ENV\)/);
    assert.ok(coreSrc.indexOf("process.env.VERCEL") < coreSrc.indexOf("const vectors ="));
  });

  it("deployed env/core/provision return 404 no-store null body by source contract", () => {
    const envSrc = read(ENV_ROUTE_PATH);
    assert.match(envSrc, /status:\s*404/);
    assert.match(envSrc, /"Cache-Control":\s*"no-store"/);
    assert.match(envSrc, /new NextResponse\(null/);

    const provisionSrc = read(PROVISION_ROUTE_PATH);
    assert.match(provisionSrc, /status:\s*404/);
    assert.match(provisionSrc, /"Cache-Control":\s*"no-store"/);
    assert.match(provisionSrc, /new NextResponse\(null/);

    const coreSrc = read(CORE_ROUTE_PATH);
    assert.match(coreSrc, /status:\s*404/);
    assert.match(coreSrc, /'Cache-Control':\s*'no-store'/);
    assert.match(coreSrc, /new NextResponse\(null/);
  });
});

describe("local behavior preservation", () => {
  it("env local GET keeps previous health contract source shape", () => {
    const src = read(ENV_ROUTE_PATH);
    assert.match(src, /const present = Object\.fromEntries/);
    assert.match(src, /return NextResponse\.json\(\{ ok: true, present \}\)/);
  });

  it("core local GET still builds diagnostics vectors payload", () => {
    const src = read(CORE_ROUTE_PATH);
    assert.match(src, /const vectors = \{/);
    assert.match(src, /ok:\s*allPassed/);
    assert.match(src, /vectors:\s*\{/);
  });

  it("provision local POST still has auth/mutation path and GET/HEAD fail-closed", () => {
    const src = read(PROVISION_ROUTE_PATH);
    assert.match(src, /await auth\(\)/);
    assert.match(src, /createClient\(/);
    assert.match(src, /\.upsert\(/);
    assert.match(src, /export async function GET\(\)/);
    assert.match(src, /export async function HEAD\(\)/);
    assert.match(src, /status:\s*404/);
  });

  it("build route remains public GET and does not add deployed 404 guard", () => {
    const src = read(BUILD_ROUTE_PATH);
    assert.match(src, /export async function GET\(\)/);
    assert.doesNotMatch(src, /status:\s*404/);
    assert.doesNotMatch(src, /process\.env\.VERCEL === ["']1["']/);
  });
});

describe("build route safe schema", () => {
  it("contains only approved keys and no-store in source object", () => {
    const src = read(BUILD_ROUTE_PATH);
    assert.match(src, /vercel_env:\s*process\.env\.VERCEL_ENV \?\? null/);
    assert.match(src, /vercel_git_sha:\s*process\.env\.VERCEL_GIT_COMMIT_SHA \?\? null/);
    assert.match(src, /vercel_branch:\s*process\.env\.VERCEL_GIT_COMMIT_REF \?\? null/);
    assert.match(src, /node_env:\s*process\.env\.NODE_ENV \?\? null/);
    assert.match(src, /"Cache-Control":\s*"no-store"/);
  });

  it("has no object spread or mutation side effects", () => {
    const src = read(BUILD_ROUTE_PATH);
    assert.doesNotMatch(src, /\.\.\.process\.env/);
    assert.doesNotMatch(src, /process\.env\s*=/);
  });
});

describe("security and patch boundary", () => {
  it("deployed paths short-circuit before diagnostic disclosure", () => {
    const envSrc = read(ENV_ROUTE_PATH);
    assert.ok(envSrc.indexOf("status: 404") < envSrc.indexOf("const present ="));
    const coreSrc = read(CORE_ROUTE_PATH);
    assert.ok(coreSrc.indexOf("status: 404") < coreSrc.indexOf("const vectors ="));
    const provisionSrc = read(PROVISION_ROUTE_PATH);
    assert.ok(provisionSrc.indexOf("status: 404") < provisionSrc.indexOf("await auth()"));
  });

  it("deployed guard relies only on server env metadata, not client input", () => {
    const envSrc = read(ENV_ROUTE_PATH);
    const provisionSrc = read(PROVISION_ROUTE_PATH);
    const coreSrc = read(CORE_ROUTE_PATH);
    const merged = `${envSrc}\n${provisionSrc}\n${coreSrc}`;

    assert.doesNotMatch(merged, /headers\.get\(/);
    assert.doesNotMatch(merged, /searchParams\.get\(['"](?:vercel|deploy|diagnostic|gate)/i);
    assert.doesNotMatch(merged, /cookies?\(/);

    const guardMatches = merged.match(/process\.env\.(VERCEL|VERCEL_ENV)/g) ?? [];
    assert.ok(guardMatches.length >= 6);
  });
});
