'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';

export default function CalendarPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout
      iframeSrc="/legacy/calendar.html"
      iframeTitle="M55 Calendar"
      useDataBridge
    />
  );
}
