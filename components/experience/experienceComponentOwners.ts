/** Responsibility → existing owner (documentation + stable import surface). */
export const EXPERIENCE_COMPONENT_OWNERS = {
  ExperienceShell: 'app/_components/PublicShell',
  ExperienceHeader: 'components/shell/PublicHeaderContainer',
  ExperienceFooter: 'app/_components/PublicFooter',
  PosterHero: 'components/home/HomePanel (home poster; do not clone layout)',
  PageLead: 'components/experience/ExperiencePrimitives',
  EditorialSection: 'components/experience/ExperiencePrimitives',
  ResultIdentity: 'components/experience/ExperiencePrimitives',
  EvidenceSection: 'components/experience/ExperiencePrimitives',
  SceneSection: 'components/experience/ExperiencePrimitives',
  GuidedProgress: 'components/core/CoreFreeJourneyStepper + paid questionnaire progress',
  AnswerOption: 'core/dtr questionnaire choice buttons',
  PremiumContinuation: 'components/core free-to-paid bridge + DtrLpPremiumContinuityIntro',
  PlanDecision: 'components/dtr/DtrPaidPurchasePrep',
  TrustSummary: 'components/experience/ExperiencePrimitives + CheckoutTrustRow',
  StickyAction: 'components/core/CorePremiumStickyCta',
  PrintFrame: 'components/experience/ExperiencePrimitives + publicPrint.css',
} as const;
