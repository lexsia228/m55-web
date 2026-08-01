/**
 * Data-driven content / runtime-state stress framework.
 *
 * The engine never imports product copy. A profile declares *how* to stress a
 * surface; the project adapter supplies the deterministic setup that realises
 * it (fixtures, seeded storage, generated text of a declared shape).
 */
import type { ContentStressProfile, SurfaceManifestEntry } from './types';

export type TextShape = {
  /** Character budget the adapter must fill, or null for "leave as authored". */
  characterBudget: number | null;
  /** Character classes the generated text must contain. */
  requiredClasses: readonly ('latin' | 'kana' | 'kanji' | 'punctuation' | 'newline')[];
};

export type StressProfileSpec = {
  profile: ContentStressProfile;
  /** Governed runtime-state family the profile exercises. */
  kind: 'content' | 'lifecycle' | 'auth' | 'persistence' | 'plan' | 'transition';
  textShape: TextShape;
  /** A loading placeholder is an accepted terminal state only here. */
  allowsLoadingIndicator: boolean;
  /** Empty governed content is legal only here. */
  allowsEmptyContent: boolean;
  /** Requires the adapter to authenticate before measuring. */
  requiresAuthentication: boolean;
  /** Requires a second registered state to transition into. */
  requiresStateTransition: boolean;
};

const NONE: TextShape = { characterBudget: null, requiredClasses: [] };

export const STRESS_PROFILE_SPECS: readonly StressProfileSpec[] = [
  {
    profile: 'short_text',
    kind: 'content',
    textShape: { characterBudget: 4, requiredClasses: ['kana'] },
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'long_japanese_text',
    kind: 'content',
    textShape: { characterBudget: 240, requiredClasses: ['kana', 'kanji'] },
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'punctuation_heavy_japanese',
    kind: 'content',
    textShape: { characterBudget: 120, requiredClasses: ['kana', 'punctuation'] },
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'manual_line_breaks',
    kind: 'content',
    textShape: { characterBudget: 90, requiredClasses: ['kana', 'newline'] },
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'max_dynamic_text',
    kind: 'content',
    textShape: { characterBudget: 600, requiredClasses: ['kana', 'kanji', 'punctuation'] },
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'empty',
    kind: 'content',
    textShape: { characterBudget: 0, requiredClasses: [] },
    allowsLoadingIndicator: false,
    allowsEmptyContent: true,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'loading',
    kind: 'lifecycle',
    textShape: NONE,
    allowsLoadingIndicator: true,
    allowsEmptyContent: true,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'error',
    kind: 'lifecycle',
    textShape: NONE,
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'authenticated',
    kind: 'auth',
    textShape: NONE,
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: true,
    requiresStateTransition: false,
  },
  {
    profile: 'unauthenticated',
    kind: 'auth',
    textShape: NONE,
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'saved',
    kind: 'persistence',
    textShape: NONE,
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'unsaved',
    kind: 'persistence',
    textShape: NONE,
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'plan_variant',
    kind: 'plan',
    textShape: NONE,
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: false,
  },
  {
    profile: 'state_transition',
    kind: 'transition',
    textShape: NONE,
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: false,
    requiresStateTransition: true,
  },
];

const SPEC_BY_PROFILE = new Map(STRESS_PROFILE_SPECS.map((spec) => [spec.profile, spec]));

export function stressProfileSpec(profile: ContentStressProfile): StressProfileSpec {
  const spec = SPEC_BY_PROFILE.get(profile);
  if (!spec) throw new Error(`unknown content stress profile: ${profile}`);
  return spec;
}

/**
 * Profiles an entry must exercise: its declared content stress profiles plus
 * every registered state variant, deduplicated and in declaration order.
 */
export function resolveStressProfiles(
  entry: SurfaceManifestEntry,
): readonly ContentStressProfile[] {
  const out: ContentStressProfile[] = [];
  for (const profile of [...entry.contentStressProfiles, ...entry.stateVariants]) {
    if (!out.includes(profile)) out.push(profile);
  }
  return out.length ? out : ['short_text'];
}

/** Adapter hooks. The engine calls these; it never constructs product data. */
export type StressSetupHooks<TContext> = {
  applyStressProfile(
    context: TContext,
    entry: SurfaceManifestEntry,
    spec: StressProfileSpec,
  ): Promise<void>;
  clearStressProfile?(
    context: TContext,
    entry: SurfaceManifestEntry,
    spec: StressProfileSpec,
  ): Promise<void>;
};
