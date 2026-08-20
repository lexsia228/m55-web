import { permanentRedirect } from 'next/navigation';

/** Canonical public entry is /home — permanent redirect only (no second landing). */
export default function RootPage() {
  permanentRedirect('/home');
}
