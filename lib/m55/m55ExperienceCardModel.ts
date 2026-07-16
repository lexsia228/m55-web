import { FREE_QUESTION_IDS } from './individualization/answerIdMapsV1';

export type M55IdentityState = 'guest' | 'authenticated';
export type M55JourneyState = 'unstarted' | 'in_progress' | 'free_complete';
export type M55OwnershipState = 'not_owned' | 'owned';
export type M55CommerceState = 'available' | 'paused' | 'unavailable';
export type M55UsageState = 'no_balance' | 'available_balance' | 'previously_used';
export type M55ExperienceKind = 'personal' | 'compatibility';
export type M55AuthorityAction =
  | 'open_owned'
  | 'recover_owned'
  | 'authority_support'
  | 'view_paid_details';

export type M55ExperienceAuthority = {
  uxState: string;
  action: M55AuthorityAction;
  href: string;
  label: string;
};

export type M55ExperienceCardInput = {
  kind: M55ExperienceKind;
  identityState: M55IdentityState;
  journeyState: M55JourneyState;
  ownershipState: M55OwnershipState;
  commerceState: M55CommerceState;
  usageState?: M55UsageState;
  authority?: M55ExperienceAuthority | null;
};

export type M55ExperienceCardModel = M55ExperienceCardInput & {
  primaryAction:
    | 'start_free'
    | 'resume_free'
    | 'view_free_result'
    | 'open_owned'
    | 'recover_owned'
    | 'authority_support'
    | 'view_paid_details'
    | 'commerce_paused';
  primaryHref: string;
  primaryLabel: string;
  showPaidDepth: boolean;
  showOwnership: boolean;
  canContinue: boolean;
};

export function hasCompletePersonalFreeAnswers(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const answers = JSON.parse(raw) as Record<string, unknown>;
    return FREE_QUESTION_IDS.every(
      (id) => typeof answers[id] === 'string' && answers[id].trim().length > 0,
    );
  } catch {
    return false;
  }
}

const FREE_HREF: Record<M55ExperienceKind, string> = {
  personal: '/core',
  compatibility: '/synastry',
};

const PAID_HREF: Record<M55ExperienceKind, string> = {
  personal: '/dtr/lp',
  compatibility: '/synastry',
};

export function buildM55ExperienceCardModel(
  input: M55ExperienceCardInput,
): M55ExperienceCardModel {
  if (input.authority) {
    const ownedAction =
      input.authority.action === 'open_owned' ||
      input.authority.action === 'recover_owned';
    return {
      ...input,
      primaryAction: input.authority.action,
      primaryHref: input.authority.href,
      primaryLabel: input.authority.label,
      showPaidDepth: ownedAction || input.authority.action === 'view_paid_details',
      showOwnership: ownedAction,
      canContinue: true,
    };
  }

  if (input.journeyState === 'in_progress') {
    return {
      ...input,
      primaryAction: 'resume_free',
      primaryHref: FREE_HREF[input.kind],
      primaryLabel: '続きを見る',
      showPaidDepth: false,
      showOwnership: false,
      canContinue: true,
    };
  }

  if (input.journeyState === 'free_complete') {
    if (input.commerceState === 'available') {
      return {
        ...input,
        primaryAction: 'view_paid_details',
        primaryHref: PAID_HREF[input.kind],
        primaryLabel: input.kind === 'personal' ? '個人解析レポートの内容を見る' : '無料解析の結果を開く',
        showPaidDepth: true,
        showOwnership: false,
        canContinue: true,
      };
    }
    return {
      ...input,
      primaryAction: input.commerceState === 'paused' ? 'commerce_paused' : 'view_free_result',
      primaryHref: FREE_HREF[input.kind],
      primaryLabel: input.commerceState === 'paused' ? '無料解析の結果を開く' : '解析結果を開く',
      showPaidDepth: true,
      showOwnership: false,
      canContinue: true,
    };
  }

  return {
    ...input,
    primaryAction: 'start_free',
    primaryHref: FREE_HREF[input.kind],
    primaryLabel: input.kind === 'personal' ? '自分を無料で見てみる' : '二人の相性を無料で見てみる',
    showPaidDepth: false,
    showOwnership: false,
    canContinue: false,
  };
}

export function hasM55ContinueItem(models: readonly M55ExperienceCardModel[]): boolean {
  return models.some((model) => model.canContinue);
}
