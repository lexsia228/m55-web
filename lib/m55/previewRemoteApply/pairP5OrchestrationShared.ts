import type { ExecutionPgQueryResult } from './remoteExecutionPgTransport.ts';

export type PairP5OrchestrationHistoryInsertPlan = {
  readonly version: string;
  readonly name: string;
  readonly statements: readonly string[];
};

export type PairP5OrchestrationPlan = {
  readonly historyInsert: PairP5OrchestrationHistoryInsertPlan;
};

export type PairP5ProbeValidationOutcome = {
  readonly ok: boolean;
};

export type PairP5OrchestrationProbeSuite = {
  readonly priorProbeSql: string;
  readonly postProbeSql: string;
  readonly validatePriorProbe: (result: ExecutionPgQueryResult) => PairP5ProbeValidationOutcome;
  readonly validatePostProbe: (result: ExecutionPgQueryResult) => PairP5ProbeValidationOutcome;
  readonly normalizedStatementCount: number;
  /** When set (P5-3 fulfill apply), overrides default pre-P5-3 function-body catalog probe SQL. */
  readonly functionBodyCatalogProbeSql?: string;
};
