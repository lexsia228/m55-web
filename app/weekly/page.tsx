'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';
import WeeklyPanel from '../../components/weekly/WeeklyPanel';

export default function WeeklyPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout iframeTitle="M55 Weekly">
      <WeeklyPanel />
    </ShellLayout>
  );
}
