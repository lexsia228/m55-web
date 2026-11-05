import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const rel = 'supabase/migrations/20261010000000_m55_pair_checkout_reservation_v1.sql';
const raw = readFileSync(join(repoRoot, rel));
const sha = createHash('sha256').update(raw).digest('hex');
const text = raw.toString('utf8');
const parts = text
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'));
console.log(JSON.stringify({ sha, byteLength: raw.length, statementCount: parts.length }, null, 2));
