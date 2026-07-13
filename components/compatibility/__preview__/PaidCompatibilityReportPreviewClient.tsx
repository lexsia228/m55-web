'use client';

import { useMemo, useState } from 'react';
import {
  buildPaidCompatibilityReportV1,
  type PaidCompatibilityReportInput,
} from '../../../lib/m55/compatibility/buildPaidCompatibilityReportV1';
import PaidCompatibilityReportReader from '../PaidCompatibilityReportReader';

const CONTEXT_A = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_soon',
  returnPattern: 'someone_reaches',
  focus: 'conversation_focus',
} as const;

const CONTEXT_B = {
  decisionPace: 'decide_later',
  disagreement: 'take_space',
  distance: 'go_quiet',
  expressionPace: 'words_later',
  returnPattern: 'return_is_hard',
  focus: 'return_focus',
} as const;

const CONTEXT_C = {
  decisionPace: 'decide_now',
  disagreement: 'one_carries',
  distance: 'space_is_hard',
  expressionPace: 'words_vary',
  returnPattern: 'time_restores',
  focus: 'next_step_focus',
} as const;

const SYNTHETIC_REPORTS: readonly {
  id: string;
  label: string;
  input: PaidCompatibilityReportInput;
}[] = [
  {
    id: 'balanced',
    label: 'A balanced pair',
    input: {
      pairAxisId: 'A3',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E1',
      personAUsesFirstPerspective: true,
      currentContext: CONTEXT_A,
    },
  },
  {
    id: 'pace',
    label: 'strong pace difference',
    input: {
      pairAxisId: 'A1',
      paidTopicId: 'T3',
      relationStatusId: 'R2',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
      currentContext: CONTEXT_B,
    },
  },
  {
    id: 'distance',
    label: 'strong distance difference',
    input: {
      pairAxisId: 'A4',
      paidTopicId: 'T1',
      relationStatusId: 'R5',
      temperatureId: 'E4',
      personAUsesFirstPerspective: true,
      currentContext: CONTEXT_C,
    },
  },
  {
    id: 'expression',
    label: 'strong expression difference',
    input: {
      pairAxisId: 'A2',
      paidTopicId: 'T4',
      relationStatusId: 'R1',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
      currentContext: { ...CONTEXT_A, focus: 'distance_focus' },
    },
  },
  {
    id: 'swapped',
    label: 'swapped pair',
    input: {
      pairAxisId: 'A1',
      paidTopicId: 'T3',
      relationStatusId: 'R2',
      temperatureId: 'E2',
      personAUsesFirstPerspective: false,
      currentContext: CONTEXT_A,
    },
  },
  {
    id: 'same',
    label: 'same DOB pair',
    input: {
      pairAxisId: 'A3',
      paidTopicId: 'T5',
      relationStatusId: 'R6',
      temperatureId: 'E5',
      personAUsesFirstPerspective: true,
      currentContext: CONTEXT_B,
    },
  },
] as const;

export default function PaidCompatibilityReportPreviewClient() {
  const [fixtureId, setFixtureId] = useState(SYNTHETIC_REPORTS[0]!.id);
  const fixture = SYNTHETIC_REPORTS.find((candidate) => candidate.id === fixtureId)
    ?? SYNTHETIC_REPORTS[0]!;
  const snapshot = useMemo(
    () => buildPaidCompatibilityReportV1(fixture.input),
    [fixture],
  );

  return (
    <>
      <div
        data-testid="paid-compatibility-preview-controls"
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
          Synthetic report
          <select
            value={fixtureId}
            onChange={(event) => setFixtureId(event.target.value)}
            style={{ minHeight: 44, padding: '8px 10px', font: 'inherit' }}
          >
            {SYNTHETIC_REPORTS.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <PaidCompatibilityReportReader key={fixture.id} snapshot={snapshot} />
    </>
  );
}
