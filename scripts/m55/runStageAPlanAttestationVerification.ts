#!/usr/bin/env node --experimental-strip-types
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { EXPECTED_REPO_ROOT } from '../../lib/m55/transactionNormalized/transactionNormalizedCore.ts';
import {
  normalizeToControlledHoldReasonCode,
  parseVerifierCliArgs,
  verifyPlanAttestationContent,
  type VerifierHoldReasonCode,
} from '../../lib/m55/transactionNormalized/planAttestationVerification.ts';

function formatSuccessOutput(): string {
  return `${JSON.stringify(
    {
      invocation_authority: 'UNTRUSTED_CALLER_INPUT',
      technical_outcome: 'ATTESTATION_CONTENT_VERIFIED',
      human_gate_outcome: 'HUMAN_GATE_REVIEW_REQUIRED',
      human_gate_required: true,
      plan_only_pass: false,
      execution_locked: true,
      automatic_next_gate: false,
      verifier_implementation_review_required: true,
    },
    null,
    2,
  )}\n`;
}

function formatHoldOutput(holdReasonCode: VerifierHoldReasonCode): string {
  return `${JSON.stringify(
    {
      invocation_authority: 'UNTRUSTED_CALLER_INPUT',
      technical_outcome: 'VERIFICATION_HOLD',
      human_gate_outcome: 'HUMAN_GATE_REVIEW_REQUIRED',
      human_gate_required: true,
      plan_only_pass: false,
      execution_locked: true,
      automatic_next_gate: false,
      verifier_implementation_review_required: true,
      hold_reason_code: holdReasonCode,
    },
    null,
    2,
  )}\n`;
}

async function main(argv: string[]): Promise<number> {
  try {
    const args = parseVerifierCliArgs(argv);
    const result = await verifyPlanAttestationContent({
      attestationPath: args.attestationPath,
      expectedAttestationSha256: args.expectedAttestationSha256,
      reviewRecordPath: args.reviewRecordPath,
      expectedReviewRecordSha256: args.expectedReviewRecordSha256,
      repoRoot: EXPECTED_REPO_ROOT,
    });
    if (result.technicalOutcome === 'ATTESTATION_CONTENT_VERIFIED') {
      process.stdout.write(formatSuccessOutput());
      return 0;
    }
    process.stdout.write(formatHoldOutput(result.holdReasonCode));
    return 1;
  } catch (error) {
    const code = normalizeToControlledHoldReasonCode(error);
    process.stdout.write(formatHoldOutput(code));
    return 1;
  }
}

const modulePath = fileURLToPath(import.meta.url);
const executedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === modulePath;
})();

if (executedDirectly) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      process.exitCode = 1;
    });
}
