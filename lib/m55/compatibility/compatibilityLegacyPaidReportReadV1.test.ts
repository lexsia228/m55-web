import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCanonicalCompatibilityPurchaseSnapshot } from './buildCanonicalCompatibilityPurchaseSnapshot';
import { paidCompatibilityChapterTitle, sceneInteractionIdFor } from './buildPaidCompatibilityReportV1';
import { CHAPTER_IDS } from './pairReadingCatalog.v1';
import { questionsForRelationStage } from './currentContextContract.v2';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import {
  getOwnedCompatibilityReport,
  isPaidCompatibilityReportSnapshot,
  resolvePaidCompatibilityReportSnapshotForRead,
} from './compatibilityCommerceDb';

const GUEST = { personA: '1990-01-01', personB: '1992-02-02' };
const REPORT_ID = 'a1111111-1111-4111-8111-111111111111';
const OWNER_USER_ID = 'user_legacy_owned_report';
const OTHER_USER_ID = 'user_other_account';
const LEGACY_CH_ABOUT_TITLE = 'この読み解きについて';
const CH_ABOUT_INDEX = CHAPTER_IDS.length - 1;

type SnapshotChapterJson = Record<string, unknown>;
type SnapshotJson = Record<string, unknown> & { chapters: SnapshotChapterJson[] };
type OwnedReportDb = NonNullable<Parameters<typeof getOwnedCompatibilityReport>[2]>;

function v2Context(): CompatibilityCurrentContextAnswersV2 {
  const allowed = new Set(
    questionsForRelationStage('R3').map((question) => question.questionId),
  );
  const candidate: CompatibilityCurrentContextAnswersV2 = {
    decisionPace: 'decide_later',
    disagreement: 'talk_now',
    distance: 'explain_space',
    expressionPace: 'words_soon',
    returnPattern: 'someone_reaches',
    focus: 'conversation_focus',
  };
  return Object.fromEntries(
    Object.entries(candidate).filter(([key]) => allowed.has(key as keyof typeof candidate)),
  ) as CompatibilityCurrentContextAnswersV2;
}

function canonicalSnapshot() {
  const built = buildCanonicalCompatibilityPurchaseSnapshot(GUEST, 'R3', v2Context());
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('canonical snapshot fixture failed');
  return built.snapshot;
}

function snapshotJsonFromCanonical(): SnapshotJson {
  return JSON.parse(JSON.stringify(canonicalSnapshot())) as SnapshotJson;
}

function legacySnapshotMissingAllSceneIds(): SnapshotJson {
  const legacy = snapshotJsonFromCanonical();
  for (const chapter of legacy.chapters) {
    delete chapter.sceneInteractionId;
  }
  return legacy;
}

function legacySnapshotMeasuredPreviewForm(): SnapshotJson {
  const legacy = legacySnapshotMissingAllSceneIds();
  legacy.chapters[CH_ABOUT_INDEX]!.title = LEGACY_CH_ABOUT_TITLE;
  return legacy;
}

function createOwnedReportDb(snapshot: unknown, ownerUserId: string): OwnedReportDb {
  const client = {
    from(table: string) {
      assert.equal(table, 'compatibility_owned_reports');
      const filters: Record<string, string> = {};
      const chain = {
        select() {
          return chain;
        },
        eq(column: string, value: string) {
          filters[column] = value;
          return chain;
        },
        async maybeSingle() {
          const matches =
            filters.id === REPORT_ID &&
            filters.owner_user_id === ownerUserId &&
            filters.product_key === 'compatibility_report_full_v1';
          if (!matches) {
            return { data: null, error: null };
          }
          return {
            data: {
              id: REPORT_ID,
              created_at: '2026-10-26T12:00:00.000Z',
              snapshot,
            },
            error: null,
          };
        },
      };
      return chain;
    },
  };
  return client as unknown as OwnedReportDb;
}

