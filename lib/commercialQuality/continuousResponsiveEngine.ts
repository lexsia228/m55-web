/**
 * Repository-independent continuous responsive runner.
 *
 * The engine plans and executes governed cases from a manifest entry only. It
 * hardcodes no widths, no selectors and no project routes; the project adapter
 * performs navigation, setup and measurement.
 */
import {
  checkAccessibilityInvariants,
  checkLayoutInvariants,
  checkSemanticInvariants,
  measuredContentBottom,
  type NeighborContext,
} from './layoutInvariants';
import { resolveStressProfiles, stressProfileSpec, type StressSetupHooks } from './contentStateStress';
import type {
  CasePlan,
  ContentStressProfile,
  ExecutionMode,
  ExecutionProfile,
  InvariantFailure,
  MeasuredSurface,
  NormalizedCaseResult,
  SurfaceManifestEntry,
} from './types';

/** Governed widths: the stepped sweep plus explicit breakpoint neighbours. */
export function governedWidths(entry: SurfaceManifestEntry): readonly number[] {
  const { minWidth, maxWidth, widthStep, breakpointNeighborhoods } = entry.viewport;
  const widths = new Set<number>();
  for (let w = minWidth; w <= maxWidth; w += widthStep) widths.add(w);
  widths.add(maxWidth);
  for (const w of breakpointNeighborhoods) {
    if (w >= minWidth && w <= maxWidth) widths.add(w);
  }
  return [...widths].sort((a, b) => a - b);
}

export function orderWidthsForMode(
  widths: readonly number[],
  mode: ExecutionMode,
): readonly number[] {
  if (mode === 'resize_down') return [...widths].sort((a, b) => b - a);
  return [...widths].sort((a, b) => a - b);
}

export type PlanOptions = {
  modes?: readonly ExecutionMode[];
  profiles?: readonly ExecutionProfile[];
  contentStressProfiles?: readonly ContentStressProfile[];
  /** Restrict the height matrix, e.g. for a smoke shard. */
  heights?: readonly number[];
  /** Deterministic sharding: keep cases where index % shardCount === shardIndex. */
  shardIndex?: number;
  shardCount?: number;
};

export function planCases(
  entry: SurfaceManifestEntry,
  options: PlanOptions = {},
): readonly CasePlan[] {
  const modes = options.modes ?? (['fresh_load', 'resize_down', 'resize_up'] as const);
  const profiles = options.profiles ?? entry.executionProfiles;
  const stress = options.contentStressProfiles ?? resolveStressProfiles(entry);
  const heights = options.heights ?? entry.viewport.heightMatrix;
  const widths = governedWidths(entry);

  const plans: CasePlan[] = [];
  for (const mode of modes) {
    for (const profile of profiles) {
      for (const contentStressProfile of stress) {
        for (const height of heights) {
          for (const width of orderWidthsForMode(widths, mode)) {
            plans.push({
              surfaceId: entry.surfaceId,
              runtimeStateId: entry.runtimeStateId,
              route: entry.route,
              setupId: entry.setupId,
              viewport: { width, height },
              mode,
              profile,
              contentStressProfile,
            });
          }
        }
      }
    }
  }

  const { shardIndex, shardCount } = options;
  if (typeof shardIndex === 'number' && typeof shardCount === 'number' && shardCount > 1) {
    if (shardIndex < 0 || shardIndex >= shardCount) {
      throw new Error(`invalid shard ${shardIndex}/${shardCount}`);
    }
    return plans.filter((_, index) => index % shardCount === shardIndex);
  }
  return plans;
}

/** Project adapter contract. All project knowledge lives behind this. */
export type CommercialQualityAdapter<TContext> = StressSetupHooks<TContext> & {
  projectId: string;
  sourceCommit(): string;
  /** Apply viewport, then either navigate fresh or resize in place. */
  prepareCase(context: TContext, entry: SurfaceManifestEntry, plan: CasePlan): Promise<void>;
  /** Collect a measured surface for the pure invariants. */
  measure(context: TContext, entry: SurfaceManifestEntry, plan: CasePlan): Promise<MeasuredSurface>;
  teardownCase?(context: TContext, entry: SurfaceManifestEntry, plan: CasePlan): Promise<void>;
};

export type RunOptions = PlanOptions & {
  /** Skip accessibility measurement (e.g. shard already covered it). */
  includeAccessibility?: boolean;
  /** Stop after this many failing cases. 0 disables the limit. */
  maxFailures?: number;
  now?: () => number;
};

