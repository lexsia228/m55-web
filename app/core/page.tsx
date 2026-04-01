'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';
import CoreEssencePanel from '../../components/core/CoreEssencePanel';

export default function CorePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout iframeTitle="M55 本質">
      <CoreEssencePanel />
    </ShellLayout>
  );
}
