#!/usr/bin/env node --experimental-strip-types
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { EXPECTED_REPO_ROOT } from '../../lib/m55/previewRemoteApply/types.ts';
import {
  getExecutionSqlAuthorityFoundationPublicSummary,
  validateExecutionSqlAuthorityFoundation,
} from '../../lib/m55/previewRemoteApply/executionSqlAuthorityFoundation.ts';

function formatOutput(): string {
  const summary = getExecutionSqlAuthorityFoundationPublicSummary(EXPECTED_REPO_ROOT);
  const validation = validateExecutionSqlAuthorityFoundation(EXPECTED_REPO_ROOT);
  return `${JSON.stringify(
    {
      invocation_authority: 'LOCAL_STATIC_VALIDATION_ONLY',
      technical_outcome: validation.ok ? 'FOUNDATION_AUTHORITY_VERIFIED' : 'FOUNDATION_VALIDATION_HOLD',
      execution_authorization: false,
      db_connection_remote: false,
      sql_executed_remote: false,
      migration_apply_authorized: false,
      hold_reason_code: validation.holdReasonCode,
      checked_category_count: validation.checkedCategories.length,
      mismatch_category_count: validation.mismatchCategories.length,
      summary,
    },
    null,
    2,
  )}\n`;
}

async function main(): Promise<number> {
  if (process.argv.length > 2) {
    process.stdout.write(formatOutput());
    return 1;
  }
  const validation = validateExecutionSqlAuthorityFoundation(EXPECTED_REPO_ROOT);
  process.stdout.write(formatOutput());
  return validation.ok ? 0 : 1;
}

const modulePath = fileURLToPath(import.meta.url);
const executedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === modulePath;
})();

if (executedDirectly) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      process.exitCode = 1;
    });
}
