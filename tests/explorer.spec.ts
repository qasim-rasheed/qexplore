import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.word-card')).toHaveCount(30);
});

test('reads the requested verse with local Urdu typography and no external API requests', async ({ page }) => {
  await expect(page.locator('.surah-identity')).toContainText("Al-A'raf");
  await expect(page.locator('.word-card').nth(8)).toContainText('دل ہیں');
  await expect(page.locator('.word-grid')).toHaveAttribute('dir', 'rtl');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('22px "Jameel Noori Nastaleeq"', 'دل'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('32px "Scheherazade New"', 'قُلُوب'))).toBe(true);
  const destinations = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).origin));
  expect(destinations.every((origin) => origin === 'http://127.0.0.1:3000')).toBe(true);
});

test('accepts numeric, Urdu-digit, and named references', async ({ page }) => {
  const input = page.getByLabel('Jump to a reference');
  await input.fill('۲:۲۸۶'); await input.press('Enter');
  await expect(page.locator('.surah-identity')).toContainText('Al-Baqarah');
  await expect(page.locator('.verse-card-footer')).toContainText('2:286');
  await input.fill('Al-Kawthar 3'); await input.press('Enter');
  await expect(page.locator('.verse-card-footer')).toContainText('108:3');
  await expect(page.locator('.word-card')).toHaveCount(4);
  await input.fill('الاعراف 179'); await input.press('Enter');
  await expect(page.locator('.word-card')).toHaveCount(30);
});

test('searchable surah selection enforces the correct ayah limits', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose surah', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search surahs', exact: true }).fill('Kawthar');
  await page.locator('.surah-options button').click();
  await expect(page.getByLabel('Ayah number')).toHaveAttribute('max', '3');
  await expect(page.getByLabel('Ayah number')).toHaveValue('1');
  await page.getByLabel('Ayah number').fill('4');
  await page.getByRole('button', { name: 'Explore ayah', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('has 3 ayahs');
  await expect(page.locator('.verse-card-footer')).toContainText('7:179');
  await page.getByLabel('Ayah number').fill('3');
  await page.getByRole('button', { name: 'Explore ayah', exact: true }).click();
  await expect(page.locator('.verse-card-footer')).toContainText('108:3');
});

test('rejects invalid references and keeps the reader’s place', async ({ page }) => {
  const input = page.getByLabel('Jump to a reference');
  for (const [query, message] of [['1:8', 'has 7 ayahs'], ['115:1', '1 to 114'], ['7:0', 'has 206 ayahs']]) {
    await input.fill(query); await input.press('Enter');
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.locator('.verse-card-footer')).toContainText('7:179');
  }
});

