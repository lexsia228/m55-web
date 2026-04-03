'use client';

/**
 * /home — Shell Home (primary entry point via root redirect)
 *
 * Public Home panel. Birth date: CTA → HomeBirthIntakeLayer. Full edit: /my.
 */

import HomePanel from '../../components/home/HomePanel';
import { PublicShell } from '../_components/PublicShell';

export default function HomePage() {
  return (
    <PublicShell>
      <HomePanel />
    </PublicShell>
  );
}
