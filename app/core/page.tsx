'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';
import CoreEssencePanel from '../../components/core/CoreEssencePanel';
import { M55ExperienceShell } from '../../components/experience/M55ExperienceShell';

export default function CorePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout iframeTitle="M55 本質">
      <M55ExperienceShell kind="personal" depth="free">
        <CoreEssencePanel />
      </M55ExperienceShell>
    </ShellLayout>
  );
}
