'use client';

import { useMemo, useState } from 'react';
import CompatibilityGuestExperience, {
  type PairGuestPreviewFixture,
} from '../CompatibilityGuestExperience';

export type BuiltPairGuestPreviewFixture = PairGuestPreviewFixture & {
  id: string;
  label: string;
};

export default function PairGuestResultPreviewClient({
  fixtures,
}: {
  fixtures: readonly BuiltPairGuestPreviewFixture[];
}) {
  const [fixtureId, setFixtureId] = useState(fixtures[0]?.id ?? '');
  const previewFixture = useMemo(
    () => fixtures.find((item) => item.id === fixtureId) ?? fixtures[0] ?? null,
    [fixtureId, fixtures],
  );

  if (!previewFixture) return null;

  return (
    <>
      <div
        data-testid="pair-guest-result-preview-controls"
        style={{
          width: 'min(calc(100% - 36px), 960px)',
          margin: '20px auto 0',
          padding: 14,
          boxSizing: 'border-box',
          border: '1px solid rgba(55, 45, 70, 0.14)',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.86)',
        }}
      >
        <label style={{ display: 'grid', gap: 7, fontSize: 13, color: '#4b3b60' }}>
          Synthetic guest result
          <select
            value={fixtureId}
            onChange={(event) => setFixtureId(event.target.value)}
            style={{ minHeight: 44, padding: '8px 10px', font: 'inherit' }}
          >
            {fixtures.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <CompatibilityGuestExperience key={previewFixture.id} previewFixture={previewFixture} />
    </>
  );
}