test('shows the actual root, Urdu lemma meanings, and words without roots', async ({ page }) => {
  await page.locator('.word-card').nth(8).click();
  await expect(page.locator('.root-letters')).toHaveText('قلب');
  await expect(page.locator('.root-definition-urdu')).toContainText('پلٹنا');
  await expect(page.locator('.root-forms .urdu').first()).toHaveText('دل');
  await expect(page.locator('.lemma-row')).toContainText('قَلْب');
  await expect(page.locator('.pos-badge')).toHaveText('Noun');
  await page.getByRole('button', { name: 'Next word', exact: true }).click();
  await expect(page.locator('.selected-word')).toContainText('WORD 10 OF 30');
  await expect(page.locator('.no-root')).toContainText('does not assign it a root');
  await expect(page.locator('.root-definition')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next word', exact: true }).click();
  await expect(page.locator('.root-letters')).toHaveText('فقه');
  await expect(page.locator('.root-definition-urdu')).toContainText('سمجھنا');
  await expect(page.locator('.pos-badge')).toHaveText('Verb');
  await page.getByRole('button', { name: 'Previous word', exact: true }).click();
  await expect(page.locator('.selected-word')).toContainText('WORD 10 OF 30');
  await page.getByRole('button', { name: 'Close word details', exact: true }).click();
  await expect(page.locator('.root-panel')).toHaveCount(0);
  await expect(page.locator('.verse-card-footer')).toContainText('7:179');
});

test('keeps general root senses separate from verse glosses and provides original dictionary evidence', async ({ page }) => {
  await page.locator('.word-card').nth(8).click();
  await expect(page.locator('.selected-word .urdu')).toHaveText('دل ہیں');
  await expect(page.getByRole('region', { name: 'Root meaning in Urdu' })).toBeVisible();
  await expect(page.locator('.root-definition-urdu')).toContainText('حالت بدلنا');
  await page.getByText('Dictionary source & original text', { exact: true }).click();
  await expect(page.locator('.dictionary-source-title')).toContainText('Lane');
  await expect(page.locator('.dictionary-citation')).toContainText('2552');
  await expect(page.locator('.dictionary-excerpt').first()).toContainText('He altered');
  await expect(page.locator('.dictionary-citation')).toContainText('AI-assisted');
  await page.getByRole('button', { name: 'Next word', exact: true }).click();
  await page.getByRole('button', { name: 'Next word', exact: true }).click();
  await expect(page.locator('.root-definition-urdu')).toContainText('سمجھنا');
  await expect(page.locator('.dictionary-citation')).not.toHaveAttribute('open');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('recovers a failed dictionary request without blocking the word explorer', async ({ page }) => {
  await page.route('**/data/root-definitions.json', (route) => route.abort());
  await page.locator('.word-card').nth(8).click();
  await expect(page.locator('.root-definition')).toContainText('could not be loaded');
  await expect(page.locator('.root-forms .urdu').first()).toHaveText('دل');
  await page.unroute('**/data/root-definitions.json');
  await page.getByRole('button', { name: 'Retry root dictionary', exact: true }).click();
  await expect(page.locator('.root-definition-urdu')).toContainText('پلٹنا');
});

test('marks unresolved root analyses instead of substituting the verse gloss', async ({ page }) => {
  const dictionary = await (await page.request.get('/data/root-definitions.json')).json();
  const index = await (await page.request.get('/data/root-index.json')).json();
  for (const root of ['همن', 'كين']) {
    expect(dictionary.roots[root].u).toBeNull();
    const uses = await (await page.request.get(`/data/roots/${index[root].id}.json`)).json();
    const use = uses.uses[0];
    await page.goto(`/#${use.s}:${use.v}:${use.w}`);
    await expect(page.locator('.root-letters')).toHaveText(root);
    await expect(page.locator('.root-definition')).toContainText('Root analysis needs review');
    await expect(page.locator('.root-definition-urdu')).toContainText('تصدیق طلب');
  }
});

test('navigates root occurrences and returns to the selected word with browser back', async ({ page }) => {
  await page.locator('.word-card').nth(8).click();
  await expect(page.locator('.root-forms')).toBeVisible();
  await page.getByRole('tab', { name: /^Uses/ }).click();
  await expect(page.locator('.root-uses button')).toHaveCount(6);
  const useText = await page.locator('.root-uses .use-ref').first().textContent();
  await page.locator('.root-uses button').first().click();
  await expect(page.locator('.verse-card-footer')).toContainText(useText!.trim());
  await expect(page.locator('.root-letters')).toHaveText('قلب');
  await page.goBack();
  await expect(page.locator('.selected-word')).toContainText('WORD 9 OF 30');
  await expect(page.locator('.root-letters')).toHaveText('قلب');
});

test('bookmarks ayahs and words and persists them across reloads', async ({ page }) => {
  await page.getByRole('button', { name: 'Save ayah', exact: true }).click();
  await page.locator('.word-card').nth(8).click();
  await page.getByRole('button', { name: 'Save this word', exact: true }).click();
  await page.getByRole('button', { name: 'Close word details', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unsave ayah', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Saved/ }).click();
  await expect(page.locator('.collection-list')).toContainText('7:179');
  await page.locator('.collection-tabs button').filter({ hasText: 'Words' }).click();
  await expect(page.locator('.saved-word-text')).toContainText('دل ہیں');
  await page.getByRole('button', { name: 'Remove saved word 7:179:9', exact: true }).click();
  await expect(page.locator('.empty-collection')).toContainText('Keep a word close');
});

test('changes typography and theme and remembers the preferences', async ({ page }) => {
  await page.getByRole('button', { name: 'Reading settings', exact: true }).click();
  const range = page.getByRole('slider', { name: 'Arabic text size', exact: true });
  await range.focus(); await range.press('End');
  await expect(range).toHaveValue('46');
  await page.getByRole('button', { name: 'Night', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.word-card')).toHaveCount(30);
  expect(await page.locator('.app').evaluate((element) => getComputedStyle(element).getPropertyValue('--arabic-size'))).toBe('46px');
});

test('handles surah boundaries and the first and last ayahs', async ({ page }) => {
  const input = page.getByLabel('Jump to a reference');
  await input.fill('1:7'); await input.press('Enter');
  await expect(page.locator('.verse-card-footer')).toContainText('1:7');
  await page.getByRole('button', { name: 'Next ayah', exact: true }).first().click();
  await expect(page.locator('.verse-card-footer')).toContainText('2:1');
  await page.getByRole('button', { name: 'Previous ayah', exact: true }).first().click();
  await expect(page.locator('.verse-card-footer')).toContainText('1:7');
  await input.fill('1:1'); await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Previous ayah', exact: true }).first()).toBeDisabled();
  await input.fill('114:6'); await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Next ayah', exact: true }).first()).toBeDisabled();
  await expect(page.locator('.ayah-tabs .active')).toContainText('6');
});

test('recovers from an interrupted surah request', async ({ page }) => {
  await page.route('**/data/chapters/2.json', (route) => route.abort());
  const input = page.getByLabel('Jump to a reference');
  await input.fill('2:1'); await input.press('Enter');
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await page.unroute('**/data/chapters/2.json');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.word-card')).toHaveCount(1);
  await expect(page.locator('.verse-card-footer')).toContainText('2:1');
});

test('all word cards work without page errors or horizontal page overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (let i = 0; i < 30; i++) {
    await page.locator('.word-card').nth(i).click();
    await expect(page.locator('.selected-word')).toContainText(`WORD ${i + 1} OF 30`);
    await page.getByRole('button', { name: 'Close word details', exact: true }).click();
  }
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('long Arabic words fit on one line even at the largest reading size', async ({ page }) => {
  await page.getByRole('button', { name: 'Reading settings', exact: true }).click();
  const range = page.getByRole('slider', { name: 'Arabic text size', exact: true });
  await range.focus(); await range.press('End');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByLabel('Jump to a reference').fill('15:22');
  await page.getByLabel('Jump to a reference').press('Enter');
  await expect(page.locator('.verse-card-footer')).toContainText('15:22');
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('.word-arabic').evaluateAll((elements) => elements.every((element) =>
    element.scrollWidth <= element.clientWidth + 1 && getComputedStyle(element).whiteSpace === 'nowrap'))).toBe(true);
});
