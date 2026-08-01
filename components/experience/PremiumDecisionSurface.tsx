'use client';

import type { ReactNode } from 'react';
import PremiumExperienceSurface from './PremiumExperienceSurface';

type Props = {
  stateId: string;
  children: ReactNode;
  className?: string;
  testId?: string;
};

/**
 * Shared Premium decision-surface owner — navy editorial field + ivory reading sheet.
 * Governs questionnaire, answer review/edit, plan selection, and checkout prep.
 */
export default function PremiumDecisionSurface({ stateId, children, className, testId }: Props) {
  return (
    <PremiumExperienceSurface
      stateId={stateId}
      variant="editorial_stage"
      surface="decision"
      testId={testId}
      className={className}
    >
      <div className="m55-premium-decision-field" data-m55-premium-decision-field="true">
        <div className="m55-premium-decision-sheet" data-m55-premium-decision-sheet="true">
          {children}
        </div>
      </div>
    </PremiumExperienceSurface>
  );
}
