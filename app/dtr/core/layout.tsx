import type { ReactNode } from 'react';
import { PublicHeaderContainer } from '../../../components/shell/PublicHeaderContainer';
import { PublicFooter } from '../../_components/PublicFooter';
import styles from './layout.module.css';

/**
 * Entry Report 閲覧 — ShellLayout 外でドキュメントスクロール。
 * PublicHeader（本質/レポート/マイページタブ）を追加し /core ファミリーの
 * シェルを維持。レポート → アクティブタブとして自動強調される。
 */
export default function DtrCoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell} data-m55-dtr-reader-shell="true">
      <div className={styles.printHiddenHeader} data-m55-dtr-reader-public-header="true">
        <PublicHeaderContainer />
      </div>
      {children}
      <PublicFooter />
    </div>
  );
}
