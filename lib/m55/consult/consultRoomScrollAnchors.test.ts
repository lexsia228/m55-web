import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');
const DTR_FULL_READER = join(process.cwd(), 'components/dtr/DtrFullReader.tsx');

describe('consultRoomScrollAnchors', () => {
  it('ConsultRoom exposes compose panel anchor for theme selection scroll', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(src.includes('CONSULT_COMPOSE_PANEL_ID'));
    assert.ok(src.includes('composePanel'));
    assert.ok(src.includes('step1Title'));
  });

  it('DtrFullReader scrolls consult panel to compose anchor not entry top', () => {
    const src = readFileSync(DTR_FULL_READER, 'utf8');
    assert.ok(src.includes('CONSULT_COMPOSE_PANEL_ID'));
    assert.ok(src.includes("panel === 'consult'"));
    assert.equal(src.includes('getElementById'), true);
  });
});
