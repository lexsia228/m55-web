'use client';

/**
 * /home — Shell Home (primary entry point via root redirect)
 *
 * Public Home panel. Birth date: CTA → HomeBirthIntakeLayer. Full edit: /my.
 */

import ShellLayout from '../../components/shell/ShellLayout';
import HomePanel from '../../components/home/HomePanel';

export default function HomePage() {
  return (
    <ShellLayout iframeTitle="M55 ホーム">
      <HomePanel />
    </ShellLayout>
  );
}
