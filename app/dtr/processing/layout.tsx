import type { ReactNode } from 'react';
import { PublicFooter } from '../../_components/PublicFooter';

export default function DtrProcessingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PublicFooter />
    </>
  );
}
