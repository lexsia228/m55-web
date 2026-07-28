import type { ReactNode } from 'react';
import { PublicHeaderContainer } from '../../../components/shell/PublicHeaderContainer';
import { PublicFooter } from '../../_components/PublicFooter';
import '../../../lib/m55/commercialUx/experience/experienceControlPlane.css';
import '../../../lib/m55/commercialUx/premiumExperience/premiumExperience.css';
import '../../../lib/m55/commercialUx/publicPrint.css';
import styles from './layout.module.css';

/**
 * Purchased report reader — DIGITAL_PUBLICATION archetype (Experience Control Plane v2).
 * Does not alter report generation; only shell/print chrome roles.
 */
export default function DtrCoreLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={styles.shell}
      data-m55-dtr-reader-shell="true"
      data-m55-public-shell
      data-m55-pathname="/dtr/core"
      data-m55-archetype="DIGITAL_PUBLICATION"
      data-m55-print-mode="editorial_result"
      data-m55-ecp="v2"
      data-m55-experience-tier="PREMIUM"
      data-m55-visual-authority="premium.experience.home_editorial_sample_v1"
    >
      <div className={styles.printHiddenHeader} data-m55-dtr-reader-public-header="true" data-m55-print-hide>
        <PublicHeaderContainer />
      </div>
      {children}
      <PublicFooter />
    </div>
  );
}
