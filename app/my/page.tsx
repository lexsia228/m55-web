'use client';

import { useEffect, useState } from 'react';
import ShellLayout from '../../components/shell/ShellLayout';
import MyPanel from '../../components/my/MyPanel';

export default function MyPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ShellLayout iframeTitle="M55 My Page">
      <MyPanel />
    </ShellLayout>
  );
}
