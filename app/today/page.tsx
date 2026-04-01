'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';
import TodayPanel from '../../components/today/TodayPanel';

export default function TodayPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout iframeTitle="M55 Today">
      <TodayPanel />
    </ShellLayout>
  );
}
