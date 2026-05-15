#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { collectViolationsForLine, PUBLIC_SCAN_ROOTS, RESERVE_SCAN_ROOTS } from "./ssot-public-vocabulary-rules.mjs";
const ROOT = process.cwd();
const EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIR = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);
const reserveScan = process.argv.includes("--reserve-scan");
function posix(p) { return path.relative(ROOT, p).split(path.sep).join("/"); }
function walkFiles(dir, out) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walkFiles(p, out); }
    else if (e.isFile() && EXT.has(path.extname(e.name))) out.push(p);
  }
}
function collectRoots() {
  const roots = [...PUBLIC_SCAN_ROOTS];
  if (reserveScan) roots.push(...RESERVE_SCAN_ROOTS);
  const files = [];
  for (const r of roots) {
    const abs = path.join(ROOT, r);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) walkFiles(abs, files);
  }
  return [...new Set(files)].sort();
}
function scanFile(absPath) {
  const fileRel = posix(absPath);
  let text;
  try { text = fs.readFileSync(absPath, "utf8"); } catch { return []; }
  const lines = text.split(/\r?\n/);
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    violations.push(...collectViolationsForLine(lines[i], fileRel, i + 1));
  }
  return violations;
}
function severityOrder(s) {
  if (s === "critical") return 0;
  if (s === "major") return 1;
  return 2;
}
const files = collectRoots();
let all = [];
for (const f of files) all.push(...scanFile(f));
all.sort((a, b) => {
  const c = severityOrder(a.severity) - severityOrder(b.severity);
  if (c !== 0) return c;
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  return a.line - b.line;
});
process.stdout.write(JSON.stringify({ violations: all }, null, 2) + "\n");
if (all.length > 0) {
  console.error("[ssot-audit] FAIL: " + all.length + " violation(s)");
  for (const v of all) {
    console.error("[ssot-audit] " + v.severity + " " + v.type + " " + v.file + ":" + v.line + " current=" + JSON.stringify(v.current) + " expected=" + v.expected);
  }
  process.exit(1);
}
console.error("[ssot-audit] OK: 0 violations");