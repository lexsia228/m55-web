import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseStoredSnapshotProfileFields } from './parseStoredSnapshotProfileFields';
import type { DtrReportSnapshotReadRow } from './storedEnvelopeRead';

function baseRow(overrides: Partial<DtrReportSnapshotReadRow> = {}): DtrReportSnapshotReadRow {
  return {
    reportInstanceId: 'snap-1',
    user_id: 'user-1',
    product_id: 'DTR_CORE_STATIC_V1',
    checkout_session_id: 'cs_test',
    profile_snapshot: { nickname: 'mi', birthDate: '1992-12-19' },
    draft_snapshot: null,
    envelope_json: {} as DtrReportSnapshotReadRow['envelope_json'],
    engine_version: null,
    engine_context_json: null,
    ...overrides,
  };
}

describe('parseStoredSnapshotProfileFields', () => {
  it('profile_snapshot nickname + birthDate only → defaults applied', () => {
    const parsed = parseStoredSnapshotProfileFields(baseRow());
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.fields.nickname, 'mi');
    assert.equal(parsed.fields.birthDate, '1992-12-19');
    assert.equal(parsed.fields.country, 'JP');
    assert.equal(parsed.fields.birthTime, null);
    assert.equal(parsed.fields.birthTimeUnknown, true);
    assert.equal(parsed.fields.birthplace, null);
    assert.equal(parsed.fields.timezone, null);
  });

  it('merges draft_snapshot.extra_json when present', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({
        draft_snapshot: {
          draft_id: 'd1',
          nickname: 'mi',
          birth_date: '1992-12-19',
          extra_json: {
            birthTime: '09:30:00',
            country: 'JP',
            birthplace: '大阪府',
            timezone: 'Asia/Tokyo',
          },
        },
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.fields.birthTime, '09:30:00');
    assert.equal(parsed.fields.birthTimeUnknown, false);
    assert.equal(parsed.fields.birthplace, '大阪府');
    assert.equal(parsed.fields.timezone, 'Asia/Tokyo');
  });

  it('draft_snapshot missing/null still succeeds with defaults', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({ draft_snapshot: null }),
    );
    assert.equal(parsed.ok, true);
  });

  it('profile_snapshot birth_date only → success with defaults', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({
        profile_snapshot: { nickname: 'mi', birth_date: '1992-12-19' } as unknown as DtrReportSnapshotReadRow['profile_snapshot'],
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.fields.birthDate, '1992-12-19');
    assert.equal(parsed.fields.birthTimeUnknown, true);
  });

  it('merges draft_snapshot.extra_json snake_case fields', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({
        draft_snapshot: {
          draft_id: 'd1',
          nickname: 'mi',
          birth_date: '1992-12-19',
          extra_json: {
            birth_time: '09:30:00',
            birth_time_unknown: false,
            time_zone: 'Asia/Tokyo',
            birth_place: '大阪府',
          },
        },
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.fields.birthTime, '09:30:00');
    assert.equal(parsed.fields.birthTimeUnknown, false);
    assert.equal(parsed.fields.timezone, 'Asia/Tokyo');
    assert.equal(parsed.fields.birthplace, '大阪府');
  });

  it('respects explicit birthTimeUnknown false even without birthTime in profile', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({
        profile_snapshot: {
          nickname: 'mi',
          birthDate: '1992-12-19',
          birth_time_unknown: false,
        } as DtrReportSnapshotReadRow['profile_snapshot'],
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.fields.birthTimeUnknown, false);
  });

  it('missing birthDate and birth_date both absent fails', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({
        profile_snapshot: { nickname: 'mi' } as DtrReportSnapshotReadRow['profile_snapshot'],
      }),
    );
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.reason, 'missing_birth_date');
  });

  it('missing birthDate fails', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({ profile_snapshot: { nickname: 'mi', birthDate: '' } }),
    );
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.reason, 'missing_birth_date');
  });

  it('missing nickname fails', () => {
    const parsed = parseStoredSnapshotProfileFields(
      baseRow({ profile_snapshot: { nickname: '  ', birthDate: '1992-12-19' } }),
    );
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.reason, 'missing_nickname');
  });
});
