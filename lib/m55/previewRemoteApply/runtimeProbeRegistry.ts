import { createHash } from 'node:crypto';

import {
  canonicalSerializePreviewRemoteApply,
  sanitizePreviewRemoteApplyHoldCode,
  type PhaseId,
  type StepId,
} from './types.ts';
import {
  P8_MIGRATION_VERSION,
  P8_POST_HISTORY_PREFIX,
  P8_POST_PROBE_SQL_BYTES,
  P8_POST_PROBE_SQL_SHA256,
  P8_PRIOR_HISTORY_PREFIX,
} from './types.ts';

export const M55_PREVIEW_REMOTE_APPLY_RUNTIME_PROBE_REGISTRY_V1 =
  'M55_PREVIEW_REMOTE_APPLY_RUNTIME_PROBE_REGISTRY_v1' as const;

export type RuntimeProbeClass = 'A' | 'B' | 'C' | 'D' | 'E';

export type AckClassifierOutcome =
  | 'DEFINITELY_NOT_COMMITTED'
  | 'DEFINITELY_COMMITTED'
  | 'CONTRADICTORY_OR_DRIFTED';

export type AckClassifierPhaseBinding = {
  readonly stepId: StepId;
  readonly priorHistoryPrefix: readonly string[];
  readonly postHistoryPrefix: readonly string[];
  readonly priorOracleHashSha256: string;
  readonly postOracleHashSha256: string;
  readonly possibleOutcomes: readonly [
    AckClassifierOutcome,
    AckClassifierOutcome,
    AckClassifierOutcome,
  ];
};

export type OrdinaryRuntimeProbeEntry = {
  readonly kind: 'ORDINARY';
  readonly id: string;
  readonly probeClass: Exclude<RuntimeProbeClass, 'D'>;
  readonly phase: PhaseId;
  readonly expectedHistoryPrefix: readonly string[];
  readonly oracleContractHashSha256: string;
  readonly currentVersionDeltaRule: string;
  readonly unexpectedDeltaRule: string;
  readonly targetIdentityRequired: true;
  readonly insideTransaction: boolean;
  readonly readOnly: true;
  readonly expectedResultShape: string;
  readonly holdCode: string;
  readonly externalSqlAuthority?: {
    readonly filename: string;
    readonly bytes: number;
    readonly sha256: string;
  };
};

export type AckClassifierRuntimeProbeEntry = {
  readonly kind: 'ACK_CLASSIFIER';
  readonly id: 'ACK_CLASSIFIER';
  readonly probeClass: 'D';
  readonly phaseMode: 'DYNAMIC_P1_P7';
  readonly bindings: readonly AckClassifierPhaseBinding[];
  readonly currentVersionDeltaRule: 'ack_classifier_predicate_set';
  readonly unexpectedDeltaRule: 'contradictory_or_drifted_stop';
  readonly targetIdentityRequired: true;
  readonly insideTransaction: false;
  readonly readOnly: true;
  readonly expectedResultShape: 'classification_row';
  readonly holdCode: 'HOLD_INVALID_HISTORY_PREFIX';
};

export type RuntimeProbeEntry = OrdinaryRuntimeProbeEntry | AckClassifierRuntimeProbeEntry;

const ORACLE_HASHES = {
  P0: '85ac8761006ba1f9bf1f1cbfcd7940f81e21fb393eb50d1289ac31fd894f6792',
  P1: '77ba63b64fee47ca9b6deec00bb76f90fe239f6b236994116afdf8be9735fc0c',
  P2: '6bc6fef759709ae8212c47c364fe34b9af6eb4e751633e128d222293e2af44b8',
  P3: 'a37c214b6722e86e0235a37dbef2274edc271e4736f400b1cda512aeda7768b2',
  P4: 'dd80ce8029453c787ad4d645b5902038cb48b19c775f9ceff0d018fa59cead5b',
  P5: '154852f6c7681262c3e615a61df342a3e21ef8fd4d6bbbf642d38c5d3ac85139',
  P6: 'a70ed4282d55552c2a3bd1ef9448cecba5f01847b23de03f8e2c64ffbd9017d2',
  P7: '04860bcbfccb948acf5682c0bd4f787b9356b479ef18805834416f2f8e15a8e3',
  P8: P8_POST_PROBE_SQL_SHA256,
} as const;

