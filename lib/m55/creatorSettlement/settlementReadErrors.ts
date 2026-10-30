export class SettlementPersistedReadError extends Error {
  readonly code: 'SETTLEMENT_READ_UNAVAILABLE' | 'SETTLEMENT_BUNDLE_INCOMPLETE';

  constructor(code: 'SETTLEMENT_READ_UNAVAILABLE' | 'SETTLEMENT_BUNDLE_INCOMPLETE' = 'SETTLEMENT_READ_UNAVAILABLE') {
    super(code);
    this.name = 'SettlementPersistedReadError';
    this.code = code;
  }
}

export class SettlementAllocationReadError extends Error {
  readonly code = 'SETTLEMENT_ALLOCATION_READ_UNAVAILABLE' as const;

  constructor(message = 'SETTLEMENT_ALLOCATION_READ_UNAVAILABLE') {
    super(message);
    this.name = 'SettlementAllocationReadError';
  }
}
