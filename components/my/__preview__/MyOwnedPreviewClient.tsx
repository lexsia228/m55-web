'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import MyPanel, { type MyPanelPreviewMode } from '../MyPanel';

const STATES = [
  ['self_owned', 'A · owned SELF saved report'],
  ['pair_library', 'B · multiple Pair reports'],
] as const satisfies readonly [MyPanelPreviewMode, string][];

function resolveInitialMode(value: string | null): MyPanelPreviewMode {
  return value === 'pair_library' ? 'pair_library' : 'self_owned';
}

export default function MyOwnedPreviewClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<MyPanelPreviewMode>(() =>
    resolveInitialMode(searchParams.get('mode')),
  );

  return (
    <>
      <div
        data-testid="my-owned-preview-controls"
        style={{
          width: 'min(calc(100% - 36px), 760px)',
          margin: '20px auto 0',
          padding: 14,
          boxSizing: 'border-box',
          border: '1px solid rgba(55, 45, 70, 0.14)',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.86)',
        }}
      >
        <label style={{ display: 'grid', gap: 7, fontSize: 13, color: '#4b3b60' }}>
          Synthetic My Page owned state
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as MyPanelPreviewMode)}
            style={{ minHeight: 44, padding: '8px 10px', font: 'inherit' }}
          >
            {STATES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MyPanel previewMode={mode} />
    </>
  );
}
