#!/usr/bin/env node
import {
  evaluateIsolatedSupabaseAlignmentV1,
  listIsolatedSupabaseAlignmentChecklistV1,
} from '../lib/m55/creatorProvider/r8IsolatedSupabaseAlignment.ts';

const checklist = listIsolatedSupabaseAlignmentChecklistV1();
if (checklist.length > 0) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of checklist) console.error(`- ${line}`);
  process.exit(2);
}

const result = evaluateIsolatedSupabaseAlignmentV1();
if (!result.ok) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  process.exit(2);
}

console.log(
  JSON.stringify({
    ok: true,
    supabaseProjectRefSuffix: result.supabaseProjectRefSuffix,
    postgresHostKind: result.postgresHostKind,
  }),
);
