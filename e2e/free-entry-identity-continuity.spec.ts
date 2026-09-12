/**
 * Direct browser interaction coverage for free-entry identity continuity DOB UX (delta D).
 * No Pair result/share/questionnaire completion.
 */
import { test, expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';

type DobFields = {
  year: Locator;
  month: Locator;
  day: Locator;
};

type SelfDobFields = DobFields & {
  start: Locator;
};

async function cleanContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  const boot = await context.newPage();
  await boot.goto('/home');
  await boot.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      const dbs = await indexedDB.databases?.();
      dbs?.forEach((db) => {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    } catch {
      /* no-op */
    }
  });
  await boot.close();
  return context;
}

async function fillSelfNickname(page: Page) {
  await page.getByPlaceholder('表示名').fill('テスト');
}

async function openSelfBirthIntake(page: Page): Promise<SelfDobFields> {
  await page.goto('/home');
  await page.getByTestId('m55-home-open-birth-intake').click();
  await expect(page.getByTestId('m55-home-birth-intake-layer')).toBeVisible();
  const dob = page.getByTestId('m55-free-segmented-dob');
  return {
    year: dob.getByLabel('年'),
    month: dob.getByLabel('月'),
    day: dob.getByLabel('日'),
    start: page.getByTestId('m55-birth-intake-start'),
  };
}

async function openPairSelfDob(page: Page): Promise<DobFields> {
  await page.goto('/synastry');
  const dobStep = page.getByTestId('compatibility-dob-step');
  await expect(dobStep).toBeVisible({ timeout: 25_000 });
  return {
    year: page.getByLabel('あなたの生年月日 年'),
    month: page.getByLabel('あなたの生年月日 月'),
    day: page.getByLabel('あなたの生年月日 日'),
  };
}

async function fillFirstDigit(field: Locator, digit: string) {
  await field.click();
  await field.fill(digit);
}

async function appendDigit(field: Locator, digit: string) {
  await field.press(digit);
}

async function expectMonthParentIsoEcho(fields: DobFields) {
  await fields.year.fill('1984');
  await fields.day.fill('2');

  await fillFirstDigit(fields.month, '1');
  await expect(fields.month).toHaveValue('1');
  await expect(fields.month).not.toHaveValue('01');

  await appendDigit(fields.month, '2');
  await expect(fields.month).toHaveValue('12');
}

async function expectDayParentIsoEcho(fields: DobFields) {
  await fields.year.fill('1984');
  await fields.month.fill('2');

  await fillFirstDigit(fields.day, '2');
  await expect(fields.day).toHaveValue('2');
  await expect(fields.day).not.toHaveValue('02');

  await appendDigit(fields.day, '9');
  await expect(fields.day).toHaveValue('29');
}

async function expectIsolatedBlurNormalization(fields: DobFields) {
  await fields.year.fill('1984');
  await fields.day.fill('2');

  await fillFirstDigit(fields.month, '2');
  await expect(fields.month).toHaveValue('2');
  await fields.month.blur();
  await expect(fields.month).toHaveValue('02');

  await fields.year.fill('1984');
  await fields.month.fill('2');

  await fillFirstDigit(fields.day, '2');
  await expect(fields.day).toHaveValue('2');
  await fields.day.blur();
  await expect(fields.day).toHaveValue('02');
}

test.describe('free-entry identity continuity — segmented DOB interaction', () => {
  test.describe.configure({ timeout: 60_000 });

  test('Self intake preserves raw month through parent ISO echo for 1 -> 12', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openSelfBirthIntake(page);

    await fillSelfNickname(page);
    await expectMonthParentIsoEcho(fields);
    await expect(fields.start).toBeEnabled();

    await context.close();
  });

  test('Self intake preserves raw day through parent ISO echo for 2 -> 29', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openSelfBirthIntake(page);

    await fillSelfNickname(page);
    await expectDayParentIsoEcho(fields);
    await expect(fields.start).toBeEnabled();

    await context.close();
  });

  test('Self intake normalizes month and day only on explicit blur', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openSelfBirthIntake(page);

    await fillSelfNickname(page);
    await expectIsolatedBlurNormalization(fields);
    await expect(fields.start).toBeEnabled();

    await context.close();
  });

  test('Self intake clears month without restoring prior canonical display', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openSelfBirthIntake(page);

    await fillSelfNickname(page);
    await fields.year.fill('1984');
    await fields.day.fill('29');
    await fillFirstDigit(fields.month, '2');
    await expect(fields.month).toHaveValue('2');
    await fields.month.blur();
    await expect(fields.month).toHaveValue('02');
    await expect(fields.day).toHaveValue('29');
    await expect(fields.start).toBeEnabled();

    await fields.month.fill('');
    await fields.month.blur();
    await expect(fields.month).toHaveValue('');
    await expect(fields.start).toBeDisabled();

    await context.close();
  });

  test('Self intake rejects invalid leap day 2023 / 2 / 29', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openSelfBirthIntake(page);

    await page.getByPlaceholder('表示名').fill('テスト');
    await fields.year.fill('2023');
    await fillFirstDigit(fields.month, '2');
    await fillFirstDigit(fields.day, '29');
    await fields.day.blur();
    await expect(fields.start).toBeDisabled();

    await context.close();
  });

  test('Pair editable personA preserves raw month through parent ISO echo for 1 -> 12', async ({
    browser,
  }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openPairSelfDob(page);

    await expectMonthParentIsoEcho(fields);

    await context.close();
  });

  test('Pair editable personA preserves raw day through parent ISO echo for 2 -> 29', async ({
    browser,
  }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openPairSelfDob(page);

    await expectDayParentIsoEcho(fields);

    await context.close();
  });

  test('Pair editable personA normalizes month and day only on explicit blur', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openPairSelfDob(page);

    await expectIsolatedBlurNormalization(fields);

    await context.close();
  });

  test('Pair editable personA clears month without restoring prior canonical display', async ({
    browser,
  }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openPairSelfDob(page);

    await fields.year.fill('1984');
    await fields.day.fill('29');
    await fillFirstDigit(fields.month, '2');
    await expect(fields.month).toHaveValue('2');
    await fields.month.blur();
    await expect(fields.month).toHaveValue('02');
    await expect(fields.day).toHaveValue('29');

    await fields.month.fill('');
    await fields.month.blur();
    await expect(fields.month).toHaveValue('');

    await context.close();
  });

  test('Pair editable personA rejects invalid calendar date 1984 / 2 / 30', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    const fields = await openPairSelfDob(page);
    const pairDob = page.getByTestId('m55-pair-segmented-dob');

    await fields.year.fill('1984');
    await fillFirstDigit(fields.month, '2');
    await fillFirstDigit(fields.day, '30');
    await fields.day.blur();
    await expect(pairDob.getByRole('alert')).toBeVisible();

    await context.close();
  });
});
