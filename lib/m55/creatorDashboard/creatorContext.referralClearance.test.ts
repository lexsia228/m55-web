import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CLEARANCE_SQL = readFileSync(
  join(root, 'supabase/migrations/20261113153000_m55_r5_creator_referral_clearance_v1.sql'),
  'utf8',
);
const CTX_SRC = readFileSync(join(root, 'lib/m55/creatorDashboard/creatorContext.ts'), 'utf8');

describe('m55_r5_creator_referral_clearance_v1', () => {
  it('is SECURITY DEFINER with fixed search_path and boolean-only surface', () => {
    assert.match(CLEARANCE_SQL, /security definer/i);
    assert.match(CLEARANCE_SQL, /set search_path = ''/i);
    assert.match(CLEARANCE_SQL, /returns boolean/i);
    assert.doesNotMatch(CLEARANCE_SQL, /returns jsonb/i);
    assert.doesNotMatch(CLEARANCE_SQL, /returns setof/i);
  });

  it('preserves OPEN/HOLD blocking decision predicate', () => {
    assert.match(CLEARANCE_SQL, /status in \('OPEN', 'HOLD'\)/);
    assert.match(CLEARANCE_SQL, /decision is null/i);
    assert.match(CLEARANCE_SQL, /'KEEP_HOLD'/);
    assert.match(CLEARANCE_SQL, /'REQUEST_CORRECTION'/);
    assert.match(CLEARANCE_SQL, /'PAUSE_CREATOR'/);
    assert.match(CLEARANCE_SQL, /'TERMINATE_PARTNERSHIP'/);
    assert.match(CLEARANCE_SQL, /not exists/i);
  });

  it('grants EXECUTE only to service_role', () => {
    assert.match(
      CLEARANCE_SQL,
      /revoke all on function public\.m55_r5_creator_referral_clearance_v1\(uuid\)/i,
    );
    assert.match(
      CLEARANCE_SQL,
      /grant execute on function public\.m55_r5_creator_referral_clearance_v1\(uuid\) to service_role/i,
    );
    assert.doesNotMatch(CLEARANCE_SQL, /to authenticated/i);
    assert.doesNotMatch(CLEARANCE_SQL, /to anon/i);
    assert.doesNotMatch(CLEARANCE_SQL, /grant select on public\.m55_r5_compliance_cases/i);
  });

  it('does not relax table ACL on m55_r5_compliance_cases', () => {
    assert.doesNotMatch(CLEARANCE_SQL, /grant .* on public\.m55_r5_compliance_cases/i);
  });
});

describe('creatorContext referral clearance wiring', () => {
  it('calls clearance RPC instead of direct compliance_cases SELECT', () => {
    assert.match(CTX_SRC, /\.rpc\('m55_r5_creator_referral_clearance_v1'/);
    assert.match(CTX_SRC, /p_creator_economic_identity_id/);
    assert.doesNotMatch(CTX_SRC, /\.from\('m55_r5_compliance_cases'\)/);
  });
});
