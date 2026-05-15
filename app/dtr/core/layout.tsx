import type { ReactNode } from 'react';
import { PublicHeader } from '../../../components/shell/PublicHeader';
import { PublicFooter } from '../../_components/PublicFooter';

/**
 * Entry Report 閲覧 — ShellLayout 外でドキュメントスクロール。
 * PublicHeader（本質/レポート/マイページタブ）を追加し /core ファミリーの
 * シェルを維持。レポート → アクティブタブとして自動強調される。
 */
export default function DtrCoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
      <PublicFooter />
    </>
  );
}
