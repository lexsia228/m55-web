'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PREMIUM_VISUAL_AUTHORITY_KEY } from '../../lib/m55/commercialUx/premiumExperience';

type Props = {
  /** When true, entire public shell is Premium-tier (e.g. /dtr/lp, /dtr/core). */
  shellPremium?: boolean;
};

/**
 * Sets shell-level Premium tier for routes where the full viewport is Premium-owned.
 * Component-level PremiumExperienceSurface handles localized states (e.g. /core bridge).
 */
export default function PremiumExperienceSync({ shellPremium = false }: Props) {
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    const shell = document.querySelector('[data-m55-public-shell]');
    if (!(shell instanceof HTMLElement)) return;

    const isPremiumShell =
      shellPremium ||
      pathname === '/dtr/lp' ||
      pathname.startsWith('/dtr/lp/') ||
      pathname.startsWith('/dtr/core') ||
      pathname.startsWith('/dev/dtr-drawer-preview');

    if (isPremiumShell) {
      shell.setAttribute('data-m55-experience-tier', 'PREMIUM');
      shell.setAttribute('data-m55-visual-authority', PREMIUM_VISUAL_AUTHORITY_KEY);
    } else {
      shell.removeAttribute('data-m55-experience-tier');
      shell.removeAttribute('data-m55-visual-authority');
    }
  }, [pathname, shellPremium]);

  return null;
}
