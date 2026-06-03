'use client';

import DtrFullReader from '../DtrFullReader';
import type { ComponentProps } from 'react';

type DtrFullReaderProps = ComponentProps<typeof DtrFullReader>;

export default function DtrDrawerPreviewClient(props: DtrFullReaderProps) {
  return <DtrFullReader {...props} />;
}