const HISTORY_PREFIXES = {
  P0: [] as const,
  P1: ['20260614000000'] as const,
  P2: ['20260614000000', '20260615000001'] as const,
  P3: ['20260614000000', '20260615000001', '20260615000002'] as const,
  P4: ['20260614000000', '20260615000001', '20260615000002', '20260615000003'] as const,
  P5: [
    '20260614000000',
    '20260615000001',
    '20260615000002',
    '20260615000003',
    '20260615000004',
  ] as const,
  P6: [
    '20260614000000',
    '20260615000001',
    '20260615000002',
    '20260615000003',
    '20260615000004',
    '20260615000005',
  ] as const,
  P7: [
    '20260614000000',
    '20260615000001',
    '20260615000002',
    '20260615000003',
    '20260615000004',
    '20260615000005',
    '20260615000006',
  ] as const,
  P8: P8_POST_HISTORY_PREFIX,
} as const;

const EXPECTED_PROBE_IDS = [
  'P0_PREFLIGHT_PATCH2',
  'PRIOR_P1',
  'PRIOR_P2',
  'PRIOR_P3',
  'PRIOR_P4',
  'PRIOR_P5',
  'PRIOR_P6',
  'PRIOR_P7',
  'PRIOR_P8',
  'POST_P1',
  'POST_P2',
  'POST_P3',
  'POST_P4',
  'POST_P5',
  'POST_P6',
  'POST_P7',
  'POST_P8',
  'ACK_CLASSIFIER',
  'FINAL_P7_CHAIN',
] as const;

const ACK_OUTCOMES: readonly [
  AckClassifierOutcome,
  AckClassifierOutcome,
  AckClassifierOutcome,
] = ['DEFINITELY_NOT_COMMITTED', 'DEFINITELY_COMMITTED', 'CONTRADICTORY_OR_DRIFTED'];

function priorPrefix(step: keyof typeof HISTORY_PREFIXES): readonly string[] {
  if (step === 'P1') return HISTORY_PREFIXES.P0;
  if (step === 'P2') return HISTORY_PREFIXES.P1;
  if (step === 'P3') return HISTORY_PREFIXES.P2;
  if (step === 'P4') return HISTORY_PREFIXES.P3;
  if (step === 'P5') return HISTORY_PREFIXES.P4;
  if (step === 'P6') return HISTORY_PREFIXES.P5;
  if (step === 'P7') return HISTORY_PREFIXES.P6;
  if (step === 'P8') return HISTORY_PREFIXES.P7;
  return HISTORY_PREFIXES.P6;
}

function priorOracle(step: keyof typeof ORACLE_HASHES): string {
  if (step === 'P1') return ORACLE_HASHES.P0;
  if (step === 'P2') return ORACLE_HASHES.P1;
  if (step === 'P3') return ORACLE_HASHES.P2;
  if (step === 'P4') return ORACLE_HASHES.P3;
  if (step === 'P5') return ORACLE_HASHES.P4;
  if (step === 'P6') return ORACLE_HASHES.P5;
  if (step === 'P7') return ORACLE_HASHES.P6;
  if (step === 'P8') return ORACLE_HASHES.P7;
  return ORACLE_HASHES.P6;
}

