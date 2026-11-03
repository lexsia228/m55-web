import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import type { PaidCompatibilityReportSnapshot } from './buildPaidCompatibilityReportV1';
import {
  LEGACY_FIELD_RECOVERY_GUIDANCE,
  preparePaidCompatibilityReportForDisplay,
  UNCORRECTABLE_PARTNER_PERSPECTIVE,
  UNCORRECTABLE_RELATIONSHIP_LOOP_LINE,
  UNCORRECTABLE_SELF_PERSPECTIVE,
} from './paidCompatibilityReportDisplayV1';

const FIXTURE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures/baseLegacyPaidSnapshots.feeffe33.v1.json',
);

type FixtureManifest = {
  readonly baseHead: string;
  readonly syntheticInput: Record<string, string>;
  readonly snapshots: Record<string, PaidCompatibilityReportSnapshot>;
};

function loadManifest(): FixtureManifest {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as FixtureManifest;
}

describe('Base legacy paid snapshots @ feeffe33 — display field safety', () => {
  const manifest = loadManifest();

  it('fixture pins Base HEAD and synthetic input only', () => {
    assert.equal(manifest.baseHead, 'feeffe335649e2892b521f5fea6462618044d4bf');
    assert.equal(manifest.syntheticInput.pairAxisId, 'A1');
    assert.equal(manifest.syntheticInput.paidTopicId, 'T3');
    assert.deepEqual(Object.keys(manifest.snapshots).sort(), [
      'R1_false',
      'R1_true',
      'R2_false',
      'R2_true',
      'R3_false',
      'R3_true',
      'R4_false',
      'R4_true',
      'R5_false',
      'R5_true',
      'R6_false',
      'R6_true',
    ]);
    for (const snapshot of Object.values(manifest.snapshots)) {
      assert.equal(snapshot.generationContract, undefined);
    }
  });

  for (const [key, snapshot] of Object.entries(manifest.snapshots)) {
    it(`preserves scene/experiment/reflection and avoids wrong-person display for ${key}`, () => {
      const displayed = preparePaidCompatibilityReportForDisplay(snapshot);
      for (let i = 0; i < snapshot.chapters.length; i += 1) {
        const source = snapshot.chapters[i]!;
        const chapter = displayed.chapters[i]!;
        assert.ok(
          chapter.scene.includes(source.scene.replace(/。+$/u, '')),
          `${key} ch${i} scene must retain source scene text`,
        );
        assert.equal(chapter.smallExperiment, source.smallExperiment);
        assert.equal(chapter.reflectionQuestion, source.reflectionQuestion);
        assert.equal(chapter.usablePhrase, source.usablePhrase);
        assert.doesNotMatch(chapter.personAPerspective, /Aには|Bには/);
        assert.doesNotMatch(chapter.personBPerspective, /Aには|Bには/);
        if (chapter.personAPerspective === UNCORRECTABLE_SELF_PERSPECTIVE) {
          assert.doesNotMatch(source.personAPerspective, /Aには|Bには/);
        } else {
          assert.doesNotMatch(chapter.personAPerspective, /^相手から見ると、/);
        }
        if (chapter.relationshipLoop[0] === UNCORRECTABLE_RELATIONSHIP_LOOP_LINE) {
          assert.ok(true);
        } else {
          assert.notEqual(chapter.relationshipLoop.join(''), '');
        }
      }
      const wipedLoops = displayed.chapters.filter(
        (chapter) => chapter.relationshipLoop[0] === UNCORRECTABLE_RELATIONSHIP_LOOP_LINE,
      ).length;
      assert.ok(
        wipedLoops < 6,
        `${key} must not wipe all relationship loops`,
      );
    });
  }

  it('Codex 115733 — R4 false ch1 loop must not keep first-slot buyer chain', () => {
    const displayed = preparePaidCompatibilityReportForDisplay(manifest.snapshots.R4_false!);
    const ch0 = displayed.chapters.find((item) => item.key === 'ch_you_pace')!;
    assert.equal(ch0.relationshipLoop[0], UNCORRECTABLE_RELATIONSHIP_LOOP_LINE);
    assert.doesNotMatch(ch0.relationshipLoop.join(''), /あなたが先に動こう/);
    assert.doesNotMatch(ch0.relationshipLoop.join(''), /返事を急かされている/);
  });

  it('Codex 115733 — R2 true ch2 keeps scene-prefixed partner explanation', () => {
    const displayed = preparePaidCompatibilityReportForDisplay(manifest.snapshots.R2_true!);
    const ch1 = displayed.chapters.find((item) => item.key === 'ch_other_pace')!;
    assert.notEqual(ch1.personBPerspective, UNCORRECTABLE_PARTNER_PERSPECTIVE);
    assert.match(
      ch1.personBPerspective,
      /相手は、言葉を選ぶために、表の反応を小さくする/,
    );
    assert.doesNotMatch(ch1.personBPerspective, /あなたは、/);
  });

  it('Codex 115733 — R5 true ch1 keeps partner uncertainty copy', () => {
    const displayed = preparePaidCompatibilityReportForDisplay(manifest.snapshots.R5_true!);
    const ch0 = displayed.chapters.find((item) => item.key === 'ch_you_pace')!;
    const ch1 = displayed.chapters.find((item) => item.key === 'ch_other_pace')!;
    assert.match(
      ch0.personBPerspective,
      /相手については、再接近を望んでいるとは限らず/,
    );
    assert.match(ch1.personBPerspective, /相手については、再び連絡する意思があるとは限らず/);
    assert.doesNotMatch(ch0.personBPerspective, /あなたは、/);
  });

  it('Codex 115733 — R2/R3/R6 true ch2 and ch5 keep partner-led sentences after scene lead-in', () => {
    for (const snapshotKey of ['R2_true', 'R3_true', 'R6_true'] as const) {
      const displayed = preparePaidCompatibilityReportForDisplay(manifest.snapshots[snapshotKey]!);
      for (const chapterKey of ['ch_other_pace', 'ch_today_clue'] as const) {
        const chapter = displayed.chapters.find((item) => item.key === chapterKey)!;
        assert.notEqual(chapter.personBPerspective, UNCORRECTABLE_PARTNER_PERSPECTIVE, snapshotKey);
        assert.match(chapter.personBPerspective, /相手は、/, snapshotKey);
        assert.doesNotMatch(chapter.personBPerspective, /あなたは、/, snapshotKey);
      }
    }
  });

  it('Codex 115733 — all Base fixtures keep person-role integrity on preserved copy', () => {
    for (const [snapshotKey, snapshot] of Object.entries(manifest.snapshots)) {
      const displayed = preparePaidCompatibilityReportForDisplay(snapshot);
      for (let i = 0; i < snapshot.chapters.length; i += 1) {
        const chapter = displayed.chapters[i]!;
        if (chapter.personAPerspective !== UNCORRECTABLE_SELF_PERSPECTIVE) {
          assert.match(chapter.personAPerspective, /あなた/, `${snapshotKey} ch${i} personA`);
          assert.doesNotMatch(
            chapter.personAPerspective,
            /^相手から見ると、/,
            `${snapshotKey} ch${i} personA`,
          );
        }
        if (chapter.personBPerspective !== UNCORRECTABLE_PARTNER_PERSPECTIVE) {
          assert.doesNotMatch(chapter.personBPerspective, /あなたは、/, `${snapshotKey} ch${i} personB`);
          assert.ok(
            /相手は、|相手については、|相手から/.test(chapter.personBPerspective),
            `${snapshotKey} ch${i} personB must stay partner-led`,
          );
        }
        if (chapter.relationshipLoop[0] !== UNCORRECTABLE_RELATIONSHIP_LOOP_LINE) {
          assert.doesNotMatch(
            chapter.relationshipLoop.join(''),
            /Aには|Bには/,
            `${snapshotKey} ch${i} loop`,
          );
        }
      }
    }
  });

  it('R2 false Base legacy — Codex 113155 regressions on display', () => {
    const legacy = manifest.snapshots.R2_false!;
    const displayed = preparePaidCompatibilityReportForDisplay(legacy);
    const ch0 = displayed.chapters.find((item) => item.key === 'ch_you_pace')!;
    const ch1 = displayed.chapters.find((item) => item.key === 'ch_other_pace')!;
    const ch2 = displayed.chapters.find((item) => item.key === 'ch_pair_gap')!;

    assert.equal(
      ch0.relationshipLoop[0],
      UNCORRECTABLE_RELATIONSHIP_LOOP_LINE,
      'ch1 loop must not keep first-slot buyer framing',
    );
    assert.equal(ch1.personBPerspective, UNCORRECTABLE_PARTNER_PERSPECTIVE);
    assert.doesNotMatch(ch1.personBPerspective, /あなたは、/);
    assert.equal(ch2.personBPerspective, UNCORRECTABLE_PARTNER_PERSPECTIVE);
    assert.match(LEGACY_FIELD_RECOVERY_GUIDANCE, /\/support/);
  });

  it('R2 false preserves non-person chapter value across six chapters', () => {
    const legacy = manifest.snapshots.R2_false!;
    const displayed = preparePaidCompatibilityReportForDisplay(legacy);
    for (let i = 0; i < legacy.chapters.length; i += 1) {
      assert.equal(displayed.chapters[i]!.smallExperiment, legacy.chapters[i]!.smallExperiment);
      assert.equal(
        displayed.chapters[i]!.reflectionQuestion,
        legacy.chapters[i]!.reflectionQuestion,
      );
    }
  });
});
