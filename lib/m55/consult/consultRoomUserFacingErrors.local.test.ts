import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  mapConsultRoomLoadErrorToUserMessage,
  mapConsultRoomSendErrorToUserMessage,
} from './consultRoomUserFacingErrors';

describe('consultRoomUserFacingErrors', () => {
  it('maps known English send errors to calm Japanese copy', () => {
    assert.equal(
      mapConsultRoomSendErrorToUserMessage(
        undefined,
        'Ticket consumption failed. Please reload and try again.',
      ),
      '保存に失敗しました。ページを再読み込みしてもう一度お試しください。',
    );
    assert.equal(
      mapConsultRoomSendErrorToUserMessage(undefined, 'AI service error. Please try again.'),
      '返書の準備に失敗しました。時間をおいてもう一度お試しください。',
    );
  });

  it('prefers safeMessage when present', () => {
    assert.equal(
      mapConsultRoomSendErrorToUserMessage('この内容はこのレポートの相談では扱えません。', 'blocked'),
      'この内容はこのレポートの相談では扱えません。',
    );
  });

  it('maps load errors without HTTP status suffix', () => {
    assert.match(
      mapConsultRoomLoadErrorToUserMessage('Not owned', 403),
      /権限/,
    );
    assert.doesNotMatch(
      mapConsultRoomLoadErrorToUserMessage('Internal error', 500),
      /\(\d+\)/,
    );
  });

  it('ConsultRoom surfaces support link on errors', () => {
    const src = readFileSync(join(process.cwd(), 'components/dtr/ConsultRoom.tsx'), 'utf8');
    assert.match(src, /href="\/support"/);
    assert.match(src, /ConsultRoomIssueNotice/);
  });
});
