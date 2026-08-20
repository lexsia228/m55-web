import { permanentRedirect } from 'next/navigation';

/**
 * /pricing retired as duplicate public Premium decision surface.
 * Primary Premium discovery remains /dtr/lp. Shared plan/product SSOT stays in lib/.
 */
export default function PricingPage() {
  permanentRedirect('/dtr/lp');
}