describe('compatibilityLegacyPaidReportReadV1', () => {
  it('resolves legacy snapshots when all six chapter sceneInteractionId values are absent', () => {
    const legacy = legacySnapshotMissingAllSceneIds();
    assert.equal(isPaidCompatibilityReportSnapshot(legacy), false);

    const resolved = resolvePaidCompatibilityReportSnapshotForRead(legacy);
    assert.ok(resolved);
    assert.equal(isPaidCompatibilityReportSnapshot(resolved), true);
    for (let index = 0; index < CHAPTER_IDS.length; index += 1) {
      const key = CHAPTER_IDS[index];
      assert.equal(resolved!.chapters[index]!.sceneInteractionId, sceneInteractionIdFor(key));
    }
  });

  it('rejects snapshots when sceneInteractionId property exists but is empty', () => {
    const legacy = snapshotJsonFromCanonical();
    for (const chapter of legacy.chapters) {
      chapter.sceneInteractionId = '';
    }
    assert.equal(isPaidCompatibilityReportSnapshot(legacy), false);
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(legacy), null);
  });

  it('rejects snapshots when sceneInteractionId property exists but is null on every chapter', () => {
    const legacy = snapshotJsonFromCanonical();
    for (const chapter of legacy.chapters) {
      chapter.sceneInteractionId = null;
    }
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(legacy), null);
  });

  it('rejects snapshots when sceneInteractionId property exists but is undefined on every chapter', () => {
    const legacy = snapshotJsonFromCanonical();
    for (const chapter of legacy.chapters) {
      chapter.sceneInteractionId = undefined;
    }
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(legacy), null);
  });

  it('returns current snapshots unchanged', () => {
    const current = canonicalSnapshot();
    const resolved = resolvePaidCompatibilityReportSnapshotForRead(current);
    assert.strictEqual(resolved, current);
  });

  it('does not mutate the source snapshot object during legacy repair', () => {
    const legacy = legacySnapshotMissingAllSceneIds();
    const before = JSON.stringify(legacy);
    resolvePaidCompatibilityReportSnapshotForRead(legacy);
    assert.equal(JSON.stringify(legacy), before);
  });

  it('rejects mixed chapter sceneInteractionId presence', () => {
    const mixed = snapshotJsonFromCanonical();
    delete mixed.chapters[0]!.sceneInteractionId;
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(mixed), null);
  });

  it('rejects invalid chapter keys and missing required body fields', () => {
    const wrongKey = legacySnapshotMissingAllSceneIds();
    wrongKey.chapters[0]!.key = 'ch_invalid';
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(wrongKey), null);

    const missingBody = legacySnapshotMissingAllSceneIds();
    missingBody.chapters[1]!.scene = '';
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(missingBody), null);
  });

  it('resolves measured Preview legacy form with old ch_about title while preserving display title', () => {
    const legacy = legacySnapshotMeasuredPreviewForm();
    assert.equal(isPaidCompatibilityReportSnapshot(legacy), false);

    const resolved = resolvePaidCompatibilityReportSnapshotForRead(legacy);
    assert.ok(resolved);
    for (let index = 0; index < CHAPTER_IDS.length; index += 1) {
      const key = CHAPTER_IDS[index];
      assert.equal(resolved!.chapters[index]!.sceneInteractionId, sceneInteractionIdFor(key));
    }
    assert.equal(resolved!.chapters[CH_ABOUT_INDEX]!.title, LEGACY_CH_ABOUT_TITLE);
    assert.notEqual(
      resolved!.chapters[CH_ABOUT_INDEX]!.title,
      paidCompatibilityChapterTitle('ch_about'),
    );
    // Prove validator acceptability requires canonical title on a separate validation-only copy.
    const validationProbe = JSON.parse(JSON.stringify(resolved)) as SnapshotJson;
    validationProbe.chapters[CH_ABOUT_INDEX]!.title = paidCompatibilityChapterTitle('ch_about');
    assert.equal(isPaidCompatibilityReportSnapshot(validationProbe), true);
    assert.equal(isPaidCompatibilityReportSnapshot(resolved), false);
  });

  it('rejects legacy ch_about title without all sceneInteractionId properties absent', () => {
    const legacy = snapshotJsonFromCanonical();
    legacy.chapters[CH_ABOUT_INDEX]!.title = LEGACY_CH_ABOUT_TITLE;
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(legacy), null);
  });

  it('rejects unknown ch_about titles even when all sceneInteractionId properties are absent', () => {
    const legacy = legacySnapshotMissingAllSceneIds();
    legacy.chapters[CH_ABOUT_INDEX]!.title = '不明な第6章タイトル';
    assert.equal(resolvePaidCompatibilityReportSnapshotForRead(legacy), null);
  });

  it('loads owned legacy reports for the matching owner only', async () => {
    const legacy = legacySnapshotMissingAllSceneIds();
    const owned = await getOwnedCompatibilityReport(
      OWNER_USER_ID,
      REPORT_ID,
      createOwnedReportDb(legacy, OWNER_USER_ID),
    );
    assert.ok(owned);
    assert.equal(owned!.id, REPORT_ID);
    assert.equal(owned!.snapshot.chapters[0]!.sceneInteractionId, sceneInteractionIdFor(CHAPTER_IDS[0]!));

    const foreign = await getOwnedCompatibilityReport(
      OTHER_USER_ID,
      REPORT_ID,
      createOwnedReportDb(legacy, OWNER_USER_ID),
    );
    assert.equal(foreign, null);
  });
});
