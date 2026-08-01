'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  experienceArchetypeContract,
  resolveExperienceArchetype,
} from '../../lib/m55/commercialUx/experience';

type Props = {
  coreUxPhase?: 'INTAKE' | 'QUESTIONNAIRE' | 'RESULT' | 'OTHER';
  paidPhase?: 'need_free' | 'questionnaire' | 'complete' | 'plans' | 'checkout' | 'other';
};

/**
 * Refines data-m55-archetype on the public shell for /core and /dtr/lp phases.
 * Path-only archetype is set by PublicShell; this syncs client phase detail.
 */
export default function ExperienceArchetypeSync({ coreUxPhase, paidPhase }: Props) {
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    const shell = document.querySelector('[data-m55-public-shell]');
    if (!(shell instanceof HTMLElement)) return;
    const archetype = resolveExperienceArchetype({ pathname, coreUxPhase, paidPhase });
    const contract = experienceArchetypeContract(archetype);
    shell.setAttribute('data-m55-archetype', archetype);
    shell.setAttribute('data-m55-print-mode', contract.printMode);
  }, [pathname, coreUxPhase, paidPhase]);

  return null;
}
