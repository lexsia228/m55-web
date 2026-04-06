import type { ReactNode } from 'react';
import { PublicFooter } from '../../_components/PublicFooter';

/** Entry Report 閲覧（ShellLayout 外）— 法務/サポート導線を PublicShell と揃える */
export default function DtrCoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PublicFooter />
    </>
  );
}
