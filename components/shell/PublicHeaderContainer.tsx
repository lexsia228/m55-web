'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { readSelfFunnelStage } from '../../lib/m55/selfFunnel/selfFunnelClientStore';
import { resolveCoreRouteView } from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import { resolvePublicHeaderState } from '../../lib/m55/commercialUx/publicHeaderState';
import { PublicHeader } from './PublicHeader';

/**
 * Reads funnel stage once at shell level and passes explicit header contract inputs.
 * PublicHeader must not read localStorage/sessionStorage directly.
 */
export function PublicHeaderContainer() {
  const pathname = usePathname() ?? '/';
  const { isSignedIn } = useAuth();
  const [freeResultAvailable, setFreeResultAvailable] = useState(false);
  const [coreHasResult, setCoreHasResult] = useState(false);

  useEffect(() => {
    const sync = () => {
      const stage = readSelfFunnelStage(null);
      const hasResult = resolveCoreRouteView(stage) === 'result';
      setFreeResultAvailable(hasResult);
      setCoreHasResult(hasResult && (pathname === '/core' || pathname.startsWith('/core/')));
    };
    sync();
    window.addEventListener('m55:profile_updated', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('m55:profile_updated', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
    };
  }, [pathname]);

  const headerState = resolvePublicHeaderState({
    pathname,
    freeResultAvailable,
    signedIn: Boolean(isSignedIn),
    coreHasResult,
  });

  return <PublicHeader state={headerState} pathname={pathname} />;
}
