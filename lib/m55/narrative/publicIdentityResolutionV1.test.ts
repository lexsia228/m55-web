/**
 * Public identity fingerprint + 500-profile resolution audit.
 * Semantic identity only. No wording hashes. No DOB/answers.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PERSONAL_V5_FIXTURES } from '../freeResult/personalFreeCommercialCopyV5.test';
import { buildPersonalFreeNarrativeShareContextV1 } from './projectPersonalFreeNarrativeV1';
import {
  PREMIUM_SHARE_IDENTITY_PERSISTENCE,
  projectPersonalPublicShareV1,
  projectPremiumPublicShareV1,
} from './projectPublicShareV1';
import { narrativeSafetyHits, PUBLIC_DOB_PROVENANCE_CUE_JA } from './narrativeSafetyV1';
import {
  reconstructPersonalPublicCard,
  recommendPublicShareVariant,
} from './reconstructPublicCardV1';
import {
  buildPublicIdentityFingerprintV1,
  syntheticPublicAxisProfiles,
} from './publicIdentityFingerprintV1';
import type { ShareCandidateVariant } from './m55NarrativeSpecV1';

const VARIANTS: readonly ShareCandidateVariant[] = ['manual', 'seen_vs_actual', 'hidden_spec'];

function cluster(keys: string[]) {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    n: keys.length,
    unique: counts.size,
    exactCollision: keys.length - counts.size,
    largest: ranked[0]?.[1] ?? 0,
    top20: ranked.slice(0, 20).map(([key, size]) => ({ key, size })),
  };
}

describe('public identity fingerprint', () => {
  it('is semantic keys only — no wording hash, DOB, or answers', () => {
    const ctx = buildPersonalFreeNarrativeShareContextV1(PERSONAL_V5_FIXTURES[0]!);
    assert.equal(ctx.ok, true);
    if (!ctx.ok) return;
    const fp = buildPublicIdentityFingerprintV1({
      answerAxes: ctx.value.answerAxes,
      birthAxes: ctx.value.birthAxes,
    });
    assert.equal(fp.version, 'public_identity_fp_v1');
    const blob = Object.values(fp).join('|');
    assert.doesNotMatch(blob, /\d{4}-\d{2}-\d{2}|free\.|dal-v1|sha|hash/i);
    assert.match(fp.safeFusedBehaviorModifier, /^[a-z]+x[a-z]+$/);
    assert.match(fp.manualIdentity, /start:|decision:|misread:|distance:/);
  });
});

describe('A/B/C complementarity', () => {
  it('does not render three phrasings of the same insight', () => {
    for (const fixture of PERSONAL_V5_FIXTURES.slice(0, 5)) {
      const built = buildPersonalFreeNarrativeShareContextV1(fixture);
      assert.equal(built.ok, true, fixture.id);
      if (!built.ok) continue;
      const { answerAxes, birthAxes, narrative, stemLaneIndex, hingeAxisId } = built.value;
      const cards = VARIANTS.map((variant) =>
        reconstructPersonalPublicCard({ variant, answerAxes, birthAxes, hingeAxisId }),
      );
      const a = cards[0];
      const b = cards[1];
      const c = cards[2];
      assert.ok(a);
      assert.ok(c);
      assert.notEqual(a!.body, c!.body, fixture.id);
      assert.notEqual(a!.insightJa, c!.insightJa, fixture.id);
      if (b) {
        assert.notEqual(b.body, a!.body, fixture.id);
        assert.notEqual(b.body, c!.body, fixture.id);
        assert.doesNotMatch(b.body, new RegExp(c!.insightJa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
      const rec = recommendPublicShareVariant({ answerAxes, birthAxes });
      assert.ok(VARIANTS.includes(rec));
      const x = projectPersonalPublicShareV1({
        narrative,
        variant: rec,
        stemLaneIndex,
        answerAxes,
        birthAxes,
        hingeAxisId,
      });
      assert.ok(x);
      assert.match(x!.shareTextJa, /あなたはどう出る？/);
      assert.match(x!.shareTextJa, new RegExp(x!.headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});

describe('500-profile public resolution audit', () => {
  it('classifies clusters without requiring arbitrary uniqueness', () => {
    const profiles = syntheticPublicAxisProfiles(500);
    assert.equal(profiles.length, 500);

    const defects: string[] = [];
    const byVariant = Object.fromEntries(
      VARIANTS.map((variant) => {
        const fingerprints: string[] = [];
        const bodies: string[] = [];
        const fpToBody = new Map<string, string>();
        for (const profile of profiles) {
          const fp = buildPublicIdentityFingerprintV1(profile);
          const key =
            variant === 'manual'
              ? fp.manualIdentity
              : variant === 'seen_vs_actual'
                ? fp.socialMirrorIdentity
                : fp.hiddenSpecIdentity;
          const card = reconstructPersonalPublicCard({
            variant,
            answerAxes: profile.answerAxes,
            birthAxes: profile.birthAxes,
          });
          const body = card?.body ?? `UNAVAILABLE:${key}`;
          fingerprints.push(key);
          bodies.push(body);
          const prior = fpToBody.get(key);
          if (prior && prior !== body) {
            defects.push(`${variant}: same fingerprint produced different copy`);
          }
          fpToBody.set(key, body);
        }

        const bodyToFp = new Map<string, Set<string>>();
        for (let i = 0; i < bodies.length; i += 1) {
          const set = bodyToFp.get(bodies[i]!) ?? new Set<string>();
          set.add(fingerprints[i]!);
          bodyToFp.set(bodies[i]!, set);
        }
        for (const [body, fps] of bodyToFp) {
          if (fps.size > 1 && !body.startsWith('UNAVAILABLE:')) {
            defects.push(
              `PUBLIC_INFORMATION_LOSS_DEFECT ${variant} body maps to ${fps.size} fingerprints`,
            );
          }
        }

        return [
          variant,
          {
            fingerprint: cluster(fingerprints),
            copy: cluster(bodies),
          },
        ];
      }),
    ) as Record<
      (typeof VARIANTS)[number],
      { fingerprint: ReturnType<typeof cluster>; copy: ReturnType<typeof cluster> }
    >;

    assert.deepEqual(defects, [], defects.join('\n'));
    assert.ok(byVariant.hidden_spec.fingerprint.unique >= byVariant.seen_vs_actual.fingerprint.unique);
    assert.ok(byVariant.manual.fingerprint.unique >= 80, JSON.stringify(byVariant.manual.fingerprint));
    assert.ok(byVariant.seen_vs_actual.fingerprint.unique >= 20, JSON.stringify(byVariant.seen_vs_actual.fingerprint));
    assert.ok(byVariant.hidden_spec.fingerprint.unique >= 40, JSON.stringify(byVariant.hidden_spec.fingerprint));
    assert.ok(byVariant.manual.fingerprint.largest <= 20, String(byVariant.manual.fingerprint.largest));

    const largestA = byVariant.manual.fingerprint.top20[0]?.key ?? '';
    const aClusterIndexes = profiles
      .map((profile, index) => ({
        index,
        key: buildPublicIdentityFingerprintV1(profile).manualIdentity,
      }))
      .filter((row) => row.key === largestA)
      .map((row) => row.index);
    const hiddenInACluster = new Set(
      aClusterIndexes.map(
        (index) => buildPublicIdentityFingerprintV1(profiles[index]!).hiddenSpecIdentity,
      ),
    );
    const seenInACluster = new Set(
      aClusterIndexes.map(
        (index) => buildPublicIdentityFingerprintV1(profiles[index]!).socialMirrorIdentity,
      ),
    );
    assert.ok(
      hiddenInACluster.size >= 2 || seenInACluster.size >= 2,
      'A/B/C should not all collapse on the same users',
    );

    for (const profile of profiles.slice(0, 40)) {
      const card = reconstructPersonalPublicCard({
        variant: 'manual',
        answerAxes: profile.answerAxes,
        birthAxes: profile.birthAxes,
      });
      assert.ok(card);
      const slotCount = card!.body.split('\n').filter((line) => line.includes('：')).length;
      assert.ok(slotCount >= 4 && slotCount <= 6, String(slotCount));
      assert.match(card!.body, new RegExp(PUBLIC_DOB_PROVENANCE_CUE_JA));
      assert.deepEqual(narrativeSafetyHits(card!.body), []);
    }
  });
});

describe('premium revisit limitation', () => {
  it('classifies missing local answers as deferred persistence, not a leak', () => {
    assert.equal(
      PREMIUM_SHARE_IDENTITY_PERSISTENCE,
      'DEFERRED_PREMIUM_SHARE_IDENTITY_PERSISTENCE',
    );
    const generic = projectPremiumPublicShareV1({ stemLaneIndex: 9 });
    assert.match(generic.token, /^n1gt/);
    assert.doesNotMatch(generic.body, /\d{4}-\d{2}-\d{2}|free\./);
  });
});

describe('public customer Japanese editorial', () => {
  it('drops mechanical 一句置く / 候補を閉じる / 内側で閉じる from public catalog', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/narrative/reconstructPublicCardV1.ts'), 'utf8');
    assert.doesNotMatch(src, /一句置く/);
    assert.doesNotMatch(src, /候補を閉じる/);
    assert.doesNotMatch(src, /内側で閉じる/);
    assert.doesNotMatch(src, /最終の返しを作る/);
    assert.match(
      src,
      /人に聞くのは、決めてもらいたいからではない。最後に自分で決めるための材料を集めている。/,
    );
  });
});
