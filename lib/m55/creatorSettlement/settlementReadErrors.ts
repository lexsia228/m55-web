export class SettlementPersistedReadError extends Error {
  readonly code = 'SETTLEMENT_READ_UNAVAILABLE' as const;

  constructor(message = 'SETTLEMENT_READ_UNAVAILABLE') {
    super(message);
    this.name = 'SettlementPersistedReadError';
  }
}

export class SettlementAllocationReadError extends Error {
  readonly code = 'SETTLEMENT_ALLOCATION_READ_UNAVAILABLE' as const;

  constructor(message = 'SETTLEMENT_ALLOCATION_READ_UNAVAILABLE') {
    super(message);
    this.name = 'SettlementAllocationReadError';
  }
}
