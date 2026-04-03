'use client';

import type React from 'react';
import { PublicHeader } from '../../components/shell/PublicHeader';
import { PublicFooter } from './PublicFooter';
import styles from './PublicShell.module.css';
import typography from './PublicTypography.module.css';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${styles.page} ${typography.root}`}
      data-m55-public-shell
    >
      <PublicHeader />
      <main className={styles.main}>
        <div className={styles.inner}>{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}