function buildAckBindings(): readonly AckClassifierPhaseBinding[] {
  const steps: StepId[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  return steps.map((stepId) => ({
    stepId,
    priorHistoryPrefix: priorPrefix(stepId),
    postHistoryPrefix: HISTORY_PREFIXES[stepId],
    priorOracleHashSha256: priorOracle(stepId),
    postOracleHashSha256: ORACLE_HASHES[stepId],
    possibleOutcomes: ACK_OUTCOMES,
  }));
}

export const RUNTIME_PROBE_ENTRIES: readonly RuntimeProbeEntry[] = [
  {
    kind: 'ORDINARY',
    id: 'P0_PREFLIGHT_PATCH2',
    probeClass: 'A',
    phase: 'P0',
    expectedHistoryPrefix: HISTORY_PREFIXES.P0,
    oracleContractHashSha256: ORACLE_HASHES.P0,
    currentVersionDeltaRule: 'greenfield_catalog_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_BOOTSTRAP_PRECONDITION',
    externalSqlAuthority: {
      filename: 'M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
      bytes: 21188,
      sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff',
    },
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P1',
    probeClass: 'B',
    phase: 'P1',
    expectedHistoryPrefix: priorPrefix('P1'),
    oracleContractHashSha256: priorOracle('P1'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P2',
    probeClass: 'B',
    phase: 'P2',
    expectedHistoryPrefix: priorPrefix('P2'),
    oracleContractHashSha256: priorOracle('P2'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P3',
    probeClass: 'B',
    phase: 'P3',
    expectedHistoryPrefix: priorPrefix('P3'),
    oracleContractHashSha256: priorOracle('P3'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P4',
    probeClass: 'B',
    phase: 'P4',
    expectedHistoryPrefix: priorPrefix('P4'),
    oracleContractHashSha256: priorOracle('P4'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P5',
    probeClass: 'B',
    phase: 'P5',
    expectedHistoryPrefix: priorPrefix('P5'),
    oracleContractHashSha256: priorOracle('P5'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P6',
    probeClass: 'B',
    phase: 'P6',
    expectedHistoryPrefix: priorPrefix('P6'),
    oracleContractHashSha256: priorOracle('P6'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P7',
    probeClass: 'B',
    phase: 'P7',
    expectedHistoryPrefix: priorPrefix('P7'),
    oracleContractHashSha256: priorOracle('P7'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'PRIOR_P8',
    probeClass: 'B',
    phase: 'P7',
    expectedHistoryPrefix: priorPrefix('P8'),
    oracleContractHashSha256: priorOracle('P8'),
    currentVersionDeltaRule: 'current_version_delta_absent',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: true,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P1',
    probeClass: 'C',
    phase: 'P1',
    expectedHistoryPrefix: HISTORY_PREFIXES.P1,
    oracleContractHashSha256: ORACLE_HASHES.P1,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P2',
    probeClass: 'C',
    phase: 'P2',
    expectedHistoryPrefix: HISTORY_PREFIXES.P2,
    oracleContractHashSha256: ORACLE_HASHES.P2,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P3',
    probeClass: 'C',
    phase: 'P3',
    expectedHistoryPrefix: HISTORY_PREFIXES.P3,
    oracleContractHashSha256: ORACLE_HASHES.P3,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P4',
    probeClass: 'C',
    phase: 'P4',
    expectedHistoryPrefix: HISTORY_PREFIXES.P4,
    oracleContractHashSha256: ORACLE_HASHES.P4,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P5',
    probeClass: 'C',
    phase: 'P5',
    expectedHistoryPrefix: HISTORY_PREFIXES.P5,
    oracleContractHashSha256: ORACLE_HASHES.P5,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P6',
    probeClass: 'C',
    phase: 'P6',
    expectedHistoryPrefix: HISTORY_PREFIXES.P6,
    oracleContractHashSha256: ORACLE_HASHES.P6,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P7',
    probeClass: 'C',
    phase: 'P7',
    expectedHistoryPrefix: HISTORY_PREFIXES.P7,
    oracleContractHashSha256: ORACLE_HASHES.P7,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'POST_P8',
    probeClass: 'C',
    phase: 'P8',
    expectedHistoryPrefix: HISTORY_PREFIXES.P8,
    oracleContractHashSha256: ORACLE_HASHES.P8,
    currentVersionDeltaRule: 'current_version_delta_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
    externalSqlAuthority: {
      filename: 'P8_POST_PROBE_SQL',
      bytes: P8_POST_PROBE_SQL_BYTES,
      sha256: P8_POST_PROBE_SQL_SHA256,
    },
  },
  {
    kind: 'ACK_CLASSIFIER',
    id: 'ACK_CLASSIFIER',
    probeClass: 'D',
    phaseMode: 'DYNAMIC_P1_P7',
    bindings: buildAckBindings(),
    currentVersionDeltaRule: 'ack_classifier_predicate_set',
    unexpectedDeltaRule: 'contradictory_or_drifted_stop',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'classification_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
  {
    kind: 'ORDINARY',
    id: 'FINAL_P7_CHAIN',
    probeClass: 'E',
    phase: 'P7',
    expectedHistoryPrefix: HISTORY_PREFIXES.P7,
    oracleContractHashSha256: ORACLE_HASHES.P7,
    currentVersionDeltaRule: 'full_chain_present',
    unexpectedDeltaRule: 'unexpected_delta_zero',
    targetIdentityRequired: true,
    insideTransaction: false,
    readOnly: true,
    expectedResultShape: 'single_json_row',
    holdCode: 'HOLD_INVALID_HISTORY_PREFIX',
  },
] as const;

export type RuntimeProbeRegistry = {
  readonly identifier: typeof M55_PREVIEW_REMOTE_APPLY_RUNTIME_PROBE_REGISTRY_V1;
  readonly entries: readonly RuntimeProbeEntry[];
  readonly canonical_payload_sha256: string;
};

export function computeRuntimeProbeRegistryCanonicalPayloadSha256(
  entries: readonly RuntimeProbeEntry[] = RUNTIME_PROBE_ENTRIES,
): string {
  const payload = {
    identifier: M55_PREVIEW_REMOTE_APPLY_RUNTIME_PROBE_REGISTRY_V1,
    entries,
  };
  return createHash('sha256')
    .update(Buffer.from(canonicalSerializePreviewRemoteApply(payload), 'utf8'))
    .digest('hex');
}

export const RUNTIME_PROBE_REGISTRY: RuntimeProbeRegistry = {
  identifier: M55_PREVIEW_REMOTE_APPLY_RUNTIME_PROBE_REGISTRY_V1,
  entries: RUNTIME_PROBE_ENTRIES,
  canonical_payload_sha256: computeRuntimeProbeRegistryCanonicalPayloadSha256(),
};

function isLowerHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function getRuntimeProbeById(id: string): RuntimeProbeEntry | undefined {
  return RUNTIME_PROBE_ENTRIES.find((entry) => entry.id === id);
}

const P0_EXTERNAL_SQL_AUTHORITY = {
  filename: 'M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
  bytes: 21188,
  sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff',
} as const;

function prefixEqual(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function outcomesEqual(
  left: readonly [AckClassifierOutcome, AckClassifierOutcome, AckClassifierOutcome],
  right: readonly [AckClassifierOutcome, AckClassifierOutcome, AckClassifierOutcome],
): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

function parsePriorStepId(id: string): StepId | null {
  const match = /^PRIOR_(P[1-8])$/.exec(id);
  return match ? (match[1] as StepId) : null;
}

function parsePostStepId(id: string): StepId | null {
  const match = /^POST_(P[1-8])$/.exec(id);
  return match ? (match[1] as StepId) : null;
}

function validateOrdinaryEntryContract(entry: OrdinaryRuntimeProbeEntry): void {
  if (entry.kind !== 'ORDINARY') {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }
  if (entry.targetIdentityRequired !== true || entry.readOnly !== true) {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }
  if (sanitizePreviewRemoteApplyHoldCode(entry.holdCode) !== entry.holdCode) {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }
  if (!isLowerHex64(entry.oracleContractHashSha256)) {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }

  if (entry.id === 'P0_PREFLIGHT_PATCH2') {
    if (
      entry.probeClass !== 'A' ||
      entry.phase !== 'P0' ||
      !prefixEqual(entry.expectedHistoryPrefix, HISTORY_PREFIXES.P0) ||
      entry.oracleContractHashSha256 !== ORACLE_HASHES.P0 ||
      entry.currentVersionDeltaRule !== 'greenfield_catalog_absent' ||
      entry.unexpectedDeltaRule !== 'unexpected_delta_zero' ||
      entry.insideTransaction !== false ||
      entry.expectedResultShape !== 'single_json_row' ||
      entry.holdCode !== 'HOLD_BOOTSTRAP_PRECONDITION' ||
      !entry.externalSqlAuthority ||
      entry.externalSqlAuthority.filename !== P0_EXTERNAL_SQL_AUTHORITY.filename ||
      entry.externalSqlAuthority.bytes !== P0_EXTERNAL_SQL_AUTHORITY.bytes ||
      entry.externalSqlAuthority.sha256 !== P0_EXTERNAL_SQL_AUTHORITY.sha256
    ) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
    return;
  }

  const priorStep = parsePriorStepId(entry.id);
  if (priorStep) {
    const expectedPriorPhase: PhaseId = priorStep === 'P8' ? 'P7' : priorStep;
    if (
      entry.probeClass !== 'B' ||
      entry.phase !== expectedPriorPhase ||
      !prefixEqual(entry.expectedHistoryPrefix, priorPrefix(priorStep)) ||
      entry.oracleContractHashSha256 !== priorOracle(priorStep) ||
      entry.currentVersionDeltaRule !== 'current_version_delta_absent' ||
      entry.unexpectedDeltaRule !== 'unexpected_delta_zero' ||
      entry.insideTransaction !== true ||
      entry.expectedResultShape !== 'single_json_row' ||
      entry.holdCode !== 'HOLD_INVALID_HISTORY_PREFIX' ||
      entry.externalSqlAuthority !== undefined
    ) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
    return;
  }

  const postStep = parsePostStepId(entry.id);
  if (postStep) {
    if (postStep === 'P8') {
      if (
        entry.probeClass !== 'C' ||
        entry.phase !== 'P8' ||
        !prefixEqual(entry.expectedHistoryPrefix, HISTORY_PREFIXES.P8) ||
        entry.oracleContractHashSha256 !== ORACLE_HASHES.P8 ||
        entry.currentVersionDeltaRule !== 'current_version_delta_present' ||
        entry.unexpectedDeltaRule !== 'unexpected_delta_zero' ||
        entry.insideTransaction !== false ||
        entry.expectedResultShape !== 'single_json_row' ||
        entry.holdCode !== 'HOLD_INVALID_HISTORY_PREFIX' ||
        !entry.externalSqlAuthority ||
        entry.externalSqlAuthority.filename !== 'P8_POST_PROBE_SQL' ||
        entry.externalSqlAuthority.bytes !== P8_POST_PROBE_SQL_BYTES ||
        entry.externalSqlAuthority.sha256 !== P8_POST_PROBE_SQL_SHA256
      ) {
        throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
      }
      return;
    }
    if (
      entry.probeClass !== 'C' ||
      entry.phase !== postStep ||
      !prefixEqual(entry.expectedHistoryPrefix, HISTORY_PREFIXES[postStep]) ||
      entry.oracleContractHashSha256 !== ORACLE_HASHES[postStep] ||
      entry.currentVersionDeltaRule !== 'current_version_delta_present' ||
      entry.unexpectedDeltaRule !== 'unexpected_delta_zero' ||
      entry.insideTransaction !== false ||
      entry.expectedResultShape !== 'single_json_row' ||
      entry.holdCode !== 'HOLD_INVALID_HISTORY_PREFIX' ||
      entry.externalSqlAuthority !== undefined
    ) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
    return;
  }

  if (entry.id === 'FINAL_P7_CHAIN') {
    if (
      entry.probeClass !== 'E' ||
      entry.phase !== 'P7' ||
      !prefixEqual(entry.expectedHistoryPrefix, HISTORY_PREFIXES.P7) ||
      entry.oracleContractHashSha256 !== ORACLE_HASHES.P7 ||
      entry.currentVersionDeltaRule !== 'full_chain_present' ||
      entry.unexpectedDeltaRule !== 'unexpected_delta_zero' ||
      entry.insideTransaction !== false ||
      entry.expectedResultShape !== 'single_json_row' ||
      entry.holdCode !== 'HOLD_INVALID_HISTORY_PREFIX' ||
      entry.externalSqlAuthority !== undefined
    ) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
    return;
  }

  throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
}

function validateAckClassifierEntryContract(
  entry: AckClassifierRuntimeProbeEntry,
  entryMap: ReadonlyMap<string, RuntimeProbeEntry>,
): void {
  if (
    entry.kind !== 'ACK_CLASSIFIER' ||
    entry.id !== 'ACK_CLASSIFIER' ||
    entry.probeClass !== 'D' ||
    entry.phaseMode !== 'DYNAMIC_P1_P7' ||
    entry.currentVersionDeltaRule !== 'ack_classifier_predicate_set' ||
    entry.unexpectedDeltaRule !== 'contradictory_or_drifted_stop' ||
    entry.targetIdentityRequired !== true ||
    entry.insideTransaction !== false ||
    entry.readOnly !== true ||
    entry.expectedResultShape !== 'classification_row' ||
    entry.holdCode !== 'HOLD_INVALID_HISTORY_PREFIX' ||
    entry.bindings.length !== 7
  ) {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }

  const expectedSteps: StepId[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  for (let index = 0; index < expectedSteps.length; index += 1) {
    const expectedStep = expectedSteps[index];
    const binding = entry.bindings[index];
    if (!binding || binding.stepId !== expectedStep) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
    if (
      !prefixEqual(binding.priorHistoryPrefix, priorPrefix(expectedStep)) ||
      !prefixEqual(binding.postHistoryPrefix, HISTORY_PREFIXES[expectedStep]) ||
      binding.priorOracleHashSha256 !== priorOracle(expectedStep) ||
      binding.postOracleHashSha256 !== ORACLE_HASHES[expectedStep] ||
      !outcomesEqual(binding.possibleOutcomes, ACK_OUTCOMES) ||
      !isLowerHex64(binding.priorOracleHashSha256) ||
      !isLowerHex64(binding.postOracleHashSha256)
    ) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }

    const prior = entryMap.get(`PRIOR_${expectedStep}`);
    const post = entryMap.get(`POST_${expectedStep}`);
    if (!prior || !post || prior.kind !== 'ORDINARY' || post.kind !== 'ORDINARY') {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
    if (
      !prefixEqual(binding.priorHistoryPrefix, prior.expectedHistoryPrefix) ||
      !prefixEqual(binding.postHistoryPrefix, post.expectedHistoryPrefix) ||
      binding.priorOracleHashSha256 !== prior.oracleContractHashSha256 ||
      binding.postOracleHashSha256 !== post.oracleContractHashSha256
    ) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
  }
}

export function validateRuntimeProbeRegistry(
  entries: readonly RuntimeProbeEntry[] = RUNTIME_PROBE_ENTRIES,
): void {
  const ids = entries.map((entry) => entry.id);
  if (ids.length !== EXPECTED_PROBE_IDS.length) {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }
  for (let index = 0; index < EXPECTED_PROBE_IDS.length; index += 1) {
    if (ids[index] !== EXPECTED_PROBE_IDS[index]) {
      throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
    }
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }

  const entryMap = new Map<string, RuntimeProbeEntry>(entries.map((entry) => [entry.id, entry]));

  for (const entry of entries) {
    if (entry.kind === 'ACK_CLASSIFIER') {
      validateAckClassifierEntryContract(entry, entryMap);
      continue;
    }
    validateOrdinaryEntryContract(entry);
  }
}

export function assertRuntimeProbeRegistryRejectsUnknownHoldCode(): void {
  const mutated = RUNTIME_PROBE_ENTRIES.map((entry) =>
    entry.kind === 'ORDINARY' && entry.id === 'PRIOR_P1'
      ? { ...entry, holdCode: 'HOLD_FREE_FORM' }
      : entry,
  );
  try {
    validateRuntimeProbeRegistry(mutated);
    throw new Error('EXPECTED_HOLD_RUNTIME_PROBE_REGISTRY');
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'HOLD_RUNTIME_PROBE_REGISTRY') {
      throw error;
    }
  }
}

export function assertRuntimeProbeRegistryRejectsMutatedAckBinding(): void {
  const ack = RUNTIME_PROBE_ENTRIES.find((entry) => entry.kind === 'ACK_CLASSIFIER');
  if (!ack || ack.kind !== 'ACK_CLASSIFIER') {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }
  const mutatedBindings = ack.bindings.map((binding, index) =>
    index === 0
      ? { ...binding, priorOracleHashSha256: '0'.repeat(64) }
      : binding,
  );
  const mutated = RUNTIME_PROBE_ENTRIES.map((entry) =>
    entry.kind === 'ACK_CLASSIFIER'
      ? { ...entry, bindings: mutatedBindings }
      : entry,
  );
  try {
    validateRuntimeProbeRegistry(mutated);
    throw new Error('EXPECTED_HOLD_RUNTIME_PROBE_REGISTRY');
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'HOLD_RUNTIME_PROBE_REGISTRY') {
      throw error;
    }
  }
}
