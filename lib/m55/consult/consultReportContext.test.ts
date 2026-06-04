import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runDtrEngine } from '../dtrEngine';
import { ENGINE_VERSION_V2 } from '../compositeStem/constants';
import { buildV2FulfillmentSnapshotFromFields } from '../compositeStem/buildV2FulfillmentSnapshot';
import {
  buildConsultReportContextFromEnvelope,
  CONSULT_REPORT_CONTEXT_TOTAL_CAP,
} from './consultReportContext';
import {
  mapConsultReplyBodyForDisplay,
  normalizeConsultReplyParagraphs,
} from './consultReplyDisplaySections';

const SEND_ROUTE = join(process.cwd(), 'app/api/room/core/send/route.ts');
const DTR_DRAFT_DB = join(process.cwd(), 'lib/m55/dtrDraftDb.ts');

describe('buildConsultReportContextFromEnvelope', () => {
  it('includes s1–s5 titles with s3–s5 longer excerpts (legacy envelope)', () => {
    const envelope = runDtrEngine({
      birthDate: '1983-02-28',
      nickname: 'Test',
      locale: 'ja-JP',
      contextScope: 'dtr',
    });
    const context = buildConsultReportContextFromEnvelope(envelope);
    assert.ok(context.length > 0);
    assert.ok(context.includes('【保存版抜粋の使い方】'));
    assert.ok(context.includes('主章候補'));
    assert.ok(context.includes('【本質と安定の条件】'));
    assert.ok(context.includes('【力が出やすい場面】'));
    assert.ok(context.includes('【無理が出やすいところ】'));
    assert.ok(context.includes('【構成と傾向の全体像】'));
    assert.ok(context.length <= CONSULT_REPORT_CONTEXT_TOTAL_CAP);
  });

  it('works with v2 fulfillment envelope fixture', () => {
    const built = buildV2FulfillmentSnapshotFromFields({
      nickname: 'GX',
      birthDate: '1983-02-28',
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    });
    assert.equal(built.engine_version, ENGINE_VERSION_V2);
    const context = buildConsultReportContextFromEnvelope(built.envelope_json);
    assert.ok(context.length > 0);
    assert.ok(context.length <= CONSULT_REPORT_CONTEXT_TOTAL_CAP);
  });

  it('returns empty string when fullSections missing', () => {
    const envelope = runDtrEngine({
      birthDate: '1983-02-28',
      nickname: 'Test',
      locale: 'ja-JP',
      contextScope: 'dtr',
    });
    envelope.payload.fullSections = [];
    assert.equal(buildConsultReportContextFromEnvelope(envelope), '');
  });

  it('does not include birthDate or user identifiers in output', () => {
    const envelope = runDtrEngine({
      birthDate: '1983-02-28',
      nickname: 'SecretNick',
      locale: 'ja-JP',
      contextScope: 'dtr',
    });
    const context = buildConsultReportContextFromEnvelope(envelope, {
      redactNickname: 'SecretNick',
    });
    assert.equal(context.includes('1983-02-28'), false);
    assert.equal(context.includes('SecretNick'), false);
  });
});

describe('consult reply display paragraph contract', () => {
  it('maps five blank-line paragraphs to renderer slots', () => {
    const raw = ['場面A', '保存版B', 'ほどくC', '補助D', '一手E'].join('\n\n');
    const paragraphs = normalizeConsultReplyParagraphs(raw);
    assert.equal(paragraphs.length, 5);
    const mapped = mapConsultReplyBodyForDisplay(paragraphs);
    assert.equal(mapped.scene, '場面A');
    assert.equal(mapped.report, '保存版B');
    assert.equal(mapped.alt, 'ほどくC');
    assert.equal(mapped.aux, '補助D');
    assert.equal(mapped.today, '一手E');
  });

  it('legacy three paragraphs use empty today when heuristic returns null', () => {
    const raw = ['場面のみ', '保存版のみ', 'まとめだけ'].join('\n\n');
    const mapped = mapConsultReplyBodyForDisplay(normalizeConsultReplyParagraphs(raw));
    assert.equal(mapped.today, '');
    assert.equal(typeof mapped.today, 'string');
  });
});

describe('Lane A send route context source draft contract', () => {
  it('send route does not use runDtrEngine for report context', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.equal(src.includes('runDtrEngine'), false);
    assert.ok(src.includes('getVisibleDtrReportSnapshotByInstanceId'));
    assert.ok(src.includes('resolveStoredEnvelopeRead'));
    assert.ok(src.includes('buildConsultReportContextFromEnvelope'));
  });

  it('send route prompt aligns with five-paragraph renderer contract', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('必ず5つの段落'));
    assert.ok(src.includes('buildConsultUserAnchors'));
    assert.ok(src.includes('max_tokens: 800'));
    assert.equal(src.includes('temperature: 0.7'), false);
  });

  it('instance snapshot helper is SELECT-only in dtrDraftDb', () => {
    const src = readFileSync(DTR_DRAFT_DB, 'utf8');
    const fnBlock = src.slice(src.indexOf('getVisibleDtrReportSnapshotByInstanceId'));
    assert.ok(fnBlock.includes(".is('user_hidden_at', null)"));
    assert.ok(fnBlock.includes('.maybeSingle()'));
    assert.equal(fnBlock.slice(0, 800).includes('.insert('), false);
    assert.equal(fnBlock.slice(0, 800).includes('.update('), false);
    assert.equal(fnBlock.slice(0, 800).includes('.delete('), false);
  });
});
