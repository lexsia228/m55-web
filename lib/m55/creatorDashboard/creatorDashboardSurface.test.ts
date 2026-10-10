import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function resolveRelativeImport(fromFile: string, importPath: string): string {
  let current = dirname(join(root, fromFile));
  for (const segment of importPath.split('/')) {
    if (segment === '..') current = dirname(current);
    else if (segment !== '.') current = join(current, segment);
  }
  return `${current}.ts`;
}

describe('creator dashboard surface contracts', () => {
  it('resolves deep creator API imports to repository lib root', () => {
    for (const routeFile of [
      'app/api/creator/dashboard/export/route.ts',
      'app/api/creator/compliance/cases/route.ts',
    ]) {
      const src = readFileSync(join(root, routeFile), 'utf8');
      const importPath = src.match(
        /from '((?:\.\.\/)+lib\/m55\/creatorDashboard\/creatorContext)'/,
      )?.[1];
      assert.ok(importPath, `missing creatorContext import in ${routeFile}`);
      const ups = (importPath.match(/\.\.\//g) ?? []).length;
      const dirDepth = routeFile.split('/').slice(0, -1).length;
      assert.equal(ups, dirDepth, `import depth mismatch in ${routeFile}`);
      const resolved = resolveRelativeImport(routeFile, importPath);
      assert.equal(existsSync(resolved), true, resolved);
    }
  });

  it('registers R7 routes in route access contract', () => {
    const contract = readFileSync(join(root, 'lib/m55/authRouting/routeAccessContract.ts'), 'utf8');
    assert.match(contract, /'\/creator\/dashboard'/);
    assert.match(contract, /'\/m55\/r'/);
    assert.match(contract, /'\/api\/creator\/dashboard'/);
    assert.match(contract, /'\/api\/creator\/referrals\/issue'/);
  });

  it('does not expose token digest fields in referral API modules', () => {
    const lifecycle = readFileSync(join(root, 'lib/m55/creatorDashboard/referralLifecycle.ts'), 'utf8');
    assert.equal(lifecycle.includes('token_digest'), true);
    const issueRoute = readFileSync(join(root, 'app/api/creator/referrals/issue/route.ts'), 'utf8');
    assert.equal(issueRoute.includes('digest'), false);
    assert.match(issueRoute, /resolveCreatorReferralShareOriginV1/);
  });

  it('uses existence semantics for referral capability compliance gate', () => {
    const ctxSrc = readFileSync(join(root, 'lib/m55/creatorDashboard/creatorContext.ts'), 'utf8');
    assert.match(ctxSrc, /\.limit\(1\)/);
    assert.doesNotMatch(ctxSrc, /\.limit\(50\)/);
    assert.match(ctxSrc, /decision\.is\.null/);
  });

  it('paginates commission activity and compliance history with cursor propagation', () => {
    const clientSrc = readFileSync(
      join(root, 'app/creator/dashboard/CreatorDashboardClient.tsx'),
      'utf8',
    );
    assert.match(clientSrc, /commissionNextCursor/);
    assert.match(clientSrc, /complianceNextCursor/);
    assert.match(clientSrc, /loadMoreCommissionActivity/);
    assert.match(clientSrc, /loadMoreComplianceCases/);
    assert.match(clientSrc, /cursor: commissionNextCursor/);
    assert.match(clientSrc, /cursor: complianceNextCursor/);
    assert.match(clientSrc, /fromMs: String\(dashboard\.range\.fromMs\)/);
    assert.match(clientSrc, /コミッション活動をさらに読み込む/);
    assert.match(clientSrc, /コンプライアンス記録をさらに読み込む/);
    assert.match(clientSrc, /commissionMoreError/);
    assert.match(clientSrc, /\.\.\.prev\.commissionActivity\.rows/);
    assert.match(clientSrc, /\.\.\.prev, \.\.\.\(payload\.cases/);
  });

  it('migration enforces service-role-only RPC grants', () => {
    const sql = readFileSync(
      join(root, 'supabase/migrations/20261008000000_m55_r7_creator_dashboard_v1.sql'),
      'utf8',
    );
    assert.match(sql, /R7_REFERRAL_DUPLICATE_ACTIVE_PRECONDITION_FAILED/);
    assert.match(sql, /m55_r7_creator_referral_one_active_per_economic_identity/);
    assert.match(sql, /grant execute on function public\.m55_r7_creator_referral_issue_or_get_v1/);
    assert.match(sql, /for update/);
    assert.match(sql, /m55_r5_compliance_cases/);
    assert.match(sql, /to service_role/);
    assert.equal(/grant execute.*to authenticated/i.test(sql), false);
  });
});