export type EngineRun = {
  surfaceId: string;
  results: readonly NormalizedCaseResult[];
  plannedCaseCount: number;
};

export async function runContinuousResponsive<TContext>(
  entry: SurfaceManifestEntry,
  adapter: CommercialQualityAdapter<TContext>,
  context: TContext,
  options: RunOptions = {},
): Promise<EngineRun> {
  const plans = planCases(entry, options);
  const now = options.now ?? (() => Date.now());
  const includeA11y = options.includeAccessibility ?? true;
  const maxFailures = options.maxFailures ?? 0;
  const sourceCommit = adapter.sourceCommit();

  const results: NormalizedCaseResult[] = [];
  /** Neighbour tracking is per (mode, profile, stress, height) sequence. */
  const neighborBySequence = new Map<string, { width: number; bottom: number; passed: boolean }>();
  let failed = 0;

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const spec = stressProfileSpec(plan.contentStressProfile);
    const sequenceKey = [
      plan.mode,
      plan.profile,
      plan.contentStressProfile,
      plan.viewport.height,
    ].join('|');
    const previous = neighborBySequence.get(sequenceKey) ?? null;
    const nextPlan = plans[i + 1];

    const startedAt = now();
    let failures: InvariantFailure[] = [];
    let surface: MeasuredSurface | null = null;

    await adapter.applyStressProfile(context, entry, spec);
    await adapter.prepareCase(context, entry, plan);
    surface = await adapter.measure(context, entry, plan);

    const neighbor: NeighborContext = {
      previousContentBottom: previous ? previous.bottom : null,
      previousWidth: previous ? previous.width : null,
      previousPassed: previous ? previous.passed : null,
      nextWidth:
        nextPlan && nextPlan.mode === plan.mode && nextPlan.viewport.height === plan.viewport.height
          ? nextPlan.viewport.width
          : null,
    };

    failures = [
      ...checkLayoutInvariants(surface, entry, neighbor),
      ...checkSemanticInvariants(surface, entry, plan.contentStressProfile, neighbor),
      ...(includeA11y ? checkAccessibilityInvariants(surface, entry) : []),
    ];

    const passed = failures.length === 0;
    results.push({
      surfaceId: plan.surfaceId,
      runtimeStateId: plan.runtimeStateId,
      route: surface.observedRoute,
      viewport: plan.viewport,
      mode: plan.mode,
      profile: plan.profile,
      contentStressProfile: plan.contentStressProfile,
      passed,
      failures,
      durationMs: now() - startedAt,
      setupId: plan.setupId,
      sourceCommit,
    });

    neighborBySequence.set(sequenceKey, {
      width: plan.viewport.width,
      bottom: measuredContentBottom(surface),
      passed,
    });

    if (adapter.teardownCase) await adapter.teardownCase(context, entry, plan);
    if (adapter.clearStressProfile) await adapter.clearStressProfile(context, entry, spec);

    if (!passed) {
      failed += 1;
      if (maxFailures > 0 && failed >= maxFailures) break;
    }
  }

  return { surfaceId: entry.surfaceId, results, plannedCaseCount: plans.length };
}

export function formatCaseFailure(result: NormalizedCaseResult): string {
  const header = `[${result.mode}/${result.profile}/${result.contentStressProfile}] ${result.surfaceId} ${result.viewport.width}x${result.viewport.height}`;
  const lines = result.failures.map(
    (f) =>
      `  - ${f.code}${f.selector ? ` @ ${f.selector}` : ''}: ${f.message}\n    ${JSON.stringify(f.diagnostics)}`,
  );
  return [header, ...lines].join('\n');
}

export function summarizeRun(results: readonly NormalizedCaseResult[]) {
  const byMode = (mode: ExecutionMode) => results.filter((r) => r.mode === mode);
  const failuresWithCode = (prefix: string) =>
    results.reduce(
      (total, r) => total + r.failures.filter((f) => f.code.startsWith(prefix)).length,
      0,
    );
  return {
    caseCount: results.length,
    passedCount: results.filter((r) => r.passed).length,
    failedCount: results.filter((r) => !r.passed).length,
    freshLoadFailures: byMode('fresh_load').filter((r) => !r.passed).length,
    resizeDownFailures: byMode('resize_down').filter((r) => !r.passed).length,
    resizeUpFailures: byMode('resize_up').filter((r) => !r.passed).length,
    layoutFailures: failuresWithCode('LAYOUT_'),
    semanticFailures: failuresWithCode('SEMANTIC_'),
    accessibilityFailures: failuresWithCode('A11Y_'),
  };
}
