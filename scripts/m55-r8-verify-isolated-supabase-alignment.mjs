#!/usr/bin/env node
import {
  alignmentFailureChecklistV1,
  evaluateIsolatedSupabaseAlignmentLiveV1,
  listIsolatedSupabaseAlignmentChecklistV1,
} from '../lib/m55/creatorProvider/r8IsolatedSupabaseAlignment.ts';

const structural = listIsolatedSupabaseAlignmentChecklistV1();
if (structural.length > 0) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of structural) console.error(`- ${line}`);
  process.exit(2);
}

const result = await evaluateIsolatedSupabaseAlignmentLiveV1();
if (!result.ok) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of alignmentFailureChecklistV1(result.reason)) console.error(`- ${line}`);
  process.exit(2);
}

console.log(
  JSON.stringify({
    ok: true,
    alignment: 'LIVE_READ_PROBE',
    supabaseProjectRefSuffix: result.supabaseProjectRefSuffix,
    postgresConnectionKind: result.postgresConnectionKind,
    humanProjectRefConfirmed: result.humanProjectRefConfirmed,
    serviceRoleKeyFormat: result.serviceRoleKeyFormat,
    serviceRoleJwtRefMatched: result.serviceRoleJwtRefMatched,
  }),
);
