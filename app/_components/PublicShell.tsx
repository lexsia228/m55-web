'use client';

import type React from 'react';
import { usePathname } from 'next/navigation';
import { PublicHeaderContainer } from '../../components/shell/PublicHeaderContainer';
import { PublicFooter } from './PublicFooter';
import styles from './PublicShell.module.css';
import typography from './PublicTypography.module.css';
import '../../lib/m55/commercialUx/publicPrint.css';
import '../../lib/m55/commercialUx/experience/experienceControlPlane.css';
import {
  experienceArchetypeContract,
  resolveExperienceArchetype,
} from '../../lib/m55/commercialUx/experience';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const archetype = resolveExperienceArchetype({ pathname });
  const contract = experienceArchetypeContract(archetype);

  return (
    <div
      className={`${styles.page} ${typography.root}`}
      data-m55-public-shell
      data-m55-pathname={pathname}
      data-m55-archetype={archetype}
      data-m55-print-mode={contract.printMode}
      data-m55-ecp="v2"
    >
      <PublicHeaderContainer />
      <main className={styles.main}>
        <div className={`${styles.inner} m55-exp-inner`}>{children}</div>
        <PublicFooter />
      </main>
    </div>
  );
}
