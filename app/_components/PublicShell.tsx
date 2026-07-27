'use client';

import type React from 'react';
import { PublicHeaderContainer } from '../../components/shell/PublicHeaderContainer';
import { PublicFooter } from './PublicFooter';
import styles from './PublicShell.module.css';
import typography from './PublicTypography.module.css';
import '../../lib/m55/commercialUx/publicPrint.css';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${styles.page} ${typography.root}`}
      data-m55-public-shell
    >
      <PublicHeaderContainer />
      <main className={styles.main}>
        <div className={styles.inner}>{children}</div>
        <PublicFooter />
      </main>
    </div>
  );
}


