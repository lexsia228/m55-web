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
        primaryLabel: input.kind === 'personal' ? '保存版の内容を見る' : '無料結果の続きを見る',
        showPaidDepth: true,
        showOwnership: false,
        canContinue: true,
      };
    }
    return {
      ...input,
      primaryAction: input.commerceState === 'paused' ? 'commerce_paused' : 'view_free_result',
      primaryHref: FREE_HREF[input.kind],
      primaryLabel: input.commerceState === 'paused' ? '無料結果を開く' : '結果を開く',
      showPaidDepth: true,
      showOwnership: false,
      canContinue: true,
    };
  }

  return {
    ...input,
    primaryAction: 'start_free',
    primaryHref: FREE_HREF[input.kind],
    primaryLabel: input.kind === 'personal' ? '自分を無料で見る' : '二人を無料で見る',
    showPaidDepth: false,
    showOwnership: false,
    canContinue: false,
  };
}

export function hasM55ContinueItem(models: readonly M55ExperienceCardModel[]): boolean {
  return models.some((model) => model.canContinue);
}
