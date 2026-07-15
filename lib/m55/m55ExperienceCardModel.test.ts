import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildM55ExperienceCardModel,
  hasM55ContinueItem,
  type M55ExperienceCardInput,
} from './m55ExperienceCardModel';

const base: M55ExperienceCardInput = {
  kind: 'personal',
  identityState: 'guest',
  journeyState: 'unstarted',
  ownershipState: 'not_owned',
  commerceState: 'available',
  usageState: 'no_balance',
};

test('guest can start either free experience', () => {
  const personal = buildM55ExperienceCardModel(base);
  const compatibility = buildM55ExperienceCardModel({ ...base, kind: 'compatibility' });
  assert.equal(personal.primaryHref, '/core');
  assert.equal(compatibility.primaryHref, '/synastry');
  assert.equal(personal.primaryAction, 'start_free');
  assert.equal(compatibility.primaryAction, 'start_free');
});

test('authenticated unstarted remains a free start', () => {
  const model = buildM55ExperienceCardModel({ ...base, identityState: 'authenticated' });
  assert.equal(model.primaryAction, 'start_free');
});

test('in-progress journey resumes without ownership', () => {
  const model = buildM55ExperienceCardModel({ ...base, journeyState: 'in_progress' });
  assert.equal(model.primaryAction, 'resume_free');
  assert.equal(model.canContinue, true);
});

test('free complete distinguishes commerce available and paused', () => {
  const available = buildM55ExperienceCardModel({ ...base, journeyState: 'free_complete' });
  const paused = buildM55ExperienceCardModel({
    ...base,
    journeyState: 'free_complete',
    commerceState: 'paused',
  });
  assert.equal(available.primaryAction, 'view_paid_details');
  assert.equal(paused.primaryAction, 'commerce_paused');
  assert.equal(paused.primaryHref, '/core');
});

test('owned report remains reopenable while commerce is paused', () => {
  const model = buildM55ExperienceCardModel({
    ...base,
    identityState: 'authenticated',
    journeyState: 'free_complete',
    ownershipState: 'owned',
    commerceState: 'paused',
    ownedHref: '/dtr/core',
  });
  assert.equal(model.primaryAction, 'open_owned');
  assert.equal(model.primaryHref, '/dtr/core');
  assert.equal(model.showOwnership, true);
});

test('personal-only, compatibility-only, and both-owned continue states resolve', () => {
  const personalOwned = buildM55ExperienceCardModel({
    ...base,
    ownershipState: 'owned',
    ownedHref: '/dtr/core',
  });
  const compatibilityOwned = buildM55ExperienceCardModel({
    ...base,
    kind: 'compatibility',
    ownershipState: 'owned',
    ownedHref: '/synastry/report/example',
  });
  const empty = buildM55ExperienceCardModel(base);
  assert.equal(hasM55ContinueItem([personalOwned, empty]), true);
  assert.equal(hasM55ContinueItem([empty, compatibilityOwned]), true);
  assert.equal(hasM55ContinueItem([personalOwned, compatibilityOwned]), true);
  assert.equal(hasM55ContinueItem([empty]), false);
});

test('additional-reading usage state does not replace ownership authority', () => {
  const model = buildM55ExperienceCardModel({
    ...base,
    identityState: 'authenticated',
    usageState: 'available_balance',
  });
  assert.equal(model.ownershipState, 'not_owned');
  assert.equal(model.primaryAction, 'start_free');
});
