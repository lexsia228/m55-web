import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  M55_R7_EXPORT_MAX_ROWS,
  assertRowCountWithinExportLimitV1,
  normalizeExportCellV1,
  parseUtcRangeV1,
  pickLatestEntitlementsByOriginV1,
  serializeExportCsvV1,
} from './reconciliationExport';

function assertNoBareCrInSerializedDataCells(csv: string): void {
  const lines = csv.trimEnd().split('\n');
  for (let i = 1; i < lines.length; i += 1) {
    assert.equal(lines[i].includes('\r'), false, `data row ${i} contains bare CR`);
  }
}

describe('reconciliationExport', () => {
  it('defends csv injection and normalizes embedded cr/lf in every cell', () => {
    assert.equal(normalizeExportCellV1('=1+1'), "'=1+1");
    assert.equal(normalizeExportCellV1('+sum'), "'+sum");
    assert.equal(normalizeExportCellV1('-1'), "'-1");
    assert.equal(normalizeExportCellV1('@cmd'), "'@cmd");
    assert.equal(normalizeExportCellV1('\ttab'), "'\ttab");
    assert.equal(normalizeExportCellV1('\rcell'), `"'\ncell"`);
    assert.equal(normalizeExportCellV1('a\rb'), '"a\nb"');
    assert.equal(normalizeExportCellV1('a\r\nb'), '"a\nb"');
    assert.equal(normalizeExportCellV1('plain,comma'), '"plain,comma"');
    assert.equal(normalizeExportCellV1('say "hi"'), '"say ""hi"""');
    assert.equal(normalizeExportCellV1(42), '42');

    const csv = serializeExportCsvV1(['a', 'b'], [
      { a: 'line\nbreak', b: '\rcell' },
      { a: 'mid\rend', b: '=1+1' },
    ]);
    assert.match(csv, /"line\nbreak"/);
    assert.match(csv, /"'\ncell"/);
    assertNoBareCrInSerializedDataCells(csv);
  });

  it('enforces utc range width and row cap', () => {
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2027-02-01T00:00:00.000Z';
    const parsed = parseUtcRangeV1(from, to);
    assert.equal(parsed.ok, false);
    if (parsed.ok) throw new Error('expected wide range failure');
    assert.equal(parsed.error, 'RANGE_TOO_WIDE');
    assert.throws(() => assertRowCountWithinExportLimitV1(M55_R7_EXPORT_MAX_ROWS + 1));
  });

  it('orders entitlement picks by ledger_event_seq when recorded_at ties', () => {
    const origin = '11111111-1111-4111-8111-111111111111';
    const latest = pickLatestEntitlementsByOriginV1([
      {
        ledger_event_seq: 5,
        recorded_at: '2026-01-01T00:00:00.000Z',
        commission_event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        origin_commission_event_id: origin,
        lifecycle_state_after_event: 'COMMISSION_HOLD',
        entitlement_after_event_jpy: 50,
      },
      {
        ledger_event_seq: 9,
        recorded_at: '2026-01-01T00:00:00.000Z',
        commission_event_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        origin_commission_event_id: origin,
        lifecycle_state_after_event: 'COMMISSION_PAYABLE',
        entitlement_after_event_jpy: 90,
      },
    ]);
    assert.equal(latest.get(origin)?.entitlement, 90);
  });

  it('rejects non-zulu utc instants', () => {
    const parsed = parseUtcRangeV1('2026-01-01T00:00:00+09:00', '2026-01-02T00:00:00.000Z');
    assert.equal(parsed.ok, false);
    if (parsed.ok) throw new Error('expected invalid range');
    assert.equal(parsed.error, 'INVALID_RANGE');
  });
});
