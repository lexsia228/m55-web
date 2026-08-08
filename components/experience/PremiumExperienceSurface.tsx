'use client';

import type { ReactNode } from 'react';
import {
  PREMIUM_EDITORIAL_AUTHORITY_KEY,
  PREMIUM_VISUAL_AUTHORITY_KEY,
  premiumStateById,
  type PremiumExperienceVariant,
} from '../../lib/m55/commercialUx/premiumExperience';
import '../../lib/m55/commercialUx/premiumExperience/premiumExperience.css';

type Props = {
  stateId: string;
  children: ReactNode;
  className?: string;
  variant?: PremiumExperienceVariant;
  surface?: 'decision' | 'publication' | 'bridge';
  testId?: string;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

/**
 * Declares Premium experience tier + visual authority on a governed surface.
 * Free questionnaire shells must never use this wrapper.
 */
export default function PremiumExperienceSurface({
  stateId,
  children,
  className,
  variant = 'decision_surface',
  surface = 'decision',
  testId,
}: Props) {
  const state = premiumStateById(stateId);
  const editorialKey = state?.editorialAuthorityKey ?? PREMIUM_EDITORIAL_AUTHORITY_KEY;

  return (
    <div
      className={cx('m55-premium-experience-root', className)}
      data-testid={testId}
      data-m55-experience-tier="PREMIUM"
      data-m55-visual-authority={PREMIUM_VISUAL_AUTHORITY_KEY}
      data-m55-editorial-authority={editorialKey}
      data-m55-premium-state={stateId}
      data-m55-premium-variant={variant}
      data-m55-premium-surface={surface}
    >
      {children}
    </div>
  );
}
