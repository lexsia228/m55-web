import type { Page } from '@playwright/test';

/** Fill M55 segmented year/month/day fields. Canonical ISO YYYY-MM-DD in, no native picker. */
export async function fillM55SegmentedDob(page: Page, isoDate: string): Promise<void> {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) throw new Error(`invalid ISO date: ${isoDate}`);
  await page.getByLabel('年').first().fill(year);
  await page.getByLabel('月').first().fill(String(Number(month)));
  await page.getByLabel('日').first().fill(String(Number(day)));
}
