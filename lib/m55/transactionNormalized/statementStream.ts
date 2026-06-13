import { createHash } from 'node:crypto';

export const STATEMENT_STREAM_SERIALIZATION = 'm55.statement_stream.u64be_length_utf8.v1' as const;

export type Policy2HistoryPayload = {
  version: string;
  name: string;
  statements: readonly string[];
  serialization: typeof STATEMENT_STREAM_SERIALIZATION;
  normalizedStreamCompositeSha256: string;
};

export type VersionLabel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

const REMOVED_ORDINALS_BY_LABEL: Readonly<Record<VersionLabel, readonly number[]>> = {
  P1: [0, 208],
  P2: [],
  P3: [],
  P4: [],
  P5: [0, 2],
  P6: [0, 2],
  P7: [0, 2],
};

/**
 * Decode a parser-evidence snippet field (after outer JSON.parse) to semantic UTF-8 text.
 * Evidence stores JSON.stringify output; literal `\uXXXX` sequences decode on re-parse.
 */
export function decodeEvidenceSnippetField(snippetField: string): string {
  if (snippetField.length < 2) return snippetField;
  if (snippetField.charCodeAt(0) === 0x22 && snippetField.charCodeAt(snippetField.length - 1) === 0x22) {
    return JSON.parse(snippetField) as string;
  }
  return snippetField;
}

export function compareStatementSnippetToEvidence(
  statementSlice: string,
  evidenceSnippetField: string,
): boolean {
  return statementSlice === decodeEvidenceSnippetField(evidenceSnippetField);
}

export function statementUtf8ByteLength(statement: string): number {
  return Buffer.byteLength(statement, 'utf8');
}

export function statementSha256(statement: string): string {
  return createHash('sha256').update(Buffer.from(statement, 'utf8')).digest('hex');
}

export function serializeStatementStream(statements: readonly string[]): Buffer {
  const chunks: Buffer[] = [];
  for (const statement of statements) {
    const bytes = Buffer.from(statement, 'utf8');
    const len = Buffer.alloc(8);
    const big = BigInt(bytes.length);
    for (let i = 0; i < 8; i++) {
      len[7 - i] = Number((big >> BigInt(i * 8)) & 0xffn);
    }
    chunks.push(len, bytes);
  }
  return Buffer.concat(chunks);
}

export function compositeStreamSha256(statements: readonly string[]): string {
  return createHash('sha256').update(serializeStatementStream(statements)).digest('hex');
}

export function applyOptionARemoval(
  label: VersionLabel,
  statements: readonly string[],
): {
  normalized: string[];
  removed: string[];
  removedOrdinals: number[];
} {
  const removedSet = new Set(REMOVED_ORDINALS_BY_LABEL[label]);
  const normalized: string[] = [];
  const removed: string[] = [];
  const removedOrdinals: number[] = [];

  for (let ordinal = 0; ordinal < statements.length; ordinal++) {
    const statement = statements[ordinal];
    if (removedSet.has(ordinal)) {
      removed.push(statement);
      removedOrdinals.push(ordinal);
      continue;
    }
    normalized.push(statement);
  }

  if (removedOrdinals.length !== removedSet.size) {
    throw new Error(`OPTION_A_REMOVAL_COUNT_MISMATCH:${label}`);
  }
  for (const ordinal of removedOrdinals) {
    if (!removedSet.has(ordinal)) {
      throw new Error(`OPTION_A_REMOVAL_ORDINAL_MISMATCH:${label}:${ordinal}`);
    }
  }

  return { normalized, removed, removedOrdinals };
}

export function buildPolicy2HistoryPayload(input: {
  version: string;
  name: string;
  normalizedStatements: readonly string[];
  expectedNormalizedCompositeSha256: string;
}): Policy2HistoryPayload {
  const normalizedStreamCompositeSha256 = compositeStreamSha256(input.normalizedStatements);
  if (normalizedStreamCompositeSha256 !== input.expectedNormalizedCompositeSha256) {
    throw new Error('POLICY_2_NORMALIZED_COMPOSITE_MISMATCH');
  }
  return {
    version: input.version,
    name: input.name,
    statements: [...input.normalizedStatements],
    serialization: STATEMENT_STREAM_SERIALIZATION,
    normalizedStreamCompositeSha256,
  };
}

export function removedOrdinalsForLabel(label: VersionLabel): readonly number[] {
  return REMOVED_ORDINALS_BY_LABEL[label];
}

export function hashSerializedStream(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
