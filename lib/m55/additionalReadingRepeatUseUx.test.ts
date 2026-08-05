import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  M55_FUNNEL_EVENTS,
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  resetFunnelImpressionDedupeForTests,
  trackFunnelImpressionOnce,
} from './privacySafeFunnelAnalytics';
import {
  getConsultRoomPreviewRoomData,
  resolveConsultRoomPreviewScenario,
} from './fixtures/consultRoomPreviewFixture';

const readRepo = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('additional reading repeat-use UX', () => {
  it('uses authoritative FULL and Light synthetic wallet states', () => {
    const full = getConsultRoomPreviewRoomData(resolveConsultRoomPreviewScenario('full3'));
    assert.deepEqual(
      {
        total: (full.wallet?.initial_included_count ?? 0) + (full.wallet?.purchased_count ?? 0),
        used: full.wallet?.consumed_count,
        remaining: full.wallet?.available_count,
      },
      { total: 5, used: 2, remaining: 3 },
    );

    const light = getConsultRoomPreviewRoomData(resolveConsultRoomPreviewScenario('light1'));
    assert.equal(light.wallet?.initial_included_count, 1);
    assert.equal(light.wallet?.purchased_count, 0);
    assert.equal(light.wallet?.available_count, 1);
  });

  it('supports theme-only review while optional context stays optional', () => {
    const source = readRepo('components/dtr/ConsultRoom.tsx');
    assert.match(source, /今、どこから整理しますか？/);
    assert.match(source, /テーマだけでも作れます。/);
    assert.match(source, /disabled=\{!selectedThemeId\}/);
    assert.match(source, /optionalContext\.trim\(\) \?/);
    assert.match(source, /optional_context: trimmedContext \|\| undefined/);
    assert.doesNotMatch(source, /required=\{/);
  });

  it('keeps theme and optional context when reviewing earlier steps', () => {
    const source = readRepo('components/dtr/ConsultRoom.tsx');
    assert.match(source, /setWizardActiveStep\(1\)/);
    assert.match(source, /setWizardActiveStep\(2\)/);
    assert.match(source, /内容を見直す/);
    assert.equal(source.match(/setOptionalContext\(''\)/g)?.length, 1);
  });

  it('shows current, one-use, and projected counts without mutating a fixture', () => {
    const source = readRepo('components/dtr/ConsultRoom.tsx');
    const before = getConsultRoomPreviewRoomData('full3').wallet?.available_count;
    assert.match(source, /Math\.max\(0, effectiveRemaining - 1\)/);
    assert.match(source, /1件使用/);
    assert.match(source, /この内容で1件使って作る/);
    const after = getConsultRoomPreviewRoomData('full3').wallet?.available_count;
    assert.equal(before, 3);
    assert.equal(after, 3);
  });

  it('keeps preview sends blocked and the existing double-submit guard', () => {
    const source = readRepo('components/dtr/ConsultRoom.tsx');
    assert.ok(source.indexOf('if (sendLock.current) return') < source.indexOf("fetch('/api/room/core/send'"));
    assert.ok(source.indexOf('if (isDevPreview)') < source.indexOf("fetch('/api/room/core/send'"));
    assert.match(source, /disabled=\{submitDisabled\}/);
    assert.match(source, /X-Idempotency-Key/);
  });

  it('shows calm zero states and only previews Light upgrade when explicitly requested', () => {
    const source = readRepo('components/dtr/ConsultRoom.tsx');
    const previewPage = readRepo('app/dev/dtr-drawer-preview/page.tsx');
    const previewClient = readRepo('components/dtr/__preview__/DtrDrawerPreviewClient.tsx');
    assert.match(source, /追加読み解きはすべて利用済みです。/);
    assert.match(source, /プレミアムレポートはいつでも読み返せます。/);
    assert.match(source, /プレミアムレポートを読み返す/);
    assert.match(previewPage, /showLightUpgrade=\{sp\.lightUpgrade === '1'\}/);
    assert.match(previewClient, /FULL化を確認する/);
    assert.match(previewClient, /disabled/);
    assert.doesNotMatch(source, /期限切れ|失効間近|残りわずか/);
  });

  it('removes the saved-report return control while the consult panel is open', () => {
    const reader = readRepo('components/dtr/DtrFullReader.tsx');
    assert.match(reader, /DrawerHubScrollFab hidden=\{openPanel === 'consult'\}/);
    assert.match(reader, /visible && !hidden/);
  });

  it('shows safe stored-result metadata without internal identifiers', () => {
    const source = readRepo('components/dtr/ConsultRoom.tsx');
    assert.match(source, /最近の追加読み解き/);
    assert.match(source, /作成日 \{createdDate\}/);
    assert.match(source, /ConsultReplyCard/);
    assert.doesNotMatch(source, /作成日.*report_instance_id|作成日.*ticket_id/);
  });
});

describe('privacy-safe additional-reading analytics', () => {
  it('uses locked names and the three-key payload allowlist', () => {
    assert.equal(
      M55_FUNNEL_EVENTS.additionalReadingFlowView,
      'm55_additional_reading_flow_view',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.additionalReadingThemeSelected,
      'm55_additional_reading_theme_selected',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.additionalReadingReviewView,
      'm55_additional_reading_review_view',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.additionalReadingSendIntent,
      'm55_additional_reading_send_intent',
    );
    const payload = buildPrivacySafeFunnelPayload(
      'dtr_additional_reading',
      '2026-07-13T00:00:00.000Z',
    );
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
    for (const key of ['theme', 'freeText', 'remaining', 'used', 'userId', 'reportId']) {
      assert.equal(Object.hasOwn(payload, key), false);
    }
  });

  it('dedupes flow and review impressions by mount key', () => {
    resetFunnelImpressionDedupeForTests();
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.additionalReadingFlowView,
      'dtr_additional_reading',
      'repeat-use-flow-test',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.additionalReadingFlowView,
      'dtr_additional_reading',
      'repeat-use-flow-test',
    );
    assert.ok(true);
  });
});
